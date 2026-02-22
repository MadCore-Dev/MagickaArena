import asyncio
import websockets
import json
import http.server
import socketserver
import threading
import socket

PORT = 8080
WS_PORT = 8081

# Get local IP
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(('10.255.255.255', 1))
    IP = s.getsockname()[0]
except Exception:
    IP = '127.0.0.1'
finally:
    s.close()

print(f"=================================================")
print(f"HTTP Server starting at: http://{IP}:{PORT}")
print(f"WebSocket Server starting at: ws://{IP}:{WS_PORT}")
print(f"=================================================")

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/ip':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ip': IP, 'port': PORT, 'ws_port': WS_PORT}).encode())
        else:
            super().do_GET()

def start_http_server():
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        httpd.serve_forever()

threading.Thread(target=start_http_server, daemon=True).start()

# WebSocket state
clients = set()
players = {} # id -> state
host_id = None
game_state = "WAITING"  # "WAITING" or "PLAYING"
server_enemies = []
server_cr = 0

async def broadcast(message):
    if not clients: return
    disconnected = set()
    for client in clients:
        try:
            await client.send(json.dumps(message))
        except:
            disconnected.add(client)
    for client in disconnected:
        clients.remove(client)

async def handler(websocket):
    global players, host_id, game_state, server_enemies, server_cr
    client_id = id(websocket)
    clients.add(websocket)
    
    # First client is the host
    if host_id is None:
        host_id = client_id
        
    players[client_id] = {"id": client_id, "is_host": (client_id == host_id), "status": "joined"}
    
    print(f"Client connected: {websocket.remote_address}. Total: {len(clients)}")
    
    # Send initial state to new client
    await websocket.send(json.dumps({
        'type': 'init',
        'client_id': client_id,
        'is_host': (client_id == host_id),
        'game_state': game_state
    }))
    
    # Broadcast updated player list
    await broadcast({'type': 'lobby_update', 'players': players})

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data['type'] == 'start_game' and client_id == host_id:
                    game_state = "PLAYING"
                    server_enemies = []
                    server_cr = 0
                    for p in players.values():
                        p['status'] = 'alive'
                    await broadcast({'type': 'transition_to_game'})
                    
                elif data['type'] == 'player_died' and game_state == "PLAYING":
                    if client_id in players:
                        players[client_id]['status'] = 'dead'
                    # Check if all players are dead
                    all_dead = len(players) > 0 and all(p.get('status') == 'dead' for p in players.values())
                    if all_dead:
                        game_state = "GAME_OVER"
                        await broadcast({'type': 'game_over'})
                        
                elif data['type'] == 'cast_revive' and game_state == "PLAYING":
                    for cid, p in players.items():
                        if p.get('status') == 'dead':
                            p['status'] = 'alive'
                            await broadcast({'type': 'player_revived', 'target_id': cid})
                            
                elif data['type'] == 'damage_enemy' and game_state == "PLAYING":
                    # Client claims they hit an enemy. Relay to Host to verify/apply.
                    await broadcast({
                        'type': 'damage_enemy',
                        'id': data['id'],
                        'damage': data['damage'],
                        'source_client_id': client_id
                    })
                        
                elif data['type'] == 'return_lobby':
                    game_state = "WAITING"
                    server_enemies = []
                    server_cr = 0
                    for p in players.values():
                        p['status'] = 'joined'
                    await broadcast({'type': 'return_lobby'})
                    await broadcast({'type': 'lobby_update', 'players': players})
                    
                elif data['type'] == 'update' and game_state == "PLAYING":
                    # Merge incoming positioning data
                    if client_id in players:
                        players[client_id].update(data['player'])
                        
                    if client_id == host_id:
                        if 'enemies' in data:
                            server_enemies = data['enemies']
                        if 'cr' in data:
                            server_cr = data['cr']
                    
                    # Broadcast other players to this client
                    # Optimization: In a real game, you'd broadcast state at a fixed tick rate. 
                    # For this prototype, we reflect immediately.
                    other_players = {str(cid): p for cid, p in players.items() if cid != client_id and "x" in p}
                    await websocket.send(json.dumps({'type': 'state', 'players': other_players, 'enemies': server_enemies, 'cr': server_cr}))
            except Exception as e:
                print("Error processing message:", e)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        print(f"Client disconnected: {websocket.remote_address}")
        clients.remove(websocket)
        if client_id in players:
            del players[client_id]
        if client_id == host_id:
            # Reassign host if there are remaining players
            if players:
                host_id = list(players.keys())[0]
                players[host_id]['is_host'] = True
                asyncio.create_task(broadcast({
                    'type': 'host_reassigned', 
                    'new_host_id': host_id,
                    'players': players,
                    'enemies': server_enemies,
                    'cr': server_cr
                }))
            else:
                host_id = None
                game_state = "WAITING" # Reset game if everyone leaves
                server_enemies = []
                server_cr = 0
                
        asyncio.create_task(broadcast({'type': 'lobby_update', 'players': players}))

async def main():
    async with websockets.serve(handler, "0.0.0.0", WS_PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
