from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import UUID4
from typing import List, Optional
import uuid
from datetime import datetime

from shared.app.auth.service import get_user
from shared.app.auth.security import get_current_user_id
from shared.app.database import get_db
from shared.app.schemas import User
from shared.app.user.schemas import (
    UserProfile, DashboardStats, Achievement, AIRecommendation, NewsItem, RoadmapEvent, Duel, DailyActivity,
    DuelResultData
)
from . import service

router = APIRouter()


@router.get("/profile/{username}", response_model=User, summary="Get public user profile")
async def read_profile(username: str, db: AsyncSession = Depends(get_db)) -> User:
    """Return public profile for given *username*."""
    db_user = await get_user(db, username)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return db_user


@router.get(
    "/profile/me",
    response_model=UserProfile,
    summary="Get current user's profile",
)
async def read_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """
    Get current user's profile from the database.
    If a profile doesn't exist for the user, one will be created with default values.
    """
    profile = await service.get_or_create_user_profile(db, user_id=current_user_id)
    return profile


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    summary="Get dashboard statistics"
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Get dashboard statistics for the current user."""
    return await service.get_dashboard_stats(db, user_id=current_user_id)


@router.get(
    "/achievements",
    response_model=List[Achievement],
    summary="Get user achievements"
)
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Get achievements for the current user."""
    return await service.get_user_achievements(db, user_id=current_user_id)


@router.get(
    "/recommendations",
    response_model=List[AIRecommendation],
    summary="Get AI recommendations"
)
async def get_ai_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Get AI recommendations for the current user."""
    return await service.get_ai_recommendations(db, user_id=current_user_id)


@router.get("/news", response_model=List[NewsItem], summary="Get news feed")
async def get_news_feed(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    return await service.get_news_feed(db, user_id=current_user_id)


@router.get("/roadmap", response_model=List[RoadmapEvent], summary="Get roadmap events")
async def get_roadmap(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    return await service.get_roadmap_events(db, user_id=current_user_id)


@router.get(
    "/duels/recent", response_model=List[Duel], summary="Get recent duels"
)
async def get_recent_duels(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    return await service.get_recent_duels(db, user_id=current_user_id)


@router.get(
    "/activity/streak",
    response_model=List[DailyActivity],
    summary="Get user's daily activity for a given year"
)
async def get_daily_activity(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
    year: Optional[int] = None,
):
    """Get user's daily activity for a given year to display on the streak calendar."""
    if year is None:
        year = datetime.utcnow().year
    return await service.get_daily_activity(db, user_id=current_user_id, year=year)


@router.post(
    "/progress/{category}",
    response_model=UserProfile,
    summary="Update progress for a category"
)
async def update_progress(
    category: str,
    progress: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Update progress for a specific category."""
    if not 0 <= progress <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Progress must be between 0 and 100"
        )
    
    return await service.update_user_progress(
        db, user_id=current_user_id, category=category, progress=progress
    )


@router.post(
    "/stats/update",
    response_model=UserProfile,
    summary="Update user statistics"
)
async def update_stats(
    tasks_completed: int = None,
    current_streak: int = None,
    successful_duels: int = None,
    total_duels: int = None,
    tournaments_won: int = None,
    average_solve_time: float = None,
    fastest_solve_time: float = None,
    total_attempts: int = None,
    ai_duels: int = None,
    pvp_duels: int = None,
    best_streak: int = None,
    tournaments_played: int = None,
    success_rate: float = None,
    email_notifications: bool = None,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Update user statistics."""
    return await service.update_user_stats(
        db,
        user_id=current_user_id,
        tasks_completed=tasks_completed,
        current_streak=current_streak,
        successful_duels=successful_duels,
        total_duels=total_duels,
        tournaments_won=tournaments_won,
        average_solve_time=average_solve_time,
        fastest_solve_time=fastest_solve_time,
        total_attempts=total_attempts,
        ai_duels=ai_duels,
        pvp_duels=pvp_duels,
        best_streak=best_streak,
        tournaments_played=tournaments_played,
        success_rate=success_rate,
        email_notifications=email_notifications,
    )


@router.post(
    "/notifications",
    response_model=UserProfile,
    summary="Update notification preferences"
)
async def update_notifications(
    email_notifications: bool,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Update email notification preference for the current user."""
    return await service.update_notification_preference(
        db, user_id=current_user_id, email_notifications=email_notifications
    )


@router.post(
    "/achievements/add",
    response_model=UserProfile,
    summary="Add achievement"
)
async def add_achievement(
    achievement_name: str,
    description: str,
    icon: str = "award",
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID4 = Depends(get_current_user_id),
):
    """Add a new achievement for the current user."""
    return await service.add_achievement(
        db,
        user_id=current_user_id,
        achievement_name=achievement_name,
        description=description,
        icon=icon
    )


@router.post(
    "/problem-solved",
    summary="Mark problem as solved"
)
async def mark_problem_solved(
    problem_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mark a problem as solved and update user stats"""
    # Get user ID from header (internal service call)
    user_id_str = request.headers.get("User-ID")
    if not user_id_str:
        raise HTTPException(status_code=400, detail="User-ID header required")
    
    try:
        current_user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User-ID format")
    
    profile = await service.get_or_create_user_profile(db, user_id=current_user_id)
    
    # Increment tasks completed
    new_tasks_completed = profile.tasks_completed + 1
    
    # Update streak
    new_streak = profile.current_streak + 1
    
    # Add XP based on difficulty
    difficulty_xp = {
        "easy": 10,
        "medium": 25, 
        "hard": 50
    }
    xp_gained = difficulty_xp.get(problem_data.get("difficulty", "medium"), 25)
    new_xp = profile.xp + xp_gained
    
    # Update level based on XP (every 100 XP = 1 level)
    new_level = max(1, new_xp // 100 + 1)
    
    # Update the profile
    await service.update_user_stats(
        db,
        user_id=current_user_id,
        tasks_completed=new_tasks_completed,
        current_streak=new_streak
    )
    
    # Update XP and level separately
    profile.xp = new_xp
    profile.level = new_level
    await db.commit()
    
    # Check for achievements
    if new_tasks_completed == 1:
        await service.add_achievement(
            db,
            user_id=current_user_id,
            achievement_name="First Steps",
            description="Completed your first coding challenge",
            icon="play"
        )
    elif new_tasks_completed == 10:
        await service.add_achievement(
            db,
            user_id=current_user_id,
            achievement_name="Problem Solver", 
            description="Solved 10 coding problems",
            icon="puzzle"
        )
    
    return {
        "success": True,
        "xp_gained": xp_gained,
        "new_level": new_level,
        "new_streak": new_streak
    } 


@router.post(
    "/internal/duel-completed",
    summary="Update user stats after a duel",
    include_in_schema=False  # Hide from public docs
)
async def duel_completed(
    result_data: DuelResultData,
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint for the duels_service to report duel results.
    """
    await service.update_stats_from_duel(db, result_data)
    return {"status": "ok"} 