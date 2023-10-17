use strict;
use warnings;
use Plack::Builder;

BEGIN {
    push @INC, "lib";
}

use Kakeibo;
use File::LogFile;

builder {
    # Detect daemon mode based on the server.sh which redirects stdout and
    # stderr to file.
    if (-f STDOUT || -f STDERR) {
        # In the daemon mode, Plack::Handler::FCGI redirects stdio and stderr
        # to /dev/null after daemonize and before accepting request.
        # Since there is no hook between above points, let middleware app,
        # LogStdio reopen stdout and stderr to files on each request.
        # Bonus is this behaviour allows rotating log file.
        enable "LogStdio",
            stdoutfile => "log/plackup.stdout.log",
            stderrfile => "log/plackup.stderr.log";

        my $logfile = File::LogFile->new(filename=>"log/access.log");
        enable "AccessLog", logger => sub { $logfile->print( @_ ) };

    }
    if (($ENV{PLACK_ENV} || 'development') eq 'development') {
        enable "Asset", config => "assets.json";
        enable "Static", path => qr/^\/(?:img|css|js|icomoon)/, root => "public";
        enable "Static", path => qr/\.html?$/, root => "public";
    }
    \&Kakeibo::app;
};
