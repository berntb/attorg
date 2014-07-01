

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Map editor commands to names -- and key codes to names.

var OrgCmdMapper = function() {
  var that = this;

  // XXXX Handle the prefixes C-U, C-U -12, etc.

  // XXXXX Select (or have a text field) with keys that should be
  // treated as prefixes for ESC and C-. Then e.g. iPad can use
  // meta/ctrl key sequences. (Can you add to keyboard on
  // iPad/Android in Safari/Chrome??)

  var keyCommandList = {};


  // - - - Key translation part:

  var namesToKeyCodes = {
	LEFT:  37,
	UP:    38,
	RIGHT: 39,
	DOWN:  40,
	CR:    13,
	TAB:    9,
	SPACE: 32,
  };

  var keyCodesToNames = {		// (There is an inverting fun in '_'??)
    37:  'LEFT',
    38:  'UP',
    39:  'RIGHT',
    40:  'DOWN',
    13:  'CR',
    9:   'TAB',
	32:  'SPACE',
  };


  var commands = {};			// Named commands + functions
  var cmdDescriptions = {};		// Descriptions of commands.

  // Use character description for keys. Values are command names
  // (strings). If there is a sequence of chars for a command, it
  // stores another translation table instead of a name.
  var translationTable = {};

  this.keyFuns = function() { return keyCommandList; };
  this.KeyTranslationTable = function() { return translationTable; };
  this.namesToCommands = function() { return commands; };
  this.commandsToDescriptions = function() { return cmdDescriptions; };


  // ----------------------------------------------------------------------
  // Add a named editor command:

  // Note that for every command there might be a second function.
  // The second one is optional. If it is given, it is called for
  // commands in text blocks (while the first is called for Headlines)
  // (If a handler is 'undefined', it won't be called)

  this.addCommand = function(name, description, fun) {
    // If sends in one fun, it is for both text and block.
     var funs  = [fun];
    if (arguments.length > 3) {
       funs.push( arguments[3] ); // block fun
	}
    name = name.toLowerCase();
    commands[name] = funs;
    cmdDescriptions[name] = description;
	return true;
  };


  // ----------------------------------------------------------------------
  // Add a key sequence to an editor command name:

  this.addKeyCommand = function(name_in, cmdKeySpec) {
	var name = name_in.toLowerCase();

	if (! (name in commands) ) {
	  // Oh oh.
	  // XXXX How should an error like this be handled??
	  console.log("Internal configuration error\n"
				  + "No command " + name + ", for keys " + cmdKeySpec);
	  alert("Internal configuration error.\n  Failed to find command "
			+ name + ". Tried to configure it with char seq " + cmdKeySpec);
	  return undefined;
	}

	var keySpec = this._parseKeySPec(cmdKeySpec);
	if (keySpec === undefined)
	  // XXXX Error handling how??
	  return undefined;

	// - - - Insertion into dispatch tables
	var seqLen  = keySpec.length;

	var tTable = translationTable;
	var c;
	for(var i = 0; i < seqLen-1; i++) {
	  c = keySpec[i];
	  console.log("Logging " + c);
	  if (c in tTable) {
		if (typeof tTable[c] == "string") {
		  console.log("Specifying cmd " + JSON.stringify(cmdKeySpec)
					  + ", but another command at " + (i+1)
					  + " has a subseq to " + c);
		  return undefined;
		}
		tTable = tTable[c];
	  } else {
		var val = {};
		tTable[c] = val;
		tTable = val;
	  }
	}

	c = keySpec[seqLen-1];
	if (c in tTable) {
	  // Should just replace and give a log message instead??
	  console.log("Another command has the same seq as " + cmdKeySpec);
	  return undefined;
	}

	tTable[c] = name;
	// console.log("After inserting for " + name + "\n"
	// 			+ JSON.stringify(translationTable));
	return true;
  };


  // - - - - - - - - - - - -
  // Parse a character specification for a command:
  this._parseKeySPec = function(keyboardSpec) {
	var keycodeArr = keyboardSpec.toUpperCase().split(/\s+/);

	var out = [];

	var rx = /^((?:[MSC]-)*)([-_<>A-Z0-9^]+)$/;
	console.log("Seq " + JSON.stringify(keycodeArr) + "\n");

	for (var i=0; i < keycodeArr.length; i++) {
	  var keySpec = keycodeArr[i];
	  var matched = rx.exec(keySpec);
	  if (matched !== null) {
		var charSpec = matched[2];
		var shiftMetaCtrl = matched[1];
		var shifted = '';

		// Note order SMC! 
		if (shiftMetaCtrl.indexOf("S") >= 0)
		  shifted   = 'S-';
		if (shiftMetaCtrl.indexOf("M") >= 0)
		  shifted  += 'M-';
		if (shiftMetaCtrl.indexOf("C") >= 0)
		  shifted  += 'C-';
		if (charSpec.length > 1 && !(charSpec in namesToKeyCodes)) {
		  alert("Failed to find character name: " + charSpec);
		  console.log("Failed to find character name: " + charSpec);
		  return undefined;
		}
		// console.log("Matched " + keySpec + ", got " + shifted + charSpec);
		out.push( shifted + charSpec );
	  } else {
		console.log("Failed to match " + keySpec);
	  }
	}
	return out;
  };


  // - - - - - - - - - - - - -
  // Handle character, try to match a key sequence:

  this.handleChar = function(event, isBlock) {
	var result = this._handleKeyGetFun(event, isBlock);
	var code   = result[0];
	if (code === OrgCmdMapper.CMD_ATE_CHAR)
	  return true;				// Ignore
	if (code === OrgCmdMapper.CMD_IGNORED_CHAR)
	  return false;
	if (code === OrgCmdMapper.CMD_DISPATCH_FUNCTION) {
	  // console.log("CHAR -- FUNCTION code:\n" + result[1]);
	  return result[1];			// Function to execute
	}
	return result[1];			// Information or Error, return a string
  }
	
  // XXXX This is done to easily support C-H A(propos) and C-H K(ey).

  this._handleKeyGetFun = function(event, isBlock) {
	// - - - Get key description:
	// (From jQuery, browser compatibility)
    var keyCode   = event.which || event.keyCode;
	if (keyCode >= 97 && keyCode <= 122)
	  keyCode -= 32;			// Upper Case for char commands

	// Allow ESC instead of Meta key:
    var metaDescr = (event.altKey || event.metaKey) ? 'M-' : '';

	if (commandKeySeq.length
		&& commandKeySeq[commandKeySeq.length-1][1] === 'ESC') {
	  if (keyCode == 27) {
		// Add any special handling of ESC ESC here!
		console.log("ESC ESC is ignored, add support if you want that");
		commandKeySeq = [];
		// XXXX Add error message handling in Model!!
		return [OrgCmdMapper.CMD_ERROR, "ESC ESC is not used"];
	  }
	  commandKeySeq.pop();
	  metaDescr = 'M-';
	}
	if (keyCode == 27) {
	  commandKeySeq.push([undefined, 'ESC']);
	  return [OrgCmdMapper.CMD_ATE_CHAR, undefined];
	}	  

	// - - -
	if (keyCode >= 97 && keyCode <= 122)
	  keyCode -= 32;			// Upper case
	var keyChar   = String.fromCharCode(keyCode);
	// Need that to support e.g. M-<, since needs shift on some keyboards.

	// Works on FF, not Chrome, for keydown. keypress has the char,
	// but then it miss lots of stuff. Could get both events and
	// ignore it for keypress if keydown handled it? :-( Sigh...

	// Just Do FF/Safari and skip the Chrome/IE garbage for now.
	// (Chrome don't allow catching Ctrl-N/-T/-W anyway, sigh...)
	// if (event.key !== undefined)
	//   keyChar = event.key;
	if (keyCode in keyCodesToNames)
	  keyChar     = keyCodesToNames[keyCode];
    var ctrlDescr = event.ctrlKey ? 'C-' : '';
    var shiftDescr= event.shiftKey ? 'S-' : '';

	// - - - Order is SMC:
    var keyDescr = shiftDescr + metaDescr + ctrlDescr + keyChar;
	// console.log("CHAR -- Key: " + keyDescr + " (code " + keyCode + ") "
	// 		   + ", queue has " + commandKeySeq.length + " items.");
	// console.log("In " + JSON.stringify(translationTable));

	// Just a normal char:
	if (this.commandKeySeqLength() == 0
		&& !(keyDescr in translationTable))
	  return [OrgCmdMapper.CMD_IGNORED_CHAR, undefined];

	// Are we building a Prefix sequence?
	var dispatchTableNow = translationTable;
    if (this.commandKeySeqLength()) {
	  dispatchTableNow = this.commandKeySeqTableLast();
    }
	console.log("CHAR -- PREFIXES " + JSON.stringify(commandKeySeq));
	if (! (keyDescr in dispatchTableNow)) {
	  // XXXX Add error message handling in Model!!
	  this.clearCommandKeySequence();
	  return [OrgCmdMapper.CMD_ERROR, "No command at "
			  + this._buildKeyCmdDescription(keyDescr)];
	}
	var dispatchTo = dispatchTableNow[keyDescr];
	if (typeof dispatchTo == "string") {
	  // We found a fun to call!!
	  this.clearCommandKeySequence();
	  if (! (dispatchTo in commands)) {
		// Shouldn't happen, this is checked when key sequences are added
		
	  }

	  this.clearCommandKeySequence();
	  // return [OrgCmdMapper.CMD_DISPATCH_FUNCTION, fun];
	  return [OrgCmdMapper.CMD_DISPATCH_FUNCTION,
	  		  this.getFunctionFromCommand(dispatchTo, isBlock)];
	}

	// - - - Prefix sequence. (I.e. not something to dispatch to)
	this.addToCommandKeySequence(dispatchTo, keyDescr);
	
	return [OrgCmdMapper.CMD_ATE_CHAR, undefined];
  };


  // XXXX Change so first returns a name. This is used to get method.
  this.getFunctionFromCommand  = function(commandName, isBlock) {
	console.log("GET FUN: " + commandName);
	if (! (commandName in commands))
	  return undefined;
	var funList = commands[commandName];
	console.log("Has " + funList.length + " funs. Block value is " + isBlock);
	if (isBlock && funList.length > 1)
      return funList[1];
	return funList[0];
  };

  // - - - Handle prefix commands
  var commandKeySeq = [];

  this.clearCommandKeySequence = function() {
	commandKeySeq = [];
  };
  this.commandKeySeqLength = function() {
	return commandKeySeq.length;
  };
  this.addToCommandKeySequence = function(dispatchTable, description) {
	commandKeySeq.push( [dispatchTable, description]);
  };
  this.commandKeySeqTableAt = function (ix) {
	return commandKeySeq[ix][0];
  };
  this.commandKeySeqTableLast = function (ix) {
	return this.commandKeySeqTableAt(this.commandKeySeqLength()-1);
  };


  // - - - - - - - - - - -
  // Help routine for error messages etc:
  this._buildKeyCmdDescription = function(keyDescription) {
	var description = keyDescription;
	if (commandKeySeq.length) {
	  for(var c in commandKeySeq) {
		description = c[1] + ", " + description;
	  }
	  console.log("Command description " + description);
	}
	return description;
  };


};

OrgCmdMapper.CMD_ATE_CHAR = 1;
OrgCmdMapper.CMD_IGNORED_CHAR = 2;
OrgCmdMapper.CMD_DISPATCH_FUNCTION = 3;
OrgCmdMapper.CMD_INFO  = 4;
OrgCmdMapper.CMD_ERROR = 5;
