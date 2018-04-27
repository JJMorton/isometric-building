/*

	Contains game logic that is shared between the server and the client

*/


// Decides if the environment is node or a client
const client = typeof window !== 'undefined';

const GameLogic = {};

GameLogic.getNeighbours = (GameState, x, y, createNonexistent = false) => {

	// Returns coordinates of all four neighbours and can create neighbours if they don't exist

	const neighbours = [];

	if (createNonexistent) {


		// Tile above

		// Fill all tiles up to the neighbour
		while (y - 1 >= 0 && GameState.grid[y - 1].length <= x) {
			GameState.grid[y - 1].push({type: -1, height: 0.5});
			if (client) GameState.unrendered = true;
		}


		// Tile to the right

		// If on the end of the row, create tile to the right
		if (x === GameState.grid[y].length - 1) {
			GameState.grid[y].push({type: -1, height: 0.5});
			if (client) GameState.unrendered = true;
		}


		// Tile below

		// If on the last row, create new row below
		if (y === GameState.grid.length - 1) {
			GameState.grid.push([{type: -1, height: 0.5}]);
			if (client) GameState.unrendered = true;
		}
		// Fill all tiles up to the neighbour
		while (GameState.grid[y + 1].length <= x) {
			GameState.grid[y + 1].push({type: -1, height: 0.5});
			if (client) GameState.unrendered = true;
		}

	}


	neighbours[0] = {y: y - 1, x: x};
	neighbours[1] = {y: y, x: x + 1};
	neighbours[2] = {y: y + 1, x: x};
	neighbours[3] = {y: y, x: x - 1};


	return neighbours;
};

GameLogic.addTile = (GameState, x, y, type, height, websocket = null) => {

	// Adds a tile to the grid and updates neighbour states

	// Can't add tile if it doesn't exist or is already there
	if (y < 0 || y >= GameState.grid.length || x < 0 || x >= GameState.grid[y].length || GameState.grid[y][x].type === type) return;

	if (!client) console.log(`Add tile at x:${x}, y:${y}`);

	if (websocket) websocket.emit('addtile', {x: x, y: y, type: type, height: height});

	if (!GameState.grid[y][x] || GameState.grid[y][x].type <= 0) {

		// Add new tile

		while (GameState.grid.length <= y) GameState.grid.push([{type: -1, height: 0.5}]);
		while (GameState.grid[y].length <= x) GameState.grid[y].push({type: -1, height: Math.random()});

		GameState.grid[y][x].type = type;
		GameState.grid[y][x].height = height;


		GameLogic.getNeighbours(GameState, x, y, true).forEach(t => {
			// Ignore tiles out of bounds
			if (t.y >= 0 && t.y < GameState.grid.length && t.x >= 0 && t.x < GameState.grid[t.y].length && GameState.grid[t.y][t.x].type === -1) {
				GameState.grid[t.y][t.x].type = 0;
			}
		});

	} else {

		// Change tile texture
		if (GameState.grid[y][x].type > 0) GameState.grid[y][x].type = type;

	}

	if (client) GameState.unrendered = true;

	return GameState.grid;

};

GameLogic.removeTile = (GameState, x, y, websocket = null) => {

	// Removes a tile from the grid and updates neighbour states

	// Can't remove a non-existent or empty tile
	if (y < 0 || y >= GameState.grid.length || x < 0 || x >= GameState.grid[y].length || GameState.grid[y][x].type < 1) return;

	if (!client) console.log(`Remove tile at x:${x}, y:${y}`);

	GameState.grid[y][x].type = 0;
	if (client) GameState.unrendered = true;
	if (websocket) websocket.emit('removetile', {x: x, y: y});

	// Remove any trailing empty spaces from the row
	const removeTrailing = y => {
		while (GameState.grid[y].length > 0 && GameState.grid[y][GameState.grid[y].length - 1].type === -1) GameState.grid[y].pop();
	};

	// Returns true if the tile has at least one neighbour
	const noNeighbours = (x, y) => {
		const neighbours = GameLogic.getNeighbours(GameState, x, y, false);
		const total = neighbours.reduce((sum, n) => {
			if (!GameState.grid[n.y] || !GameState.grid[n.y][n.x]) return sum;
			return sum + Math.max(GameState.grid[n.y][n.x].type, 0);
		}, 0);

		// If the total is 0, all the neighbour tiles are empty
		return total === 0;
	};

	// If any of the neighbours now have no neighbours and doesn't have a tile, remove it
	GameLogic.getNeighbours(GameState, x, y, false).forEach(t => {
		if (t.x < 0 || t.y < 0 || GameState.grid.length <= t.y || GameState.grid[t.y].length <= t.x || GameState.grid[t.y][t.x].type !== 0) return;
		if (noNeighbours(t.x, t.y)) {
			GameState.grid[t.y][t.x].type = -1;
			removeTrailing(t.y);
		}
	});

	// If the tile has no neighbours, remove it
	if (noNeighbours(x, y)) GameState.grid[y][x].type = -1;

	// Remove empty tiles after deleted one
	removeTrailing(y);

	// Remove empty rows from end
	while (GameState.grid.length > 0 && GameState.grid[GameState.grid.length - 1].every(x => x.type === -1)) GameState.grid.pop();

	return GameState.grid;

};

if (!client) module.exports = GameLogic;