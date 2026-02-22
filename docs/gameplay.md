# Gameplay Guide

## How to Play

### 1. Setup (Host)
- Run the Python server: `python server.py`.
- Open the provided URL (e.g., `http://192.168.1.5:8080`) on your mobile device or browser.

### 2. Join (Players)
- Ensure you are on the same WiFi network.
- Scan the QR code displayed on the Host's screen or navigate to the shared URL.
- Once everyone has joined the lobby, the **Host** can press **START GAME**.

### 3. Controls
- **Movement**: Drag the left side of the screen to move your Mage.
- **Select Elements**: Tap the elemental icons in the circular menu on the right.
- **Cast**: Tap the center **CAST** button to release your spell in the direction you are facing.

## Tips for Success
- **Stay Together**: Your party shares the screen space. If one falls, use the **Life + Lightning** combo to revive them.
- **Manage the Queue**: Watch for element cancellations! If you accidentally tap Fire and meant Cold, you'll need to re-queue.
- **Watch the CR**: The enemy counter at the top shows the current pressure. Clear small enemies to prevent larger ones from spawning.

## Multiplayer Troubleshooting
- **Cannot Connect**: Ensure all devices are on the same WiFi. Check that the computer's firewall is not blocking port `8080` and `8081`.
- **Latency**: The game is optimized for local networks. Public WiFi or high-traffic networks may cause jitter.
