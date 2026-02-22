// Game Engine and UI Logic

// Data setup
const ELEMENTS = {
    fire:      { id: "fire",      icon: "🔥", color: "#ff4500" },
    cold:      { id: "cold",      icon: "❄️", color: "#00ffff" },
    water:     { id: "water",     icon: "💧", color: "#1e90ff" },
    lightning: { id: "lightning", icon: "⚡", color: "#8a2be2" },
    earth:     { id: "earth",     icon: "🪨", color: "#8b4513" },
    shield:    { id: "shield",    icon: "🛡️", color: "#ffd700" },
    life:      { id: "life",      icon: "💚", color: "#32cd32" },
    arcane:    { id: "arcane",    icon: "🧿", color: "#dc143c" }
};

const OPPOSING_ELEMENTS = [
    ["fire", "cold"],
    ["water", "lightning"],
    ["life", "arcane"]
];

let spellQueue = [];
let projectiles = [];
let enemies = [];
let score = 0;
let currentCR = 0;
const MAX_CR = 100;

let gameData = {};
let availableEnemies = [];
const imageCache = {};

// Preload player image
const playerImage = new Image();
playerImage.src = 'assets/monsters/Mage.webp';

// Fetch enemy data
fetch('/assets/game_data.json').then(r => r.json()).then(data => {
    gameData = data;
    availableEnemies = Object.keys(data);
});

// Canvas Setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Level Definition (Extensible JSON structure)
const level = {
    width: 2000,
    height: 2000,
    walls: [
        { x: 0, y: 0, w: 2000, h: 50 },          // Top wall
        { x: 0, y: 1950, w: 2000, h: 50 },       // Bottom wall
        { x: 0, y: 0, w: 50, h: 2000 },          // Left wall
        { x: 1950, y: 0, w: 50, h: 2000 },       // Right wall
        { x: 600, y: 600, w: 200, h: 50 },       // Inner obstacle 1
        { x: 1200, y: 1200, w: 50, h: 200 }      // Inner obstacle 2
    ],
    doors: [
        { x: 900, y: 0, w: 200, h: 50 }          // North Door exit
    ]
};

// Player State
const player = {
    x: 1000,
    y: 1000,
    radius: 20,
    vx: 0,
    vy: 0,
    speed: 7,
    color: '#34d399', // Emerald Green
    hp: 100,
    maxHp: 100,
    status: 'alive'
};

// Camera
const camera = { x: 0, y: 0 };

// Check if mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (!isMobile) {
    document.getElementById('joystick-zone').innerHTML = '<p style="color:white;text-align:center;margin-top:20vh;">Use Mobile Device<br>or Touch Emulator<br>to test Joystick</p>';
}

// Controls Setup (NippleJS Virtual Joystick)
if (typeof nipplejs !== 'undefined') {
    const joystickZone = document.getElementById('joystick-zone');
    const manager = nipplejs.create({
        zone: joystickZone,
        mode: 'dynamic',
        color: 'white'
    });

    manager.on('move', (evt, data) => {
        const angle = data.angle.radian;
        // Map movement to canvas coordinates (y is inverted in nipplejs)
        player.vx = Math.cos(angle) * player.speed;
        player.vy = -Math.sin(angle) * player.speed; 
    });

    manager.on('end', () => {
        player.vx = 0;
        player.vy = 0;
    });
}

// UI Setup - Circular Menu for Orbs
const spellMenuZone = document.getElementById('spell-menu-zone');
const radius = 70;
const elementKeys = Object.keys(ELEMENTS);

elementKeys.forEach((key, index) => {
    const angle = (index / elementKeys.length) * Math.PI * 2;
    const btnX = Math.cos(angle) * radius;
    const btnY = Math.sin(angle) * radius;
    
    const btn = document.createElement('button');
    btn.className = 'element-btn';
    btn.innerHTML = ELEMENTS[key].icon;
    btn.style.backgroundColor = ELEMENTS[key].color;
    // Center the element relative to the menu zone
    btn.style.left = `calc(50% + ${btnX}px - 25px)`;
    btn.style.top = `calc(50% + ${btnY}px - 25px)`;
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent zoom issues
        queueElement(key);
    });
    
    spellMenuZone.appendChild(btn);
});

function queueElement(id) {
    if (spellQueue.length >= 5) return;
    
    // Cancellation logic
    for (let pair of OPPOSING_ELEMENTS) {
        const [elA, elB] = pair;
        if ((id === elA && spellQueue.includes(elB)) || 
            (id === elB && spellQueue.includes(elA))) {
            const opposingElement = id === elA ? elB : elA;
            const indexToRemove = spellQueue.lastIndexOf(opposingElement);
            if (indexToRemove !== -1) {
                spellQueue.splice(indexToRemove, 1);
                renderQueue();
                return;
            }
        }
    }
    
    spellQueue.push(id);
    renderQueue();
}

function renderQueue() {
    const queueContainer = document.getElementById('spell-queue');
    queueContainer.innerHTML = '';
    
    // Fill 5 slots
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'queue-slot';
        if (i < spellQueue.length) {
            const elId = spellQueue[i];
            const elObj = ELEMENTS[elId];
            slot.innerHTML = elObj.icon;
            slot.style.boxShadow = `0 0 10px ${elObj.color}`;
            slot.style.borderColor = elObj.color;
        }
        queueContainer.appendChild(slot);
    }
}
renderQueue();

const castBtn = document.getElementById('cast-btn');
castBtn.addEventListener('click', () => {
    if (player.status === 'dead') return; // Ghost cannot cast
    if (spellQueue.length === 0) return;
    
    // Check Revive Combo
    if (spellQueue.includes('life') && spellQueue.includes('lightning')) {
        if (window.multiplayer && window.multiplayer.connected) {
             window.multiplayer.socket.send(JSON.stringify({ type: 'cast_revive' }));
        }
        // Big AoE visual
        projectiles.push({
            x: player.x, y: player.y, vx: 0, vy: 0, radius: 150, colors: ['#32cd32', 'transparent'], life: 20
        });
        spellQueue = [];
        renderQueue();
        return;
    }
    
    // Shoot projectile in direction of movement
    let dx = player.vx;
    let dy = player.vy;
    if (dx === 0 && dy === 0) dx = 1; // default forward

    const mag = Math.sqrt(dx*dx + dy*dy);
    const speed = 15;
    
    // Prevent NaN if mag is 0
    let vx = (mag > 0) ? (dx/mag) * speed : speed;
    let vy = (mag > 0) ? (dy/mag) * speed : 0;
    
    projectiles.push({
        x: player.x,
        y: player.y,
        vx: vx,
        vy: vy,
        radius: 8,
        colors: spellQueue.map(id => ELEMENTS[id].color),
        life: 100
    });
    
    spellQueue = []; // Clear after cast
    renderQueue();
});

// Game Loop Dynamics
let lastTime = 0;

function checkCollisions(newX, newY) {
    let canMoveX = true;
    let canMoveY = true;
    const r = player.radius;

    for (let wall of level.walls) {
        // Simple AABB Collision resolution
        if (newX + r > wall.x && newX - r < wall.x + wall.w &&
            player.y + r > wall.y && player.y - r < wall.y + wall.h) {
            canMoveX = false;
        }
        if (player.x + r > wall.x && player.x - r < wall.x + wall.w &&
            newY + r > wall.y && newY - r < wall.y + wall.h) {
            canMoveY = false;
        }
    }
    return { canMoveX, canMoveY };
}

function update(dt) {
    const isHostOrOffline = !window.multiplayer || !window.multiplayer.connected || window.multiplayer.isHost;

    // Safety: Prevent NaN propagation
    if (isNaN(player.x) || isNaN(player.y)) {
        player.x = 1000; player.y = 1000;
        console.error("Player coordinates were NaN! Resetting to center.");
    }

    // Player Joystick Movement logic
    let moveX = player.status === 'dead' ? player.vx * 0.5 : player.vx;
    let moveY = player.status === 'dead' ? player.vy * 0.5 : player.vy;
    
    if (moveX !== 0 || moveY !== 0) {
        const nextX = player.x + moveX;
        const nextY = player.y + moveY;
        
        const collisions = checkCollisions(nextX, nextY);
        if (collisions.canMoveX) player.x = nextX;
        if (collisions.canMoveY) player.y = nextY;
    }
    
    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        let hitEdge = false;
        // Simple wall collision for projectiles (destroy)
        for(let wall of level.walls) {
            if (p.x > wall.x && p.x < wall.x + wall.w &&
                p.y > wall.y && p.y < wall.y + wall.h) {
                hitEdge = true;
                break;
            }
        }
        
        let hitEnemy = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                hitEnemy = true;
                
                if (isHostOrOffline) {
                    e.hp -= 25;
                    if(e.hp <= 0) {
                        enemies.splice(j, 1);
                        score += 10;
                    }
                } else if (window.multiplayer && window.multiplayer.connected && e.id) {
                    // Send damage event to the Server to relay to the Host
                    window.multiplayer.socket.send(JSON.stringify({
                        type: 'damage_enemy',
                        id: e.id,
                        damage: 25
                    }));
                }
                
                break; // project dies on one enemy
            }
        }

        if (p.life <= 0 || hitEdge || hitEnemy) projectiles.splice(i, 1);
    }
    
    // Enemy spawning and movement
    if (isHostOrOffline) {
        
        // Calculate CR
        currentCR = enemies.reduce((sum, e) => sum + (e.cr || 1), 0);
        
        if (Math.random() < 0.05 && availableEnemies.length > 0) { // Spawn rate
            // pick random spawner or random edge
            let enemyName = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            let data = gameData[enemyName];
            
            if (currentCR + (data.cr || 1) <= MAX_CR) {
                enemies.push({
                    id: Math.random().toString(36).substring(2, 10), // Unique ID for networking
                    name: enemyName,
                    x: Math.random() < 0.5 ? -50 : 2050,
                    y: Math.random() * 2000,
                    radius: data.radius,
                    speed: data.speed,
                    color: data.color || '#b91c1c',
                    hp: data.hp,
                    maxHp: data.hp,
                    path: data.path,
                    cr: data.cr || 1,
                    move_pattern: data.move_pattern || "DIRECT",
                    move_params: data.move_params || {}
                });
                
                // Lazy load image
                if (!imageCache[enemyName]) {
                    let img = new Image();
                    img.src = data.path;
                    imageCache[enemyName] = img;
                }
            }
        }
    }
    
    // Create Global 'Alive Targets' Array for AI
    let aliveTargets = [];
    if (player.status !== 'dead') aliveTargets.push(player);
    if (window.multiplayer && window.multiplayer.otherPlayers) {
        for (let id in window.multiplayer.otherPlayers) {
            let p2 = window.multiplayer.otherPlayers[id];
            if (p2.status !== 'dead') aliveTargets.push(p2);
        }
    }
    
    // AI Movement Loop (Host Only)
    if (isHostOrOffline) {
        for (let e of enemies) {
            let dx = 0; let dy = 0; let mag = Infinity;
            
            // Find NEAREST alive player
            if (aliveTargets.length > 0) {
                let nearestDist = Infinity;
                let nearestTarget = null;
                for (let t of aliveTargets) {
                    let d = Math.hypot(t.x - e.x, t.y - e.y);
                    if (d < nearestDist) { nearestDist = d; nearestTarget = t; }
                }
                
                dx = nearestTarget.x - e.x;
                dy = nearestTarget.y - e.y;
                mag = nearestDist;
            }
        
        // Complex JSON-driven AI Behaviors
        if (!e.state) e.state = { timer: 0, phase: 'idle' };
        e.state.timer += dt;
        
        let moveX = 0, moveY = 0;
        const params = e.move_params || {};
        const dirX = (mag > 0 && mag !== Infinity) ? dx / mag : 0;
        const dirY = (mag > 0 && mag !== Infinity) ? dy / mag : 0;
        
        if (e.move_pattern === "ORBITER") {
            const orbitRad = params.orbitRadius || 300;
            if (mag > orbitRad + 10) { moveX = dirX; moveY = dirY; }
            else if (mag < orbitRad - 10) { moveX = -dirX; moveY = -dirY; }
            else { moveX = -dirY; moveY = dirX; } // orbit around
        } else if (e.move_pattern === "ZIGZAG") {
            const freq = params.zigzagFrequency || 0.01;
            const amp = params.zigzagAmplitude || 3;
            const perpX = -dirY; const perpY = dirX;
            const wave = Math.sin(Date.now() * freq) * amp;
            moveX = dirX + perpX * wave;
            moveY = dirY + perpY * wave;
        } else if (e.move_pattern === "HOPPER") {
            if (e.state.phase === 'idle') {
                if (e.state.timer >= (params.hopCooldown || 1500)) {
                    e.state.phase = 'hopping'; e.state.timer = 0;
                    e.state.hopDx = dirX; e.state.hopDy = dirY;
                }
            } else if (e.state.phase === 'hopping') {
                moveX = e.state.hopDx * (params.hopSpeedMult || 3); 
                moveY = e.state.hopDy * (params.hopSpeedMult || 3);
                if (e.state.timer >= (params.hopDuration || 300)) { e.state.phase = 'idle'; e.state.timer = 0; }
            }
        } else if (e.move_pattern === "CHARGER") {
             if (e.state.phase === 'idle') {
                 if (mag < (params.chargeDistance||300) && e.state.timer > (params.chargeCooldown||3000)) {
                     e.state.phase = 'charging'; e.state.timer = 0;
                     e.state.chargeDx = dirX; e.state.chargeDy = dirY;
                 } else {
                     moveX = dirX * 0.5; moveY = dirY * 0.5; // walk slowly
                 }
             } else if (e.state.phase === 'charging') {
                 moveX = e.state.chargeDx * (params.chargeSpeedMult||3);
                 moveY = e.state.chargeDy * (params.chargeSpeedMult||3);
                 if (e.state.timer > (params.chargeDuration||500)) { e.state.phase = 'idle'; e.state.timer = 0; }
             }
        } else {
             // SLOW_APPROACH / DIRECT
             moveX = dirX; moveY = dirY;
        }
        
        // Normalize and apply speed
        let mMag = Math.hypot(moveX, moveY);
        if (mMag > 0 && !isNaN(mMag) && isFinite(mMag) && !isNaN(e.x) && !isNaN(e.y)) {
            e.x += (moveX/mMag) * e.speed;
            e.y += (moveY/mMag) * e.speed;
        }
    }
    }

    // Damage Loop (All Clients)
    for (let e of enemies) {
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let mag = Math.hypot(dx, dy);
        
        // Player taking damage
        if (player.status !== 'dead' && mag < player.radius + e.radius) {
            player.hp -= 0.5; 
            if (player.hp <= 0) {
                player.hp = 0;
                player.status = 'dead';
                if (window.multiplayer && window.multiplayer.connected) {
                     window.multiplayer.socket.send(JSON.stringify({ type: 'player_died' }));
                }
            }
        }
    }
    
    // Update HP UI
    document.getElementById('health-fill').style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
    
    // Update Host & CR HUD
    if (window.multiplayer) {
         if (window.multiplayer.isHost) {
             document.getElementById('host-indicator').classList.remove('hidden');
         } else {
             document.getElementById('host-indicator').classList.add('hidden');
         }
    }
    
    document.getElementById('enemy-info').innerText = `Enemies: ${enemies.length} (CR ${currentCR}/${MAX_CR})`;

    // Smooth Camera Follow
    camera.x = player.x - width / 2;
    camera.y = player.y - height / 2;
    
    // Broadcoast position to other players
    if (window.multiplayer && window.multiplayer.connected) {
         window.multiplayer.sendUpdate({
             x: player.x,
             y: player.y,
             color: player.color,
             status: player.status
         }, enemies, currentCR);
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw Level Floor
    ctx.fillStyle = '#1e293b'; // Slate background
    ctx.fillRect(0, 0, level.width, level.height);
    
    // Draw Grid Lines (To help visualize movement)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let x = 0; x <= level.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, level.height); ctx.stroke();
    }
    for (let y = 0; y <= level.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(level.width, y); ctx.stroke();
    }

    // Draw Walls
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    for (let wall of level.walls) {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }
    
    // Draw Level Doors
    ctx.fillStyle = '#ca8a04'; // Warm yellow door
    for (let door of level.doors) {
        ctx.fillRect(door.x, door.y, door.w, door.h);
    }
    
    // Draw Projectiles
    for (let p of projectiles) {
        if (isNaN(p.x) || isNaN(p.y) || isNaN(p.radius)) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        // Simple radial gradient for multi-coloured spells, or solid single color
        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        radGrad.addColorStop(0, p.colors[0]);
        radGrad.addColorStop(1, p.colors[p.colors.length - 1] || p.colors[0]);
        ctx.fillStyle = radGrad;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw Enemies
    for (let e of enemies) {
        if (imageCache[e.name] && imageCache[e.name].complete) {
            ctx.drawImage(imageCache[e.name], e.x - e.radius, e.y - e.radius, e.radius*2, e.radius*2);
        } else {
            ctx.beginPath();
            ctx.rect(e.x - e.radius, e.y - e.radius, e.radius*2, e.radius*2);
            ctx.fillStyle = e.color;
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }
        
        // hp bar
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, e.radius*2, 4);
        ctx.fillStyle = 'green';
        ctx.fillRect(e.x - e.radius, e.y - e.radius - 8, (e.radius*2) * (e.hp/e.maxHp), 4);
    }
    
    // Draw Enemy/Other Players
    if (window.multiplayer && window.multiplayer.otherPlayers) {
        const ops = window.multiplayer.otherPlayers;
        for (let id in ops) {
            const op = ops[id];
            
            ctx.globalAlpha = op.status === 'dead' ? 0.4 : 1.0;
            if (playerImage.complete) {
                // Draw mage token for other players too
                ctx.drawImage(playerImage, op.x - player.radius, op.y - player.radius, player.radius*2, player.radius*2);
            } else {
                ctx.beginPath();
                if (!isNaN(op.x) && !isNaN(op.y)) {
                    ctx.arc(op.x, op.y, player.radius, 0, Math.PI * 2);
                }
                ctx.fillStyle = op.color || '#34d399';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
            
            // Draw name tag
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = '12px Inter';
            ctx.fillText("Mage " + id.toString().substring(0,4), op.x, op.y - 30);
        }
    }

    // Draw Local Player
    ctx.globalAlpha = player.status === 'dead' ? 0.4 : 1.0;
    if (playerImage.complete) {
        ctx.drawImage(playerImage, player.x - player.radius, player.y - player.radius, player.radius*2, player.radius*2);
    } else {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    try {
        update(dt);
        draw();
    } catch (e) {
        console.error("Game loop crashed!", e);
        if (document.getElementById('enemy-info')) {
             document.getElementById('enemy-info').innerText = "ERROR: " + e.message;
             document.getElementById('enemy-info').style.backgroundColor = "rgba(255,0,0,0.8)";
        }
    }
    
    animationId = requestAnimationFrame(loop);
}

// ==========================================
// TEST AUTO-AIM & AUTO-SHOOT LOGIC (Removable)
// ==========================================
setInterval(() => {
    // Check auto-revive first
    let anyoneDead = false;
    if (window.multiplayer && window.multiplayer.otherPlayers) {
        for (let id in window.multiplayer.otherPlayers) {
            if (window.multiplayer.otherPlayers[id].status === 'dead') {
                anyoneDead = true; break;
            }
        }
    }
    
    if (anyoneDead && player.status !== 'dead') {
        spellQueue = []; // clear
        queueElement('life');
        queueElement('lightning');
        document.getElementById('cast-btn').click();
        return;
    }

    if (player.status === 'dead') return; // Cannot shoot if dead
    if (enemies.length === 0) return; // Nobody to shoot

    // Find nearest
    let nearest = null;
    let minDist = Infinity;
    for (let e of enemies) {
        let dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = e;
        }
    }

    if (nearest) {
        // Queue a test fire spell
        spellQueue = ["fire", "earth"]; 
        
        let dx = 1; let dy = 0;
        if (nearest) {
            dx = nearest.x - player.x;
            dy = nearest.y - player.y;
        }
        let mag = Math.hypot(dx, dy);
        
        const speed = 15;
        let vx = (mag > 0) ? (dx/mag) * speed : speed;
        let vy = (mag > 0) ? (dy/mag) * speed : 0;
        
        projectiles.push({
            x: player.x,
            y: player.y,
            vx: vx,
            vy: vy,
            radius: 8,
            colors: spellQueue.map(id => ELEMENTS[id].color),
            life: 100
        });
        
        spellQueue = []; // Clear after shoot
        renderQueue();
    }
}, 500); // Shoot every 500ms
// ==========================================

let animationId;
window.stopGameEngine = function() {
    cancelAnimationFrame(animationId);
};
window.resetGameState = function() {
    player.hp = player.maxHp;
    player.status = 'alive';
    enemies = [];
    projectiles = [];
    score = 0;
    spellQueue = [];
    document.getElementById('health-fill').style.width = '100%';
};

// Start Engine
window.startGameEngine = function() {
    resetGameState();
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
};

window.reviveLocalPlayer = function() {
    player.status = 'alive';
    player.hp = player.maxHp * 0.5;
    document.getElementById('health-fill').style.width = '50%';
};

window.updateEnemiesFromServer = function(serverEnemies, serverCR) {
    if (!serverEnemies) return;
    enemies = serverEnemies;
    if (serverCR !== undefined) currentCR = serverCR;
    
    for (let e of enemies) {
        if (e.name && !imageCache[e.name]) {
            let img = new Image();
            img.src = e.path;
            imageCache[e.name] = img;
        }
    }
};

window.applyEnemyDamageFromServer = function(enemyId, damage) {
    // Only the host actually processes HP reduction and splices 
    // to ensure there's no sequence-breaking desync
    const isHostOrOffline = !window.multiplayer || !window.multiplayer.connected || window.multiplayer.isHost;
    if (!isHostOrOffline) return;
    
    for (let j = enemies.length - 1; j >= 0; j--) {
        if (enemies[j].id === enemyId) {
            enemies[j].hp -= damage;
            if (enemies[j].hp <= 0) {
                enemies.splice(j, 1);
                score += 10;
            }
            break;
        }
    }
};
