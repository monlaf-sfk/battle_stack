import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from shared.app.duels.router import router as duels_router
from shared.app.config import settings
from shared.app.database import SessionLocal, get_db, init_db_connection, close_db_connection
from shared.app.duels.flow_service import duel_flow_service
from shared.app.middleware.rate_limiter import RateLimiterMiddleware
from shared.app.duels import service as duel_service

# Define a constant for the duel time limit in seconds (e.g., 15 minutes)
DUEL_TIME_LIMIT_SECONDS = 15 * 60

async def check_for_timed_out_duels():
    """
    Periodically checks for duels that have exceeded their time limit
    and ends them.
    """
    # Ensure SessionLocal is initialized before proceeding
    while SessionLocal is None:
        print("Waiting for database session to be initialized...")
        await asyncio.sleep(1) # Wait a bit before retrying
        
    while True:
        print("Running periodic check for timed-out duels...")
        try:
            async with SessionLocal() as db:
                await duel_service.end_timed_out_duels(db, DUEL_TIME_LIMIT_SECONDS)
        except Exception as e:
            print(f"An error occurred in check_for_timed_out_duels: {e}")
        
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting up Duels Service...")
    await init_db_connection()
    print("✅ Database connection initialized.")
    # Start the background task
    background_task = asyncio.create_task(check_for_timed_out_duels())
    yield
    # Shutdown
    print("👋 Shutting down Duels Service...")
    background_task.cancel()
    try:
        await background_task
    except asyncio.CancelledError:
        print("Background task for checking timed-out duels was cancelled.")
    await close_db_connection()
    print("❌ Database connection closed.")


app = FastAPI(
    title="Duels Service",
    description="Manages real-time programming duels.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS is not None else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Rate Limiting Middleware
app.add_middleware(
    RateLimiterMiddleware,
    redis_url=settings.REDIS_URL
)

app.include_router(duels_router, prefix="/api/v1/duels", tags=["duels"])

@app.get("/health")
async def health_check():
    return {"status": "ok"} 