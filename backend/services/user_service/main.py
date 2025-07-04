from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router as user_router
from shared.app.config import settings
from shared.app.database import init_db_connection, close_db_connection
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Context manager for managing application startup and shutdown events."""
    print("🚀 User Service starting up...")
    await init_db_connection()
    print("✅ Database connection initialized.")
    yield
    print("👋 User Service shutting down...")
    await close_db_connection()
    print("❌ Database connection closed.")

app = FastAPI(title="CodeArena User Service", version="0.1.0", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/api/v1/users", tags=["users"])

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"} 