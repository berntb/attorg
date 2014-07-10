

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Commands for Attorg:

// Note -- all the commands will get 'this' bound to the command
// Handler object and this.controller will be the controller.

// Remove model/view from these
function OrgAddKeyCmds(cmdHandler) {

  cmdHandler.addCommand(
	"X-return",					// Like Ctrl-/Meta-Return
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var view        = this.controller.view;
      console.log("In headline CR, before meta test");
      this.controller.updateEditedHeadline(headline);
      view.close_edit_headline( headline );
      var ix = headline.index;
      if (ctrl) {
        this.controller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      if (meta) {
        // XXXX Copy how it is in Emacs??
        // I.e., if the Headlines subtree is fully closed, M-CR
        // should open new Headline _after_ the tree. (Don't move
        // either the block or the text to the right of
        // the cursor to the new Headline).
        this.controller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      return true;
    },
	// Block case:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In block CR, before meta test");
      if (ctrl) {
        this.controller.updateEditedHeadline(headline);
        this.controller.view.close_edit_headline( headline );
        return true;
      }          
      if (!meta) return false;

      this.controller.updateEditedHeadline(headline);
      this.controller.view.close_edit_headline( headline );
      var ix     = headline.index;
      this.controller._insertAndRenderHeading(ix+1, headline.level() );
      return true;
    }
  );


  cmdHandler.addCommand(
	"Break",					// Ctrl-G
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("Skip editing.");
      this.controller.view.close_edit_headline( headline );
      return true;
    }
  );

  
  cmdHandler.addCommand(
	"OpenClose",				// TAB and shift-TAB
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var hide_action  = this.controller.updateTreeVisibility( headline );
      if (!event.shiftKey)
        return true;

      // Difference from Emacs -- just show all after present
      // position.  (Later -- find out how to do scrolling so
      // we can keep the present field under editing visible.)
      var ix           = headline.index;
      var i;
      var model        = this.controller.model;
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
          this.controller.updateTreeVisibility( headline, 'hide' );
          hide_action = 'hide';
        } else {
          this.controller.updateTreeVisibility( headline, 'all' );
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
        this.controller.updateTreeVisibility(top_headlines[i], hide_action);
      return true;
    });


  cmdHandler.addCommand(
	"MoveLevelUp",				// "C-C C-U"
	"Description",
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      var model    = this.controller.model;
      var ix       = headline.index;
      var level    = headline.level();

      // XXXX FIX, 1/2 written
      for(var i = ix-1; i >= 0; i--) {
        var nxtH       = model.headline(i);
        if (nxtH.level() < level) {
          // Save and close old Editing:
          nxtH.visible(true);
          // XXXXX Anything else here???
		   // Should go block or hline??
          this.controller.saveAndGotoIndex(headline, i);
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
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p,
			 number) {
      var model        = this.controller.model;
      var ix           = headline.index;

	  // If we have a negative C-U prefix number, make it 'movenext':
	  // XXXX
	  // this.getCommandHandler(name)(parameters) and call functionality.
	  // (getCommandHandler() must always return a function, even if
	  // it only logs an error.)

      for(var i = ix-1; i >= 0; i--) {
        if (model.headline(i).visible()) {
          // Save and close old Editing:
          this.controller.saveAndGotoIndex(headline, i, true);
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
      this.controller.view.setFocusTitle( headline );
      return true;
	}
  );

  cmdHandler.addCommand(
	"MoveNext",					// "C-N, down, C-down"
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      this.controller.view.setFocusBlock( headline );
      return true;
    },
    // Block:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (keycode === 40 && !ctrl)
        return false;         // Don't use 'down' in Block

      // C-N in Block goes to next Visible Headline:
      var model        = this.controller.model;

      var ix           = headline.index;
      for(var i = ix+1; i < model.length; i++) {
        if (model.headline(i).visible()) {
          this.controller.saveAndGotoIndex(headline, i, false);
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
        this.controller.levelChangeSubtree(tree[0], tree[1], -1);
      } else {
        this.controller.levelChange(headline, headline.level()-1 );
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
        this.controller.levelChangeSubtree(tree[0], tree[1], 1);
      } else {
        this.controller.levelChange(headline, headline.level()+1 );
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
          this.controller.moveHeadlineTree( prevTree[0], prevTree[1], // From
											thisTree[1]         // After this
                               );
      } else
        this.controller.moveHeadlineUp( headline ); // Move single headline:
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
          this.controller.moveHeadlineTree( nextTree[0], nextTree[1], // From
											thisTree[0]-1       // After this
								  );
      } else {
        // (Yeah, not really org-mode to move a single Headline by
        // default and the whole tree with shift-M-down.)
        this.controller.moveHeadlineDown( headline );
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
	"TodoRotate",
	"Rotate the value of the TODO",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In TodoRotate");

	  var todoNow  = headline.todo();
	  var model    = this.controller.model;
	  var all_todo_done_states = model.all_todo_done_states();
	  var i = -1;
	  if (todoNow !== '') {
		for(i = 0; i < all_todo_done_states.length; i++) {
		  if (all_todo_done_states[i] === todoNow)
			break;
		}
	  }
	  i++;
	  var newState;
	  if (i >= all_todo_done_states.length)
		newState = '';
	  else
		newState =  all_todo_done_states[i];

	  console.log("New state " + newState);
	  headline.todo(newState);
	  this.controller.view.render_headline( headline, true, true );
	  

	  return true;
	}
  );


  cmdHandler.addCommand(
	"NumberPrefix",				// C-U
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p,
			 number) {
	  var inChar = this._getCharFromEvent(event, true);

	  var flagNoCharsYet;
	  if (inChar >= '1' && inChar <= '9') {
		flagNoCharsYet = false;
		// Starts C-U sequence with C-\d instead.
		this.setPrefixValue(inChar);
	  } else {
		// This will make C-U \d+ overwrite this '4':
		flagNoCharsYet = true;
		this.setPrefixValue('4');
	  }

	  var handlerObj =  this;
	  this.setCharacterFilter(
		function(charEvent) {
		  var ctrlKey  = event.ctrlKey;
		  var inChar = handlerObj._getCharFromEvent(charEvent, true);
		  console.log("C-U filter checks " + inChar);
		  if (ctrlKey && inChar === 'U') {
			flagNoCharsYet = false;
			var existingValue = handlerObj.getPrefixValue();
			var newValue = parseInt(existingValue, 10) * 4;
		  	handlerObj.setPrefixValue( newValue.toString() );
		  	return true;
		  }
		  if (flagNoCharsYet && inChar === '-') {
		  	flagNoCharsYet = false;
		  	handlerObj.setPrefixValue('-');
		  	return true;
		  }
		  // N B -- this doesn't check if 
		  if (inChar >= '0' && inChar <= '9') {
		  	if (flagNoCharsYet) {
		  	  flagNoCharsYet = false;
		  	  handlerObj.setPrefixValue(inChar);
		  	} else
			  handlerObj.setPrefixValue(handlerObj.getPrefixValue() + inChar);

			// console.log("C-U " + handlerObj.getPrefixValue());
		  	return true;		// Means -- took this char.
		  }

		  // No more collecting characters:
		  handlerObj.setCharacterFilter( undefined );

		  return false;
		}
	  );

	  return true;
	}
  );
  

  cmdHandler.addCommand(
	"Return",
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      console.log("In headline CR, before meta test");
      this.controller.updateEditedHeadline(headline);
      this.controller.view.close_edit_headline( headline );
      var ix = headline.index;
      if (ctrl) {
        this.controller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      if (meta) {
        // XXXX Copy how it is in Emacs??
        // I.e., if the Headlines subtree is fully closed, M-CR
        // should open new Headline _after_ the tree. (Don't move
        // either the block or the text to the right of
        // the cursor to the new Headline).
        this.controller._insertAndRenderHeading(ix+1, headline.level() );
        return true;
      }
      return true;
    },
	// Block case:
	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
      if (ctrl) {
		console.log("In headline CR, before meta test");
		this.controller.updateEditedHeadline(headline);
		this.controller.view.close_edit_headline( headline );
		return true;
	  }
	  return false				// Ignore
	}
  );


  cmdHandler.addCommand(
	"ScrollTop",
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
	  var model = this.controller.model;
	  if (model.length) {
		  this.controller.saveAndGotoIndex(headline, 0, false);
	  }
	  $("html, body").animate({ scrollTop: 0 }, "slow");
	  return true;
	}
  );

  cmdHandler.addCommand(
	"ScrollBot",
	"Description",

	function(keyboard_p, event, ctrl, meta, keycode, headline, block_p) {
	  var model = this.controller.model;
	  if (model.length) {
		// XXXX Make more than the last one visible???
		var nextHeadline = this.controller.model.headline(model.length-1);
		nextHeadline.visible(true);
		this.controller.saveAndGotoIndex(headline, model.length-1, false);
		var height = $(document).height();
		$("html, body").animate({ scrollTop: height }, "slow");
	  }
	  return true;
	}
  );



  // ----------------------------------------------------------------------
  // Command key sequences:

  // XXXX Move these into a data structure later!  (In the end, it
  // should be user configurable.)

  // cmdHandler.addKeyCode("X-return",    "X-CR");
  // cmdHandler.addKeyCode("Break",       "C-G");

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
  cmdHandler.addKeyCommand("MovePrevious", "C-C C-P");
  cmdHandler.addKeyCommand("MovePrevious", "C-P"); // Later, just move line
  cmdHandler.addKeyCommand("MovePrevious", "up");
  cmdHandler.addKeyCommand("MovePrevious", "C-up");
  cmdHandler.addKeyCommand("MoveNext",     "C-N");
  cmdHandler.addKeyCommand("MoveNext",     "down");
  cmdHandler.addKeyCommand("MoveNext",     "C-down");

  // Lots of keyboards needs shift to write '<', so... :-(
  cmdHandler.addKeyCommand("ScrollTop",     "M-<");
  cmdHandler.addKeyCommand("ScrollTop",     "S-M-<");
  cmdHandler.addKeyCommand("ScrollBot",     "M->");
  cmdHandler.addKeyCommand("ScrollBot",     "S-M->");

  // Set Mark, C-X C-X, [copy/paste??]
  cmdHandler.addKeyCommand("SetMark",      "C-space");

  cmdHandler.addKeyCommand("TodoRotate",   "C-C C-T");


  cmdHandler.addKeyCommand("ShiftLeft",    "M-left");
  cmdHandler.addKeyCommand("ShiftLeft",    "M-S-left");
  cmdHandler.addKeyCommand("ShiftRight",   "M-right");
  cmdHandler.addKeyCommand("ShiftRight",   "M-S-right");

  cmdHandler.addKeyCommand("MoveTreeUp",   "M-up");
  cmdHandler.addKeyCommand("MoveTreeDown", "M-down");

  cmdHandler.addKeyCommand("NumberPrefix", "C-U");
  cmdHandler.addKeyCommand("NumberPrefix", "C-0");
  cmdHandler.addKeyCommand("NumberPrefix", "C-1");
  cmdHandler.addKeyCommand("NumberPrefix", "C-2");
  cmdHandler.addKeyCommand("NumberPrefix", "C-3");
  cmdHandler.addKeyCommand("NumberPrefix", "C-4");
  cmdHandler.addKeyCommand("NumberPrefix", "C-5");
  cmdHandler.addKeyCommand("NumberPrefix", "C-6");
  cmdHandler.addKeyCommand("NumberPrefix", "C-7");
  cmdHandler.addKeyCommand("NumberPrefix", "C-8");
  cmdHandler.addKeyCommand("NumberPrefix", "C-9");

};
