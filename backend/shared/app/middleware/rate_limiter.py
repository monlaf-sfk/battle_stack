from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from redis.asyncio import Redis
from redis.exceptions import ConnectionError
import time
import asyncio
from typing import Optional
import logging

from shared.app.config import settings
from shared.app.auth.security import verify_token # Assuming this exists and returns payload

logger = logging.getLogger(__name__)

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, redis_url: str):
        super().__init__(app)
        self.redis_url = redis_url
        self.redis: Optional[Redis] = None

    async def dispatch(self, request: Request, call_next):
        # Initialize Redis client on first request or if disconnected
        if not self.redis:
            try:
                self.redis = Redis.from_url(self.redis_url, decode_responses=True)
                await self.redis.ping() # Test connection
                logger.info("✅ Redis client initialized for Rate Limiter.")
            except ConnectionError as e:
                logger.error(f"❌ Could not connect to Redis at {self.redis_url}: {e}")
                raise RuntimeError("Could not connect to Redis for rate limiting.") from e

        # Define rate limiting parameters for different endpoints/types
        # Format: (key_prefix, limit_per_minute, burst)
        # Note: 'burst' allows a certain number of requests to exceed the rate
        # 'nodelay' means no requests are served if they exceed 'burst'
        rate_limits = {
            "/api/v1/auth/token": ("auth:token_login", 20, 0),    # 2 requests per minute, no burst for login
            "/api/v1/auth/register": ("auth:register", 20, 0), # 2 requests per minute, no burst for registration
            "/api/v1/duels/{duel_id}/submit": ("duel:submit", 10, 5), # 10 requests/minute, burst of 5 for duel submissions
            "/api/v1/duels/{duel_id}/run-public-tests": ("duel:test", 30, 10), # 30 requests/minute, burst of 10 for duel tests
        }

        path = request.url.path
        client_id = request.client.host if request.client else "unknown_ip" # Handle potential None for request.client

        # Attempt to get user_id from JWT if present
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = verify_token(token) # Your JWT verification function
                user_id = payload.get("user_id")
                if user_id:
                    client_id = user_id # Use user ID for authenticated requests
            except HTTPException:
                # If token is invalid, fall back to IP-based limiting for this request
                logger.warning("Invalid JWT token for rate limiting, falling back to IP.")
                pass
            except Exception as e:
                logger.error(f"Error decoding JWT for rate limiting: {e}")
                pass

        # Check for matching rate limit configuration
        limit_config = None
        for route_prefix, config in rate_limits.items():
            # Simple path matching for now. For more complex paths (e.g., with {id}),
            # you might need regex or a more sophisticated routing mechanism here.
            # This handles exact matches or prefixes.
            if path.startswith(route_prefix.replace('{duel_id}', '')): # Remove placeholders for prefix matching
                 # For specific endpoints like /submit, we need an exact match for strictness
                if "{duel_id}" in route_prefix:
                    # Check if the path is exactly /api/v1/duels/{some_uuid}/submit
                    parts = path.split('/')
                    if len(parts) >= 6 and parts[3] == "duels" and parts[5] in ["submit", "test"]:
                        limit_config = config
                        break
                elif path == route_prefix: # Exact match for token/register
                    limit_config = config
                    break
        
        if limit_config:
            key_prefix, limit, burst = limit_config
            redis_key = f"rate_limit:{key_prefix}:{client_id}"
            
            current_time = int(time.time())
            window_size = 60 # seconds

            # Atomically increment counter and set/update expiry
            # Using a simplified token bucket model for now
            # Increment request count, set/update expiry
            pipe = self.redis.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, window_size) # Expire key after 1 minute

            try:
                count = await pipe.execute()
                count = count[0] # Get the incremented value

                if count > limit + burst:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded for {path}. Try again in a minute."
                    )
                elif count > limit:
                    # Allow burst but add a delay
                    remaining_requests = limit + burst - count
                    wait_time = (count - limit) * (window_size / (burst + 1)) # Simple linear backoff
                    logger.warning(f"Rate limit burst hit for {path} by {client_id}. Delaying for {wait_time:.2f}s.")
                    await asyncio.sleep(wait_time)

            except ConnectionError as e:
                logger.error(f"Redis connection error during rate limiting for {client_id}: {e}")
                # Fallback: Allow request if Redis is down, but log the issue
                pass
            except Exception as e:
                logger.error(f"Unexpected error in rate limiting for {client_id}: {e}")
                raise # Re-raise other exceptions

        response = await call_next(request)
        return response 