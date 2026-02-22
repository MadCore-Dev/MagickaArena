class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.otherPlayers = {}; // id -> state
        this.connected = false;
        this.isHost = false;
        this.myId = null;
        
        // Fetch server info
        fetch('/api/ip').then(res => res.json()).then(data => {
            this.serverIp = data.ip;
            this.serverPort = data.port;
            this.wsPort = data.ws_port;
            this.connect();
            this.setupQR();
        }).catch(err => {
            console.log("Failed to fetch /api/ip, likely running locally without Python server. Multiplayer disabled.", err);
        });
    }
    
    connect() {
        this.socket = new WebSocket(`ws://${window.location.hostname}:${this.wsPort}`);
        
        this.socket.onopen = () => {
            console.log("Connected to multiplayer server");
            this.connected = true;
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'init') {
                this.myId = data.client_id;
                this.isHost = data.is_host;
                if (data.game_state === 'PLAYING') {
                    // Joined while game is in progress (edge case)
                    this.startGameplay();
                }
            }
            else if (data.type === 'lobby_update') {
                this.updateLobbyUI(data.players);
            }
            else if (data.type === 'transition_to_game') {
                this.startGameplay();
            }
            else if (data.type === 'host_reassigned') {
                const wasHost = this.isHost;
                this.isHost = (this.myId === data.new_host_id);
                this.updateLobbyUI(data.players);
                
                // Host Migration: Automatically inherit server checkpoint data!
                if (!wasHost && this.isHost && data.enemies) {
                    if (typeof window.updateEnemiesFromServer === 'function') {
                        window.updateEnemiesFromServer(data.enemies);
                    }
                }
            }
            else if (data.type === 'game_over') {
                this.showGameOver();
            }
            else if (data.type === 'return_lobby') {
                this.returnToLobby();
            }
            else if (data.type === 'player_revived') {
                if (data.target_id === this.myId && typeof window.reviveLocalPlayer === 'function') {
                    window.reviveLocalPlayer();
                }
            }
            else if (data.type === 'state') {
                this.otherPlayers = data.players;
                if (!this.isHost && data.enemies) {
                    if (typeof window.updateEnemiesFromServer === 'function') {
                        window.updateEnemiesFromServer(data.enemies, data.cr);
                    }
                }
            }
            else if (data.type === 'damage_enemy') {
                // Another client hit an enemy
                if (typeof window.applyEnemyDamageFromServer === 'function') {
                    window.applyEnemyDamageFromServer(data.id, data.damage);
                }
            }
        };
        
        this.socket.onclose = () => {
            console.log("Disconnected. Reconnecting in 2s...");
            this.connected = false;
            setTimeout(() => this.connect(), 2000);
        };
    }
    
    sendUpdate(playerData, enemiesData, crData) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            let msg = { type: 'update', player: playerData };
            if (enemiesData && this.isHost) msg.enemies = enemiesData;
            if (crData !== undefined && this.isHost) msg.cr = crData;
            this.socket.send(JSON.stringify(msg));
        }
    }
    
    setupQR() {
        const url = `http://${this.serverIp}:${this.serverPort}`;
        
        // Setup both QR modals (Lobby and In-game Share)
        document.getElementById('lobby-qr-url').textContent = url;
        document.getElementById('qr-url').textContent = url;
        
        const qrContainer1 = document.getElementById('lobby-qrcode');
        const qrContainer2 = document.getElementById('qrcode');
        qrContainer1.innerHTML = '';
        qrContainer2.innerHTML = '';
        
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer1, { text: url, width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff" });
            new QRCode(qrContainer2, { text: url, width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff" });
        }
        
        document.getElementById('share-btn').addEventListener('click', () => {
            document.getElementById('qr-modal').classList.remove('hidden');
        });
        document.getElementById('close-qr-btn').addEventListener('click', () => {
            document.getElementById('qr-modal').classList.add('hidden');
        });
        
        // Setup Host Start Button
        const startBtn = document.getElementById('start-game-btn');
        startBtn.addEventListener('click', () => {
            if (this.isHost && this.connected) {
                this.socket.send(JSON.stringify({ type: 'start_game' }));
            }
        });
        
        // Setup Return to Lobby Button
        const returnBtn = document.getElementById('return-lobby-btn');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                if (this.isHost && this.connected) {
                    this.socket.send(JSON.stringify({ type: 'return_lobby' }));
                }
            });
        }
        
        // Setup In-Game Quit Button
        const quitBtn = document.getElementById('quit-game-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (this.connected) {
                    this.socket.send(JSON.stringify({ type: 'return_lobby' }));
                }
            });
        }
    }

    updateLobbyUI(players) {
        const list = document.getElementById('player-list');
        list.innerHTML = '';
        
        let count = 0;
        for (let id in players) {
            count++;
            const p = players[id];
            const li = document.createElement('li');
            li.textContent = `Player ${id} ${p.is_host ? '(Host)' : ''} ${id == this.myId ? '(You)' : ''}`;
            list.appendChild(li);
            
            if (p.is_host && id == this.myId) {
                this.isHost = true;
            }
        }
        
        document.getElementById('player-count').textContent = count;
        
        const startBtn = document.getElementById('start-game-btn');
        const waitingMsg = document.getElementById('waiting-msg');
        
        if (this.isHost) {
            startBtn.classList.remove('hidden');
            waitingMsg.classList.add('hidden');
        } else {
            startBtn.classList.add('hidden');
            waitingMsg.classList.remove('hidden');
        }
    }

    startGameplay() {
        // UI Transition
        document.getElementById('lobby-layer').classList.add('hidden');
        document.getElementById('loading-layer').classList.remove('hidden');
        
        // Wait 2 seconds, then hide loader and start engine
        setTimeout(() => {
            document.getElementById('loading-layer').classList.add('hidden');
            document.getElementById('ui-layer').classList.remove('hidden');
            document.getElementById('game-canvas').classList.remove('hidden');
            
            // Trigger engine
            if (typeof window.startGameEngine === 'function') {
                window.startGameEngine();
            }
        }, 2000);
    }

    showGameOver() {
        if (typeof window.stopGameEngine === 'function') window.stopGameEngine();
        
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('game-canvas').classList.add('hidden');
        
        document.getElementById('game-over-layer').classList.remove('hidden');
        
        const returnBtn = document.getElementById('return-lobby-btn');
        const waitingMsg = document.getElementById('game-over-waiting');
        
        if (this.isHost) {
            returnBtn.classList.remove('hidden');
            waitingMsg.classList.add('hidden');
        } else {
            returnBtn.classList.add('hidden');
            waitingMsg.classList.remove('hidden');
        }
    }
    
    returnToLobby() {
        if (typeof window.resetGameState === 'function') window.resetGameState();
        
        document.getElementById('game-over-layer').classList.add('hidden');
        document.getElementById('lobby-layer').classList.remove('hidden');
    }
}

window.multiplayer = new MultiplayerClient();
