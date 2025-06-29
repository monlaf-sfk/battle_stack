import logging
import os
from typing import Optional, List, Dict, Any

import httpx
from pydantic import BaseModel

from shared.app.config import settings

# It's recommended to store this in environment variables
JUDGE0_URL = os.getenv("JUDGE0_URL")
JUDGE0_API_KEY = settings.JUDGE0_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SubmissionParams(BaseModel):
    source_code: str
    language_id: int # See Judge0 API for language IDs (e.g., 71 for Python)
    stdin: Optional[str] = None
    expected_output: Optional[str] = None
    cpu_time_limit: float = 2.0 # seconds
    memory_limit: int = 128000 # kilobytes


class SubmissionResult(BaseModel):
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    message: Optional[str] = None
    status: Dict[str, Any]
    time: Optional[str] = None
    memory: Optional[int] = None


async def execute_code(params: SubmissionParams) -> SubmissionResult:
    """
    Submits code to Judge0 for execution and returns the result.
    """
    if not JUDGE0_URL:
        raise ValueError("JUDGE0_URL is not set")

    submission_payload = {
        "source_code": params.source_code,
        "language_id": params.language_id,
        "stdin": params.stdin,
        "expected_output": params.expected_output,
        "cpu_time_limit": params.cpu_time_limit,
        "memory_limit": params.memory_limit,
    }

    headers = {}
    if JUDGE0_API_KEY:
        headers["X-Auth-Token"] = JUDGE0_API_KEY

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending request to Judge0: {submission_payload}")
            response = await client.post(
                f"{JUDGE0_URL}/submissions",
                params={"base64_encoded": "false", "wait": "true"},
                json=submission_payload,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            result_data = response.json()
            logger.info(f"Judge0 execution finished. Full result: {result_data}")
            return SubmissionResult.model_validate(result_data)

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred with Judge0: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"An error occurred while executing code with Judge0: {e}")
            raise

# Example of how to use it
# async def main():
#     python_code = "print('Hello, Judge0!')"
#     params = SubmissionParams(source_code=python_code, language_id=71)
#     try:
#         result = await execute_code(params)
#         print(result.model_dump_json(indent=2))
#     except Exception as e:
#         print(f"Failed to execute code: {e}")

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main()) 