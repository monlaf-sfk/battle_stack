import asyncio
import sys
import os
from contextlib import asynccontextmanager

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

print("🚀🚀🚀 MAIN.PY LOADING - DUELS SERVICE STARTING!")

class GlobalDebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"🌍🌍🌍 GLOBAL MIDDLEWARE: {request.method} {request.url.path}", flush=True)
        print(f"🌍 Headers: {dict(request.headers)}", flush=True)
        
        # Call the next middleware/endpoint
        response = await call_next(request)
        
        print(f"🌍 RESPONSE: {response.status_code}", flush=True)
        return response

from shared.app.config import get_settings
from shared.app.database import engine, Base
from duel_service.router import router, public_router
from duel_service.websocket_manager import ws_manager
from duel_service.service import duel_service
from shared.app.database import get_db
# Import models to ensure they are registered
from duel_service.models import *

# Background task for cleaning up stuck duels
async def cleanup_stuck_duels_task():
    """Background task to clean up stuck duels periodically"""
    while True:
        try:
            async for db in get_db():
                count = await duel_service.cleanup_stuck_duels(db)
                if count > 0:
                    print(f"🧹 Cleaned up {count} stuck duels")
                break
        except Exception as e:
            print(f"❌ Error in cleanup task: {e}")
        
        # Run every 5 minutes (less aggressive cleanup)
        await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("🚀 Starting duel service...")
    
    # Start background cleanup task for stuck duels
    stuck_duels_task = asyncio.create_task(cleanup_stuck_duels_task())
    print("🧹 Started stuck duels cleanup background task")
    
    # Start WebSocket connection cleanup task
    ws_cleanup_task = asyncio.create_task(ws_manager.start_cleanup_task())
    print("🧹 Started WebSocket cleanup background task")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down duel service...")
    
    # Cancel tasks
    stuck_duels_task.cancel()
    ws_cleanup_task.cancel()
    
    # Wait for tasks to complete cancellation
    try:
        await stuck_duels_task
    except asyncio.CancelledError:
        print("✅ Stuck duels cleanup task cancelled")
    
    try:
        await ws_cleanup_task
    except asyncio.CancelledError:
        print("✅ WebSocket cleanup task cancelled")
    
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title="BattleStack Duels Service",
    description="Real-time coding duels service",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# CORS middleware - разрешаем все для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки разрешаем все
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add global debug middleware
print("🚀 Adding GlobalDebugMiddleware to FastAPI app", flush=True)
app.add_middleware(GlobalDebugMiddleware)

# Include routers
app.include_router(public_router)  # Public routes first (no auth)
app.include_router(router)          # Authenticated routes


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "duels"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True
    ) 