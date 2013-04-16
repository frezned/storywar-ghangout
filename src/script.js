storywar = {};

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
	var l = document.getElementById("log");
	var p = document.createElement("p");
	p.innerHTML = str;
	l.appendChild(p);
}

function showParticipants() {
	var participants = gapi.hangout.getParticipants();

	var retVal = '<p>Participants: </p><ul>';

	for (var index in participants) {
		var participant = participants[index];

		if (!participant.person) {
			retVal += '<li>A participant not running this app</li>';
		}
		retVal += '<li>' + participant.person.displayName + '</li>';
	}

	retVal += '</ul>';

	var div = document.getElementById('participantsDiv');

	div.innerHTML = retVal;
}

var CARDS = ["Anubis", "Bat", "Charizard", "Dragon", "Ectoplasm", 
	"Frightener", "Ghoul", "Hogwarts", "Iguana", "Jackalope",
	"Killbot", "Leopardman", "Mandrake", "No-no", "Octopod",
	"Perseus", "Quickbooks", "Ratatouille", "Serpentra", "Tom McLean",
	"Ursula", "Wyvern", "Yosemite Sam", "Zanzibar"];

storywar.initDeck = function() {
	var deckids = [];
	for(var i = 0; i < 10; ++i) {
		deckids.push(i);
	}
	shuffleArray(deckids);
	var deckstr = deckids.join(",");
	gapi.hangout.data.submitDelta({"deck": deckstr});
	log("sent: " + deckstr);
};

storywar.showDeck = function() {
	// grab data
	var deckState = gapi.hangout.data.getValue('deck');
	if(deckState) {
		var ids = deckState.split(",");
		// remove all current items
		var deckElem = document.getElementById("deck");
		while(deckElem.firstChild) { deckElem.removeChild(deckElem.firstChild); } 
		// populate deck list
		for(var i in ids) {
			var idx = parseInt(ids[i]);
			var pelem = document.createElement("p");
			pelem.innerHTML = CARDS[idx];
			deckElem.appendChild(pelem);
		}
	}
};

function onStateChanged(ev) {
	storywar.showDeck();
}

function init() {
	// When API is ready...                                                         
	gapi.hangout.onApiReady.add(
			function(eventObj) {
				if (eventObj.isApiReady) {
					document.getElementById('showParticipants')
					.style.visibility = 'visible';
				}
			});

	gapi.hangout.data.onStateChanged.add(onStateChanged);
}

// Wait for gadget to load.                                                       
gadgets.util.registerOnLoadHandler(init);
