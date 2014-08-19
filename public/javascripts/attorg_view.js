//	  This file is part of attorg.	Copyright 2013 Bernt Budde.
//
//	  Attorg is free software: you can redistribute it and/or modify
//	  it under the terms of the GNU General Public License as published by
//	  the Free Software Foundation, either version 3 of the License, or
//	  (at your option) any later version.
//
//	  Attorg is distributed in the hope that it will be useful,
//	  but WITHOUT ANY WARRANTY; without even the implied warranty of
//	  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
//	  GNU General Public License for more details.
//
//	  You should have received a copy of the GNU General Public License
//	  along with Attorg.  If not, see <http://www.gnu.org/licenses/>.

//	  The author is Bernt Budde, see my GitHub account, user berntb.

// ----------------------------------------------------------------------


// XXXX Make setting up templates neater!!
// Inject template texts, instead.

var template_hline      = _.template( $("#template_hline").html() );
var template_edit	    = _.template( $("#template_edit_hline").html() );
var template_empty      = _.template( $("#template_hidden_hline").html() );

var template_hline_tags = _.template( $("#template_hline_tags").html() );


// Main View object:

var OrgView = function(document_div_id, divid_headlines) {
  var that = this;

  this.document_div_id = document_div_id;
  this.divid_headlines = divid_headlines;

  // IDs of unrendered Headlines, since they have never been visible:
  this.lazilyNotRendered = {};

  this.documentName = function() {
	if (arguments.length > 0) {
	  $("#filename").html(_.escape(arguments[0]));
	}
	return $("#filename").html();
  };

  this.init_document_parameters = function(model_data) {
	// XXXX

	var todo  = model_data.todo_states();
	var done  = model_data.done_states();
	var tags  = model_data.tags();
	var draws = model_data.drawer_names();

	$("#" + this.document_div_id + " .todo_states_list")
	  .html( _.escape(todo.join(", ")) );
	$("#" + this.document_div_id + " .done_states_list")
	  .html( _.escape(done.join(", ")) );
	$("#" + this.document_div_id + " .tag_list")
	  .html( (tags !== undefined && tags.length) ?
			 _.escape(tags.join(", ")) : "-" );
	$("#" + this.document_div_id + " .priority_list")
	  .html( _.escape(model_data.priorities().join(", ")) );
	$("#" + this.document_div_id + " .drawer_names_list")
	  .html( _.escape(draws.join(", ")) );
  };


  // If set, will highlight text in text/block:
  this._hiliteRegex = undefined;


  // ----------------------------------------------------------------------
  this.render_all = function (model_data) {
	var div	 = $("#" + this.divid_headlines);
	if (div === undefined)
	  // XXXX How do you die violently in Javascript???
	  throw new Error("No div with id " + this.divid_headlines);

	div.html('');				  // Clean out html in the div:

	// XXXX Add button to insert a prefix Headline (if I don't get a
	// better idea than that :-( )

	var i = 0;
	if (model_data.length) {
	  // This weird thing should work also without level 1 items
	  while(true) {
		var headline = model_data.headline(i);
		var from_to	 = headline.updateVisibleInHierarchy();
		i			 = from_to[1]+1;
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
	//	 if (! model_data.headline(i).visible())
	//	   this.hide_headline(model_data.headline(i));
  };


  // ----------------------------------------------------------------------
  // - - - - - Headlines:

  this.render_headline = function(headline,
								  always_render,
								  protect_any_edit_fields) {
	var div	 = $( '#' + this.make_headline_id(headline) );
	if (div === undefined)
	  return;
	// alert("caller is " + arguments.callee.caller.toString() + "\n Block is:"
	//	  + headline.block_html());
	if (protect_any_edit_fields) {
	  div.replaceWith( this.make_headline(headline,
										  undefined,
										  always_render,
										  true) );
	} else {
	  div.parent().replaceWith( this.make_headline(headline,
												   undefined,
												   always_render) );
	}
	// alert(headline.block_html());
  };


  this.render_new_headline = function(ix, headline) {
	var rendered_html = this.make_headline( headline );

	var model = headline.owner;
	var div;
	if (ix == 0) {
	  // First place:
	  div  = $("#" + this.divid_headlines).parent();
	  div.before( rendered_html ); // prepend() puts it at start of 1st Hline!
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

  this.make_headline = function( headline,
								 all_todo_done_states,
								 force_visible,
								 hide_headline_html_prefix) {
	// hide_headline_html_prefix:
	//  Set if needs to update only Headline presentation (because the
	//  Headline has other stuff visible, typically edit fields.)

	var visible_at_all= headline.visible();
	var headline_id = headline.id_str();

	// Don't build everything when empty.
	// (When show_headline() is called, then it needs to make certain
	//	it is created before being shown as visible.)

	if (!visible_at_all && ! force_visible ) {
	  this.lazilyNotRendered[headline_id] = true;
	  return template_empty( { id: headline_id } );
	}

	var title_value	  = headline.title();
	var text_block	  = headline.block();
	var level		  = headline.level();
	var visible_kids  = headline.visible_children();
	var configp       = headline.is_config();
	var todo          = headline.todo();
	var tags          = headline.tags();
	var hiliteRegexp  = this.getHighlightRegex();
	var block_html	  = '';

	var titleHilite, blockHilite, tagHilite;


	if (!configp && hiliteRegexp && hiliteRegexp.test(title_value)) {
	  console.log("SEARCH HIT:" + title_value);
	  titleHilite     = true;
	}
	if (text_block  !== undefined &&
		! this.dontShowBlockRegexp.test(text_block)) {
	  block_html	  = headline.block_html();
	  if (hiliteRegexp && hiliteRegexp.test(text_block)) {
		blockHilite   = true;
	  }
	}

	// XXXX Need to check tags for hilite too!!

	if (todo === '')
	  todo            = '-'
	if (tags != undefined) {
	  tags            = ":" + _.escape(tags.join(":")) + ":";
	  // (Shouldn't really check the hilite in html escaped tags.)
	  if (hiliteRegexp && hiliteRegexp.test(tags))
		tagHilite     = true;
	}



	return template_hline(
	  { id: headline_id, // ID string for Headline
		visible: visible_at_all,
		visible_kids: headline.visible_children(),
		hide_prefix: hide_headline_html_prefix,
		level: level,
		subtree_open_closed: this._make_open_close_button(visible_kids),
		level_spec:  configp ? '' : headline.asterisks(),
		todo_spec: _.escape(todo),
		// Kludge for setting (Bootstrap) color:
		title_css_class: configp ? 'config-class' : 'text-level' + level,
		title: configp ? "--CONFIG--" : headline.title_html(),
		config: configp,
		block: block_html,
		tags: tags,
		priority: headline.priority(),
		blockHilite: blockHilite,
		titleHilite:  titleHilite,
		tagHilite: tagHilite,
	  });
  };



  // ----------------------------------------------------------------------
  // Edit Headline:

  this.render_edit_headline = function(ix, headline) {
	// Adds a new Headline and renders it as editable.
	var div_id	= this.make_headline_id( headline );
	var div_parent	= $("#" + div_id).parent();
	var div = div_parent.children(':last');
	if (! div.is(":visible"))
	  return;

	var rendered_html = this.make_edit_headline( headline );

	// XXXX If the block text for a Headline is "too" long, hide the
	// [end of the?] text block by default?? (And have a button to
	// show the hidden text.)

	this._modify_top_view_for_edit(div_parent, headline);

	div.html( rendered_html );
	this.scrollHeadlineIntoView(headline, 50);
  };


  this.make_edit_headline = function( headline, all_todo_done_states) {
	var title_value	  = headline.title();
	var text_block	  = headline.block() || '';

	var level		  = headline.level();

	return template_edit(
	  { id: headline.id_str(), // ID string for Headline
		level: headline.level(),
		title_text: title_value.replace(/"/g, '&quot;'),
		block_text: _.escape(text_block),
		// Move into Template??
		level: level,
		config: headline.is_config(),
		level_select_options: (headline.is_config() ?
							   '' : _make_level_select_help(level)),
	  }) ;
  };

  // ----------------------------------------------------------------------
  // Tags:

  // Make one fun out of these two?
  this.setupTagsForEditing = function(tags, allTags) {
	// This is in a Modal:
	$("#edit-headline-tags").html(template_hline_tags({tags:    tags,
													   allTags: allTags}));
	this._usedTagList = allTags;
  };

  this.editTagsForHeadline = function() {
	$("#hline-tags-modal").modal({backdrop: true});
  };

  this.findCheckedTagsForHeadline = function() {
	var allTags = this._usedTagList;
	if (allTags === undefined)
	  return [];

	var named   = Array();
	$("#edit-headline-tags").find("input:checked").each(function (i, ob) {
	  var num   = parseInt($(ob).attr("name"));
	  if (! isNaN(num) && num >= 0 && num < allTags.length)
		named.push( allTags[num] );
	});
	return named;
  };

  this.closeHeadlineTagsEditing = function() {
	$("#hline-tags-modal").modal('hide');
	delete this._usedTagList;
  };


  // ----------------------------------------------------------------------
  // Utilities:

  // To find/change which Headlines are visible:
  function _findWindowScroll() {
	// body should have 40 as margin in the css. But Firefox has 50??
	// Verify in Safari on iPad/Mac (Borrow a retina display and
	// check, too.) Is Bootstrap overriding this?
	return $(window).scrollTop() + 50;
  };
  function _findWindowScrollBottom() {
	return $(window).scrollTop() + $(window).height();
  };



  // - - -
  // Getter/Setter for what-to-Highlight regexp:
  // (Work is done in templates.)
  this.setHighlightRegex = function (rx) {
	this._hiliteRegex = rx;
  };
  this.getHighlightRegex = function () {
	return this._hiliteRegex;
  };


  this.get_values = function(headline) {
	var model_str_id= headline.id_str();
	var titleInput  = $('#t_' + model_str_id);
	var blockInput  = $('#b_' + model_str_id);

	return {title: titleInput.val(), block: blockInput.val() };
  };

  // Make it visible that a Headline is being edited.
  // (For now -- put a frame around the Headline and its editing form.)

  // (Better not set a Headline color too similar to the bg-warning color!)
  this._modify_top_view_for_edit = function(topView, headline) {
	topView.addClass("well well-small");
	topView.addClass("bg-warning");

	// Maybe do this later?
	// var marginTop   = topView.css("margin-top");
	// var marginBot   = topView.css("margin-bottom");
	// console.log("Margin top " + marginTop + ", bottom " + marginBot);
	// topView.css("margin-top", marginTop + 30);
	// topView.css("margin-bottom", marginBot + 30);
  };

  this._modify_top_view_for_end_of_edit = function(topView, headline) {
	topView.removeClass("well well-small");
	topView.removeClass("bg-warning");
  };

  // - - - Move Headline in View only
  // This must be paired with a call to move a Headline in the model, too!
  this.move_headline = function(headline, to_ix) {
	var model	  = headline.owner;
	if (model.length === 0 || headline.index === to_ix)
	  return; // Uh??
	if (to_ix > model.length)
	  to_ix		  = model.length;

	var divToMove = $('#' + this.make_headline_id(headline)).parent();
	console.log("Moving Headline to " + to_ix);
	console.log("Moving Headline's parent:" + this.make_headline_id(headline));
	var div, div_id, relatedH;
	if (to_ix == 0) {
	  // First place:
	  div_id	  = this.make_headline_id( model.headline( 0 ) );
	  div		  = $("#" + div_id).parent();
	  console.log("BEFORE THIS:");
	  console.log(div.html());
	  div.before( divToMove ); // prepend() insert it at START of element :-(
	} else {
	  // There is a headline at to_ix already. Add a new one before
	  relatedH	  = model.headline(to_ix-1);
	  div_id	  = this.make_headline_id( relatedH );
	  console.log("Moving '#'"+div_id + "'s parent");
	  div		  = $("#" + div_id).parent();
	  divToMove.insertAfter( div  );
	}
  };

  // - - - - - Handle showing/hiding a Headline:
  this.noOpenCloseUpdates = false; // (XXXX Not used)

  this.close_edit_headline = function(headline) {
	var div_id	= this.make_headline_id( headline );
	// (Doesn't check if edit is on at all; probably not faster.)
	var div_parent	= $("#" + div_id).parent();
	this._modify_top_view_for_end_of_edit(div_parent, headline);
	// div_parent.removeClass("well well-small");
	var div = div_parent.children(':last');
	div_parent.children(':last').html('');
  };

  this.show_headline = function(headline, noOpenCloseUpdates) {
	var id_str = headline.id_str();
	var div	 = $( '#' + this.make_headline_id(headline) ).parent();

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
	var div	 = $( '#' + this.make_headline_id(headline) ).parent();
	div.hide();
	if (! this.noOpenCloseUpdates && !noOpenCloseUpdates)
	  this.fixOpenCloseFromTo(headline.index, headline.index,
							  headline.owner);
  };


  // - - - - - Handle close/open box:
  // XXXX Have code both here and in Template. :-( Just use one way.
  this.fixOpenCloseFromTo = function(from_ix, to_ix, model) {
	// Changes the open/closed flags for Headlines.
	// console.log("--- Open/Close Update from " + from_ix + " to " + to_ix);

	// This assumes the open/closed data in the input data is set up
	for(var ix = from_ix; ix <= to_ix; ix++) {
	  var headline	  = model.headline(ix);
	  var vis_kids	  = headline.visible_children();
	  $( '#' + this.make_headline_id(headline) )
		.find('.openclose-tree').replaceWith(
		  this._make_open_close_button(vis_kids)
		);
	}
  },


  // XXXX Make this just a hash.. uh, object. Three keys w simple values.
  this._make_open_close_button = function(visible_kids) {
	var icon, xaClass = '';
	if (visible_kids === 'no_kids') {
	  // return '<span class="open-subtree pull-left"'
	  // 	+ ' style="display: none;"></span>';
	  // return '<button type="button" class="btn btn-mini open-subtree" ' +
	  //	' disabled>-</button>';
	  icon    = 'minus-sign';
	  xaClass = " disabled ";
	} else if (visible_kids === 'all_visible') {
	  icon	  = 'arrow-down';
	} else if (visible_kids === 'some') {
	  icon	  = 'collapse-down';
	} else {
	  icon	  = 'expand';
	}
	return '<a class="btn btn-sm openclose-tree attorg-command pull-left'
	  + xaClass + '" '
	  + 'data-command="OpenClose">'
	  + '<span class="glyphicon glyphicon-' + icon + '"></span>'
	  + '</a>';
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

	// (N B -- should dynamically change size of textarea. Just cut
	//  off block after X chars? Need to store this status.)
  };

  this.toggleLargeBlock = function(headline) {
	// XXXX
	console.log("In View's toggleLarge");
  }


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
	var lvl_items	= '';
	for (var i=1; i < 11; i++) {
	  var text;
	  if (i < 6) {
		text		= "*****".substring(0, i);
	  } else {
		text		= "*(" + i + ")";
	  }
	  var sel_spec	= '<option value="' + i + '"';
	  if (i == level)
		sel_spec   += 'selected';
	  lvl_items	   += sel_spec + ">" + text + "</option>";
	}

	return lvl_items;
  };

  this.make_level_select = function(level, level_id) {
	// Memoizises most of the work.
	// (XXXX Let code check super of this, so no need to have id?)
	if (! _level_generated[level])
	  _level_generated[level] = _make_level_select_help(level)
	  + "</select>\n";

	return '<select name="level-select" class="col-md-1 lvl_select" ' +
	  'id="' + level_id + '">' + _level_generated[level];
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
	  '	 > More<i class="icon-large icon-caret-down"></i></a>' +
	  '<ul class="dropdown-menu">' +
	  alt('delete-header',	 "icon-trash",		 'Delete') +
	  '<li class="divider"></li>' +
	  alt('move-header-up',	 'icon-angle-up',	 'Move Up') +
	  alt('move-header-down','icon-angle-down',	 'Move Down') +
	  alt('move-tree-up',	 "icon-chevron-up",	 "Move Subtree Up") +
	  alt('move-tree-down',	 "icon-chevron-down","Move Subtree Down") +
	  '<li class="divider"></li>' +
	  alt('',				 "icon-coffee",		 'Not implemented yet:') +
	  alt('',				 "icon-copy",		 'Copy Subtree') +
	  alt('',				 "icon-paste",		 'Paste Subtree') +
	  alt('',				 "icon-trash",		 'Delete Subtree') +
	  '</ul></div>';
  };

  // ------------------------------------------------------------
  // Updates of headlines
  this.delete_headline = function( headline ) {
	var div_id = this.make_headline_id( headline );
	var div	   = $("#" + div_id).parent();
	div.remove();
  };


  // ------------------------------------------------------------
  // Handle scrolling in View:

  // Find first invisible above view area, given a visible Headline.
  // Returns undefined if fails. On success, returns an array with:
  //    [first_outside_visible_scroll, last_inside_fully_visible]
  this.firstHeadlineAboveScroll = function(headline, margin) {
	var result = this._topVisibleHline(headline,
									   (margin === undefined ? 0 : margin),
									   true);
	console.log(" ---- firstHeadlineAboveScroll");
	if (result === undefined)
	  return undefined;			// Empty Headline list?
	if (result[1] !== undefined)
	  return headline.owner.headline(result[1]);
	return undefined;
  };


  this.firstHeadlineBelowScroll = function(headline, margin) {
	var result = this._botVisibleHline(headline,
									   (margin === undefined ? 0 : margin),
									   true);
	// console.log(" ---- firstHeadlineBelowScroll, result:");
	// console.log(result);
	if (result === undefined)
	  return undefined;			// Empty Headline list?
	if (result[1] !== undefined)
	  return headline.owner.headline(result[1]);
	return undefined;
  };


  this.topVisibleHeadline = function(headline, margin) {
	return this._topVisibleHline(headline, margin);
  };

  this.botVisibleHeadline = function(headline, margin) {
	return this._botVisibleHline(headline, margin);
  };


  this.scrollHeadlineIntoView = function(headline, margin) {
	var model_str_id= headline.id_str();
	var titleInput  = $('#hl_' + model_str_id);
	console.log("scrollHeadlineIntoView: Hline " + headline.index);
	console.log("   Headline title:" + headline.title());
	this._scrollIntoView(titleInput, margin);
  };


  // Like previous, but make certain the Headline is at the bottom:
  this.scrollHeadlineToBottom = function(headline, margin) {
	console.log(headline);
	console.log(_.keys(headline));
	console.log(headline.headline);
	console.log(headline.id_str);
	var model_str_id= headline.id_str();
	var titleInput  = $('#hl_' + model_str_id);
	// alert("In scrollHeadlineTobottom:" + headline.title());
	this._scrollIntoViewAtBottom(titleInput, margin);
  };


  this.isHeadlineScrolledIntoView = function(headline) {
	var model_str_id= headline.id_str();
	var titleInput  = $('#hl_' + model_str_id);
	// console.log("isHeadlineScrolledIntoView, Hline Ix " + headline.index);
	return this._isScrolledIntoView(titleInput);
  };


  // Mostly from: stackoverflow.com/questions
  // /487073/check-if-element-is-visible-after-scrolling

  this._findViewPortOffsetForHeadline = function(headline) {
	var model_str_id= headline.id_str();
	var jQelem      = $('#hl_' + model_str_id);
	return jQelem.offset().top;
  };


  this._findPreviousVisibleIndex = function(headline) {
	var model = headline.owner;
	var foundSpec = model.findHeadlinesFrom(
	  headline.index, 1, -1, function(headline) {
		return headline.visible() ? true : false;
	  });
	if (foundSpec[1] === undefined)
	  return foundSpec[0];
	return undefined;
  };


  this._topVisibleHline = function(headline, margin, alsoFirstInvisible) {
	// Returns the topmost visible headline. (If alsoFirstInvisible, it
	// returns an array with the index of the first invisible as the
	// second parameter. Kludgy.)
	return this._VisHlineTopBot(headline, margin, true, alsoFirstInvisible);
  }

  this._botVisibleHline = function(headline, margin, alsoFirstInvisible) {
	// See previous
	return this._VisHlineTopBot(headline, margin, false, alsoFirstInvisible);
  }

  this._VisHlineTopBot = function(headline, margin, upwards, also1stInvis) {
	var model         = headline.owner;

	var headlViewport = that._findHeadlineInViewport(headline);
	if (headlViewport === undefined)
	  return undefined;			// Uhhh...?

	var viewMargin    = margin === undefined ? 0 : margin;
	var docViewTop    = _findWindowScroll();
	var docViewBot    = _findWindowScrollBottom();

	// - - - Loop upwards to find first non-visible.
	var lastVisible   = headlViewport.index;
	var foundSpec     = model.findHeadlinesFrom(
	  lastVisible, 1, (upwards ? -1 : 1), function(headline) {
		if (! headline.visible())
		  return false;
		var hOff      = that._findViewPortOffsetForHeadline(headline);
		console.log("   H-line ix:" + headline.index + ", step UP by 1:"
					+ headline.title());
		console.log("     the Off:" + hOff + ", window: " + docViewTop);
		if (upwards) {
		  if (hOff < (docViewTop + viewMargin) ) {
			console.log("    (is before window.)");
			return true;
		  }
		} else {
		  if (hOff > (docViewBot - viewMargin) ) {
			console.log("    (is before window downwards.)");
			return true;
		  }
		}

		lastVisible   = headline.index; // This was still visible
		return false;
	  }
	)

	var theHeadline   = model.headline(lastVisible);
	if (also1stInvis) {
	  if (foundSpec[1] === undefined)
		return [theHeadline, foundSpec[0]];
	  return undefined;
	}

	return theHeadline;
  };


  this._findHeadlineInViewport = function(headline) {
	// This verifies that the headline is visible in the browser
	// window, otherwise it returns a random headline in viewPort:
	var model         = headline.owner;

	// XXXX Must put id in _lastFoundHeadlineInViewport!!

	// In these cases, no scrolling is by definition possible:
	if (model.length < 2)
	  return undefined;

	var docViewTop    = _findWindowScroll();
	var docViewBot    = _findWindowScrollBottom();

	function checkVisible(viewPortOff) {
	  return ( viewPortOff > docViewTop && viewPortOff < docViewBot);
	};

	function loopToFindAVisible(headline, downwards) {
	  // Go step by step:
	  var ix = headline.index;
	  console.log("=======================  Headline, STEP BY STEP STAGE");
	  var foundSpec = model.findHeadlinesFrom(
		ix, 1, (downwards ? 1 : -1), function(headline) {
		  if (! headline.visible())
			return false;
		  var hOff    = that._findViewPortOffsetForHeadline(headline);
		  console.log("--- Headline " + headline.index + ", step by 1:"
					       + headline.title());
		  console.log("    Off:" + hOff + ", window: " + docViewTop);
		  if (hOff < docViewTop) {
			console.log("    (is before window.)");
			return false;
		  }
		  if (hOff < docViewBot)
			return true;		// Is visible!

		  console.log("    (Is AFTER window: " + docViewBot + ")");
		  return false;			// Shouldn't happen?
		}
	  );

	  if (foundSpec[1] === undefined)
		console.log("FOUND A VISIBLE HEADLINE!");
	  if (foundSpec[1] === undefined)
		return foundSpec[0];
	  return undefined;

	};

	var found, lastFound, lastOffset, foundHline;

	// First, check if the input Headline is visible; a common case:
	if (headline.visible()) {
	  lastOffset      = that._findViewPortOffsetForHeadline(headline);
	  if (checkVisible(lastOffset)) {
		console.log("Success in-Headline!");
		that._lastFoundHeadlineInViewport = headline.id_str();
		return headline;
	  }
	}
	
	// - - - Cache of earlier tries:
	lastFound         = that._lastFoundHeadlineInViewport;
	if (lastFound   !== undefined && model.length > lastFound) {
	  console.log("Checking cache");
	  var lastHeadline= model.headline(lastFound);
	  if (lastHeadline.visible()) {
		lastOffset    = that._findViewPortOffsetForHeadline(lastHeadline);
		if (lastOffset > docViewTop && lastOffset < docViewBot)
		  return lastHeadline;
		that._lastFoundHeadlineInViewport = undefined;

		if (lastOffset < docViewTop && docViewTop-lastOffset < 500) {
		  // Not so far before/above viewport. Traverse down towards View:
		  console.log("Tries to scroll downwards");
		  found       = loopToFindAVisible(model.headline(0), true);
		  if (found !== undefined) {
			console.log("Success DOWN!");
			that._lastFoundHeadlineInViewport = found;
			return model.headline(found);
		  }
		} else if (lastOffset > docViewTop && lastOffset-docViewTop < 500) {
		  // Not so far after viewport. Traverse up towards View:
		  console.log("Tries to scroll upwards");
		  found       = loopToFindAVisible(model.headline(0), false);
		  if (found !== undefined) {
			console.log("Success UP!");
			that._lastFoundHeadlineInViewport = found;
			return model.headline(found);
		  }
		}
	  }
	  
	}
	
	// TEMP TEST:
	found             = loopToFindAVisible(model.headline(0), true);
	if (found !== undefined) {
	  that._lastFoundHeadlineInViewport = found;
	  return model.headline(found);
	}
	return undefined;

	console.log("---- Top document:" + docViewTop + ", bot: " + docViewBot);
	// The idea is that we know the 1st levels are visible. Go over
	// and check if anyone is visible (or the one closest to the open
	// window).
	// TL;DR: Go over all Level 1 headlines, find closest to docViewTop:
	var preIx, preScroll;
	var postScroll, last1st;
	var foundSpec	  = model.findHeadlinesFrom(
		0, 1, 1, function(headline) {
		  if (! headline.visible() || headline.level() !== 1)
			return false;		// no hit
		  last1st     = headline.index;
		  // Check offset to top in View
		  var hOff    = that._findViewPortOffsetForHeadline(headline);
		  console.log("--- Headline " + headline.title());
		  console.log("    Off:" + hOff + ", window: " + docViewTop);
		  if (docViewTop > hOff) {
			console.log("    (is before window.)");
			preIx     = last1st;
			preScroll = hOff;
			return false;
		  }
		  if (docViewBot > hOff) {
			// This is more or less on the page! postScroll won't be set
			return true;
		  }
		  if (docViewTop > hOff) {
			postScroll= hOff;
			return true;
		  }
		  console.log("SHOULDN'T HAPPEN??");
		  return false;			// Shouldn't happen?
		}
	);

	// Found a visible?
	if (foundSpec[1] === undefined) {
	  that._lastFoundHeadlineInViewport = foundSpec[0];
	  return model.headline(foundSpec[0]);
	}

	console.log("///////////// PreIx "+preIx+", Scroll "+preScroll+" Result:");
	console.log(foundSpec);
	var headlineIx;

	// This means that the top 1st level is visible (scrolled to the
	// top) or that the document doesn't start with a level 1?
	if (preIx === undefined) {
	  foundHline      = model.headline(0);
	  if (foundHline.visible()) {
		var off       = that._findViewPortOffsetForHeadline(foundHline);
		if (docViewTop > off) {
		  preIx       = 0;
		  preScroll   = off;
		}
	  }
	}
	if (preIx === undefined && docViewTop < 300) {
	  // I assume it is scrolled to top?
	  // Just ignore this weird document for now.
	  headlineIx      = loopToFindAVisible(model.headline(0), true);
	  if (headlineIx === undefined)
		return undefined;
	  that._lastFoundHeadlineInViewport = headlineIx;
	  return model.headline(headlineIx);
	}

	// - - - 


	// If no preIx, we are at ~ top. Check this.
	// Otherwise, loop down from preIx (or up from first find, if
	// any, depending on postScroll).

	// So we can find the top visible Headline from that.

	// XXXXX The important thing here is to cache stuff, to minimize
	// checking.  Cache all 1st level offsets. Then find the real one
	// and compare with the DOM. They change easily, when opens/closes
	// etc. But With C-U M-V, it will be a big win.


  };


  this.selectPageUp = function(headline) {
	// XXXX
	
  };

  // ------------------------------------------------------------
  // Lower level scroll handling based on jQuery/DOM elements:

  this._isScrolledIntoView = function(jQelem) {
	var docViewTop  = $(window).scrollTop() + 70; // (Constant for Bootstrap)
	var docViewBot = docViewTop + $(window).height();

	var elemTop = jQelem.offset().top;
	var elemBottom = elemTop + jQelem.height();

	return ((elemBottom >= docViewTop) && (elemTop <= docViewBot)
			&& (elemBottom <= docViewBot) &&  (elemTop >= docViewTop) );
  };


  // This assumes the row has editing on:
  this._scrollIntoViewAtBottom = function(jQelem, elementMargin) {
	var docViewTop    = _findWindowScroll();
	var docViewBot    = _findWindowScrollBottom();
	// var docViewTop    = $(window).scrollTop() + 70; // (Bootstrap Constant)
	var docViewHeight = $(window).height();
	var margin        = elementMargin === undefined ?
	  Math.floor( docViewHeight/15 ) : elementMargin;
	var docViewBot    = docViewTop + docViewHeight;
	var elemTop       = jQelem.offset().top;
	var elemHeight    = jQelem.find(".title-text").height();

	var nextOffsetBot = elemTop + elemHeight + margin;
	var nextOffsetTop = nextOffsetBot - docViewHeight;
	console.log("elemTop " + elemTop + ", margin " + margin);
	console.log("but Offset "+nextOffsetBot + ", topOffset:" + nextOffsetTop);

	$(window).scrollTop( nextOffsetTop < 0 ? 0 : nextOffsetTop );
  };


  this._scrollIntoView = function(jQelem, elementMargin) {
	// If an element is above the browser's viewport, it is scrolled
	// so it is at the top. If it is below, it is scrolled to be at
	// the bottom.

	if (this._isScrolledIntoView(jQelem))
	  return;

	var docViewTop    = _findWindowScroll();
	var docViewBot    = _findWindowScrollBottom();
	var docViewHeight =  $(window).height();
	var margin        = elementMargin === undefined ? 0 : elementMargin;
	var elemTop       = jQelem.offset().top;
	// (Sigh, that DOM element itself has height 0, at least in FF. :-( )
	var elemHeight    = jQelem.find(".title-text").height();

	// console.log("------- DO WORK OF _scrollIntoView:");
	// console.log("View off " + docViewTop + ", height "
	// 			+ docViewHeight);
	// console.log("Element top:" + elemTop + ", height:" + elemHeight );


	// Is element above? Show it, with a little margin
	if (elemTop < docViewTop) {
	  if (elemTop < margin)
		elemTop       = 0;
	  else
		elemTop      -= margin;
	  console.log("Scrolling from " + docViewTop + " to " + elemTop);
	  $(window).scrollTop( elemTop );
	  return;
	}

	// Put bottom so bottom edge of element + margin is visible
	var viewNewBottom = elemTop + margin + elemHeight;
	var viewNewTop    = viewNewBottom - docViewHeight;
	console.log("Scrolling up " + docViewTop + " to " + viewNewTop);
	$(window).scrollTop( viewNewTop < 0 ? 0 : viewNewTop );
  };

};
