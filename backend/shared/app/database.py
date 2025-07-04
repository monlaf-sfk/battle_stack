from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import declarative_base
from sqlalchemy.exc import ProgrammingError
import asyncio # Import asyncio

from .config import settings

# Base for declarative models
# Base = declarative_base()

# Global variables for engine and sessionmaker
# These will be initialized during application startup
engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None

async def init_db_connection():
    """Initialize the database engine and sessionmaker."""
    global engine, SessionLocal
    print(f"DEBUG: init_db_connection called. Current engine: {engine}, SessionLocal: {SessionLocal}")
    if engine is None or SessionLocal is None:
        print(f"DEBUG: Attempting to initialize DB connection with URL: {settings.DATABASE_URL}")
        engine = create_async_engine(settings.DATABASE_URL)
        SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
        print(f"DEBUG: DB connection initialized. New engine: {engine}, New SessionLocal: {SessionLocal}")

async def close_db_connection():
    """Close the database connection pool."""
    global engine
    if engine:
        print("DEBUG: Disposing of DB engine...")
        await engine.dispose()
        engine = None
        print("DEBUG: DB engine disposed.")

async def get_db():
    """Dependency to get a database session."""
    if SessionLocal is None:
        print("ERROR: SessionLocal is None when get_db() is called.")
        raise RuntimeError("Database session not initialized. Call init_db_connection() first.")
    async with SessionLocal() as session:
        yield session


# Alias for compatibility
get_async_session = get_db 