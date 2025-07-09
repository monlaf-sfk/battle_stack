from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, desc
from uuid import UUID
from typing import Dict, Any
from . import models, schemas
from .models import Duel, DuelStatus, PlayerRating
from .elo import update_elo_ratings
from datetime import datetime, timezone, timedelta
import uuid
import logging
from shared.app.ai.generator import GeneratedProblem, generate_sql_problem, generate_algorithm_problem

logger = logging.getLogger(__name__)

async def get_duel(db: AsyncSession, duel_id: UUID) -> models.Duel | None:
    """
    Retrieves a specific duel by its ID.
    """
    result = await db.execute(select(models.Duel).where(models.Duel.id == duel_id))
    return result.scalar_one_or_none()

async def get_active_or_waiting_duel(db: AsyncSession, user_id: UUID):
    """
    Finds a duel for the user that is either 'pending' or 'in_progress'.
    """
    result = await db.execute(
        select(models.Duel).filter(
            or_(models.Duel.player_one_id == user_id, models.Duel.player_two_id == user_id),
            models.Duel.status.in_(['pending', 'in_progress'])
        )
    )
    return result.scalars().first()

async def create_duel(db: AsyncSession, duel: schemas.DuelCreate) -> models.Duel:
    db_duel = models.Duel(
        problem_id=duel.problem_id,
        player_one_id=duel.player_one_id,
        player_two_id=duel.player_two_id,
        status=duel.status if duel.status else models.DuelStatus.PENDING,
        started_at=datetime.now(timezone.utc) if duel.status == models.DuelStatus.IN_PROGRESS else None
    )
    db.add(db_duel)
    await db.flush()
    return db_duel

async def update_duel_results(db: AsyncSession, duel: models.Duel, results_data: Dict[str, Any]) -> models.Duel:
    """
    Updates the results field of a duel with the provided data.
    This is used to store AI-generated problem data or other metadata.
    """
    duel.results = results_data
    db.add(duel)
    await db.flush()
    return duel

async def find_or_create_duel(db: AsyncSession, player_id: UUID, problem_id: UUID) -> models.Duel:
    """
    Finds a pending duel for a specific problem that another player is waiting in.
    """
    # Look for a pending duel for the same problem with only one player
    result = await db.execute(
        select(models.Duel).where(
            and_(
                models.Duel.problem_id == problem_id,
                models.Duel.status == models.DuelStatus.PENDING,
                models.Duel.player_two_id == None,
                models.Duel.player_one_id != player_id # Can't duel yourself
            )
        ).limit(1)
    )
    
    existing_duel = result.scalars().first()
    
    if existing_duel:
        # Found a duel to join
        existing_duel.player_two_id = player_id
        existing_duel.status = models.DuelStatus.IN_PROGRESS
        existing_duel.started_at = datetime.now(timezone.utc)
        await db.flush()
        return existing_duel
    else:
        # No pending duel found, create a new one for this player
        new_duel_data = schemas.DuelCreate(
            problem_id=problem_id,
            player_one_id=player_id,
            status=DuelStatus.PENDING,
        )
        return await create_duel(db, new_duel_data)

async def end_duel(db: AsyncSession, duel_id: UUID, final_results: schemas.DuelResult, status: DuelStatus = DuelStatus.COMPLETED):
    """Ends the duel and records the final results."""
    duel = await get_duel(db, duel_id)
    if duel:
        duel.status = status
        duel.results = final_results.model_dump(mode='json')
        duel.finished_at = datetime.now(timezone.utc)
        db.add(duel)
        await db.commit()
        await db.refresh(duel) # Ensure the object is refreshed after commit
        logger.info(f"Duel {duel_id} marked as {status} in DB.")
        return duel
    return None

async def end_timed_out_duels(db: AsyncSession, time_limit_seconds: int):
    """Marks duels as timed out if they've been in progress for too long."""
    now = datetime.now(timezone.utc)
    timeout_threshold = now - timedelta(seconds=time_limit_seconds)
    
    # Logic to find and update timed-out duels
    # This is a simplified example
    stmt = select(models.Duel).where(
        models.Duel.status == models.DuelStatus.IN_PROGRESS,
        models.Duel.started_at < timeout_threshold
    )
    result = await db.execute(stmt)
    timed_out_duels = result.scalars().all()

    for duel in timed_out_duels:
        final_results = schemas.DuelResult(
            winner_id=None, # Or determine winner based on progress
            finished_at=now,
            is_timeout=True
        )
        await end_duel(db, duel.id, final_results, status=models.DuelStatus.TIMED_OUT)

async def get_or_create_player_rating(db: AsyncSession, user_id: UUID, username: str) -> PlayerRating:
    """
    Retrieves a player's rating from the database or creates a new one if it doesn't exist.
    """
    result = await db.execute(
        select(PlayerRating).where(PlayerRating.user_id == user_id)
    )
    player_rating = result.scalars().first()

    if not player_rating:
        player_rating = PlayerRating(user_id=user_id, username=username)
        db.add(player_rating)
        await db.flush()
        await db.refresh(player_rating)
        
    return player_rating

async def update_ratings_after_duel(db: AsyncSession, winner_id: UUID, loser_id: UUID):
    """
    Updates the ELO ratings and stats for both players after a duel.
    """
    # NOTE: In a real microservices architecture, you would fetch usernames via an API call
    # to the user service. For now, we'll just use a placeholder.
    winner_rating = await get_or_create_player_rating(db, winner_id, f"user_{str(winner_id)[:8]}")
    loser_rating = await get_or_create_player_rating(db, loser_id, f"user_{str(loser_id)[:8]}")

    new_winner_elo, new_loser_elo = update_elo_ratings(
        winner_rating.elo_rating, loser_rating.elo_rating
    )

    # Update winner's stats
    winner_rating.elo_rating = new_winner_elo
    winner_rating.wins += 1
    winner_rating.total_matches += 1
    winner_rating.current_streak = max(1, winner_rating.current_streak + 1)
    
    # Update loser's stats
    loser_rating.elo_rating = new_loser_elo
    loser_rating.losses += 1
    loser_rating.total_matches += 1
    loser_rating.current_streak = 0
    
    await db.flush()

async def get_leaderboard(db: AsyncSession, limit: int = 10) -> list[schemas.LeaderboardEntry]:
    """
    Retrieves the top players for the leaderboard from the player_ratings table.
    """
    stmt = (
        select(PlayerRating)
        .order_by(desc(PlayerRating.elo_rating))
        .limit(limit)
    )
    result = await db.execute(stmt)
    player_ratings = result.scalars().all()

    leaderboard_entries = []
    for i, rating in enumerate(player_ratings):
        leaderboard_entries.append(
            schemas.LeaderboardEntry(
                rank=i + 1,
                user_id=str(rating.user_id),
                username=rating.username,
                elo_rating=rating.elo_rating,
                total_matches=rating.total_matches,
                wins=rating.wins,
                win_rate=(rating.wins / rating.total_matches) if rating.total_matches > 0 else 0,
                current_streak=rating.current_streak,
            )
        )
    return leaderboard_entries

async def get_recent_matches(db: AsyncSession, limit: int = 10) -> list[schemas.MatchHistoryItem]:
    """
    Retrieves the most recent public matches.
    """
    stmt = (
        select(models.Duel)
        .where(models.Duel.status == models.DuelStatus.COMPLETED)
        .order_by(desc(models.Duel.finished_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    duels = result.scalars().all()

    matches = []
    for duel in duels:
        # This is a simplified transformation.
        # It needs to resolve user details from user_service.
        if duel.results and duel.finished_at:
            winner_id_raw = duel.results.get("winner_id")
            winner_id = str(winner_id_raw) if winner_id_raw else None

            problem_title = duel.results.get("ai_problem_data", {}).get("title", "A Great Problem")
            
            p1_id = str(duel.player_one_id)
            
            # Determine opponent details
            opponent_name = "AI"
            if duel.player_two_id:
                # Placeholder for username, would be a user service call in a real app
                opponent_name = f"User-{str(duel.player_two_id)[:4]}"

            # Create entry for Player 1
            matches.append(schemas.MatchHistoryItem(
                id=f"{duel.id}-{p1_id}", # A unique ID for the history item
                duel_id=str(duel.id),
                opponent_name=opponent_name,
                is_victory=winner_id == p1_id,
                played_at=duel.finished_at,
                problem_title=problem_title,
                # Placeholder for rating change, this would be more complex in a real system
                rating_change=10 if winner_id == p1_id else -10
            ))

            # Create entry for Player 2 if it's a human player
            if duel.player_two_id and len(matches) < limit:
                p2_id = str(duel.player_two_id)
                p1_username = f"User-{p1_id[:4]}"
                matches.append(schemas.MatchHistoryItem(
                    id=f"{duel.id}-{p2_id}",
                    duel_id=str(duel.id),
                    opponent_name=p1_username,
                    is_victory=winner_id == p2_id,
                    played_at=duel.finished_at,
                    problem_title=problem_title,
                    rating_change=10 if winner_id == p2_id else -10
                ))

    return matches[:limit]

async def create_ai_duel(db: AsyncSession, user_id: UUID, theme: str, difficulty: str, language: str, category: str) -> schemas.Duel:
    """
    Creates a new duel against an AI opponent.
    """
    
    async with db.begin():
        # 1. Generate a new problem by AI
        if category == "sql":
            generated_problem: GeneratedProblem = await generate_sql_problem(theme, difficulty)
        else: # Default to algorithms
            generated_problem: GeneratedProblem = await generate_algorithm_problem(theme, difficulty, language)

        # 2. Get or create the problem in the database
        problem_id = generated_problem.id

        # 3. Find or create a duel for the user against the AI
        duel = await find_or_create_duel(db, user_id, problem_id)

        # 4. Update the duel status and results
        duel.status = models.DuelStatus.IN_PROGRESS
        duel.started_at = datetime.now(timezone.utc)
        duel.results = None
        db.add(duel)
        await db.flush()

        return duel

# We will add more functions here later:
# - update_duel_status
# - record_code_update
# - finalize_duel (calculate results and save) 