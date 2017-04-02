package Kakeibo::Kamoku;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator qw/permit add_error/;

my $select_kamokus = prepare("select id,category_id,code,name from kamokus");
my $select_kamoku = prepare("select id,category_id,code,name from kamokus where id = ?");
my $insert_kamoku = prepare("insert into kamokus(category_id,code,name) values (?, ?, ?)");
my $update_kamoku = prepare("update kamokus set code = ?, name = ? where id = ?");
my $delete_kamoku = prepare("delete from kamokus where id = ?");
my $has_category = prepare("select count(*) from categories where id == ?");
my $has_kamoku_code = prepare("select count(*) from kamokus where id != ? and code = ?");
my $has_kamoku_name = prepare("select count(*) from kamokus where id != ? and name = ?");

my $validator = Kakeibo::Lib::Validator->new(
    category_id => { required => 1, presence => $has_category },
    code => { required => 1, format => qr/^[0-9]+$/, uniqueness => $has_kamoku_code },
    name => { required => 1, uniqueness => $has_kamoku_name },
);

my $kamoku_params = {category_id=>1,code=>1,name=>1};

### Model methods

sub list {
    return all($select_kamokus);
}

sub find {
    my $id = shift;
    return one($select_kamoku, $id);
}

sub is_valid {
    return $validator->validate(@_);
}

sub save {
    my ($hash, $id) = @_;
    unless (is_valid($hash)) {
        return undef;
    }
    unless(defined($id)) {
        $id = insert($insert_kamoku, $hash->{category_id}, $hash->{code}, $hash->{name});
        add_error($hash, "base", "insert failed") unless defined($id);
        return $id;
    } else {
        my $ret = execute($update_kamoku, $hash->{code}, $hash->{name}, $id);
        add_error($hash, "base", "update failed") unless $ret;
        return $ret;
    }
}

### Controller methods

sub index {
    my $req = shift;
    return list();
}

sub show {
    my $req = shift;
    my $id = $req->parameters->{id};
    return undef unless defined $id;
    return find($id);
}

sub create {
    my $req = shift;
    my $json = eval { permit $req->parameters->{json}, $kamoku_params };
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $kamoku = {category_id=>undef,code=>undef,name=>undef,%$json};
    my $ret = trans {
        my $id = save($kamoku);
        if (!defined($id)) {
            rollback;
        }
        return find($id);
    };
    return $kamoku if $kamoku->{errors};
    return $ret;
}

sub update {
    my $req = shift;
    my $id = $req->parameters->{id};
    my $json = eval { permit $req->parameters->{json}, $kamoku_params };
    return undef unless defined $id;
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $kamoku;
    my $ret = trans {
        $kamoku = find($id);
        return undef unless $kamoku;
        $kamoku = {%$kamoku, %$json};
        unless (save($kamoku, $id)) {
            rollback;
        }
        return find($id);
    };
    return undef unless defined $kamoku;
    return $kamoku if $kamoku->{errors};
    return $ret;
}

sub destroy {
    my $req = shift;
    my $id = $req->parameters->{id};
    return undef unless defined $id;
    my $errors = [];
    my $ret = trans {
        my $kamoku = find($id);
        return undef unless $kamoku;
        unless (execute($delete_kamoku, $id)) {
            push @$errors, "destroy failed";
            rollback;
        }
        return {};
    };
    return {errors=>$errors} if @$errors;
    return $ret;
}

1;
