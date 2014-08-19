use strict;
use warnings;
use ExtUtils::MakeMaker;

WriteMakefile(
    NAME                  => 'attorg',
    AUTHOR                => q{Bernt Budde <Bernt.Budde@gmail.com>},
    VERSION_FROM          => 'lib/attorg.pm',
    ABSTRACT              => 'Attorg (Att Org). A mini-Org Mode in browsers.',
    ($ExtUtils::MakeMaker::VERSION >= 6.3002
      ? ('LICENSE'=> 'perl')
      : ()),
    PL_FILES              => {},
    PREREQ_PM => {
        'Test::More'      => 0,
        'YAML'            => 0,
        'Dancer'          => 1.3095,
        'Template'        => 0,
		# ------
		'Org::Parser'     => 0.39,
		'Text::Tabs'      => 0,
		'Git::Repository' => 0,

    },
    dist                  => { COMPRESS => 'gzip -9f', SUFFIX => 'gz', },
    clean                 => { FILES => 'attorg-*' },
);
