package Kakeibo::Lib::Router::Route;
use strict;
use warnings;
use utf8;
use Exporter qw/import/;

sub new {
    my ($class, $method, $path, $cond) = @_;
    my $parts = ($path =~ tr#/#/#);
    my $caps = [];
    $path =~ s#{([a-z_]+)}#push @$caps, $1; "([^/]+)"#ge;
    if (scalar(@$caps)) {
        $path = qr#^$path$#;
    }
    return bless {
        method => $method,
        path => $path,
        parts => $parts,
        caps => $caps,
        cond => $cond || {}
    }, $class;
}

sub test {
    my ($self, $method, $path) = @_;
    my $params;
    return undef if $self->{method} && $self->{method} ne $method;
    return undef if $self->{parts} != $path =~ tr#/#/#;
    $params = {%{$self->{cond}}};
    if (ref $self->{path} eq "Regexp") {
        my @params = $path =~ $self->{path};
        return undef unless @params;
        return undef unless $self->validate_and_merge($params, @params);
    } else {
        return undef unless $self->{path} eq $path;
    }
    return $params;
}

sub validate_and_merge {
    my ($self, $params, @params) = @_;
    for my $i (0..$#params) {
        my $value = $params[$i];
        my $name = $self->{caps}->[$i];
        my $cond = $self->{cond}->{$name};
        return undef unless (!$cond || $value =~ $cond);
        $params->{$name} = $value;
    }
    return 1;
}

1;
