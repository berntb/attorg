//    This file is part of attorg.  Copyright 2013 Bernt Budde.
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

// XXXX Make setting up templates neater!!
// Inject template texts, instead.

var compiled_template_hline = _.template( $("#template_hline").html() );
var compiled_template_edit  = _.template( $("#template_edit_hline").html() );
var compiled_template_empty = _.template( $("#template_hidden_hline").html() );

// Main View object:

var OrgView = function(document_div_id, divid_headlines) {
  var that = this;

  this.document_div_id = document_div_id;
  this.divid_headlines = divid_headlines;

  // Keep IDs of those Headlines not rendered, since they aren't visible
  this.lazilyNotRendered = {};

  this.documentName = function() {
    if (arguments.length > 0) {
      $("#filename").html(_.escape(arguments[0]));
    }
    return $("#filename").html();
  };

  this.init_document_parameters = function(model_data) {
    // XXXX
    // How to edit TODO/DONE states, Priorities, Drawer names etc?
    // One problem is that we must check if the values exist in the
    // headlines/blocks and take some type of action when a value is
    // changed/deleted! (Also, needs to refresh all, so we have right
    // values of e.g. todos in selects.)

    $("#" + this.document_div_id + " .todo_states_list")
      .html(model_data.todo_states() + "");
    $("#" + this.document_div_id + " .done_states_list")
      .html(model_data.done_states());
    $("#" + this.document_div_id + " .priority_list")
      .html(model_data.priorities() + "");
    $("#" + this.document_div_id + " .drawer_names_list")
      .html(model_data.drawer_names() + "");
  };

  // A kludge to override Bootstrap. The colors are from org-faces.el
  // for a light background. They doesn't seem to be exactly as my Emacs
  // installation, but...
  var level_colors = [
    'none',
    '#0000FF',                    // 1 Blue1
    '#ffb90f',                    // Darkgoldenrod1
    '#a020f0',                    // Purple
    '#b22222',                    // Firebrick
    '#228b22',                    // 5 ForestGreen
    '#5f9ea0',                    // CadetBlue
    '#da70d6',                    // Orchid
    '#bc8f8f',                    // 8 RosyBrown
    '#808080',                    // (Only 8 was specified.)
    '#808080',
  ];

  this.render_all = function (model_data) {
    var div  = $("#" + this.divid_headlines);
    if (div === undefined)
      // XXXX How do you die violently in Javascript???
      throw new Error("No div with id " + this.divid_headlines);

    div.html('');                 // Clean out html in the div:

    // XXXX Add button to insert a prefix Headline (if I don't get a
    // better idea than that :-( )

    var i = 0;
    if (model_data.length) {
      // This weird thing should work also without level 1 items
      while(true) {
        var headline = model_data.headline(i);
        var from_to  = headline.updateVisibleInHierarchy();
        i            = from_to[1]+1;
        if (i >= model_data.length)
          break;
      }
    }
    
    var all_todo_done_states = model_data.all_todo_done_states();
    var hline_texts = [];
    for(var i = 0; i < model_data.length; i++)
      // XXXX Later, add logic for if closed.
      hline_texts.push( this.make_headline(model_data.headline(i),
                                           all_todo_done_states) );
    div.append( hline_texts.join('') );
    // for(i = 0; i < model_data.length; i++)
    //   if (! model_data.headline(i).visible())
    //     this.hide_headline(model_data.headline(i));
  };


  // ------------------------------------------------------------
  // - - - - - Headlines:

  this.render_headline = function(headline, always_render) {
    var div  = $( '#' + this.make_headline_id(headline) );
    if (div === undefined)
      return;
	// alert("caller is " + arguments.callee.caller.toString() + "\n Block is:"
	// 	  + headline.block_html());
    div.parent().replaceWith( this.make_headline(headline, undefined,
												 always_render) );
	// alert(headline.block_html());
  };


  this.render_new_headline = function(ix, headline) {
    var rendered_html = this.make_headline( headline );

    var model = headline.owner;
    var div;
    if (ix == 0) {
      // First place:
      div  = $("#" + this.divid_headlines).parent();
      div.prepend( rendered_html );
    } else if (ix > 0 && ix-1 < model.length) {
      // There is a headline at ix already. Add a new one before
      var div_id  = this.make_headline_id( model.headline(ix-1) );
      div = $("#" + div_id).parent();
      div.after( rendered_html );
    } else {
      // The main div:
      div  = $("#" + this.divid_headlines).parent();
      div.append( rendered_html );
    }
  };

  // Handles commands to edit Level, TODO, insert new Headline and
  // to enter Editing mode for a Headline. In the future, tags,
  // etc. (Modal editing in Emacs... :-( :-) )
  this.dontShowBlockRegexp = /^\s*$/;


  this.make_headline = function( headline, all_todo_done_states,
								 force_visible) {
    var visible_at_all= headline.visible();
	var headline_id = headline.id_str();

	// Don't build everything when empty.
	// (When show_headline() is called, then it needs to make certain
	//  it is created before being shown as visible.)

	if (!visible_at_all && ! force_visible ) {
	  this.lazilyNotRendered[headline_id] = true;
	  return compiled_template_empty( { id: headline_id } );
	}

    var title_value   = headline.title();
	var text_block    = headline.block();

    var visible_kids  = headline.visible_children();

    var level         = headline.level();

	var block_html    = '';
	if (text_block !== undefined &&
		! this.dontShowBlockRegexp.test(text_block)) {
	  block_html      = "<pre>" + headline.block_html() + "</pre>";
	}

	return compiled_template_hline(
	  { id: headline_id, // ID string for Headline
		visible: visible_at_all,
		visible_kids: headline.visible_children(),
		level: level,
		subtree_open_closed: this._make_open_close_button(visible_kids),
		// Move into Template??
		level_select_options: _make_level_select_help(level),
		todo_select_options: _make_todo_select_help(headline.todo(),
													all_todo_done_states),
		// Kludge for setting Bootstrap color:
		color_text: level_colors[level],
		title: headline.title_html(),
		block: block_html
	  });
  };



  // ------------------------------------------------------------
  // Edit Headline:

  this.render_edit_headline = function(ix, headline) {
    // Adds a new Headline and renders it as editable.
    var rendered_html = this.make_edit_headline( headline );

    var div_id  = this.make_headline_id( headline );
    var div  = $("#" + div_id).parent().children(':last');
    if (! div.is(":visible"))
      return;

    // XXXX If the block text for a Headline is "too" long, hide the
    // [end of the?] text block by default??? (And have a button to
    // show the hidden text.)

    div.html( rendered_html );
  };


  this.make_edit_headline = function( headline, all_todo_done_states) {
    var title_value   = headline.title();
    var text_block    = headline.block() || '';

	// XXXX Also put a frame around H-line + edit fields??

	return compiled_template_edit(
	  { id: headline.id_str(), // ID string for Headline
		level: headline.level(),
		title_text: title_value.replace(/"/g, '&quot;'),
		block_text: _.escape(text_block),
	  }) ;
	return make_edit_headline(headline, all_todo_done_states);
  };

  // ------------------------------------------------------------
  // Utilities:


  this.move_headline = function(headline, to_ix) {
    var model     = headline.owner;
    if (model.length === 0 || headline.index === to_ix)
      return; // Uh??
    if (to_ix > model.length)
      to_ix       = model.length;

    var divToMove = $('#' + this.make_headline_id(headline)).parent();
    var div, div_id, relatedH;
    if (to_ix == 0) {
      // First place:
      div_id      = this.make_headline_id( model.headline( 0 ) );
      div         = $("#" + div_id).parent();
      div.prepend( divToMove );
    } else {
      // There is a headline at to_ix already. Add a new one before
      relatedH    = model.headline(to_ix-1);
      div_id      = this.make_headline_id( relatedH );
      div         = $("#" + div_id).parent();
      divToMove.insertAfter( div  );
    }
  };

  // - - - - - Handle showing/hiding a Headline:
  this.noOpenCloseUpdates = false;

  this.close_edit_headline = function(headline) {
    var div_id  = this.make_headline_id( headline );
    // (Doesn't check if edit is on at all; probably not faster.)
    $("#" + div_id).parent().children(':last').html('');
  };

  this.show_headline = function(headline, noOpenCloseUpdates) {
	var id_str = headline.id_str();
    var div  = $( '#' + this.make_headline_id(headline) ).parent();

	// Check if this Headline wasn't rendered (lazy).
	if (this.lazilyNotRendered[id_str]) {
	  delete this.lazilyNotRendered[id_str];
	  this.render_headline(headline, true);
	}

    div.show();
    if (! this.noOpenCloseUpdates && !noOpenCloseUpdates)
      this.fixOpenCloseFromTo(headline.index, headline.index,
                              headline.owner);
  };

  this.hide_headline = function(headline, noOpenCloseUpdates) {
    var div  = $( '#' + this.make_headline_id(headline) ).parent();
    div.hide();
    if (! this.noOpenCloseUpdates && !noOpenCloseUpdates)
      this.fixOpenCloseFromTo(headline.index, headline.index,
                              headline.owner);
  };


  // - - - - - Handle close/open box:
  // XXXX Have code both here and in Template. :-( Just use one way.
  this.fixOpenCloseFromTo = function(from_ix, to_ix, model) {
    // Changes the open/closed flags for Headlines.

    // This assumes the open/closed data in the input data is set up
    for(var ix = from_ix; ix <= to_ix; ix++) {
      var headline    = model.headline(ix);
      var vis_kids    = headline.visible_children();
      $( '#' + this.make_headline_id(headline) )
        .find('.open-subtree').replaceWith(
          this._make_open_close_button(vis_kids)
        );
    }
  },

  this._make_open_close_button = function(visible_kids) {
    var icon;
    if (visible_kids === 'no_kids') {
	  return '<span class="open-subtree pull-left" style="display: none;"></span>';
      // return '<button type="button" class="btn btn-mini open-subtree" ' +
	  // 	' disabled>-</button>';
    } else if (visible_kids === 'all_visible') {
      icon  = 'icon-caret-down';
    } else if (visible_kids === 'some') {
      icon  = 'icon-angle-down';
    } else {
      icon  = 'icon-caret-right';
    }
    // btn-small or btn-mini??
    return '<a class="btn btn-small open-subtree pull-left"><i class="' + icon +
      '"></i></a>';
  };

  // - - - - - Headline:
  this.setFocusTitle = function(headline) {
    $( '#' + this.makeEditTitleId(headline) ).focus();
  };
  this.setFocusBlock = function(headline) {
    // alert( $('#' + this.makeEditBlockId(headline)).val() ); // Works
    $( '#' + this.makeEditBlockId(headline) ).focus(); // Doesn't work??
  };

  this.setSelectTitle = function(headline) {
    $( '#' + this.makeEditTitleId(headline) ).select();
  };

  // - - - - - Block:
  // XXXX Implement this, to size up the textareas for blocks:
  this.find_no_lines_in_block = function(block, min_lines, max_lines) {
    // 1. If lots of lines in block, want to hide the block when
    // goes to Edit mode. (Also allow hiding block specifically??)
    // 2. To make a reasonable size for textareas.

    // (N B -- next version should dynamically change size of
    // textarea.)
  };


  // - - - - - Diverse:
  // How to get the top ID for a non-edit Headline.
  this.make_headline_id = function(headline) {
    return 'hl_' + headline.id_str();
  };
  this.make_headline_edit_id = function(headline) {
    return 'ed-' + headline.id_str();
  };
  this.makeEditTitleId = function(headline) {
    return 't_' + headline.id_str();
  };
  this.makeEditBlockId = function(headline) {
    return 'b_' + headline.id_str();
  };
  // Must work for both of previous methods
  this.make_model_id_from_hldiv = function(div_id) {
    return div_id.slice(3);
  };

  this.has_headline_edit_on = function(headline) {
    // There must be some more efficient way of doing this?! Should I
    // set some flag, instead of using four jQuery calls??
    var headline_edit_div =
      $( '#' + this.make_headline_id(headline )).parent().children(':last');
    if (headline_edit_div.is(':empty'))
      return false;
    return true;
  };

  // - - - - - Make Level-select HTML:
  var _level_generated = [];

  function _make_level_select_help(level) {
    // Help fun, generates the options for the select.
    var lvl_items   = '';
    for (var i=1; i < 11; i++) {
      var text;
      if (i < 6) {
        text        = "*****".substring(0, i);
      } else {
        text        = "*(" + i + ")";
      }
      var sel_spec  = '<option value="' + i + '"';
      if (i == level)
        sel_spec   += 'selected';
      lvl_items    += sel_spec + ">" + text + "</option>";
    }

    return lvl_items;
  };

  this.make_level_select = function(level, level_id) {
    // Memoizises most of the work.
    // (XXXX Let code check super of this, so no need to have id?)
    if (! _level_generated[level])
      _level_generated[level] = _make_level_select_help(level)
      + "</select>\n";

    return '<select name="level-select" class="span1 lvl_select" ' +
      'id="' + level_id + '">' + _level_generated[level];
  };

  // - - - Make TODO-select HTML:
  var _todo_generated = [];

  function _make_todo_select_help(present_state, all_todo_done_states) {
    var todo_items = '<option value="">-</option>';
    for (var i in all_todo_done_states) {
      var state     = all_todo_done_states[i];
      if (state === present_state) {
        todo_items  += '<option value="' + state + '" selected>' +
          state + "&nbsp;</option>\n";
      } else {
        todo_items  += '<option value="' + state + '">' +
          state + "&nbsp;&nbsp;</option>\n";
      }
    }
    return todo_items;
  }

  this.make_todo_select = function(present_state, todo_id,
                                   all_todo_done_states) {
    // Memoizises most of the work.
    // XXXX When writes code to update TODO-states, need to clear
    // out this cache!!
    if (! _todo_generated[present_state])
      _todo_generated[present_state] = _make_todo_select_help(
		present_state,
		all_todo_done_states
	  ) + "</select>\n";

    return '<select name="todo" class="span1 todo_select" ' +
      'id="' + todo_id + '">' + _todo_generated[present_state];
  };

  // - - - - - Make Level-select HTML:
  this.make_more_edit_menu = function() {
    // Menu alternative:
    var alt = function(class_name, icon, menu_choice) {
      return '<li><a class="' + class_name + '">' +
        '<i class="' + icon + '"></i> ' + menu_choice + '</a></li>';
    }

    return '<div class="btn-group">' +
      '<a class="btn dropdown-toggle" data-toggle="dropdown"' +
      '  > More<i class="icon-large icon-caret-down"></i></a>' +
      '<ul class="dropdown-menu">' +
      alt('delete-header',   "icon-trash",       'Delete') +
      '<li class="divider"></li>' +
      alt('move-header-up',  'icon-angle-up',    'Move Up') +
      alt('move-header-down','icon-angle-down',  'Move Down') +
      alt('move-tree-up',    "icon-chevron-up",  "Move Subtree Up") +
      alt('move-tree-down',  "icon-chevron-down","Move Subtree Down") +
      '<li class="divider"></li>' +
      alt('',                "icon-coffee",      'Not implemented yet:') +
      alt('',                "icon-copy",        'Copy Subtree') +
      alt('',                "icon-paste",       'Paste Subtree') +
      alt('',                "icon-trash",       'Delete Subtree') +
      '</ul></div>';
  };

  // ------------------------------------------------------------
  // Updates of headlines
  this.delete_headline = function( headline ) {
    var div_id = this.make_headline_id( headline );
    var div    = $("#" + div_id).parent();
    div.remove();
  };
};
