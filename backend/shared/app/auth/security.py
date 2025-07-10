from datetime import datetime, timedelta, timezone
from typing import Any
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import UUID4, ValidationError
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from shared.app.config import settings
from .jwt_models import JWTUser, TokenPayload
from .models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a refresh token with longer expiration"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default refresh token expiration: 30 days
        expire = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Add a random jti (JWT ID) for extra security
    to_encode.update({
        "exp": expire, 
        "type": "refresh",
        "jti": secrets.token_urlsafe(32)
    })
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def get_user_id_from_token(token: str) -> str | None:
    """
    Decode JWT token and extract user ID.
    Returns user ID on success, None on failure.
    Does not raise HTTP exceptions, making it suitable for WebSockets.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("user_id")
    except JWTError:
        return None


def verify_token(token: str) -> dict[str, Any]:
    """Verify JWT token and return payload. Raises exception if invalid."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("user_id")
        if user_id is None:
            raise JWTError("Missing user_id in token")
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )


def verify_refresh_token(token: str) -> dict[str, Any]:
    """Verify refresh token specifically"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
            
        user_id: str | None = payload.get("user_id")
        if user_id is None:
            raise JWTError("Missing user_id in token")
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> JWTUser:
    """Dependency to get current user from JWT token (microservice-friendly)."""
    print(f"🐛 DEBUG: get_current_user called with token: {token[:50]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        print(f"🐛 DEBUG: JWT payload decoded successfully: {payload}")
        
        # Extract user data from JWT claims
        user_id: str | None = payload.get("user_id")
        username: str | None = payload.get("sub")
        email: str | None = payload.get("email")
        role: str | None = payload.get("role", "user")
        is_active: bool = payload.get("is_active", True)
        is_verified: bool = payload.get("is_verified", False)
        
        print(f"🐛 DEBUG: Extracted user_id: {user_id}, username: {username}")
        
        if user_id is None or username is None:
            print(f"🐛 DEBUG: Missing user_id or username in JWT")
            raise credentials_exception
            
    except (JWTError, ValueError) as e:
        print(f"🐛 DEBUG: JWT decode error: {e}")
        raise credentials_exception
    
    # Create user object from JWT claims (no DB call needed)
    try:
        user = JWTUser(
            id=user_id,
            username=username,
            email=email or f"{username}@example.com",
            full_name=payload.get("full_name"),
            role=role,
            is_active=is_active,
            is_verified=is_verified,
            created_at=payload.get("created_at", "2025-01-01T00:00:00"),
            updated_at=payload.get("updated_at", "2025-01-01T00:00:00"),
            last_login=payload.get("last_login")
        )
        print(f"🐛 DEBUG: Created JWTUser object: {type(user)}, {user}")
        return user
    except Exception as user_creation_error:
        print(f"🐛 DEBUG: Error creating JWTUser: {user_creation_error}")
        raise credentials_exception


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> UUID4:
    """
    Dependency to get the current user's ID from a JWT token.
    This is useful for microservices where you only need the user ID
    and don't want to make a database call.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        # Get the user_id from the user_id claim (not sub which contains username)
        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        
        # Validate that the user_id is a valid UUID
        token_data = TokenPayload(sub=user_id)
        
    except (JWTError, ValidationError):
        raise credentials_exception
        
    return token_data.sub


async def get_current_active_user(
    current_user: JWTUser = Depends(get_current_user),
) -> JWTUser:
    """Dependency to get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_active_superuser(
    current_user: JWTUser = Depends(get_current_user)
) -> JWTUser:
    """Dependency to get current superuser (admin only)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    if not current_user.can_manage_users():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def is_admin(current_user: User = Depends(get_current_user)) -> bool:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return True
