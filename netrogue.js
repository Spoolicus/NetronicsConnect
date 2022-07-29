let lastKey;
let keyBuffer;
let dirty = false;
let entities = [];

let rooms = [];

//Actors
let player = {};
let kobold = {};
let goblin = {};

const title = 'netROGUE';

const MWIDTH = 36;
const MHEIGHT = 18;

const map = new Array(MWIDTH*MHEIGHT);
const visible = new Array(MWIDTH*MHEIGHT);
const explored = new Array(MWIDTH*MHEIGHT);

const TileType = {
	Wall: "#",
	Floor: ".",
	DownStairs: "▼"
};
const Rect = {
	x1: Number,
	x2: Number,
	y1: Number,
	y2: Number,
	new: function(x, y, w, h) {
		var newRect = Object.create(Rect);
		newRect.x1 = x;
		newRect.x2 = x+w;
		newRect.y1 = y;
		newRect.y2 = y+h;
		return newRect;
	},
	intersect: function(other) {
		return (this.x1 <= other.x2 && this.x2 >= other.x1 && this.y1 <= other.y2 && this.y2 >= other.y1);
	},
	center: function() {
		return [Math.round((this.x1  + this.x2) / 2), Math.round((this.y1 + this.y2) / 2)];
	}
}

function getName() {
    return title;
}

function onConnect() {
    // Reset the server variables when a new user connects:
    lastKey = '';
    keyBuffer = loadData();
	enemies = [];
	dirty = true;
	cast();
	new_floor();
	var frc = rooms[0].center();

	player.goto(frc[0], frc[1]);


	entities.push(player);

}

function onUpdate() {
    // It is safe to completely redraw the screen during every update:
	if (dirty) {
		clearScreen();

		drawBox(10, 0, 0, 56, 20);
		drawText('╣' + title + '╠', 14, 22, 0);

		simpleFOV([player.x, player.y], 5.5);

		renderMap(1, 1);

		dirty = false;

	}

}

function onInput(key) {

}

function new_floor() {
	for (var i = 0; i < MWIDTH*MHEIGHT; i++) {
		map[i] = TileType.Wall;
		visible[i] = false;
		explored[i] = false;
	}
	var maxRooms = 20;
	var minSize = 4;
	var maxSize = 8;

	for (var i = 0; i < maxRooms; i++) {
		var w = getRandomInt(minSize, maxSize);
		var h = getRandomInt(minSize, maxSize);
		var x = getRandomInt(1, MWIDTH - w - 1) -1;
		var y = getRandomInt(1, MHEIGHT - h - 1) -1;
		var newRoom = Rect.new(x, y, w, h);
		var ok = true;
		for(var j = 0; j < rooms.length; j++) {
			if (newRoom.intersect(rooms[j])) {
				ok = false;
			}
		}
		if (ok) {
			map = applyRoomToMap(newRoom, map);

			if(rooms.length != 0) {
				var newXY = newRoom.center();
				var prevXY = rooms[rooms.length-1].center();
				if (getRandomInt(0, 2) == 1) {
					map = applyHorizontalTunnel(map, prevXY[0], newXY[0], prevXY[1]);
					map = applyVerticalTunnel(map, prevXY[1], newXY[1], newXY[0]);
				}
				else {
					map = applyVerticalTunnel(map, prevXY[1], newXY[1], prevXY[0]);
					map = applyHorizontalTunnel(map, prevXY[0], newXY[0], newXY[1]);
				}
			}
			if(i > 0) {
				placeEntities(newRoom);
			}

			rooms.push(newRoom);
		}
	}
}

function renderMap(xOff, yOff) {
	var x = 0;
	var y = 0;

	drawText("RENDERING", 14, 40, 3)

	for (var i = 0; i < map.length; i++) {
		var color = 1;
		if (visible[i]) {
			switch(map[i]){
				case TileType.Wall:
					color = 10;
					break;
				case TileType.Floor:
					color = 5;
				default:
					break;

			drawText(map[i], color, x+xOff, y+yOff);
			drawText("TILE VISIBLE!!!", 14, 40, 6)
			}
		} else if(explored[i]) {
			switch(map[i]){
				case TileType.Wall:
					color = 5;
					break;
				case TileType.Floor:
					color = 2;
					break;
				default:
					break;
			}
			drawText(map[i], color, x+xOff, y+yOff);
			drawText("TILE EXPLORED!!!", 14, 40, 7)
		}

		//Move coords
		x += 1;
		if (x == MWIDTH) {
			x = 0;
			y += 1;
		}
	}

	for(var i = 0; i < entities.length; i++) {
		//if (visible[rl.xyIndex(entity.x, entity.y)]) {
		//	rl.print(entity.x, entity.y, entity.char, entity.color)
		//}
		entity = entities[i];
		if (visible[xy_idx(entity.x, entity.y)]) {
			drawText(entity.char, entity.color, entity.x+xOff, entity.y+yOff);
		}
	}
}

function applyRoomToMap(room, map) {
	for(y = room.y1+1; y <= room.y2; y++) {
		for(x = room.x1+1; x <= room.x2; x++) {
			map[xy_idx(x, y)] = TileType.Floor;
		}
	}
	return map;
}

function applyHorizontalTunnel(map, x1, x2, y) {
	for(x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
		var idx = xy_idx(x, y);
		if (idx > 0 && idx < MWIDTH*MHEIGHT) {
			map[idx] = TileType.Floor;
		}
	}
	return map;
}

function applyVerticalTunnel(map, y1, y2, x) {
	for(y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
		var idx = xy_idx(x, y);
		if (idx > 0 && idx < MWIDTH*MHEIGHT) {
			map[idx] = TileType.Floor;
		}
	}
	return map;
}

function placeEntities(room) {
	let center = room.center();
	var rand = Math.random();
	if (rand < 0.8) {
		var clone = kobold.spawn(center[0], center[1]);
		entities.push(clone);
	} else {
		var clone = goblin.spawn(center[0], center[1]);
		entities.push(clone);
	}
}

function newEnemy(x, y, health) {
	const enemy = {
		x: x,
		y: y,
		health: health
	}
	return enemy
}

function xy_idx(x, y) {
	return parseInt((y*MWIDTH) + x);
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

function cast() {
	player = new Actor("O", 14, "Player", true, new CombatStats(30, 2, 5));
	kobold = new Actor("k", 14, "Kobold", true, new CombatStats(8, 0, 3));
	goblin = new Actor("g", 14, "Goblin", true, new CombatStats(12, 1, 4));
}

function Actor(char, color, name, x, y, blocksTile, combatStats) {
	this.x = x;
	this.y = y;
	this.char = char;
	this.color = color;
	this.name = name;
	this.blocksTile = blocksTile;
	this.CombatStats = CombatStats;
	this.spawn = function(x, y) {
		var clone = new Actor(this.char, this.color, this.name, this.blocksTile, this.CombatStats);
		clone.x = x;
		clone.y = y;
		return clone;
	}
	this.goto = function(x, y) {
		this.x = x;
		this.y = y;
	}
}

function CombatStats(maxHP, defense, power) {
	this.maxhp = maxHP;
	this.hp = maxHP;
	this.defense = defense;
	this.power = power;
	this.takeDamage = function(value) {
		this.hp = Math.max(0, min(this.hp-value, this.maxhp));
	}
}

// FIELD OF VIEW DONT TOUCH LMAO
function computeFov(origin, radius) {
	let top = new Slope(1, 1);
	let bottom = new Slope(0, 1);

	for (var i = 0; i < MWIDTH*MHEIGHT; i++) {
		visible[i] = false;
	}
	_setVisible(origin[0], origin[1]);

	for (octant = 0; octant < 8; octant++) {computeOct(octant, origin, radius, 1, top, bottom)}
}

function computeOct(octant, origin, radius, x, top, bottom) {
	for(; x <= radius; x++) {
		let topY;
		if (top.X == 1) {
			topY = parseInt(x);
		} else {
			topY = parseInt(((x*2-1) * top.Y + top.X) / (top.X*2));
			if(blocksLight(x, topY, octant, origin)) {
				if (top.GreaterOrEqual(topY*2+1, x*2) && !blocksLight(x, topY+1, octant, origin)) {topY++};
			} else {
				let ax = parseInt(x*2);
				if (blocksLight(x+1, topY+1, octant, origin)) {ax++;}
				if (top.Greater(topY*2+1, ax)) {topY++;}
			}
		}

		let bottomY;
		if(bottom.Y == 0) {
			bottomY = parseInt(0);
		} else {
			bottomY = parseInt(((x*2-1) * bottom.Y + bottom.X) / (bottom.X*2));
			if (bottom.GreaterOrEqual(bottomY*2+1, x*2) &&
			blocksLight(x, bottomY, octant, origin) &&
			!blocksLight(x, bottomY+1, octant, origin)) {
				bottomY++;
			}
		}

		let wasOpaque = parseInt(-1);
		for (var y = parseInt(topY); parseInt(y) >= parseInt(bottomY); y--) {
			if(radius < 0 || getDistanceToZero(parseInt(x), parseInt(y)) <= radius) {
				let isOpaque = blocksLight(x, y, octant, origin);
				let isVisible = (isOpaque ||
					((y != topY || top.GreaterOrEqual(y, x)) &&
					(y != bottomY || bottom.LessOrEqual(y, x))));

				if (isVisible) {setVisible(x, y, octant, origin);}

				if (x != radius) {
					if (isOpaque) {
						if (wasOpaque == 0) {
							let nx = parseInt(x*2);
							let ny = parseInt(y*2+1);
							//if (blocksLight(x, y+1, octant, origin)) {nx--;}
							if (top.Greater(ny, nx)) {
								if (y == bottomY) {bottom = new Slope(ny, nx); break;}
								else {
									computeOct(octant, origin, radius, x+1, top, new Slope(ny, nx))};
							} else {
								if (y==bottomY) {return;}
							}
						}
						wasOpaque = 1;
					} else {
						if (wasOpaque > 0) {
							let nx = parseInt(x*2);
							let ny = parseInt(y*2+1);

							//if (blocksLight(x+1, y+1, octant, origin)) {nx++;}
							if(bottom.GreaterOrEqual(ny, nx)) {return;}
							top = new Slope(ny, nx);
						}
						wasOpaque = 0;
					}
				}
			}
		}
		if (wasOpaque != 0) {break;}
	}
}

function computeShadowcast(octant, origin, radius, x, top, bottom) {
	for(; x <= parseInt(radius); x++) {
		let topY;
		topY = top.X == 1 ? x : ((x*2+1) * top.Y + top.X - 1) / (top.X*2);
		let bottomY;
		bottomY = bottom.Y == 0 ? 0 : ((x*2-1) * bottom.Y + bottom.X) / (bottom.X*2);

		let wasOpaque = -1;
		for (let y = topY; y >= bottomY; y--) {
			let tx = origin[0];
			let ty = origin[1];
			switch (octant) {
				case 0: tx += x; ty -= y; break;
          		case 1: tx += y; ty -= x; break;
          		case 2: tx -= y; ty -= x; break;
          		case 3: tx -= x; ty -= y; break;
          		case 4: tx -= x; ty += y; break;
          		case 5: tx -= y; ty += x; break;
          		case 6: tx += y; ty += x; break;
          		case 7: tx += x; ty += y; break;
			}

			let inRange = radius < 0 || getDistanceToZero(tx, ty) <= radius;
			if(inRange && (y != topY || top.Y*x >= top.X*y) && (y != bottomY || bottom.Y*x <= bottom.X*y)) {_setVisible(tx, ty)};

			let isOpaque = !inRange || _blocksLight(tx, ty);
			if (x != radius) {
				if (wasOpaque == 0) {
					let newBottom = new Slope(y*2+1, x*2-1);
					if(!inRange || y == bottomY) {bottom = newBottom; break;}
					else {computeShadowcast(octant, origin, radius, x+1, top, newBottom)
					};
					wasOpaque = 1;
				}
			}
		}
		if (wasOpaque != 0) {break;}
	}
}

function simpleFOV(origin, radius) {
	for (var i = 0; i < MWIDTH; i++) {
		for (var j = 0; j < MHEIGHT; j++) {
			visible[xy_idx(i, j)] = false;
			var x = i - origin[0];
			var y = j - origin[1];

			var l = Math.sqrt((x*x) + (y*y));
			if (l < radius) {
				if (doFOV(i, j, origin)) {
					_setVisible(i, j);
				}
			}
		}
	}
}

function doFOV(x, y, origin) {
	var vx = x - origin[0];
	var vy = y - origin[1];

	var ox = x + 0.5;
	var oy = y + 0.5;
	var l = Math.sqrt((vx*vx) + (vy+vy));
	vx = vx/l;
	vy = vy/l;
	for (var i = 0; i < parseInt(l); i++) {
		if (_blocksLight(parseInt(ox), parseInt(oy))) {return false;}
		ox +=vx;
		oy+= vy;
	}
	return true;
}

function blocksLight(x, y, octant, origin) {
	let nx = origin[0];
	let ny = origin[1];
	switch(octant)
	{
      case 0: nx += x; ny -= y; break;
      case 1: nx += y; ny -= x; break;
      case 2: nx -= y; ny -= x; break;
      case 3: nx -= x; ny -= y; break;
      case 4: nx -= x; ny += y; break;
      case 5: nx -= y; ny += x; break;
      case 6: nx += y; ny += x; break;
      case 7: nx += x; ny += y; break;
    }
	if (map[xy_idx(nx, ny)] == TileType.Wall) {return true;} else {return false;}
}

function setVisible(x, y, octant, origin) {
	let nx = origin[0];
	let ny = origin[1];
	switch(octant)
	{
      case 0: nx += x; ny -= y; break;
      case 1: nx += y; ny -= x; break;
      case 2: nx -= y; ny -= x; break;
      case 3: nx -= x; ny -= y; break;
      case 4: nx -= x; ny += y; break;
      case 5: nx -= y; ny += x; break;
      case 6: nx += y; ny += x; break;
      case 7: nx += x; ny += y; break;
    }
	_setVisible(nx, ny);
}

function _setVisible(x, y) {
	var idx = xy_idx(x, y)
	visible[idx] = true;
	explored[idx] = true;
}

function _blocksLight(x, y) {
	if(map[xy_idx(x, y)] == TileType.Wall) {return true;} else {return false;}
}

function Slope(y, x) {
	this.Y = y;
	this.X = x;
	this.Greater = function(y, x) {return this.Y * x > this.X * y;};
	this.GreaterOrEqual = function(y, x) {return this.Y * x >= this.X* y;};
	this.Less = function(y, x) {return this.Y*x < this.X * y;};
	this.LessOrEqual = function(y, x) {return this.Y * x <= this.X* y;};
}

function getDistanceToZero(x, y) {
	return (Math.sqrt(Math.pow(y-0, 2) + Math.pow(0-x, 2)));
}
