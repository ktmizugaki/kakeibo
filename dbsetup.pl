#!/usr/bin/env perl
#BEGIN { push @INC, "lib"; }

use strict;
use warnings;
use lib "lib";
use local::lib "perl5";
use Kakeibo::Lib::DB;
use Kakeibo::Category;
use Kakeibo::Kamoku;

my $dbh = Kakeibo::Lib::DB->connection;
$dbh->{sqlite_unicode} = 0;
$dbh->{RaiseError} = 1;

$dbh->begin_work();
$dbh->do(<<EOS);
CREATE TABLE categories(
    id INTEGER PRIMARY KEY,
    side INTEGER,
    name TEXT UNIQUE);
EOS
$dbh->do(<<EOS);
CREATE TABLE kamokus(
    id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    code TEXT UNIQUE,
    name TEXT UNIQUE);
EOS
$dbh->do(<<EOS);
CREATE TABLE lists(
    id INTEGER PRIMARY KEY,
    date TEXT,
    is_initial BOOLEAN,
    amount INTEGER);
EOS
$dbh->do(<<EOS);
CREATE TABLE items(
    id INTEGER PRIMARY KEY,
    list_id INTEGER NOT NULL,
    kamoku_id INTEGER NOT NULL,
    dir INTEGER,
    amount INTEGER,
    desc TEXT);
EOS
$dbh->do(<<EOS);
CREATE TABLE templates(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    desc TEXT,
    text TEXT);
EOS
$dbh->commit();
$dbh->begin_work();
my @initial = (
    [1,  1, "資産"] => [
        ["1111", "現金"],
        ["1119", "現金過不足"],
        ["1121", "普通預金"],
        ["1122", "定期預金"],
        ["1271", "貯蔵品"],
    ],
    [2,  1, "費用"] => [
        ["2011", "消耗品費"],
        ["2012", "事務用品費"],
        ["2013", "新聞図書費"],
        ["2021", "旅費交通費"],
        ["2022", "車両費"],
        ["2031", "水道光熱費"],
        ["2032", "通信費"],
        ["2033", "交際費"],
        ["2034", "食費"],
        ["2041", "租税公課"],
        ["2042", "保険料"],
        ["2043", "支払手数料"],
        ["2044", "諸会費"],
        ["2999", "雑費"],
    ],
    [3, -1, "負債"] => [
        ["3011", "クレジットカード"],
    ],
    [4, -1, "純資産"] => [
        ["4011", "開始残高"],
    ],
    [5, -1, "収益"] => [
        ["5011", "給与"],
        ["5211", "利息"],
        ["5999", "雑収入"],
    ],
);
while (@initial) {
    my ($id, $side, $name) = @{shift @initial};
    my $category = {id=>$id,side=>$side,name=>$name};
    $id = Kakeibo::Category::save($category) || die "failed to create category $name";
    my $kamokus = shift @initial;
    for (@{$kamokus}) {
        my ($code, $name) = @$_;
        my $kamoku = {category_id=>$id,code=>$code,name=>$name};
        Kakeibo::Kamoku::save($kamoku) || die "failed to create kamoku $name";
    }
}
$dbh->commit();
$dbh->disconnect();
