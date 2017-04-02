use strict;
use warnings;
use Plack::Builder;

BEGIN {
    push @INC, "lib";
}

use Kakeibo;

builder {
    enable "Static", path => qr/^\/(?:img|css|js)/, root => "public";
    enable "Static", path => qr/\.html?$/, root => "public";
    \&Kakeibo::app;
};
