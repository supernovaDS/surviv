var socket;
var players = {};  // all players including self
var playerId;
let trees = []; // Store positions of trunks for collision



//everything about the loading before the game starts 
function preload(){
    //code here

}

//this is the first thing that is called when the game is started, and is called only one time
function setup(){
    //code here
    socket = io();

    createCanvas(windowWidth, windowHeight);
    
    // Receive current players list from server
    socket.on('currentPlayers', function(serverPlayers) {
        players = serverPlayers;
        playerId = socket.id;
    });


    // When a new player joins
    socket.on('newPlayer', function(newPlayer) {
        players[newPlayer.id] = newPlayer;
    });

    // When a player disconnects
    socket.on('removePlayer', function(id) {
        delete players[id];
    });

    //receive movements position angle of other players
    socket.on('playerMoved', function(playerData) {
    if (players[playerData.id]) {
            players[playerData.id].x = playerData.x;
            players[playerData.id].y = playerData.y;
            players[playerData.id].angle = playerData.angle;
        }
    });

    // Add trees to map
    trees = [
        { x: 300, y: 300, radius: 45 },
        { x: 1000, y: 1000, radius: 45 },
        { x: 1500, y: 400, radius: 45 }
    ];


}


function drawPlayer(p) {
    push();
    translate(p.x, p.y);
    rotate(p.angle);

    fill(255, 223, 196);
    ellipse(0, 0, 60, 60);

    fill(225, 184, 153);
    ellipse(25, -20, 20, 20);
    ellipse(25, 20, 20, 20);

    pop();
}

function updateLocalPlayer(p) {
    let prevX = p.x;
    let prevY = p.y;

    p.speedX = 0;
    p.speedY = 0;
    if (keyIsDown(87)) p.speedY = -5;
    if (keyIsDown(83)) p.speedY = 5;
    if (keyIsDown(65)) p.speedX = -5;
    if (keyIsDown(68)) p.speedX = 5;

    p.x += p.speedX;
    p.y += p.speedY;

    // Check collision with tree trunks
    for (let tree of trees) {
        let distToTree = dist(p.x, p.y, tree.x, tree.y);
        if (distToTree < tree.radius + 30) { // 30 is approx player radius
            // undo movement if colliding with trunk
            p.x = prevX;
            p.y = prevY;
            break;
        }
    }

    let worldMouseX = mouseX - width / 2 + p.x;
    let worldMouseY = mouseY - height / 2 + p.y;
    p.angle = atan2(worldMouseY - p.y, worldMouseX - p.x);
}

function sendPlayerUpdates(me) {
    socket.emit('playerMovement', {
        x: me.x,
        y: me.y,
        angle: me.angle
    });
}

//draw the trees
function drawTree(x, y) {
    //Leaves drawn on top layer later
    trees.push({ x: x, y: y, radius: 45 }); // for collision with trunk
    drawTrunk(x, y);
}

function drawTreeLeaves(x, y) {
    push();
    translate(x, y);

    // Draw leafy crown (will be drawn AFTER players for semi-overlay effect)
    fill(80, 125, 42, 250); // sap green with transparency
    noStroke();
    for (let i = 0; i < 10; i++) {
        let angle = TWO_PI * i / 10;
        let crownX = cos(angle) * 90;
        let crownY = sin(angle) * 90;
        ellipse(crownX, crownY, 90, 80);
    }

    pop();
}

function drawTrunk(x, y) {
    push();
    translate(x, y);

    // Draw trunk (solid, collision applies here)
    fill(139, 69, 19);
    noStroke();
    ellipse(0, 0, 90, 90);

    pop();
}


//this is called a lot of times per second (fps)
function draw() {
    background(0, 51, 255);
    if (!players[playerId]) return; // wait for player data

    let me = players[playerId];

    let prevX = me.x;
    let prevY = me.y;

    
    // Update local player position and angle based on input
    updateLocalPlayer(me);

    
    // Center the view on current player
    translate(width/2 - me.x, height/2 - me.y);

    // Draw map
    fill(0, 200, 0); // bright green
    rect(0, 0, 2000, 2000); // larger map size if you want to explore


    
    // updateLocalPlayer(me) here

 

    // Draw trunks first (below players)
    for (let tree of trees) {
        drawTrunk(tree.x, tree.y);
    }

    // Draw all players
    for(let id in players){
        let p = players[id];
        drawPlayer(p, id === playerId);
    }

    


    // Draw tree leaves last (overlaying players)
    for (let tree of trees) {
        drawTreeLeaves(tree.x, tree.y);
    }

    // Send movement and rotation updates to server
    sendPlayerUpdates(me);


}


