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

// Some M-/C-/etc escapes are supported, but the idea is to support
// most changes from a mouse.

// ----------------------------------------------------------------------

// Global variable for model data, replace with some VMC-variant.
var stored_model     = {};
var org_controllers  = {};

// Old jQuery style for: $(document).ready(function() { ... } );
$(function() {

  // This function should be sent into all created Models, to
  // guarantee that IDs are unique.
  var _internal_ix_counter = 0;   // How to do this better in js??

  function _generate_id_string() {
    return "aoid_" + _internal_ix_counter++; // Attorg ID
  }
  
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

    org_controllers[divid_headlines] = new OrgController(
      model,
      document_div_id,
      divid_headlines
    );
    org_controllers[divid_headlines].init();
  };

  var text, data, model;
  var document_div_id = "org_edit_document_parameters";
  var divid_headlines = "org_edit";
  var fileName = $("#file-to-start").val();

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
      //$("#" + divid_headlines).html(JSON.stringify(data));
      //return;
      _init(fileName, data, document_div_id, divid_headlines);
    });
  }

});



// ----------------------------------------------------------------------
// Model code:

var OrgModel = function() {

  // var _internal_ix_counter = 0;   // How to do this better in js??


  return function(documentName, org_data,
                  visible_update_callback, increment_function) {
    var that = this;

    this.documentNameValue = documentName;

    var arr = [].concat(org_data); // (Shallow copy)
    if (arr.length && arr[0].document) {
      // alert("foo");
      this.document_info = arr.shift();
    } else {
      this.document_info = {};
    }

    this.all_data = arr;
    this.length   = arr.length;

    // This function must generate unique ID strings:
    this.generate_id_string = increment_function;

    // This will be called for every headline set to hidden/shown.
    this.callback_fun_visible = visible_update_callback;

    // (N B: Make helper fun instead of duplicated accessor code :-( .)

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

    function escapeHtml(string) {
      return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
      });
    }


    // - - - - -
    // Document data:
    this.todo_states = function() {
      var info = this.document_info;
      if (arguments.length > 0) {
        var arr = arguments[0];
        if (! $.isArray(arr) ) {
          console.log("Error! Can't set todo_states to type " + typeof(arr));
          return;
        }
        info.todo_states = arr;
      }
      return info.todo_states;
    };

    this.done_states = function() {
      var info = this.document_info;
      if (arguments.length > 0) {
        var arr = arguments[0];
        if (! $.isArray(arr) ) {
          console.log("Error! Can't set done_states to type " + typeof(arr));
          return;
        }
        info.done_states = arr;
      }
      return info.done_states;
    };

    this.all_todo_done_states = function() {
      return [].concat(this.todo_states()).concat(this.done_states());
    };

    this.priorities = function() {
      var info = this.document_info;
      if (arguments.length > 0) {
        var arr = arguments[0];
        if (! $.isArray(arr) ) {
          console.log("Error! Can't set priorities to type " + typeof(arr));
          return;
        }
        info.priorities = arr;
      }
      return info.priorities;
    };

    this.drawer_names = function() {
      var info = this.document_info;
      if (arguments.length > 0) {
        var arr = arguments[0];
        if (! $.isArray(arr) ) {
          console.log("Error! Can't set Drawer names to type " + typeof(arr));
          return;
        }
        info.drawer_names = arr;
      }
      return info.drawer_names;
    };

    // - - - - -
    // Modification of model content:
    this.documentName = function() {
      if (arguments.length > 0)
        this.documentNameValue = arguments[0];
      return this.documentNameValue;
    }

    this.modified_flag = false;

    this.modified = function() {
      if (arguments.length > 0)
        this.modified_flag = arguments[0] ? true : false;
      return this.modified_flag;
    }

    this.dirty = function(ix, field) {
      // XXXX More flags for which Headline (field?) is modified??
      this.modified_flag = true;
    };


    this.delete_headline = function(ix) {
      // Doesn't update the index of existing Headline objects, seems
      // too expensive for client side. (I _know_ this will bite me
      // sometime. :-( )
      this._delete_id_str( this.all_data[ix].idstr, ix);
      this.all_data.splice(ix, 1);
      this.length--;
    };


    // Add a new Headline:
    this.new_headline = function(ix, spec) {
      // XXXX This doesn't create _subs, need call to server for that.
      // Add later.
      var headline_data = {
        level: (spec.level ? spec.level : 1),
        todo_state: (spec.todo ? spec.todo : ''),
        title_text: (spec.title_text ? spec.title_text : ''),
        block: (spec.block ? spec.block : ''),
        tags: (spec.tags ? spec.tags : ''),
      };

      this.all_data.splice(ix, 0, headline_data);
      var headline_obj = this.headline(ix);
      if (headline_obj.headline !== headline_data)
        throw new Error("Internal err, failed creating and adding a Headline");

      this.length++;
      return headline_obj;
    }

    this.moveHeadline = function(ix_from, ix_to, dont_refresh_ids) {
      // N B -- this doesn't do anything with existing objects. Keep
      // it light, it is JavaScript running on a (possibly mobile)
      // client.
      if (ix_from !== ix_to) {
        var headline_data   = this.all_data[ix_from];
        this.all_data.splice(ix_from, 1);
        this.all_data.splice(ix_to, 0, headline_data);
      }

      if (! dont_refresh_ids)
        this.refresh_id_strings();
    };

    // - - - - -
    this.headline = function(ix) {
      if (ix < 0 || ix >= this.all_data.length)
        // XXXX How should I do code logic errors in client side Javascript?
        // Logging with Ajax call!?
        throw new Error("Bad Headline ix:" + ix);

      var headline_data = this.all_data[ix];
      var headline =  new Headline(headline_data);

      // Set up some init stuff (should be in Model init, not here).
      this.get_id_string(ix, headline); // Sets value if not there already
      if (headline_data.visible === undefined)
        headline_data.visible = true;

      // This index is not updated after deleting/inserting Headlines:
      headline.index = ix;

      return headline;
    };


    // - - - - -
    // Handle unique string ids to Headline index:

    // (We need a unique string and just not indexing, since headlines
    // might be deleted, added and moved -- so ordering is transient.)

    // Creation of the strings are injected from the outside, since
    // DOM IDs are made from them (so they are guaranteed to be
    // unique).

    this.idstr_to_ix = {};

    this.get_id_string = function(ix, headline) {
      if (headline === undefined)
        headline = this.headline(ix);
      if (headline.id_str()) {
        // Just make certain the ix/id_str connection is updated..
        if (this.idstr_to_ix[idstr] !== ix)
          this.refresh_id_strings();
        return headline.id_str();
      }
      var idstr = this.generate_id_string();
      this.idstr_to_ix[idstr] = ix;
      headline.id_str(idstr);
      return idstr;
    };

    this._delete_id_str = function(id_string, ix) {
      delete this.idstr_to_ix[id_string];
      for (var id_str in this.idstr_to_ix) {
        if (this.idstr_to_ix[id_str] >= ix)
          this.idstr_to_ix[id_str]--;
      }
    }

    this.get_ix_from_id_string = function(id_string) {
      if (this.idstr_to_ix[id_string] === undefined)
        return undefined;

      var ix = this.idstr_to_ix[id_string];
      var headline = this.headline(ix);
      if (headline !== undefined && headline.id_str() === id_string)
        return ix;

      // Add flag for if this can help (i.e. has anything been
      // deleted, moved etc?)
      this.refresh_id_strings();
      if (this.idstr_to_ix[id_string] === undefined)
        throw new Error("No Headline for id-string:" + id_string);
      return this.idstr_to_ix[id_string];
    };

    // Note, this knows about implementation of headline structure:
    this.refresh_id_strings = function() {
      this.idstr_to_ix = {};
      for(var i = 0; i < this.length; i++) {
        var headline_data = this.all_data[i];
        var idstr    = headline_data.idstr;
        if (idstr)
          this.idstr_to_ix[idstr] = i;
      }
    };

    // ------------------------------------------------------------
    // Headline object (still part of Model):

    // Help funs for Headline (XXXX Move last)
    var Headline = function(headline) {
      this.headline = headline; // Contain the data structure
      this.owner    = that;
    };

    var encodeOrgText = {
      U: ['<u>', '</u>'],
      B: ['<b>', '</b>'],
      I: ['<i>', '</i>'],
      C: ['<code>', '</code>'],
      S: ['<span style="text-decoration: line-through;">', '</span>'],
    };

    function _encode_org_subtext(textSubs, isBlock) {
      // Encodes headline/block for showing.

      // XXXX isBlock decides if block specific stuff should be done
      // (DEADLINE, lists, spreadsheets, PROPERTIES, ???) Implement!
      // (But first, think out a GUI for editing PROPERTIES etc. :-) )

      var collected = '';
      for(i in textSubs) {
        var item    = textSubs[i];
        var type    = item[0];
        var value   = item[1];
        var parts, tmp, txt;
        if (type  === "Org::Element::Text") {
          if (item.length > 2 && item[2] !== "") {
            value = escapeHtml( value.slice(1,-1) );
            if (item[2] in encodeOrgText) {
              value = encodeOrgText[item[2]][0] + value +
                encodeOrgText[item[2]][1];
            }
          } else {
            value   = escapeHtml( value );
          }
        } else if (type  === "Org::Element::Link") {
          parts = /^\s*\[\[([^\[]*)\]\[(.*)\]\]\s*$/.exec(value);
          if (parts !== null && typeof(parts) == 'object' && parts.length) {
            try {
              txt     = escapeHtml(parts[2]);
              console.log(parts[1]);
              tmp     = '<a href="' + parts[1] + '">' + txt + '</a>';
              value   = tmp;
            } catch(duh) { value = "ERROR WITH LINK:" + value};
          } else {
            parts = /^\s*\[\[([^\[]*)\]\s*\]\s*$/.exec(value);
            if (parts !== null && typeof(parts) == 'object' && parts.length){
              try {
                txt   = escapeHtml(parts[1]);
                tmp   = '<a href="' + parts[1] + '">' + txt + '</a>';
                value = tmp;
              } catch(duh) { value = "ERROR WITH LINK:" + value};
            }
          }
        }
        // XXXX Add dates here!!
        collected  += value;
      }

      return collected;
    };



    // ------------------------------------------------------------
    Headline.prototype = {

      title: function() {
        // XXXXX Need to send line for evaluation to server, in case
        // it contains link or other logic
        if (arguments.length > 0)
          // Note -- this doesn't reset title_subs etc!
          this.headline.title_text = arguments[0];
        return this.headline.title_text;
      },
      title_html: function() {
        // Returns a html version of a title
        if (! this.headline.title_subs)
          return escapeHtml( this.title() );

        // N B: No parsing of Headline/Block in local javascript, so
        // no way to update this. Must go to server to update this info.
        // XXXX Add a 'dirty' flag, when can't reach the server.

        return _encode_org_subtext( this.headline.title_subs, false );
      },

      id_str: function() {
        // Internal use
        // Unique string ID that is set in html and can be used to
        // find the right Headline again.
        if (arguments.length > 0)
          this.headline.idstr = arguments[0];
        return this.headline.idstr;
      },

      block: function() {
        if (arguments.length > 0)
          // Note -- this doesn't handle block_subs!
          this.headline.block = arguments[0];
        return this.headline.block;
      },
      block_html: function() {
        if (! this.headline.block_parts)
          return escapeHtml( this.block() );

        // N B: No parsing of Headline/Block in local javascript, so
        // no way to update this. Must go to server to update this info.
        // XXXX Add a 'dirty' flag, when can't reach the server.

        return _encode_org_subtext( this.headline.block_parts, true );

      },
      todo: function() {
        if (arguments.length > 0)
          this.headline.todo_state = arguments[0];
        return this.headline.todo_state;
      },
      level: function() {
        if (arguments.length > 0) {
          // XXXX Check so numeric??
          this.headline.level = arguments[0];
        }
        return this.headline.level;
      },

      
      // ------------------------------------------------------------
      // Test if Headline match string/regexp:

      compareTitleRegexp: function(compareWith) {
        // In parameter must be a regexp. Returns true/false.

        // (Don't test for if regexp/string. This is probably part of
        // an inner loop and JS isn't exactly quick.)
        //if (compareWith instanceof RegExp)
        return compareWith.test(this.title());
      },
      compareBlockRegexp: function(compareWith) {
        return compareWith.test(this.block());
      },

            
      // ------------------------------------------------------------
      // Implement removing/inserting/moving:
      // (N B: .index is NOT updated after del/insert of Headline!!)

      delete: function() {
        this.owner.delete_headline(this.index);
      },

      // XXXXX Move the creation of a new Headline here.

      move: function(to_ix, dontRefresh) {
        this.owner.moveHeadline(this.index, to_ix, dontRefresh);
      },

      // Also, any Headline that are moved to the top must be set as
      // visible. (Not here, the Controller must do that and call the
      // View.)

      // ------------------------------------------------------------
      // This part implements (in)visible subsets of the headlines.

      // 2nd version of Visible implementation -- cache results for
      // speed. Half as readable, but less slow. :-(

      visible: function() {
        // XXXX Add so Level 1 is always visible??
        var present_value = this.headline.visible;
        if (arguments.length > 0) {
          var new_value = arguments[0];
          
          if (new_value !== present_value) {
            this.headline.visible = new_value ? true : false;
            if (that.callback_fun_visible !== undefined)
              that.callback_fun_visible(this, this.headline.visible,
                                        this.owner.noOpenCloseUpdates);
            return new_value;
          }
        }

        if (present_value === undefined) return true; // Default value
        return present_value;
      },

      change_children_visible: function(how_many_shown) {
        // how_many_shown === true  -- all children are set to visible.
        // how_many_shown === false -- all children are set to invisible.
        // how_many_shown === 1     -- only direct children are shown

        var ix = this.index;
        var level        = this.level();
        var topModel     = this.owner;
        var len          = topModel.length;

        var shown_kids   = false;

        topModel.noOpenCloseUpdates = true; // Flag for callback to model
        for(var i = ix+1; i < len; i++) {
          var kid        = topModel.headline(i);
          var kid_level  = kid.level();
          if (kid_level <= level)
            break;
          if (how_many_shown === true)
            kid.visible(true);
          else if (how_many_shown === false)
            kid.visible(false);
          else if (how_many_shown === 1) {
            if (kid_level === level+1) {
              kid.visible(true);
              shown_kids = true;
            } else
              kid.visible(false);
          } else
            throw new Error("Only true/false/1 as in parameter!");
        }

        // Kludge, there weren't any direct kids -- just show all:
        if (how_many_shown === 1 && !shown_kids && i > ix+2)
          return this.change_children_visible(true);

        topModel.noOpenCloseUpdates = false;
        return this.updateVisibleInHierarchy();
      },

      // (Had speed problemsl Then have a simple routine that
      // updates(/forces re-evaluation of) the cache for a Headline.
      visible_children: function() {
        // Returns:
        // 'no_kids'           -- no kids at all.
        // 'no_visible'        -- no visible children.
        // 'direct_kids'       -- only direct children are visible.
        // 'all_visible'       -- all children visible.
        // 'some'              -- some visible children, some hidden.

        if (!this.headline.has_kids)
          return 'no_kids';
        if (!this.headline.hidden_kids)
          return 'all_visible';
        if (this.just1st_kids)
          return 'direct_kids';
        if (!this.headline.visible_kids)
          return 'no_visible';
        return 'some';          // Some kids are visible.
      },

      has_invisible_child: function() {
        return this.headline.hidden_kids;
      },

      has_visible_child: function() {
        return this.headline.visible_kids;
      },

      // ------------------------------------------------------------

      findTopOwner: function() {
        // Finds "topmost" Headline for a Headline
        var ix    = this.index;
        var level = this.level();
        var topModel  = this.owner;

        if (level == 1)
          return ix;
        for(var i = ix-1; i >= 0; i--) {
          var prev_level = topModel.all_data[i].level;
          if (prev_level == 1)
            return i;
          if (prev_level < level) {
            level = prev_level;
            ix    = i;
          }
        }
        return ix;              // No level 1?? This was the lowest we found
      },

      findDirectOwner: function() {
        // Finds Direct owner of Headline.
        // If sends in Level 1 or the topmost Headline, returns itself
        var ix          = this.index;
        var level       = this.level();
        if (ix === 0 || level === 1) return this;

        var topModel    = this.owner;

        for(var i = ix-1; i >= 0; i--) {
          // (Doesn't need to create object etc to get level like this.)
          var prev_level= topModel.all_data[i].level;
          if (prev_level < level)
            return i;
        }
        return ix;              // No level 1?? This was the lowest we found
      },

      findSubTree: function() {
        // Finds all first/last of subtree beneath the Headline.
        // Includes the Headline itself.
        // Returns: [first, last], not inclusive for last (for-loop style).
        var ix          = this.index;
        var level       = this.level();
        var topModel    = this.owner;

        for(var i = ix+1; i < topModel.length; i++) {
          var nxt_level = topModel.all_data[i].level;
          if (nxt_level <= level)   return [ix, i];
        }
        return [ix, topModel.length];
      },

      findPrevSubTree: function() {
        // Find the subtree before this (if any).
        // If found, returns [first, last], not inclusive. Otherwise undefined.
        var ix       = this.index;
        if (ix === 0) return undefined; // Duh
        var level    = this.level();
        var topModel = this.owner;

        for(var i = ix-1; i >= 0; i--) {
          var prevH  = topModel.headline(i);
          if (prevH.level() < level)    return undefined;
          if (prevH.level() === level)  return [i,ix];
        }
        return [0,ix];          // ???
      },

      findNextSubTree: function() {
        // If found, returns [first, last], not inclusive. Otherwise undefined.
        var ix       = this.index;
        var level    = this.level();
        var topModel = this.owner;

        if (ix === topModel.length-1) return undefined;

        var mySubTree= this.findSubTree();
        if (mySubTree === undefined) return undefined;
        var lastTree = mySubTree[1];

        // Is my subtree the last one?
        if (lastTree >= topModel.length) return undefined;

        return topModel.headline(lastTree).findSubTree();
      },

      // ------------------------------------------------------------

      updateVisibleInHierarchy: function() {
        // Find visible/hidden for a Headline set. Call this
        // after changing the hierarchy and/or visible status of
        // Headlines.

        // Returns: [first_updated, last_updated].

        var ix    = this.index;
        var level = this.level();
        var lvl;                // Loop var later

        // We want to know we're at top level of the local level hierarchy:
        if (level !== 1 && ix > 0) {
          ix      = this.findTopOwner();
          if (ix !== this.index)
            level = this.owner.headline(ix).level();
        }

        // Help routine that sets up flags in Headline record for if
        // it has visible/hidden kids and if it has only 1st level
        // kids visible.
        var setup_record = function(headline, visible, hidden, just1st) {
          headline.has_kids     = (visible !== false || hidden !== false);
          headline.visible_kids = visible;
          headline.hidden_kids  = hidden;
          headline.just1st_kids = just1st;
        };

        var level_specs    = [];
        // In array, order of is: vis,  hidden, just_1st_level_visible
        var start_level    = level;
        for(var i = ix; i < this.owner.length; i++) {
          var kid_record   = this.owner.all_data[i];
          var kid_level    = kid_record.level;
          var kid_visible  = kid_record.visible;
          if (kid_level <= start_level && i > ix)
            break;
          // Set up flags for if previous has visible/invisible in
          // them and also set to false if not a level has all hidden
          // except direct children.
          var kid_index    = kid_visible ? 1 : 2;
          for(lvl = start_level; lvl < kid_level; lvl++) {
            if (level_specs[lvl] !== undefined) {
              level_specs[lvl][kid_index] = true; // visible or hidden
              if ( kid_visible && lvl !== kid_level-1)
                level_specs[lvl][3] = false;
              if (!kid_visible && lvl === kid_level-1)
                level_specs[lvl][3] = false;
            }
          }
          for(lvl = kid_level; lvl < 10; lvl++) { // Hardcoded constant :-(
            // Move data to Headline spec:
            if (level_specs[lvl] === undefined)
              continue;
            var prev_ix    = level_specs[lvl][0];
            setup_record(this.owner.all_data[prev_ix],
                         level_specs[lvl][1], level_specs[lvl][2],
                         level_specs[lvl][3]
                        );
          }
          level_specs[kid_level] = [i, false, false, true];
        }

        // Set up remaining specifications:
        for(lvl = start_level; lvl < 10; lvl++) {
          if (level_specs[lvl] !== undefined) {
            var prev_ix    = level_specs[lvl][0];
            setup_record(this.owner.all_data[prev_ix],
                         level_specs[lvl][1], level_specs[lvl][2],
                         level_specs[lvl][3]
                        );
          }
        }

        return [ix, i-1];       // Note -- inclusive list of updated!
      },
      
      // End of Visibility/Hidden methods.
      // ------------------------------------------------------------


    };

    return this;
  };
}();


// ----------------------------------------------------------------------
// Controller:

// (Make another controller for editing content? A bit messy with all
// functionality rolled into one.)


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Help for mapping key codes to functions.

var OrgKeyFunMapper = function() {

  return function(controller) {
    var that = this;

    this.controller = controller;

    // Prefix command function, that eats and caches prefixes!
    // Supports C-C and ESC. A C-G should throw away prefixes.
    // Note, need a stack of two: C-C ESC . -- add date.

    // XXXXX Add support for C-X, <more> stuff... (M-X would just be a
    // normal cmd which opened a text field.)

    // XXXXX Select (or have a text field) with keys that should be
    // treated as prefixes for ESC and C-. Then e.g. iPad can use
    // meta/ctrl key sequences. (Can you add to keyboard on
    // iPad/Android in Safari/Chrome??)

    // - - - Handle prefix commands
    var savedPrefixes  = [];

    this.handlePrefix  = function(event, meta, control, keyCode) {
      // Returns false if it didn't "eat" the char.
      // This is assumed to be able to throw away non-used prefix codes.
      // C-G
      if (keyCode === 71 && control && savedPrefixes.length) {
        // Remove the C-G and any saved prefix
        savedPrefixes  = [];
        console.log("Ate C-G to throw away start of cmd");
        return true;
      }

      // ESC
      if (keyCode === 27) {
        if (savedPrefixes.length) {
          if (savedPrefixes[savedPrefixes.length-1] === 27)
            return true;       // Assume double ESC is a mistake
          if (savedPrefixes.length >= 2) {
            savedPrefixes = []; // Show err message somewhere??
            return true;        // Not supported, should have temp err msg??
          }
        }
        savedPrefixes.push('ESC');
        return true;
      }

      // C-C
      if (keyCode === 67 && control && !meta) {
        savedPrefixes = ['C-C']; // Nothing before/after this
        return true;
      }

      // XXXX Catch some extra chars and make them into an M- or C-
      // prefix? Then e.g. an iPad could use Emacs key sequences.

      return false;             // No change
    };

    // - - - Key translation part:

    // uc-names for keys (so the addKeyFun function can use named keys
    // as parameters.)
    var keyCodeList    = {
      37:  [37, 'LEFT'],
      38:  [38, 'UP'],
      39:  [39, 'RIGHT'],
      40:  [40, 'DOWN'],
      13:  [13, 'CR'],
      9:   [ 9, 'TAB'],
    };

    var keyCommandList = {};    // Key translations to functions

    // Notes:
    // Key code: [text_handler, block_handler] // block is optional
    // (If a handler is 'undefined', it won't be called)

    // Function to add function to key:
    this.addKeyFun = function(keyCodes, fun) {
      // If sends in one fun, it is for both text and block.
      // To not have a fun for text or block, send in undefined.
      var funs  = [fun];
      if (arguments.length > 2)
        funs.push( arguments[2] ); // block fun
      var keycodeArr = keyCodes.toUpperCase().split(/,\s*/);
      for(var i in keycodeArr) {
        var keyCode = keycodeArr[i];
        console.log("Adding '" + keyCode + "' (from " + keyCodes + ")" );
        keyCommandList[keyCode] = funs;
      }
    };
    this.keyFuns = function() { return keyCommandList; };

    this.findKeyCodeFun = function(event, which_off) {
      if (which_off === 'title' || which_off === undefined)
        which_off   = 0;
      else if (which_off === 'block')
        which_off   = 1;

      if (savedPrefixes.length &&
          savedPrefixes[savedPrefixes.length-1] === 'ESC') {
        savedPrefixes.pop();
        event.metaKey = true;
      }

      var keyCode   = event.which; // (From jQuery, browser compatibility)
      var metaDescr = (event.altKey || event.metaKey) ? 'M-' : '';
      var ctrlDescr = event.ctrlKey ? 'C-' : '';
      var shiftDescr= event.shiftKey ? 'S-' : false;
      var metaDescr = metaDescr + ctrlDescr;

      // For now, can only be C-C as other prefix
      if (savedPrefixes.length && savedPrefixes[0] === 'C-C') {
        if (savedPrefixes.length === 1) {
          // This is sensitive -- ONE SPACE:
          metaDescr = 'C-C ' + metaDescr;
        }
        savedPrefixes = [];
      }


      var keyNames  = keyCodeList[keyCode] || [keyCode,
                                               String.fromCharCode(keyCode)];
      
      console.log("keys:" + keyNames + ', meta:' + metaDescr);

      // First, for the named keys:
      function selectFun(funList) {
        var match = funList.length > 1 ? funList[which_off] : funList[0];
        return match;
      }

      var i, check, val, match;
      for(i = 0; i < keyNames.length; i++) {
        check       = metaDescr + keyNames[i];
        val         = undefined;
        if (shiftDescr && keyCommandList.hasOwnProperty(shiftDescr + check)) {
          check     = shiftDescr + check;
          val       = keyCommandList[check];
        } else if (keyCommandList.hasOwnProperty(check))
          val       = keyCommandList[check];

        if (val) {
          match     = selectFun(val);
          if (match) {
            console.log("Matched " + check);
            return match;
          } else
            console.log("Skipped match for " + check);
        }
      }
      // Is there "any modifier" specification ('X-')?
      for(i = 0; i < keyNames.length; i++) {
        check       = 'X-' + keyNames[i];
        if (keyCommandList.hasOwnProperty(check)) {
          console.log("Fallback: " + check);
          match     = selectFun(keyCommandList[check]);
          if (match) {
            console.log("Fallback matched:" + check);
            return match;
          } else
            console.log("Skipped match for Fallback:" + check);
        }
      }

      return undefined;
    };
  };
}();



var OrgController = function() {

  return function(model, document_div_id, divid_headlines ) {
    var that = this;

    this.document_div_id = document_div_id;
    this.divid_headlines = divid_headlines;
    this.divid_search    = divid_headlines + "_search";
    this.model = model;

    this.keyMapper = new OrgKeyFunMapper(this);

    // ------------------------------------------------------------
    // Set up callbacks for Model:

    // Just forward visible/hidden to View:
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

    this.keyMapper.addKeyFun(
      'X-CR',
      // XXXX M-CR should move the block to the new headline, C-CR
      // should not do so.
      function(event, ctrl, meta, keycode, headline, block_p) {
        console.log("In headline CR, before meta test");
        that.updateEditedHeadline(headline);
        that.view.close_edit_headline( headline );
        if (ctrl) {
          var ix     = headline.index;
          that._insertAndRenderHeading(ix+1, headline.level() );
          return true;
        }
        if (meta) {
          // XXXX Should this work like Emacs??
          // I.e., if the Headlines subtree is fully closed, M-CR
          // should open new Headline _after_ the tree. (Don't move
          // either the block or the text to the right of
          // the cursor to the new Headline).
          var ix     = headline.index;
          that._insertAndRenderHeading(ix+1, headline.level() );
          return true;
        }
        return true;
      },
      function(event, ctrl, meta, keycode, headline, block_p) {
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


    this.keyMapper.addKeyFun(
      'C-G',
      function(event, ctrl, meta, keycode, headline, block_p) {
        console.log("Skip editing.");
        that.view.close_edit_headline( headline );
        return true;
      }
    );


    this.keyMapper.addKeyFun(
      'X-TAB',
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        var hide_action  = that.updateTreeVisibility( headline );
        if (!event.shiftKey)
          return true;

        // Difference from Emacs -- just show all after present
        // position.  (Later -- find out how to do scrolling so
        // we can keep the present field under editing visible.)
        var ix           = headline.index;
        var i;
        var model        = headline.owner;
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


    this.keyMapper.addKeyFun(
      'C-C C-U',                // Move to level above
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        var ix           = headline.index;
        var model        = headline.owner;

        var ix           = headline.index;
        var model        = headline.owner;
        var level        = headline.level();

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


	// XXXX Add support for C-C C-N
    this.keyMapper.addKeyFun(
      'C-N, down, C-down',
      // Title:
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        that.view.setFocusBlock( headline );
        return true;
      },
      // Block:
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        // C-N in Block goes to next Visible Headline:
        var ix           = headline.index;
        var model        = headline.owner;

        if (keycode === 40 && !ctrl)
          return false;         // Don't use 'down' in Block

        for(var i = ix+1; i < model.length; i++) {
          if (model.headline(i).visible()) {
            that.saveAndGotoIndex(headline, i, false);
            break;
          }
        }
        return true;
      });


    this.keyMapper.addKeyFun(
      'C-80, up, C-up',      // 80 === C-P (To see that ASCII code works too)
      // Title:
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        var ix           = headline.index;
        var model        = headline.owner;

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
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        if (keycode === 38 && !ctrl)
          return false;         // Don't use 'up' in Block

        // Just go to Title:
        that.view.setFocusTitle( headline );
        return true;
      });


    this.keyMapper.addKeyFun(
      'M-left',
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        if (headline.level() === 1)   return true;          // No change

        if (event.shiftKey) {
          var tree = headline.findSubTree();
          that.levelChangeSubtree(tree[0], tree[1], -1);
        } else {
          that.levelChange(headline, headline.level()-1 );
        }
        return true;
      });                       // Just one fun, so both for Title and Block

    this.keyMapper.addKeyFun(
      'M-right',
      function(event, ctrl, meta, keycode,
               headline, block_p) {
        // If shift, moves the whole subtree.
        if (event.shiftKey) {
          var tree = headline.findSubTree();
          that.levelChangeSubtree(tree[0], tree[1], 1);
        } else {
          that.levelChange(headline, headline.level()+1 );
        }
        return true;
      });

    this.keyMapper.addKeyFun(
      'M-down',
      function(event, ctrl, meta, keycode,
               headline, block_p) {
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
      });

    this.keyMapper.addKeyFun(
      'M-up',
      function(event, ctrl, meta, keycode,
               headline, block_p) {
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
      });

    // ------------------------------------------------------------
    // Event handlers:

    this.bind_events = function() {
      var div  = $("#" + this.divid_headlines);
      // $('.title_input').change( // (Fails if multiple org modes in window!!)
      // div.find('.title_input').change(  // Less bad
      // div.on('change', 'input:text',    this.title_text_change_event);

      // XXXXX Remove Event handlers for buttons I had to remove for
      // visibility...

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

      if (that.keyMapper.handlePrefix(event, metaKey, ctrlKey, keyCode)) {
        // Like ESC as prefix for 'M-'
        event.preventDefault();
        return;
      }

      var handler  = that.keyMapper.findKeyCodeFun(event);
      if (handler &&
          handler(event, ctrlKey, metaKey, keyCode, headline, false))
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
      if (that.keyMapper.handlePrefix(event, metaKey, ctrlKey, keyCode)) {
        event.preventDefault();
        return;
      }

      var handler  = that.keyMapper.findKeyCodeFun(event, 'block');
      if (handler &&
          handler(event, ctrlKey, metaKey, keyCode, headline, true))
        event.preventDefault();

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
        that.model.dirty(i, 'todo');
        that.view.render_headline( headline );
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
      that.view.render_new_edit_headline(i, headline);

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
        that.view.render_new_edit_headline(i, headline);
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
      that.model.dirty(ix, 'level');
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

      // Make both are visible:
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
        that.view.render_new_edit_headline(i, nextHeadline);

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
      this.view.render_new_edit_headline(ix, headline);

      this.view.setSelectTitle( headline );
    }

    // Help method which updates a Headline from Edit fields:
    this.saveHeadlineFromModelID = function(model_str_id) {
      var i = that.model.get_ix_from_id_string( model_str_id );
      var headline = that.model.headline(i);

      return this.updateEditedHeadline(headline);
    };

    this.updateEditedHeadline = function(headline) {
      var model_str_id = headline.id_str();
      var title = $('#t_' + model_str_id);
      var block = $('#b_' + model_str_id);

      that.update_headline_title_block(headline, title.val(), block.val());
      return headline;
    };

    // Help method which updates a Headline with title/block values:
    this.update_headline_title_block = function(headline, title, block) {
      var modified = false;
      if (title !== undefined && title !== headline.title()) {
        headline.title( title );
        that.model.dirty(headline.index, 'title');
        modified = true;
        // XXXX Check with server for parsing subparts of Headline!!
      }
      if (block !== undefined && block !== headline.block() ) {
        headline.block( block );
        that.model.dirty(headline.index, 'block');
        that.view.render_headline( headline );
        modified = true;
        // XXXX Check with server for parsing subparts of Block!!
      }
      if (modified)
        that.view.render_headline( headline );
    };


    // ------------------------------------------------------------
    // Initialization:

    this.init = function() {

      this.view    = new OrgView(this.document_div_id, this.divid_headlines);

      var docName  = this.model.documentName();

      if (docName)
        this.view.documentName(docName);

      this.view.render_all(this.model);
      this.view.init_document_parameters(this.model);

      this.bind_events();
    };


    // End of Controller Object spec:
    return this;
  };
}();


// ----------------------------------------------------------------------
// Main View object:

var OrgView = function() {

  return function(document_div_id, divid_headlines) {
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

}();
