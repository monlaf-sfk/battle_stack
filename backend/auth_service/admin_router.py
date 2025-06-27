from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.app.auth.models import User
from shared.app.auth.security import hash_password, get_current_active_superuser
from shared.app.database import get_db
from shared.app.schemas import UserCreate, User as UserSchema

router = APIRouter()


@router.post("/users/", response_model=UserSchema)
async def create_user_admin(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Create a new user (admin only)"""
    # Check if user already exists
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    hashed_password = hash_password(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        role=user_in.role if user_in.role else "user",
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user 