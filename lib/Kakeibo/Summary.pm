package Kakeibo::Summary;
use strict;
use warnings;
use utf8;
use Kakeibo::Lib::DB;

my $select_summary = prepare("select lists.is_initial,items.kamoku_id,items.dir,sum(items.amount) as amount from lists join items on lists.id == items.list_id where date like ? group by lists.is_initial, items.kamoku_id, items.dir");

### Controller methods

sub summary {
    my $req = shift;
    my $date = $req->parameters->{date} || "";
    if ($date =~ /^[0-9]{4}-[0-9]{2}$/) {
        return all($select_summary, $date."%");
    }
    if ($date =~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) {
        return all($select_summary, $date);
    }
    return [];
}

1;
