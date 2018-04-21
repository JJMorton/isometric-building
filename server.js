const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 8001, function() {
	console.log("Server runnning, listening on port " + server.address().port);
});
app.use(express.static('public'));
