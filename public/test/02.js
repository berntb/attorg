test( "hello test", function() {
  ok( 1 == "1", "Passed!" );
});


var is       = equal;					// Sorry for being
var isnt     = notEqual;				// non-JS-kosher. Old habit :-)
var is_deeply= deepEqual;
// QUnit really needs like/unlike, too :-(
// (isa_ok is not realistic of course, but can_ok?)

function stdMakeCmdHandler(addStdCommands_p) {
  var cmdHandler = new OrgCmdMapper();

  if (addStdCommands_p) {
	cmdHandler.addCommand("Foobar","Description", function () { } );
	cmdHandler.addCommand("Duh",   "Description", function () { } );
	cmdHandler.addCommand("Dah",   "Description", function () { } );
  }

  return cmdHandler;
}


// ----------------------------------------------------------------------
// Test adding commands to Command handler:

test( "Create object", function() {
  var handler = stdMakeCmdHandler(false);

  ok( typeof handler === 'object', "Made a handler object" );
  is_deeply( handler.KeyTranslationTable(), {}, "Empty setup" );
});


test( "Add some commands", function() {
  var handler = stdMakeCmdHandler();

  ok(handler.addCommand("Foobar","Description", function () { } ), "Add cmd");
  ok(handler.addCommand("Duh",   "Description", function () { } ), "... 2");
  ok(handler.addCommand("Dah",   "Description", function () { } ), "... 3");
  // alert(JSON.stringify(handler.namesToCommands()));
  is(Object.keys(handler.namesToCommands()).length, 3, "Added 3 commands");
  is(Object.keys(handler.commandsToDescriptions()).length, 3, "3 doc strings");
});


test( "Simple key command adding", function() {
  var handler = stdMakeCmdHandler(true); // Adds std 3 commands

  isnt(handler.addKeyCommand("Dah",   "G"),       undefined, "Simple key seq");
  isnt(handler.addKeyCommand("Foobar","C-TAB"),   undefined, "..2");
  isnt(handler.addKeyCommand("Duh",   "M-CR"),    undefined, "..3");
  isnt(handler.addKeyCommand("dah",   "S-C-M-UP"),undefined, "..4");
  isnt(handler.addKeyCommand("Duh",   "M-LEFT"),  undefined, "..5");
  isnt(handler.addKeyCommand("foobar","RIGHT"),   undefined, "..5");
  isnt(handler.addKeyCommand("dah",   "C-X DOWN"),undefined, "..6");
});


test( "Insertion of key commands", function() {
  var handler = stdMakeCmdHandler(true); // Adds std 3 commands

  handler.addKeyCommand("Foobar",  "C-G");
  is_deeply(handler.KeyTranslationTable(),
			{ "C-G": "foobar"},	// N B NOT case sensitive internally
		   "Translation table");

  handler.addKeyCommand("Duh",  "C-X X");
  is_deeply(handler.KeyTranslationTable(),
			{ "C-G": "foobar", "C-X": { "X": "duh"} },
		   "Translation table, 2 levels");

  handler.addKeyCommand("Dah",  "C-X M-S-f");
  is_deeply(handler.KeyTranslationTable(),
			{ "C-G": "foobar", "C-X": { "X": "duh", "S-M-F": "dah"} },
		   "Translation table, multiple shift keys");

  handler.addKeyCommand("Dah",  "C-S C-S CR");
  is_deeply(handler.KeyTranslationTable()["C-S"],
			{ "C-S": {"CR": "dah"} },
		   "Translation table, 3 levels (and named chars)");

  // This should be bad (a sub sequence to a longer seq)
  is(handler.addKeyCommand("Dah",  "C-S C-S"), undefined,
	 "Double key seq is bad");
  // This should just replace and give a log message instead??
  is(handler.addKeyCommand("Dah",  "C-X X X"), undefined,
	 "Double key seq is bad II");
});


// XXXX Add tests for handleChar!
