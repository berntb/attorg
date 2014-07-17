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

// XXXX Make Camel case -- or not. But plz decide, for f-cks sake!


// Model code:

var OrgModel = function(documentName, org_data,
						visible_update_callback, increment_function) {

  OrgModelSuper.apply(this, arguments);

  // XXXXX Move the specific logic for View/Controller/Model here??
  // Then write tests for it.

  // Need to call Controller/View for changes (e.g. opemed/closed
  // buttons.)
  // So needs better design!

};
OrgModel.prototype = OrgModelSuper;


// ----------------------------------------------------------------------
// Data structures and functionality for Org data:

// XXXX Store finished Headline objects, don't recreate them. It is a
// waste of time.

var OrgModelSuper = function(documentName, org_data,
							 visible_update_callback, increment_function) {

  var Headline = OrgHeadline;	// Shorter name

  this.documentNameValue = documentName;

  var arr = [].concat(org_data); // (Shallow copy)
  if (arr.length && arr[0].document) {
    this.document_info = arr.shift();
	// alert( JSON.stringify(arr[0], null, 2) );
  } else {
    this.document_info = {};
  }

  // The data is set up after all the methods are defined. (It is from
  // the net, so use std way of parsing out it.)
  this.length   = 0;
  this.all_data = [];
  // this.all_data = arr;
  // this.length   = arr.length;

  // This function must generate unique ID strings:
  this.generate_id_string = increment_function;

  // This will be called for every headline set to hidden/shown.
  this.callback_fun_visible = visible_update_callback;


  this.modified_flag = false;

  // (N B: Make helper fun instead of duplicated accessor code :-( .)

  // - - - - -
  // Attribute administratrivia:
  function doc_arr_attribute(pretty_name, attribute_name) {
	return function() {
	  var info = this.document_info;
	  if (arguments.length > 0) {
		var arr = arguments[0];
		if (! $.isArray(arr) ) {
          console.log("Error! Can't set " + pretty_name +
					  " to type " + typeof(arr));
		  // Should do something more extreme here??
          return;
		}
		info[attribute_name] = arr;
      }
      return info[attribute_name]; // .todo_states;
	};  
  };


  // - - - - -
  // Document data:

  this.todo_states  = doc_arr_attribute("TODO",        "todo_states");
  this.done_states  = doc_arr_attribute("DONE states", "done_states");
  this.priorities   = doc_arr_attribute("priorities",  "priorities");
  this.drawer_names = doc_arr_attribute("Drawer names","drawer_names");

  this.all_todo_done_states = function() {
    return [].concat(this.todo_states()).concat(this.done_states());
  };

  // - - - - -
  // Modification of model content:
  this.documentName = function() {
    if (arguments.length > 0)
      this.documentNameValue = arguments[0];
    return this.documentNameValue;
  }

  this.modified = function() {
    if (arguments.length > 0)
      this.modified_flag = arguments[0] ? true : false;
	// if (arguments.length > 0)
	//   alert("Turned modified_flag to " + arguments[0]);
    return this.modified_flag;
  }

  this.dirty = function(ix, field) {
    this.modified_flag = true;
  };



  // - - - - -
  // Headline functionality:
  // XXXX Either CamelCase or not! :-(
  this.delete_headline = function(ix) {
    // Doesn't update the index of existing Headline objects, seems
    // too expensive for client side. (This might bite me later. :-( )
    this._delete_id_str( this.all_data[ix].idstr, ix);
    this.all_data.splice(ix, 1);
    this.length--;
  };


  // - - - Add a new Headline:

  // (Help routine to create local Headline data structure from [net]
  //  external data source.)
  function _make_headline_from_data_structure(spec) {
	// XXXX Need to handle sub parts of title/block.
	return headline_data = {
      level: (spec.level ? spec.level : 1),
      todo_state: (spec.todo_state ? spec.todo_state : ''),
      title_text: (spec.title_text ? spec.title_text : ''),
      block: (spec.block ? spec.block : ''),
      tags: (spec.tags ? spec.tags : ''),
	  priority: (spec.priority ? spec.priority : ''),
	  title_subs: spec.title_subs,
	  block_parts: spec.block_parts, // Should have same name as title part
	  block_indent: spec.block_indent ? spec.block_indent : 0,
    };
  }

  this.new_headline = function(ix, spec) {
    // (AJAX call to server to get _subs.)
    var headline_data = _make_headline_from_data_structure(spec);

	// If I don't do this dance with checking length before/after, I
	// get errors on FF _and_ Chrome?! WTF is this pathetic shit?!
	var length_before_insertion = this.all_data.length;
    this.all_data.splice(ix, 0, headline_data);
	this.get_id_string(ix); // Sets an ID string
	if (length_before_insertion+1 != this.all_data.length)
	  throw new Error("splice(" + ix + ", 0, data) failed! Was "
					  + length_before_insertion + ", now "
					  + this.all_data.length);
    this.length++;
	// console.log("Spliced into, now there are " + this.all_data.length);
    var headline_obj = this.headline(ix);
    if (headline_obj.headline !== headline_data)
      throw new Error("Internal err, failed creating and adding a Headline");

    return headline_obj;
  }


  // - - -
  this.moveHeadline = function(ix_from, ix_to, dont_refresh_ids) {
    // N B -- this doesn't do anything with existing objects. Keep
    // it light, it is JavaScript running on a (possibly mobile)
    // client.
    if (ix_from !== ix_to) {
      var headline_data   = this.all_data[ix_from];
      this.all_data.splice(ix_from, 1);
      this.all_data.splice(ix_to, 0, headline_data);
    }

	// (If more changes are going to be done directly after.)
    if (! dont_refresh_ids) {
      this.refresh_id_strings();
	  // console.log("moveHeadline: caller is "
	  // 			  + arguments.callee.caller.toString());
	}
	  
  };


  // - - - - -
  // Get a headline by index.

  // Index in returned object will not be updated for existing objects
  // when Headlines are removed/moved. (That or similar is needed when
  // Headlines copy/paste is implemented.)

  this.headline = function(ix) {
    if (ix < 0 || ix >= this.all_data.length) {
      // XXXX How should I do code logic errors in client side Javascript?
      // Logging with Ajax call!?
      throw new Error("Bad Headline ix:" + ix + ", there are "
					  + this.all_data.length);
	}

    var headline_data = this.all_data[ix];
    var headline =  new Headline(headline_data, this);

    // Set up some init stuff (should be in Model init, not here).
    this.get_id_string(ix, headline); // Sets value if not there already
    if (headline_data.visible === undefined)
      headline_data.visible = true;

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
	var idstr = headline.id_str();
    if (idstr !== undefined) {
      // Just make certain the ix/id_str connection is updated..
      if (this.idstr_to_ix[idstr] !== ix) {
        this.refresh_id_strings();
	  }
      return headline.id_str();
    }
    idstr = this.generate_id_string();
    this.idstr_to_ix[idstr] = ix;
    headline.id_str(idstr);
	// this.refresh_id_strings();	// Should NOT have to do this directly??
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

  this.refresh_a_few_id_strings = function(ix_list) {
    this.idstr_to_ix = {};
    for(var i = 0; i < ix_list.length; i++) {
	  var ix = ix_list[i];
      var headline_data = this.all_data[ix];
      var idstr    = headline_data.idstr;
      if (idstr)
        this.idstr_to_ix[idstr] = ix;
    }
  };




  // ----------------------------------------------------------------------
  // - - - - - - - - - - - - -
  // Set up any input data:
  // (XXXX When change so stores objects, update this.)
  if (arr && arr.length) {
	for(var i = 0; i < arr.length; i++) {
	  // The rest of this is eq to this, but faster:
	  // this.new_headline(i, arr[i]);

	  var record = _make_headline_from_data_structure(arr[i]);
	  this.all_data.push( record );
	}
	this.length = arr.length;
  }


  return this;
};



// ----------------------------------------------------------------------
// Headline object

// Operations specific for a Headline structure:

var OrgHeadline = function(headline, model) {
  this.headline = headline; // Contain the data structure
  this.owner    = model;

};

OrgHeadline.prototype = {
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
      return  _.escape(this.title());

    // N B: No parsing of Headline/Block in local javascript, so
    // no way to update this. Must go to server to update this info.
    // XXXX Add a 'dirty' flag, when can't reach the server.

    return this._encode_org_subtext( this.headline.title_subs, false );
  },

  // XXXX Implement Tags!

  id_str: function() {
    // Internal use
    // Unique string ID which is set in html and can be used to
    // find the right Headline again.
    if (arguments.length > 0)
      this.headline.idstr = arguments[0];
    return this.headline.idstr;
  },

  block: function() {
    if (arguments.length > 0) {
      // Note -- this doesn't handle block_subs!
      this.headline.block = arguments[0];
	  this.owner.dirty();
	}
    return this.headline.block;
  },
  block_html: function() {
    if (! this.headline.block_parts)
      return _.escape( this.block() );
	// (Don't have a local parser for org mode, have to go to server
	// for this.)
    return this._encode_org_subtext( this.headline.block_parts, true );
  },

  todo: function() {
	// XXXX Have a function which returns a function doing an accessor:
    if (arguments.length > 0) {
      this.headline.todo_state = arguments[0];
	  this.owner.dirty();
	}
    return this.headline.todo_state;
  },
  priority: function() {
	// XXXX Check value when it is set!!
    if (arguments.length > 0) {
      this.headline.priority = arguments[0];
	  this.owner.dirty();
	}
	// console.log("PRI ");
	// console.log(this);
    return this.headline.priority;
  },

  togglePriority: function( toLower ) {
	// if 'toLower' is set, it will start with highest priority and go
	// lower. Otherwise, the opposite.
	var now     = this.priority();
	var choices = this.owner.priorities();
	if (choices.length === 0) {
	  return '';				// Uhh...??
	}
	this.owner.dirty();

	if (now === '') {
	  now = toLower ? choices[0] : choices[choices.length-1];
	  this.priority( now );
	  return now;
	}
	for(var i = 0; i < choices.length; i++) {
	  if (now === choices[i]) {
		// Update value
		now   = '';
		if (toLower) {
		  if (i < choices.length-1)
			now = this.priority( choices[i+1] );
		} else {
		  if (i)
			now = this.priority( choices[i-1] );
		}
		this.priority( now );
		return now;
	  }
	}

	// List of available values was changed or program error??
	console.log("ERROR!! FAILED TO FIND Priority " + now + "?!");
	this.priority( choices[0] );
	return choices[0];
  },


  level: function() {
    if (arguments.length > 0) {
      // XXXX Check so numeric??
      this.headline.level = arguments[0];
	  this.owner.dirty();
    }
	var level = this.headline.level;
	if (level < 1)
	  return 1;
	if (level > 10)
	  return 10;
    return level;
  },


  // ------------------------------------------------------------
  // Has local changes been done, not yet parsed by server?

  // (If two changes are done, don't want to update the older
  // change even when it comes back.)
  // XXXX Future update -- when have net access, do bulk update
  // of all the marked Headline objects.
  modified_locally: function() {
	if (arguments.length > 0) {
      // XXXX Check so numeric??
      this.headline.was_modified_locally = arguments[0];
    }
    return this.headline.was_modified_locally;
  },
  increment_modified_locally: function() {
	var now = this.modified_locally();
	now     = now ? now+1 : 1;
	this.modified_locally(now);
	return now;
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

  // Also, any Headline moved to the top must be set as visible. (Not
  // here, the Controller must do that and call the View.)


  // ------------------------------------------------------------
  // This part implements (in)visible subsets of the headlines.

  visible: function() {
    // XXXX Add so Level 1 is always visible??
    var present_value = this.headline.visible;
    if (arguments.length > 0) {
      var new_value = arguments[0];
      
      if (new_value !== present_value) {
        this.headline.visible = new_value ? true : false;
        if (this.owner.callback_fun_visible !== undefined)
          this.owner.callback_fun_visible(this, this.headline.visible,
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

	// XXXX Has a bug :-(
	// Fails when later, but not first, is hidden.

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


  // ------------------------------------------------------------
  // Org Headline text/block in HTML:

  _encode_org_subtext: function(textSubs, isBlock) {
    // Encodes headline/block for showing.

    // XXXX isBlock decides if block specific stuff should be done
    // (DEADLINE, lists, spreadsheets, PROPERTIES, ???) Implement!
    // (But first, think out a GUI for editing PROPERTIES etc. :-) )

	var encodeOrgText = {
      U: ['<u>', '</u>'],
      B: ['<b>', '</b>'],
      I: ['<i>', '</i>'],
      C: ['<code>', '</code>'],
      S: ['<span style="text-decoration: line-through;">', '</span>'],
	  // ~verbatim text~
	  V: ['', '']
	};

    var collected = '';
    for(i in textSubs) {
      var item    = textSubs[i];
      var type    = item[0];
      var value   = item[1];
      var parts, tmp, txt;
      if (type  === "Org::Element::Text") {
        if (item.length > 2 && item[2] !== "") {
          value = _.escape(value.slice(1,-1));
          if (item[2] in encodeOrgText) {
            value = encodeOrgText[item[2]][0] + value +
              encodeOrgText[item[2]][1];
          }
        } else {
          value   = _.escape(value);
        }
      } else if (type  === "Org::Element::Link") {
		value = OrgHeadline.prototype._encode_link_subcase(value);
      } else if (type  === "Org::Element::Target") {
		// In Emacs: <<target name>>
		// Implement internal links in the document with JS. The
		// "obvious way" (normal internal HTML links) is not good,
		// since you need to open Headlines to show the hidden part.
		// XXXX Implement!!
		value = " [Target TBI] ";
	  } else if (type  === "Org::Element::RadioTarget") {
		// In Emacs: <<<target name>>> ;; Radio Target.
		// With this, ALL OCCURENCES of the text (Headlines, blocks)
		// should be links to this place.
		// (N B In Emacs, Radio Target links are updated (1) on load
		//  and (2) on C-C C-C with cursor on a target.)

		// In Org::Parser documentation, a radio target was before all
		// Headlines.
		value = " [Radio Target TBI] ";
	  } else {
		console.log("Got problems with type " + type + ", value is "
					+ value + "\nPlease implement");
	  }

      // XXXX Add dates (timestamps, deadlines etc), properties et al...

      collected  += value;
    }

    return collected;
  },

  _RegexpTestStartIsURL: /^[a-z][-+a-z]:/,

  _encode_link_subcase: function(link) {
	// This parse out [[Org][links]] to HTML.
	// (Javascript catches internal_link clicks and jumps to the right place.)
	var testURL     = OrgHeadline.prototype._RegexpTestStartIsURL;
	var txt, tmp, err;
	// console.log("Checks for links:" + link);

	var parts = /^\s*\[\[([^\[]*)\]\[(.*)\]\]\s*$/.exec(link);
    if (parts !== null && typeof(parts) == 'object' && parts.length) {
      try {
        txt     = _.escape(parts[2]);
		// - - - Normal URL:
		if (testURL.test(parts[1])) {
		  console.log("Normal link:" + parts[1]);
          tmp  += '<a href="' + encodeURI(parts[1]) + '">' + txt + '</a>';
          return tmp;
		}
		// - - - Internal link:
		console.log("Internal link:" + parts[1]);
		// The 'href' part is just so hower-URL look ok
		tmp     = '<a href="#' + _.escape(parts[1]) + '"'
		  + ' class="internal_link" title="">'
		  + txt + '</a>';
		console.log("INTERNAL LINK " + tmp);
		return tmp;
      } catch(err) {return "ERROR " + err + " FOR LINK:" + _.escape(link);};
    } else {
	  // Just one item, which is both text and link:
      parts = /^\s*\[\[([^\[]*)\]\s*\]\s*$/.exec(link);
      if (parts !== null && typeof(parts) == 'object' && parts.length) {
        try {
		  // - - - Normal URL:
		  txt   =  _.escape(parts[1]);
		  if (testURL.test(parts[1])) {
			tmp = '<a href="' + parts[1] + '">' + txt + '</a>';
			return tmp;
		  }
		  // - - - Internal link:
		  console.log("Internal link, 1 part:" + parts[1]);
		  // The 'href' part is just so hower-URL look ok
		  tmp   = '<a href="#' + _.escape(parts[1]) + '"'
			+ ' class="internal_link" title="">'
			+ txt + '</a>';
		  console.log("INTERNAL LINK, 1 PART: " + tmp);
		  return tmp;
		  
        } catch(err) { return "ERR " + err + " FOR LINK:" + _.escape(link) };
      }
    }

	return "(ERROR PARSING LINK: " + _.escape(link) + ")";
  },


};
