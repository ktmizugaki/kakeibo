#!/usr/bin/env perl
use strict;
use warnings;
use lib "lib";
use local::lib "perl5";
use HTML::AssetBuilder;
use Log::Any::Adapter ('Stderr');

my $builder = HTML::AssetBuilder->new('assets.json');
for my $tmpl ($builder->templatelist) {
    $builder->render_tmpl_to_file($tmpl);
}
for my $asset ($builder->assetlist) {
    $builder->make_asset_to_file($asset);
}
