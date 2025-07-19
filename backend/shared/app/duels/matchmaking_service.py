import asyncio
import json
from uuid import UUID
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import logging
from datetime import datetime, timezone

from shared.app.config import settings
from shared.app.duels import service as duel_service, schemas as duel_schemas, models as duel_models
from shared.app.duels.websocket_manager import manager
from shared.app.database import SessionLocal
from shared.app.ai import generator as problem_generator

logger = logging.getLogger(__name__)

class MatchmakingService:
    def __init__(self, redis_url: str):
        self.redis = Redis.from_url(redis_url, decode_responses=True)
        self.match_check_task = None

    def get_queue_key(self, difficulty: str, category: str) -> str:
        """Generates the Redis key for a specific queue."""
        return f"matchmaking_queue:{difficulty}:{category}"

    async def enqueue_player(self, user_id: UUID, difficulty: str, category: str):
        """Adds a player to the matchmaking queue."""
        queue_key = self.get_queue_key(difficulty, category)
        player_data = json.dumps({"user_id": str(user_id)})
        
        # Use current timestamp as score for FIFO-like behavior
        timestamp = await self.redis.time()
        await self.redis.zadd(queue_key, {player_data: float(timestamp[0])})
        
        # Start checking for matches if not already running
        if not self.match_check_task or self.match_check_task.done():
            self.match_check_task = asyncio.create_task(self.continuously_check_for_matches())

    async def dequeue_player(self, user_id: UUID, difficulty: str, category: str):
        """Removes a player from a specific matchmaking queue."""
        queue_key = self.get_queue_key(difficulty, category)
        
        # Find and remove the player by user_id
        members = await self.redis.zrange(queue_key, 0, -1)
        for member in members:
            player_data = json.loads(member)
            if player_data.get("user_id") == str(user_id):
                await self.redis.zrem(queue_key, member)
                break

    async def generate_problem_for_match(self, duel_id: UUID, player1_id: UUID, player2_id: UUID, difficulty: str, category: str):
        """Generates problem, updates duel, and notifies players."""
        from shared.app.database import SessionLocal # Local import to avoid circular dependency issues at startup
        
        async with SessionLocal() as db:
            try:
                language = "python"
                theme_map = {"algorithms": "common data structures", "sql": "joins and aggregation"}
                theme = theme_map.get(category, "general")

                logger.info(f"🚀 Generating problem for PvP duel {duel_id}...")
                problem = await problem_generator.generate_problem(
                    category=category,
                    difficulty=difficulty,
                    topic=theme,
                    language=language,
                )
                
                if not problem:
                    raise Exception("Problem generation failed.")

                duel_results = {"ai_problem_data": problem.model_dump()}
                await duel_service.update_duel_results(db, duel_id, duel_results)

                await db.execute(
                    duel_models.Duel.__table__.update()
                    .where(duel_models.Duel.id == duel_id)
                    .values(status=duel_models.DuelStatus.IN_PROGRESS, started_at=datetime.now(timezone.utc))
                )
                await db.commit()

                updated_duel = await duel_service.get_duel(db, duel_id)
                if not updated_duel:
                    raise Exception("Failed to fetch updated duel.")

                logger.info(f"✅ Problem generated for duel {duel_id}. Broadcasting duel_start.")
                duel_for_broadcast = duel_schemas.Duel.model_validate(updated_duel)
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "duel_start", "data": duel_for_broadcast.model_dump(mode='json')}, default=str)
                )

            except Exception as e:
                logger.error(f"Failed to generate problem for duel {duel_id}: {e}", exc_info=True)
                await db.execute(
                    duel_models.Duel.__table__.update()
                    .where(duel_models.Duel.id == duel_id)
                    .values(status=duel_models.DuelStatus.FAILED_GENERATION)
                )
                await db.commit()
                
                error_message = json.dumps({
                    "type": "duel_creation_failed",
                    "data": {"error": "Could not generate a problem for the duel. Please try again."}
                })
                await manager.send_to_user_in_duel(str(duel_id), str(player1_id), error_message)
                await manager.send_to_user_in_duel(str(duel_id), str(player2_id), error_message)

    async def find_and_create_match(self, db: AsyncSession, difficulty: str, category: str):
        """Finds a pair of players in the queue and creates a duel for them."""
        queue_key = self.get_queue_key(difficulty, category)
        
        # Get two players from the queue
        players = await self.redis.zpopmin(queue_key, 2)
        
        if len(players) < 2:
            # Not enough players, put them back in the queue if any were popped
            if players:
                await self.redis.zadd(queue_key, {players[0][0]: players[0][1]})
            return

        player1_data = json.loads(players[0][0])
        player2_data = json.loads(players[1][0])
        player1_id = UUID(player1_data["user_id"])
        player2_id = UUID(player2_data["user_id"])

        try:
            # Create a placeholder duel that will be updated by the problem generator
            duel = await duel_service.create_duel(db, duel_schemas.DuelCreate(
                player_one_id=player1_id,
                player_two_id=player2_id,
                status=duel_models.DuelStatus.GENERATING_PROBLEM,
                problem_id=UUID(int=0) # Placeholder
            ))
            logger.info(f"Match found between {player1_id} and {player2_id}. Duel ID: {duel.id}")
            
            asyncio.create_task(self.generate_problem_for_match(duel.id, player1_id, player2_id, difficulty, category))
            
        except Exception as e:
            logger.error(f"Failed to create duel for players {player1_id} and {player2_id}: {e}", exc_info=True)
            # If duel creation fails, put players back in the queue
            await self.redis.zadd(queue_key, {players[0][0]: players[0][1], players[1][0]: players[1][1]})

    async def continuously_check_for_matches(self):
        """Periodically checks all queues for potential matches."""
        from shared.app.database import SessionLocal # Import here to get initialized session
        
        if not SessionLocal:
            logger.error("Database session not initialized. Cannot check for matches.")
            self.match_check_task = None
            return

        while True:
            try:
                async with SessionLocal() as db:
                    keys = await self.redis.keys("matchmaking_queue:*")
                    for key in keys:
                        parts = key.split(":")
                        if len(parts) == 3:
                            difficulty = parts[1]
                            category = parts[2]
                            await self.find_and_create_match(db, difficulty, category)
            except Exception as e:
                logger.error(f"Error in matchmaking loop: {e}", exc_info=True)
            
            # Check every 5 seconds
            await asyncio.sleep(5)


matchmaking_service = MatchmakingService(redis_url=settings.REDIS_URL) 