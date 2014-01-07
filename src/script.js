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

storywar.initDeck = function() {
	var deckids = [];
	for(var k in storywar.allcards) {
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
			var c = storywar.allcards[cid];
			if(!c) {
				// TODO create it
			}
			c.update(storywar.getCardData(cid));
		};
	}
};

storywar.setCard = function(cid, stat) {
	var data = {};
	data["C" + cid] = stat;
	console.log(data);
	gapi.hangout.data.submitDelta(data);
};

storywar.draw = function(type) {
	var deck = (gapi.hangout.data.getValue('deck') || "").split(",").filter(function(x) {
		return storywar.getCardData(x) == "D" && storywar.allcards[x].type == type;
	});
	if(deck.length > 0) {
		storywar.setCard(deck[0], "H:" + storywar.getLocalPlayer() + ":0");
	};
};

function onStateChanged(ev) {
	storywar.updateDecks();
}

function init() {
	// When API is ready...                                                         
	gapi.hangout.onApiReady.add(
			function(eventObj) {
				if (eventObj.isApiReady) {
					if(!gapi.hangout.data.getValue("deck")) {
						storywar.initDeck();
					};
				}
			});

	gapi.hangout.data.onStateChanged.add(onStateChanged);

	storywar.handicon = makeImg(domain + "hand.png");
	storywar.allcards = {};
	var seturl = "https://s3.amazonaws.com/cantriphangout/base.json";
	$.getJSON(seturl, function(data) {
		storywar.allcards = {};
		for(var i in data.cards) {
			var c = new Card(data.cards[i]);
			storywar.allcards[c.id] = c;
		}
	});

	storywar.tabledepth = 0;
	$("#game").mousedown(function(e) {
		if(storywar.dragged) {
			stopdrag(e);
		} else {
			var depth = -1;
			var candidate = null;
			for(var k in storywar.allcards) {
				var c = storywar.allcards[k];
				if(c.inbounds(e.offsetX, e.offsetY) && c.depth > depth) {
					candidate = c;
					depth = c.depth;
				}
			}
			if(candidate) {
				storywar.tabledepth += 1;
				var d = storywar.dragged = candidate;
				storywar.dragoffsetx = d.x - e.offsetX;
				storywar.dragoffsety = d.y - e.offsetY;
				d.depth = storywar.tabledepth;
				d.domain = "held";
				d.localplayer = true;
			}
		}
	});

	$("#game").mousemove(function(e) {
		var d = storywar.dragged;
		if(d) {
			d.x = e.offsetX + storywar.dragoffsetx;
			d.y = e.offsetY + storywar.dragoffsety;
		}
	});

	var stopdrag = function(e) {
		var d = storywar.dragged;
		if(d) {
			if(e.offsetY > game.height-200) {
				storywar.setCard(d.id, "H:" + storywar.getLocalPlayer() + ":0");
				d.domain = "hand";
			} else {
				storywar.setCard(d.id, "T:" + storywar.getLocalPlayer() + ":" + d.x + ":" + d.y + ":-");
				d.domain = "table";
			}
		}
		storywar.dragged = null;
	};
	//$("#game").mouseleave(stopdrag);
	//$("#game").mouseup(stopdrag);

	var onresize = function() {
		game.width = $("#table").width();
		game.height = $("#table").height();
	};
	onresize();
	$(window).resize(onresize);

	setInterval(function() {
		var w = game.width;
		var h = game.height;
		var ctx = game.getContext("2d");
		ctx.save();
		ctx.fillStyle = "#ccffcc";
		ctx.fillRect(0, 0, game.width, game.height);
		ctx.fillStyle = "#ccaacc";
		//ctx.fillRect(0, 0, game.width, game.height-200);

		ctx.translate(w/2, h/2);
		ctx.fillRect(-500, -500, 1000, 1000);
		
		var domains = { table: [], hand: [], held: [] };
		for(var k in storywar.allcards) {
			var c = storywar.allcards[k];
			var domain = domains[c.domain];
			if(domain) { domain.push(c); }
		};

		domains.table.sort(function(a, b) { return a.depth - b.depth; });
		domains.table.forEach(function(c) {
			c.scale = 0.4;
			c.draw(ctx);
		});
		var hc = domains.hand.length;
		domains.hand.sort(function(a, b) { return a.idx - b.idx; });
		domains.hand.forEach(function(c, i) {
			c.x = game.width * 0.5 + i*100 - hc*100*0.5;
			c.y = game.height-200;
			c.scale = 0.3;
			c.draw(ctx);
		});
		domains.held.forEach(function(c) {
			c.scale = 0.5;
			c.draw(ctx);
		});
		ctx.restore();

	}, 30);
	
	if(gapi.simulator) {
		gapi.simulator.ready();
	};
}

// Wait for gadget to load.                                                       
gadgets.util.registerOnLoadHandler(init);
