(function() {

	'use strict';

	/*
		Set up canvas element and rendering context
	*/
	const canvas = document.querySelector('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	const ctx = canvas.getContext('2d');

	/*
		Buffer canvas to draw grid to
		Only update tiles that have changed
	*/
	const buffer = document.createElement('canvas');
	buffer.width = canvas.width;
	buffer.height = canvas.height;
	const bufferCtx = buffer.getContext('2d');

	/*
		Canvas to draw editing grid to
	*/
	const editGrid = document.createElement('canvas');
	editGrid.width = canvas.width;
	editGrid.height = canvas.height;
	const editGridCtx = editGrid.getContext('2d');



	/*
		USER VARIABLES + GAME DATA
	*/


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
			heightToUse: 0.5,
			zoom: 1,
			offset: new Vector()
		},

		// Input tracking
		mouse: {position: new Vector(), left: false, right: false},
		keys: [
			{ name: "up"  ,  code: 38, pressed: false },
			{ name: "down",  code: 40, pressed: false },
			{ name: "left",  code: 37, pressed: false },
			{ name: "right", code: 39, pressed: false },
			{ name: "w"   ,  code: 87, pressed: false },
			{ name: "a"   ,  code: 65, pressed: false },
			{ name: "s"   ,  code: 83, pressed: false },
			{ name: "d"   ,  code: 68, pressed: false },
			{ name: "q"   ,  code: 81, pressed: false }
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
		],
		unrendered: true

	};



	/*
		TILE RENDERING + CALCULATIONS
	*/


	const isOnTile = (p, tile, tileSize, height) => {

		// Centre tile at (0, 0)
		const point = Vector.sub(p, tile);

		// Gradients of sides
		const southEast = ( tileSize / 2) / tileSize;
		const northEast = (-tileSize / 2) / tileSize;

		// Check each side with simple straight line equations
		// Top face
		const top =
			point.y > northEast * point.x - tileSize / 2 - height * tileSize && // Back left
			point.y > southEast * point.x - tileSize / 2 - height * tileSize && // Back right
			point.y < southEast * point.x + tileSize / 2 - height * tileSize && // Front left
			point.y < northEast * point.x + tileSize / 2 - height * tileSize;   // Front right

		// Front face
		const front =
			point.x > - tileSize &&                                             // Left
			point.x < 0 &&                                                      // Right
			point.y > southEast * point.x + tileSize / 2 - height * tileSize && // Top
			point.y < southEast * point.x + tileSize / 2;                       // Bottom

		// Right face
		const right =
			point.x > 0 &&                                                      // Left
			point.x < tileSize &&                                               // Right
			point.y > northEast * point.x + tileSize / 2 - height * tileSize && // Top
			point.y < northEast * point.x + tileSize / 2;                       // Bottom

		return top || front || right;

	};

	const drawTop = (c, position, tileSize, height, fill, stroke) => {

		// Draw the top of a tile
		c.fillStyle = fill;
		c.strokeStyle = stroke;
		c.beginPath();
		c.moveTo(position.x - tileSize, position.y - height * tileSize);
		c.lineTo(position.x, position.y - tileSize / 2 - height * tileSize);
		c.lineTo(position.x + tileSize, position.y - height * tileSize);
		c.lineTo(position.x, position.y + tileSize / 2 - height * tileSize);
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
				Canvas.grid.splice(0, 0, [{type: -1, height: 0.5}]);
				Canvas.unrendered = true;
				// The original tile will now have a larger y coordinate
				y++;
				Canvas.options.offset.x += 1;
				Canvas.options.offset.y -= 0.5;
			}
			// Fill all tiles up to the neighbour
			while (Canvas.grid[y - 1].length <= x) {
				Canvas.grid[y - 1].push({type: -1, height: 0.5});
				Canvas.unrendered = true;
			}


			// Tile to the right

			// If on the end of the row, create tile to the right
			if (x === Canvas.grid[y].length - 1) {
				Canvas.grid[y].push({type: -1, height: 0.5});
				Canvas.unrendered = true;
			}


			// Tile below

			// If on the last row, create new row below
			if (y === Canvas.grid.length - 1) {
				Canvas.grid.push([{type: -1, height: 0.5}]);
				Canvas.unrendered = true;
			}
			// Fill all tiles up to the neighbour
			while (Canvas.grid[y + 1].length <= x) {
				Canvas.grid[y + 1].push({type: -1, height: 0.5});
				Canvas.unrendered = true;
			}


			// Tile to the left

			// If at the beginning of a row, create column to the left
			if (x === 0) {
				Canvas.grid.forEach(row => row.splice(0, 0, {type: -1, height: 0.5}));
				Canvas.unrendered = true;
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
		if (Canvas.grid[y][x] && Canvas.grid[y][x].type === type) return;

		if (!Canvas.grid[y][x] || Canvas.grid[y][x].type <= 0) {

			// Add new tile

			while (Canvas.grid.length <= y) Canvas.grid.push([{type: -1, height: 0.5}]);
			while (Canvas.grid[y].length <= x) Canvas.grid[y].push({type: -1, height: Math.random()});

			Canvas.grid[y][x].type = type;
			Canvas.grid[y][x].height = Canvas.options.heightToUse;
			Canvas.tileCount++;

			getNeighbours(x, y, true).forEach(t => {
				if (Canvas.grid[t.y][t.x].type === -1) {
					Canvas.grid[t.y][t.x].type = 0;
					Canvas.unrendered = true;
				}
			});

		} else {

			// Change tile texture

			if (Canvas.grid[y][x].type > 0) Canvas.grid[y][x].type = type;

		}

		// Mark tile for rendering
		Canvas.unrendered = true;

	};

	const removeTile = (x, y) => {

		// Removes a tile from the grid and updates neighbour states

		// Can't remove an empty tile or the last one
		if (Canvas.grid[y][x].type < 1 || Canvas.tileCount === 1) return;

		Canvas.grid[y][x].type = 0;
		Canvas.unrendered = true;
		Canvas.tileCount--;

		// Remove any trailing empty spaces from the row
		const removeTrailing = y => {
			while (Canvas.grid[y].length > 0 && Canvas.grid[y][Canvas.grid[y].length - 1].type === -1) Canvas.grid[y].pop();
		};

		// Returns true if the tile has at least one neighbour
		const noNeighbours = (x, y) => {
			const neighbours = getNeighbours(x, y, false);
			const total = neighbours.reduce((sum, n) => {
				if (!Canvas.grid[n.y] || !Canvas.grid[n.y][n.x]) return sum;
				return sum + Math.max(Canvas.grid[n.y][n.x].type, 0);
			}, 0);

			// If the total is 0, all the neighbour tiles are empty
			return total === 0;
		};

		// If any of the neighbours now have no neighbours and doesn't have a tile, remove it
		getNeighbours(x, y, false).forEach(t => {
			if (Canvas.grid.length <= t.y || Canvas.grid[t.y].length <= t.x || Canvas.grid[t.y][t.x].type !== 0) return;
			if (noNeighbours(t.x, t.y)) {
				Canvas.grid[t.y][t.x].type = -1;
				removeTrailing(t.y);
			}
		});

		// If the tile has no neighbours, remove it
		if (noNeighbours(x, y)) Canvas.grid[y][x].type = -1;

		// Remove empty tiles after deleted one
		removeTrailing(y);

		// Remove empty rows from start and end
		while (Canvas.grid[Canvas.grid.length - 1].every(x => x.type === -1)) Canvas.grid.pop();
		while (Canvas.grid[0].every(x => x.type === -1)) {
			Canvas.grid.shift();
			Canvas.options.offset.add(-1, 0.5);
		}

	};

	// Add the first tile
	addTile(0, 0, 1);



	/*
		ANIMATION LOOP
	*/


	const animate = () => {

		const currentTime = performance.now();
		Canvas.delta = currentTime - Canvas.prevTime;
		Canvas.prevTime = currentTime;

		if (Canvas.frameCount % 4 === 0) Canvas.fpsElt.innerHTML = Math.floor(1000 / Canvas.delta);

		// Either the height of the grid or the longest row
		const gridSize = Math.max(Canvas.grid.length, Canvas.grid.map(x => x).sort((a, b) => b.length - a.length)[0].length);
		// Smallest window dimension
		const screenSize = Math.min(canvas.width, canvas.height);
		// Size of each cell from top to bottom (double the width)
		const tileSize = Canvas.options.zoom * 100;

		// Move controls
		if (Canvas.keys.find(k => k.name === "w").pressed) {
			Canvas.options.offset.y += 0.02 * screenSize / tileSize;
			Canvas.unrendered = true;
		}
		if (Canvas.keys.find(k => k.name === "a").pressed) {
			Canvas.options.offset.x += 0.02 * screenSize / tileSize;
			Canvas.unrendered = true;
		}
		if (Canvas.keys.find(k => k.name === "s").pressed) {
			Canvas.options.offset.y -= 0.02 * screenSize / tileSize;
			Canvas.unrendered = true;
		}
		if (Canvas.keys.find(k => k.name === "d").pressed) {
			Canvas.options.offset.x -= 0.02 * screenSize / tileSize;
			Canvas.unrendered = true;
		}

		// Texture changing key state
		const changeTexture = Canvas.keys.find(k => k.name === "q").pressed;

		// Background
		ctx.fillStyle = Canvas.bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Store position of selected tile
		let selected;

		if (Canvas.unrendered) {
			bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
			editGridCtx.clearRect(0, 0, editGrid.width, editGrid.height);
		}

		Canvas.grid.forEach((row, y) => {
			row.forEach((_, x) => {

				if (row[x].type === -1) return;

				// Calculate position to draw the tile
				const position = Vector.toIsometric(x * tileSize, y * tileSize);
				position.set(0.5 * canvas.width + position.x + Canvas.options.offset.x * tileSize, 0.5 * canvas.height + position.y + Canvas.options.offset.y * tileSize);

				// Calculate if the user has selected the tile
				const mouseIsOn = isOnTile(Canvas.mouse.position, position, tileSize, row[x].type > 0 ? row[x].height : 0);
				if (mouseIsOn) selected = {index: new Vector(x, y), position: position};

				// Only draw tiles that are visible
				if (Canvas.unrendered || row[x].unrendered) {

					if (Canvas.options.editMode > 0 && (Canvas.options.editMode !== 2 || row[x].type > 0)) {
						// White outline around tiles if editing
						drawTop(editGridCtx, position, tileSize, row[x].type > 0 ? row[x].height : 0, "#00000000", row[x].type > 0 ? "#000000" : "#FFFFFF33");
					}

					if (!(row[x].type === 0 ||
						position.x < -tileSize ||
						position.x > canvas.width + tileSize ||
						position.y < -tileSize ||
						position.y > canvas.height + tileSize/2 + row[x].height * tileSize)) {

						// Render top
						let stroke = "#00000000";
						let fill = Canvas.textures[row[x].type - 1].top;
						if (Canvas.options.editMode === 0) {
							stroke = fill;
						}
						drawTop(bufferCtx, position, tileSize, row[x].height, fill, stroke);

						// Render front
						if (y === Canvas.grid.length - 1 || x >= Canvas.grid[y + 1].length || Canvas.grid[y + 1][x].type < 1 || row[x].height > Canvas.grid[y + 1][x].height) {
							bufferCtx.fillStyle = Canvas.textures[row[x].type - 1].front;
							bufferCtx.strokeStyle = bufferCtx.fillStyle;
							bufferCtx.beginPath();
							bufferCtx.moveTo(position.x - tileSize, position.y - row[x].height * tileSize); // Top left
							bufferCtx.lineTo(position.x - tileSize, position.y); // Bottom left
							bufferCtx.lineTo(position.x, position.y + tileSize * 0.5); // Bottom middle
							bufferCtx.lineTo(position.x, position.y + tileSize * 0.5 - row[x].height * tileSize); // Top middle
							bufferCtx.closePath();
							bufferCtx.fill();
							if (Canvas.options.editMode === 0) bufferCtx.stroke();
						}

						// Render side
						if (x === row.length - 1 || row[x + 1].type <= 0 || row[x + 1].height < row[x].height) {
							bufferCtx.fillStyle = Canvas.textures[row[x].type - 1].side;
							bufferCtx.strokeStyle = bufferCtx.fillStyle;
							bufferCtx.beginPath();
							bufferCtx.moveTo(position.x + tileSize, position.y - row[x].height * tileSize);
							bufferCtx.lineTo(position.x + tileSize, position.y);
							bufferCtx.lineTo(position.x, position.y + tileSize * 0.5);
							bufferCtx.lineTo(position.x, position.y + tileSize * 0.5 - row[x].height * tileSize);
							bufferCtx.closePath();
							bufferCtx.fill();
							if (Canvas.options.editMode === 0) bufferCtx.stroke();
						}

					}

				}

			});
		});

		// Mark canvas as rendered
		Canvas.unrendered = false;

		if (selected) {

			const selectedTile = Canvas.grid[selected.index.y][selected.index.x];

			if (Canvas.options.editMode > 0 && (Canvas.options.editMode !== 2 || selectedTile.type > 0)) {
				// Overlay on currently selected tile
				let fill = Math.floor(Math.sin(Math.PI * Canvas.frameCount / 30) * 125 + 125).toString(16);
				if (fill.length === 1) fill = "0" + fill;
				let stroke = Math.floor(Math.cos(Math.PI * Canvas.frameCount / 30) * 125 + 125).toString(16);
				if (stroke.length === 1) stroke = "0" + stroke;
				drawTop(ctx, selected.position, tileSize, selectedTile.type > 0 ? selectedTile.height : 0, "#" + fill + fill + fill + "66", "#" + stroke + stroke + stroke);

				// Change the texture of the tile if q is pressed
				if (changeTexture && selectedTile.type > 0) {
					Canvas.keys.find(k => k.name === "q").pressed = false;
					selectedTile.type++;
					Canvas.unrendered = true;
					if (selectedTile.type > Canvas.textures.length) selectedTile.type = 1;
				}

			}

			if (Canvas.options.editMode === 1) {

				// Building actions

				if (Canvas.mouse.right && selectedTile.type > 0) {
					removeTile(selected.index.x, selected.index.y);
				}
				if (Canvas.mouse.left && selectedTile.type === 0) {
					addTile(selected.index.x, selected.index.y, 1);
				}
				const upKey = Canvas.keys.find(k => k.name === "up");
				if (upKey.pressed) {
					selectedTile.height += 0.25;
					if (selectedTile.height > 5) selectedTile.height = 5;
					Canvas.unrendered = true;
					Canvas.options.heightToUse = selectedTile.height;
					upKey.pressed = false;
				}
				const downKey = Canvas.keys.find(k => k.name === "down");
				if (Canvas.keys.find(k => k.name === "down").pressed) {
					selectedTile.height -= 0.25;
					if (selectedTile.height < 0) selectedTile.height = 0;
					Canvas.unrendered = true;
					Canvas.options.heightToUse = selectedTile.height;
					downKey.pressed = false;
				}

			} else if (Canvas.options.editMode === 2) {

				// Painting actions

				if (Canvas.mouse.left && selectedTile.type > 0) {
					addTile(selected.index.x, selected.index.y, Canvas.options.textureToUse);
				}

			}
		}

		// Draw buffer to canvas
		ctx.drawImage(editGrid, 0, 0);
		ctx.drawImage(buffer, 0, 0);

		if (Canvas.frameCount % 4 === 0) Canvas.deltaElt.innerHTML = Math.floor((performance.now() - currentTime) * 10) / 10;
		Canvas.frameCount++;

		requestAnimationFrame(animate);

	};

	animate();



	/*
		EVENT LISTENERS / DOM MANAGEMENT
	*/


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
			Canvas.unrendered = true;
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
	canvas.addEventListener('contextmenu', e => {
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

		if (e.deltaY < 0 && Canvas.options.zoom * 100 > Math.min(canvas.width, canvas.height)) return;
		const zoomAmount = e.deltaY * -0.0005 * Canvas.options.zoom;
		Canvas.options.zoom += zoomAmount;
		Canvas.unrendered = true;

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
		buffer.width = canvas.width;
		buffer.height = canvas.height;
		Canvas.unrendered = true;
	});

}());
