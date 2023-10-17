package File::LogFile;
use strict;
use warnings;
use Carp;

sub new {
    my $class = shift;
    my @options = @_;
    my $self = bless {
        fh => undef,
        @options,
        _ino => undef,
        _time => undef,
    }, $class;
    croak "'filename' is reqired" unless defined($self->{filename});
    return $self;
}

sub print {
    my ($self, @args) = @_;
    $self->check_reopen;
    print {$self->{fh}} @args;
}

sub check_reopen {
    my ($self) = @_;
    if ($self->is_valid) {
        return 0;
    } elsif ($self->reopen) {
        return 1;
    } else {
        return -1;
    }
}

sub is_valid {
    my ($self) = @_;

    # check if self is opened at least once
    unless ($self->{fh}) {
        return 0;
    }

    # do not check so often.
    # if it is within 3 seconds since last check,
    # it is likely related call.
    if (defined($self->{_time})) {
        return 1 if $self->{_time} >= time()-3;
    }

    my $ino = (stat $self->{filename})[1];
    # file does not exist.
    unless (defined($ino)) {
        return 0;
    }

    # if ino is same as target file, no need to reopen fd.
    if (defined($self->{_ino})) {
        if (defined($ino) && $ino == $self->{_ino}) {
            $self->{_time} = time();
            return 1;
        }
    }

    # has been opened to expected file.
    my $fhino = (stat $self->{fh})[1];
    if (defined($ino) && defined($fhino) && $ino == $fhino) {
        $self->{_ino} = $fhino;
        $self->{_time} = time();
        return 1;
    }

    return 0;
}

sub reopen {
    my ($self) = @_;
    my $filename = $self->{filename};
    my $reopen = defined($self->{fh});
    if ($self->open()) {
        return 1;
    } else {
        if ($reopen) {
            warn "open $filename failed: $!";
        } else {
            die "open $filename failed: $!";
        }
        return 0;
    }
}

sub open {
    my ($self) = @_;
    my $filename = $self->{filename};
    my $ret;
    if (defined($self->{fh})) {
        $ret = open(*{$self->{fh}}, ">>", $filename);
    } else {
        $ret = open(my $fh, ">>", $filename);
        if ($ret) {
            $self->{fh} = *$fh;
        }
    }
    if ($ret) {
        $self->{fh}->autoflush(1);
        $self->{_ino} = (stat $self->{fh})[1];
        $self->{_time} = time();
    }
    return $ret;
}

1;
