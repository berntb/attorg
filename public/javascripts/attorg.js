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

// Some M-/C-/etc escapes are supported, but the idea is to support
// most changes from a mouse.

// ----------------------------------------------------------------------



// Polyfill:
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}


// ----------------------------------------------------------------------
// Global variables.

// (These aren't really used. Replace sometime.)

var stored_model     = {};
var org_controllers  = {};


// ----------------------------------------------------------------------

$(function() {
  // - - -
  // This fun should be sent into all created Models, to guarantee
  // that IDs are unique even with multiple views on a page.
  var _internal_ix_counter = 0;   // How to do this better in js??


  function _generate_id_string() {
	// XXXX Should have check for if existing ID!!  This will fail
	// when reloads document.
    return "aoid_" + _internal_ix_counter++; // Attorg ID
  }
  
  // - - -
  var _init = function(document_name, data,
                       document_div_id, divid_headlines) {
    var model  = new OrgModel(document_name, data,
                              undefined, undefined,
							  _generate_id_string);
    stored_model[divid_headlines] = model;

    // XXXX Should honour the config flag on how to open an org file!
    var headline;
    if (model.length && model.headline(0).level() === 1) {
      for (var i = 0; i < model.length; i++) {
        var headline = model.headline(i);
        headline.visible(headline.level() === 1);
      }
    } else {
      // If not starting with a level 1, it might be complex. Have a
      // simple fallback. Replace with something smarter later (maybe).
      for (var i = 0; i < model.length; i++)
        model.headline(i).visible(true);
    }

	var view       = new OrgView(document_div_id, divid_headlines);
	var cmdHandler = new OrgCmdMapper();
    org_controllers[divid_headlines] = new OrgController(
      model,
	  view,
	  cmdHandler,
      document_div_id,
      divid_headlines
    );
    // org_controllers[divid_headlines].init_view(view);
	OrgAddKeyCmds(cmdHandler, org_controllers[divid_headlines]);
  };

  var text, data, model;
  var document_div_id = "org_edit_document_parameters";
  var divid_headlines = "org_edit";
  var fileName = $("#file-to-start").val();

  // Just test code
  // var ajaxtst = $.post("/attorg/translate_row/",
  // 					  {headline: "** Foo",
  // 					   text: " foo bar\n  frotz _gurka_ gazonkan \n\n  "},
  // 					  function(data) {
  // 						alert("Got post:\n" + data);
  // 					  }
  // 					 );

  if (fileName === '') {
    // XXXX Set up empty data representation:
    // Temporary test data
    // text   = $("#data").html();
    text = '[ ' +
      '{ "drawer_names" : [ "CLOCK", "LOGBOOK", "PROPERTIES" ],' +
      '  "priorities"   : [ "A", "B", "C" ],' +
      '  "document"     : 1,' +
      '  "done_states"  : [ "DONE" ],' +
      '  "todo_states"  : [ "TODO" ]'  +
      '},' +
      '{ "level" : 1, "title_text" : "-", "tags" : "" }' +
      ']';
    eval("data = " + text );

    _init('unknown', data, document_div_id, divid_headlines);
  } else {
    // Need to set a "Loading..." text into the org div and make a
    // callback that sets up everything...
    $.getJSON('/attorg/data/' + fileName, function(data) {
      _init(fileName, data, document_div_id, divid_headlines);
    });
  }

});



// ----------------------------------------------------------------------
// Controller:



var OrgController = function(model, view, commandHandler,
							 document_div_id, divid_headlines) {
  var that = this;


  // ------------------------------------------------------------
  this.view  = view;
  this.model = model;
  this.cmdHandler      = commandHandler;
  commandHandler.setController(this);


  this.document_div_id = document_div_id;
  this.divid_headlines = divid_headlines;
  this.divid_search    = divid_headlines + "_search";

  // this.keyMapper       = new OrgKeyFunMapper();

  // ------------------------------------------------------------
  // Set up callbacks for Model:

  // Just forward visible/hidden to View:
  // XXXXX Make this event based instead.
  model.callback_fun_visible = function(headline, visible,
                                        noOpenCloseUpdates) {
    if (visible) {
      that.view.show_headline( headline, noOpenCloseUpdates );
    } else {
      that.view.hide_headline( headline, noOpenCloseUpdates );
    }
  };


  model.callback_fun_update = function(headline, alwaysMakeVisible) {
	// Protect the edit fields:
	that.view.render_headline(headline, alwaysMakeVisible, true);
  };


  // ------------------------------------------------------------
  // Event handling are callbacks from DOM events:


  // Top menu event:

  this.handleTopMenuCommand  = function(event) {
	var attorgCmd = $(event.target).attr("data-command")
	  || $(event.currentTarget).attr("data-command");
	console.log(event);
	console.log("--- MENU COMMAND name:" + attorgCmd);

	// XXXX Should the present C-U number prefixes be done, too??
	// When needed, allow a series of commands too. (Trivial, split on ",").
	that.cmdHandler.callCommand(attorgCmd, {  });
	return true;
  };

  this.clickedEditTags = function(event) {
	event.preventDefault();
	var headline  = that._headlineFromMenuEvent(event, true);
	console.log("Tag edit!");
	console.log(event);
	console.log(that._getHeadlineIxForButtonEvent( event ));
	console.log(that._headlineFromMenuEvent(event, true));
	// EditHlineTags
	return true;
  };


  // - - - - - - - - - - - - - - - - - -
  // Handle clicking internal link to other part of the document
  // (Should probably make an editor command out of this.)

  this.jumpToLink = function(event) {
	event.preventDefault();
	// - - - Get clicked Headline.

	// (If this is in edit mode and the text is clicked, should close
	//  it when goes to target Headline.)
	var headline   = that._headlineFromMenuEvent(event, true);
	var ix         = headline.index;
	console.log("Jump to link from ix: " + ix);

	// - - - Get what to find:
	var result     = /href="#([^"]*)" +class=/.exec(event.target.outerHTML);
	if (result   === null) {
	  alert("Failed to get that link target?!\nInternal error?");
	  return true;
	}
	var toFind     = decodeURIComponent(result[1]);

	// - - - Check for if just looking for headline:
	var onlyHeadline;
	// console.log("Search for:" + toFind);
	var matched = /^\*+ +(.*)/.exec(toFind);
	if (matched !== null) {
	  // If search is for '* str', it must be exact headline
	  onlyHeadline = true;
	  toFind       = matched[1];
	}
	var escapedStr = escapeRegExp(toFind);
	if (onlyHeadline)
	  // '***' etc not stored in Headline 
	  escapedStr   = "^ *" + escapedStr + " *$";

	// N B -- Radio links are not case sensitive, but these are.
	var regexp     = new RegExp(escapedStr);
	// console.log("Matched " + toFind);

	// - - - Find Headline (or its block) with that text:
	var i;
	for(i = 0; i < that.model.length; i++) {
	  if (i === ix)
		continue;

      var hlineLoop = that.model.headline(i);
	  if (hlineLoop.compareTitleRegexp(regexp)
		  || (!onlyHeadline && hlineLoop.compareBlockRegexp(regexp)) ) {
		console.log("Found case:" + i);

		// Emacs doesn't make block visible.
		if (! hlineLoop.visible())
		  that._makeHeadlineAndSuperiorsVisible(hlineLoop);

		that.saveAndGotoIndex(headline, hlineLoop.index);
		return true;
	  }
	}

	alert("Can't find a Headline with text " + toFind
		  + "\n(XXXX <<Ask if it should be added>>");
	return true;
  };



  // - - - - - - - - - - - - - - - - - -
  // Search Headlines from UI
  // (Show part of tree, based on regexp search.)


  // XXXX Let C-S, M-C-S, C-R, M-C-R Go to search field.
  // If two C-S etc (i.e. C-S in search field), searches to next hit,
  // from last used Headline index??

  this.searchEventClear = function() {
	var hadHilight = that.view.getHighlightRegex() !== undefined;
	// Should cache previous open/closed states and reset them??
	// If so, should probably _not_ reset those which had open/closed
	// changed after last search.
	// (Won't put this on the todo for now.)

	// Reset search field:
	$('#' + that.divid_search + '_text').val('');

	that.searchEvent(undefined);

	// Cache present place this were at before search, then go back
	// there when Clears search. But, well, the application don't have
	// a concept of present place?!
  };

  this.searchEvent = function(event) {
    var div        = $('#' + that.divid_search + '_text');
	var escapedStr = escapeRegExp(div.val());
    var regexp     = new RegExp( escapedStr );
	var openCloseds= [];		// Quick 2nd loop

	var i, headline;

	var hadHilight = that.view.getHighlightRegex() !== undefined;

	// Are we just clearing out the Search?
	if (/^\s*$/.test(escapedStr)) {
	  regexp       = undefined;
	  that.view.setHighlightRegex( undefined );
	} else
	  that.view.setHighlightRegex( new RegExp(escapedStr, "g") );

    for(i = 0; i < that.model.length; i++) {
      headline     = that.model.headline(i);
      if (headline.level() === 1) {
		headline.visible(true);
		if (i > 0)
		  openCloseds.push(i);
		// Renders so any hits get hilighted
		that.view.render_headline(headline, true, true);
		continue;
	  }
	  
      if (regexp !== undefined &&
		  (headline.compareTitleRegexp(regexp)
           || headline.compareBlockRegexp(regexp)
		   || headline.compareTagsRegexp(regexp)) ) {
		// console.log(headline.level() + ": " + i + ":  " + headline.title());

		// (Reimplements _makeHeadlineAndSuperiorsVisible here. This
		// is so the same hierarchy won't get open/closed recalculated
		// for every hit.)
        headline.visible(true);
		that.view.render_headline(headline, true, true);

		// Make all superior visible, too:
		while(headline.level() > 1) {
		  headline = that.model.headline(headline.findDirectOwner());
		  headline.visible(true);
		}
      } else {
        headline.visible(false);

		// Must rerender all headlines, since they might have old highlights
		// Store if there is a hit as flags, so no need to check that again!
		// This will stop lazy generation in View, redo.
		if (hadHilight)
		  that.view.render_headline( headline, true, true );
	  }
    }

	// (If 1st isnt level 1. But if first is level 3, then there are
	// lvl 2 before first level 1? Fix for next Version.)
	that._updateOpenCloseAroundChanged(0);
	for(i = 1; i < openCloseds.length; i++) {
	  that._updateOpenCloseAroundChanged(openCloseds[i]);
	}

	if (event !== undefined)
      event.preventDefault();
    return false;
  }


  // - - - - - - - - - - - - - - - - - -
  // Keyboard events:

  this.handleWindowKeyEvent = function(event) {
    var keyCode     = event.which || event.keyCode;
	var control     = event.ctrlKey;
	// var charCode    = that.cmdHandler.getCharFromEvent(event);

	// Control-Space without focus on an text field goes to the next
	// opened edit Headline:
	if (keyCode !== 32 || !control)
	  return true;

	that.cmdHandler.callCommand('_JumpBetweenEditedHeadlines', {} );
	return false;
  };


  this.handleTitleKeyEvent = function(event) {
	// console.log(event);
	that._handleKeyEvent(event, false);
  };
  
  this.handleBlockKeyEvent = function(event) {
    // XXXX Need dynamically increasing no of rows in textarea.
	that._handleKeyEvent(event, true);
  };


  this._handleKeyEvent = function(event, isBlock) {
	// console.log("CHAR EVENT:");
	// console.log(event);
	// (.which is recommended for jQuery. Test Safari/Chrome/Opera too.)
    var keyCode  = event.which || event.keyCode;
    if (keyCode == 20 || keyCode == 16 || keyCode == 18 || keyCode == 91) {
	  // This is only for keydown, trying to use keypress instead
      // Ignore shift/control/meta/alt (this event triggers for them.)
      return;
    }

	// Use ECMAScript fun for unpacking array/struct?
	var charResult = that.cmdHandler.handleChar(event, isBlock)
	var resultFlag = charResult[0];

	// XXXX Test, remove:
	if (resultFlag !== OrgCmdMapper.CMD_ATE_CHAR
		&& resultFlag !== OrgCmdMapper.CMD_IGNORED_CHAR)
	  console.log("CHAR HANDLER RETURNED, type " + resultFlag);

	if (resultFlag === OrgCmdMapper.CMD_ATE_CHAR) {
	  event.preventDefault();	// Char is _part_ of a cmd
	  return;
	}
	// Just let the char be handled:
	if (resultFlag === OrgCmdMapper.CMD_IGNORED_CHAR)
	  return;

	var value = charResult[1];

	if (resultFlag === OrgCmdMapper.CMD_INFO)  {
	  console.log("LOG INFO: " + value);
	} else if (resultFlag === OrgCmdMapper.CMD_ERROR)  {
	  console.log("ERROR: " + value);
	}

	if (resultFlag !== OrgCmdMapper.CMD_DISPATCH_FUNCTION)
	  return;

	// - - - Dispatch a named editor command:
	console.log("EXECUTE CMD: " + value);

	var numericalPrefix = charResult[2];
	if (numericalPrefix !== undefined)
	  console.log("Numerical prefix " + numericalPrefix);

    var modelStrID = event.target.id.slice(2);
    var ix         = that.model.get_ix_from_id_string( modelStrID );
    var headline   = that.model.headline(ix);

	// 'value' here is command name.
	if (that.cmdHandler.callCommand(value,
									{ keyboard_p: true,
									  event:      event,
									  headline:   headline,
									  isBlock:    isBlock,
									  numericalPrefix: numericalPrefix
									}
								   )
	   )
	  event.preventDefault();
  };

  
  // - - - - - - - - - - - - - - - - - -
  // Button Edit events:
  this.saveCommandEvent = function(event) {
    // XXXX Clean up this getting ID:
    var edit_div = event.target.parentNode.parentNode.parentNode.parentNode;
    var model_id = that.view.make_model_id_from_hldiv(edit_div.id);
    var headline = that.saveHeadlineFromModelID( model_id );

    that.view.close_edit_headline( headline );
  };

  this.updateCommandEvent = function(event) {
    var edit_div = event.target.parentNode.parentNode.parentNode.parentNode;
    var model_str_id = that.view.make_model_id_from_hldiv(edit_div.id);
    that.saveHeadlineFromModelID( model_str_id );
  };

  this.cancelCommandEvent = function(event) {
    var edit_div = event.target.parentNode.parentNode.parentNode.parentNode;
    var model_str_id = that.view.make_model_id_from_hldiv(edit_div.id);
    var i = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(i);

    // XXXXX If a Headline` is empty and Canceled -- just remove it?
    // Add a flag for M-Return (et al) for totally new Headlines and
    // only remove them if that is set??

    that.view.close_edit_headline( headline );
  };

  this.levelChangeEvent = function(event) {
    var model_str_id = this.id.slice(2);
    var i = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(i);

	if (headline.is_config())
	  return;					// (Shouldn't get here really)

    var val = parseInt( this.value );
    var now = parseInt( headline.level() );

    if ( val !== now && val != 0 )
      that.levelChange(headline, val);
  };


  // ------------------------------------------------------------
  // non-Edit button events:

  this.handleUICommand  = function(event) {
	// Don't automatically save Headline at every editor command(?)
    var headline  = that._headlineFromMenuEvent(event, true);
	var attorgCmd = $(event.target).attr("data-command")
	  || $(event.currentTarget).attr("data-command");
	console.log(event);
	console.log("--- CMD name:" + attorgCmd);

	// XXXX Should the present C-U number prefixes be done, too??
	// When needed, allow a series of commands too. (Trivial, split on ",").
	that.cmdHandler.callCommand(attorgCmd,
								{ headline: headline });
	return true;
  };



  this.editHeadingEvent = function(event) {
    var i = that._getHeadlineIxForButtonEvent( event );
    var headline = that.model.headline(i);

    if (that.view.has_headline_edit_on(headline))
      return;
    that.view.render_edit_headline(i, headline);

    that.view.setFocusTitle( headline );
  };


  this.addHeadingEvent = function(event) {
    event.stopPropagation();  // Gets two adds, otherwise
    var i = that._getHeadlineIxForButtonEvent( event );

    var headline_before = that.model.headline(i);
    level = headline_before.level(); // Set at same level as previous

    that._insertAndRenderHeading(i+1, level);
  };


  this.dblClickHeadingEvent = function(event) {
    var i = that._getHeadlineIxForButtonEvent( event );
    var headline = that.model.headline(i);

    if (! that.view.has_headline_edit_on(headline)) {
      that.view.render_edit_headline(i, headline);
	  if (headline.is_config())
		that.view.setFocusBlock( headline );
	  else
		that.view.setSelectTitle( headline );
    }
  };

  // XXXX Can't work like this on iPad et al, since the double click
  // should start editing? Do special handling there??
  this.clickBlockEvent = function(event) {
	event.stopPropagation()
    var i = that._getHeadlineIxForButtonEvent( event );
	if (i === undefined)
	  return true;
    var headline = that.model.headline(i);

	console.log(headline);

	that.view.toggleLargeBlock( headline ); // Hides/shows block
	return true;
  }

  // ----------------------------------------------------------------------
  // Events about Tags:

  this.saveHeadlineTags = function(event) {
	that.cmdHandler.callCommand("_saveModalDialog", { });
	return true;
  }

  this.cancelHeadlineTagsChange = function(event) {
	that.view.closeHeadlineTagsEditing();
	return true;
  }


  // ----------------------------------------------------------------------
  // Help routines

  // - - - - - - - - - - - - - - - - - -
  // Utility for Search events, et al:
  function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }



  // - - - - - - - - - - - - - - - - - -
  // Help routines for the button command events:

  this._getHeadlineIxForButtonEvent = function(event) {
    // (A Font Awesome or Botstrap 2 strangeness?  New buttons
    //  sometimes use the <a> in buttons as target and sometimes the
    //  <i> thingie??
    //  So I reuse this to get the ID also from Headline text.)
    var gparent     = event.target.parentNode;
    var model_str_id= gparent.id;
    if (! model_str_id)
      model_str_id  = gparent.parentNode.id;
    if (! model_str_id)
      model_str_id  = gparent.parentNode.parentNode.id;
    if (! model_str_id)
      model_str_id  = gparent.parentNode.parentNode.parentNode.id;
    var model_id    = this.view.make_model_id_from_hldiv(model_str_id);
    return this.model.get_ix_from_id_string( model_id );
  };


  this._headlineFromMenuEvent = function(event, notSave) {
    // Get the Headline from Edit mode, when a dropdown menu
    // selection is done.
    // (Sigh, put ID:s in a few more Elements??)
    var edit_div = event.target.parentNode;

	if (! edit_div.id)
	  edit_div   = edit_div.parentNode;
	if (! edit_div.id)
	  edit_div   = edit_div.parentNode;
	if (! edit_div.id)
	  edit_div   = edit_div.parentNode;
    // (Random if event is from <a> or from what it contains??)
    if (! edit_div.id)
      edit_div   = edit_div.parentNode;
    if (! edit_div.id)
      edit_div   = edit_div.parentNode;
    var model_id = that.view.make_model_id_from_hldiv(edit_div.id);
	// XXXX SHOULD this save the Headline???
	var headline;
	if (notSave) {
	  var i      = that.model.get_ix_from_id_string( model_id );
      headline   = that.model.headline(i);
	} else
      headline = that.saveHeadlineFromModelID( model_id );

    return headline;
  };


  this._insertAndRenderHeading = function(ix, level) {
    var headline = this.model.new_headline(ix, { level: level } );
    this.view.render_new_headline(ix, headline );
    this.view.render_edit_headline(ix, headline);

    this.view.setSelectTitle( headline );
	this.model.dirty(-1, undefined);
  }


  // Help method which updates a Headline from Edit fields:
  this.saveHeadlineFromModelID = function(model_str_id) {
    var i = this.model.get_ix_from_id_string( model_str_id );
    var headline = this.model.headline(i);

    return this.updateEditedHeadline(headline);
  };


  this.updateEditedHeadline = function(headline) {
	var values = this.view.get_values(headline);
    this.updateHeadlineTitleBlock(headline, values.title, values.block);
    return headline;
  };



  // ------------------------------------------------------------
  // Initialize everything:
  this._init_view();


  // ----------------------------------------------------------------------

  // End of Controller Object spec:
  return this;
};



// ------------------------------------------------------------
// Initialization:
// Called at end of initiation, to set up View:

// XXXX Should handle a set of Views, to split field??
OrgController.prototype._init_view = function() {
  var docName  = this.model.documentName();
  if (docName)
    this.view.documentName(docName);

  this.view.render_all(this.model);
  this.view.init_document_parameters(this.model);

  this.bind_events();
};


// ------------------------------------------------------------
// Events:


OrgController.prototype.bind_events = function() {
  // - - - - - Menu commands:
  var topDiv= $("#topmenu-commands");
  topDiv.on('click',   '.attorg-command',  this.handleTopMenuCommand);

  // - - - - - Modal commands:
  $("#hline-tags-saved").click(this.saveHeadlineTags);
  $("#hline-tags-cancel-save").click(this.cancelHeadlineTagsChange);


  // - - - - - Search event:
  $("#" + this.divid_search).submit( this.searchEvent );
  $('.clear-search').click( this.searchEventClear );

  // - - - - - Headline events:
  var div   = $("#" + this.divid_headlines);

  // $('.title_input').change( // (Fails if multiple org modes in window!!)
  // div.find('.title_input').change(  // Less bad
  // div.on('change', 'input:text',    this.title_text_change_event);

  div.on('dblclick','.title-text',      this.dblClickHeadingEvent);
  div.on('click',   '.block-text',      this.clickBlockEvent);

  // - - - - - Edit tag by clicking existing tags:
  div.on('click',   '.org-tags',        this.clickedEditTags);
  div.on('dblclick','.org-tags',        this.clickedEditTags);

  // - - - - - Most commands send this event:
  div.on('click',   '.attorg-command',  this.handleUICommand);

  // - - - - - Buttons in non-Edit mode:
  div.on('click',   '.edit-header',     this.editHeadingEvent);
  div.on('click',   '.add-header',      this.addHeadingEvent);

  // - - - - - Buttons etc in Edit mode:
  div.on('click',   '.save-cmd',        this.saveCommandEvent);
  div.on('click',   '.update-cmd',      this.updateCommandEvent);
  div.on('click',   '.cancel-cmd',      this.cancelCommandEvent);
  div.on('change',  '.lvl_select',      this.levelChangeEvent);

  // - - - - - Keyboard events:
  // (Keydown seems more reactive. 'keypress' is better but Chrome
  //  (and IE?) can't catch arrow keys, C-N, etc. :-( Sigh... not with
  //  keydown there either, :-( )


  $(window).keydown(this.handleWindowKeyEvent);
  div.on('keydown', '.title_edit',      this.handleTitleKeyEvent);
  div.on('keydown', '.block_edit',      this.handleBlockKeyEvent);

  // - - - - - Document links to other Headlines:
  div.on('click',   '.internal_link',   this.jumpToLink);
};


// ------------------------------------------------------------
// Utilities:

// - - - - - - - - - - - - - - - - - -
OrgController.prototype._makeHeadlineAndSuperiorsVisible = function(headline) {
  headline.visible(true);

  // Make all superior visible, too:
  var iterHeadline = headline;
  while(iterHeadline.level() > 1) {
	iterHeadline = that.model.headline(iterHeadline.findDirectOwner());
	if (! iterHeadline.visible() )
	  iterHeadline.visible(true);
  }

  this._updateOpenCloseAroundChanged(iterHeadline.index);
};


// - - - - - - - - - - - - - - - - - -
// Make a Headline visible in a nice Emacsy way.
OrgController.prototype.updateTreeVisibility = function(headline, toShow) {
  // If toShow is set (one of 'kids', 'all' or 'hide'), it is
  // used. Otherwise, visibility of the subtree beneath the
  // headline is cycled.

  var vis_children = headline.visible_children();
  if (vis_children === 'no_kids')
    return '';              // (show/hide block like real Emacs??)
  if (toShow === undefined)
    toShow = '';
  else
    vis_children = 'X';     // Won't influence

  var to_update;

  if (toShow === 'kids' || vis_children === 'no_visible') {
    to_update = headline.change_children_visible(1);     // Show 1st level
    this.view.fixOpenCloseFromTo(to_update[0], to_update[1], this.model);
    return 'kids';
  }
  if (toShow === 'all' || vis_children === 'direct_kids') {
    to_update = headline.change_children_visible(true);  // Show all
    this.view.fixOpenCloseFromTo(to_update[0], to_update[1], this.model);
    return 'all';
  }
  if (toShow === 'hide' || vis_children === 'all_visible') {
    to_update = headline.change_children_visible(false); // Hide all
    this.view.fixOpenCloseFromTo(to_update[0], to_update[1], this.model);
    return 'hide';
  }
  to_update = headline.change_children_visible(true);    // Show all
  this.view.fixOpenCloseFromTo(to_update[0], to_update[1], this.model);
  return 'all';
};



// - - - - - - - - - - - - - - - - - -
// updates opened/closed icons after a Headline change
OrgController.prototype.levelChange = function(headline, new_level) {
  // if (headline.level() === 1)
  // Show 1st level children, so they don't disappear. (Always??)
  var ix = headline.index;
  headline.change_children_visible(1);
  if (new_level < 1)  new_level = 1;
  if (new_level > 10) new_level = 10;
  headline.level(new_level);
  if (new_level === 1)
    headline.visible(true);
  // this.model.dirty(ix, 'level');
  // (This kludge doesn't rerender any open edit fields.)
  this.view.render_headline( headline, true, true );
  this._updateOpenCloseAroundChanged(ix);

};

// - - - - - - - - - - - - - - - - - -
// updates opened/closed icons after a Headline change
OrgController.prototype.levelChangeSubtree = function(first, last, diff) {
  // this.view._TEMP_TEST = 1;
  for(var i = first; i < last; i++) {
    var headline = this.model.headline(i);
    // headline.change_children_visible(1);
    var new_level = headline.level() + diff;
    if (new_level < 1)  new_level = 1;
    if (new_level > 10) new_level = 10;
    headline.level(new_level);
    if (new_level === 1)
      headline.visible(true);
    this.model.dirty(i, 'level');
    this.view.render_headline( headline, false, true );
  }
  // This should only be called for a subtree, but do double
  // updates just to be sure...
  this._updateOpenCloseAroundChanged(first);
  if (last-1 !== first)
    this._updateOpenCloseAroundChanged(last-1);
};


// - - - - - - - - - - - - - - - - - -
// XXXXX Too complex, this must be neater and more automatic. :-(
// And, if anything, moved to model. Or anyplace else.
OrgController.prototype._updateOpenCloseAroundChanged = function(ix) {
  if (ix < 0) ix  = 0;
  if (ix >= this.model.length)
    ix            = this.model.length-1;
  if (this.model.length === 0) return;

  var headline    = this.model.headline(ix);
  var startStop;
  if (ix > 0) {
	// (ix > 0 ==> Except for first index.)
    startStop     = this.model.headline(ix-1).updateVisibleInHierarchy();
	//console.log("from-to: " + startStop);
	//console.log(startStop[0]+" "+this.model.headline(startStop[0]).title());
	//console.log(startStop[1]+" "+this.model.headline(startStop[1]).title());
    if (startStop[1] < ix) {
      var sStop2  = headline.updateVisibleInHierarchy();
	  // console.log("AND from-to: " + sStop2);
	  // console.log(sStop2[0] +" "+ this.model.headline(sStop2[0]).title());
	  // console.log(sStop2[1] +" "+ this.model.headline(sStop2[1]).title());
      startStop[1]= sStop2[1];
    }
  } else {
    startStop     = headline.updateVisibleInHierarchy();
    if (startStop[1] === ix && this.model.length > 1) {
      // Modified 1st Headline to > than 2nd. Update the rest of
      // the old hierarchy that used to be beneath the 1st.
      startStop   = this.model.headline(1).updateVisibleInHierarchy();
      startStop[0]= 0;
    }
  }

  this.view.fixOpenCloseFromTo(startStop[0], startStop[1], this.model);
  return startStop;         // The subtree
};


// - - - - - - - - - - - - - - - - - -
OrgController.prototype.moveHeadlineUp = function(headline) {
  var index  = headline.index;
  if (index === 0) return;  // Nothing to see here...
  console.log(index + " setup, len " + this.model.length);
  var nextH  = this.model.headline(index-1);

  // Make certain both are visible:
  headline.visible(true);
  nextH.visible(true);
  // Move them around in View and Model:
  this.view.move_headline(nextH, index+1); // (Don't move the one we edit)
  headline.move(index-1);
  // Make certain the open/close arrows are correct:
  headline.index--;
  this._updateOpenCloseAroundChanged(index);
  this._updateOpenCloseAroundChanged(index-1);
};



// - - - - - - - - - - - - - - - - - -
OrgController.prototype.moveHeadlineDown = function(headline) {
  var index  = headline.index;
  if (index+1 >= this.model.length) return; // Nothing to see here...
  console.log(index + " setup, len " + this.model.length);
  var nextH  = this.model.headline(index+1);

  // Make both visible:
  headline.visible(true);
  nextH.visible(true);
  // Move them around in View and Model:
  this.view.move_headline(nextH, index);
  headline.move(index+1);
  headline.index++;
  // Make certain the opened/closed arrows are correct:
  this._updateOpenCloseAroundChanged(index);
  this._updateOpenCloseAroundChanged(index+1);
};



// - - - - - - - - - - - - - - - - - -
OrgController.prototype.moveHeadlineTree = function(fromStart, fromEnd,
													toAfterThis) {
  // Move a range of Headlines to another place.
  var i, no, headline;
  console.log("From " + fromStart + " to " + fromEnd + " -> after " +
              toAfterThis);

  if (toAfterThis < fromStart) {
    // No problem with indexes:
    no         = 0;
    for(i = fromStart; i < fromEnd; i++) {
      headline = this.model.headline(i);
      // headline.visible(true);
      console.log("Moving ''" + headline.title() + "''.  " +
                  "From " + i + " to " + (toAfterThis+no-1));
      this.view.move_headline(headline, toAfterThis+no+1);
      headline.move(toAfterThis+no+1);
      no++;
    }

    this._updateOpenCloseAroundChanged(toAfterThis);
    this._updateOpenCloseAroundChanged(toAfterThis+no);
    var tree   = this._updateOpenCloseAroundChanged(fromStart+no-1);
    if (tree[1] <= fromStart+no-1)
      this._updateOpenCloseAroundChanged(fromStart+no);
  } else {
    // No problem with indexes...
    for(i = fromStart; i < fromEnd; i++) {
      headline = this.model.headline(fromStart);
      this.view.move_headline(headline, toAfterThis);
      headline.move(toAfterThis-1);
    }
    var tree   = this._updateOpenCloseAroundChanged(fromStart);
    if (tree[0] >= fromStart)
      this._updateOpenCloseAroundChanged(fromStart-1);
    if (tree[0] >= fromStart)
      this._updateOpenCloseAroundChanged(fromStart-1);
    this._updateOpenCloseAroundChanged(toAfterThis);
    tree       = this._updateOpenCloseAroundChanged(toAfterThis);
    if (tree[0] >= fromStart)
      this._updateOpenCloseAroundChanged(fromStart-1);
    this._updateOpenCloseAroundChanged(fromStart+ (fromEnd-fromStart));
  }
};


// - - - - - - - - - - - - - - - - - -
OrgController.prototype.saveAndGotoIndex = function(headline, goIx,
													focusOnBlock) {
  // Saves any opened edit headline and opens another in Edit:
  if (headline !== undefined && this.view.has_headline_edit_on(headline)) {
    this.updateEditedHeadline(headline);
    this.view.close_edit_headline( headline );
  }

  var nextHeadline   = this.model.headline(goIx);

  if (! this.view.has_headline_edit_on(nextHeadline))
    this.view.render_edit_headline(goIx, nextHeadline);

  if (focusOnBlock || nextHeadline.is_config() )
    this.view.setFocusBlock( nextHeadline );
  else
    this.view.setFocusTitle( nextHeadline );
};


// Help method which updates a Headline with title/block values:
OrgController.prototype.updateHeadlineTitleBlock = function(headline,
															title, block) {
  var modified = false;
  if (title !== undefined && title !== headline.title()) {
	// console.log("UPDATE headline:");
	// console.log( headline );
    headline.title( title );
	// alert("HEADLINE UPDATE " + JSON.stringify(headline.headline));
    this.model.dirty(headline.index, 'title');
	headline.headline.title_subs = undefined;
	// This is if multiple quick updates and 
	if (headline.headline.title_update_ix) {
	  headline.headline.title_update_ix++;
	} else {
	  headline.headline.title_update_ix = 1;
	}
    modified = true;
  }
  if (block !== undefined && block !== headline.block() ) {
    headline.block( block );
	// alert("BLOCK UPDATE " + JSON.stringify(headline.headline));
    this.model.dirty(headline.index, 'block');
	headline.headline.block_parts = undefined;
    modified = true;
  }

  if (modified) {
	// Will be replaced
    this.view.render_headline( headline );
	if (! headline.is_config())
	  this.model.updateHeadlineDelayed( headline );
  }
};

