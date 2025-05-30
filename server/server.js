var path = require('path'); //responsible for finding and navigating file paths
var http = require('http'); //responsible for connecting to the internet
var express = require('express'); //responsible for sending fils
var socketIO = require('socket.io') //responsible for sending and receiving real timee data(text and numbers)


var publicPath = path.join(__dirname, '../client'); //it simply adds two paths together
var port = process.env.PORT || 2000; // this is the port that server is using on a computer

var app = express(); //initializing the express library
var server = http.createServer(app); //creating a server that sends files
var io = socketIO(server) //making socket.io responsible for the real time connection logic 
app.use(express.static(publicPath)); 

//starting the server on port, we can have multiple servers on multiple ports - localhost2000
server.listen(port, function()  {
    console.log('Server is up on port:' + port); //confirmation 
});



//multiplayer aspect of the game
//On the server, maintain a players object to track all connected players.
//When a client connects:
//Add that player to players with initial position.
//Send the current players list to the new client.
//Notify all clients about the new player.
// Clients send their movement + rotation updates to the server continuously.
// Server broadcasts all players’ states regularly to everyone.
// When a client disconnects, remove them and notify others.


let players = {};

io.on('connection', function(socket) {
    console.log("Player connected: " + socket.id);

    // Initialize player data
    players[socket.id] = {
        x: Math.random() * 800,
        y: Math.random() * 600,
        angle: 0,
        id: socket.id,
        name: "Player_" + socket.id.slice(0, 5)
    };

    socket.on('setName', function(name) {
    if (players[socket.id]) {
            players[socket.id].name = name;
            // Inform all clients that this player's name was updated
            io.emit('nameUpdated', { id: socket.id, name: name });
        }
    });

    // Send current players to new player
    socket.emit('currentPlayers', players);

    // Notify all others about the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // When a player sends a chat message:
    socket.on('chatMessage', (msg) => {
        // Broadcast to all players including sender
        io.emit('chatMessage', {
            id: socket.id,
            name: players[socket.id]?.name || "Unnamed",
            message: msg
        });
    });

    // Listen for player movement updates
    socket.on('playerMovement', function(data) {
    if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;

            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle disconnect
    socket.on('disconnect', function() {
        console.log("Player disconnected: " + socket.id);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});


