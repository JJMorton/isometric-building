/* jshint esversion: 6 */

(function() {

	'use strict';

	const canvas = document.querySelector('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	const ctx = canvas.getContext('2d');


	window.Canvas = {
		bgColor: getComputedStyle(document.querySelector('body', null)).getPropertyValue('background-color'),
		delta: 0,
		prevTime: Date.now(),
		deltaElt: document.getElementById('delta'),
		fpsElt: document.getElementById('fps'),
		keys: [
			{ name: "up"  , code: 38, pressed: false },
			{ name: "down", code: 40, pressed: false },
			{ name: "w"   , code: 87, pressed: false },
			{ name: "a"   , code: 65, pressed: false },
			{ name: "s"   , code: 83, pressed: false },
			{ name: "d"   , code: 68, pressed: false }
		],
		zoom: 0.9,
		offset: new Vector(),
		grid: [
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 3, 0, 0, 0, 3, 0, 0, 3, 3, 3, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 3, 0, 0],
			[0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0],
			[0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0],
			[0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0],
			[0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 3, 3, 0, 3, 3, 3, 3, 3, 0, 0, 3, 0, 0, 0, 0],
			[0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0],
			[0, 3, 3, 3, 3, 3, 0, 0, 3, 3, 3, 3, 0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		],
		textures: [
			{ top: "#1166DD", front: "#0944AA", side: "#0F54BA" }, // Ocean
			{ top: "#338800", front: "#115500", side: "#216500" }, // Grass
			{ top: "#CECE8D", front: "#AEAE6D", side: "#BEBE7D" }  // Sand
		]
	};

	// Either the height of the grid or the longest row
	const gridSize = Math.max(Canvas.grid.length, Canvas.grid.map(x => x).sort((a, b) => b.length - a.length)[0].length);

	const animate = () => {

		const currentTime = Date.now();
		Canvas.delta = currentTime - Canvas.prevTime;
		Canvas.prevTime = currentTime;

		Canvas.fpsElt.innerHTML = Math.floor(1000 / Canvas.delta);

		// Smallest window dimension
		const screenSize = Math.min(canvas.width, canvas.height);
		// Size of each cell from top to bottom (double the width)
		const tileSize = Canvas.zoom * screenSize / gridSize;

		// Zoom controls
		if (Canvas.keys.find(k => k.name === "up").pressed) {
			if (Canvas.zoom < screenSize / tileSize) Canvas.zoom += 0.05 * Canvas.zoom;
		}
		if (Canvas.keys.find(k => k.name === "down").pressed) {
			if (Canvas.zoom > 0.5) Canvas.zoom -= 0.05 * Canvas.zoom;
		}

		// Move controls
		if (Canvas.keys.find(k => k.name === "w").pressed) {
			Canvas.offset.y += 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "a").pressed) {
			Canvas.offset.x += 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "s").pressed) {
			Canvas.offset.y -= 0.02 * screenSize / tileSize;
		}
		if (Canvas.keys.find(k => k.name === "d").pressed) {
			Canvas.offset.x -= 0.02 * screenSize / tileSize;
		}

		ctx.fillStyle = Canvas.bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		Canvas.grid.forEach((row, y) => {
			row.forEach((tile, x) => {

				const position = Vector.toIsometric(x * tileSize, y * tileSize);
				position.set(0.5 * canvas.width + position.x + Canvas.offset.x * tileSize, 0.5 * canvas.height - tileSize * (gridSize - 1) * 0.5 + position.y + Canvas.offset.y * tileSize);

				const height = tileSize * 0.1;

				// Only draw tiles that are visible
				if (tile === 0 || position.x < -tileSize || position.x > canvas.width + tileSize || position.y < -tileSize - height || position.y > canvas.height + tileSize/2) return;

				// Top
				ctx.fillStyle = Canvas.textures[tile - 1].top;
				ctx.strokeStyle = ctx.fillStyle;
				ctx.beginPath();
				ctx.moveTo(position.x - tileSize, position.y);
				ctx.lineTo(position.x, position.y - tileSize / 2);
				ctx.lineTo(position.x + tileSize, position.y);
				ctx.lineTo(position.x, position.y + tileSize / 2);
				ctx.closePath();
				ctx.fill();
				ctx.stroke(); // Comment this to show outlines around tiles

				// Front
				if (y === Canvas.grid.length - 1 || x >= Canvas.grid[y + 1].length || Canvas.grid[y + 1][x] === 0) {
					ctx.fillStyle = Canvas.textures[tile - 1].front;
					ctx.strokeStyle = ctx.fillStyle;
					ctx.beginPath();
					ctx.moveTo(position.x - tileSize, position.y);
					ctx.lineTo(position.x - tileSize, position.y + tileSize * 0.5 + height);
					ctx.lineTo(position.x, position.y + tileSize + height);
					ctx.lineTo(position.x, position.y + tileSize / 2);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}

				// Side
				if (x === row.length - 1 || row[x + 1] === 0) {
					ctx.fillStyle = Canvas.textures[tile - 1].side;
					ctx.strokeStyle = ctx.fillStyle;
					ctx.beginPath();
					ctx.moveTo(position.x + tileSize, position.y);
					ctx.lineTo(position.x + tileSize, position.y + tileSize * 0.5 + height);
					ctx.lineTo(position.x, position.y + tileSize + height);
					ctx.lineTo(position.x, position.y + tileSize / 2);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}
			});
		});

		Canvas.deltaElt.innerHTML = Date.now() - currentTime;

		requestAnimationFrame(animate);

	};

	animate();


	window.addEventListener('wheel', e => {

		// Smallest window dimension
		const screenSize = Math.min(canvas.width, canvas.height);
		// Size of each cell from top to bottom (double the width)
		const tileSize = Canvas.zoom * screenSize / gridSize;

		const zoomAmount = e.deltaY * -0.0005 * Canvas.zoom;
		if ((zoomAmount > 0 && Canvas.zoom < screenSize / tileSize) || (zoomAmount < 0 && Canvas.zoom > 0.5)) {
			Canvas.zoom += zoomAmount;
		}

	});

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
