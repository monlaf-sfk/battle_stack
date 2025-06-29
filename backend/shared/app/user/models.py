import uuid
from datetime import datetime
from typing import Dict, List

from sqlalchemy import Column, Integer, DateTime, JSON, String, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # This is not a foreign key, just a link to the user in the auth_db
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    
    # Dashboard Statistics
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    successful_duels: Mapped[int] = mapped_column(Integer, default=0)
    total_duels: Mapped[int] = mapped_column(Integer, default=0)
    tournaments_won: Mapped[int] = mapped_column(Integer, default=0)
    
    # Progress tracking by category (stored as JSON)
    # Format: {"Data Structures": 60, "Algorithms": 45, "DevOps": 20, "Data Science": 30}
    category_progress: Mapped[Dict] = mapped_column(JSON, default=dict)
    
    # Achievements (stored as JSON)
    # Format: [{"name": "100 Problems", "status": "Completed", "details": "Earned 2025-06-10", "icon": "award"}]
    achievements: Mapped[List] = mapped_column(JSON, default=list)
    
    # AI Recommendations (stored as JSON) 
    # Format: [{"title": "Graph Algorithms Challenge", "description": "...", "difficulty": "Medium", ...}]
    ai_recommendations: Mapped[List] = mapped_column(JSON, default=list)
    
    # Additional dashboard data
    news_feed: Mapped[List] = mapped_column(JSON, default=list)
    roadmap_events: Mapped[List] = mapped_column(JSON, default=list)
    recent_duels: Mapped[List] = mapped_column(JSON, default=list)
    
    # Profile metadata
    last_active: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Новые поля для расширенной статистики
    average_solve_time: Mapped[float | None] = mapped_column(Float, default=None)
    fastest_solve_time: Mapped[float | None] = mapped_column(Float, default=None)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float | None] = mapped_column(Float, default=None)
    ai_duels: Mapped[int] = mapped_column(Integer, default=0)
    pvp_duels: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    tournaments_played: Mapped[int] = mapped_column(Integer, default=0)


class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_tasks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    achievement_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Not Started")  # "Completed", "In Progress", "Not Started"
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="award")
    earned_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow) 