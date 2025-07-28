from fastapi import WebSocket
from typing import Dict, List, Tuple
import json
import logging
import asyncio
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from shared.app.duels import service, schemas
from shared.app.duels.models import DuelStatus
from shared.app.ai import generator as problem_generator

logger = logging.getLogger(__name__)

class DuelConnectionManager:
    def __init__(self):
        # Store as {duel_id: [(user_id, websocket)]}
        self.active_connections: Dict[str, List[Tuple[str, WebSocket]]] = {}

    async def handle_message(self, duel_id: str, user_id: str, data: str, db: AsyncSession):
        """Handles incoming websocket messages."""
        try:
            message = json.loads(data)
            message_type = message.get("type")

            if message_type == "set_ready":
                await self.handle_set_ready(duel_id, user_id, message.get("is_ready", False), db)
            elif message_type == "start_duel":
                await self.handle_start_duel(duel_id, user_id, db)

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received in duel {duel_id}")

    async def handle_set_ready(self, duel_id: str, user_id: str, is_ready: bool, db: AsyncSession):
        """Handles a player setting their ready status."""
        duel = await service.get_duel(db, UUID(duel_id))
        if not duel:
            return

        if str(duel.player_one_id) == user_id:
            duel.player_one_ready = is_ready
        elif str(duel.player_two_id) == user_id:
            duel.player_two_ready = is_ready
        
        await db.commit()
        await db.refresh(duel)

        await self.broadcast_duel_state(duel_id, duel)

    async def handle_start_duel(self, duel_id: str, user_id: str, db: AsyncSession):
        """Handles the host starting the duel."""
        duel = await service.get_duel(db, UUID(duel_id))
        if not duel or str(duel.player_one_id) != user_id:
            return # Only the host can start the duel

        if duel.player_one_ready and duel.player_two_ready:
            duel.status = DuelStatus.GENERATING_PROBLEM
            await db.commit()
            
            # This is where you would trigger the background task for problem generation
            # For simplicity, we'll just broadcast the state change for now.
            # In a real application, you would call a function similar to 
            # `generate_problem_for_pvp` from router.py
            
            await db.refresh(duel)
            await self.broadcast_duel_state(duel_id, duel)


    async def broadcast_duel_state(self, duel_id: str, duel: schemas.Duel):
        """Broadcasts the full duel state to all players in the duel."""
        message = {
            "type": "duel_state",
            "data": schemas.Duel.from_orm(duel).model_dump()
        }
        await self.broadcast_to_all(duel_id, json.dumps(message, default=str))

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

    async def send_keepalive(self, duel_id: str):
        """Send keepalive ping to all connections in a duel"""
        if duel_id in self.active_connections:
            keepalive_message = json.dumps({"type": "ping", "data": {"timestamp": asyncio.get_event_loop().time()}})
            for _, connection in self.active_connections[duel_id]:
                try:
                    await connection.send_text(keepalive_message)
                except Exception as e:
                    logger.warning(f"Failed to send keepalive to connection: {e}")

manager = DuelConnectionManager() 