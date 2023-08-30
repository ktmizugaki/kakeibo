package Kakeibo::Template;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator qw/permit add_error/;

my $select_tmpls = prepare("select id,name,desc,text from templates");
my $select_tmpl = prepare("select id,name,desc,text from templates where id = ?");
my $insert_tmpl = prepare("insert into templates(name,desc,text) values (?, ?, ?)");
my $update_tmpl = prepare("update templates set name = ?, desc = ?, text = ? where id = ?");
my $delete_tmpl = prepare("delete from templates where id = ?");
my $has_tmpl_name = prepare("select count(*) from templates where id != ? and name = ?");

my $validator = Kakeibo::Lib::Validator->new(
    name => { required => 1, uniqueness => $has_tmpl_name },
    text => { required => 1 },
);

my $tmpl_params = {name=>1,desc=>1,text=>1};

### Model methods

sub list {
    return all($select_tmpls);
}

sub find {
    my $id = shift;
    return one($select_tmpl, $id);
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
        $id = insert($insert_tmpl, $hash->{name}, $hash->{desc}, $hash->{text});
        add_error($hash, "base", "insert failed") unless (defined($id));
        return $id;
    } else {
        my $ret = execute($update_tmpl, $hash->{name}, $hash->{desc}, $hash->{text}, $id);
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
    my $json = eval { permit $req->parameters->{json}, $tmpl_params };
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $tmpl = {name=>'',desc=>'',text=>'[]',%$json};
    my $ret = trans {
        my $id = save($tmpl);
        if (!defined($id)) {
            rollback;
        }
        return find($id, 1);
    };
    return $tmpl if $tmpl->{errors};
    return $ret;
}

sub update {
    my $req = shift;
    my $id = $req->parameters->{id};
    my $json = eval { permit $req->parameters->{json}, $tmpl_params };
    return undef unless defined $id;
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $tmpl;
    my $ret = trans {
        $tmpl = find($id);
        return undef unless $tmpl;
        $tmpl = {%$tmpl, %$json};
        unless (save($tmpl, $id)) {
            rollback;
        }
        return find($id);
    };
    return undef unless defined $tmpl;
    return $tmpl if $tmpl->{errors};
    return $ret;
}

sub destroy {
    my $req = shift;
    my $id = $req->parameters->{id};
    return undef unless defined $id;
    my $errors = [];
    my $ret = trans {
        my $tmpl = find($id);
        return undef unless $tmpl;
        unless (execute($delete_tmpl, $id)) {
            push @$errors, "destroy failed";
            rollback;
        }
        return {};
    };
    return {errors=>$errors} if @$errors;
    return $ret;
}

1;
