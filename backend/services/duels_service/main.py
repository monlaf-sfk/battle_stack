import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from shared.app.duels.router import router as duels_router
from shared.app.config import settings
from shared.app.database import SessionLocal
from shared.app.duels.flow_service import duel_flow_service
from shared.app.duels import service as duel_service

# Define a constant for the duel time limit in seconds (e.g., 15 minutes)
DUEL_TIME_LIMIT_SECONDS = 15 * 60

async def check_for_timed_out_duels():
    """
    Periodically checks for duels that have exceeded their time limit
    and ends them.
    """
    while True:
        print("Running periodic check for timed-out duels...")
        db: AsyncSession = SessionLocal()
        try:
            await duel_service.end_timed_out_duels(db, DUEL_TIME_LIMIT_SECONDS)
        finally:
            await db.close()
        
        # Wait for 60 seconds before the next check
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up Duels Service...")
    # Start the background task
    asyncio.create_task(check_for_timed_out_duels())
    yield
    # Shutdown
    print("Shutting down Duels Service...")


app = FastAPI(
    title="Duels Service",
    description="Manages real-time programming duels.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(duels_router, prefix="/api/v1", tags=["duels"])

@app.get("/health")
async def health_check():
    return {"status": "ok"} 