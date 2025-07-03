import logging
import os
from typing import Optional, List, Dict, Any
import ast

import httpx
from pydantic import BaseModel

from shared.app.config import settings

# It's recommended to store this in environment variables
JUDGE0_URL = os.getenv("JUDGE0_URL")
JUDGE0_API_KEY = settings.JUDGE0_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# It's good practice to create a single client instance and reuse it.
# Set a timeout to prevent requests from hanging indefinitely.
# The timeout is set to 15 seconds for connecting, and 10 seconds for read/write.
_http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=15.0))

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
        logger.error("JUDGE0_URL environment variable is not set. Cannot execute code.")
        return SubmissionResult(
            status={'description': 'Configuration Error'},
            message="Code execution service is not configured on the server."
        )

    payload = {
        "source_code": params.source_code,
        "language_id": params.language_id,
        "stdin": params.stdin,
        "expected_output": params.expected_output,
        "cpu_time_limit": params.cpu_time_limit,
        "memory_limit": params.memory_limit,
    }

    try:
        # Use a longer timeout for the submission itself
        response = await _http_client.post(
            f"{JUDGE0_URL}/submissions?base64_encoded=false&wait=true",
            json=payload,
            timeout=30.0 # Increased timeout for code execution
        )
        response.raise_for_status()
        result_data = response.json()
        return SubmissionResult(**result_data)
    except httpx.TimeoutException:
        logger.error(f"Connection timeout while connecting to Judge0 at {JUDGE0_URL}")
        return SubmissionResult(
            status={'description': 'Exec Format Error'}, # More specific error for frontend
            message="Judge0 service connection timeout"
        )
    except httpx.RequestError as e:
        logger.error(f"Request to Judge0 failed: {e}")
        return SubmissionResult(
            status={'description': 'Execution Service Error'},
            message=f"Could not connect to Judge0 execution service: {e}"
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred during code execution: {e}")
        return SubmissionResult(
            status={'description': 'Internal Server Error'},
            message=f"An unexpected error occurred: {e}"
        )

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