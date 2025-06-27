from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from shared.app.auth.service import authenticate_user, create_user, get_user
from shared.app.auth.security import create_access_token, create_refresh_token, verify_refresh_token, get_current_user
from shared.app.auth.models import User as UserModel
from shared.app.config import settings
from shared.app.database import get_db
from shared.app.schemas import Token, TokenRefreshRequest, User, UserCreate

router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    db_user = await get_user(db, user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    new_user = await create_user(db, user)
    return new_user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = False
) -> dict:
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Set token expiration based on remember_me
    if remember_me:
        # Remember me: 7 days for access token, 90 days for refresh token
        access_token_expires = timedelta(days=7)
        refresh_token_expires = timedelta(days=90)
        print(f"🔐 Remember me enabled - access token: 7 days, refresh token: 90 days for user {user.username}")
    else:
        # Normal login: 30 minutes for access token, 7 days for refresh token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=7)
        print(f"🔐 Normal login - access token: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes, refresh token: 7 days for user {user.username}")
    
    # Include user information in JWT claims for microservice architecture
    token_data = {
        "sub": user.username,
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "remember_me": remember_me  # Store remember_me in token for reference
    }
    
    # Create both tokens
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(data=token_data, expires_delta=refresh_token_expires)
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_request: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Refresh access token using refresh token"""
    
    # Verify refresh token
    try:
        payload = verify_refresh_token(refresh_request.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database to ensure they still exist and are active
    user = await get_user(db, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Check if it was a remember_me login for new token expiration
    remember_me = payload.get("remember_me", False)
    
    if remember_me:
        access_token_expires = timedelta(days=7)
        refresh_token_expires = timedelta(days=90)
    else:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=7)
    
    # Create new token data with updated information
    token_data = {
        "sub": user.username,
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "remember_me": remember_me
    }
    
    # Create new tokens
    new_access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    new_refresh_token = create_refresh_token(data=token_data, expires_delta=refresh_token_expires)
    
    print(f"🔄 Token refreshed for user {user.username}")
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user = Depends(get_current_user)
) -> User:
    """Get current user information including role and permissions (microservice-friendly)"""
    return User(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,  # Already a string from JWT
        updated_at=current_user.updated_at,  # Already a string from JWT
        last_login=current_user.last_login   # Already a string from JWT
    ) 