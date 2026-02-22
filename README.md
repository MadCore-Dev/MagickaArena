# 🪄 Magicka Arena

![Magicka Arena Header](https://raw.githubusercontent.com/manojsamal/MagickaArena/main/assets/readme_banner.png)

A fast-paced, local-network multiplayer arena game inspired by **Magicka**. Combine elements to cast powerful spells, outsmart your friends, and survive the monster swarm!

## 🚀 Features

- **Dynamic Spell Combining:** Combine 8 unique elements (Fire, Cold, Water, Lightning, Earth, Shield, Life, Arcane) into thousands of spell variations.
- **Local Network Multiplayer:** Host a game on your PC and have friends join instantly by scanning a QR code on their mobile devices.
- **Dynamic Enemy AI:** Monsters track the nearest player and use varied movement patterns (Charge, Orbit, Zigzag).
- **Combat Rating (CR) System:** Endless waves of enemies balanced by a global Combat Rating budget.
- **Host Migration:** Seamlessly transition to a new host if the original host disconnects, preservation game state.

## 🛠️ Technology Stack

- **Backend:** Python (WebSockets, HTTP)
- **Frontend:** Vanilla JS, HTML5 Canvas, CSS3
- **Tools:** NippleJS (Mobile Joystick), QRCode.js

## 📦 Installation & Setup

### Prerequisites
- Python 3.10+
- `pip`

### 1. Clone the repository
```bash
git clone https://github.com/manojsamal/MagickaArena.git
cd MagickaArena
```

### 2. Set up Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install websockets
```

### 3. Run the Server
```bash
python3 server.py
```

Open `http://localhost:8080` in your browser. Share the LAN IP or QR code with friends on the same WiFi to join!

## 🎮 Controls

### Desktop
- **WASD / Arrow Keys:** Move
- **Element Keys:** [F, C, W, L, E, S, H, A] to queue elements
- **Space:** Cast spell
- **Q:** Clear queue

### Mobile
- **Left Joystick:** Move
- **Right Circle Menu:** Tap elements to queue
- **CAST Button:** Tap to release the magic!

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
