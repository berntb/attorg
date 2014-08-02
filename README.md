Attorg
======

This open source project is an attempt to make a simple JavaScript implementation of a subset of Org Mode for Emacs. My exact use case was to browse my Org notes on my iPad, or on a borrowed computer, without using an ssh client.

The name comes from Atto Org. A small subset of Org Mode in a GUI style, but with most of the key commands.

From the choosen name, the obvious goal is less to replace Org Mode, more to have something usable from a generic web browser. At most, it is hoped this could become a gateway drug for Emacs... :-)

Status
------

Attorg was a bit stalled, since it really needs lots of love from someone with taste, both for UI and UX. In the end, I extracted the UI to templates and the menus to named commands. Now other people should be able to skin the important part.

Attorg use the Perl Dancer framework server side and on the client side jQuery, Twitter Bootstrap 2.3.2 and Font Awesome. It should probably be moved to Bootstrap 3 only.


Notes
-----

The most important part of the infrastructure is the Org::Parser from CPAN, from the ever productive Steven Haryanto. Thanks!

This upload is probably still not possible to clone -- it is done in a hurry, because I promised someone that was interested.

Chrome doesn't allow a program to get characters like control-N, control-T, meta-arrows and so on. I gave up on supporting it.

This is tested on FireFox for now and I'll check it with Safari on Mac and iPad (probably with external keyboard) before I deem it useful. (I don't have a Windows installation nearby but will try to find something to test it with.)

This is my project to learn JavaScript "for real", a lot has been rewritten/refactored more than once. (Lots of places don't even use CamelCase.) The code could fit in better with JavaScript Best Practices. Feedback appreciated!


When is this usable?
--------------------

I hope to get Attorg to where it is useful, so other people will contribute.

The full TODO list is... well, long and growing. :-)

Here is what I think is the minimum viable feature list still needed to make Attorg useful for browsing Org documents and minimal editing.

+ Installability, cough.
+ Documentation. And preferably C-h k, C-h a.
+ It should now be possible to extend Attorg with templates and buttons/menus. The templates needs to be extracted to a separate file maybe the template language should be replaced (presently Underscore.js is used.)
+ The command/key sequences shouldn't be listed in the code but put into a separate configuration file or in the GUI.
+ Saving(!) is needed. A couple of data sources should be configurable for users. At least one of Git or Dropbox should be supported.
+ Agendas, probably just by an Emacs process.
+ Tags.
+ More search support.


License
-------

The chosen license is GPL version 3, since it is about GNU Emacs.

/Bernt Budde
