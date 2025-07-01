import uuid
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
import json
import os

from shared.app.user.models import UserProfile as UserProfileModel, UserProgress, UserAchievement
from shared.app.user.schemas import (
    UserProfileCreate, DashboardStats, ProgressData, Achievement, AIRecommendation,
    UserProgressCreate, UserProgressResponse, UserAchievementCreate, UserAchievementResponse
)

# Глобальный список всех достижений
ACHIEVEMENTS_PATH = os.path.join(os.path.dirname(__file__), "achievements.json")

def load_achievements():
    with open(ACHIEVEMENTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

async def get_or_create_user_profile(db: AsyncSession, *, user_id: uuid.UUID) -> UserProfileModel:
    """
    Get a user profile by user_id. If it doesn't exist, create one with default values.
    """
    result = await db.execute(select(UserProfileModel).filter(UserProfileModel.user_id == user_id))
    profile = result.scalars().first()
    
    if not profile:
        try:
            # Create profile with some sample data
            # Start with only potential achievements - they need to be earned
            default_achievements = [
                {
                    "name": "First Steps",
                    "status": "Not Started", 
                    "details": "Complete your first coding challenge",
                    "icon": "play"
                },
                {
                    "name": "Problem Solver",
                    "status": "Not Started",
                    "details": "Solve 10 coding problems",
                    "icon": "puzzle"
                },
                {
                    "name": "Duel Master",
                    "status": "Not Started",
                    "details": "Win your first coding duel",
                    "icon": "sword"
                },
                {
                    "name": "Speed Coder",
                    "status": "Not Started",
                    "details": "Solve a problem in under 5 minutes",
                    "icon": "zap"
                },
                {
                    "name": "Night Owl",
                    "status": "Not Started", 
                    "details": "Solve 5 problems after midnight",
                    "icon": "moon"
                },
                {
                    "name": "Streak Master",
                    "status": "Not Started",
                    "details": "Maintain a 7-day solving streak",
                    "icon": "flame"
                }
            ]
            
            default_recommendations = [
                {
                    "title": "Start with Basic Algorithms",
                    "description": "Begin your coding journey with fundamental sorting and searching algorithms.",
                    "difficulty": "Easy",
                    "estimated_time": "30 min",
                    "improvement": "+10% expected"
                },
                {
                    "title": "Data Structures Fundamentals", 
                    "description": "Master arrays, linked lists, and basic data structures.",
                    "difficulty": "Medium",
                    "estimated_time": "45 min",
                    "improvement": "+15% expected"
                }
            ]
            
            default_news = [
                {
                    "title": "CodeArena Season 2 starts next week!",
                    "description": "Join tournaments and climb the leaderboard.",
                    "type": "tournament",
                    "icon": "trophy",
                },
                {
                    "title": "New Dynamic Programming track released",
                    "description": "Sharpen your DP skills with 20 new problems.",
                    "type": "update",
                    "icon": "zap",
                },
                {
                    "title": "Holiday Hackathon announced",
                    "description": "Compete with coders worldwide this December!",
                    "type": "event",
                    "icon": "gift",
                },
            ]

            default_roadmap = [
                {"title": "Rookie League", "description": "The journey begins!", "icon": "shield-check"},
                {"title": "Algorithms", "description": "Honing core skills.", "icon": "zap"},
                {"title": "AI Boss", "description": "First major victory.", "icon": "trophy"},
            ]

            # No fake duels - users start with empty history
            
            default_progress = {
                "Data Structures": 0,
                "Algorithms": 0, 
                "DevOps": 0,
                "Data Science": 0
            }
            
            profile_in = UserProfileCreate(
                user_id=user_id,
                xp=0,
                level=1,
                tasks_completed=0,
                current_streak=0,
                successful_duels=0,
                total_duels=0,
                tournaments_won=0,
                category_progress=default_progress,
                achievements=default_achievements,
                ai_recommendations=default_recommendations,
                news_feed=default_news,
                roadmap_events=default_roadmap,
                recent_duels=[],
                average_solve_time=None,
                fastest_solve_time=None,
                total_attempts=0,
                success_rate=None,
                ai_duels=0,
                pvp_duels=0,
                best_streak=0,
                tournaments_played=0,
            )
            profile = UserProfileModel(**profile_in.model_dump())
            db.add(profile)
            await db.commit()
            await db.refresh(profile)
            
        except Exception as e:
            # Handle race condition - profile might have been created by another request
            await db.rollback()
            result = await db.execute(select(UserProfileModel).filter(UserProfileModel.user_id == user_id))
            profile = result.scalars().first()
            if not profile:
                # Re-raise the original error if profile still doesn't exist
                raise e
    
    return profile


async def get_dashboard_stats(db: AsyncSession, *, user_id: uuid.UUID) -> DashboardStats:
    """Get dashboard statistics for a user."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    # Convert category progress to ProgressData format
    progress_colors = {
        "Data Structures": "#00ff88",
        "Algorithms": "#8b5cf6", 
        "DevOps": "#06b6d4",
        "Data Science": "#ec4899"
    }
    
    progress_data = [
        ProgressData(
            name=category,
            value=progress,
            color=progress_colors.get(category, "#00ff88")
        )
        for category, progress in profile.category_progress.items()
    ]
    
    return DashboardStats(
        tasks_completed=profile.tasks_completed,
        current_streak=profile.current_streak,
        successful_duels=profile.successful_duels,
        total_duels=profile.total_duels,
        tournaments_won=profile.tournaments_won,
        progress_data=progress_data,
        average_solve_time=profile.average_solve_time,
        fastest_solve_time=profile.fastest_solve_time,
        total_attempts=profile.total_attempts,
        success_rate=profile.success_rate,
        ai_duels=profile.ai_duels,
        pvp_duels=profile.pvp_duels,
        best_streak=profile.best_streak,
        tournaments_played=profile.tournaments_played,
    )


async def get_user_achievements(db: AsyncSession, *, user_id: uuid.UUID) -> List[Achievement]:
    """Get achievements for a user."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    achievements = []
    for ach_data in profile.achievements:
        achievement = Achievement(
            name=ach_data["name"],
            status=ach_data["status"],
            details=ach_data["details"],
            icon=ach_data["icon"],
            earned_at=datetime.fromisoformat(ach_data["earned_at"]) if ach_data.get("earned_at") else None
        )
        achievements.append(achievement)
    
    return achievements


async def get_ai_recommendations(db: AsyncSession, *, user_id: uuid.UUID) -> List[AIRecommendation]:
    """Get AI recommendations for a user."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    recommendations = []
    for rec_data in profile.ai_recommendations:
        recommendation = AIRecommendation(
            title=rec_data["title"],
            description=rec_data["description"],
            difficulty=rec_data["difficulty"],
            estimated_time=rec_data["estimated_time"],
            improvement=rec_data["improvement"]
        )
        recommendations.append(recommendation)
    
    return recommendations


async def update_user_progress(db: AsyncSession, *, user_id: uuid.UUID, category: str, progress: int):
    """Update progress for a specific category."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    # Update category progress
    if not profile.category_progress:
        profile.category_progress = {}
    
    profile.category_progress[category] = min(max(progress, 0), 100)
    
    # Mark as updated
    profile.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(profile)
    return profile


async def check_and_update_achievements(db, user_profile):
    """Проверяет и добавляет новые достижения пользователю по статистике."""
    stats = user_profile
    achievements = user_profile.achievements or []
    achieved_names = {a["name"] for a in achievements if a["status"] == "Completed"}
    updated = False
    all_achievements = load_achievements()
    for ach in all_achievements:
        if ach["name"] not in achieved_names:
            # Безопасно разрешаем только простые выражения с полями stats
            try:
                condition = ach["condition"]
                # Пример: tasks_completed >= 1
                if eval(condition, {}, stats.__dict__):
                    achievements.append({
                        "name": ach["name"],
                        "status": "Completed",
                        "details": datetime.utcnow().strftime("%Y-%m-%d"),
                        "icon": ach["icon"],
                    })
                    updated = True
            except Exception:
                continue
    if updated:
        user_profile.achievements = achievements
        db.add(user_profile)
        await db.flush()


async def update_user_stats(
    db: AsyncSession, 
    *, 
    user_id: uuid.UUID,
    tasks_completed: Optional[int] = None,
    current_streak: Optional[int] = None,
    successful_duels: Optional[int] = None,
    total_duels: Optional[int] = None,
    tournaments_won: Optional[int] = None,
    average_solve_time: Optional[float] = None,
    fastest_solve_time: Optional[float] = None,
    total_attempts: Optional[int] = None,
    ai_duels: Optional[int] = None,
    pvp_duels: Optional[int] = None,
    best_streak: Optional[int] = None,
    tournaments_played: Optional[int] = None,
    success_rate: Optional[float] = None,
):
    """Update user statistics."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    if tasks_completed is not None:
        profile.tasks_completed = max(tasks_completed, 0)
    if current_streak is not None:
        profile.current_streak = max(current_streak, 0)
    if successful_duels is not None:
        profile.successful_duels = max(successful_duels, 0)
    if total_duels is not None:
        profile.total_duels = max(total_duels, 0)
    if tournaments_won is not None:
        profile.tournaments_won = max(tournaments_won, 0)
    if average_solve_time is not None:
        profile.average_solve_time = average_solve_time
    if fastest_solve_time is not None:
        profile.fastest_solve_time = fastest_solve_time
    if total_attempts is not None:
        profile.total_attempts = max(total_attempts, 0)
    if ai_duels is not None:
        profile.ai_duels = max(ai_duels, 0)
    if pvp_duels is not None:
        profile.pvp_duels = max(pvp_duels, 0)
    if tournaments_played is not None:
        profile.tournaments_played = max(tournaments_played, 0)
    if best_streak is not None:
        profile.best_streak = max(profile.best_streak, best_streak)
    # Автоматическое вычисление derived stats
    if profile.total_attempts > 0:
        profile.success_rate = profile.tasks_completed / profile.total_attempts
    else:
        profile.success_rate = None
    profile.best_streak = max(profile.best_streak, profile.current_streak)
    profile.updated_at = datetime.utcnow()
    await check_and_update_achievements(db, profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def add_achievement(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    achievement_name: str,
    description: str,
    icon: str = "award"
):
    """Add a new achievement for a user."""
    profile = await get_or_create_user_profile(db, user_id=user_id)
    
    new_achievement = {
        "name": achievement_name,
        "status": "Completed",
        "details": description,
        "icon": icon,
        "earned_at": datetime.utcnow().isoformat()
    }
    
    if not profile.achievements:
        profile.achievements = []
    
    # Check if achievement already exists
    existing = next((ach for ach in profile.achievements if ach["name"] == achievement_name), None)
    if not existing:
        profile.achievements.append(new_achievement)
        profile.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(profile)
    
    return profile


async def get_news_feed(db: AsyncSession, *, user_id: uuid.UUID):
    profile = await get_or_create_user_profile(db, user_id=user_id)
    return profile.news_feed


async def get_roadmap_events(db: AsyncSession, *, user_id: uuid.UUID):
    profile = await get_or_create_user_profile(db, user_id=user_id)
    return profile.roadmap_events


async def get_recent_duels(db: AsyncSession, *, user_id: uuid.UUID):
    profile = await get_or_create_user_profile(db, user_id=user_id)
    return profile.recent_duels or [] 