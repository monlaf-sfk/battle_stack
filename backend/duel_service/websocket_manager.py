import json
import asyncio
from typing import Dict, List, Optional, Set
from uuid import UUID
from collections import defaultdict

from fastapi import WebSocket
from starlette.websockets import WebSocketState


class WebSocketManager:
    """Enhanced manager for WebSocket connections in duels"""
    
    def __init__(self):
        # Dictionary to store active connections by duel_id
        self.active_connections: Dict[UUID, List[WebSocket]] = {}
        # Track user connections for specific duels
        self.user_connections: Dict[UUID, Dict[UUID, WebSocket]] = {}
        # Track typing status with timestamps
        self.typing_status: Dict[UUID, Dict[UUID, float]] = {}
        # Track code update timestamps to prevent spam
        self.last_code_update: Dict[UUID, Dict[UUID, float]] = {}
        # Connection health tracking
        self.connection_health: Dict[UUID, Dict[UUID, float]] = {}
        # Track connection state to prevent race conditions
        self.connection_state: Dict[str, bool] = {}
    
    async def connect(self, websocket: WebSocket, duel_id: UUID, user_id: UUID):
        """Register WebSocket connection with enhanced tracking"""
        # Create a unique connection key
        conn_key = f"{duel_id}:{user_id}"
        
        # Prevent race conditions by checking if already connecting
        if conn_key in self.connection_state and self.connection_state[conn_key]:
            print(f"⚠️ Connection already in progress for {conn_key}")
            return
        
        self.connection_state[conn_key] = True
        
        try:
            if duel_id not in self.active_connections:
                self.active_connections[duel_id] = []
                self.user_connections[duel_id] = {}
                self.typing_status[duel_id] = {}
                self.last_code_update[duel_id] = {}
                self.connection_health[duel_id] = {}
            
            # Check if user is already connected (prevent duplicate connections)
            if user_id in self.user_connections[duel_id]:
                print(f"⚠️ User {user_id} already connected to duel {duel_id}")
                # Disconnect the old connection first
                old_ws = self.user_connections[duel_id][user_id]
                try:
                    # Clean up first
                    if old_ws in self.active_connections[duel_id]:
                        self.active_connections[duel_id].remove(old_ws)
                        del self.user_connections[duel_id][user_id]
                        
                        # Then close WebSocket safely
                        if hasattr(old_ws, 'client_state') and old_ws.client_state != WebSocketState.DISCONNECTED:
                            await old_ws.close(code=4000, reason="Replaced by new connection")
                except Exception as e:
                    print(f"⚠️ Error cleaning up old connection for {conn_key}: {e}")
            
            # Add new connection
            self.active_connections[duel_id].append(websocket)
            self.user_connections[duel_id][user_id] = websocket
            self.typing_status[duel_id][user_id] = 0.0
            self.last_code_update[duel_id][user_id] = 0.0
            self.connection_health[duel_id][user_id] = asyncio.get_event_loop().time()
            
            print(f"✅ WebSocket connected: Duel {duel_id}, User {user_id} (total: {len(self.active_connections[duel_id])})")
            
            # Note: Don't send user status immediately - let the caller handle timing
            
        except Exception as e:
            print(f"❌ Error in WebSocket connect for {conn_key}: {e}")
            raise
        finally:
            # Always clear the connection state flag
            self.connection_state[conn_key] = False
    
    def disconnect(self, websocket: WebSocket, duel_id: UUID, user_id: UUID):
        """Remove WebSocket connection with cleanup"""
        conn_key = f"{duel_id}:{user_id}"
        
        if duel_id in self.active_connections:
            if websocket in self.active_connections[duel_id]:
                self.active_connections[duel_id].remove(websocket)
            
            # Clean up user-specific data
            if user_id in self.user_connections.get(duel_id, {}):
                del self.user_connections[duel_id][user_id]
                
            if user_id in self.typing_status.get(duel_id, {}):
                del self.typing_status[duel_id][user_id]
                
            if user_id in self.last_code_update.get(duel_id, {}):
                del self.last_code_update[duel_id][user_id]
                
            if user_id in self.connection_health.get(duel_id, {}):
                del self.connection_health[duel_id][user_id]
            
            # Clean up empty rooms
            if not self.active_connections[duel_id]:
                del self.active_connections[duel_id]
                if duel_id in self.user_connections:
                    del self.user_connections[duel_id]
                if duel_id in self.typing_status:
                    del self.typing_status[duel_id]
                if duel_id in self.last_code_update:
                    del self.last_code_update[duel_id]
                if duel_id in self.connection_health:
                    del self.connection_health[duel_id]
        
        # Clean up connection state
        if conn_key in self.connection_state:
            del self.connection_state[conn_key]
        
        # Notify opponent about disconnection safely
        asyncio.create_task(self._safe_broadcast_user_status(duel_id, user_id, "disconnected"))
        
        print(f"❌ WebSocket disconnected: Duel {duel_id}, User {user_id}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    async def broadcast_to_duel(self, duel_id: UUID, message: Dict, exclude_user: Optional[UUID] = None):
        """Broadcast message to all connections in a duel with enhanced safety"""
        if duel_id not in self.user_connections:
            print(f"⚠️ No connections found for duel {duel_id}")
            return
            
        message_text = json.dumps(message)
        broken_connections = []
        successful_sends = 0
        
        # Send to all connections, optionally excluding a user
        for user_id, connection in list(self.user_connections[duel_id].items()):
            if exclude_user and user_id == exclude_user:
                continue
                
            # Try to send message and track result
            send_result = await self._safe_send_text(connection, message_text)
            
            if send_result:
                successful_sends += 1
            else:
                print(f"❌ Failed to send to user {user_id}, marking for cleanup")
                broken_connections.append((user_id, connection))
        
        # Clean up broken connections immediately
        for user_id, connection in broken_connections:
            try:
                print(f"🧹 Cleaning up broken connection for user {user_id}")
                self.disconnect(connection, duel_id, user_id)
            except Exception as cleanup_error:
                print(f"Error cleaning up broken connection for {user_id}: {cleanup_error}")
        
        if broken_connections:
            print(f"📊 Broadcast stats for duel {duel_id}: {successful_sends} successful, {len(broken_connections)} failed")
    
    async def _safe_send_text(self, websocket: WebSocket, message: str):
        """Safely send text to WebSocket with comprehensive error handling"""
        try:
            # Simple try-catch approach instead of complex state checking
            # Just try to send and handle any errors gracefully
            await websocket.send_text(message)
            return True
            
        except Exception as e:
            error_msg = str(e)
            print(f"⚠️ WebSocket send failed: {error_msg}")
            
            # All WebSocket errors indicate a broken connection
            return False
    
    async def send_to_user(self, duel_id: UUID, user_id: UUID, message: Dict):
        """Send message to specific user in duel with enhanced error handling"""
        if duel_id not in self.user_connections or user_id not in self.user_connections[duel_id]:
            print(f"⚠️ User {user_id} not found in duel {duel_id} connections")
            return
            
        websocket = self.user_connections[duel_id][user_id]
        message_text = json.dumps(message)
        
        # Try to send message
        send_result = await self._safe_send_text(websocket, message_text)
        
        if not send_result:
            print(f"❌ Failed to send message to user {user_id}, cleaning up connection")
            # Remove broken connection
            try:
                self.disconnect(websocket, duel_id, user_id)
            except Exception as cleanup_error:
                print(f"Error cleaning up broken connection for user {user_id}: {cleanup_error}")
    
    async def broadcast_code_update(
        self,
        duel_id: UUID,
        user_id: UUID,
        code: str,
        language: str,
        cursor_position: Optional[Dict] = None
    ):
        """Broadcast real-time code update with debouncing"""
        current_time = asyncio.get_event_loop().time()
        
        # Check if enough time has passed since last update (debouncing)
        if duel_id in self.last_code_update and user_id in self.last_code_update[duel_id]:
            time_diff = current_time - self.last_code_update[duel_id][user_id]
            if time_diff < 0.3:  # 300ms debounce
                return
        
        # Update timestamp
        if duel_id not in self.last_code_update:
            self.last_code_update[duel_id] = {}
        self.last_code_update[duel_id][user_id] = current_time
        
        message = {
            "type": "code_update",
            "user_id": str(user_id),
            "code": code,
            "language": language,
            "cursor_position": cursor_position,
            "timestamp": current_time
        }
        await self.broadcast_to_duel(duel_id, message, exclude_user=user_id)
    
    async def broadcast_typing_status(
        self,
        duel_id: UUID,
        user_id: UUID,
        is_typing: bool
    ):
        """Broadcast typing indicator with intelligent management"""
        current_time = asyncio.get_event_loop().time()
        
        if duel_id in self.typing_status:
            # Update typing status with timestamp
            self.typing_status[duel_id][user_id] = current_time if is_typing else 0.0
        
        message = {
            "type": "typing_status",
            "user_id": str(user_id),
            "is_typing": is_typing,
            "timestamp": current_time
        }
        await self.broadcast_to_duel(duel_id, message, exclude_user=user_id)
    
    async def send_test_result(
        self,
        duel_id: UUID,
        user_id: UUID,
        results: Dict
    ):
        """Send test results to all participants with enhanced data"""
        message = {
            "type": "test_result",
            "user_id": str(user_id),
            "passed": results.get("passed", 0),
            "failed": results.get("failed", 0),
            "total_tests": results.get("total_tests", 0),
            "execution_time_ms": results.get("execution_time_ms"),
            "error": results.get("error"),
            "is_solution_correct": results.get("is_solution_correct", False),
            "progress_percentage": results.get("progress_percentage", 0),
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_duel(duel_id, message)
    
    async def send_duel_start(
        self,
        duel_id: UUID,
        problem: Dict,
        participants: List[Dict]
    ):
        """Send duel start notification"""
        message = {
            "type": "duel_start",
            "problem": problem,
            "participants": participants,
            "start_time": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_duel(duel_id, message)
    
    async def send_duel_started(
        self,
        duel_id: UUID
    ):
        """Send duel started notification to participants"""
        message = {
            "type": "duel_started",
            "duel_id": str(duel_id),
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_duel(duel_id, message)
    
    async def send_duel_complete(
        self,
        duel_id: UUID,
        result: Dict
    ):
        """Send duel completion notification"""
        print(f"🏁 Sending duel completion notification for duel {duel_id}")
        
        message = {
            "type": "duel_complete",
            "result": result,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_duel(duel_id, message)
        
        print(f"📤 Duel completion message sent, waiting 3 seconds before cleanup...")
        
        # Clean up connections after a delay to allow messages to be received
        await asyncio.sleep(3)
        
        print(f"🧹 Starting cleanup for completed duel {duel_id}")
        
        # Close all WebSocket connections for this duel
        if duel_id in self.user_connections:
            for user_id, ws in self.user_connections[duel_id].items():
                try:
                    if hasattr(ws, 'client_state') and ws.client_state != WebSocketState.DISCONNECTED:
                        await ws.close(code=4000, reason="Duel completed")
                        print(f"🔌 Closed WebSocket for user {user_id} in duel {duel_id}")
                except Exception as e:
                    print(f"⚠️ Error closing WebSocket for user {user_id}: {e}")
        
        # Clean up all data structures
        if duel_id in self.active_connections:
            del self.active_connections[duel_id]
        if duel_id in self.user_connections:
            del self.user_connections[duel_id]
        if duel_id in self.typing_status:
            del self.typing_status[duel_id]
        if duel_id in self.last_code_update:
            del self.last_code_update[duel_id]
        if duel_id in self.connection_health:
            del self.connection_health[duel_id]
            
        print(f"✅ Cleanup completed for duel {duel_id}")

    async def _safe_broadcast_user_status(
        self,
        duel_id: UUID,
        user_id: UUID,
        status: str
    ):
        """Safely broadcast user connection status with error handling"""
        try:
            message = {
                "type": "user_status",
                "user_id": str(user_id),
                "status": status,
                "timestamp": asyncio.get_event_loop().time()
            }
            await self.broadcast_to_duel(duel_id, message, exclude_user=user_id)
        except Exception as e:
            print(f"Error broadcasting user status: {e}")
    
    async def send_countdown(
        self,
        duel_id: UUID,
        seconds_remaining: int
    ):
        """Send countdown timer update"""
        message = {
            "type": "countdown",
            "seconds_remaining": seconds_remaining,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_duel(duel_id, message)
    
    async def update_connection_health(self, duel_id: UUID, user_id: UUID):
        """Update connection health timestamp"""
        if duel_id in self.connection_health and user_id in self.connection_health[duel_id]:
            self.connection_health[duel_id][user_id] = asyncio.get_event_loop().time()
    
    def get_connected_users(self, duel_id: UUID) -> List[UUID]:
        """Get list of connected user IDs for a duel"""
        if duel_id in self.user_connections:
            return list(self.user_connections[duel_id].keys())
        return []
    
    def is_user_connected(self, duel_id: UUID, user_id: UUID) -> bool:
        """Check if user is connected to duel"""
        return (duel_id in self.user_connections and 
                user_id in self.user_connections[duel_id])
    
    async def cleanup_stale_typing_indicators(self):
        """Clean up typing indicators that are older than 5 seconds"""
        current_time = asyncio.get_event_loop().time()
        
        for duel_id, user_statuses in self.typing_status.items():
            for user_id, last_typing_time in list(user_statuses.items()):
                if last_typing_time > 0 and current_time - last_typing_time > 5.0:
                    # Auto-stop typing indicator
                    user_statuses[user_id] = 0.0
                    await self.broadcast_typing_status(duel_id, user_id, False)
    
    async def cleanup_broken_connections(self):
        """Periodically clean up broken WebSocket connections"""
        print("🧹 Starting periodic WebSocket cleanup...")
        
        total_cleaned = 0
        
        for duel_id in list(self.user_connections.keys()):
            broken_connections = []
            
            for user_id, websocket in list(self.user_connections[duel_id].items()):
                try:
                    # Test connection with a simple ping message
                    ping_message = json.dumps({"type": "ping", "timestamp": asyncio.get_event_loop().time()})
                    send_result = await self._safe_send_text(websocket, ping_message)
                    
                    if not send_result:
                        print(f"🔍 Found broken connection for user {user_id} in duel {duel_id}")
                        broken_connections.append((user_id, websocket))
                        
                except Exception as e:
                    print(f"⚠️ Error checking connection for user {user_id}: {e}")
                    broken_connections.append((user_id, websocket))
            
            # Clean up broken connections
            for user_id, websocket in broken_connections:
                try:
                    print(f"🧹 Cleaning up broken connection: duel {duel_id}, user {user_id}")
                    self.disconnect(websocket, duel_id, user_id)
                    total_cleaned += 1
                except Exception as cleanup_error:
                    print(f"❌ Error cleaning up connection for {user_id}: {cleanup_error}")
        
        if total_cleaned > 0:
            print(f"✅ Cleanup completed: removed {total_cleaned} broken connections")
        else:
            print("✅ Cleanup completed: no broken connections found")
    
    def get_connection_stats(self):
        """Get statistics about current connections"""
        stats = {
            "total_duels": len(self.user_connections),
            "total_connections": sum(len(users) for users in self.user_connections.values()),
            "duels": {}
        }
        
        for duel_id, users in self.user_connections.items():
            stats["duels"][str(duel_id)] = {
                "user_count": len(users),
                "users": [str(user_id) for user_id in users.keys()]
            }
        
        return stats
    
    async def start_cleanup_task(self):
        """Start periodic cleanup of broken connections"""
        while True:
            try:
                # Run cleanup every 30 seconds
                await asyncio.sleep(30)
                await self.cleanup_broken_connections()
            except asyncio.CancelledError:
                print("🛑 WebSocket cleanup task cancelled")
                break
            except Exception as e:
                print(f"❌ Error in WebSocket cleanup task: {e}")


# Singleton instance
ws_manager = WebSocketManager()