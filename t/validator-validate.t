use strict;
use warnings;

use Test::More;
use Test::Exception;

use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator;

Kakeibo::Lib::DB::setdb("test");
my $dbh = connection();
$dbh->do(<<EOS);
DROP TABLE IF EXISTS tables;
EOS
$dbh->do(<<EOS);
DROP TABLE IF EXISTS lists;
EOS
$dbh->do(<<EOS);
CREATE TABLE tables(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE);
EOS
$dbh->do(<<EOS);
CREATE TABLE lists(
    id INTEGER PRIMARY KEY,
    table_id INTEGER NOT NULL,
    date TEXT);
EOS
my $insert_table = prepare("insert into tables(name) values (?)");
my $insert_list = prepare("insert into lists(table_id,date) values (?, ?)");
insert($insert_table, "table1");
insert($insert_table, "table2");
insert($insert_list, 1, "2016-01-01");
insert($insert_list, 2, "2016-01-02");

my $has_table = prepare("select count(*) from tables where id = ?");
my $has_list = prepare("select count(*) from lists where id != ? and date = ?");

{
    my $validator = Kakeibo::Lib::Validator->new(
        table_id => {required => 1, presence => $has_table},
    );
    my $list;

    $list = {table_id=>1};
    ok($validator->validate($list), "ok for required and presence");
    is($list->{errors}, undef, "if validate ok");

    $list = {table_id=>undef};
    ok(!$validator->validate($list), "not ok for missig required");
    is_deeply($list->{errors}, {table_id=>["is required"]}, "if missig required");

    $list = {table_id=>3};
    ok(!$validator->validate($list), "not ok for not presence");
    is_deeply($list->{errors}, {table_id=>["must exist"]}, "if not present");
}

{
    my $validator = Kakeibo::Lib::Validator->new(
        date => {uniqueness => $has_list},
    );
    my $list;

    $list = {date=>"2016-01-03"};
    ok($validator->validate($list), "ok for uniqueness");
    is($list->{errors}, undef, "if validate ok");

    $list = {id=>1, date=>"2016-01-01"};
    ok($validator->validate($list), "ok for uniqueness of existing record");
    is($list->{errors}, undef, "if validate ok");

    $list = {date=>"2016-01-01"};
    ok(!$validator->validate($list), "not ok for uniqueness");
    is_deeply($list->{errors}, {date=>["duplicates"]}, "if not unique");
}

{
    my $validator = Kakeibo::Lib::Validator->new(
        date => {format=>qr/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/},
    );
    my $list;

    $list = {date=>"2016-01-03"};
    ok($validator->validate($list), "ok for format");
    is($list->{errors}, undef, "if validate ok");

    $list = {date=>"20160103"};
    ok(!$validator->validate($list), "not ok for format");
    is_deeply($list->{errors}, {date=>["is not valid"]}, "if not valid for format");
}

{
    my $validator = Kakeibo::Lib::Validator->new(
        amount => {numericality=>{min=>0, max=>9999}},
    );
    my $list;

    $list = {amount=>4000};
    ok($validator->validate($list), "ok for numericality");
    is($list->{errors}, undef, "if validate ok");

    $list = {amount=>"4000"};
    ok($validator->validate($list), "numeric string is ok for numericality");
    is($list->{errors}, undef, "if validate ok");

    $list = {amount=>39.99};
    ok($validator->validate($list), "decimal is ok for numericality");
    is($list->{errors}, undef, "if validate ok");

    $list = {amount=>"hoge"};
    ok(!$validator->validate($list), "other strings are not ok for numericality");
    is_deeply($list->{errors}, {amount=>["is not a number"]}, "if not a numeric value");

    $list = {amount=>-300};
    ok(!$validator->validate($list), "not ok for too small value");
    is_deeply($list->{errors}, {amount=>["is not a positive number"]}, "if not a numeric value");

    $list = {amount=>12000};
    ok(!$validator->validate($list), "not ok for too large value");
    is_deeply($list->{errors}, {amount=>["is too large(9999)"]}, "if not a numeric value");
}

{
    my $validator = Kakeibo::Lib::Validator->new(
        amount => {numericality=>{only_integer=>1}},
    );
    my $list;


    $list = {amount=>4000};
    ok($validator->validate($list), "ok for only integer numericality");
    is($list->{errors}, undef, "if validate ok");

    $list = {amount=>"4000"};
    ok($validator->validate($list), "numeric string is ok for only integer numericality");
    is($list->{errors}, undef, "if validate ok");

    $list = {amount=>3.9999};
    ok(!$validator->validate($list), "not ok for only integer numericality");
    is_deeply($list->{errors}, {amount=>["is not a integer"]}, "if not a integer value");

    $list = {amount=>"hoge"};
    ok(!$validator->validate($list), "other strings are not ok for numericality");
    is_deeply($list->{errors}, {amount=>["is not a integer"]}, "if not a integer value");
}

done_testing;
