from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
import json

from pydantic import BaseModel, Field, field_validator

from .models import (
    DuelStatus, DuelMode, DuelDifficulty, ProblemType,
    PlayerRank, AchievementType
)


# Base schemas
class DuelSettingsBase(BaseModel):
    difficulty: DuelDifficulty
    problem_type: ProblemType


class DuelCreateRequest(DuelSettingsBase):
    mode: DuelMode
    room_code: Optional[str] = None  # For private rooms


class AIDuelCreateRequest(DuelSettingsBase):
    """Request schema for creating AI duels - mode is set automatically"""
    pass


class DuelJoinRequest(BaseModel):
    room_code: Optional[str] = Field(None, min_length=5, max_length=10)
    difficulty: Optional[DuelDifficulty] = None


class CodeSubmission(BaseModel):
    code: str
    language: str = "python"


class CodeSnapshot(BaseModel):
    user_id: UUID
    code: str
    language: str
    timestamp: datetime
    tests_passed: int
    tests_failed: int
    execution_time_ms: Optional[int] = None
    error_message: Optional[str] = None


# Problem schemas
class TestCase(BaseModel):
    input: Union[str, Dict, List, int, float, bool]  # Support any JSON type
    output: Union[str, Dict, List, int, float, bool]  # Support any JSON type
    is_hidden: bool = False
    
    @field_validator('input', 'output', mode='before')
    @classmethod
    def ensure_json_serializable(cls, v):
        """Ensure input/output can be serialized properly"""
        if isinstance(v, (dict, list)):
            # Already a JSON object, return as is
            return v
        elif isinstance(v, str):
            try:
                # Try to parse as JSON if it's a string
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                # If it fails, return as string
                return v
        else:
            # For other types (int, float, bool), return as is
            return v


class DuelProblemBase(BaseModel):
    title: str
    description: str
    difficulty: DuelDifficulty
    problem_type: ProblemType
    constraints: Optional[str] = None
    hints: Optional[List[str]] = None


class DuelProblemCreate(DuelProblemBase):
    starter_code: Dict[str, str]
    test_cases: List[TestCase]


class DuelProblemResponse(DuelProblemBase):
    id: UUID
    starter_code: Dict[str, str]
    test_cases: List[TestCase]  # Only visible test cases for participants
    times_used: int
    average_solve_time: Optional[float] = None
    success_rate: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Participant schemas
class ParticipantInfo(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    username: str
    is_ai: bool
    rating: Optional[int] = None
    rank: Optional[PlayerRank] = None
    is_winner: bool = False
    solve_duration_seconds: Optional[int] = None
    tests_passed: int = 0
    total_tests: int = 0


# Duel schemas
class DuelResponse(BaseModel):
    id: UUID
    room_code: Optional[str] = None
    mode: DuelMode
    status: DuelStatus
    difficulty: DuelDifficulty
    problem_type: ProblemType
    problem: Optional[DuelProblemResponse] = None
    participants: List[ParticipantInfo]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    winner_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class DuelResult(BaseModel):
    duel_id: UUID
    winner_id: Optional[UUID]
    winner_username: str
    loser_id: Optional[UUID]
    loser_username: str
    winner_solve_time: str  # "MM:SS"
    loser_solve_time: Optional[str]
    winner_rating_change: int
    loser_rating_change: int


# Rating schemas
class PlayerRatingResponse(BaseModel):
    user_id: UUID
    elo_rating: int
    rank: PlayerRank
    total_duels: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    current_streak: int
    best_streak: int
    average_solve_time: Optional[float] = None
    experience_points: int
    level: int
    
    class Config:
        from_attributes = True


class PlayerStatsResponse(BaseModel):
    rating: PlayerRatingResponse
    recent_matches: List['MatchHistoryItem']
    achievements: List['AchievementResponse']


# Match history schemas
class MatchHistoryItem(BaseModel):
    id: UUID
    duel_id: UUID
    opponent_name: str
    is_victory: bool
    solve_time: Optional[str] = None
    problem_title: str
    rating_change: Optional[int] = None
    played_at: datetime
    
    class Config:
        from_attributes = True


# Achievement schemas
class AchievementResponse(BaseModel):
    achievement_type: AchievementType
    unlocked_at: datetime
    progress: int
    target: Optional[int] = None
    
    class Config:
        from_attributes = True


# WebSocket messages
class WSMessageType(BaseModel):
    type: str
    data: Dict[str, Any]


class DuelStartMessage(BaseModel):
    type: str = "duel_start"
    problem: DuelProblemResponse
    opponent: ParticipantInfo
    start_time: datetime


class CodeUpdateMessage(BaseModel):
    type: str = "code_update"
    user_id: UUID
    code: str
    language: str
    tests_passed: int
    tests_failed: int


class DuelCompleteMessage(BaseModel):
    type: str = "duel_complete"
    result: DuelResult


class TestResultMessage(BaseModel):
    type: str = "test_result"
    user_id: UUID
    passed: int
    failed: int
    execution_time_ms: Optional[int]
    error: Optional[str]


# Leaderboard schemas
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    username: str
    elo_rating: int
    player_rank: PlayerRank
    win_rate: float
    total_duels: int
    current_streak: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    total_players: int
    your_rank: Optional[int] = None


# 🚨 Anti-Duplicate System schemas
class DuplicateReportRequest(BaseModel):
    """Схема для жалоб на дубликаты задач"""
    problem_id: UUID
    feedback: str = Field(..., min_length=10, max_length=500, description="Опишите почему эта задача является дубликатом")
    similarity_reason: str = Field(..., description="Основная причина схожести: title, function_name, logic, description")


class DuplicateReportResponse(BaseModel):
    """Ответ на жалобу о дубликате"""
    success: bool
    message: str
    reported_at: datetime


class ProblemHistoryResponse(BaseModel):
    """История задач пользователя"""
    problem_id: UUID
    problem_title: str
    difficulty: DuelDifficulty 
    problem_type: ProblemType
    solved: bool
    tests_passed: int
    total_tests: int
    solve_time_seconds: Optional[int] = None
    used_at: datetime
    reported_as_duplicate: bool = False
    
    class Config:
        from_attributes = True


class AntiDuplicateStatsResponse(BaseModel):
    """Статистика анти-дубликатной системы"""
    total_problems_played: int
    unique_problems_count: int
    duplicate_reports_count: int
    avg_problem_reuse: float
    last_problem_played: Optional[datetime] = None 