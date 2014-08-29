Attorg
======

This open source project is an attempt to make a simple JavaScript implementation of a subset of Org Mode for Emacs. The name comes from a combination of 'Atto' and 'Org'. That is, a small subset of Org Mode.

The exact use case is to browse Org mode notes on an iPad or on a borrowed computer using just a web browser. Both the usual Emacs key bindings should work and there should be a GUI interface.

The goal is less to replace Org Mode and more to have a browser and minimal editor usable from the web. The most amibitious dream is that this project could become a gateway drug for Emacs. :-)

Status
------

Attorg was a bit stalled, since it really needs lots of love from someone with *taste*, both for UI and UX. This wasn't really solved, instead the UI was extracted to templates and the menus to named commands. (As it should have been from the beginning, of course.)

It should now be possible to skin Attorg with templates and buttons/menus.

Attorg use the Perl Dancer framework server side. The client side use jQuery, Underscore.js and Twitter Bootstrap 3.


Notes
-----

The most important part of the infrastructure is CPAN's Org::Parser, written by the ever productive Steven Haryanto. Thanks!

This is not feature complete for real use, yet. But it is moving along.

Chrome doesn't allow a program to get characters like control-N, control-T, meta-arrows. I gave up on supporting it.

This is tested on FireFox for now and I'll verify Safari on Mac and iPad before first real release. (I don't have a Windows installation nearby but will try to get it done there, too.)

This is my project to learn JavaScript "for real", a lot has been rewritten/refactored more than once. Lots of names don't even use CamelCase. I am more or less aware of JavaScript Best Practices, it is just hard to get over old habits. Feedback appreciated!


When is this usable?
--------------------

I hope to get Attorg to where it can be useful, so some real JavaScript guys will start to contribute. (The server side is quite trivial in the Perl way, i.e. mostly glue for CPAN modules which do the real work.)

There are no real text editing commands (M-t, C-d, etc). A full editor comes after the commands oriented towards the Org functionality on the TODO list. The GUI needs work from someone with good UI/UX understanding.

The full TODO list is... well, long. :-) And growing. :-(

Here is what I think is the minimum viable feature list still needed to make Attorg useful for browsing Org documents and a bit of editing.

+ It should be quite easy to install (still need tests).
+ Documentation. And preferably C-h k, C-h a.
+ The command/key sequences shouldn't be listed in the code but put into a separate configuration file or in the GUI.
+ Saving(!) is needed. A couple of data sources should be configurable for users. At least one of Git or Dropbox should be supported.
+ Agendas.
+ More complete tag and todo handling.
+ Date/time handling.


Supported key chars commands
----------------------------

The GUI is not necessary for adding tags, TODO state, priorites and level. You can specify that directly as in Emacs, when editing a Headline.

Also note that there is support for underlining etc, in the normal way, but for now the Greek letters like '\Alpha' etc are not supported.

These commands are implemented now, more or less completely.

### Some changes to the normal Emacs/Org Mode:

*  C-K,           Removes a Headline directly
*  C-G            Stops editing (closes fields) of a Headline/Block
*  C-Return,      As Ctrl-G, but saves any changes first
*  C-Space,       Jumps to (next) Headline being edited


#### Diverse:

*  OpenClose,     TAB // S-TAB // M-S-TAB
*  SaveDocument,  C-X C-S
*  NumberPrefix,  C-U // C-0 to C-9


#### Move around:

*  MoveLevelUp,   C-C C-U
*  MovePrevious,  C-C C-P // C-P // C-up arrow
*  MoveNext,      C-N // C-down arrow
*  PrevSameLevel, C-C C-B
*  NextSameLevel, C-C C-F

*  JumpAPageUp,   M-V
*  JumpAPageDown, C-V

*  ScrollTop,     M-< // S-M-<
*  ScrollBot,     M-> // S-M->


#### Todo handling:

*  TodoRotate,    C-C C-T


#### Change levels:

*  ShiftLeft,     M-left
*  ShiftLeft,     M-S-left
*  ShiftRight,    M-right
*  ShiftRight,    M-S-right


#### Move Headlines around:

*  HeadlineUp,    M-up
*  HeadlineDown,  M-down
*  MoveTreeUp,    M-S-up
*  MoveTreeDown,  M-S-down


#### Change priorities (not only todo lines):

*  HighPrio,      C-C , A
*  MediumPrio,    C-C , B
*  LowPrio,       C-C , C
*  ClearPrio,     C-C , \
*  PrioLower,     S-up
*  PrioHigher,    S-down



#### Tags:

*  EditHlineTags, C-C C-Q // C-C C-X T  # C-Q is dangerous for obvious reasons


License
-------

Attorg is licensed under GPL version 3, since this is about Stallman's GNU Emacs.

/Bernt Budde




