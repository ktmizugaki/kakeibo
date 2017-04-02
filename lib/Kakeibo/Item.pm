package Kakeibo::Item;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator qw/add_error/;

my $select_items = prepare("select id,list_id,kamoku_id,dir,amount,desc from items where list_id = ?");
my $select_item = prepare("select id,list_id,kamoku_id,dir,amount,desc from items where list_id = ? and id = ?");
my $insert_item = prepare("insert into items(list_id,kamoku_id,dir,amount,desc) values (?, ?, ?, ?, ?)");
my $update_item = prepare("update items set kamoku_id = ?, dir = ?, amount = ?, desc = ? where list_id = ? and id = ?");
my $delete_item = prepare("delete from items where list_id = ? and id = ?");
my $has_list = prepare("select count(*) from lists where id = ?");
my $has_kamoku = prepare("select count(*) from kamokus where id = ?");

my $validator = Kakeibo::Lib::Validator->new(
    list_id => {required => 1, presence => $has_list},
    kamoku_id => {required => 1, presence => $has_kamoku},
    dir => { required => 1, format => qr/^(?:-1|1)$/ },
    amount => { required => 1, numericality => "integer" },
    desc => {},
);

### Model methods

sub list {
    my $list_id = shift;
    return all($select_items, $list_id);
}

sub find {
    my $list_id = shift;
    my $id = shift;
    return one($select_item, $list_id, $id);
}

sub is_valid {
    return $validator->validate(@_);
}

sub save {
    my ($hash, $list_id, $id) = @_;
    unless (is_valid($hash)) {
        return undef;
    }
    unless(defined($id)) {
        $id = insert($insert_item, $hash->{list_id}, $hash->{kamoku_id}, $hash->{dir}, $hash->{amount}, $hash->{desc});
        add_error($hash, "base", "insert failed") unless defined($id);
        return $id;
    } else {
        my $ret = execute($update_item, $hash->{kamoku_id}, $hash->{dir}, $hash->{amount}, $hash->{desc}, $list_id, $id);
        add_error($hash, "base", "update failed") unless $ret;
        return $ret;
    }
}

### Controller methods

1;
