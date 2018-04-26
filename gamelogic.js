const GameLogic = {};

GameLogic.getNeighbours = (grid, x, y, createNonexistent = false) => {

	// Returns coordinates of all four neighbours and can create neighbours if they don't exist

	const neighbours = [];

	if (createNonexistent) {

		// Tile above

		// If on the first row, create new row above
		if (y === 0) {
			grid.splice(0, 0, [{type: -1, height: 0.5}]);
			// The original tile will now have a larger y coordinate
			y++;
		}
		// Fill all tiles up to the neighbour
		while (grid[y - 1].length <= x) {
			grid[y - 1].push({type: -1, height: 0.5});
		}


		// Tile to the right

		// If on the end of the row, create tile to the right
		if (x === grid[y].length - 1) {
			grid[y].push({type: -1, height: 0.5});
		}


		// Tile below

		// If on the last row, create new row below
		if (y === grid.length - 1) {
			grid.push([{type: -1, height: 0.5}]);
		}
		// Fill all tiles up to the neighbour
		while (grid[y + 1].length <= x) {
			grid[y + 1].push({type: -1, height: 0.5});
		}


		// Tile to the left

		// If at the beginning of a row, create column to the left
		if (x === 0) {
			grid.forEach(row => row.splice(0, 0, {type: -1, height: 0.5}));
			// The original tile will have a larger x coordinate
			x++;
		}

	}


	neighbours[0] = {y: y - 1, x: x};
	neighbours[1] = {y: y, x: x + 1};
	neighbours[2] = {y: y + 1, x: x};
	neighbours[3] = {y: y, x: x - 1};


	return neighbours;
};

GameLogic.addTile = (grid, x, y, type, height) => {

	// Adds a tile to the grid and updates neighbour states

	// Can't add tile if it's already there
	if (grid[y][x] && grid[y][x].type === type) return;

	if (!grid[y][x] || grid[y][x].type <= 0) {

		// Add new tile

		while (grid.length <= y) grid.push([{type: -1, height: 0.5}]);
		while (grid[y].length <= x) grid[y].push({type: -1, height: Math.random()});

		grid[y][x].type = type;
		grid[y][x].height = height;

		GameLogic.getNeighbours(grid, x, y, true).forEach(t => {
			if (grid[t.y][t.x].type === -1) {
				grid[t.y][t.x].type = 0;
			}
		});

	} else {

		// Change tile texture
		if (grid[y][x].type > 0) grid[y][x].type = type;

	}

	return grid;

};

GameLogic.removeTile = (grid, x, y) => {

	// Removes a tile from the grid and updates neighbour states

	// Can't remove an empty tile or the last one
	if (grid[y][x].type < 1) return;

	grid[y][x].type = 0;

	// Remove any trailing empty spaces from the row
	const removeTrailing = y => {
		while (grid[y].length > 0 && grid[y][grid[y].length - 1].type === -1) grid[y].pop();
	};

	// Returns true if the tile has at least one neighbour
	const noNeighbours = (x, y) => {
		const neighbours = GameLogic.getNeighbours(grid, x, y, false);
		const total = neighbours.reduce((sum, n) => {
			if (!grid[n.y] || !grid[n.y][n.x]) return sum;
			return sum + Math.max(grid[n.y][n.x].type, 0);
		}, 0);

		// If the total is 0, all the neighbour tiles are empty
		return total === 0;
	};

	// If any of the neighbours now have no neighbours and doesn't have a tile, remove it
	GameLogic.getNeighbours(grid, x, y, false).forEach(t => {
		if (grid.length <= t.y || grid[t.y].length <= t.x || grid[t.y][t.x].type !== 0) return;
		if (noNeighbours(t.x, t.y)) {
			grid[t.y][t.x].type = -1;
			removeTrailing(t.y);
		}
	});

	// If the tile has no neighbours, remove it
	if (noNeighbours(x, y)) grid[y][x].type = -1;

	// Remove empty tiles after deleted one
	removeTrailing(y);

	// Remove empty rows from start and end
	while (grid.length > 0 && grid[grid.length - 1].every(x => x.type === -1)) grid.pop();
	while (grid.length > 0 && grid[0].every(x => x.type === -1)) {
		grid.shift();
	}

	return grid;

};

module.exports = GameLogic;