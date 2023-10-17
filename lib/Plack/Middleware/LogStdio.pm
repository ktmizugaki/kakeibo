package Plack::Middleware::LogStdio;
use strict;
use warnings;
use File::LogFile;
use parent qw( Plack::Middleware );

sub prepare_app {
    my($self, $env) = @_;
    if (defined($self->{stdoutfile})) {
        $self->{stdout} = File::LogFile->new(fh=>\*STDOUT, filename=>$self->{stdoutfile});
    }
    if (defined($self->{stderrfile})) {
        $self->{stderr} = File::LogFile->new(fh=>\*STDERR, filename=>$self->{stderrfile});
    }
}

sub call {
    my($self, $env) = @_;

    $self->reopen_stdio();

    return $self->app->($env);
}

sub reopen_stdio {
    my ($self) = @_;
    my $ret;

    if (defined($self->{stdout})) {
        if ($ret = $self->{stdout}->check_reopen) {
            $self->{stdout}->print("Reopened\n");
        } elsif ($ret < 0) {
            print STDERR "failed to reopen STDOUT to $self->{stdoutfile}: $!";
        }
    }
    if (defined($self->{stderr})) {
        if ($ret = $self->{stderr}->check_reopen) {
            $self->{stderr}->print("Reopened\n");
        } elsif ($ret < 0) {
            print STDOUT "failed to reopen STDERR to $self->{stderrfile}: $!";
        }
    }
}

1;
