

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Map editor commands to names -- and key codes to names.

var OrgCmdMapper = function() {
  var that = this;

  // XXXX Handle the prefixes C-U, C-U -12, etc.

  // XXXXX Select (or have a text field) with keys that should be
  // treated as prefixes for ESC and C-. Then e.g. iPad can use
  // meta/ctrl key sequences. (Can you add to keyboard on
  // iPad/Android in Safari/Chrome??)

  // (This is done to easily support C-H A(propos) and C-H K(ey).)


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
  var autoDoNumericalPrefixes = {};

  // Use character description for keys. Values are command names
  // (strings). If there is a sequence of chars for a command, it
  // stores another translation table instead of a name.
  var translationTable = {};

  this.KeyTranslationTable = function() { return translationTable; };
  this.namesToCommands = function() { return commands; };
  this.commandsToDescriptions = function() { return cmdDescriptions; };
  this.autoDoNumericalPrefixes = function() { return autoDoNumericalPrefixes;};

  // ----------------------------------------------------------------------
  // Used by commands.

  // XXXX Might be better as a parameter instead -- if the command set
  // might be used by multiple controllers?

  // Note that C-U (and others?) stores state in an object of this
  // type, which should be different for different controllers.

  this.setController = function(controller) {
	this.controller = controller;
  };

  // ----------------------------------------------------------------------
  // Add a named editor command:

  // Binds functions to use this environment

  // Note that for every command there might be a second function.
  // The second one is optional. If it is given, it is called for
  // commands in text blocks (while the first is called for Headlines)
  // (If a handler is 'undefined', it won't be called)


  // Specification parameters like this, so it is extensible:
  this.addACommand = function( spec ) {
	var name     = spec.name.toLowerCase();
	var document = spec.docum;	// Documentation
	var fun      = spec.text || spec.both;
	var blockFun = spec.block;
	var autoLoop = spec.autoLoop || false;
	var numericalHandling = spec.numericalAsMultipleCalls;

	var funs = [fun.bind(this)];
	if (blockFun)
	  funs.push( blockFun.bind(this) );

	commands[name] = funs;
	cmdDescriptions[name] = document;
	autoDoNumericalPrefixes[name] = autoLoop;
	return true;
  };


  // ----------------------------------------------------------------------
  // Add a key sequence to an editor command name:

  this.addKeyCommand = function(name_in, cmdKeySpec) {
	var name = name_in.toLowerCase();

	// console.log("Cmd " + name_in + ", key seqs: " + cmdKeySpec);

	if (! (name in commands) ) {
	  // Oh oh.
	  // XXXX How should an error like this be handled??
	  console.log("Internal configuration error\n"
				  + "No command " + name + ", for keys " + cmdKeySpec);
	  alert("Internal configuration error.\n  Failed to find command "
			+ name + ". Tried to configure it with char seq " + cmdKeySpec);
	  return undefined;
	}

	var keyCodeSpecs = cmdKeySpec.split(/\s*,,\s*/);
	if (keyCodeSpecs.length === 0) {
	  // Shouldn't happen
	  console.log("Internal configuration error, command " + name + "\n"
				  + "Bad spec: " + cmdKeySpec);
	  alert("Internal configuration error, command " + name + "\n"
			+ "Bad spec: " + cmdKeySpec);
	  return undefined;
	}

	for(var ix = 0; ix <  keyCodeSpecs.length; ix++) {
	  var charKeySeq = keyCodeSpecs[ix];
	  // console.log("For " + name + ", going to add " + charKeySeq);
	  // (This trim removes '\ ', but ' ' is named as 'space'.)
	  var keySpec = this._parseKeySPec(charKeySeq.trim());
	  if (keySpec === undefined) {
		// XXXX Error handling how??
		console.log("Failed parsing command for " + name + ", "
					+ charKeySeq + ", in " + cmdKeySpec);
		return undefined;
	  }

	  // - - - Insertion into dispatch tables
	  var seqLen  = keySpec.length;

	  var tTable = translationTable;
	  var c;
	  for(var i = 0; i < seqLen-1; i++) {
		c = keySpec[i];
		// console.log(name + ": Logging " + c);
		if (c in tTable) {
		  if (typeof tTable[c] == "string") {
			console.log("Specifying cmd " + JSON.stringify(cmdKeySpec)
						+ ", but another command at " + (i+1)
						+ " has a subseq to " + c);
			return undefined;
		  }
		  tTable = tTable[c];
		} else {
		  // console.log("For " + name + ", adding table for " + c);
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
	}

	return true;
  };


  // - - - - - - - - - - - -
  // Parse a character specification for a command:
  this._parseKeySPec = function(keyboardSpec) {
	var keycodeArr = keyboardSpec.toUpperCase().split(/\s+/);

	var out = [];

	var rx = /^((?:[MSC]-)*)([-_<>A-Z0-9^,\\]+)$/;

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
  // Dispatch to command:

  // (The code sucks -- and the same for using it. There should be
  //  some less inelegant way?)
  this.callCommand = function(commandName, callParams) {
	
	var out = this._getFunctionFromCommand(commandName, callParams.isBlock);
	if (out === undefined) {
	  console.log("Failed to find command: " + commandName);
	  return undefined;
	}
	var fun        = out[0];
	var blockLoop  = out[1];

	var headline   = callParams.headline;
	var isBlock    = callParams.isBlock;
	var numberPre  = callParams.numericalPrefix;

	var event      = undefined;
	var metaKey    = undefined;
	var ctrlKey    = undefined;
	var keyCode    = undefined;
	var keyboardp  = false;

	if (callParams.keyboard_p) {
	  // console.log( "Call parameters:" + commandName);
	  // console.log( callParams );
	  keyboardp    = true;
	  event        = callParams.event;
	  keyCode      = event.which || event.keyCode;
	  ctrlKey      = event.ctrlKey;
	  metaKey      = (event.altKey || event.metaKey);
	}

	if (blockLoop !== true || numberPre === undefined || numberPre+0 < 1)
	  return fun(keyboardp, event,
				   ctrlKey, metaKey,  keyCode,
				   headline, isBlock, numberPre);

	console.log("Checking command " + commandName + " ------ FOR LOOP!");
	var val;
	for(var i = 0; i < numberPre; i++) {
	  val = fun(keyboardp, event,
				ctrlKey, metaKey,  keyCode,
				headline, isBlock, 1); // Always one here
	  if (val === false)
		return false;
	}

	return true;
  };

  // - - - - - - - - - - - - -
  // Handle character, try to match a key sequence:

  // You can't catch Ctrl-N/-T/-W and M-Left/-Right in Chrome??
  // And probably even more chars? :-(
  // Just Do FF/Safari and skip the Chrome/IE garbage for now.

  // (XXXX Need a "info bar" for C-U and others, which e.g. lists
  //  error messages and chars written for C-U -?[0-9]+!!)

  this.handleChar = function(event, isBlock) {
	// Do we have active C-U filtering?
	if (_characterFilter !== undefined
		&& _characterFilter(event))
		return [OrgCmdMapper.CMD_ATE_CHAR, undefined];

	var result = this._handleKeyFindCommand(event);
	var resultType = result[0];

	if (resultType === OrgCmdMapper.CMD_DISPATCH_FUNCTION) {
	  var commandName = result[1];

	  // Do we have prefix commands active?
	  var numericalPrefixValue = this.getPrefixValue();
	  this.setPrefixValue('');
	  if (numericalPrefixValue.length)
		numericalPrefixValue = parseInt(numericalPrefixValue);
	  else
		numericalPrefixValue = undefined;

	  return [resultType, commandName, numericalPrefixValue];
	}

	// No numerical prefix to normal characters for now:
	if (resultType !== OrgCmdMapper.CMD_ATE_CHAR) {
	  _characterFilter = undefined;
	  this.setPrefixValue('');
	}

	return result;
	
  }

  this._handleKeyFindCommand = function(event) {
	// Returns: Array with two items.
	//          [result_code_enum, value (command name/error text/etc)].
	// (From jQuery, browser compatibility)
    var keyCode   = event.which || event.keyCode;

	// Allow ESC instead of Meta key:
    var metaDescr = (event.altKey || event.metaKey) ? 'M-' : '';

	if (this.commandKeySeqLength()
		&& this.commandKeySeqCharDescrLast() === 'ESC') {
	  if (keyCode == 27) {
		this.clearCommandKeySequence();
		return [OrgCmdMapper.CMD_ERROR, "ESC ESC is not used"];
	  }
	  this.getLastCommandKeySequence();
	  metaDescr = 'M-';
	}
	if (keyCode == 27) {
	  this.addToCommandKeySequence(undefined, 'ESC');
	  return [OrgCmdMapper.CMD_ATE_CHAR, undefined];
	}	  

	// - - -
	var keyChar   = this._getCharFromEvent(event, true);
	// Chrome doesn't allow getting every char, whatever I do? :-(

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
	if (this.commandKeySeqLength() == 0 && !(keyDescr in translationTable))
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
	  return [OrgCmdMapper.CMD_DISPATCH_FUNCTION, dispatchTo];
	}

	// - - - Prefix sequence. (I.e. not something to dispatch to)
	this.addToCommandKeySequence(dispatchTo, keyDescr);
	
	return [OrgCmdMapper.CMD_ATE_CHAR, undefined];
  };


  // Look up the corresponding code to a command name
  // (Optionally, return the code for the block.)
  this._getFunctionFromCommand  = function(commandName, isBlock) {
	console.log("----- Get fun for command: " + commandName);
	var name = commandName.toLowerCase();
	if (! (name in commands))
	  return undefined;
	var funList = commands[name];
	console.log("Has " + funList.length + " funs. Block value is " + isBlock);
	if (isBlock && funList.length > 1)
      return [funList[1], autoDoNumericalPrefixes[name]];
	return [funList[0], autoDoNumericalPrefixes[name]];

  };


  // - - - Extract char-as-a-string from an Event:
  this._getCharFromEvent = function(event, upperCase_p) {
	// (From jQuery, browser compatibility)
    var keyCode   = event.which || event.keyCode;
	// console.log("Key code " + keyCode + ", event:");
	// console.log(event);
	if (upperCase_p && keyCode >= 97 && keyCode <= 122)
	  keyCode -= 32;
	if (keyCode < 32)
	  return undefined;
	var attemptedChar = String.fromCharCode(keyCode);
	// Gets keyCode 173 for '-', '=' for '+', etc.
	if (event.key.length) {
	  if (keyCode > 127)
		return event.key;
	  if (keyCode < 65 && event.key !== attemptedChar)
		return event.key;
	}

	return attemptedChar;
	
  };
	

  // - - - Handle prefix commands state:
  // (i.e. C-X C-S, saves the C-X.)
  var commandKeySeq = [];

  //Accessors:
  this.commandKeySeqLength = function() {
	return commandKeySeq.length;
  };
  this.commandKeySeqTableAt = function (ix) {
	return commandKeySeq[ix][0];
  };
  this.commandKeySeqTableLast = function (ix) {
	return this.commandKeySeqTableAt(this.commandKeySeqLength()-1);
  };
  this.commandKeySeqCharDescrAt = function (ix) {
	return commandKeySeq[ix][1];
  };
  this.commandKeySeqCharDescrLast = function (ix) {
	return this.commandKeySeqCharDescrAt(this.commandKeySeqLength()-1);
  };

  // The rest modifies the state:
  this.clearCommandKeySequence = function() {
	commandKeySeq = [];
  };
  this.getLastCommandKeySequence = function() {
	return commandKeySeq.pop();
  };
  this.addToCommandKeySequence = function(dispatchTable, description) {
	commandKeySeq.push( [dispatchTable, description]);
  };

  // - - - Handle numerical prefix modifier:
  // (i.e. C-U, C-U - 2 3, C-U 2 3)
  var numericalPrefixSeq = '';

  // Later, if needed, allow multiple of these:
  var _characterFilter = undefined;
  this.setCharacterFilter = function(funHandler) {
	_characterFilter = funHandler;
  };

  // (N B -- stores as string here :-) )
  this.getPrefixValue = function(value) {
	return numericalPrefixSeq;
  }
  this.setPrefixValue = function(value) {
	numericalPrefixSeq = value;
  }
  


  // - - - - - - - - - - -
  // Help routine for error messages etc:
  this._buildKeyCmdDescription = function(keyDescription) {
	var description = keyDescription;
	if (commandKeySeq.length) {
	  for(var c in commandKeySeq) {
		description = c[1] + ", " + description;
	  }
	}
	return description;
  };


};

OrgCmdMapper.CMD_ATE_CHAR = 1;
OrgCmdMapper.CMD_IGNORED_CHAR = 2;
OrgCmdMapper.CMD_DISPATCH_FUNCTION = 3;
OrgCmdMapper.CMD_INFO  = 4;
OrgCmdMapper.CMD_ERROR = 5;
