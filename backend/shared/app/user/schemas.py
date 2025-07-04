import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class UserProfileBase(BaseModel):
    xp: int = Field(default=0, ge=0)
    level: int = Field(default=1, ge=1)
    tasks_completed: int = Field(default=0, ge=0)
    current_streak: int = Field(default=0, ge=0)
    successful_duels: int = Field(default=0, ge=0)
    total_duels: int = Field(default=0, ge=0)
    tournaments_won: int = Field(default=0, ge=0)
    category_progress: Dict[str, int] = Field(default_factory=dict)
    achievements: List[Dict] = Field(default_factory=list)
    ai_recommendations: List[Dict] = Field(default_factory=list)
    news_feed: List[Dict] = Field(default_factory=list)
    roadmap_events: List[Dict] = Field(default_factory=list)
    recent_duels: List[Dict] = Field(default_factory=list)
    average_solve_time: Optional[float] = None
    fastest_solve_time: Optional[float] = None
    total_attempts: int = 0
    success_rate: Optional[float] = None
    ai_duels: int = 0
    pvp_duels: int = 0
    best_streak: int = 0
    tournaments_played: int = 0
    email_notifications: bool = Field(default=True)

class UserProfileCreate(UserProfileBase):
    user_id: uuid.UUID

class UserProfile(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    last_active: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProgressData(BaseModel):
    name: str
    value: int
    color: str

class DashboardStats(BaseModel):
    tasks_completed: int
    current_streak: int
    successful_duels: int
    total_duels: int
    tournaments_won: int
    progress_data: List[ProgressData]
    average_solve_time: Optional[float] = None
    fastest_solve_time: Optional[float] = None
    total_attempts: int = 0
    success_rate: Optional[float] = None
    ai_duels: int = 0
    pvp_duels: int = 0
    best_streak: int = 0
    tournaments_played: int = 0
    email_notifications: bool = True

class Achievement(BaseModel):
    name: str
    status: str  # "Completed", "In Progress", "Not Started"
    details: str
    icon: str
    earned_at: Optional[datetime] = None

class AIRecommendation(BaseModel):
    title: str
    description: str
    difficulty: str
    estimated_time: str
    improvement: str

class UserProgressCreate(BaseModel):
    user_id: uuid.UUID
    category: str
    progress_percentage: int = Field(ge=0, le=100)
    tasks_completed: int = Field(default=0, ge=0)
    total_tasks: int = Field(default=0, ge=0)

class UserProgressResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    progress_percentage: int
    tasks_completed: int
    total_tasks: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserAchievementCreate(BaseModel):
    user_id: uuid.UUID
    achievement_name: str
    status: str = "Not Started"
    description: Optional[str] = None
    icon: str = "award"

class UserAchievementResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    achievement_name: str
    status: str
    description: Optional[str]
    icon: str
    earned_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class NewsItem(BaseModel):
    title: str
    description: str
    type: str  # 'tournament', 'event', 'update'
    icon: str

class RoadmapEvent(BaseModel):
    title: str
    description: str
    icon: str

class Duel(BaseModel):
    opponent: str
    result: str  # 'Won' | 'Lost'
    score: str
    date: datetime 