from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.app.auth.router import router as auth_router
from .admin_router import router as admin_router_v1
from shared.app.database import engine, Base
import asyncio
from sqlalchemy import text
from shared.app.config import settings

# Import all models from all services to ensure they are registered with Base.metadata
from shared.app.auth.models import User, AdminAuditLog
from shared.app.user.models import UserProfile, UserProgress, UserAchievement
from shared.app.problems.models import Problem, Tag, Company, CodeTemplate, TestCase, UserSubmission

app = FastAPI(title="CodeArena Auth Service", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prefix all auth routes with /auth for clarity when proxied via gateway
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router_v1, prefix="/admin", tags=["admin"])

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"} 