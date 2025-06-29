from fastapi import WebSocket
from typing import Dict, List, Tuple

class DuelConnectionManager:
    def __init__(self):
        # Store as {duel_id: [(user_id, websocket)]}
        self.active_connections: Dict[str, List[Tuple[str, WebSocket]]] = {}

    async def connect(self, duel_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if duel_id not in self.active_connections:
            self.active_connections[duel_id] = []
        self.active_connections[duel_id].append((user_id, websocket))

    def disconnect(self, duel_id: str, user_id: str, websocket: WebSocket):
        if duel_id in self.active_connections:
            # Find the specific user's websocket to remove
            connection_to_remove = next(
                (conn for conn in self.active_connections[duel_id] if conn[0] == user_id),
                None
            )
            if connection_to_remove:
                self.active_connections[duel_id].remove(connection_to_remove)
                if not self.active_connections[duel_id]:
                    del self.active_connections[duel_id]

    async def broadcast(self, duel_id: str, message: str, sender_id: str):
        if duel_id in self.active_connections:
            for user_id, connection in self.active_connections[duel_id]:
                if user_id != sender_id:
                    await connection.send_text(message)

    async def broadcast_to_all(self, duel_id: str, message: str):
        if duel_id in self.active_connections:
            for _, connection in self.active_connections[duel_id]:
                await connection.send_text(message)

    async def send_personal_message(self, websocket: WebSocket, message: str):
        await websocket.send_text(message)

    async def send_to_user_in_duel(self, duel_id: str, user_id: str, message: str):
        if duel_id in self.active_connections:
            for conn_user_id, connection in self.active_connections[duel_id]:
                if conn_user_id == user_id:
                    await connection.send_text(message)
                    return # Assume one connection per user per duel

manager = DuelConnectionManager() 