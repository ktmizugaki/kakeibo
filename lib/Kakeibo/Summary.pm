package Kakeibo::Summary;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;

my $select_initial_date = prepare("select date from lists where is_initial and date <= ? order by date desc limit 1;");
my $select_summary_initial = prepare("select 1 as is_initial,items.kamoku_id, 1 as dir,sum(items.amount*items.dir) as amount from lists join items on lists.id == items.list_id where items.kamoku_id in (select id from kamokus where category_id in (1, 3, 4)) and ((date = ? and is_initial) or (date >= ? and date < ?)) group by items.kamoku_id");
my $select_summary = prepare("select 0 as is_initial,items.kamoku_id,items.dir,sum(items.amount) as amount from lists join items on lists.id == items.list_id where date like ? and not lists.is_initial group by items.kamoku_id, items.dir");

### Controller methods

sub initial {
    my $req = shift;
    my $date = $req->parameters->{date} || "";
    if ($date =~ /^[0-9]{4}-[0-9]{2}$/) {
        $date = "$date-01";
    }
    if ($date =~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
        my $initial_date = one($select_initial_date, $date);
        if ($initial_date) {
            $initial_date = $initial_date->{'date'};
        } else {
            $initial_date = "0000-00-00";
        }
        print "initial_date: $initial_date\n";
        return all($select_summary_initial, $initial_date, $initial_date, $date);
    }
    return [];
}

sub summary {
    my $req = shift;
    my $date = $req->parameters->{date} || "";
    my $initial = &initial($req, @_);
    if ($date =~ /^[0-9]{4}-[0-9]{2}$/) {
        my $all = all($select_summary, $date."%");
        return [@$initial, @$all];
    }
    if ($date =~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
        my $all = all($select_summary, $date);
        return [@$initial, @$all];
    }
    return [];
}

1;
