

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Commands for Attorg:

// XXXX Needs to support numerical prefix like: C-U -12 <cmd>


// Remove model/view from these
function OrgAddKeyCmds(cmdHandler, ctrller) {

  cmdHandler.addCommand(
	"X-return",					// Like Ctrl-/Meta-Return
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var view        = ctrller.view;
      console.log("In headline CR, before meta test");
      ctrller.updateEditedHeadline(headline);
      view.close_edit_headline( headline );
      var ix = headline.index;
      if (ctrl) {
        ctrller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      if (meta) {
        // XXXX Copy how it is in Emacs??
        // I.e., if the Headlines subtree is fully closed, M-CR
        // should open new Headline _after_ the tree. (Don't move
        // either the block or the text to the right of
        // the cursor to the new Headline).
        ctrller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      return true;
    },
	// Block case:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In block CR, before meta test");
      if (ctrl) {
        ctrller.updateEditedHeadline(headline);
        ctrller.view.close_edit_headline( headline );
        return true;
      }          
      if (!meta) return false;

      ctrller.updateEditedHeadline(headline);
      ctrller.view.close_edit_headline( headline );
      var ix     = headline.index;
      ctrller._insertAndRenderHeading(ix+1, headline.level() );
      return true;
    }
  );


  cmdHandler.addCommand(
	"Break",					// Ctrl-G
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("Skip editing.");
      ctrller.view.close_edit_headline( headline );
      return true;
    }
  );

  
  cmdHandler.addCommand(
	"OpenClose",				// TAB and shift-TAB
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var hide_action  = ctrller.updateTreeVisibility( headline );
      if (!event.shiftKey)
        return true;

      // Difference from Emacs -- just show all after present
      // position.  (Later -- find out how to do scrolling so
      // we can keep the present field under editing visible.)
      var ix           = headline.index;
      var i;
      var model        = ctrller.model;
      var hidden       = false;
      var shown        = false;
      var top_headlines= [];
      for(i = ix+1; i < model.length; i++) {
        var later_hline= model.headline(i);
        if (later_hline.visible())
          shown = true;
        else
          hidden = true;
        if (later_hline.level() === 1)
          top_headlines.push( later_hline );
      }
      // XXXX Should have logic for only showing children??

      // XXXX BUGGY -- will hide when editing non-level 1!! XXXX

      if (hide_action === 'kids') {
        // Just one or the other:
        if (shown && !hidden) {
          ctrller.updateTreeVisibility( headline, 'hide' );
          hide_action = 'hide';
        } else {
          ctrller.updateTreeVisibility( headline, 'all' );
          hide_action = 'all';
        }
      }

      if (hide_action === '') {
        if (hidden === false)
          hide_action = 'hide';
        else {
          hide_action = 'all';
        }
      }

      console.log("Shift-TAB action:" + hide_action);

      for(i = 0; i < top_headlines.length; i++)
        ctrller.updateTreeVisibility(top_headlines[i], hide_action);
      return true;
    });


  cmdHandler.addCommand(
	"MoveLevelUp",				// "C-C C-U"
	"Description",
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var model    = ctrller.model;
      var ix       = headline.index;
      var level    = headline.level();

      // XXXX FIX, 1/2 written
      for(var i = ix-1; i >= 0; i--) {
        var nxtH       = model.headline(i);
        if (nxtH.level() < level) {
          // Save and close old Editing:
          nxtH.visible(true);
          // XXXXX Anything else here???
          ctrller.saveAndGotoIndex(headline, i); // Should go block or hline??
          return true;
        }
      }
      // XXXX Move somewhere else??
      return true;
	}
  );


  cmdHandler.addCommand(
	"MovePrevious",				// 'C-80, up, C-up'
	"Description",
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var model        = ctrller.model;

      var ix           = headline.index;
      for(var i = ix-1; i >= 0; i--) {
        if (model.headline(i).visible()) {
          // Save and close old Editing:
          ctrller.saveAndGotoIndex(headline, i, true);
          break;
        }
      }
      return true;
    },
    // Block:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (keycode === 38 && !ctrl)
        return false;         // Don't use 'up' in Block

      // Just go to Title:
      ctrller.view.setFocusTitle( headline );
      return true;
	}
  );

  cmdHandler.addCommand(
	"MoveNext",					// "C-N, down, C-down"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      ctrller.view.setFocusBlock( headline );
      return true;
    },
    // Block:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (keycode === 40 && !ctrl)
        return false;         // Don't use 'down' in Block

      // C-N in Block goes to next Visible Headline:
      var model        = ctrller.model;

      var ix           = headline.index;
      for(var i = ix+1; i < model.length; i++) {
        if (model.headline(i).visible()) {
          ctrller.saveAndGotoIndex(headline, i, false);
          break;
        }
      }
      return true;

	}
  );


  cmdHandler.addCommand(
	"ShiftLeft",				// "M-left"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (headline.level() === 1)   return true;          // No change

      if (event.shiftKey) {
        var tree = headline.findSubTree();
        ctrller.levelChangeSubtree(tree[0], tree[1], -1);
      } else {
        ctrller.levelChange(headline, headline.level()-1 );
      }
      return true;
	}
  );


  cmdHandler.addCommand(
	"ShiftRight",				// "M-right"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      // If shift, moves the whole subtree.
      if (event.shiftKey) {
        var tree = headline.findSubTree();
        ctrller.levelChangeSubtree(tree[0], tree[1], 1);
      } else {
        ctrller.levelChange(headline, headline.level()+1 );
      }
      return true;
	}
  );


  cmdHandler.addCommand(
	"MoveTreeUp",				// "M-up"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var ix = headline.index;
      if (event.shiftKey) {
        // Just temp to test:
        var thisTree  = headline.findSubTree();
        var prevTree  = headline.findPrevSubTree();
        if (prevTree !== undefined && thisTree !== undefined)
          ctrller.moveHeadlineTree( prevTree[0], prevTree[1], // From
                                 thisTree[1]               // After this
                               );
      } else
        ctrller.moveHeadlineUp( headline ); // Move single headline:
      return true;
	}
  );


  cmdHandler.addCommand(
	"MoveTreeDown",				// "M-down"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (event.shiftKey) {
        var thisTree  = headline.findSubTree();
        var nextTree  = headline.findNextSubTree();
        if (nextTree !== undefined && thisTree !== undefined)
          ctrller.moveHeadlineTree( nextTree[0], nextTree[1], // From
									thisTree[0]-1             // After this
								  );
      } else {
        // (Yeah, not really org-mode to move a single Headline by
        // default and the whole tree with shift-M-down.)
        ctrller.moveHeadlineDown( headline );
      }
      return true;
	}
  );


  // ----------------------------------------------------------------------
  // New generation commands:



  cmdHandler.addCommand(
	"SetMark",
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In SetMark");
	  return true;
	}
  );


  cmdHandler.addCommand(
	"Return",
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In headline CR, before meta test");
      ctrller.updateEditedHeadline(headline);
      ctrller.view.close_edit_headline( headline );
      var ix = headline.index;
      if (ctrl) {
        ctrller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      if (meta) {
        // XXXX Copy how it is in Emacs??
        // I.e., if the Headlines subtree is fully closed, M-CR
        // should open new Headline _after_ the tree. (Don't move
        // either the block or the text to the right of
        // the cursor to the new Headline).
        ctrller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      return true;
    },
	// Block case:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
	  return false				// Ignore
	}
  );


  // ----------------------------------------------------------------------
  // Command key sequences:

  // XXXX Move these into a data structure later!  (In the end, it
  // should be user configurable.)

  // cmdHandler.addKeyCode("X-return",    "X-CR");
  // cmdHandler.addKeyCode("Break",       "C-G");
  // cmdHandler.addKeyCode("OpenClose",   "X-TAB");
  // cmdHandler.addKeyCode("MoveLevelUp", "C-C C-U");
  // cmdHandler.addKeyCode("MovePrevious","C-80, up, C-up");
  // cmdHandler.addKeyCode("MoveNext",    "C-N, down, C-down");


  // cmdHandler.addKeyCode("ShiftLeft",   "M-left");
  // cmdHandler.addKeyCode("ShiftRight",  "M-right");
  // cmdHandler.addKeyCode("MoveTreeUp",  "M-up");
  // cmdHandler.addKeyCode("MoveTreeDown","M-down");

  cmdHandler.addKeyCommand("Return",       "CR");
  cmdHandler.addKeyCommand("Return",       "C-CR");
  cmdHandler.addKeyCommand("Return",       "M-CR");
  // This should open a new Headline after any subs of lower level
  // cmdHandler.addKeyCommand("controlReturn","C-CR");
  cmdHandler.addKeyCommand("Break",        "C-G");
  cmdHandler.addKeyCommand("OpenClose",    "TAB");
  cmdHandler.addKeyCommand("OpenClose",    "S-TAB");
  cmdHandler.addKeyCommand("OpenClose",    "M-S-TAB");
  cmdHandler.addKeyCommand("MoveLevelUp",  "C-C C-U");
  cmdHandler.addKeyCommand("MoveLevelUp",  "C-C C-P");
  cmdHandler.addKeyCommand("MovePrevious", "C-P");
  cmdHandler.addKeyCommand("MovePrevious", "up");
  cmdHandler.addKeyCommand("MovePrevious", "C-up");
  cmdHandler.addKeyCommand("MoveNext",     "C-N");
  cmdHandler.addKeyCommand("MoveNext",     "down");
  cmdHandler.addKeyCommand("MoveNext",     "C-down");

  // Lots of keyboards needs shift to write '<', so... :-(
  // cmdHandler.addKeyCommand("ScrollTop",     "M-<");
  // cmdHandler.addKeyCommand("ScrollTop",     "S-M-<");
  // cmdHandler.addKeyCommand("ScrollBot",     "M->");
  // cmdHandler.addKeyCommand("ScrollTop",     "S-M->");

  // Set Mark, C-X C-X, [copy/paste??]
  cmdHandler.addKeyCommand("SetMark",      "C-space");

 // cmdHandler.addKeyCommand("numberPrefix",  "C-U");


  cmdHandler.addKeyCommand("ShiftLeft",    "M-left");
  cmdHandler.addKeyCommand("ShiftRight",   "M-right");
  cmdHandler.addKeyCommand("MoveTreeUp",   "M-up");
  cmdHandler.addKeyCommand("MoveTreeDown", "M-down");
};
