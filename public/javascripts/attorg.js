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


// Global variable for model data, replace with some VMC-variant.
var stored_model     = {};
var org_controllers  = {};

// Old jQuery style for: $(document).ready(function() { ... } );
$(function() {
  // - - -
  // This fun should be sent into all created Models, to guarantee
  // that IDs are unique even with multiple views on a page.
  var _internal_ix_counter = 0;   // How to do this better in js??


  function _generate_id_string() {
    return "aoid_" + _internal_ix_counter++; // Attorg ID
  }
  
  // - - -
  var _init = function(document_name, data,
                       document_div_id, divid_headlines) {
    var model  = new OrgModel(document_name, data,
                              undefined, _generate_id_string);
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
	OrgAddKeyCmds(cmdHandler, org_controllers[divid_headlines], model, view);
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
  // Initialization:
  // Called at end, to set up View:
  this._init_view = function() {
    var docName  = this.model.documentName();
    if (docName)
      this.view.documentName(docName);

    this.view.render_all(this.model);
    this.view.init_document_parameters(this.model);

    this.bind_events();
  };

  // XXXX Should handle a set of Views, to split field??


  // ------------------------------------------------------------
  this.view  = view;
  this.model = model;
  // XXXX Should replace the command handler later:
  this.cmdHandler      = commandHandler;

  this.document_div_id = document_div_id;
  this.divid_headlines = divid_headlines;
  this.divid_search    = divid_headlines + "_search";

  // this.keyMapper       = new OrgKeyFunMapper();

  // ------------------------------------------------------------
  // Set up callbacks for Model:

  // Just forward visible/hidden to View:
  // XXXXX Make so it is event based.
  model.callback_fun_visible = function(headline, visible,
                                        noOpenCloseUpdate) {
    if (visible) {
      that.view.show_headline( headline, noOpenCloseUpdate );
    } else {
      that.view.hide_headline( headline, noOpenCloseUpdate );
    }
  };

  // ------------------------------------------------------------
  // Key Code Bindings:


  // function tmp(ctrl,meta,keycode,headline,block_p) {
  //   // Temporary dump help routine:
  //   var m = meta ? 'M-' : '';
  //   var c = ctrl ? 'C-' : '';
  //   var b = block_p ? ' (in Block)' : '';
  //   console.log("Char " + m + c + keycode + ", " + headline.title() + b);
  // }

  // ------------------------------------------------------------
  // Event handlers:

  this.bind_events = function() {
    var div  = $("#" + this.divid_headlines);
    // $('.title_input').change( // (Fails if multiple org modes in window!!)
    // div.find('.title_input').change(  // Less bad
    // div.on('change', 'input:text',    this.title_text_change_event);

    // XXXXX Move implementation to Cmd implementation.

    div.on('change',  '.lvl_select',      this.levelChangeEvent);
    div.on('change',  '.todo_select',     this.todoChangeEvent);
    div.on('click',   '.open-subtree',    this.openCloseHeadlineEvent);

    div.on('dblclick','.title-text',      this.dblClickHeadingEvent);

    // - - - - - Menu in Edit Mode:
    div.on('click',   '.move-header-up',  this.move_up_event);
    div.on('click',   '.move-header-down',this.move_down_event);
    div.on('click',   '.edit-header',     this.editHeadingEvent);
    div.on('click',   '.add-header',      this.addHeadingEvent);
    div.on('click',   '.move-tree-up',    this.move_tree_up_event);
    div.on('click',   '.move-tree-down',  this.move_tree_down_event);

    // - - - - - Edit Mode the rest:
    div.on('keydown', '.title_edit',      this.handleTitleKeyEvent);
    div.on('keydown', '.block_edit',      this.handleBlockKeyEvent);
    div.on('click',   '.save-cmd',        this.saveCommandEvent);
    div.on('click',   '.update-cmd',      this.updateCommandEvent);
    div.on('click',   '.cancel-cmd',      this.cancelCommandEvent);

    div.on('click',   '.delete-header',   this.deleteHeadingEvent);

    // Bind search event:
    $("#" + this.divid_search).submit( this.searchEvent );
  };


  // - - - - - - - - - - - - - - - - - -
  // Events from Edit mode:


  this.handleTitleKeyEvent = function(event) {
    var keyCode  = event.which; // (Recommended for jQuery)
    if (keyCode == 20 || keyCode == 16 || keyCode == 18 || keyCode == 91) {
      // Ignore shift/control/meta/alt (this event triggers for them.)
      return;
    }
    var model_str_id = event.target.id.slice(2);
    var ix       = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(ix);

    var metaKey  = (event.altKey || event.metaKey);
    var ctrlKey  = event.ctrlKey;

	if (that.cmdHandler.handlePrefix(event, metaKey, ctrlKey, keyCode)) {
      // Like ESC as prefix for 'M-'
      event.preventDefault();
      return;
    }

    var handler  = that.cmdHandler.findKeyCodeFun(event);
    if (handler &&
        handler(true, event, ctrlKey, metaKey, keyCode, headline, false))
      event.preventDefault();
  };


  this.handleBlockKeyEvent = function(event) {
    // XXXX Need dynamically increasing no of rows in textarea.

    var keyCode  = event.which; // (Recommended for jQuery)
    if (keyCode == 20 || keyCode == 16 || keyCode == 18 || keyCode == 91) {
      // Ignore shift/control/meta/alt (this event triggers for them.)
      return;
    }

    var model_str_id = event.target.id.slice(2);
    var ix       = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(ix);

    var metaKey  = (event.altKey || event.metaKey);
    var ctrlKey  = event.ctrlKey;

    // Is this key eaten as a command prefix? (C-C, M-, etc)
    if (that.cmdHandler.handlePrefix(event, metaKey, ctrlKey, keyCode)) {
      event.preventDefault();
      return;
    }

    var handler  = that.cmdHandler.findKeyCodeFun(event, 'block');
    if (handler &&
        handler(true, event, ctrlKey, metaKey, keyCode, headline, true)) {
        // handler(event, ctrlKey, metaKey, keyCode, headline, true)) {
      event.preventDefault();
	}

	// XXXX Push to View!
    // Temporary fix for height of textarea. Add a delayed event
    // which updates height after a short time??
    event.target.style.height = "";
    event.target.style.height = Math.min(event.target.scrollHeight,
                                         300) + "px";

  };


  this.saveCommandEvent = function(event) {
    // (Sigh, put ID:s in a few more Elements??)
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

    var val = parseInt( this.value );
    var now = parseInt( headline.level() );

    if ( val !== now && val != 0 )
      that.levelChange(headline, val);
  };


  this.todoChangeEvent = function(event) {
    var model_str_id = this.id.slice(3);
    var i = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(i);
    // alert( model_str_id + ", " + headline.todo() + " --> " +
    //        this.value);

    if ( this.value !== headline.todo() ) {
      headline.todo( this.value );
      // that.model.dirty(i, 'todo');
      that.view.render_headline( headline );

	  // XXXX Re-parse the headline, by way of the server.
    }
  };


  // ------------------------------------------------------------
  // non-Edit button events:

  this.openCloseHeadlineEvent = function(event) {
    var i = that._getHeadlineIxForButtonEvent( event );
    var headline = that.model.headline(i);

    that.updateTreeVisibility( headline );
  };


  this.move_up_event = function(event) {
    // Needs to set visibile for those it moves around, if e.g. a
    // 2nd level is moved up above a 3rd level which isn't visible.
    var headline = that._headlineFromMenuEvent(event);
    that.moveHeadlineUp( headline );
  };
  this.move_down_event = function(event) {
    var headline = that._headlineFromMenuEvent(event);
    that.moveHeadlineDown( headline );
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

  this.move_tree_up_event = function(event) {
    var headline = that._headlineFromMenuEvent(event);
    var thisTree  = headline.findSubTree();
    var prevTree  = headline.findPrevSubTree();
    console.log(headline.index + ", tree:" + thisTree );
    console.log("      PREV:" + prevTree );
    console.log("      NEXT:" + headline.findNextSubTree());
    if (prevTree !== undefined && thisTree !== undefined)
      that.moveHeadlineTree( prevTree[0], prevTree[1], // From
                             thisTree[1]               // After this
                           );
  };
  this.move_tree_down_event = function(event) {
    var headline = that._headlineFromMenuEvent(event);
    var thisTree  = headline.findSubTree();
    var nextTree  = headline.findNextSubTree();
    console.log(headline.index + ", tree:" + thisTree);
    console.log("      PREV:" + headline.findPrevSubTree());
    console.log("      NEXT:" + nextTree);
    if (nextTree !== undefined && thisTree !== undefined)
      that.moveHeadlineTree( nextTree[0], nextTree[1], // From
                             thisTree[0]-1             // After this
                           );
  };

  this.deleteHeadingEvent = function(event) {
    // (Sigh, put ID:s in a few more Elements??)
    var headline = that._headlineFromMenuEvent(event);
    var i        = headline.index;

    // XXXX Modal query if really want to delete?
    // (Better -- add 'undo' in the next version.)

    if (headline.visible_children() !== 'all_visible')
      // && (headline.level() === 1 || i === 0) ) Too many cases for now
      // Show kids -- they'll even disappear(!) if at first place...
      headline.change_children_visible(true);

    that.view.delete_headline( headline );
    headline.delete();

    if (that.model.length > 0)
      that._updateOpenCloseAroundChanged(i ? i-1 : 0);
  };

  this.dblClickHeadingEvent = function(event) {
    var i = that._getHeadlineIxForButtonEvent( event );
    var headline = that.model.headline(i);

    if (! that.view.has_headline_edit_on(headline)) {
      that.view.render_edit_headline(i, headline);
      that.view.setSelectTitle( headline );
    }
  };

  // - - - - - - - - - - - - - - - - - -
  // Help routines

  // Help routine, makes a Headline visible in a nice Emacsy way.
  // (That means showing all children for superior Headline.)

  this.updateTreeVisibility = function(headline, toShow) {
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
      that.view.fixOpenCloseFromTo(to_update[0], to_update[1], that.model);
      return 'kids';
    }
    if (toShow === 'all' || vis_children === 'direct_kids') {
      to_update = headline.change_children_visible(true);  // Show all
      that.view.fixOpenCloseFromTo(to_update[0], to_update[1], that.model);
      return 'all';
    }
    if (toShow === 'hide' || vis_children === 'all_visible') {
      to_update = headline.change_children_visible(false); // Hide all
      that.view.fixOpenCloseFromTo(to_update[0], to_update[1], that.model);
      return 'hide';
    }
    to_update = headline.change_children_visible(true);    // Show all
    that.view.fixOpenCloseFromTo(to_update[0], to_update[1], that.model);
    return 'all';
  };

  // updates opened/closed icons after a Headline change
  this.levelChange = function(headline, new_level) {
    // if (headline.level() === 1)
    // Show 1st level children, so they don't disappear. (Always??)
    var ix = headline.index;
    headline.change_children_visible(1);
    if (new_level < 1)  new_level = 1;
    if (new_level > 10) new_level = 10;
    headline.level(new_level);
    if (new_level === 1)
      headline.visible(true);
    // that.model.dirty(ix, 'level');
    this.view.render_headline( headline );
    that._updateOpenCloseAroundChanged(ix);

  };

  // updates opened/closed icons after a Headline change
  this.levelChangeSubtree = function(first, last, diff) {
    for(var i = first; i < last; i++) {
      var headline = this.model.headline(i);
      // headline.change_children_visible(1);
      var new_level = headline.level() + diff;
      if (new_level < 1)  new_level = 1;
      if (new_level > 10) new_level = 10;
      headline.level(new_level);
      if (new_level === 1)
        headline.visible(true);
      that.model.dirty(i, 'level');
      this.view.render_headline( headline );
    }
    // This should only be called for a subtree, but do double
    // updates just to be sure...
    that._updateOpenCloseAroundChanged(first);
    if (last-1 !== first)
      that._updateOpenCloseAroundChanged(last-1);
  };


  // XXXXX Too complex, this must be neater and more automatic. :-(
  this._updateOpenCloseAroundChanged = function(ix) {
    if (ix < 0) ix  = 0;
    if (ix >= this.model.length)
      ix            = this.model.length-1;
    if (this.model.length === 0) return;

    var headline    = this.model.headline(ix);
    var startStop;
    if (ix > 0) {
      startStop     = this.model.headline(ix-1).updateVisibleInHierarchy();
      if (startStop[1] < ix) {
        var sStop2  = headline.updateVisibleInHierarchy();
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

    this.view.fixOpenCloseFromTo(startStop[0], startStop[1], that.model);
    return startStop;         // The subtree
  };

  this.moveHeadlineUp = function(headline) {
    var index  = headline.index;
    if (index === 0) return;  // Nothing to see here...
    console.log(index + " setup, len " + that.model.length);
    var nextH  = that.model.headline(index-1);

    // Make certain both are visible:
    headline.visible(true);
    nextH.visible(true);
    // Move them around in View and Model:
    that.view.move_headline(nextH, index+1); // (Don't move the one we edit)
    headline.move(index-1);
    // Make certain the open/close arrows are correct:
    that._updateOpenCloseAroundChanged(index);
    that._updateOpenCloseAroundChanged(index-1);
  };


  this.moveHeadlineDown = function(headline) {
    var index  = headline.index;
    if (index+1 >= that.model.length) return; // Nothing to see here...
    console.log(index + " setup, len " + that.model.length);
    var nextH  = that.model.headline(index+1);

    // Make both visible:
    headline.visible(true);
    nextH.visible(true);
    // Move them around in View and Model:
    that.view.move_headline(nextH, index);
    headline.move(index+1);
    // Make certain the opened/closed arrows are correct:
    that._updateOpenCloseAroundChanged(index);
    that._updateOpenCloseAroundChanged(index+1);
  };


  this.moveHeadlineTree = function(fromStart, fromEnd, toAfterThis) {
    // Move a range of Headlines to another place.
    var i, no, headline;
    console.log("From " + fromStart + " to " + fromEnd + " -> after " +
                toAfterThis);

    if (toAfterThis < fromStart) {
      // No problem with indexes:
      no         = 0;
      for(i = fromStart; i < fromEnd; i++) {
        headline = this.model.headline(i);
        headline.visible(true);
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


  this.saveAndGotoIndex = function(headline, goIx, focusOnBlock) {
    // Saves any opened edit headline and opens another in Edit:
    if (this.view.has_headline_edit_on(headline)) {
      this.updateEditedHeadline(headline);
      this.view.close_edit_headline( headline );
    }

    var nextHeadline   = this.model.headline(goIx);

    if (! that.view.has_headline_edit_on(nextHeadline))
      that.view.render_edit_headline(goIx, nextHeadline);

    if (focusOnBlock)
      this.view.setFocusBlock( nextHeadline );
    else
      this.view.setFocusTitle( nextHeadline );
  };
  

  // - - - - - - - - - - - - - - - - - -
  this.searchEvent = function(event) {
    var div        = $('#' + that.divid_search + '_text');
    var regexp     = new RegExp( div.val() );
    alert( regexp );
    for(var i = 0; i < that.model.length; i++) {
      var headline = that.model.headline(i);
      if (headline.level() === 1 ||
          headline.compareTitleRegexp( regexp ) ||
          headline.compareBlockRegexp( regexp ) )
        headline.visible(true);
      else
        headline.visible(false);
    }
    event.preventDefault();
    return false;
  }


  // - - - - - - - - - - - - - - - - - -
  // Help routines for the button command events:

  this._getHeadlineIxForButtonEvent = function(event) {
    // (A Font Awesome strangeness.  New buttons sometimes use the
    // <a> in buttons as target and sometimes the <i> thingie??
    // Sigh... :-(
    // So I reuse this to get the ID also from Headline text.)
    var gparent     = event.target.parentNode;
    var model_str_id= gparent.id;
    if (! model_str_id)
      model_str_id  = gparent.parentNode.id;
    if (! model_str_id)
      model_str_id  = gparent.parentNode.parentNode.id;
    var model_id    = this.view.make_model_id_from_hldiv(model_str_id);
    return this.model.get_ix_from_id_string( model_id );
  };

  this._headlineFromMenuEvent = function(event) {
    // Get the Headline from Edit mode, when a dropdown menu
    // selection is done.
    // (Sigh, put ID:s in a few more Elements??)
    var edit_div = event.target.parentNode.parentNode.parentNode.
      parentNode.parentNode;
    // (Random if event is from <a> or from what it contains??)
    if (! edit_div.id)
      edit_div   = edit_div.parentNode;
    if (! edit_div.id)
      edit_div   = edit_div.parentNode;
    var model_id = that.view.make_model_id_from_hldiv(edit_div.id);
    var headline = that.saveHeadlineFromModelID( model_id );

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
    var i = that.model.get_ix_from_id_string( model_str_id );
    var headline = that.model.headline(i);

    return this.updateEditedHeadline(headline);
  };

  this.updateEditedHeadline = function(headline) {
	var values = that.view.get_values(headline);
    that.update_headline_title_block(headline, values.title, values.block);
    return headline;
  };

  // Help method which updates a Headline with title/block values:
  this.update_headline_title_block = function(headline, title, block) {
    var modified = false;
    if (title !== undefined && title !== headline.title()) {
	  console.log(JSON.stringify(
		Object.getOwnPropertyNames(headline.headline))
				 );
      headline.title( title );
	  // alert("HEADLINE UPDATE " + JSON.stringify(headline.headline));
      that.model.dirty(headline.index, 'title');
	  headline.headline.title_subs = undefined;
	  // This is if multiple quick updates and 
	  if (headline.headline.title_update_ix) {
		headline.headline.title_update_ix++;
	  } else {
		headline.headline.title_update_ix = 1;
	  }
      modified = true;
      // XXXX Check with server for parsing subparts of Headline!!
    }
    if (block !== undefined && block !== headline.block() ) {
      headline.block( block );
	  // alert("BLOCK UPDATE " + JSON.stringify(headline.headline));
      that.model.dirty(headline.index, 'block');
	  headline.headline.block_parts = undefined;
      modified = true;
      // XXXX Check with server for parsing subparts of Block!!
    }

    if (modified) {
	  // Will be replaced
      that.view.render_headline( headline );
	  that._update_headline_delayed( headline );
	}
  };


  // XXXX Move to Model, for f-cks sake!!
  // Add a callback which updates the Headline from the server.
  this._update_headline_delayed = function(headline) {
	// XXXX Need Model function to decide if a Headline/block has
	// Org things that needs parsing (only server side).

	var headline_text = headline.title() || "";
	var block_text    = headline.block() || "";

	var modified_ix   = headline.increment_modified_locally();
	var id            = headline.id_str();

	// Sets a flag that an update from the net is expected.  If
	// there is no network contact, this flag will hang around and
	// can be updated later. XXXX

	// Help fun to find Headline in Model, when the reply coming
	// back from the server:
	var help_fun = function(model, id) {
	  var ix = model.get_ix_from_id_string(id);
	  if (ix === undefined) {
		// Seems the Headline was removed before answer?
		return {noHeadline: 1, error: "Has been removed"};
	  }
	  var headline = model.headline( ix );

	  // Check to see if this has been sent to the server again, in
	  // a later query:
	  var modified_now = headline.modified_locally();
	  if (modified_now === undefined
		  || modified_now > modified_ix) {
		return {laterUpdate: 1, error: "Updated again"};
	  }

	  return {ix: ix, headline: headline};
	};

	// Got parsed Headline from the server. Update Model/View.
	var success_fun = function(reply) {
	  var look_up = help_fun(that.model, id);
	  if (!look_up.headline) {
		alert("Error in update from server -- " + look_up.error);
		return;
	  }
	  var ix = look_up.ix;
	  var headline = look_up.headline;

	  // - - - Update!
	  var data = JSON.parse(reply);
	  headline.modified_locally(undefined);

	  // alert("Got update reply for id " + id
	  // 	  + ", ix " + ix
	  // 	  // + "\nAll data:\n" + data
	  // 	  + "\nLen:\n" + data.length
	  // 	  + "\nTitle subs :\n" + data[0] // );
	  // 	  + "\nBlock subs :\n" + data[1]
	  // 	 );
	  if (data[0] && data[0] !== undefined)
		headline.headline.title_subs = data[0];
	  if (data[1]  && data[1] !== undefined)
		headline.headline.block_parts = data[1];
	  that.view.render_headline( headline );
	};

	// Called by jQuery when update fails:
	var fail_fun = function(reply) {
	  var look_up = help_fun(that.model, id);
	  if (!look_up.headline) {
		alert("Error in update from server -- " + look_up.error);
		return;
	  }
	  var ix = look_up.ix;
	  var headline = look_up.headline;
	  alert("Failed update of " + ix);
	};
	
    var ajaxtst = $.post(
	  "/attorg/translate_row/",
      {headline: "* " + headline_text,
       text: block_text},
      success_fun
    ).fail( fail_fun );
	// (The 'fail' thing is because $.post() returns a "promise".)
  };

  this._init_view();

  // End of Controller Object spec:
  return this;
};

