package Kakeibo::Lib::DB;
use strict;
use warnings;
use utf8;
use Exporter qw/import/;
use DBI;
use Carp;

our @EXPORT_OK = qw/connection prepare
  one all count insert execute rollback trans/;
our @EXPORT = @EXPORT_OK;

my $dbsrc = "dbi:SQLite:dbname=kakeibo.db";
my $dbh;
my $in_trans = 0;

sub setdb {
    my ($dbname) = @_;
    $dbsrc = "dbi:SQLite:dbname=$dbname.db";
}

sub connection {
    if (!$dbh) {
        $dbh = DBI->connect($dbsrc);
        $dbh->{sqlite_unicode} = 1;
        $dbh->{RaiseError} = 1;
        $dbh->{PrintError} = 0;
        $dbh->do("PRAGMA journal_mode = TRUNCATE");
    }
    return $dbh;
}

sub prepare {
    my $stmt = shift;
    my $sth;
    return sub { $sth ||= connection()->prepare($stmt); };
}

sub one {
    my $sth = shift->();
    $sth->execute(@_);
    my $row = $sth->fetchrow_hashref;
    my $err = $sth->err;
    $sth->finish;
    return undef if ($err or !$row);
    return $row;
}

sub all {
    my $sth = shift->();
    $sth->execute(@_);
    my $rows = $sth->fetchall_arrayref({});
    my $err = $sth->err;
    $sth->finish;
    return undef if ($err or !$rows);
    return $rows;
}

sub count {
    my $sth = shift->();
    $sth->execute(@_);
    my @row = $sth->fetchrow_array;
    my $err = $sth->err;
    $sth->finish;
    return 0 if ($err or !@row);
    return $row[0];
}

sub insert {
    my $sth = shift->();
    $sth->execute(@_);
    my $err = $sth->err;
    my $id = connection->last_insert_id("", "", "", "");
    $sth->finish;
    return undef if ($err);
    return $id;
}

sub execute {
    my $sth = shift->();
    $sth->execute(@_);
    my $err = $sth->err;
    $sth->finish;
    return undef if ($err);
    return 1;
}

sub rollback { croak "db::rollback" };

sub trans(&) {
    my ($proc) = @_;
    if ( $in_trans ) {
        return $proc->();
    }
    my $dbh = connection;
    $dbh->begin_work();
    $in_trans = 1;
    my $ret = eval { $proc->() };
    $in_trans = 0;
    if ($@) {
        $dbh->rollback();
        if ($@ =~ "^db::rollback") {
            $@ = "";
        } else {
            die $@;
        }
    } else {
        $dbh->commit();
    }
    return $ret;
}

1;
