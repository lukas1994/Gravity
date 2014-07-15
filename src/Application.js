import ui.View;
import ui.ImageView;
import ui.SpriteView;
import ui.TextView;
import ui.ImageScaleView;
import ui.resource.loader as loader;
import ui.widget.SliderView as SliderView;

import math.geom.Rect as Rect;
import math.geom.Point as Point;
import math.geom.Circle as Circle;
import math.geom.Line as Line;
import math.geom.intersect as intersect;

import AudioManager;

import src.gravity.ParallaxView as ParallaxView;
import src.gravity.Physics as Physics;
import src.gravity.util as util;

exports = Class(GC.Application, function () {

	const GRAVITY = 1400;
	const PLAYER_INITIAL_SPEED = 400;
	const PLAYER_ACCELERATION = 170;

	const WORLD_SPEED = 300;

	const TOP_BORDER_HEIGHT = 50;
	const BOTTOM_BORDER_HEIGHT = 50;
	const CIRCLE_RADIUS = 50;
	const MAX_X_VELOCITY = 600;
	const MAX_Y_VELOCITY = 600;

	const DIST_TO_RIGHT_BORDER = 200;

	this.initUI = function () {
		util.scaleRootView(this, 1024, 576);

		this.resetState();
		this.setupParallaxView();
		this.setupPlayer();
		this.setupUILayer();
		this.loadSound();
		this.startGame();

		Physics.start();

		// start ticking
		this.loaded = true;
	}

	this.setupParallaxView = function() {
		this.parallaxView = new ParallaxView({
		  superview: this.view,
			x: 0,
			y: 0,
		  width: this.view.style.width - 40,
		  height: this.view.style.height,
		});
		this.parallaxView.addBackgroundView(new ui.ImageScaleView({
			scaleMethod: 'cover',
			image: "resources/images/background.png",
		}));

		this.gameLayer = this.parallaxView.addLayer({
			distance: 7,
			populate: function (layer, x) {
				return this.populateGameLayer(layer, x);
			}.bind(this)
		});
	}

	this.setupPlayer = function () {
		this.player = new ui.SpriteView({
			zIndex: 1,
			x: 0,
			y: 0,
			anchorX: CIRCLE_RADIUS,
			anchorY: CIRCLE_RADIUS,
			autoSize: true,
			url: 'resources/images/player/player',
		  defaultAnimation: 'normal',
			autoStart: true
		});

		Physics.addToView(this.player, {
			hitbox: {
				x: 0,
				y: 0,
				width: 2*CIRCLE_RADIUS,
				height: 2*CIRCLE_RADIUS,
			}
		});
	}

	this.setupUILayer = function () {
		this.scoreView = new ui.TextView({
			superview: this.view,
    	x: 0,
    	y: 0,
    	width: this.view.style.width,
    	height: TOP_BORDER_HEIGHT,
    	autoSize: false,
			autoFontSize: true,
			fontFamily: "sans-serif",
			fontWeight: "bold",
    	verticalAlign: 'center',
    	textAlign: 'center',
    	multiline: false,
    	color: '#000000'
		});
		this.resultView = new ui.TextView({
			superview: this.view,
			zIndex: 2,
			x: 0,
			y: 0,
			width: this.view.style.width,
			height: this.view.style.height,
			wrap: true,
			size: 70,
			autoFontSize: false,
			autoSize: false,
			fontFamily: "sans-serif",
			fontWeight: "bold",
			verticalAlign: 'middle',
			horizontalAlign: 'center',
			color: '#000000',
			backgroundColor: '#FFFFFF'
		});
		this.resultView.on('InputStart', bind(this, "onTryAgainClicked"));
		this.gravitySlider = new SliderView({
			superview: this.view,
			minValue: -100,
			maxValue: 100,
			value: 10,
			active: true,

			track: {
				activeColor: '#EE9900',
				inactiveColor: '#E0E0E0'
			},
			thumb: {
				activeColor: '#FFBB00',
				pressedColor: '#990000',
				inactiveColor: '#B0B0B0'
			},

			x: this.view.style.width - 60,
			y: TOP_BORDER_HEIGHT,
			width: 60,
			height: this.view.style.height - TOP_BORDER_HEIGHT - BOTTOM_BORDER_HEIGHT
		});
		this.gravitySlider.on('Change', bind(this, "onChangeGravity"));
	}

	// UI event handling
	this.onChangeGravity = function (value) {
		this.player.acceleration.y = value * GRAVITY / 100;
	}
	this.onTryAgainClicked = function(event, point) {
		this.startGame();
	}

	this.loadSound = function () {
		this.sound = new AudioManager({
			path: "resources/audio/",
			files: {
				background: { volume: 1, background: true }
			}
		});
	}

	this.populateGameLayer = function (layer, x) {
		if (x > 300) {
			var top = util.choice([false, true]);
			var minHeight = 2*CIRCLE_RADIUS;
			var maxHeight = this.view.style.height - 2*CIRCLE_RADIUS - BOTTOM_BORDER_HEIGHT - TOP_BORDER_HEIGHT;
			var height = util.randInt(minHeight, (maxHeight*0.8) | 0);
			var width = util.randInt(20, this.view.style.width - 3*CIRCLE_RADIUS);
			var y = top ? 0 : this.view.style.height - height - BOTTOM_BORDER_HEIGHT + 1;

			var obstacle = layer.obtainView(ui.View, {
				superview: layer,
				x: x,
				y: y,
				width: width,
				height: height,
				backgroundColor: '#ffffff'
			});
			Physics.addToView(obstacle, {group: 'obstacle'});
	  }

		var top = layer.obtainView(ui.View, {
			superview: layer,
			x: x,
			y: 0,
			width: this.view.style.width + 1,
			height: TOP_BORDER_HEIGHT,
			backgroundColor: '#ffffff'
		});
		var bottom = layer.obtainView(ui.View, {
			superview: layer,
			x: x,
			y: this.view.style.height - BOTTOM_BORDER_HEIGHT,
			width: this.view.style.width + 1,
			height: BOTTOM_BORDER_HEIGHT,
			backgroundColor: '#ffffff'
		});
		Physics.addToView(top, {group: "border_top"});
		Physics.addToView(bottom, {group: "border_bottom"});

		return this.view.style.width;
	}

	this.resetState = function () {
		this.t = 0;
		this.isFinished = false;
		this.score = 0;
	}

	this.startGame = function() {
		setTimeout(function () {
			// This is in a setTimeout because some desktop browsers need
			// a moment to prepare the sound (this is probably a bug in DevKit)
			this.sound.play("background");
		}.bind(this), 10);

		this.resultView.hide();
		this.gravitySlider.show();

		this.resetState();
		this.parallaxView.scrollTo(0, 0);
		this.parallaxView.clear();
		this.gameLayer.addSubview(this.player);
		this.player.setCollisionEnabled(true);
		this.player
			.setPosition(100, 300)
			.setVelocity(PLAYER_INITIAL_SPEED, -400)
			.setVelocityMax(MAX_X_VELOCITY, MAX_Y_VELOCITY)
			.setAcceleration(PLAYER_ACCELERATION, 0);
	};

	this.finishGame = function() {
		if (!this.isFinished) {
			this.isFinished = true;
			this.resultView.show();
			this.resultView.setText("GAME OVER: " + this.score + " POINTS CLICK TO TRY AGAIN");
			this.gravitySlider.hide();
		}
	}

	this.tick = function (dtMS) {
		if (!this.loaded) {
			return;
		}

		var dt = Math.min(dtMS / 1000, 1/30); // convert to seconds
		this.t += dt;

		if (this.isFinished) {
			return;
		} else {
			this.score = this.player.getRight() | 0;
		}

		this.scoreView.setText(this.score | 0);

		// if player is faster than the world, let world move faster
		this.t = Math.max(this.t, (this.player.getRight() + DIST_TO_RIGHT_BORDER - this.view.style.width) / WORLD_SPEED);
		this.gameLayer.scrollTo(this.t * WORLD_SPEED);

		// collision handling
		var hits = this.player.getCollisions("border_top");
		for (var i = 0; i < hits.length; i++) { // hit
			this.player.velocity.y = 0;
			if (this.player.acceleration.y < 0)
				this.player.acceleration.y = 0;
			this.player.position.y += hits[i].intersection.height;
		}
		var hits = this.player.getCollisions("border_bottom");
		for (var i = 0; i < hits.length; i++) { // hit
			this.player.velocity.y = 0;
			if (this.player.acceleration.y > 0)
				this.player.acceleration.y = 0;
			this.player.position.y -= hits[i].intersection.height;
		}
		var hits = this.player.getCollisions("obstacle");
		for (var i = 0; i < hits.length; i++) { // hit
			// top
			if (this.player.getBottom() > hits[i].view.getTop() &&
							this.player.getTop() < hits[i].view.getTop() &&
						  this.player.getRight() > hits[i].view.getLeft() + 10) {
				if (hits[i].intersection.height < 10)
					this.player.position.y -= hits[i].intersection.height;
				this.player.velocity.y = 0;
			}
			// bottom
			else if (this.player.getTop() < hits[i].view.getBottom() &&
							this.player.getBottom() > hits[i].view.getBottom() &&
						  this.player.getRight() > hits[i].view.getLeft() + 10) {
				if (hits[i].intersection.height < 10)
					this.player.position.y += hits[i].intersection.height;
				this.player.velocity.y = 0;
			}
			// left
			else if (this.player.getRight() > hits[i].view.getLeft() &&
			    this.player.getLeft() < hits[i].view.getLeft() &&
		      (this.player.getTop() < hits[i].view.getBottom() ||
				   this.player.getBottom() > hits[i].view.getTop())) {
				this.player.velocity.x = 0;
				if (hits[i].intersection.width < 10)
					this.player.position.x -= hits[i].intersection.width;
				this.player.acceleration.x = PLAYER_ACCELERATION;
			}
		}

		// check if the player left the screen
		if (this.player.getRight() < this.t * WORLD_SPEED) {
			this.finishGame();
		}
	}
});
