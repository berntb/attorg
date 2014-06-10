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


// Main View object:

var OrgView = function(document_div_id, divid_headlines) {
  var that = this;

  this.document_div_id = document_div_id;
  this.divid_headlines = divid_headlines;

  

  this.documentName = function() {
    if (arguments.length > 0) {
      $("#filename").html(this.escapeHtml(arguments[0]));
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

  this.render_headline = function(headline) {
    var div  = $( '#' + this.make_headline_id(headline) );

    if (div === undefined)
      return;

    var all_todo_done_states = headline.owner.all_todo_done_states();
    div.replaceWith( this.make_headline( headline,
                                         all_todo_done_states,
                                         true)
                   );
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

  // XXXX Add presentation headline, with text/block. Should make
  // links, overstrike, etc, etc, etc!

  // Handles commands to edit Level, TODO, insert new Headline and
  // to enter Editing mode for a Headline. In the future, tags,
  // etc. (Modal editing in Emacs... :-( :-) )
  this.dontShowBlockRegexp = /^\s*$/;


  this.make_headline = function( headline, all_todo_done_states,
                                 internal_html_only) {
    // XXXX Should be replaced with a template fun.
    var title_value   = headline.title();
    var text_block    = headline.block();
    var todo_state    = headline.todo();
    var level         = headline.level();
    var visible_at_all= headline.visible();
    var visible_kids  = headline.visible_children();
    var open_status   = (visible_kids.no_kids || visible_kids.all) ?
      true : false;

    if (all_todo_done_states === undefined)
      all_todo_done_states = headline.owner.all_todo_done_states();
    var main_div_id   = this.make_headline_id( headline );
    var id_str_hline  = headline.id_str(); // Unique string for this Headline
    var level_id      = 'l_'  + id_str_hline;
    var todo_id       = 'do_' + id_str_hline;

    // Level dependent stuff:
    if (level < 1)  level =  1;
    if (level > 10) level = 10;
    var css_div_class = "hl" + level;
    // To override Bootstrap class
    var style_kludge  = 'style="color: ' + level_colors[level] + '" ';

    // - - - Make it all:
    var top_div_style = visible_at_all ? '' : ' style="display: none;" ';

    var b             = function(className) {
      return '<a class="btn btn-mini ' + className + '">';
    };
    var bend          = '</a>';
    var buttons       = '<div class="btn-group span1">'    +
      this._make_open_close_button(visible_kids) + 
      b('edit-header pull-right') + '<i class="icon-edit edit-header"></i>' +
      bend +
      "<br/>\n" +
      b('add-header pull-right')  + '<i class="icon-plus add-header"></i>'  +
      bend +
      '</div>';

    var select_html   = this.make_level_select(level, level_id);
    var todo_html     = this.make_todo_select(todo_state, todo_id,
                                              all_todo_done_states);

    // (controls[-row], well are Bootstrap stuff)
    var well          = (level === 1) ? ' well well-small ' : '';
    var row_start     = internal_html_only ? '' :
      '<div class="row "' + top_div_style + '>';
    row_start        += '<div class="controls controls-row span12 ' + well +
      css_div_class + '" id="' + main_div_id + '">' + "\n";
    var row_end       = internal_html_only ? "" :
      "<div class=\"row headline-edit\"></div></div>\n";

    // Set up text for Headline/Block.
    var text_part     = '<span class="span8 title-text" ' +
      style_kludge + ">" +
      headline.title_html();
    //this.escapeHtml(title_value);
    var block_part    = '';
    if (text_block !== undefined &&
        ! this.dontShowBlockRegexp.test(text_block)) {
      text_part      += "<pre>\n" +
        headline.block_html() +
        "</pre>\n";
    }
    text_part        += "</span>\n";

    return row_start +
      buttons +
      '<div class="span2 controls-row">' +
      select_html +  todo_html + '</div>' +
      text_part +
      "</div>\n" +
      row_end;
  };



  // ------------------------------------------------------------
  // Edit Headline:

  // XXXX Huh?? How is the logic here?? make_edit_headline() is only
  // used by this render_new_edit_headline()? Read.
  this.render_new_edit_headline = function(ix, headline) {
    // Adds a new Headline and renders it as editable.
    var rendered_html = this.make_edit_headline( headline );

    var div_id  = this.make_headline_id( headline );
    var div  = $("#" + div_id).parent().children(':last');
    if (! div.is(":visible"))
      return;

    // XXXX If the block text for a Headline is "too" long, hide the
    // block by default??? (And have small button to show it all.)

    div.html( rendered_html );
  };


  this.make_edit_headline = function( headline, all_todo_done_states) {
    // XXXX This should be replaced with a template fun.
    var title_value   = headline.title();
    var text_block    = headline.block() || '';
    var level         = headline.level();

    if (all_todo_done_states === undefined)
      all_todo_done_states = headline.owner.all_todo_done_states();
    var main_div_id   = this.make_headline_id( headline );
    var edit_div_id   = this.make_headline_edit_id( headline );
    var title_id      = this.makeEditTitleId(headline);
    var block_id      = this.makeEditBlockId(headline);

    // Level dependent stuff:
    if (level < 1)  level =  1;
    if (level > 10) level = 10;
    var div_edit_class= "ed" + level;
    var css_div_class = "hl" + level;
    var css_text_class= "inp" + level;
    // Override Bootstrap class for color in editing, too??
    // var style_kludge  = 'style="color: ' + level_colors[level] + '" ';

    // - - - Make buttons:
    var buttons    = '<div class="span3">' +
      '<div class="row btn-toolbar span3">'    +
      '<div class="btn-group">'    +
      '<button class="btn btn-small btn-primary save-cmd">Save</button>' +
      '<button class="btn btn-small update-cmd">Update</button>'  +
      '</div>' +
      '<div class="btn-group">'    +
      '<button class="btn btn-small cancel-cmd">Cancel</button>'  +
      '</div>' +
      '</div>' + "\n" +       // /btn-toolbar
      '<div class="row btn-group span3">'    +
      // Make 'More' button a dropdown menu? (See "Components -- Bootstrap")
      // '<button class="btn more-cmd">More</button>'  +
      this.make_more_edit_menu() + '&nbsp;' + 
      // '<br/>' +
      //'<a class="btn delete-header"><i class="icon-trash"> Delete</i>' +
      '</a>' +
      '</div>' +
      "</div>\n";

    // (Bootstrap layout with controls[-row]. 'well well-small'??)
    var row_start     = '<div class="controls controls-row  '+
      css_div_class + '" id="' + main_div_id + '">' + "\n";
    var row_end       = "</div>\n";

    var block_part    = '<textarea class="span9 block_edit" ' +
      'rows="5" cols="73" id="' + block_id + '" >' +
      this.escapeHtml(text_block) +
      "</textarea>\n";

    // XXXX Add some way of hiding the block of a Headline, if it is
    // really long.
    return '<div class="controls controls-row" ' +
      'id="' + edit_div_id + '">' + "\n" +
      buttons +
      '<div class="span9">' + "\n" +
      '<input type="text" class="span9 title_edit" ' +
      'id="' + title_id + '" value="' + title_value.replace(/"/g, '&quot;') +
      '" ' + /* style_kludge  + */ '/>' + "<br/>\n" +
      block_part +
      "</div>\n" +
      "</div>\n";
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
    var div  = $( '#' + this.make_headline_id(headline) ).parent();
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
      //return '<button type="button" class="btn btn-mini open-subtree" ' +
      //  ' disabled>-</button>';
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

  // From mustache.js, see:
  // stackoverflow.com/questions/24816/escaping-html-strings-with-jquery
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  this.escapeHtml =  function(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  // - - - - - Make Level-select HTML:
  var _level_generated = [];

  function make_level_select_help(level, level_id) {
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
      _level_generated[level] = make_level_select_help(level)
      + "</select>\n";

    return '<select name="level-select" class="span1 lvl_select" ' +
      'id="' + level_id + '">' + _level_generated[level];
  };

  // - - - Make TODO-select HTML:
  var _todo_generated = [];

  function make_todo_select_help(present_state, all_todo_done_states) {
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
      _todo_generated[present_state]
      = make_todo_select_help(present_state, all_todo_done_states)
      + "</select>\n";

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
