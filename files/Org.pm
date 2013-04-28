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

	# The author is Bernt Budde, see my GitHub account, user berntb.


# This really needs a cleanup.

use 5.010;

use strict;
use warnings;

package Attorg::Extract::Org;

use Org::Parser;

use Data::Dumper;
$Data::Dumper::Quotekeys = 1;
$Data::Dumper::Sortkeys  = 1;

# TODO: priority, tags, progress (??), etc, etc...

sub get_org_presentation {

  my $org_file = shift;

  die "No file '$org_file'"              if ! -f $org_file;

  my $orgp = Org::Parser->new();
  my $doc = $orgp->parse_file($org_file);

  my @headlines_for_json;
  trav($doc, \@headlines_for_json);

  return \@headlines_for_json;
}



# - - - Flatten Data structure, recursive routine:
sub trav {
  my $el      = shift;
  my $store   = shift;

  my $indent  = shift || 0;     # Just for testing
  my $pre     = " " x $indent;

  if ($el->isa('Org::Document')) {
    push @$store, { document    => 1,
                    todo_states => $el->todo_states,
                    done_states => $el->done_states,
                    priorities  => $el->priorities,
                    drawer_names=> $el->drawer_names,
                  };
    for my $kid (@{$el->{children}}) {
      trav($kid, $store, $indent + 2);
    }
  }

  return                          if ! $el->isa('Org::Element::Headline');

  my $hdr_spec= { level     => $el->level,
                  tags      => $el->tags() // '',
                  # is_todo   => $el->is_todo ? 1 : 0,
                  # is_done   => $el->is_done ? 1 : 0,
                  # todo_state=> $el->todo_state // '',
                };
  $hdr_spec->{todo_state} = $el->todo_state
    if $el->todo_state && length($el->todo_state);
  push @$store, $hdr_spec;

  # say ${pre}, "-" x 60;
  # print $pre, $el->{level}, " ", $el->{_str};

  # - - - Handle title:
  die "${pre}WTF?! No title"             if ! exists $el->{title};

  my $title = $el->title();
  $hdr_spec->{title_text} = $title->as_string(); # With any children
  # Store any sub-parts of the title:
  if (exists $title->{children}) {
    my @title_parts;
    for my $kid (@{ $title->{children} }) {
      # if (ref($kid) eq 'Org::Element::Link') {
      #   my $desc = $kid->description();
      #   print 'Got Link! ';
      #   print 'Description type ', ref($desc), ', val is ', $desc  if $desc;
      #   say " Link val:", $kid->as_string();
      #   say "Links raw is ", $kid->_str()    if $kid->_str;
      # }
      my $kiddo = [ ref($kid), $kid->as_string() ];
      push @$kiddo, $kid->style()        if ref($kid) eq "Org::Element::Text";
      push @title_parts, $kiddo;
    }
    $hdr_spec->{title_subs} = \@title_parts;
    # say "${pre}Title got @title_parts";
  }

  return                                 if ! exists $el->{children};

  my @blocks;
  for my $kid (@{$el->{children}}) {
    if ($kid->isa('Org::Element::Headline')) {
 trav($kid, $store, $indent + 2);
      next;
    }
    # Not Headline: A list of parts of the text block.
    # (This will always come before the Headline kids, so a straight
    # print will work. Neat.)
    # XXXX Need to do special handling for any types??
    push @blocks, [ ref($kid), $kid->as_string() ];
  }
  if (@blocks) {
    $hdr_spec->{block} = join('', map { $_->[1] } @blocks);
    if ($hdr_spec->{block} =~ /\S/) {
      my($indent, $text) = check_block_indentation($hdr_spec->{block});
      # say "Selected indent ", $indent;
      if ($indent) {
        $hdr_spec->{block_indent} = $indent;
        $hdr_spec->{block} = $text;
      }
    }
    if (@blocks > 1 || $blocks[0][0] ne 'Org::Element::Text') {
      # Like for title, store the sub-parts
      $hdr_spec->{block_parts} = \@blocks;
    }
  }
}

sub check_block_indentation {
  # N B -- this fun removes '\n' for last line in block, which is
  # set by Org::Parser. Adds it back explicitly
  my $block   = shift;

  my @lines   = split /\r?\n/, $block;
  my $indent  = undef;
  for my $l (@lines) {
    my($s,$t) = $l =~ /^(\s*)(.*?)\s*$/;
    next                                 if $t eq '';
    my $no    = length($s);
    # say "Block $no/$s/$t";
    return 0, undef                      if $no == 0; # No indentation
    $indent   = $no                      if !defined $indent || $indent > $no;
  }

  return 0, undef                        if !$indent;

  @lines      = map { substr($_,$indent) if length($_) >= $indent } @lines;
  return $indent, join("\n", @lines) . "\n";
}
