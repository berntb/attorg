test( "hello test", function() {
  ok( 1 == "1", "Passed!" );
});


var _id_count = 1;
function _make_id_string() {
  return "id_" + _id_count++; // Attorg ID
}

var is       = equal;					// Sorry for being
var isnt     = notEqual;				// non-JS-kosher. Old habit :-)
var is_deeply= deepEqual;
// QUnit really needs like/unlike, too :-(
// (isa_ok is not realistic of course, but can_ok?)


var basic_test_data = [
	{ drawer_names: [ "CLOCK", "LOGBOOK", "PROPERTIES" ],
      priorities:   [ "A", "B", "C" ],
      document:     1,
      done_states:  [ "DONE" ],
      todo_states:  [ "TODO" ]
      },
    { level: 1, title_text: "DUH", tags: "" }
  ];

function std_model_creation() {
  return new OrgModel(
	"Foo",
	basic_test_data,
	undefined,
	_make_id_string
  );
}


// ( No real typeof for models in JS. :-) )
test( "Make Model object", function() {
  var model = std_model_creation();

  ok( typeof model === 'object', "Made a Model object" );
});


// ----------------------------------------------------------------------
// General attribute stuff:

test( "Modified flag", function() {
  var model = std_model_creation();


  ok(!model.modified(), "Document modified flag off at first" );
  // alert("Flag " + model.modified());
  model.modified(1);
  ok( model.modified(), "Document modified on" );
  model.modified(0);
  ok(!model.modified(), "Document modified flag turned off again" );
  // XXXX Might want to extend the dirty to remember what was modifed.
  // Or even better, handle undo.
  model.dirty();
  ok( model.modified(), "Document modified on, using the dirty() call." );
});


test( "TODO states", function() {
  var model = std_model_creation();

  var todo_states = model.todo_states();

  ok( model.all_todo_done_states().length == 2, "Has 2 todo/done states");

  ok( $.isArray( todo_states ), "Has todo states" );
  is( todo_states.length, 1, "Got right num of todo states" );
  model.todo_states(["TODO", "TODRINK"] )
  todo_states = model.todo_states();
  is( todo_states[0], "TODO", "Changed todo state I" );
  is( todo_states[1], "TODRINK", "Changed todo state II" );
  is( todo_states.length, 2, "Can change todo states" );
});

test( "DONE states", function() {
  var model = std_model_creation();

  var done_states = model.done_states();

  ok( $.isArray( done_states ), "Has done states" );
  is( done_states.length, 1, "Got right num of done states" );
  model.done_states(["DONE", "CANCELED"] )
  done_states = model.done_states();
  is( done_states.length, 2, "Can change done states" );


  // Now we have two todo and 2 done states
  ok( model.all_todo_done_states().length == 4, "Now has 4 todo/done states");
});


test( "Priority states", function() {
  var model = std_model_creation();

  var prios = model.priorities();

  ok( $.isArray( prios ), "Has priorities states" );
  is( prios.length, 3, "Got right num of priority states" );
  model.priorities(["A", "B", "C", "D"] );
  prios = model.priorities();
  is_deeply( prios, ["A", "B", "C", "D"], "New priorities setup" );
  is( prios.length, 4, "Can change priorities states" );
});


test( "Drawer states", function() {
  var model = std_model_creation();

  var draws = model.drawer_names();

  ok( $.isArray( draws ), "Has Drawer names" );
  is( draws.length, 3, "Got right num of Drawer names" );
  model.drawer_names(["CLOCK", "LOGBOOK", "PRIORITIES", "DUH"] )
  draws = model.drawer_names();
  is( draws[1] + draws[3], "LOGBOOKDUH", "Changed Drawer names" );
  is( draws.length, 4, "Can change Drawer names" );
});


test( "Org document name", function() {
  var model = std_model_creation();

  is( model.documentName(), "Foo", "Initial value of document name" );
  model.documentName("Bar");
  is( model.documentName(), "Bar", "Modified Org document name" );
});


// ----------------------------------------------------------------------
// Headlines:

test( "Headline + move", function() {
  var model = std_model_creation();

  is( model.length, 1, "Got one Headline specified in start data");

  // - - - Check the one inserted from starting data:
  var hLine = model.headline(0);
  is( hLine.title(), "DUH", "Can get Headline text");
  ok( hLine.title_html().indexOf("DUH") >= 0 , "HTML contains substring");
  is( hLine.level(), 1, "Can get Headline level");
  is( hLine.block(), "", "No block set");
  // Implement tags:  is( hLine.tags(), "", "Can get Headline level");
  var id_initial_hline = hLine.id_str();

  // - - - Add a new Headline:
  model.new_headline(1, {
	title_text: "1st insert",
  });
  is( model.length, 2, "Added a Headline, now there are 2.");
  var id_2nd_hline = model.headline(1).id_str();
  isnt(id_initial_hline, id_2nd_hline, "ID strings are different");
  // alert(model.headline(1).id_str());
  is( model.headline(1).title(), "1st insert", "Headline title for 1st");
  is( model.headline(1).level(), 1, "Default headline level");
  is( model.headline(1).todo(), "", "No headline todo");

  // - - - Add another:
  model.new_headline(2, {
	title_text: "2nd insert",
  });
  is( model.length, 3, "Added another Headline, now there are 3.");
  is( model.headline(2).title(), "2nd insert", "Headline title for 2nd");
  // The new Headline after 1 didn't move the num 1:
  is( model.headline(1).title(), "1st insert",
		 "1st insert still in right place");

  // - - - Insert a new Headline in the middle:
  model.new_headline(1, {
	title_text: "Inserted in middle",
	block: "Blck",
	level: 2,
	todo: "TODO",
  });
  is( model.length, 4, "YAH, now 4.");
  // The insertion pushed down previous Headline:
  is( model.headline(2).title(), "1st insert", "H-line for 1st added");
  is(model.headline(2).id_str(), id_2nd_hline,
	 "ID strings for new/old place of 1st inserted.");

  is( model.headline(1).block(), "Blck", "3rd insert, check text block");
  is( model.headline(1).level(), 2, "Inserted non-default H-line level");
  is( model.headline(1).todo(), "TODO", "Inserted Headline todo state");

  // - - - Insert a new Headline first:
  model.new_headline(0, {
	title_text: "Inserted at #0",
	block: "Blck",
	level: 2,
	todo: "TODO",
  });
  is( model.length, 5, "Now 5 in list.");
  is( model.headline(0).title(), "Inserted at #0", "H-line at 1st place");
  // And check so the new headline pushed down the old ones:
  is(model.headline(3).id_str(), id_2nd_hline,
	 "ID strings for new/old place of 1st inserted.");

  // - - - Add a Headline last:
  // (Not really needed, inserted last twice before.)
  model.new_headline(5, {
	title_text: "Inserted at #5",
	block: "numero cinc",
	level: 3,
	todo: "TODO",
  });
  is( model.length, 6, "Now 6 in list.");
  is(model.headline(5).title(), "Inserted at #5", "New old one is last");

  // - - - Move/Delete Headline is done with internal ID stuff below
});


// ----------------------------------------------------------------------
// ID string to index:

// This is really internal functionality, but needs to be tested.

// This also tests moving/deleting of Headlines.

// Replan this to something completely different? :-( (jQuery
// has some functionality for generating unique ID strings, I think?)

// (Might want to update the ix:es directly, trade speed for simplicity.)

// Verify the ids/ix store.
function _verify_ids_and_ix(model) {
  var ids = model.idstr_to_ix;

  for(var id in ids) {
	var ix = ids[id];
	var h = model.headline(ix);
	if (h.id_str() !== id)
	  return [ix, id, h.id_str()];
  }
  return undefined;				// All ok
}


test( "Headline move/delete + index handling", function() {
  var model = std_model_creation();

  // Utility, strings -> ix. Make array with id_str:s.
  var ids_to_ix_arr = function (obj) {
	var arr = new Array();
	for(var idstr in obj) {
	  arr[ obj[idstr] ] = idstr;
	}
	return arr;
  };

  // - - - Set up Headlines:
  model.headline(0).title("A");
  model.new_headline(1, {title_text: "B",});
  model.new_headline(2, {title_text: "C",});
  model.new_headline(3, {title_text: "D",});

  is( model.length, 4, "Num of Headlines to start");

  var ids_before = ids_to_ix_arr(model.idstr_to_ix);
  model.moveHeadline(2,1);
  var ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is( ids_before[2], ids_after[1], "Moved 3rd Headline to 2nd another place");
  is( ids_before[1], ids_after[2], "... 2nd was pushed up to 3rd.");
  // Move back, should be the same now:
  model.moveHeadline(2,1);
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);

  is( ids_before[1], ids_after[1], "Changed back I");
  is( ids_before[2], ids_after[2], "Changed back II");

  // Move > 1 step:
  model.moveHeadline(3,1);
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  // The move first removes, then inserts at an earlier place. So all
  // between will get their places pushed.
  is( ids_before[3], ids_after[1], "Moved 3rd Headline to 1st place");
  is( ids_before[1], ids_after[2], "... 2nd was pushed up to 3rd.");
  is( ids_before[2], ids_after[3], "... 3rd was pushed up to 4th.");

  // Moving to a later place:
  ids_before = ids_after;
  model.moveHeadline(0,3);
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is( ids_before[0], ids_after[3], "Moved first Headline to last");
  is( ids_before[1], ids_after[0], "... 2nd fell down to first.");
  is( ids_before[2], ids_after[1], "... 3rd to 2nd.");
  is( ids_before[3], ids_after[2], "... 3rd to 2nd.");

  // Moving to same place (paranoia is a life style choice):
  ids_before = ids_after;
  model.moveHeadline(1,1);
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is_deeply(ids_before, ids_after, "Moved to same place I");

  // - - - Delete of Headline:
  ids_before = ids_after;
  model.delete_headline(1);
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is( model.length, 3, "Num of Headlines after deleting one");
  is( ids_before[0], ids_after[0], "Delete has no effect before delete");
  is( ids_before[2], ids_after[1], "Delete moves remaining up");

  // Delete the first:
  ids_before = ids_after;
  model.delete_headline(0);
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is( model.length, 2, "Num of Headlines after deleting a 2nd");
  is( ids_before[1], ids_after[0], "Delete moves remaining up");
  is( ids_before[2], ids_after[1], "Delete moves remaining up II");

  ids_before = ids_after;
  model.new_headline(1, {title_text: "E",});
  is(_verify_ids_and_ix( model ), undefined, "ids/ix translation");
  ids_after  = ids_to_ix_arr(model.idstr_to_ix);
  is( model.length, 3, "Num of Headlines after deleting one");
  is( ids_before[2], ids_after[3], "Insertion moves those after down");

  // alert( JSON.stringify(ids_before) + ",\n" + JSON.stringify(ids_after) );
});

