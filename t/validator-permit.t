use strict;
use warnings;

use Test::More;
use Test::Exception;

use Kakeibo::Lib::Validator qw/permit/;

my $kamoku_params = {code=>1,name=>1};
my $list_params = {date=>1,items=>[{kamoku_id=>1,amount=>1}]};
my $ret;

lives_ok {
    $ret = permit {code=>"1111",name=>"hoge"}, $kamoku_params;
} "does not die if valid";
is_deeply($ret, {code=>"1111",name=>"hoge"}, "permitted keys");
lives_ok {
    $ret = permit {abc=>"abc",xyz=>"xyz"}, $kamoku_params;
} "does not die for unpermitted keys";;
is_deeply($ret, {}, "unpermitted keys are ignored");
throws_ok {
    permit {code=>{name=>"hoge"}}, $kamoku_params;
} qr/^\$root\.code/, "dies if expects scalar but got hash";
throws_ok {
    permit {name=>["hoge"]}, $kamoku_params;
} qr/^\$root\.name/, "dies if expects scalar but got array";

lives_ok {
    $ret = permit {date=>"2016-01-01",items=>[{kamoku_id=>1,amount=>5000},{kamoku_id=>2,amount=>5000}]}, $list_params;
} "does not die if valid";

throws_ok {
    permit {date=>"2016-01-01",items=>{kamoku_id=>1,amount=>5000}}, $list_params;
} qr/^\$root\.items/, 'dies if expects array but got hash';

throws_ok {
    permit {date=>"2016-01-01",items=>[{kamoku_id=>1,amount=>5000},[{kamoku_id=>2,amount=>5000}],{kamoku_id=>{amount=>"hoge"}}]}, $list_params;
} qr/^\$root\.items\[1\]/, 'dies if expects hash but got array';;

lives_ok {
    $ret = permit {date=>undef}, $list_params;
} "it is ok to be undef for scalar";
lives_ok {
    $ret = permit {items=>undef}, $list_params;
} "it is ok to be undef for array";
lives_ok {
    $ret = permit {items=>[undef]}, $list_params;
} "it is ok to be undef for hash";

done_testing;
