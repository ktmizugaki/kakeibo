package Kakeibo;
use strict;
use warnings;
use JSON;
use Plack::Request::WithEncoding;
use Kakeibo::Lib::Router;
use Kakeibo::Category;
use Kakeibo::Kamoku;
use Kakeibo::List;
use Kakeibo::Summary;

resources("/categories", {controller=>"Category"});
resources("/kamokus", {controller=>"Kamoku"});
resources("/lists", {controller=>"List"});
get "/summary/{date}", {date=>qr/^[0-9]{4}-[0-9]{2}(?:-[0-9]{2})?$/, controller=>"Summary", action=>'summary'};

sub json_api {
    my $env = shift;
    my $api = shift;
    my $status = "200";
    my $json = eval {
        my $val = $api->($env);
        $val && JSON::encode_json($val);
    };
    if (ref $@ eq 'HASH' &&  $@->{status}) {
        $status = $@->{status} || 500;
        $@->{error} ||= "Internal Server Error";
        $json = JSON::encode_json($@);
    } elsif ($@) {
        warn $@;
        $status = "500";
        $json = "{}";
    } elsif (!defined($json)) {
        $status = "404";
        $json = "{}";
    }
    return [$status, ["Content-Type" => "application/json"], [$json."\n"]];
}

sub app {
    open STDOUT, ">> log/plackup.stdout.log";
    open STDERR, ">> log/plackup.stderr.log";
    my $env = shift;
    return json_api($env, sub {
        my $req = Plack::Request::WithEncoding->new(shift);
        $req->env->{'plack.request.withencoding.encoding'} = 'utf-8';
        my $method = $req->method;
        my $path = $req->path_info;
        if ($method eq "POST" && $req->parameters->{_method}) {
            $method = $req->parameters->{_method};
        }
        if ($method eq "HEAD") {
            $method = "GET";
        }
        dispatch sub {
            my ($params, $req) = @_;
            my $controller = "Kakeibo::$params->{controller}";
            my $action = $controller->can($params->{action});
            die "$controller can't $params->{action}" unless $action;
            for my $key (keys %$params) {
                $req->parameters->set($key, $params->{$key});
            }
            if ($req->parameters->{json}) {
                eval { $req->parameters->set("json", JSON::decode_json($req->raw_parameters->get_one("json"))) };
                die {status=>"400",error=>"json is not valid $@"} if ($@);
            }
            return $action->($req);
        }, $method, $path, $req;
    });
}

1;
