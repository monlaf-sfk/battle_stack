from shared.app.auth.models import User
from shared.app.schemas import UserCreate, UserUpdate
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

async def get_user(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def get_users_by_ids(db: AsyncSession, user_ids: list[UUID]) -> list[User]:
    """
    Retrieves a list of users from the database based on a list of user IDs.
    """
    if not user_ids:
        return []
    
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return result.scalars().all()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).filter(User.username == username))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: UserCreate) -> User:
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user_id: UUID, user_data: UserUpdate) -> User | None:
    user = await get_user(db, user_id)
    if user is not None:
        for key, value in user_data.dict(exclude_unset=True).items():
            setattr(user, key, value)
        await db.commit()
        await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user_id: UUID) -> User | None:
    user = await get_user(db, user_id)
    if user is not None:
        await db.delete(user)
        await db.commit()
    return user