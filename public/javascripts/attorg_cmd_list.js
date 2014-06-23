

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Commands for Attorg:

// XXXX Needs to support numerical prefix like: C-U -12 <cmd>

function OrgAddKeyCmds(cmdHandler, ctrller, model, view) {
  var that = ctrller;			// (Just a shorter name.)

  cmdHandler.addCommand(
	"X-return",					// Like Ctrl-/Meta-Return
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In headline CR, before meta test");
      ctrller.updateEditedHeadline(headline);
      view.close_edit_headline( headline );
      var ix = headline.index;
      if (ctrl) {
        that._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      if (meta) {
        // XXXX Should this work like Emacs??
        // I.e., if the Headlines subtree is fully closed, M-CR
        // should open new Headline _after_ the tree. (Don't move
        // either the block or the text to the right of
        // the cursor to the new Headline).
        that._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      return true;
    },
	// Block case:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In block CR, before meta test");
      if (ctrl) {
        that.updateEditedHeadline(headline);
        that.view.close_edit_headline( headline );
        return true;
      }          
      if (!meta) return false;

      that.updateEditedHeadline(headline);
      that.view.close_edit_headline( headline );
      var ix     = headline.index;
      that._insertAndRenderHeading(ix+1, headline.level() );
      return true;
    }
  );


  cmdHandler.addCommand(
	"Break",					// Ctrl-G
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("Skip editing.");
      that.view.close_edit_headline( headline );
      return true;
    }
  );

  
  cmdHandler.addCommand(
	"OpenClose",				// TAB and shift-TAB
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var hide_action  = that.updateTreeVisibility( headline );
      if (!event.shiftKey)
        return true;

      // Difference from Emacs -- just show all after present
      // position.  (Later -- find out how to do scrolling so
      // we can keep the present field under editing visible.)
      var ix           = headline.index;
      var i;
      // var model        = headline.owner;
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
          that.updateTreeVisibility( headline, 'hide' );
          hide_action = 'hide';
        } else {
          that.updateTreeVisibility( headline, 'all' );
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
        that.updateTreeVisibility(top_headlines[i], hide_action);
      return true;
    });


  cmdHandler.addCommand(
	"MoveLevelUp",				// "C-C C-U"
	"Description",
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      // var model    = headline.owner;
      var ix       = headline.index;
      var level    = headline.level();

      // XXXX FIX, 1/2 written
      for(var i = ix-1; i >= 0; i--) {
        var nxtH       = model.headline(i);
        if (nxtH.level() < level) {
          // Save and close old Editing:
          nxtH.visible(true);
          // XXXXX Anything else here???
          that.saveAndGotoIndex(headline, i); // Should go block or hline??
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
      var ix           = headline.index;

      for(var i = ix-1; i >= 0; i--) {
        if (model.headline(i).visible()) {
          // Save and close old Editing:
          that.saveAndGotoIndex(headline, i, true);
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
      that.view.setFocusTitle( headline );
      return true;
	}
  );

  cmdHandler.addCommand(
	"MoveNext",					// "C-N, down, C-down"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      that.view.setFocusBlock( headline );
      return true;
    },
    // Block:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      // C-N in Block goes to next Visible Headline:
      var ix           = headline.index;

      if (keycode === 40 && !ctrl)
        return false;         // Don't use 'down' in Block

      for(var i = ix+1; i < model.length; i++) {
        if (model.headline(i).visible()) {
          that.saveAndGotoIndex(headline, i, false);
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
        that.levelChangeSubtree(tree[0], tree[1], -1);
      } else {
        that.levelChange(headline, headline.level()-1 );
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
        that.levelChangeSubtree(tree[0], tree[1], 1);
      } else {
        that.levelChange(headline, headline.level()+1 );
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
          that.moveHeadlineTree( prevTree[0], prevTree[1], // From
                                 thisTree[1]               // After this
                               );
      } else
        that.moveHeadlineUp( headline ); // Move single headline:
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
          that.moveHeadlineTree( nextTree[0], nextTree[1], // From
                                 thisTree[0]-1             // After this
                               );
      } else {
        // (Yeah, not really org-mode to move a single Headline by
        // default and the whole tree with shift-M-down.)
        that.moveHeadlineDown( headline );
      }
      return true;
	}
  );


  // ----------------------------------------------------------------------
  // Command key sequences:

  // XXXX Move these into a data structure later!  (In the end, it
  // should be user configurable.)

  cmdHandler.addKeyCode("X-return",    "X-CR");
  cmdHandler.addKeyCode("Break",       "C-G");
  cmdHandler.addKeyCode("OpenClose",   "X-TAB");
  cmdHandler.addKeyCode("MoveLevelUp", "C-C C-U");
  cmdHandler.addKeyCode("MovePrevious","C-80, up, C-up");
  cmdHandler.addKeyCode("MoveNext",    "C-N, down, C-down");


  cmdHandler.addKeyCode("ShiftLeft",   "M-left");
  cmdHandler.addKeyCode("ShiftRight",  "M-right");
  cmdHandler.addKeyCode("MoveTreeUp",  "M-up");
  cmdHandler.addKeyCode("MoveTreeDown","M-down");
};
