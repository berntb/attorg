    # This file is part of Attorg. Copyright 2013 Bernt Budde.

    # Attorg is free software: you can redistribute it and/or modify
    # it under the terms of the GNU General Public License as published by
    # the Free Software Foundation, either version 3 of the License, or
    # (at your option) any later version.

    # Attorg is distributed in the hope that it will be useful,
    # but WITHOUT ANY WARRANTY; without even the implied warranty of
    # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    # GNU General Public License for more details.

    # You should have received a copy of the GNU General Public License
    # along with Attorg.  If not, see <http://www.gnu.org/licenses/>.

	# The author is Bernt Budde, see the GitHub account berntb.

use v5.10;

package attorg;
use Dancer ':syntax';
use strict;
use warnings;
# use Cwd qw/abs_path/;
use Sys::Hostname;
use File::Spec;
use Data::Dumper;

use Dancer::Plugin::Auth::Extensible;

use examples::simple_form;
use examples::navbar_login;
use examples::tabs;
use examples::show_file;
use examples::photo_gallery;
use examples::markdown;
use examples::template_plugins;
use examples::error_handling;
use examples::dynamic_content;

use Attorg::Extract::Org;

our $VERSION = '0.1';

get '/' => require_login sub {
    template 'index';
};

get '/info' => require_login sub {
    template 'info';
};

sub _get_org_file_data {
  my $file    = shift;

  my $user    = logged_in_user()->{user};
  my $data_dir= config->{userdata_top};

  my $to_read = File::Spec->catfile($data_dir, $user, $file);

  $to_read    = File::Spec->catfile($data_dir, $file)
	  if ! -f $to_read;

  # Catch errors here
  my $data    = Attorg::Extract::Org::get_org_presentation( $to_read );

  return $data;
}


sub _parse_org_headline {
  my $hline   = shift // '';
  my $block   = shift // '';

  $hline      =~ s/^\s*//;
  $hline      =~ s/\s*$//s;		# Remove empty spaces 
  $block      =~ s/\s*$//s;		# Block must be able to start on indentation.

  my $alltext = length($hline) ? $hline : '';
  $alltext   .= "\n " . $block
	  if length($block);

  # XXXX This is pure user supplied text from over a socket... Check
  # it more carefully, before sending it on to Parse::Org!!

  # Catch errors here.
  my $data    = Attorg::Extract::Org::get_org_from_string( $alltext );

  say STDERR "-" x 70, "\n$alltext\n", Dumper($data), "-" x 70, "\n";

  return undef  if !scalar @$data || !$data->[0]{document}
	  || ! defined $data->[1];

  # Title specifications and Block specs
  # say STDERR Dumper [$data->[1]->{title_subs}, $data->[1]->{block_parts}];
  return [$data->[1]->{title_subs}, $data->[1]->{block_parts}];
}



get '/attorg' => require_login sub {
  
  template 'attorg' =>
    {
     user_def => logged_in_user()->{user},
     filename => '',
    };
};

get '/attorg/edit/:file' => require_login sub {
  my $file    = params->{file};

  say STDERR "X" x 79;
  say STDERR $file;
  say STDERR "X" x 79, "\n";

  template 'attorg' =>
    {
     user_def => logged_in_user, # to_dumper( logged_in_user ),
     user_name=> logged_in_user->{user},
     filename => $file,
     # data     => to_json( $data ),
    };
};

get '/attorg/data/:file' => require_login sub {
  my $file    = params->{file};

  say STDERR "GETTING $file";
  return to_json( _get_org_file_data($file) );
};

get '/attorg/translate_row/' => require_login sub {
  my $headline= params->{headline} // '';
  my $block   = params->{text} // '';

  return to_json( _parse_org_headline($headline, $block) );
};


post '/attorg/translate_row/' => require_login sub {
  my $headline= params->{headline} // '';
  my $block   = params->{text} // '';

  return to_json( _parse_org_headline($headline, $block) );
};



# Just a test. Do verify path, so doesn't get /etc/passwd etc... :-)
get qr{/attorg/get_whole_string/(.*)} => require_login sub {
  my($file) = splat;

  # Google for: canonicalize
  say "Got '$file'";

};


get '/attorg/load/:file' => require_login sub {
  my $file    = params->{file};
  return "<h2>Bad file??</h2>\n"     if $file =~ m!/|[.][.]!;

  # Catch errors here!!
  my $data    = _get_org_file_data($file);

  return "<h2>$file</h2>\n" .
    "<pre>" . to_json( $data ) . "</pre>";
};



get '/foo' => require_login sub {
  return "foo" . Dumper logged_in_user;
  template 'foo';
};

get '/logout' => sub {
  session->destroy;
  set_flash('You are logged out.');
  redirect '/';
};

get '/deploy' => sub {
  template 'deployment_wizard',
    {
     directory => getcwd(),
     hostname  => hostname(),
     proxy_port=> 8000,
     cgi_type  => "fast",
     fast_static_files => 1,
    };
};

#The user clicked "updated", generate new Apache/lighttpd/nginx stubs
post '/deploy' => sub {
    my $project_dir = param('input_project_directory') || "";
    my $hostname = param('input_hostname') || "" ;
    my $proxy_port = param('input_proxy_port') || "";
    my $cgi_type = param('input_cgi_type') || "fast";
    my $fast_static_files = param('input_fast_static_files') || 0;

    template 'deployment_wizard', {
		directory => $project_dir,
		hostname  => $hostname,
		proxy_port=> $proxy_port,
		cgi_type  => $cgi_type,
		fast_static_files => $fast_static_files,
	};
};

true;
