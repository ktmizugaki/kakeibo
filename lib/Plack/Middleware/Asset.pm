package Plack::Middleware::Asset;
use strict;
use warnings;
use parent qw( Plack::Middleware );
use Plack::MIME;
use HTML::AssetBuilder;

sub call {
    my($self, $env) = @_;

    my $res = $self->_handle_asset($env);
    if ($res) {
        return $res;
    }

    return $self->app->($env);
}

sub _handle_asset {
    my ($self, $env) = @_;

    my $builder = $self->builder();
    my $path = $env->{PATH_INFO};
    $path =~ s#^/##;

    if ($builder->is_tmpl($path)) {
        my $content = $builder->render_tmpl($path);
        return unless defined($content);
        my $res = _make_response($path, $content);
        push @{$res->[1]}, 'Cache-Control', 'no-cache, no-store';
        return $res
    } elsif ($builder->is_asset($path)) {
        my ($path, $content) = $builder->make_asset($path);
        return unless(defined($content));
        return _make_response($path, $content);
    } elsif (defined(my $cache = $builder->{cache}->{$path})) {
        return _make_response($path, $cache->{content});
    }

    return;
}

sub _make_response {
    my ($path, $content) = @_;
    my $content_type = Plack::MIME->mime_type($path);
    return [
        200,
        [
         'Content-Type'   => $content_type,
         'Content-Length' => length($content),
        ],
        [$content],
        ];
}

sub builder {
    my ($self) = @_;
    unless ($self->{_builder}) {
        $self->{_builder} = HTML::AssetBuilder->new($self->{config});
        $self->{_builder}->check_config();
    }
    return $self->{_builder};
}

1;
