use strict;
use warnings;
use Plack::Builder;

BEGIN {
    push @INC, "lib";
}

use Kakeibo;

builder {
    if (($ENV{PLACK_ENV} || 'development') eq 'development') {
        enable "Asset", config => "assets.json";
        enable "Static", path => qr/^\/(?:img|css|js|icomoon)/, root => "public";
        enable "Static", path => qr/\.html?$/, root => "public";
    }
    \&Kakeibo::app;
};
