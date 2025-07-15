from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID, uuid4
from .models import PlayerRating

AI_OPPONENT_ID = UUID("00000000-0000-0000-0000-000000000001")
AI_DEFAULT_ELO = 1200

async def get_or_create_player_rating(db: "AsyncSession", user_id: UUID, username: str) -> PlayerRating:
    """
    Retrieves or creates a player rating entry.
    Handles a special case for the AI opponent to avoid database writes.
    """
    if user_id == AI_OPPONENT_ID:
        # Return an in-memory PlayerRating object for the AI, no DB interaction
        return PlayerRating(
            user_id=AI_OPPONENT_ID,
            username="AI Opponent",
            elo_rating=AI_DEFAULT_ELO,
            wins=0,
            losses=0,
            draws=0,
            total_matches=0
        )

    result = await db.execute(select(PlayerRating).where(PlayerRating.user_id == user_id))
    player_rating = result.scalar_one_or_none()
    if not player_rating:
        player_rating = PlayerRating(user_id=user_id, username=username)
        db.add(player_rating)
        await db.flush()
    return player_rating

def update_elo_ratings(winner_rating: int, loser_rating: int, k_factor: int = 32) -> tuple[int, int]:
    """
    Updates the ELO ratings of two players after a match.
    """
    expected_winner = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    expected_loser = 1 / (1 + 10 ** ((winner_rating - loser_rating) / 400))

    new_winner_rating = round(winner_rating + k_factor * (1 - expected_winner))
    new_loser_rating = round(loser_rating + k_factor * (0 - expected_loser))

    return new_winner_rating, new_loser_rating 