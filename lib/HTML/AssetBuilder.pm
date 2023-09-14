package HTML::AssetBuilder::Cache;
use strict;
use warnings;

sub filetime {
    return (stat($_[0]))[9];
}

sub new {
    my ($class) = @_;
    my $attrs = {path=>undef, content=>undef, time=>time(), files=>{}};
    return bless $attrs, $class;
}

sub add {
    my ($self, $file) = @_;
    $self->{files}->{$file} = filetime($file);
}

sub valid {
    my ($self) = @_;
    if ($self->{time} >= time()) {
        return 1;
    }
    for my $file (keys %{$self->{files}}) {
        my $time = $self->{files}->{$file};
        if (filetime($file) != $time) {
            return 0;
        }
    }
    # do not check file times again for a specified period
    $self->{time} = time()+3;
    return 1;
}

package HTML::AssetBuilder;
use strict;
use warnings;

use Carp;
use Log::Any qw/$log/;
use JSON qw /decode_json/;
use Digest::SHA qw /sha256_hex/;
use JavaScript::Minifier::XS;
use CSS::Minifier::XS;

my $Cache = 'HTML::AssetBuilder::Cache';

sub _read_file {
    my ($filename) = @_;
    open(my $fh, "<", $filename) or return;
    my $file_content = do { local $/; <$fh> };
    close($fh);
    return $file_content;
}

sub _write_file {
    my ($filename, $content) = @_;
    my $dir = $filename;
    $dir =~ s#/[^/]*$##;
    system('mkdir', '-p', $dir);
    open(my $fh, ">", $filename) or return 0;
    binmode $fh;
    print $fh ($content);
    close($fh);
    return 1;
}

sub new {
    my ($class, $config) = @_;
    my $attrs = {caches=>{}, config=>undef};
    if (ref $config eq 'HASH') {
        $attrs->{config} = $config;
    } elsif (-f $config) {
        $attrs->{configfile} = $config;
    } else {
        croak $log->fatal("config must be HASH or filename");
    }
    my $self = bless $attrs, $class;
    $self->check_config();
    return $self;
}

sub check_asset_info {
    my ($self, $asset, $asset_info) = @_;
    if (defined($asset_info->{minify}) && $asset_info->{minify}) {
        if (defined($asset_info->{type})) {
            my %TYPES = (javascript=>1, css=>1);
            unless ($TYPES{$asset_info->{type}}) {
                $log->warn("$asset: unknown asset type $asset_info->{type}");
            }
        } else {
            $log->warn("$asset: asset type is required to minify");
            $asset_info->{minify} = 0;
        }
    }
    unless (defined($asset_info->{files}) && ref $asset_info->{files} eq 'ARRAY') {
        $log->warn("$asset: files must be array of file names");
        $asset_info->{files} = [];
    }
}

sub check_tmpl_info {
    my ($self, $tmpl, $tmpl_info) = @_;
    my $assets = $self->{config}->{assets};
    my $assetlist = $tmpl_info->{assets};
    if (defined($assetlist) && ref $assetlist eq 'ARRAY') {
        for my $asset (@{$assetlist}) {
            unless (defined($assets->{$asset})) {
                $log->warn("$tmpl: no such asset: $asset");
            }
        }
    } else {
        $log->warn("$tmpl: files must be array of asset names");
        $tmpl_info->{assets} = [];
    }
}

sub check_config {
    my ($self) = @_;

    $self->load_config();
    if ($self->{_config_checked}) {
        return;
    }

    my $config = $self->{config};
    my $assets = $config->{assets};
    my $tmpls = $config->{tmpls};
    my %assets_flag = ();

    if (defined($config->{static_root})) {
        unless (-d $config->{static_root}) {
            $log->warn("static_root $config->{static_root} is not directory");
        }
    }
    if (defined($assets)) {
        for my $asset (keys %$assets) {
            $log->info("check config asset $asset");
            $assets_flag{$asset} = 0;
            $self->check_asset_info($asset, $assets->{$asset});
        }
    } else {
        $log->warn("no assets is configured");
        $config->{assets} = {};
    }
    if (defined($tmpls)) {
        for my $tmpl (keys %{$tmpls}) {
            my $tmpl_info = $tmpls->{$tmpl};
            $log->info("check config template $tmpl");
            $self->check_tmpl_info($tmpl, $tmpl_info);
            for my $asset (@{$tmpl_info->{assets}}) {
                $assets_flag{$asset} = 1;
            }
        }
    } else {
        $config->{tmpls} = {};
    }
    for my $asset (keys %assets_flag) {
        unless ($assets_flag{$asset}) {
            $log->notice("asset $asset is not referenced by tmpl");
        }
    }
    $self->{_config_checked} = 1;
}

sub load_config {
    my ($self) = @_;
    my $configfile = $self->{configfile};
    unless (defined($configfile)) {
        # initialized with config hash
        return;
    }

    my $cache = $self->cache($configfile);
    if ($cache && $cache->valid()) {
        return;
    }
    $self->cache($configfile, undef);
    $log->info("reload $configfile") if defined($self->{config});

    $self->{config} = decode_json(_read_file($configfile));
    $self->{_config_checked} = 0;
    # Invalidate all cache in case config is changed
    $self->{cache} = {};

    $cache = $Cache->new;
    $cache->add($configfile);
    $self->cache($configfile, $cache);
}

sub cache {
    my ($self, $name, $cache) = @_;
    if (scalar(@_) == 3) {
        $self->{cache}->{$name} = $cache;
        return $self;
    } else {
        return $self->{cache}->{$name};
    }
}

sub output_dir {
    my ($self) = @_;
    return $self->{config}->{static_root} // 'static';
}

sub templatelist {
    my ($self) = @_;
    return keys %{$self->{config}->{tmpls}};
}

sub template {
    my ($self, $tmpl) = @_;
    $self->check_config();
    return $self->{config}->{tmpls}->{$tmpl};
}

sub is_tmpl {
    my ($self, $path) = @_;
    return defined($self->template($path));
}

sub tmpl_path {
    my ($self, $tmpl) = @_;
    my $tmpl_info = $self->template($tmpl);
    if ($tmpl_info && $tmpl_info->{tmpl}) {
        return $tmpl_info->{tmpl};
    }
    return $self->output_dir."/".$tmpl.".tmpl";
}

sub tmpl_output_path {
    my ($self, $path) = @_;
    return $self->output_dir."/".$path;
}

sub render_tmpl {
    my ($self, $tmpl) = @_;
    unless ($self->is_tmpl($tmpl)) {
        $log->warn("no such tmpl: $tmpl");
        return;
    }
    $log->info("render tmpl $tmpl");

    my $tmpl_info = $self->template($tmpl);
    my $content;

    # load template
    my $cache = $self->cache($tmpl);
    if ($cache && $cache->valid()) {
        $content = $cache->{content};
    } else {
        $self->cache($tmpl, undef);
        my $tmpl_path = $self->tmpl_path($tmpl, $tmpl_info);

        $content = &_read_file($tmpl_path);
        unless (defined($content)) {
            $log->warn("[WARN] cannot read tmpl for $tmpl");
            return;
        }

        $cache = $Cache->new;
        $cache->add($tmpl_path);
        $cache->{content} = $content;
        $self->cache($tmpl, $cache);
    }

    # render tmpl
    for my $asset (@{$tmpl_info->{assets}}) {
        my ($path, $asset_content) = $self->make_asset($asset);
        if (defined($path)) {
            my $quoted = quotemeta($asset);
            $content =~ s#"${quoted}"#"${path}"#g;
        }
    }
    return $content;
}

sub render_tmpl_to_file {
    my ($self, $tmpl) = @_;
    my $path = $tmpl;
    my ($content) = $self->render_tmpl($tmpl);
    return unless defined($content);
    my $dest = $self->tmpl_output_path($path);
    $log->info("save tmpl $tmpl to $dest");
    if (!_write_file($dest, $content)) {
        die $log->fatal("failed to write tmpl $tmpl to $dest");
    }
    return ($dest, length($content));
}

sub assetlist {
    my ($self) = @_;
    return keys %{$self->{config}->{assets}};
}

sub asset {
    my ($self, $asset) = @_;
    $self->check_config();
    return $self->{config}->{assets}->{$asset};
}

sub is_asset {
    my ($self, $path) = @_;
    return defined($self->asset($path));
}

sub unique_asset_path {
    my ($self, $path, $content) = @_;
    my $fingerprint = substr(sha256_hex($content), 20);
    $path =~ s/\.[^.]+$|$/-$fingerprint$&/;
    return $path;
}

sub asset_output_path {
    my ($self, $path) = @_;
    return $self->output_dir."/".$path;
}

sub make_asset {
    my ($self, $asset) = @_;
    unless ($self->is_asset($asset)) {
        $log->warn("no such asset: $asset");
        return;
    }
    $log->info("make asset $asset");

    # check cache
    my $cache = $self->cache($asset);
    if ($cache && $cache->valid()) {
        return ($cache->{path}, $cache->{content});
    }
    $self->cache($asset, undef);

    # make asset
    my $asset_info = $self->asset($asset);
    my $content = "";
    $cache = $Cache->new;
    for my $file (@{$asset_info->{files}}) {
        $cache->add($file);
        my $subcontent = &_read_file($file);
        if (defined($subcontent)) {
            $content .= $subcontent."\n";
        } else {
            $log->warn("cannot read $file for asset $asset");
        }
    }
    my $path = $self->unique_asset_path($asset, $content);

    if ($asset_info->{minify}) {
        if ($asset_info->{type} eq 'javascript') {
            $content = minify_js($content);
        } elsif ($asset_info->{type} eq 'css') {
            $content = minify_css($content);
        }
    }

    $cache->{path} = $path;
    $cache->{content} = $content;

    $self->cache($asset, $cache);
    $self->cache($path, $cache);
    return $path, $content;
}

sub make_asset_to_file {
    my ($self, $asset) = @_;
    my ($path, $content) = $self->make_asset($asset);
    return unless defined($content);
    my $dest = $self->asset_output_path($path);
    $log->info("save asset $asset to $dest");
    if (!_write_file($dest, $content)) {
        die $log->fatal("failed to write asset $asset to $dest");
    }
    return ($dest, length($content));
}

sub minify_js {
    my ($content) = @_;
    return JavaScript::Minifier::XS::minify($content);
}

sub minify_css {
    my ($content) = @_;
    return CSS::Minifier::XS::minify($content);
}

1;
