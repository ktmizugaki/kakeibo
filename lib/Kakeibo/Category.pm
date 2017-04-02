package Kakeibo::Category;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator qw/permit add_error/;

my $select_categories = prepare("select id,side,name from categories");
my $select_category = prepare("select id,side,name from categories where id = ?");
my $insert_category = prepare("insert into categories(side,name) values (?, ?)");
my $update_category = prepare("update categories set name = ? where id = ?");
my $delete_category = prepare("delete from categories where id = ?");
my $has_category_name = prepare("select count(*) from categories where id != ? and name = ?");

my $validator = Kakeibo::Lib::Validator->new(
    side => { required => 1, format => qr/^(?:-1|1)$/ },
    name => { required => 1, uniqueness => $has_category_name },
);

my $category_params = {side=>1,name=>1};

### Model methods

sub list {
    return all($select_categories);
}

sub find {
    my $id = shift;
    return one($select_category, $id);
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
        $id = insert($insert_category, $hash->{side}, $hash->{name});
        add_error($hash, "base", "insert failed") unless defined($id);
        return $id;
    } else {
        my $ret = execute($update_category, $hash->{name}, $id);
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
    my $json = eval { permit $req->parameters->{json}, $category_params };
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $category = {category_id=>undef,side=>undef,name=>undef,%$json};
    my $ret = trans {
        my $id = save($category);
        if (!defined($id)) {
            rollback;
        }
        return find($id);
    };
    return $category if $category->{errors};
    return $ret;
}

sub update {
    my $req = shift;
    my $id = $req->parameters->{id};
    my $json = eval { permit $req->parameters->{json}, $category_params };
    return undef unless defined $id;
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $category;
    my $ret = trans {
        $category = find($id);
        return undef unless $category;
        $category = {%$category, %$json};
        unless (save($category, $id)) {
            rollback;
        }
        return find($id);
    };
    return undef unless defined $category;
    return $category if $category->{errors};
    return $ret;
}

sub destroy {
    my $req = shift;
    my $id = $req->parameters->{id};
    return undef unless defined $id;
    my $errors = [];
    my $ret = trans {
        my $category = find($id);
        return undef unless $category;
        unless (execute($delete_category, $id)) {
            push @$errors, "destroy failed";
            rollback;
        }
        return {};
    };
    return {errors=>$errors} if @$errors;
    return $ret;
}

1;
