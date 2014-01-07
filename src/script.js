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

	var getFieldScale = function() {
		var h = game.height;
		var w = game.width;
		var xscale = 1;
		var yscale = 1;
		if(h < 1000) {
			yscale = h / 1000.0;
		}
		if(w < 1500) {
			xscale = w / 1500.0;
		}
		return Math.min(xscale, yscale);
	};

	var adjustMouse = function(e) {
		var x = e.offsetX;
		var y = e.offsetY;
		var factor = 1/getFieldScale();

		return {x: (x-game.width/2)*factor, y: (y-game.height/2)*factor};
	};

	storywar.tabledepth = 0;
	$("#game").mousedown(function(e) {
		var mouse = adjustMouse(e);
		console.log(mouse);
		if(storywar.dragged) {
			stopdrag(e);
		} else {
			var depth = -1;
			var candidate = null;
			for(var k in storywar.allcards) {
				var c = storywar.allcards[k];
				if(c.inbounds(mouse.x, mouse.y) && c.depth > depth) {
					candidate = c;
					depth = c.depth;
				}
			}
			if(candidate) {
				storywar.tabledepth += 1;
				var d = storywar.dragged = candidate;
				storywar.dragoffsetx = d.x - mouse.x;
				storywar.dragoffsety = d.y - mouse.y;
				d.depth = storywar.tabledepth;
				d.domain = "held";
				d.localplayer = true;
			}
		}
	});

	$("#game").mousemove(function(e) {
		var d = storywar.dragged;
		if(d) {
			var mouse = adjustMouse(e);
			d.x = mouse.x + storywar.dragoffsetx;
			d.y = mouse.y + storywar.dragoffsety;
		}
	});

	var stopdrag = function(e) {
		var d = storywar.dragged;
		if(d) {
			var mouse = adjustMouse(e);
			if(mouse.y > game.height-200) {
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
		//ctx.fillRect(0, 0, game.width, game.height-200);
		
		var scale = getFieldScale();

		ctx.translate(w/2, h/2);
		ctx.scale(scale, scale);
		ctx.fillStyle = "#ff00ff";
		ctx.fillRect(-750, -100, 1500, 200);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(-500, -500, 1000, 1000);
		
		var battlefield = null;
		var domains = { background: [], table: [], hand: [], held: [] };
		for(var k in storywar.allcards) {
			var c = storywar.allcards[k];
			var domain = domains[c.domain];
			if(domain) { domain.push(c); }
		};

		// draw background
		if(domains.background.length > 0) {
			ctx.globalAlpha = 0.4;
			ctx.drawImage(domains.background[0].getImage(), -500, -500, 1000, 1000);
			ctx.globalAlpha = 1;
		}

		// draw table
		domains.table.sort(function(a, b) { return a.depth - b.depth; });
		domains.table.forEach(function(c) {
			c.scale = 0.4;
			c.draw(ctx);
		});

		// draw hand
		var hc = domains.hand.length;
		domains.hand.sort(function(a, b) { return a.idx - b.idx; });
		domains.hand.forEach(function(c, i) {
			c.x = game.width * 0.5 + i*100 - hc*100*0.5;
			c.y = game.height-200;
			c.scale = 0.3;
			c.draw(ctx);
		});
		
		// draw item(s) being dragged
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
