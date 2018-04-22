(function() {

	'use strict';

	// Set up canvas element and rendering context
	const canvas = document.querySelector('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	const ctx = canvas.getContext('2d');



	// ################################################################################
	// #                          USER VARIABLES + GAME DATA                          #
	// ################################################################################


	window.Canvas = {

		bgColor: getComputedStyle(document.querySelector('body', null)).getPropertyValue('background-color'),

		// Performance measurement
		delta: 0,
		prevTime: Date.now(),
		frameCount: 0,
		deltaElt: document.getElementById('delta'),
		fpsElt: document.getElementById('fps'),

		// User options
		options: {
			editMode: 0,
			textureToUse: 2,
			zoom: 1,
			offset: new Vector()
		},

		// Input tracking
		mouse: {position: new Vector(), left: false, right: false},
		keys: [
			{ name: "up"  , code: 38, pressed: false },
			{ name: "down", code: 40, pressed: false },
			{ name: "w"   , code: 87, pressed: false },
			{ name: "a"   , code: 65, pressed: false },
			{ name: "s"   , code: 83, pressed: false },
			{ name: "d"   , code: 68, pressed: false },
			{ name: "q"   , code: 81, pressed: false }
		],

		// Game data
		grid: [[]],
		tileCount: 0,
		textures: [
			{ top: "#888888", front: "#666666", side: "#777777" }, // Grey
			{ top: "#1166DD", front: "#0944AA", side: "#0F54BA" }, // Blue
			{ top: "#5522AA", front: "#330088", side: "#441199" }, // Purple
			{ top: "#991111", front: "#770000", side: "#880505" }, // Red
			{ top: "#BBBB00", front: "#999900", side: "#AAAA00" }, // Yellow
			{ top: "#338800", front: "#115500", side: "#216500" }, // Green
			{ top: "#11AAAA", front: "#008888", side: "#059999" }  // Turquoise
		]

	};



	// ################################################################################
	// #                        TILE RENDERING + CALCULATIONS                         #
	// ################################################################################


	const isOnTile = (p, tile, tileSize) => {

		// Centre tile at (0, 0)
		const point = Vector.sub(p, tile);

		// Gradients of sides
		const southEast = ( tileSize / 2) / tileSize;
		const northEast = (-tileSize / 2) / tileSize;

		// Check each side with simple straight line equations
		const topLeft     = point.y >= northEast * point.x - tileSize / 2;
		const topRight    = point.y >= southEast * point.x - tileSize / 2;
		const bottomLeft  = point.y <= southEast * point.x + tileSize / 2;
		const bottomRight = point.y <= northEast * point.x + tileSize / 2;

		return topLeft && topRight && bottomLeft && bottomRight;

	};

	const drawTop = (c, position, tileSize, fill, stroke) => {

		// Draw the top of a tile
		c.fillStyle = fill;
		c.strokeStyle = stroke;
		c.beginPath();
		c.moveTo(position.x - tileSize, position.y);
		c.lineTo(position.x, position.y - tileSize / 2);
		c.lineTo(position.x + tileSize, position.y);
		c.lineTo(position.x, position.y + tileSize / 2);
		c.closePath();
		c.fill();
		c.stroke();

	};

	const getNeighbours = (x, y, createNonexistent = false) => {

		// Returns coordinates of all four neighbours and can create neighbours if they don't exist

		const neighbours = [];

		if (createNonexistent) {

			// Tile above

			// If on the first row, create new row above
			if (y === 0) {
				Canvas.grid.splice(0, 0, [-1]);
				// The original tile will now have a larger y coordinate
				y++;
				Canvas.options.offset.x += 1;
				Canvas.options.offset.y -= 0.5;
			}
			// Fill all tiles up to the neighbour
			while (Canvas.grid[y - 1].length <= x) Canvas.grid[y - 1].push(-1);


			// Tile to the right

			// If on the end of the row, create tile to the right
			if (x === Canvas.grid[y].length - 1) Canvas.grid[y].push(-1);


			// Tile below

			// If on the last row, create new row below
			if (y === Canvas.grid.length - 1) {
				Canvas.grid.push([-1]);
			}
			// Fill all tiles up to the neighbour
			while (Canvas.grid[y + 1].length <= x) Canvas.grid[y + 1].push(-1);


			// Tile to the left

			// If at the beginning of a row, create column to the left
			if (x === 0) {
				Canvas.grid.forEach(row => row.splice(0, 0, -1));
				// The original tile will have a larger x coordinate
				x++;
				Canvas.options.offset.x -= 1;
				Canvas.options.offset.y -= 0.5;
			}

		}


		neighbours[0] = {y: y - 1, x: x};
		neighbours[1] = {y: y, x: x + 1};
		neighbours[2] = {y: y + 1, x: x};
		neighbours[3] = {y: y, x: x - 1};


		return neighbours;

	};

	const addTile = (x, y, type) => {

		// Adds a tile to the grid and updates neighbour states

		// Can't add tile if it's already there
		if (Canvas.grid[y][x] === type) return;

		if (!Canvas.grid[y][x] || Canvas.grid[y][x] <= 0) {

			// Add new tile

			while (Canvas.grid.length <= y) Canvas.grid.push([-1]);
			while (Canvas.grid[y].length <= x) Canvas.grid[y].push(-1);

			Canvas.grid[y][x] = type;
			Canvas.tileCount++;

			getNeighbours(x, y, true).forEach(t => {
				if (Canvas.grid[t.y][t.x] === -1) Canvas.grid[t.y][t.x] = 0;
			});

		} else {

			// Change tile texture

			if (Canvas.grid[y][x] > 0) Canvas.grid[y][x] = type;

		}

	};

	const removeTile = (x, y) => {

		// Removes a tile from the grid and updates neighbour states

		// Can't remove an empty tile
		if (Canvas.grid[y][x] <= 0) return;

		Canvas.grid[y][x] = 0;
		Canvas.tileCount--;

		// Remove any trailing empty spaces from the row
		const removeTrailing = y => {
			while (Canvas.grid[y][Canvas.grid[y].length - 1] === -1) Canvas.grid[y].pop();
		};

		// Returns true if the tile has at least one neighbour
		const noNeighbours = (x, y) => {
			const neighbours = getNeighbours(x, y, false);
			const total = neighbours.reduce((sum, n) => {
				if (!Canvas.grid[n.y] || !Canvas.grid[n.y][n.x]) return sum;
				return sum + Math.max(Canvas.grid[n.y][n.x], 0);
			}, 0);

			// If the total is 0, all the neighbour tiles are empty
			return total === 0;
		};

		// If any of the neighbours now has no neighbours, remove them
		getNeighbours(x, y, false).forEach(t => {
			if (Canvas.grid.length <= t.y || Canvas.grid[t.y].length <= t.x || Canvas.grid[t.y][t.x] !== 0) return;
			if (noNeighbours(t.x, t.y)) {
				Canvas.grid[t.y][t.x] = -1;
				removeTrailing(t.y);
			}
		});

		// If the tile has no neighbours, remove it
		if (noNeighbours(x, y)) Canvas.grid[y][x] = -1;

		// Remove empty tiles after deleted one
		removeTrailing(y);

		// Create a tile at (1, 1) if the grid is empty
		if (Canvas.tileCount <= 0) {
			Canvas.grid = [[]];
			addTile(1, 1, 1);
		}

		// Remove empty rows from start and end
		while (Canvas.grid[Canvas.grid.length - 1].every(x => x === -1)) Canvas.grid.pop();
		while (Canvas.grid[0].every(x => x === -1)) {
			Canvas.grid.shift();
			Canvas.options.offset.add(-1, 0.5);
		}

	};

	// Add the first tile
	addTile(0, 0, 1);



	// ################################################################################
	// #                                ANIMATION LOOP                                #
	// ################################################################################


	const animate = () => {

		const currentTime = Date.now();
		Canvas.delta = currentTime - Canvas.prevTime;
		Canvas.prevTime = currentTime;

		Canvas.fpsElt.innerHTML = Math.floor(1000 / Canvas.delta);

		// Either the height of the grid or the longest row
		const gridSize = Math.max(Canvas.grid.length, Canvas.grid.map(x => x).sort((a, b) => b.length - a.length)[0].length);
		// Smallest window dimension
		const screenSize = Math.min(canvas.width, canvas.height);
		// Size of each cell from top to bottom (double the width)
		const tileSize = Canvas.options.zoom * 100;
		// Height of tiles
		const height = tileSize * 0.5;

		// Zoom controls
		if (Canvas.keys.find(k => k.name === "up").pressed) {
			Canvas.options.zoom += 0.05 * Canvas.options.zoom;
		}
		if (Canvas.keys.find(k => k.name === "down").pressed) {
			Canvas.options.zoom -= 0.05 * Canvas.options.zoom;
		}

		// Move controls
		if (Canvas.keys.find(k => k.name === "w").pressed) {
			Canvas.options.offset.y += 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "a").pressed) {
			Canvas.options.offset.x += 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "s").pressed) {
			Canvas.options.offset.y -= 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "d").pressed) {
			Canvas.options.offset.x -= 0.02 * screenSize / tileSize;
		}

		// Texture changing key state
		const changeTexture = Canvas.keys.find(k => k.name === "q").pressed;

		// Background
		ctx.fillStyle = Canvas.bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Store position of selected tile
		let selected;

		Canvas.grid.forEach((row, y) => {
			row.forEach((_, x) => {

				if (row[x] === -1) return;

				const position = Vector.toIsometric(x * tileSize, y * tileSize);
				position.set(0.5 * canvas.width + position.x + Canvas.options.offset.x * tileSize, 0.5 * canvas.height + position.y + Canvas.options.offset.y * tileSize);
				const mouseIsOn = isOnTile(Canvas.mouse.position, position, tileSize);
				if (mouseIsOn) selected = new Vector(x, y);

				// Only draw tiles that are visible
				if (!(row[x] === 0 || position.x < -tileSize || position.x > canvas.width + tileSize || position.y < -tileSize - height || position.y > canvas.height + tileSize/2)) {

					// Render top
					let stroke = "#00000000";
					let fill = Canvas.textures[row[x] - 1].top;
					if (Canvas.options.editMode === 0) {
						stroke = fill;
					}
					drawTop(ctx, position, tileSize, fill, stroke);

					// Render front
					if (y === Canvas.grid.length - 1 || x >= Canvas.grid[y + 1].length || Canvas.grid[y + 1][x] <= 0) {
						ctx.fillStyle = Canvas.textures[row[x] - 1].front;
						ctx.strokeStyle = ctx.fillStyle;
						ctx.beginPath();
						ctx.moveTo(position.x - tileSize, position.y);
						ctx.lineTo(position.x - tileSize, position.y + height);
						ctx.lineTo(position.x, position.y + tileSize * 0.5 + height);
						ctx.lineTo(position.x, position.y + tileSize * 0.5);
						ctx.closePath();
						ctx.fill();
						if (Canvas.options.editMode === 0) ctx.stroke();
					}

					// Render side
					if (x === row.length - 1 || row[x + 1] <= 0) {
						ctx.fillStyle = Canvas.textures[row[x] - 1].side;
						ctx.strokeStyle = ctx.fillStyle;
						ctx.beginPath();
						ctx.moveTo(position.x + tileSize, position.y);
						ctx.lineTo(position.x + tileSize, position.y + height);
						ctx.lineTo(position.x, position.y + tileSize * 0.5 + height);
						ctx.lineTo(position.x, position.y + tileSize * 0.5);
						ctx.closePath();
						ctx.fill();
						if (Canvas.options.editMode === 0) ctx.stroke();
					}
				}

				// If editing, draw grid lines around tiles
				if (Canvas.options.editMode > 0 && mouseIsOn && (Canvas.options.editMode !== 2 || row[x] > 0)) {
					// Overlay on currently selected tile
					let fill = Math.floor(Math.sin(Math.PI * Canvas.frameCount / 30) * 125 + 125).toString(16);
					if (fill.length === 1) fill = "0" + fill;
					let stroke = Math.floor(Math.cos(Math.PI * Canvas.frameCount / 30) * 125 + 125).toString(16);
					if (stroke.length === 1) stroke = "0" + stroke;
					drawTop(ctx, position, tileSize, "#" + fill + fill + fill + "66", "#" + stroke + stroke + stroke);

					// Change the texture of the tile if q is pressed
					if (changeTexture && row[x] > 0) {
						Canvas.keys.find(k => k.name === "q").pressed = false;
						row[x]++;
						if (row[x] > Canvas.textures.length) row[x] = 1;
					}

				} else if (Canvas.options.editMode > 0 && (Canvas.options.editMode !== 2 || row[x] > 0)) {
					// White outline around all other tiles
					drawTop(ctx, position, tileSize, "#00000000", "#FFFFFF66");
				}

			});
		});

		if (selected) {
			if (Canvas.options.editMode === 1) {

				// Building actions

				if (Canvas.mouse.right && Canvas.grid[selected.y][selected.x] > 0) {
					removeTile(selected.x, selected.y);
				}
				if (Canvas.mouse.left && Canvas.grid[selected.y][selected.x] === 0) {
					addTile(selected.x, selected.y, 1);
				}

			} else if (Canvas.options.editMode === 2) {

				// Painting actions

				if (Canvas.mouse.left && Canvas.grid[selected.y][selected.x] > 0) {
					addTile(selected.x, selected.y, Canvas.options.textureToUse);
				}

			}
		}

		Canvas.deltaElt.innerHTML = Date.now() - currentTime;
		Canvas.frameCount++;

		requestAnimationFrame(animate);

	};

	animate();



	// ################################################################################
	// #                       EVENT LISTENERS / DOM MANAGEMENT                       #
	// ################################################################################


	// Add all the textures to the paints container
	const container = document.getElementById("paints-container");
	Canvas.textures.forEach((texture, i) => {
		const paint = document.createElement("li");
		if (Canvas.options.textureToUse === i + 1) {
			paint.className = "paint enabled";
		} else {
			paint.className = "paint disabled";
		}
		paint.setAttribute("style", `background-color: ${texture.top};`);
		container.appendChild(paint);
		paint.addEventListener("click", () => {
			Canvas.options.textureToUse = i + 1;
			const previous = document.getElementsByClassName("paint enabled")[0];
			if (previous === paint) return;
			$(previous).animate({width: "10%"}, 200);
			$(paint).animate({width: "60%"}, 200);
			previous.className = "paint disabled";
			paint.className = "paint enabled";
		});
	});

	// Open / close help and about
	document.getElementById("show-help").addEventListener("click", () => {
		$("#help-background").fadeIn(200);
		$("#help-container").slideDown(200);
	});
	document.getElementById("help-background").addEventListener("click", () => {
		$("#help-background").fadeOut(200);
		$("#help-container").slideUp(200);
	});

	// Define actions of tool buttons
	const tools = document.getElementsByClassName("tool");
	for (let i = 0; i < tools.length; i++) {
		tools[i].addEventListener("click", () => {
			Canvas.options.editMode = i;
			document.getElementsByClassName("tool enabled")[0].className = "tool disabled";
			tools[i].className = "tool enabled";
			if (tools[i].id === "tool-paint") {
				$("#paints-container").slideDown(50 * Canvas.textures.length);
			} else {
				$("#paints-container").slideUp(50 * Canvas.textures.length);
			}
		});
	}
	tools[Canvas.options.editMode].className = "tool enabled";


	// Keep mouse presses up to date
	window.addEventListener('mousedown', e => {
		if (e.button === 0) {
			Canvas.mouse.left = true;
		} else if (e.button === 2) {
			Canvas.mouse.right = true;
		}
	});
	window.addEventListener('mouseup', e => {
		if (e.button === 0) {
			Canvas.mouse.left = false;
		} else if (e.button === 2) {
			Canvas.mouse.right = false;
		}
	});

	// Disallow right click context menu
	window.addEventListener('contextmenu', e => {
		e.preventDefault();
	});

	// Keep mouse position up to date
	window.addEventListener('mousemove', e => {
		Canvas.mouse.position.set(e.pageX, e.pageY);
	});

	// Zoom using mouse wheel
	window.addEventListener('wheel', e => {

		if (e.ctrlKey) e.preventDefault();

		// Either the height of the grid or the longest row
		const gridSize = Math.max(Canvas.grid.length, Canvas.grid.map(x => x).sort((a, b) => b.length - a.length)[0].length);
		// Smallest window dimension
		const screenSize = Math.min(canvas.width, canvas.height);
		// Size of each cell from top to bottom (double the width)
		const tileSize = Canvas.options.zoom * 100;

		const zoomAmount = e.deltaY * -0.0005 * Canvas.options.zoom;
		Canvas.options.zoom += zoomAmount;

	});


	// keyup and keydown update states of keys that need to be held
	window.addEventListener('keyup', e => {
		const keybinding = Canvas.keys.find(k => k.code === e.keyCode);
		if (keybinding) keybinding.pressed = false;
	});
	window.addEventListener('keydown', e => {
		const keybinding = Canvas.keys.find(k => k.code === e.keyCode);
		if (keybinding) keybinding.pressed = true;
	});


	window.addEventListener('resize', () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		ctx.fillStyle = Canvas.bgColor;
	});

}());
