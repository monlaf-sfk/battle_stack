from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.app.auth.security import hash_password, verify_password
from shared.app.auth.models import User, UserRole
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


async def create_user_google(
    db: AsyncSession,
    google_id: str,
    username: str,
    email: str,
    full_name: str,
    google_picture: str = None
) -> User:
    """
    🔐 Create new user from Google OAuth information
    
    Args:
        db: Database session
        google_id: Google user ID (sub claim)
        username: Generated unique username
        email: Google email
        full_name: User's full name from Google
        google_picture: Google profile picture URL
    
    Returns:
        User: Created user model
    """
    
    db_user = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password="",  # No password for OAuth users
        role=UserRole.USER.value,
        
        # Google OAuth fields
        google_id=google_id,
        google_email=email,
        google_picture=google_picture,
        oauth_provider="google",
        
        # OAuth users are automatically verified
        is_verified=True,
        is_active=True,
        
        # Set timestamps
        last_login=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    print(f"✅ Created Google OAuth user: {username} ({email})")
    
    return db_user
