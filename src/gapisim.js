(function() {

	gapi = {};
	gapi.hangout = {};
	gapi.hangout.data = {};

	var __localdict = {};
	var __handlers = [];

	var update = function(delta) {
		console.log(delta);
		for(var o in delta) {
			__localdict[o] = delta[o];
		}
		__handlers.forEach(function(a) { a(); });
	};

	gapi.hangout.getLocalParticipant = function() {
		return { person: { id: 0 } };
	};

	gapi.hangout.data.getValue = function(key) {
		return __localdict[key];
	};

	gapi.hangout.data.setValue = function(key, value) {
		var delta = {};
		delta[key] = value;
		gapi.hangout.data.submitDelta(delta);
	};

	gapi.hangout.data.submitDelta = function(delta) {
		setTimeout(function() {
			update(delta);
		}, 100);
	};

	gapi.hangout.data.onStateChanged = {};
	gapi.hangout.data.onStateChanged.add = function(handler) {
		__handlers.push(handler);
	};

	gadgets = { util: { registerOnLoadHandler: function(init) {
										  console.log("--GAPI Simulator--");
										  $(init);
									  }
		   }
 };

})();
