storywar = {};

storywar.cards = {};

/**
 * Randomize array element order in-place.
 * Using Fisher-Yates shuffle algorithm.
 * from http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-arrayhttp://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function log(str) {
	$("#log").append($("<p>").html(str));
}

var WARRIORS = ["Anubis", "Bat", "Charizard", "Dragon", "Ectoplasm", 
	"Frightener", "Ghoul", "Hogwarts", "Iguana", "Jackalope",
	"Killbot", "Leopardman", "Mandrake", "No-no", "Octopod",
	"Perseus", "Quickbooks", "Ratatouille", "Serpentra", "Tom McLean",
	"Ursula", "Wyvern", "Yosemite Sam", "Zanzibar"];
var PLACES = ["Atlantis", "Beanstalk", "Cemetary", "Dark Castle", "Edge of the World", "Frost Keep"];
var ITEMS = ["Ankh", "Boomerang", "Cloak", "Didgeridoo", "Electric Suit", "Farcaster"];
var CARDS = function() {
	var cs = {};
	var count = 0;
	for(var i in WARRIORS) {
		cs[count] = { title: WARRIORS[i], id: count, type: 'MO', text: "~" + WARRIORS[i] + "~" };
		count++;
	};
	for(var i in PLACES) {
		cs[count] = { title: PLACES[i], id: count, type: 'LO', text: "~" + PLACES[i] + "~" };
		count++;
	};
	for(var i in ITEMS) {
		cs[count] = { title: ITEMS[i], id: count, type: 'IT', text: "~" + ITEMS[i] + "~" };
		count++;
	};
	return cs;
}();

storywar.initDeck = function() {
	var deckids = [];
	for(var k in CARDS) {
		deckids.push(k);
	}
	shuffleArray(deckids);
	var deckstr = deckids.join(",");
	gapi.hangout.data.submitDelta({'deck': deckstr});
};

storywar.getLocalPlayer = function() {
	var me = gapi.hangout.getLocalParticipant().person.id;
	var meplayer = gapi.hangout.data.getValue(me) || 0;
	return parseInt(meplayer);
};

storywar.claimPlayer = function(i) {
	var me = gapi.hangout.getLocalParticipant().person.id;
	gapi.hangout.data.setValue(me, "" + i);
	$("#hand .card, #otherhand .card").each(function(idx, e) {
		storywar.cards[e.id.substr(1)].dirty = true;
	});
	storywar.updateDecks();
};

storywar.getCardData = function(cid) {
	var data = gapi.hangout.data.getValue('C' + cid);
	return data || "D";
};

storywar.updateDecks = function() {
	var cards = gapi.hangout.data.getValue('deck');
	if(!cards) {
		storywar.initDeck();
	} else {
		cards = cards.split(",");
		for(var i in cards) {
			var cid = cards[i];
			var c = storywar.cards[cid];
			if(!c) {
				// create it
				c = storywar.cards[cid] = new Card(CARDS[cid]);
			}
			c.update(storywar.getCardData(cid));
		};
	}
};

storywar.setCard = function(cid, stat) {
	var data = {};
	data["C" + cid] = stat;
	gapi.hangout.data.submitDelta(data);
};

storywar.draw = function(type) {
	var deck = gapi.hangout.data.getValue('deck').split(",").filter(function(x) {
		return storywar.getCardData(x) == "D" && CARDS[x].type == type;
	});
	if(deck.length > 0) {
		storywar.setCard(deck[0], "H:" + storywar.getLocalPlayer() + ":0");
	};
};

Card = function(data) {
	this.title = data.title;
	this.type = data.type;
	this.id = data.id;
	this.text = data.text;

	var elem = $("<div>")
		.addClass("card")
		.addClass(this.type)
		.attr("id", 'C' + this.id)
		.append( $("<div>").addClass("title").html(this.title));
	this.note = $("<div>").addClass("note").appendTo(elem);
	this.action = $("<div>").addClass("action").appendTo(elem).html("action");
	this.elem = elem;
	this.dirty = false;

	this.data = NaN;
};
var proto = Card.prototype;

proto.drag = function(x, y) {
	this.elem.css({
		left: x - this.dragoffsetx,
		top:  y - this.dragoffsety
	});
};

proto.update = function(data) {
	// data will be in the form of:
	//   D -- in its deck
	//   X -- discarded
	//   H:playerid:idx -- in a player's hand
	//   T:x:y:s -- on the table at (x,y) with status s (turned, flipped etc)
	//   V:playerid -- as a VP for a player
	if(data != this.data || this.dirty) {
		this.data = data;
		this.note.html(data);
		var parts = data.split(":");
		Card.prototype.update[parts[0]].apply(this, parts.slice(1));
	}
};

proto.moveTo = function(id) {
	var elem = this.elem;
	var c = this;
	elem.appendTo($(id));
	elem.mousedown(function(ev) {
		storywar.dragged = c;
		c.startx = elem.css("left");
		c.starty = elem.css("top");
		c.dragoffsetx = ev.clientX - elem.offset().left;
		c.dragoffsety = ev.clientY - elem.offset().top;
		c.note.html(c.dragoffsetx + ", " + c.dragoffsety);
		return false;
	});
};

proto.update.U = function() {
	this.moveTo("#unknown");
};

proto.update.D = function() {
	this.moveTo("#deck");
};

proto.update.X = function() {
	this.moveTo("#discard");
};

proto.update.H = function(playerid, idx) {
	if(parseInt(playerid) == storywar.getLocalPlayer()) {
		this.moveTo("#hand");
	} else {
		this.moveTo("#otherhand");
	}
};

proto.update.T = function(x, y, s) {
	this.moveTo("#table");
};

proto.update.V = function(playerid) {
	this.moveTo("#victory");
};

function onStateChanged(ev) {
	console.log(ev);
	storywar.updateDecks();
}

function init() {
	// When API is ready...                                                         
	/*gapi.hangout.onApiReady.add(
			function(eventObj) {
				if (eventObj.isApiReady) {
					
				}
			});*/

	gapi.hangout.data.onStateChanged.add(onStateChanged);

	$("#field").mousemove(function(ev) {
		if(storywar.dragged) {
			storywar.dragged.drag(ev.clientX, ev.clientY);
		};
	});
	$("#field").mouseup(function(ev) {
		storywar.dragged = null;	
	});
	$("#field").mouseleave(function(ev) {
		storywar.dragged = null;
	});
}

// Wait for gadget to load.                                                       
gadgets.util.registerOnLoadHandler(init);
