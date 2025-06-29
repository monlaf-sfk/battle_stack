from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router as user_router
from shared.app.config import settings

app = FastAPI(title="CodeArena User Service", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/users", tags=["users"])

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"} 