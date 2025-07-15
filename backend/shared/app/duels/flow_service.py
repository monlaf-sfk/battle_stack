import json
import asyncio
import logging
from uuid import UUID
from datetime import datetime, timezone
import ast
from typing import Dict, Any, cast

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from pydantic import BaseModel

from . import schemas, service, models
from .scoring import scoring_service
from .websocket_manager import manager
from shared.app.code_runner import execute_code, SubmissionParams, SubmissionResult
from shared.app.ai.generator import generate_algorithm_problem
import httpx
from .elo import AI_OPPONENT_ID, AI_DEFAULT_ELO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Map language names to Judge0 language IDs
LANGUAGE_MAP = {
    "assembly": 45,
    "bash": 46,
    "basic": 47,
    "c": 50, # C (GCC 9.2.0)
    "cpp": 54, # C++ (GCC 9.2.0)
    "csharp": 51,
    "common-lisp": 55,
    "d": 56,
    "elixir": 57,
    "erlang": 58,
    "executable": 44,
    "fortran": 59,
    "go": 60,
    "haskell": 61,
    "java": 62,
    "javascript": 63,
    "lua": 64,
    "ocaml": 65,
    "octave": 66,
    "pascal": 67,
    "php": 68,
    "prolog": 69,
    "python2": 70,
    "python": 71, # Python 3
    "ruby": 72,
    "rust": 73,
    "typescript": 74,
    "cobol": 77,
    "kotlin": 78,
    "objective-c": 79,
    "r": 80,
    "scala": 81,
    "sql": 82, # SQLite
    "swift": 83,
    "vbnet": 84, # Visual Basic.Net
}

class CodeExecutionResult(BaseModel):
    is_correct: bool
    error: str | None = None
    details: list | None = None
    passed: int = 0
    total: int = 0

async def _execute_code_against_tests(submission: schemas.CodeSubmission, problem: Dict[str, Any]) -> CodeExecutionResult:
    """Runs the user's code against all test cases for the problem using Judge0."""
    language_id = LANGUAGE_MAP.get(submission.language)
    if language_id is None:
        return CodeExecutionResult(is_correct=False, error="Unsupported language.")

    if problem is None or not problem.get("test_cases"):
        return CodeExecutionResult(is_correct=False, error="Problem has no test cases.")

    total_tests = len(problem["test_cases"])
    passed_tests = 0
    error_details = []
    
    source_to_run = submission.code
    # Always wrap python code to handle I/O, making it easier for the user.
    if submission.language == "python":
        function_name = problem.get("function_name")
        
        # We always use a wrapper for Python to handle I/O, ensuring consistency.
        if function_name is None:
            # This should ideally not happen if the problem generation is correct
            return CodeExecutionResult(is_correct=False, error="Could not determine function name to test. Problem data is missing this key.")

        # Safer I/O wrapper using ast.literal_eval
        wrapper = f"""

# User's solution is above this line
import sys
import ast

try:
    input_str = sys.stdin.read().strip()
    if input_str:
        # Safely parse the input string into a Python object.
        # It's expected to be a list or tuple literal, e.g., "[1, 2, 3]" or "('a', 'b')"
        parsed_input = ast.literal_eval(input_str)
        
        # Handle different input patterns
        if isinstance(parsed_input, tuple):
            # Assumes the function takes multiple arguments
            result = {function_name}(*parsed_input)
        else:
            # Assumes the function takes a single argument (e.g., a list)
            result = {function_name}(parsed_input)
            
        # Print the result to stdout
        if result is not None:
            print(result)

except Exception as e:
    # This helps debug issues with the wrapper or the user's code during execution
    import traceback
    print(f"Execution Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
"""
        source_to_run = submission.code + wrapper

    for i, test_case in enumerate(problem["test_cases"]):
        # The input data should be a string literal of the python object
        # e.g., "[1, 2, 3]" for a list
        stdin_to_run = str(test_case.get("input_data"))
        
        params = SubmissionParams(
            source_code=source_to_run,
            language_id=language_id,
            stdin=stdin_to_run,
            expected_output=None,
            cpu_time_limit=problem.get("time_limit", 2.0),
            memory_limit=problem.get("memory_limit", 128000)
        )
        
        try:
            result_data: SubmissionResult = await execute_code(params)
            status_desc = result_data.status.get("description")

            # Case 1: Compilation Error
            if status_desc == "Compilation Error":
                error_details.append(f"Compilation Error: {result_data.compile_output or 'No details provided.'}")
                break # Stop on compilation error

            # Case 2: Runtime Error, TLE, or other execution issues
            if status_desc not in ["Accepted", "Wrong Answer"]:
                error_details.append(
                    f"Test case {i+1} failed with status: {status_desc}. "
                    f"Input: {stdin_to_run}. "
                    f"Details: {result_data.stderr or 'No error message captured.'}"
                )
                continue

            # Case 3: No output produced
            if result_data.stdout is None or result_data.stdout.strip() == "":
                error_details.append(
                    f"Test case {i+1} failed: Wrong Answer. "
                    f"Input: {stdin_to_run}. "
                    f"Expected: '{test_case.get('expected_output')}', Got: No output. "
                    f"Ensure your function returns a value."
                )
                continue

            # Case 4: Output produced, compare with expected
            actual_output = (result_data.stdout or "").strip()
            expected_output = str(test_case.get("expected_output") or "").strip()

            if actual_output != expected_output:
                error_details.append(
                    f"Test case {i+1} failed: Wrong Answer. "
                    f"Input: {stdin_to_run}. "
                    f"Expected: '{expected_output}', Got: '{actual_output}'"
                )
            else:
                passed_tests += 1
                logger.info(f"Test case {i+1} passed. Input: {stdin_to_run}. Expected: '{expected_output}', Got: '{actual_output}'")

        except Exception as e:
            logger.error(f"Error executing test case {i+1} for input {stdin_to_run}: {e}", exc_info=True)
            error_details.append(f"Test case {i+1} failed with an unhandled system exception: {str(e)}")

    all_passed = passed_tests == total_tests
    if not all_passed:
        return CodeExecutionResult(
            is_correct=False,
            error="One or more test cases failed.",
            details=error_details,
            passed=passed_tests,
            total=total_tests,
        )
        
    return CodeExecutionResult(is_correct=True, passed=passed_tests, total=total_tests)


async def _execute_code_against_public_tests(submission: schemas.CodeSubmission, problem: Dict[str, Any]) -> CodeExecutionResult:
    """Runs the user's code against only the PUBLIC test cases for the problem."""
    public_test_cases = [tc for tc in problem.get("test_cases", []) if tc.get("is_public")]
    
    if not public_test_cases:
        # If there are no public test cases, we can't run anything.
        # This isn't an error, but we should inform the user.
        return CodeExecutionResult(is_correct=False, error="No public test cases available to run.")

    # Create a temporary problem dict with only public tests
    temp_problem = problem.copy()
    temp_problem["test_cases"] = public_test_cases

    return await _execute_code_against_tests(submission, temp_problem)


async def _determine_winner(db: AsyncSession, duel: models.Duel) -> tuple[UUID | str | None, schemas.DuelResult]:
    results = duel.results or {}
    p1_solved_at_str = results.get("p1_solved_at")
    p1_solved_at = datetime.fromisoformat(p1_solved_at_str) if p1_solved_at_str else None
    
    # Extract actual values to avoid Column descriptor issues
    player_one_id = duel.player_one_id
    player_two_id = duel.player_two_id
    duel_started_at = duel.started_at
    
    opponent_id = player_two_id
    p2_solved_at_key = "p2_solved_at" if opponent_id is not None else "ai_solved_at"
    p2_solved_at_str = results.get(p2_solved_at_key)
    p2_solved_at = datetime.fromisoformat(p2_solved_at_str) if p2_solved_at_str else None

    # Log debug information
    logger.info(f"🔍 Winner determination for duel {duel.id}:")
    logger.info(f"   P1 ({player_one_id}) solved at: {p1_solved_at}")
    logger.info(f"   AI/P2 solved at: {p2_solved_at}")
    logger.info(f"   First solver from results: {results.get('first_solver')}")
    logger.info(f"   Full results: {results}")

    winner_id: UUID | str | None = None
    if p1_solved_at and p2_solved_at:
        winner_id = player_one_id if p1_solved_at < p2_solved_at else (opponent_id or "ai")
        logger.info(f"   Both solved: Winner is {winner_id} (P1 time: {p1_solved_at}, AI/P2 time: {p2_solved_at})")
    elif p1_solved_at:
        winner_id = player_one_id
        logger.info(f"   Only P1 solved: Winner is {winner_id}")
    elif p2_solved_at:
        winner_id = opponent_id or "ai"
        logger.info(f"   Only AI/P2 solved: Winner is {winner_id}")
    else:
        logger.info(f"   No one solved yet")

    start_time = duel_started_at
    is_p1_winner = winner_id == player_one_id
    is_p2_winner = winner_id == (opponent_id or "ai")

    logger.info(f"   Final determination: P1 winner={is_p1_winner}, AI/P2 winner={is_p2_winner}")

    p1_score, p1_time = scoring_service.calculate_score(start_time, p1_solved_at, results.get("p1_subs", 0), is_p1_winner) if p1_solved_at and start_time else (0, 0.0)
    p2_score, p2_time = scoring_service.calculate_score(start_time, p2_solved_at, results.get("p2_subs", 0), is_p2_winner) if p2_solved_at and start_time else (0, 0.0)
    
    player_one_result = schemas.PlayerResult(player_id=str(player_one_id), score=int(p1_score), time_taken_seconds=p1_time, submission_count=results.get("p1_subs", 0), is_winner=is_p1_winner)
    player_two_result = schemas.PlayerResult(player_id=str(opponent_id or "ai"), score=int(p2_score), time_taken_seconds=p2_time, submission_count=results.get("p2_subs", 0), is_winner=is_p2_winner)

    final_results = schemas.DuelResult(
        winner_id=str(winner_id) if winner_id else None,
        player_one_result=player_one_result,
        player_two_result=player_two_result,
        finished_at=datetime.now(timezone.utc),
        is_ai_duel=player_two_id is None
    )

    return winner_id, final_results

async def notify_user_service_of_duel_completion(result_data: schemas.DuelResult):
    """Notifies the user service that a duel has been completed."""
    user_service_url = "http://user-service:8000/api/v1/users/internal/duel-completed"
    
    p1_id = UUID(result_data.player_one_result.player_id)

    payload = {
        "player_one_result": {
            "player_id": str(p1_id),
            "is_winner": result_data.player_one_result.is_winner
        },
        "is_ai_duel": result_data.is_ai_duel
    }

    if not result_data.is_ai_duel and result_data.player_two_result.player_id != "ai":
        p2_id = UUID(result_data.player_two_result.player_id)
        payload["player_two_result"] = {
            "player_id": str(p2_id),
            "is_winner": result_data.player_two_result.is_winner
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(user_service_url, json=payload, timeout=5.0)
            response.raise_for_status()
            logger.info(f"Successfully notified user_service of duel completion.")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error notifying user_service: {e.response.status_code}")
        logger.error(f"Response body: {e.response.text}")
    except httpx.RequestError as e:
        logger.error(f"Failed to notify user_service about duel completion: {e}")


class DuelFlowService:
    async def handle_submission(
        self,
        db: AsyncSession,
        duel_id: UUID,
        submission: schemas.DuelSubmission,
    ) -> CodeExecutionResult:
        # Initial fetch to check status
        initial_duel = await service.get_duel(db, duel_id)
        if initial_duel is None:
            return CodeExecutionResult(is_correct=False, error="Duel not found.")
        if initial_duel.status != models.DuelStatus.IN_PROGRESS:
            return CodeExecutionResult(is_correct=False, error="Duel not in progress.")

        # Extract problem data before long async call
        problem_data_from_db: Dict[str, Any] = cast(Dict[str, Any], initial_duel.results).get("ai_problem_data", {}) if initial_duel.results else {}
        if not problem_data_from_db:
            return CodeExecutionResult(is_correct=False, error="Only AI-generated duels are supported.")

        problem_data_mutable = problem_data_from_db.copy()
        if "function_name" not in problem_data_mutable:
            slug = problem_data_mutable.get("slug", "")
            problem_data_mutable["function_name"] = slug.replace('-', '_')

        # This is the long-running async call
        execution_result = await _execute_code_against_tests(
            schemas.CodeSubmission(code=submission.code, language=submission.language),
            problem_data_mutable
        )
        
        # After the long await, the initial_duel object may be stale.
        # Refetch the duel to ensure the session is active.
        duel = await service.get_duel(db, duel_id)
        if not duel:
             return CodeExecutionResult(is_correct=False, error="Duel not found after code execution.")

        current_duel_results: Dict[str, Any] = cast(Dict[str, Any], duel.results) if duel.results is not None else {}
        is_player_one = duel.player_one_id == submission.player_id

        # Update submission stats
        player_subs_key = "p1_subs" if is_player_one else "p2_subs"
        current_duel_results[player_subs_key] = current_duel_results.get(player_subs_key, 0) + 1
        
        await service.update_duel_results(db, duel_id, current_duel_results)

        if not execution_result.is_correct:
            logger.warning(f"Submission by {submission.player_id} for duel {duel_id} is incorrect.")
            return execution_result
            
        # Record solve time and check for a winner
        player_solved_key = "p1_solved_at" if is_player_one else "p2_solved_at"
        if player_solved_key in current_duel_results:
            return execution_result 

        current_duel_results[player_solved_key] = datetime.now(timezone.utc).isoformat()
        
        other_player_solved_key = "p2_solved_at" if is_player_one else "p1_solved_at"
        if other_player_solved_key not in current_duel_results:
             current_duel_results['first_solver'] = 'p1' if is_player_one else 'p2'

        await service.update_duel_results(db, duel_id, current_duel_results)
        
        logger.info(f"All tests passed for user {submission.player_id}. Ending duel {duel_id}.")
        await self.end_duel_and_broadcast(db, duel_id)
        
        return execution_result


    async def end_duel_and_broadcast(self, db: AsyncSession, duel_id: UUID, is_timeout: bool = False, for_ai: bool = False):
        # Completely re-fetch the duel to avoid detached object issues
        duel = await service.get_duel(db, duel_id)
        if not duel or duel.status == models.DuelStatus.COMPLETED:
            logger.warning(f"Duel {duel_id} already ended or does not exist.")
            return

        # Extract all needed data immediately after fetch
        duel_player_one_id = duel.player_one_id
        duel_player_two_id = duel.player_two_id
        
        winner_id, final_results = await _determine_winner(db, duel)
        
        status = models.DuelStatus.TIMED_OUT if is_timeout else models.DuelStatus.COMPLETED
        await service.end_duel(db, duel_id, final_results, status=status)
        
        # Notify user_service instead of direct update
        await notify_user_service_of_duel_completion(final_results)

        # Always update ratings now, handling AI duels specifically
        if winner_id:
            if isinstance(winner_id, UUID): # Human won
                loser_id = duel_player_two_id if str(winner_id) == str(duel_player_one_id) else duel_player_one_id
                if final_results.is_ai_duel:
                    # Human vs AI: update human rating against AI's fixed rating
                    await service.update_ratings_after_duel(db, winner_id=winner_id, loser_id=AI_OPPONENT_ID)
                elif loser_id and isinstance(loser_id, UUID):
                    # Human vs Human
                    await service.update_ratings_after_duel(db, winner_id=winner_id, loser_id=loser_id)
            elif winner_id == 'ai': # AI won
                human_player_id = duel_player_one_id # In AI duels, player one is always human
                await service.update_ratings_after_duel(db, winner_id=AI_OPPONENT_ID, loser_id=human_player_id)

        end_message = schemas.DuelEndMessage(
            type="duel_end",
            data=final_results.model_dump(mode='json')
        )

        logger.info(f"Broadcasting duel_end event for duel {duel_id}.")
        await manager.broadcast_to_all(str(duel_id), json.dumps(end_message.model_dump(mode='json'), default=str))


duel_flow_service = DuelFlowService()

def get_duel_flow_service() -> DuelFlowService:
    """Dependency injector for the DuelFlowService."""
    return duel_flow_service 