from pydantic import BaseModel, EmailStr, UUID4, field_validator, constr
from typing import Optional, List, Any
from datetime import datetime
import uuid
import re
import os


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str | None = None
    google_picture: Optional[str] = None
    oauth_provider: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Custom email validation that allows test domains in development"""
        # Basic email format validation
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        if not email_pattern.match(v):
            raise ValueError("Invalid email format")
        
        # In development, allow test domains like .test, .local, .dev
        environment = os.getenv("ENVIRONMENT", "development")
        if environment == "development":
            test_domains = ['.test', '.local', '.dev', '.localhost']
            if any(v.lower().endswith(domain) for domain in test_domains):
                return v.lower()
        
        # For production or non-test domains, use strict validation
        try:
            from email_validator import validate_email, EmailNotValidError
            validated_email = validate_email(v, check_deliverability=False)
            return validated_email.normalized
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email address: {str(e)}")
        except ImportError:
            # Fallback if email-validator is not available
            return v.lower()


class UserCreate(UserBase):
    password: constr(min_length=6, max_length=128)


class User(UserBase):
    id: uuid.UUID
    role: str = "user"
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    google_picture: Optional[str] = None
    oauth_provider: Optional[str] = None

    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def convert_datetime_to_str(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    @field_validator('last_login', mode='before')
    @classmethod
    def convert_optional_datetime_to_str(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    class Config:
        from_attributes = True


class UserInDB(UserBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class TokenRefreshRequest(BaseModel):
    refresh_token: str


# 🔐 Google OAuth Schemas
class GoogleAuthRequest(BaseModel):
    """Request schema for Google OAuth authorization"""
    credential: str  # Google ID Token (JWT)


class GoogleAuthResponse(BaseModel):
    """Response schema for Google OAuth"""
    access_token: str
    refresh_token: str
    token_type: str
    user: User
    is_new_user: bool


class GoogleUserInfo(BaseModel):
    """Google user information from ID token"""
    sub: str  # Google ID
    email: str
    name: str
    picture: Optional[str] = None
    email_verified: bool
    given_name: Optional[str] = None
    family_name: Optional[str] = None


class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[Any]


class Pagination(BaseModel):
    page: int = 1
    size: int = 20


class Message(BaseModel):
    message: str


class UserUpdate(BaseModel):
    username: Optional[constr(min_length=3, max_length=128, pattern="^[A-Za-z0-9-_]+$")] = None
    full_name: Optional[constr(min_length=1, max_length=128)] = None
