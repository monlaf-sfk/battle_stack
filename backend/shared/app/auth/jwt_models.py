"""JWT User models for microservice authentication"""
from dataclasses import dataclass
from .models import UserRole


@dataclass
class JWTUser:
    """User object created from JWT claims for microservice authentication"""
    id: str
    username: str
    email: str
    full_name: str | None
    role: str
    is_active: bool
    is_verified: bool
    created_at: str
    updated_at: str
    last_login: str | None
    
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