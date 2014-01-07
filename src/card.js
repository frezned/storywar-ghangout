(function() {

domain = "http://cantripgames.com/hangout/";

makeImg = function(src) {
	var img = new Image();
	img.src = src;
	return img;
};
frames = {
	MO: makeImg(domain + "frame_MO_w.png"),
	LO: makeImg(domain + "frame_LO_w.png"),
	IT: makeImg(domain + "frame_IT_w.png")
}

Card = function(data) {
	this.title = data.title;
	this.id = data.id;
	this.text = data.text;
	this.type = data.type;
	this.visible = false;
	this.turned = false;
	this.flipped = false;

	this.x = 0;
	this.y = 0;
	this.scale = 1.0;

	this.startx = 0;
	this.starty = 0;

	this.currentx = 0;
	this.currenty = 0;
	this.currentscale = 1.0;
	this.tweentime = 1;

	this.domain = "deck";
	this.imgurl = data.art;
	this.data = null;
	this.depth = 0;
};

var cp = Card.prototype;

var CARDW = 63*6;
var CARDH = 88*6;
var IMGX = (56/630.0)*CARDW;
var IMGY = (151/880.0)*CARDH;
var IMGSIZE = (517/630.0)*CARDW;
var TITLEX = CARDW*0.5;
var TITLEY = (120/880.0)*CARDH;
var TEXTX = CARDW*0.5;
var TEXTY = (740/880.0)*CARDH;
var TEXTLINE = (35/880.0)*CARDH;

cp.inbounds = function(x, y) {
	if(this.visible && this.tweentime >= 1) {
		return (x >= this.x && y >= this.y && x < this.x + CARDW*this.scale && y < this.y + CARDH*this.scale);
	} else {
		return false;
	}
};

function tween(start, end, amount) {
	if(amount <= 0) {
		return start;
	} else if(amount >= 1) {
		return end;
	} else {
		var d = end - start;
		var progress = 0.5 - 0.5 * Math.cos(Math.PI * amount);
		return start + d * progress;
	}
};

cp.moveTo = function(x, y) {
	this.startx = this.x;
	this.starty = this.y;
	this.x = x;
	this.y = y;
	if(this.localplayer) {
		this.currentx = x;
		this.currenty = y;
		this.tweenamount = 1;
	} else {
		this.tweenamount = 0;
	}
};

cp.tick = function(dt) {
	this.tweenamount += dt;
	if(this.localplayer) {
		this.currentx = this.x;
		this.currenty = this.y;
	} else if(this.tweenamount <= 1) {
		this.currentx = tween(this.startx, this.x, this.tweenamount);
		this.currenty = tween(this.starty, this.y, this.tweenamount);
	}
};

cp.draw = function(ctx) {
	this.tick(1/30.0);

	ctx.save();

	ctx.translate(this.currentx, this.currenty);
	ctx.scale(this.scale, this.scale);
	ctx.translate(-CARDW/2, -CARDH/2);

	if(!this.image) {
		this.image = makeImg(this.imgurl);
	};

	ctx.fillStyle = "#000";
	ctx.drawImage(frames[this.type], 0, 0, CARDW, CARDH);
	ctx.drawImage(this.image, IMGX, IMGY, IMGSIZE, IMGSIZE);
	ctx.font = "24pt Arial";
	ctx.textAlign = "center";
	ctx.fillText(this.title, TITLEX, TITLEY);
	ctx.font = "12pt Arial";
	var split = this.text.split("\n");
	for(var i in split) {
		ctx.fillText(split[i], TEXTX, TEXTY + TEXTLINE * i);
	}

	if(!this.localplayer && this.tweenamount < 1.4) {
		ctx.globalAlpha = tween(1.0, 0.0, (this.tweenamount-1)/0.4);
		ctx.drawImage(storywar.handicon, CARDW-100, -80, 200, 200);
		ctx.font = "48pt Arial";
		ctx.fillText(this.activeplayer, CARDW+10, 20);
	}

	ctx.restore();
};

cp.update = function(data) {
	// data will be in the form of:
	//   D:pid -- in its deck
	//   X:pid -- discarded
	//   H:pid:idx -- in a player's hand
	//   T:pid:x:y:s -- on the table at (x,y) with status s (turned, flipped etc)
	//   V:pid -- as a VP for a player
	if(data != this.data || this.dirty) {
		this.data = data;
		var parts = data.split(":");
		this.activeplayer = parseInt(parts[1]);
		this.localplayer = (this.activeplayer == storywar.getLocalPlayer());
		cp.update[parts[0]].apply(this, parts.slice(2));
	}
};

cp.update.U = function() {
	this.visible = false;
	this.domain = "unknown";
};

cp.update.D = function() {
	this.visible = false;
	this.domain = "deck";
};

cp.update.X = function() {
	this.visible = false;
	this.domain = "discard";
};

cp.update.H = function(idx) {
	if(this.localplayer) {
		this.visible = true;
		this.domain = "hand";
		this.idx = parseInt(idx);
	} else {
		this.visible = false;
		this.domain = "otherhand";
	}
};

cp.update.T = function(x, y, s) {
	x = parseFloat(x);
	y = parseFloat(y);
	this.visible = true;
	if(this.domain != "table") {
		this.x = x;
		this.y = y - 150;
	}
	this.moveTo(x, y);
	this.flipped = (s.indexOf('f') >= 0);
	this.turned = (s.indexOf('t') >= 0);
	this.domain = "table";
	storywar.tabledepth = storywar.tabledepth + 1;
	this.depth = storywar.tabledepth;
};

cp.update.V = function() {
	this.visible = true;
	this.flipped = false;
	this.domain = "victory";
};

cp.mousedown = function() {
	
};

})();
