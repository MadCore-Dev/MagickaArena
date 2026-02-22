# System Architecture

Magicka Arena follows a **Hybrid P2P Client-Server model** optimized for local area network (LAN) play.

## Core Components

### 1. Python Server (`server.py`)
- **HTTP Server**: Serves static files (`index.html`, `js`, `assets`) and provides an `/api/ip` endpoint for discovery.
- **WebSocket Gateway**: Manages state, handles lobby logic, and relays player data.
- **State Management**:
    - **Lobby**: Tracks connected clients and manages game start/stop.
    - **In-Game**: Relays position updates and damage events between clients.

### 2. Multi-Tier Client (`engine.js` & `multiplayer.js`)
- **Game Engine**: Handles rendering (Canvas API Interface), collision detection, and projectile physics.
- **Multiplayer Logic**: Manages WebSocket communication and entity synchronization.

## Networking Model

The game uses a **Host-Driven Authority** system:
- **First Client as Host**: The first player to connect is designated as the Host.
- **Authority**:
    - The Host runs the AI movement logic and enemy spawning.
    - The Host synchronizes the `enemies` array and the `CR` (Combat Rating) pool to all other clients.
    - Non-host clients send `damage_enemy` events to the server, which are relayed to the Host for verification and application.
- **Host Migration**: If the Host disconnects, the server reassigns the role to the next available client, who inherits the current game state from the server's last known checkpoint.

## Tech Stack
- **Backend**: Python 3.14+, `websockets` library.
- **Frontend**: Vanilla JavaScript (ES6), HTML5 Canvas, NippleJS (Joysticks), QRCodeJS.
