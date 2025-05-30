var socket;
var players = {};  // all players including self
var playerId;
let playerName = "";
let gameStarted = false;
let trees = []; // Store positions of trunks for collision
let houses = [
    { id: 1, x: 700, y: 800, width: 500, height: 400, entered: false },
    { id: 2, x: 1300, y: 600, width: 500, height: 400, entered: false }
];
let chatFocused = false;
const chatInput = document.getElementById('chat-input');

chatInput.addEventListener('focus', () => {
    chatFocused = true;
});

chatInput.addEventListener('blur', () => {
    chatFocused = false;
});



//everything about the loading before the game starts 
function preload(){
    //code here

}

//this will start the game 
function startGame() {
    const input = document.getElementById("name-input");
    const name = input.value.trim();
    if (name.length === 0) return;

    playerName = name;
    document.getElementById("start-screen").style.display = "none";
    gameStarted = true;

    // Send name to server (optional, if server tracks it)
    socket.emit("setName", name);
}

function addChatSystemMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.textContent = message;
        div.style.color = 'lightgreen'; // system message color
        div.style.fontStyle = 'italic';
        div.style.padding = '2px 0';
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

//this is the first thing that is called when the game is started, and is called only one time
function setup(){
    //code here
    socket = io();

    createCanvas(windowWidth, windowHeight);
    
    // When receiving current players from server
    socket.on('currentPlayers', function(serverPlayers) {
        players = serverPlayers;
        playerId = socket.id;

        // Initialize local player name and house properties if not already
        if (!players[playerId].name) players[playerId].name = playerName;
        if (players[playerId].inHouse === undefined) players[playerId].inHouse = false;
        if (players[playerId].houseId === undefined) players[playerId].houseId = null;
    });

    // When a new player joins
    socket.on('newPlayer', function(newPlayer) {
        if (!newPlayer.name) newPlayer.name = "Unnamed";
        if (newPlayer.inHouse === undefined) newPlayer.inHouse = false;
        if (newPlayer.houseId === undefined) newPlayer.houseId = null;
        players[newPlayer.id] = newPlayer;

        // Show join message here - but only if the name is known now
        if (newPlayer.name && newPlayer.name !== "Unnamed") {
            addChatSystemMessage(`${newPlayer.name} joined`);
        } else {
            // If name not ready, just show id for now
            addChatSystemMessage(`Player ${newPlayer.id} joined`);
        }
    });


    let welcomedPlayers = new Set();

    socket.on("nameUpdated", ({ id, name }) => {
        if (players[id]) {
            players[id].name = name;

            if (!welcomedPlayers.has(id)) {
                addChatSystemMessage(`${name} joined`);
                welcomedPlayers.add(id);
            }
        }
    });


    // Send chat message when Enter key is pressed
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const msg = this.value.trim();
            if (msg.length > 0) {
                socket.emit('chatMessage', msg);
                this.value = '';
            }
        }
    });

    // Listen for chat messages from server and display
    socket.on('chatMessage', ({ id, name, message }) => {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.textContent = `${name}: ${message}`;
        div.style.padding = '2px 0';
        if (id === socket.id) {
            div.style.color = 'yellow'; // Highlight own messages
        }
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll to bottom
    });

    // When a player disconnects
    socket.on('removePlayer', function(id) {
    if(players[id]) {
        let name = players[id].name || `Player ${id}`;
        addChatSystemMessage(`${name} left the game`);
        delete players[id];
        }
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


function drawPlayer(p, isMe) {
    push();
    translate(p.x, p.y);
    rotate(p.angle);

    // Body
    fill(255, 223, 196);
    ellipse(0, 0, 60, 60);
    fill(225, 184, 153);
    ellipse(25, -20, 20, 20);
    ellipse(25, 20, 20, 20);

    pop();

    // Draw name above player
    push();
    textAlign(CENTER);
    textSize(16);
    fill(isMe ? 'yellow' : 'white'); // Highlight your own name
    text(p.name || 'Unnamed', p.x, p.y - 45);
    pop();
}


function updateLocalPlayer(p) {
    let prevX = p.x;
    let prevY = p.y;

    p.speedX = 0;
    p.speedY = 0;

    // If chat is focused, ignore movement input!
    if (!chatFocused) {
        if (keyIsDown(87)) p.speedY = -5;
        if (keyIsDown(83)) p.speedY = 5;
        if (keyIsDown(65)) p.speedX = -5;
        if (keyIsDown(68)) p.speedX = 5;

        p.x += p.speedX;
        p.y += p.speedY;
    }

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

    // Collision with house walls
    // House wall collision
    for (let house of houses) {
        // if inside a house, skip collision checks for other houses
        if (p.inHouse && p.houseId !== house.id) continue;

        let left = house.x - house.width / 2 - 20;
        let right = house.x + house.width / 2 + 20;
        let top = house.y - house.height / 2 - 20;
        let bottom = house.y + house.height / 2 + 20;

        let doorX = house.x;
        let doorY = house.y + house.height / 2 - 20;

        let nearDoor;
        if (!p.inHouse) {
            nearDoor = dist(p.x, p.y, doorX, doorY) < 40;
        } else {
            // Only allow approaching the door from *inside* if they're close and near bottom
            nearDoor = (
                abs(p.x - doorX) < 30 &&
                p.y > doorY - 100 &&
                p.y < doorY + 20
            );
        }

        if (!p.inHouse) {
            if (p.x > left && p.x < right &&
                p.y > top && p.y < bottom &&
                !nearDoor) {
                p.x = prevX;
                p.y = prevY;
                break;
            }
        } else {
            if ((p.x < left + 40 || p.x > right - 40 ||
                p.y < top + 40 || p.y > bottom - 40) && !nearDoor) {
                p.x = prevX;
                p.y = prevY;
                break;
            }
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
        angle: me.angle,
        name: me.name || playerName
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

function drawHouse(house, playerIsInside) {
    push();
    translate(house.x, house.y);
    rectMode(CENTER);

    if (playerIsInside) {
        // Inside: original color
        fill(200, 140, 100); // light brown
    } else {
        // Outside: darker shade
        fill(90, 50, 20); // dark brown
    }

    // House base
    rect(0, 0, house.width, house.height);

    // Door
    if (playerIsInside) {
        fill(80, 50, 20); // normal door brown
    } else {
        fill(20, 20, 20); // blackish door when outside
    }
    rect(0, house.height / 2 - 32.5, 75, 65);

    // Windows (optional tweak: make them dimmer outside)
    if (playerIsInside) {
        fill(180, 220, 255); // bright windows
    } else {
        fill(100, 120, 140); // dimmed blue-gray
    }
    rect(-100, house.height / 2 - 10, 60, 20);
    rect(-house.width / 2 + 10, -10, 20, 60);

    pop();
}

//pressing e enters the house and q exits the house
function keyPressed() {
    let me = players[playerId];
    if (!me) return;

    // Try to enter
    if (key === 'e' || key === 'E') {
        for (let house of houses) {
            let doorX = house.x;
            let doorY = house.y + house.height / 2 - 20;
            let d = dist(me.x, me.y, doorX, doorY);
            if (d < 50 && !me.inHouse) {
                me.inHouse = true;
                me.houseId = house.id;
                // Move player slightly inside
                me.x = house.x;
                me.y = house.y + house.height / 2 - 100; 

                return;
            }
        }
    }

    // Try to exit
    if (key === 'q' || key === 'Q') {
        if (me.inHouse) {
            // Find the house object from the houseId number
            let house = houses.find(h => h.id === me.houseId);
            if (!house) return; // safety check
            
            let doorX = house.x;
            let doorY = house.y + house.height / 2 - 20;
            let d = dist(me.x, me.y, doorX, doorY);
            if (d < 50) {
                me.inHouse = false;
                me.houseId = null;
                // Move player slightly outside the door
                me.y = doorY + 50;
            }
        }
    }
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

    //draw the houses
    for (let house of houses) {
        let isInsideThisHouse = me.inHouse && me.houseId === house.id;
        drawHouse(house, isInsideThisHouse);
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

    for (let house of houses) {
        let doorX = house.x;
        let doorY = house.y + house.height / 2 - 20;
        let d = dist(me.x, me.y, doorX, doorY);

        if (d < 40 ) {
            fill(255);
            textAlign(CENTER);
            textSize(16);
            let msg = !me.inHouse
            if (!me.inHouse) {
                text("Enter the door and Press E to enter\nPress Q to Exit " , doorX, doorY + 40);
            } else {
                text("Press Q to exit", doorX, doorY + 40);
            }
        }
    }



    // Send movement and rotation updates to server
    sendPlayerUpdates(me);


}


