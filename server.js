const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 8001, function() {
	console.log("Server runnning, listening on port " + server.address().port);
});
app.use(express.static('public'));

const io = require('socket.io')(server);
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const GameLogic = require('./public/scripts/gamelogic');

// Initialise persistent storage
const dataSource = new EnmapLevel({dataDir: ".data", name: "griddata"});
const gridData = new Enmap({provider: dataSource});

dataSource.ready = () => {
  console.log("Emmap Ready");
  
  // Initialise grid if haven't already
	if (!gridData.has('grid') || gridData.get('grid').length === 0 || gridData.get('grid')[0].length === 0) {
    gridData.set('grid', [[{type: 0, height: 0.5}]]);
    console.log("Grid empty, initialising...");
  }
  
  // Import data
	Game.grid = gridData.get('grid');
};

const Game = {};
Game.grid = [];
Game.changed = false;


const saveChanges = (grid) => {

	if (!Game.changed) return;

	gridData.set('grid', grid);

	console.log("Saved grid");

};

io.on('connection', client => {

	console.log(`New connection with id ${client.id}`);

	io.to(client.id).emit('gamedata', { grid: Game.grid });

	client.on('addtile', data => {
		client.broadcast.emit('addtile', data);
		Game.grid = GameLogic.addTile(Game, data.x, data.y, data.type, data.height);
		Game.changed = true;
	});

	client.on('removetile', data => {
		client.broadcast.emit('removetile', data);
		Game.grid = GameLogic.removeTile(Game, data.x, data.y);
		Game.changed = true;

		// Make sure grid isn't empty
		if (Game.grid.every(y => y.every(x => x === -1))) {
			console.log("Grid empty, resetting...");
			Game.grid = [[{type: 0, height: 0.5}]];
			io.emit('gamedata', { grid: Game.grid });
		}
	});

	client.on('updatetile', data => {
		client.broadcast.emit('updatetile', data);
		Game.grid[data.y][data.x].type = data.type;
		Game.grid[data.y][data.x].height = data.height;
		Game.changed = true;
	});

	client.on('disconnect', () => {
		console.log(`Disconnect with id ${client.id}`);
		saveChanges(Game.grid);
	});

});
