import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from shared.app.database import Base


class UserRole(str, Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(String)
    
    # Role and permissions
    role: Mapped[str] = mapped_column(String, default=UserRole.USER.value, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Google OAuth fields
    google_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    google_email: Mapped[str | None] = mapped_column(String, index=True)
    google_picture: Mapped[str | None] = mapped_column(String)
    oauth_provider: Mapped[str | None] = mapped_column(String, default=None, index=True)  # 'google', 'github', etc.
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    
    def is_admin(self) -> bool:
        """Check if user has admin privileges"""
        return self.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    
    def is_moderator(self) -> bool:
        """Check if user has moderator privileges"""
        return self.role in [UserRole.MODERATOR.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    
    def can_manage_problems(self) -> bool:
        """Check if user can manage problems"""
        return self.is_admin()
    
    def can_manage_users(self) -> bool:
        """Check if user can manage other users"""
        return self.role == UserRole.SUPER_ADMIN.value


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # Who performed the action
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    username: Mapped[str] = mapped_column(String)  # Denormalized for easier querying
    user_role: Mapped[str] = mapped_column(String)
    
    # What action was performed
    action: Mapped[str] = mapped_column(String, index=True)  # CREATE, UPDATE, DELETE, etc.
    resource_type: Mapped[str] = mapped_column(String, index=True)  # problem, tag, company, user, etc.
    resource_id: Mapped[str | None] = mapped_column(String)  # ID of the affected resource
    
    # Additional details
    description: Mapped[str] = mapped_column(Text)
    extra_data: Mapped[dict | None] = mapped_column(JSON)  # Additional structured data
    
    # Request details
    ip_address: Mapped[str | None] = mapped_column(String)
    user_agent: Mapped[str | None] = mapped_column(String)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True) 