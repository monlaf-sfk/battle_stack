import httpx
from uuid import UUID
from fastapi import HTTPException
import os

from shared.app.ai.generator import generate_algorithm_problem

# Re-export for clarity in other modules
generate_ai_problem = generate_algorithm_problem

PROBLEMS_SERVICE_URL = os.getenv("PROBLEMS_SERVICE_URL", "http://problems-service:8000")

async def get_problem_from_service(problem_id: UUID) -> dict:
    """
    Fetches a problem by its ID from the problems-service.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{PROBLEMS_SERVICE_URL}/api/v1/problems/{problem_id}")
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Error fetching problem from service: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503, # Service Unavailable
                detail=f"Could not connect to problems-service: {e}",
            ) 