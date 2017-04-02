package Kakeibo::Lib::Validator;
use strict;
use warnings;
use Exporter qw/import/;
use Kakeibo::Lib::DB qw/count/;
use Data::Dumper;

our @EXPORT_OK = qw/permit validate add_error/;

=head1 SYNOPSIS

    my $permitted = { list_id=>1,name=>1,amount=>1,children=>[{sub=>1}] }
    my $validator = Kakeibo::Lib::Validator->new(
        list_id => { required => 1, presence => prepare("select count(*) where id != ? and ...") },
        name => { required => 1, uniqueness => prepare("select count(*) id != ? and ..."), format => qr/^[_a-z][_a-z0-9]*$/ },
        amount => { required => 1, numericality => 1 },
    );

    my $input = {list_id=>99,name=>"My New List",amount=>999};
    $input = eval { permit $input $permitted };
    die "invalid input" if ($@);
    my $is_valid = $validator->validate($input);

=cut

sub new {
    my ($class, %set) = @_;
    return bless \%set, $class;
}

sub _get_main_param {
    my ($params, $key) = @_;
    ref $params eq "HASH"? $params->{$key}: $params;
}

sub permit {
    my ($input, $permitted, $base) = @_;
    $base ||= "\$root";
    return undef unless defined($input);
    if (ref $permitted ne ref $input) {
        die "$base";
    }
    if (ref $permitted eq 'ARRAY') {
        my $ret = [];
        my $i = 0;
        for my $nest (@$input) {
            push @$ret, permit($nest, $permitted->[0], $base."[$i]");
            $i++;
        }
        return $ret;
    } elsif (ref $permitted eq 'HASH') {
        my $ret = {};
        while (my ($name, $type) = each %$permitted) {
            next unless exists $input->{$name};
            my $val = $input->{$name};
            $ret->{$name} = permit($val, $type, $base.".$name");
        }
        return $ret;
    } else {
        return $input;
    }
}

sub add_error {
    my ($hash, $prop, $msg) = @_;
    $hash->{errors} ||= {};
    my $msgs = $hash->{errors}->{$prop} ||= [];
    push @$msgs, $msg;
}

sub validate {
    my ($self, $hash, $skip) = @_;
    my @names = qw/required presence uniqueness format numericality/;
    $skip ||= {};
    while (my ($prop, $valids) = each %$self) {
        next if exists $skip->{$prop};
        for my $name (@names) {
            if (exists $valids->{$name}) {
                my $params = $valids->{$name};
                my $method = "validate_$name";
                $self->$method($hash, $prop, $params);
            }
        }
    }
    return !defined($hash->{errors});
}

sub validate_required {
    my ($self, $hash, $prop, $params) = @_;
    my $val = $hash->{$prop};
    unless (defined($val) && (ref $val || length($val) > 0)) {
        add_error($hash, $prop, "is required");
        return 0;
    }
    return 1;
}

sub validate_presence {
    my ($self, $hash, $prop, $params) = @_;
    my $val = $hash->{$prop};
    my $query = _get_main_param($params, "query");
    if (defined($val) && count($query, $val) == 0) {
        add_error($hash, $prop, "must exist");
        return 0;
    }
    return 1;
}

sub validate_uniqueness {
    my ($self, $hash, $prop, $params) = @_;
    my $id = $hash->{id};
    my $val = $hash->{$prop};
    my $query = _get_main_param($params, "query");
    if (defined($val) && count($query, defined($id)?$id:-1, $val) > 0) {
        add_error($hash, $prop, "duplicates");
        return 0;
    }
    return 1;
}

sub validate_format {
    my ($self, $hash, $prop, $params) = @_;
    my $val = $hash->{$prop};
    my $with = _get_main_param($params, "with");
    if (defined($val) && $val !~ /$with/) {
        add_error($hash, $prop, "is not valid");
        return 0;
    }
    return 1;
}

sub validate_numericality {
    my ($self, $hash, $prop, $params) = @_;
    my $val = $hash->{$prop};
    if (defined($val)) {
        my $ok;
        my $msg;
        if ($params eq "integer" || (ref $params eq "HASH" && $params->{only_integer_only})) {
            $ok = $val =~ /^[+-]?(?:[1-9]\d*|0)$/;
            $msg = "is not a integer";
        } else {
            $ok = $val =~ /^(?:0|[1-9][0-9]*)(?:|\.[0-9]+)$/;
            $msg = "is not a number";
        }
        if (!$ok) {
            add_error($hash, $prop, $msg);
            return 0;
        } elsif (ref $params eq "HASH") {
            my $thr;
            if (defined($thr = $params->{min}) && $val < $thr) {
                add_error($hash, $prop, $thr==0?"is not a positive number": "too small($thr)");
                return 0;
            } elsif (defined($thr = $params->{max}) && $val > $thr) {
                add_error($hash, $prop, $thr==0?"is not a negative number": "too large($thr)");
                return 0;
            }
        }
    }
    return 1;
}
