import sys
import os
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import (
    Column, String, UUID as PGUUID, DateTime, Integer, Float, Boolean,
    ForeignKey, Text, JSON, Enum as SQLEnum, CheckConstraint, UniqueConstraint,
    func, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from shared.app.database import Base
from shared.app.auth.models import User


class DuelStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class DuelMode(str, Enum):
    RANDOM_PLAYER = "random_player"
    AI_OPPONENT = "ai_opponent"
    PRIVATE_ROOM = "private_room"


class DuelDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class ProblemType(str, Enum):
    ALGORITHM = "algorithm"
    DATA_STRUCTURE = "data_structure"
    DYNAMIC_PROGRAMMING = "dynamic_programming"
    GRAPH = "graph"
    STRING = "string"
    ARRAY = "array"
    TREE = "tree"
    MATH = "math"


class PlayerRank(str, Enum):
    BRONZE_I = "bronze_i"
    BRONZE_II = "bronze_ii"
    BRONZE_III = "bronze_iii"
    SILVER_I = "silver_i"
    SILVER_II = "silver_ii"
    SILVER_III = "silver_iii"
    GOLD_I = "gold_i"
    GOLD_II = "gold_ii"
    GOLD_III = "gold_iii"
    PLATINUM_I = "platinum_i"
    PLATINUM_II = "platinum_ii"
    PLATINUM_III = "platinum_iii"
    DIAMOND = "diamond"
    MASTER = "master"
    GRANDMASTER = "grandmaster"


class AchievementType(str, Enum):
    FIRST_VICTORY = "first_victory"
    SPEED_DEMON = "speed_demon"
    COMEBACK_KID = "comeback_kid"
    PERFECT_WEEK = "perfect_week"
    WINNING_STREAK = "winning_streak"
    PROBLEM_SOLVER = "problem_solver"
    QUICK_DRAW = "quick_draw"
    UNDEFEATED = "undefeated"


class Duel(Base):
    __tablename__ = "duels"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    room_code = Column(String(10), unique=True, nullable=True)  # For private rooms
    mode = Column(SQLEnum(DuelMode), nullable=False)
    status = Column(SQLEnum(DuelStatus), nullable=False, default=DuelStatus.WAITING)
    difficulty = Column(SQLEnum(DuelDifficulty), nullable=False)
    problem_type = Column(SQLEnum(ProblemType), nullable=False)
    
    problem_id = Column(PGUUID(as_uuid=True), ForeignKey("duel_problems.id"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Relationships
    participants = relationship("DuelParticipant", back_populates="duel", cascade="all, delete-orphan")
    problem = relationship("DuelProblem", back_populates="duels")
    code_snapshots = relationship("DuelCodeSnapshot", back_populates="duel", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_duels_status", "status"),
        Index("idx_duels_mode", "mode"),
        Index("idx_duels_created_at", "created_at"),
        Index("idx_duels_updated_at", "updated_at"),
        Index("idx_duels_status_updated_at", "status", "updated_at"),
    )
    
    # TODO: Fix hybrid_property with async context
    # @hybrid_property
    # def winner_id(self) -> Optional[UUID]:
    #     winner = next((p for p in self.participants if p.is_winner), None)
    #     return winner.user_id if winner else None


class DuelParticipant(Base):
    __tablename__ = "duel_participants"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    duel_id = Column(PGUUID(as_uuid=True), ForeignKey("duels.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), nullable=True)  # Null for AI
    is_ai = Column(Boolean, default=False)
    ai_difficulty = Column(SQLEnum(DuelDifficulty), nullable=True)  # For AI opponents
    
    # Results
    is_winner = Column(Boolean, default=False)
    submission_time = Column(DateTime, nullable=True)
    solve_duration_seconds = Column(Integer, nullable=True)
    tests_passed = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    final_code = Column(Text, nullable=True)
    language = Column(String(20), default="python")
    
    # Stats at the time of duel
    rating_before = Column(Integer, nullable=True)
    rating_after = Column(Integer, nullable=True)
    rating_change = Column(Integer, nullable=True)
    
    joined_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    duel = relationship("Duel", back_populates="participants")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("duel_id", "user_id", name="unique_user_per_duel"),
        CheckConstraint("NOT (is_ai AND user_id IS NOT NULL)", name="ai_or_user_not_both"),
        Index("idx_participants_user_id", "user_id"),
        Index("idx_participants_duel_id", "duel_id"),
    )


class DuelProblem(Base):
    __tablename__ = "duel_problems"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(DuelDifficulty), nullable=False)
    problem_type = Column(SQLEnum(ProblemType), nullable=False)
    
    # 🧱 ANTI-DUPLICATE: Unique fingerprint for deduplication
    fingerprint = Column(String(32), nullable=True, unique=True, index=True)
    
    # Problem content
    starter_code = Column(JSON, nullable=False)  # {"python": "def solution():", "javascript": "..."}
    test_cases = Column(JSON, nullable=False)  # [{"input": "...", "output": "...", "is_hidden": false}]
    constraints = Column(Text, nullable=True)
    hints = Column(JSON, nullable=True)  # ["hint1", "hint2"]
    
    # AI generation metadata
    ai_generated = Column(Boolean, default=True)
    generation_prompt = Column(Text, nullable=True)
    
    # Stats
    times_used = Column(Integer, default=0)
    average_solve_time = Column(Float, nullable=True)
    success_rate = Column(Float, nullable=True)
    
    # 🔄 ROTATION: Last used timestamp for TTL
    last_used_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    duels = relationship("Duel", back_populates="problem")
    user_history = relationship("UserProblemHistory", back_populates="problem", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_problems_difficulty", "difficulty"),
        Index("idx_problems_type", "problem_type"),
        Index("idx_problems_fingerprint", "fingerprint"),
        Index("idx_problems_last_used", "last_used_at"),
    )


class PlayerRating(Base):
    __tablename__ = "player_ratings"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), unique=True, nullable=False)
    
    # ELO Rating
    elo_rating = Column(Integer, default=1200)
    rank = Column(SQLEnum(PlayerRank), default=PlayerRank.BRONZE_I)
    
    # Statistics
    total_duels = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    draws = Column(Integer, default=0)
    
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    
    average_solve_time = Column(Float, nullable=True)
    fastest_solve_time = Column(Float, nullable=True)
    
    # XP System
    experience_points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    
    last_duel_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    achievements = relationship("PlayerAchievement", back_populates="player_rating", cascade="all, delete-orphan")
    
    # Computed properties
    @hybrid_property
    def win_rate(self) -> float:
        if self.total_duels == 0:
            return 0.0
        return (self.wins / self.total_duels) * 100
    
    # Indexes
    __table_args__ = (
        Index("idx_ratings_elo", "elo_rating"),
        Index("idx_ratings_user_id", "user_id"),
    )


class DuelCodeSnapshot(Base):
    __tablename__ = "duel_code_snapshots"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    duel_id = Column(PGUUID(as_uuid=True), ForeignKey("duels.id"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), nullable=False)
    
    code = Column(Text, nullable=False)
    language = Column(String(20), default="python")
    timestamp = Column(DateTime, server_default=func.now())
    
    # Test results at this snapshot
    tests_passed = Column(Integer, default=0)
    tests_failed = Column(Integer, default=0)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    duel = relationship("Duel", back_populates="code_snapshots")
    
    # Indexes
    __table_args__ = (
        Index("idx_snapshots_duel_user", "duel_id", "user_id"),
        Index("idx_snapshots_timestamp", "timestamp"),
    )


class PlayerAchievement(Base):
    __tablename__ = "player_achievements"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    player_rating_id = Column(PGUUID(as_uuid=True), ForeignKey("player_ratings.id"), nullable=False)
    achievement_type = Column(SQLEnum(AchievementType), nullable=False)
    
    unlocked_at = Column(DateTime, server_default=func.now())
    progress = Column(Integer, default=0)  # For progressive achievements
    target = Column(Integer, nullable=True)  # Target for progressive achievements
    
    # Relationships
    player_rating = relationship("PlayerRating", back_populates="achievements")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("player_rating_id", "achievement_type", name="unique_achievement_per_player"),
        Index("idx_achievements_player", "player_rating_id"),
    )


class DuelMatchHistory(Base):
    __tablename__ = "duel_match_history"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False)
    duel_id = Column(PGUUID(as_uuid=True), ForeignKey("duels.id"), nullable=False)
    
    opponent_id = Column(PGUUID(as_uuid=True), nullable=True)
    opponent_name = Column(String(100), nullable=False)  # Store name in case of AI or deleted users
    
    is_victory = Column(Boolean, nullable=False)
    solve_time = Column(String(10), nullable=True)  # "MM:SS" format
    problem_title = Column(String(200), nullable=False)
    rating_change = Column(Integer, nullable=True)
    
    played_at = Column(DateTime, server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_match_history_user", "user_id"),
        Index("idx_match_history_played_at", "played_at"),
    )


class UserProblemHistory(Base):
    """👤 USER PROBLEM HISTORY - Track what problems each user has seen"""
    __tablename__ = "user_problem_history"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), nullable=False)
    problem_id = Column(PGUUID(as_uuid=True), ForeignKey("duel_problems.id"), nullable=False) 
    duel_id = Column(PGUUID(as_uuid=True), ForeignKey("duels.id"), nullable=False)
    
    # Problem identification at time of playing
    fingerprint = Column(String(32), nullable=False, index=True)
    problem_title = Column(String(200), nullable=False)
    difficulty = Column(SQLEnum(DuelDifficulty), nullable=False)
    problem_type = Column(SQLEnum(ProblemType), nullable=False)
    
    # Player performance
    solved = Column(Boolean, default=False)
    tests_passed = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    solve_time_seconds = Column(Integer, nullable=True)
    
    # Feedback system for duplicates
    reported_as_duplicate = Column(Boolean, default=False)
    duplicate_feedback = Column(Text, nullable=True)
    
    used_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    problem = relationship("DuelProblem", back_populates="user_history")
    
    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", "duel_id", name="unique_user_problem_duel"),
        Index("idx_user_history_user_fingerprint", "user_id", "fingerprint"),
        Index("idx_user_history_user_id", "user_id"),
        Index("idx_user_history_fingerprint", "fingerprint"),
        Index("idx_user_history_used_at", "used_at"),
        Index("idx_user_history_difficulty_type", "difficulty", "problem_type"),
    ) 