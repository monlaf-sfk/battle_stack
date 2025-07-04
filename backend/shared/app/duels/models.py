import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class DuelStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING_PROBLEM = "generating_problem"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    TIMED_OUT = "timed_out"
    CANCELLED = "cancelled"
    ERROR = "error"
    FAILED_GENERATION = "failed_generation"

class Duel(Base):
    __tablename__ = "duels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(as_uuid=True), nullable=False) # Foreign key to problems table
    status = Column(
        SAEnum(DuelStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DuelStatus.PENDING
    )

    player_one_id = Column(UUID(as_uuid=True), nullable=False) # Foreign key to users table
    player_two_id = Column(UUID(as_uuid=True), nullable=True) # Can be AI or another user

    player_one_code = Column(String, nullable=True)
    player_two_code = Column(String, nullable=True)
    
    results = Column(JSONB, nullable=True) # winner, scores, etc.
    
    time_limit_seconds = Column(Integer, nullable=True, default=900) # Default 15 minutes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    # Example of a foreign key relationship if users table is defined
    # from shared.app.user.models import User
    # player_one = relationship("User", foreign_keys=[player_one_id])
    # player_two = relationship("User", foreign_keys=[player_two_id]) 

class PlayerRating(Base):
    __tablename__ = "player_ratings"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    username = Column(String, nullable=False)
    elo_rating = Column(Integer, default=1200, nullable=False)
    wins = Column(Integer, default=0, nullable=False)
    losses = Column(Integer, default=0, nullable=False)
    total_matches = Column(Integer, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) 