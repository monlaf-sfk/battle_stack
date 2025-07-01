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
    Executes code using Judge0 API with a dynamic wrapper for Python.
    """
    judge0_url = os.getenv("JUDGE0_API_URL", "http://104.248.241.191:2358")
    api_key = os.getenv("JUDGE0_API_KEY", "")
    
    headers = {
        "Content-Type": "application/json",
        "X-Auth-Token": api_key
    }
    
    source_code = params.source_code
    
    # Dynamic Python Wrapper
    if params.language_id == 71: # Python 3
        try:
            # Find the last function defined in the solution code
            parsed_code = ast.parse(source_code)
            func_defs = [node for node in parsed_code.body if isinstance(node, ast.FunctionDef)]
            if not func_defs:
                # If no function, maybe it's a script. We run as-is but this is less reliable.
                function_name = None
            else:
                function_name = func_defs[-1].name
            
            # The wrapper now dynamically uses the found function name
            wrapper_code = f"""
import sys
import ast

# User's solution is above this line

try:
    input_str = sys.stdin.read().strip()
    if input_str:
        parsed_input = ast.literal_eval(input_str)
        
        # Dynamically call the identified function
        if '{function_name}':
            func_to_call = locals().get('{function_name}')
            if callable(func_to_call):
                if isinstance(parsed_input, tuple):
                    result = func_to_call(*parsed_input)
                else:
                    result = func_to_call(parsed_input)
                
                if result is not None:
                    print(result)
            else:
                # Fallback for script-based solutions
                pass # The script would have already run
        else:
             # Fallback for script-based solutions
             pass

except Exception as e:
    print(f"Execution Error: {{e}}", file=sys.stderr)
"""
            source_code = source_code + "\n" + wrapper_code
        except SyntaxError:
            # If the source code isn't valid Python, run it as is.
            logger.warning("Could not parse Python solution to build dynamic wrapper. Running as-is.")
            pass # source_code remains as-is

    payload = {
        "source_code": source_code,
        "language_id": params.language_id,
        "stdin": params.stdin,
        "expected_output": params.expected_output,
        "cpu_time_limit": params.cpu_time_limit,
        "memory_limit": params.memory_limit,
    }

    # Create timeout configuration with reasonable defaults
    timeout_config = httpx.Timeout(
        connect=10.0,  # 10 seconds to establish connection
        read=30.0,     # 30 seconds to read response
        write=10.0,    # 10 seconds to write request
        pool=10.0      # 10 seconds to get connection from pool
    )

    async with httpx.AsyncClient(timeout=timeout_config) as client:
        try:
            logger.info(f"Sending request to Judge0: {payload}")
            response = await client.post(
                f"{judge0_url}/submissions",
                params={"base64_encoded": "false", "wait": "true"},
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result_data = response.json()
            logger.info(f"Judge0 execution finished. Full result: {result_data}")
            return SubmissionResult.model_validate(result_data)

        except httpx.ConnectTimeout:
            logger.error(f"Connection timeout while connecting to Judge0 at {judge0_url}")
            # Return a result indicating the service is unavailable
            return SubmissionResult(
                stdout=None,
                stderr="Judge0 service connection timeout",
                status={"id": 14, "description": "Exec Format Error"},  # Use existing status for service issues
                message="Could not connect to Judge0 service"
            )
        except httpx.ReadTimeout:
            logger.error(f"Read timeout while waiting for Judge0 response")
            return SubmissionResult(
                stdout=None,
                stderr="Judge0 service read timeout",
                status={"id": 14, "description": "Exec Format Error"},
                message="Judge0 service took too long to respond"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred with Judge0: {e.response.status_code} - {e.response.text}")
            return SubmissionResult(
                stdout=None,
                stderr=f"Judge0 HTTP error: {e.response.status_code}",
                status={"id": 14, "description": "Exec Format Error"},
                message=f"Judge0 service error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error occurred while connecting to Judge0: {e}")
            return SubmissionResult(
                stdout=None,
                stderr="Judge0 service unavailable",
                status={"id": 14, "description": "Exec Format Error"},
                message=f"Judge0 service request failed: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error occurred while executing code with Judge0: {e}")
            return SubmissionResult(
                stdout=None,
                stderr="Unexpected error",
                status={"id": 14, "description": "Exec Format Error"},
                message=f"Unexpected error: {str(e)}"
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