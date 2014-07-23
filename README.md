Attorg
======

This open source project is an attempt to make a simple JavaScript implementation of a subset of Org Mode for Emacs. My exact use case was to browse my Org notes on my iPad, or on a borrowed computer, without using an ssh client.

The name comes from Atto Org.

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


When is this usable?
--------------------

The full TODO list is... well, long. :-) I hope to get Attorg to where it is useful, so other people will contribute.

Here is what I think is the minimum viable feature list still needed to make Attorg useful for browsing Org documents and minimal editing.

+ Installability, cough.
+ It should now be possible to extend Attorg with templates and buttons/menus. The templates needs to be extracted to a separate file and I should ask for best template language to use (presently it is Underscore.js.)
+ The command/key sequence table should be put into a separate file.
+ Data sources should be configurable for users. At least one Git or Dropbox.
+ Saving(!) is needed.
+ Agendas should be done by starting a subprocess of Emacs.
+ Tags.
+ More search support.


License
-------

The chosen license is GPL version 3, since it is about GNU Emacs.

/Bernt Budde
