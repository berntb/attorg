//    This file is part of attorg.  Copyright 2013, 2014 Bernt Budde.
//
//    Attorg is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    Attorg is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with Attorg.  If not, see <http://www.gnu.org/licenses/>.

//    The author is Bernt Budde, see my GitHub account, user berntb.
// ----------------------------------------------------------------------


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Commands for Attorg:

// Note -- all the commands will get 'this' bound to the command
// Handler object and this.controller will be the controller.

// Remove model/view from these
function OrgAddKeyCmds(cmdHandler) {

  cmdHandler.addACommand({
	name:  "X-return",			// (Like Ctrl-/Meta-Return)
	docum: "Description",

	text:  function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  var view		  = this.controller.view;
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
	block: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  console.log("In block CR, before meta test");
	  if (ctrl) {
		this.controller.updateEditedHeadline(headline);
		this.controller.view.close_edit_headline( headline );
		return true;
	  }			 
	  if (!meta) return false;

	  this.controller.updateEditedHeadline(headline);
	  this.controller.view.close_edit_headline( headline );
	  var ix	 = headline.index;
	  this.controller._insertAndRenderHeading(ix+1, headline.level() );
	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "Break",
	docum: "Description",
	both:  function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  console.log("Skip editing.");
	  this.controller.view.close_edit_headline( headline );
	  return true;
	}
  });

  
  cmdHandler.addACommand({
	name:  "OpenClose",			// (TAB and shift-TAB)
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {

	  var hide_action  = this.controller.updateTreeVisibility( headline );
	  // XXXX This makes the shift-TAB impossible to call as a command.
	  if (!charEvent || !event.shiftKey)
		return true;

	  // - - - shift-TAB:

	  // XXXX Do this the Emacs way instead, when implements hiding of text:
	  // - If all Headlines but no body text, show ALL (including body text).
	  // - If JUST 1st level Headlines, ALL Headlines are shown (no body)
	  // - Otherwise, JUST show 1st level AND goes to superior level 1.

	  console.log("Doing SHIFT-key, opening/closing everything");
	  var ix		   = headline.index;
	  var i;
	  var model		   = this.controller.model;
	  var hidden	   = false;
	  var shown		   = false;
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
	}
  });


  cmdHandler.addACommand({
	name:  "MoveLevelUp",		// ("C-C C-U" style)
	docum: "Description",
	both:  function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  var model	   = this.controller.model;
	  var ix	   = headline.index;
	  var level	   = headline.level();

	  // XXXX FIX, 1/2 written
	  for(var i = ix-1; i >= 0; i--) {
		var nxtH	   = model.headline(i);
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
  });


  cmdHandler.addACommand({
	name:  "MovePrevious",				// 'C-80, up, C-up'
	docum: "Description",
	text:  function(charEvent, event, ctrl, meta, keycode, headline, block_p,
					number) {
	  // If we have a negative C-U prefix number, make it 'movenext':
	  if (number !== undefined && number < 0) {
		return this.callCommand('MoveNext',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  block_p,
								  numericalPrefix: -number
								});
	  }

	  var model		   = this.controller.model;
	  var ix		   = headline.index;
	  var numOfHlines  = number === undefined ? 1 : number;
	  var foundSpec	   = model.findHeadlinesFrom(
		ix, numOfHlines, -1, function(headline) {
		  return headline.visible() ? true : false;
		}
	  );
	  console.log("FOUND SPEC FROM " + ix + " GOT TO:" + foundSpec);
	  if (foundSpec[0] != ix)
		this.controller.saveAndGotoIndex(headline, foundSpec[0], true);

	  return true;
	},
	// Block:
	block: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
					number) {
	  if (keycode === 38 && !ctrl)
		return false;		  // Don't use 'up' in Block

	  // Negative number prefix? Go other way
	  if (number !== undefined && number < 0) {
		return this.callCommand('MoveNext',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  block_p,
								  numericalPrefix: -number
								});
	  }

	  // If this is config, go to previous (no title text). And if we
	  // have a numerical prefix, jump so many Headlines (yes, that
	  // means that C-U 1 C-P goes to previous Headline.)
	  if (headline.is_config() || number !== undefined)
		return this.callCommand('MovePrevious',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  false,
								  numericalPrefix: number
								});

	  // Just go to Title of this:
	  this.controller.view.setFocusTitle( headline );
	  
	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "MoveNext",					// ("C-N, down, C-down")
	docum: "Move to next (visible) item",

	text: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
				   number) {
	  if (number !== undefined && number < 0) {
		return this.callCommand('MovePrevious',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  block_p,
								  numericalPrefix: -number
								});
	  }

	  if (number === undefined) {
		this.controller.view.setFocusBlock( headline );
		return true;
	  }

	  // Call itself, for Block:
	  // N B -- C-U 1 goes to next Headline, C-U 2 goes to next-next.
	  return this.callCommand('MoveNext',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  true,
								  numericalPrefix: number
								});
	},
	// Block:
	block: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
					number) {
	  if (block_p && keycode === 40 && !ctrl)
		return false;		  // Don't use 'down' in Block

	  if (number !== undefined && number < 0) {
		return this.callCommand('MovePrevious',
								{
								  charEvent: true,
								  event:	  event,
								  headline:	  headline,
								  isBlock:	  block_p,
								  numericalPrefix: -number
								});
	  }

	  // C-N in Block goes to next Visible Headline:
	  var model		   = this.controller.model;
	  var ix		   = headline.index;
	  var numOfHlines  = number === undefined ? 1 : number;
	  var foundSpec	   = model.findHeadlinesFrom(
		ix, numOfHlines, 1, function(headline) {
		  return headline.visible() ? true : false;
		}
	  );
	  console.log("FOUND SPEC FROM " + ix + " GOT TO:" + foundSpec);
	  if (foundSpec[0] != ix)
		this.controller.saveAndGotoIndex(headline, foundSpec[0], false);
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "ShiftLeft",			// ("M-left")
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  if (headline.level() === 1)	return true;		  // No change

	  if (event.shiftKey) {
		var tree = headline.findSubTree();
		this.controller.levelChangeSubtree(tree[0], tree[1], -1);
	  } else {
		this.controller.levelChange(headline, headline.level()-1 );
	  }
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "ShiftRight",		// ("M-right")
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  // If shift, moves the whole subtree.
	  if (event.shiftKey) {
		var tree = headline.findSubTree();
		this.controller.levelChangeSubtree(tree[0], tree[1], 1);
	  } else {
		this.controller.levelChange(headline, headline.level()+1 );
	  }
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "HeadlineUp",		// ("M-up")
	docum: "Description",

	// XXXX Must open/close better. Confused with open arrows if moves:
	// * A
	// * B moved up, then down
	// ** C
	// ** D

	autoMove: true,				// XXXX Implement

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  this.controller.moveHeadlineUp( headline ); // Move single headline:
	  return true;
	}
  });
  cmdHandler.addACommand({
	name:  "HeadlineDown",		// ("M-down")
	docum: "Description",

	autoMove: true,				// XXXX Implement

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  this.controller.moveHeadlineDown( headline ); // Move single headline:
	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "MoveTreeUp",		// "M-S-up"
	docum: "Description",

	// XXXX Implement moving multiple lines with C-U

	// XXXX Need to split this into two, so can use as command
	// names. (For menu use, M-X, etc.)
	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
				   number) {
	  var thisTree	= headline.findSubTree();
	  var prevTree	= headline.findPrevSubTree();
	  if (prevTree !== undefined && thisTree !== undefined)
		this.controller.moveHeadlineTree( prevTree[0], prevTree[1], // From
										  thisTree[1]		  // After this
										);
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "MoveTreeDown",				// "M-down"
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  var thisTree	= headline.findSubTree();
	  var nextTree	= headline.findNextSubTree();
	  if (nextTree !== undefined && thisTree !== undefined)
		this.controller.moveHeadlineTree( nextTree[0], nextTree[1], // From
										  thisTree[0]-1		  // After this
										);
	  return true;
	}
  });


  // ----------------------------------------------------------------------
  // New generation commands:

  cmdHandler.addACommand({
	name:  "DelHeadline",
	docum: "Description",

	// XXXX Support C-U number!1

	// Puts mark on whole Headline
	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {

	  var model	   = this.controller.model;
	  var view	   = this.controller.view;

	  if (headline.visible_children() !== 'all_visible')
		// && (headline.level() === 1 || i === 0) ) Too many cases for now
		// Show kids -- they'll even disappear(!) if at first place...
		headline.change_children_visible(true);

	  view.delete_headline( headline );
	  headline.delete();

	  if (model.length > 0) {
		var ix     = headline.index;
		this.controller._updateOpenCloseAroundChanged(ix ? ix-1 : 0);
	  }

	  if (charEvent) {
		// XXXXX
		// Open editing for next visible Headline??
	  }

	  return true;
	}
  });



  cmdHandler.addACommand({
	name:  "SetMark",
	docum: "Description",

	// Puts mark on whole Headline
	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  console.log("In SetMark");
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "TodoRotate",
	docum: "Rotate the value of the TODO",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  console.log("In TodoRotate");

	  var todoNow  = headline.todo();
	  var model	   = this.controller.model;
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
		newState =	all_todo_done_states[i];

	  console.log("New state " + newState);
	  headline.todo(newState);
	  this.controller.view.render_headline( headline, true, true );
	  

	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "NumberPrefix",				// C-U
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
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

	  var handlerObj =	this;
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
  });
  

  cmdHandler.addACommand({
	name:  "Return",
	docum: "Description",

	text: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
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
	block: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  if (ctrl) {
		console.log("In headline CR, before meta test");
		this.controller.updateEditedHeadline(headline);
		this.controller.view.close_edit_headline( headline );
		return true;
	  }
	  return false				// Ignore
	}
  });


  // ----------------------------------------------------------------------
  // Priority modification commands:

  function _fixPriorities(model, view, headline, priOffset) {
	var choices = model.priorities();
	console.log(choices);
	if (priOffset < 0 || priOffset >= choices.length) {
	  headline.priority('');
	} else {
	  headline.priority( choices[priOffset] );
	}

	view.render_headline(headline, true, true);
  }


  cmdHandler.addACommand({
	name:  "HighPrio",
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  console.log("High priority command");
	  _fixPriorities(this.controller.model, this.controller.view, headline, 0);
	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "MediumPrio",
	docum: "Description",

	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
			 number) {
	  console.log("Medium priority command");
	  _fixPriorities(this.controller.model, this.controller.view, headline, 1);

	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "LowPrio",
	docum: "Description",
	both: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
				   number) {
	  console.log("Medium priority command");
	  _fixPriorities(this.controller.model, this.controller.view, headline, 2);

	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "ClearPrio",
	docum: "Description",
	both:  function(charEvent, event, ctrl, meta, keycode, headline, block_p,
					number) {
	  console.log("Medium priority command");
	  _fixPriorities(this.controller.model, this.controller.view, headline,-1);
	  return true;
	}
  });


  cmdHandler.addACommand({
	name:  "PrioLower",			// (shift-UP, but not in block)
	docum: "Description",
	text:  function(charEvent, event, ctrl, meta, keycode, headline, block_p,
					number) {
	  console.log("Lower priority");
	  headline.togglePriority(true);
	  this.controller.view.render_headline(headline, true, true);
	  return true;
	},
	block: function() {
	  return false;				// Do nothing in block
	}
  });

  cmdHandler.addACommand({
	name: "PrioHigher",			// (shift-down)
	docum: "Description",
	text: function(charEvent, event, ctrl, meta, keycode, headline, block_p,
				   number) {
	  console.log("Increase priority");
	  headline.togglePriority();
	  this.controller.view.render_headline(headline, true, true);

	  return true;
	},
	block: function() {
	  return false;				// Do nothing in block
	}
  });



  // ----------------------------------------------------------------------
  // Go top/bot:

  cmdHandler.addACommand({
	name:  "ScrollTop",
	docum: "Description",

	both:  function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
	  var model = this.controller.model;
	  if (model.length) {
		  this.controller.saveAndGotoIndex(headline, 0, false);
	  }
	  $("html, body").animate({ scrollTop: 0 }, "slow");
	  return true;
	}
  });

  cmdHandler.addACommand({
	name:  "ScrollBot",
	docum: "Description",

	both:  function(charEvent, event, ctrl, meta, keycode, headline, block_p) {
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
  });



  // ----------------------------------------------------------------------
  // Command key sequences:

  // XXXX Move these into a data structure later!  (In the end, it
  // should be user configurable.)

  // XXXX If no control/meta, should 'shift-A' be same as 'A'??

  // cmdHandler.addKeyCode("X-return",	  "X-CR");
  // cmdHandler.addKeyCode("Break",		  "C-G");

  cmdHandler.addKeyCommand("Return",	   "CR,, C-CR,, M-CR");
  // This should open a new Headline after any subs of lower level
  // cmdHandler.addKeyCommand("controlReturn","C-CR");
  cmdHandler.addKeyCommand("Break",		   "C-G");
  cmdHandler.addKeyCommand("OpenClose",	   "TAB,, S-TAB,, M-S-TAB");
  cmdHandler.addKeyCommand("MoveLevelUp",  "C-C C-U");
  cmdHandler.addKeyCommand("MovePrevious", "C-C C-P,, C-P,, up,, C-up");
  cmdHandler.addKeyCommand("MoveNext",	   "C-N,, down,, C-down");

  // Lots of keyboards needs shift to write '<', so... :-(
  cmdHandler.addKeyCommand("ScrollTop",		"M-<,, S-M-<");
  cmdHandler.addKeyCommand("ScrollBot",		"M->,, S-M->");

  // Set Mark, C-X C-X, [copy/paste??]
  cmdHandler.addKeyCommand("SetMark",	   "C-space");

  cmdHandler.addKeyCommand("TodoRotate",   "C-C C-T");


  cmdHandler.addKeyCommand("ShiftLeft",	   "M-left");
  cmdHandler.addKeyCommand("ShiftLeft",	   "M-S-left");
  cmdHandler.addKeyCommand("ShiftRight",   "M-right");
  cmdHandler.addKeyCommand("ShiftRight",   "M-S-right");

  cmdHandler.addKeyCommand("HeadlineUp",   "M-up");
  cmdHandler.addKeyCommand("HeadlineDown", "M-down");
  cmdHandler.addKeyCommand("MoveTreeUp",   "M-S-up");
  cmdHandler.addKeyCommand("MoveTreeDown", "M-S-down");

  // XXXX Support shift-up, shift-down on Headline (not block)
  // too. (S-down goes from highest priority to lower.)
  cmdHandler.addKeyCommand("HighPrio",	   "C-C , A,, C-C , S-A");
  cmdHandler.addKeyCommand("MediumPrio",   "C-C , B,, C-C , S-B");
  cmdHandler.addKeyCommand("LowPrio",	   "C-C , C,, C-C , S-C");
  cmdHandler.addKeyCommand("ClearPrio",	   "C-C , \\ ");
  cmdHandler.addKeyCommand("PrioLower",	   "S-up");
  cmdHandler.addKeyCommand("PrioHigher",   "S-down");

  cmdHandler.addKeyCommand("DelHeadline",  "C-K");


  cmdHandler.addKeyCommand("NumberPrefix", "C-U");
  cmdHandler.addKeyCommand("NumberPrefix", "C-0,, C-1,, C-2,, C-3,, C-4");
  cmdHandler.addKeyCommand("NumberPrefix", "C-5,, C-6,, C-7,, C-8,, C-9");
};
