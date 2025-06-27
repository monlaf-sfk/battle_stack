from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.app.auth.security import hash_password, verify_password
from shared.app.auth.models import User
from shared.app.schemas import UserCreate


async def get_user(db: AsyncSession, username: str) -> User | None:
    query = select(User).where(User.username == username)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession, username_or_email: str, password: str
) -> User | None:
    # Try to find user by username first
    user = await get_user(db, username_or_email)
    
    # If not found by username, try by email
    if not user:
        user = await get_user_by_email(db, username_or_email)
    
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_user(db: AsyncSession, user: UserCreate) -> User:
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role="user"  # Default role for new users
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
