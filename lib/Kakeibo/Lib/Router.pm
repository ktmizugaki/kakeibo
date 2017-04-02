package Kakeibo::Lib::Router;
use strict;
use warnings;
use utf8;
use Exporter qw/import/;
use Kakeibo::Lib::Router::Route;

our @EXPORT_OK = qw/dispatch match get post put del resources/;
our @EXPORT = @EXPORT_OK;

my @routes = ();

sub routes { \@routes }

sub dispatch {
    my ($proc, $method, $path, @args) = @_;
    $method = 'GET' if ($method eq 'HEAD');
    for my $route (@routes) {
        if (my $params = $route->test($method, $path)) {
            return $proc->($params, @args);
        }
    }
    return undef;
}

sub match {
    push @routes, Kakeibo::Lib::Router::Route->new(@_);
}

sub get {
    match('GET', @_);
}

sub post {
    match('POST', @_);
}

sub put {
    match('PUT', @_);
}

sub del {
    match('DELETE', @_);
}

sub resources {
    my ($path, $args) = @_;
    die "controller is requried for resource($path)" unless $args->{controller};
    $path =~ s#/+$##;
    get $path, {%$args, action=>'index'};
    get $path."/search", {%$args, action=>'search'};
    post $path, {%$args, action=>'create'};
    get $path."/{id}", {%$args, id=>qr/^\d+$/, action=>'show'};
    put $path."/{id}", {%$args, id=>qr/^\d+$/, action=>'update'};
    del $path."/{id}", {%$args, id=>qr/^\d+$/, action=>'destroy'};
}

1;
