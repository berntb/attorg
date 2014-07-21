Attorg
======

This open source project is an attempt to make a simple JavaScript implementation of a subset of Org Mode for Emacs.

The name comes from Atto Org.

From the choosen name, the obvious goal is less to replace Org Mode, more to have something usable from a generic web browser. At most, it is hoped this could become a gateway drug for Emacs... :-)

Notes
-----

Attorg is far from done and is a bit stalled, since it now really needs lots of love from someone with taste -- both in the UI and the UX department. I don't know any Emacs users with those skills. I went to templates on the user side, to make this less painful.

Attorg use the Perl Dancer framework server side and on the client side jQuery, Twitter Bootstrap 2.3.2 and Font Awesome. It should probably be moved to Bootstrap 3 only.

The most important part of the infrastructure is the Org::Parser from CPAN, from the ever productive Mr Steven Haryanto. Thanks!

This upload is probably still not possible to clone -- it is too early, done in a hurry, because I promised.

License
-------

The chosen license is GPL version 3, since it is about GNU Emacs.

/Bernt Budde
