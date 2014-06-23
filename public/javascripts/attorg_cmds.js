

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Help for mapping key codes to functions.

var OrgCmdMapper = function() {

  return function() { // controller) {
    var that = this;

    // this.controller = controller;

    // Prefix command function, that eats and caches prefixes!
    // Supports C-C and ESC. A C-G should throw away prefixes.
    // Note, need a stack of two: C-C ESC . -- add date.

    // XXXXX Add support for C-X, <more> stuff... (M-X would just be a
    // normal cmd which opened a text field.)

	// XXXX Handle the prefixes C-U, C-U -12, etc.

    // XXXXX Select (or have a text field) with keys that should be
    // treated as prefixes for ESC and C-. Then e.g. iPad can use
    // meta/ctrl key sequences. (Can you add to keyboard on
    // iPad/Android in Safari/Chrome??)

	var keyCommandList = {};

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

    var commands = {};			// Named commands + functions
    var cmdDescriptions = {};	// Descriptions of commands.

    // Notes:
    // Key code: [text_handler, block_handler] // block is optional
    // (If a handler is 'undefined', it won't be called)

    // Function to add function to key:
    this.addCommand = function(name, description, fun) {
      // If sends in one fun, it is for both text and block.
      // To not have a fun for text or block, send in undefined.
      var funs  = [fun];
      if (arguments.length > 3) {
		// console.log("Fun " + name + " has block special code");
        funs.push( arguments[3] ); // block fun
	  }

	  name = name.toLowerCase();
	  commands[name] = funs;
	  cmdDescriptions[name] = description;
	};

	this.addKeyCode = function(name, keyCodes) {
	  name = name.toLowerCase();
	  if (! (name in commands) ) {
		// Oh oh :-(
		// XXXX Check -- how do JS code usually handle errors like this??
		console.log("No command " + name + ", for keys " + keyCodes
					+ ". Called from " + arguments.callee.caller.toString());
		alert("Failed to find command " + name + ", tried to use with "
			  + keyCodes);
		return;
	  }

      var keycodeArr = keyCodes.toUpperCase().split(/,\s*/);
      for(var i in keycodeArr) {
        var keyCode = keycodeArr[i];
        console.log("Adding '" + keyCode + "' (from " + keyCodes + ")" );
        keyCommandList[keyCode] = name;
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

	  console.log("Has following key cmds " + _.keys(keyCommandList));
	  console.log("Has following named funs " + _.keys(commands));

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
		  console.log("CMD named " + val + ", val " + commands[val]);
          match     = selectFun(commands[val]);
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
		  val       = keyCommandList[check]; // Command name
          console.log("Fallback: " + check + ", name " + val);

          if ( val in commands ) {
			var fun = selectFun(commands[val]);
            console.log("FUN: " + fun);
			return fun;
          } else
            console.log("Command -- but no fun for Fallback:" + check);
        }
      }

      return undefined;
    };
  };
}();

