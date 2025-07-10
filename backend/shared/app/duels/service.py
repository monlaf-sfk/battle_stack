from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc, update, or_
from uuid import UUID
from typing import Dict, Any, List
from . import models, schemas
from .models import Duel, DuelStatus, PlayerRating
from .elo import update_elo_ratings, get_or_create_player_rating
from datetime import datetime, timezone, timedelta

async def get_duel(db: AsyncSession, duel_id: UUID) -> models.Duel | None:
    result = await db.execute(select(models.Duel).where(models.Duel.id == duel_id))
    return result.scalar_one_or_none()

async def create_duel(db: AsyncSession, duel: schemas.DuelCreate) -> models.Duel:
    db_duel = models.Duel(
        problem_id=duel.problem_id,
        player_one_id=duel.player_one_id,
        player_two_id=duel.player_two_id,
        status=duel.status if duel.status else models.DuelStatus.PENDING,
        started_at=datetime.now(timezone.utc) if duel.status == models.DuelStatus.IN_PROGRESS else None
    )
    db.add(db_duel)
    await db.commit()
    await db.refresh(db_duel)
    return db_duel

async def get_duel_by_user_and_status(
    db: AsyncSession, user_id: UUID, statuses: List[DuelStatus]
) -> models.Duel | None:
    """
    Finds a duel for a user that matches one of the provided statuses.
    """
    result = await db.execute(
        select(models.Duel).filter(
            or_(models.Duel.player_one_id == user_id, models.Duel.player_two_id == user_id),
            models.Duel.status.in_(statuses)
        )
    )
    return result.scalars().first()

async def update_duel_results(db: AsyncSession, duel_id: UUID, results: Dict[str, Any]):
    await db.execute(update(Duel).where(Duel.id == duel_id).values(results=results))
    await db.commit()

async def end_duel(db: AsyncSession, duel_id: UUID, final_results: schemas.DuelResult, status: DuelStatus):
    await db.execute(update(Duel).where(Duel.id == duel_id).values(
        status=status,
        results=final_results.model_dump(mode='json'),
        finished_at=datetime.now(timezone.utc)
    ))
    await db.commit()

async def end_timed_out_duels(db: AsyncSession, time_limit_seconds: int):
    """Marks duels as timed out if they've been in progress for too long."""
    now = datetime.now(timezone.utc)
    timeout_threshold = now - timedelta(seconds=time_limit_seconds)
    
    stmt = select(models.Duel).where(
        models.Duel.status == models.DuelStatus.IN_PROGRESS,
        models.Duel.started_at < timeout_threshold
    )
    result = await db.execute(stmt)
    timed_out_duels = result.scalars().all()

    for duel in timed_out_duels:
        final_results = schemas.DuelResult(
            winner_id=None,
            player_one_result=schemas.PlayerResult(player_id=str(duel.player_one_id), score=0, time_taken_seconds=0, submission_count=0, is_winner=False),
            player_two_result=schemas.PlayerResult(player_id=str(duel.player_two_id or "ai"), score=0, time_taken_seconds=0, submission_count=0, is_winner=False),
            finished_at=now,
            is_ai_duel=duel.player_two_id is None,
            is_timeout=True
        )
        await end_duel(db, duel.id, final_results, status=models.DuelStatus.TIMED_OUT)

async def get_player_rating(db: AsyncSession, user_id: UUID) -> PlayerRating | None:
    result = await db.execute(select(PlayerRating).where(PlayerRating.user_id == user_id))
    return result.scalar_one_or_none()

async def update_user_stats_after_duel(db: AsyncSession, user_id: UUID, result: schemas.PlayerResult):
    player_rating = await get_or_create_player_rating(db, user_id, f"user_{user_id}")
    
    if result.is_winner:
        values_to_update = {
            "total_matches": player_rating.total_matches + 1,
            "wins": player_rating.wins + 1,
            "current_streak": player_rating.current_streak + 1
        }
    else:
        values_to_update = {
            "total_matches": player_rating.total_matches + 1,
            "losses": player_rating.losses + 1,
            "current_streak": 0
        }

    await db.execute(update(PlayerRating).where(PlayerRating.user_id == user_id).values(**values_to_update))
    await db.commit()

async def update_ratings_after_duel(db: AsyncSession, winner_id: UUID, loser_id: UUID):
    winner_rating_obj = await get_or_create_player_rating(db, winner_id, f"user_{winner_id}")
    loser_rating_obj = await get_or_create_player_rating(db, loser_id, f"user_{loser_id}")

    new_winner_elo, new_loser_elo = update_elo_ratings(
        winner_rating_obj.elo_rating, loser_rating_obj.elo_rating
    )
    
    await db.execute(update(PlayerRating).where(PlayerRating.user_id == winner_id).values(elo_rating=new_winner_elo))
    await db.execute(update(PlayerRating).where(PlayerRating.user_id == loser_id).values(elo_rating=new_loser_elo))
    await db.commit()

async def get_leaderboard(db: AsyncSession, limit: int = 100) -> List[PlayerRating]:
    result = await db.execute(
        select(PlayerRating)
        .order_by(desc(PlayerRating.elo_rating))
        .limit(limit)
    )
    return list(result.scalars().all())

async def get_active_or_waiting_duel(db: AsyncSession, user_id: UUID) -> models.Duel | None:
    """
    Finds a duel for the user that is either 'pending' or 'in_progress'.
    """
    result = await db.execute(
        select(models.Duel).filter(
            or_(models.Duel.player_one_id == user_id, models.Duel.player_two_id == user_id),
            models.Duel.status.in_([DuelStatus.PENDING, DuelStatus.IN_PROGRESS])
        )
    )
    return result.scalars().first()

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
        if duel.results is not None and duel.finished_at is not None:
            winner_id_raw = duel.results.get("winner_id")
            winner_id = str(winner_id_raw) if winner_id_raw else None
            problem_title = duel.results.get("ai_problem_data", {}).get("title", "A Great Problem")
            
            p1_id = str(duel.player_one_id)
            opponent_name = "AI"
            if duel.player_two_id is not None:
                opponent_name = f"User-{str(duel.player_two_id)[:4]}"

            matches.append(schemas.MatchHistoryItem(
                id=f"{duel.id}-{p1_id}",
                duel_id=str(duel.id),
                opponent_name=opponent_name,
                is_victory=winner_id == p1_id,
                played_at=duel.finished_at,
                problem_title=problem_title,
                rating_change=10 if winner_id == p1_id else -10
            ))

            if duel.player_two_id is not None and len(matches) < limit:
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

    return matches