Attorg
======

This open source project is an attempt to make a simple JavaScript implementation of a subset of Org Mode for Emacs. My exact use case was to browse my Org notes on my iPad, or on a borrowed computer, without using an ssh client.

The name comes from Atto Org. A small subset of Org Mode in a GUI style, but with most of the key commands.

From the choosen name, the obvious goal is less to replace Org Mode, more to have something usable from a generic web browser. At most, it is hoped this project could become a gateway drug for Emacs. :-)

Status
------

Attorg was a bit stalled, since it really needs lots of love from someone with *taste*, both for UI and UX. In the end, I decided to extract the UI to templates and the menus to named commands.

It should now be possible to skin Attorg with templates and buttons/menus. The templates should probably still be extracted to a separate file. A more powerful template language might be needed, but Underscore.js seems to be enough.

Attorg use the Perl Dancer framework server side. The client side use jQuery, Underscore.js and Twitter Bootstrap 3.


Notes
-----

The most important part of the infrastructure is CPAN's Org::Parser, written by the ever productive Steven Haryanto. Thanks!

This is not feature complete for real use, yet. But it is moving along.

Chrome doesn't allow a program to get characters like control-N, control-T, meta-arrows. I gave up on supporting it.

This is tested on FireFox for now and I'll check it with Safari on Mac and iPad (probably with external keyboard) before I deem it possible to release. (I don't have a Windows installation nearby but will try to find something to test it with.)

This is my project to learn JavaScript "for real", a lot has been rewritten/refactored more than once. Lots of names don't even use CamelCase, so the code could fit in better with JavaScript Best Practices. Feedback appreciated!


When is this usable?
--------------------

I hope to get Attorg to where it is useful for some people, so some real JavaScript guys will start to contribute. (The server side is quite trivial in the Perl way, i.e. mostly glue for CPAN modules which do the real work.)

There are no real editing commands, it is a bit down on the ToDo list, first comes the commands oriented towards the Org structure. The GUI needs work from someone with good UI/UX understanding.

The full TODO list is... well, long and growing. :-)

Here is what I think is the minimum viable feature list still needed to make Attorg useful for browsing Org documents and a bit of editing.

+ It should be quite easy to install (still need tests).
+ Documentation. And preferably C-h k, C-h a.
+ The command/key sequences shouldn't be listed in the code but put into a separate configuration file or in the GUI.
+ Saving(!) is needed. A couple of data sources should be configurable for users. At least one of Git or Dropbox should be supported.
+ Agendas.
+ More complete tag handling.
+ Date/time handling.


Presently supported commands
----------------------------

These commands are implemented now, more or less completely. Not all are "real" Emacs/Org Mode. E.g. Ctrl-K removes a Headline directly. Ctrl-Return stops editing of a block text field. And so on.)

### Diverse:

*  OpenClose,     TAB // S-TAB // M-S-TAB	# Hierarchical change
*  SaveDocument,  C-X C-S


### Move around:

*  MoveLevelUp,   C-C C-U
*  MovePrevious,  C-C C-P // C-P // up arrow // C-up # (Block don't reuse up.)
*  MoveNext,      C-N // down arrow // C-down
*  PrevSameLevel, C-C C-B # Same or higher level
*  NextSameLevel, C-C C-F # Same or higher level

*  ScrollTop,     M-< // S-M-<
*  ScrollBot,     M-> // S-M->


### Todo handling:

*  TodoRotate,    C-C C-T


### Change levels:

*  ShiftLeft,     M-left
*  ShiftLeft,     M-S-left
*  ShiftRight,    M-right
*  ShiftRight,    M-S-right


### Move Headlines around:

*  HeadlineUp,    M-up
*  HeadlineDown,  M-down
*  MoveTreeUp,    M-S-up
*  MoveTreeDown,  M-S-down


### Change priorities (not only todo lines):

*  HighPrio,      C-C , A
*  MediumPrio,    C-C , B
*  LowPrio,       C-C , C
*  ClearPrio,     C-C , \
*  PrioLower,     S-up
*  PrioHigher,    S-down



### Tags:

*  EditHlineTags, C-C C-Q // C-C C-X T  # C-Q is dangerous for obvious reasons


#### Delete a Headline:

*  DelHeadline,   C-K  # Sorry about that :-)

* NumberPrefix,   C-U // C-0 to C-9



License
-------

Attorg is licensed under GPL version 3, since this is about Stallman's GNU Emacs.

/Bernt Budde
