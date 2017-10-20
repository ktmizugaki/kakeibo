package Kakeibo::List;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;
use Kakeibo::Lib::Validator qw/permit add_error/;
use Kakeibo::Item;

my $select_initial_kamokus = prepare("select id from kamokus where category_id = 4");
my $select_lists = prepare("select id,date,amount,is_initial from lists");
my $select_lists_for_month = prepare("select id,date,amount,is_initial from lists where date like ?");
my $select_lists_for_date = prepare("select id,date,amount,is_initial from lists where date like ?");
my $select_list = prepare("select id,date,amount,is_initial from lists where id = ?");
my $select_list_initial_for_date = prepare("select id,date,amount,is_initial from lists where is_initial != 0 and date <= ? order by date desc limit 1");
my $insert_list = prepare("insert into lists(date,amount,is_initial) values (?, ?, ?)");
my $update_list = prepare("update lists set date = ?, amount = ?, is_initial = ? where id = ?");
my $delete_list = prepare("delete from lists where id = ?");
my $delete_item = prepare("delete from items where id = ?");
my $delete_items = prepare("delete from items where list_id = ?");

my $validator = Kakeibo::Lib::Validator->new(
    date => { required => 1, format => qr/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ },
    amount => { required => 1, numericality => "integer" },
    items => { required => 1 },
);

my $list_params = {date=>1,items=>[{kamoku_id=>1,dir=>1,amount=>1,desc=>1}]};

### Model methods

sub list {
    return all($select_lists);
}

sub find {
    my $id = shift;
    my $with_items = shift;
    my $list = one($select_list, $id);
    return undef unless $list;
    $list->{items} = Kakeibo::Item::list($id) if $with_items;
    return $list;
}

sub find_initial {
    my $date = shift;
    my $with_items = shift;
    my $list = one($select_list_initial_for_date, $date);
    return undef unless $list;
    $list->{items} = Kakeibo::Item::list($list->{id}) if $with_items;
    return $list;
}

sub is_valid {
    my ($hash) = @_;
    my %amount = ("-1"=>0,"1"=>0);
    my $valid = 1;
    my $item_valid = 1;
    unless ($validator->validate(@_)) {
        $valid = 0;
    }
    for my $item (@{$hash->{items}}) {
        unless (Kakeibo::Item::is_valid($item, {list_id=>1})) {
            if ($item_valid) {
                add_error $hash, "items", "is not valid";
            }
            $valid = 0;
            $item_valid = 0;
        }
        if ($item->{dir}) {
            $amount{$item->{dir}} += $item->{amount}||0;
        }
    }
    if ($amount{-1} != $amount{1}) {
        add_error $hash, "amount", "does not match";
        $valid = 0;
    }
    $hash->{amount} = $amount{1};
    return $valid;
}

sub is_initial {
    my ($hash) = @_;
    my %initial_kamoku_ids = ();
    for my $kamoku (@{all($select_initial_kamokus)}) {
        $initial_kamoku_ids{$kamoku->{id}} = 1;
    }

    for my $item (@{$hash->{items}}) {
        return 1 if ($initial_kamoku_ids{$item->{kamoku_id}});
    }
    return 0;
}

sub save {
    my ($hash, $id) = @_;
    unless (is_valid($hash)) {
        return undef;
    }
    unless(defined($id)) {
        $id = insert($insert_list, $hash->{date}, $hash->{amount}, is_initial($hash));
        unless (defined($id)) {
            add_error($hash, "base", "insert failed");
            return undef;
        }
    } else {
        my $ret = execute($update_list, $hash->{date}, $hash->{amount}, is_initial($hash), $id);
        unless ($ret) {
            add_error($hash, "base", "update failed");
            return undef;
        }
    }
    for my $item (@{$hash->{items}}) {
        my $is_new = !defined($item->{id});
        $item->{list_id} = $id;
        my $ret = Kakeibo::Item::save($item, $id, $item->{id});
        if (defined($ret)) {
            if ($is_new) {
                $item->{id} = $ret;
            }
        } else {
            add_error($hash, "items", $is_new?"insert failed": "update failed");
            return undef;
        }
    }
    return $id;
}

### Controller methods

sub index {
    my $req = shift;
    return list();
}

sub search {
    my $req = shift;
    my $date = $req->parameters->{date} || "";
    my $ret;
    if ($date =~ /^[0-9]{4}-[0-9]{2}$/) {
        $ret = all($select_lists_for_month, $date."%");
    }
    if ($date =~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
        $ret = all($select_lists_for_date, $date);
    }
    if ($ret) {
        for my $list (@$ret) {
            $list->{items} = Kakeibo::Item::list($list->{id});
        }
    }
    return $ret;
}

sub show {
    my $req = shift;
    my $id = $req->parameters->{id};
    my $with_items = $req->parameters->{items};
    $with_items = 1 unless defined $with_items;
    return undef unless defined $id;
    return find($id, $with_items);
}

sub initial {
    my $req = shift;
    my $date = $req->parameters->{date};
    my $with_items = $req->parameters->{items};
    $with_items = 1 unless defined $with_items;
    return undef unless defined $date;
    if ($date =~ /^[0-9]{4}-[0-9]{2}$/) {
        $date .= "-00";
    }
    if ($date !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
        return undef;
    }
    return find_initial($date, $with_items);
}

sub create {
    my $req = shift;
    my $json = eval { permit $req->parameters->{json}, $list_params };
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $list = {date=>undef,amount=>0,items=>[],%$json};
    my $ret = trans {
        my $id = save($list);
        if (!defined($id)) {
            rollback;
        }
        return find($id, 1);
    };
    return $list if $list->{errors};
    return $ret;
}

sub update {
    my $req = shift;
    my $id = $req->parameters->{id};
    my $json = eval { permit $req->parameters->{json}, $list_params };
    return undef unless defined $id;
    die {status=>"400",error=>"Bad Request"} unless $json;
    my $list;
    my $ret = trans {
        $list = find($id, 1);
        return undef unless $list;
        my $old_items = $list->{items};
        $list = {%$list, %$json};
        my $item_index = 0;
        while (my $item = $list->{items}->[$item_index]) {
            my $old_item = $old_items->[$item_index];
            $item->{id} = $old_item? $old_item->{id} : undef;
            $item_index++;
        }
        unless (save($list, $id)) {
            rollback;
        }
        while (my $old_item = $old_items->[$item_index]) {
            my $old_item = $old_items->[$item_index];
            execute($delete_item, $old_item->{id});
            $item_index++;
        }
        return find($id, 1);
    };
    return undef unless defined $list;
    return $list if $list->{errors};
    return $ret;
}

sub destroy {
    my $req = shift;
    my $id = $req->parameters->{id};
    return undef unless defined $id;
    my $errors = [];
    my $ret = trans {
        my $list = find($id);
        return undef unless $list;
        unless (execute($delete_list, $id)) {
            push @$errors, "destroy failed";
            rollback;
        }
        unless (execute($delete_items, $id)) {
            push @$errors, "destroy items failed";
            rollback;
        }
        return {};
    };
    return {errors=>$errors} if @$errors;
    return $ret;
}

1;
