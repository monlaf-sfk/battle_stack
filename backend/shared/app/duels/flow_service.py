import json
import asyncio
import logging
from uuid import UUID
from datetime import datetime, timezone
import ast

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from pydantic import BaseModel

from . import schemas, service, models
from .scoring import scoring_service
from .websocket_manager import manager
from shared.app.code_runner import execute_code, SubmissionParams, SubmissionResult
from shared.app.duels.problem_provider import get_problem_from_service, generate_ai_problem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Map language names to Judge0 language IDs
LANGUAGE_MAP = {
    "python": 71,
    "javascript": 63,
    "java": 62,
    "cpp": 54,
}

class CodeExecutionResult(BaseModel):
    is_correct: bool
    error: str | None = None
    details: list | None = None
    passed: int = 0
    total: int = 0

async def _execute_code_against_tests(submission: schemas.CodeSubmission, problem: dict) -> CodeExecutionResult:
    """Runs the user's code against all test cases for the problem using Judge0."""
    language_id = LANGUAGE_MAP.get(submission.language)
    if not language_id:
        return CodeExecutionResult(is_correct=False, error="Unsupported language.")

    if not problem or not problem.get("test_cases"):
        return CodeExecutionResult(is_correct=False, error="Problem has no test cases.")

    total_tests = len(problem["test_cases"])
    passed_tests = 0
    error_details = []
    
    source_to_run = submission.code
    # Always wrap python code to handle I/O, making it easier for the user.
    if submission.language == "python":
        function_name = problem.get("function_name")
        if not function_name:
            # Fallback if function_name is not in problem data
            import re
            match = re.search(r"def\s+(\w+)\s*\(", submission.code)
            if match:
                function_name = match.group(1)
            else:
                return CodeExecutionResult(is_correct=False, error="Could not determine function name to test.")

        # Safer I/O wrapper using ast.literal_eval
        wrapper = f"""
import sys
import ast

# User's solution is above this line
try:
    input_str = sys.stdin.read().strip()
    if input_str:
        # Safely parse the input string into a Python object (e.g., list, dict, int)
        parsed_input = ast.literal_eval(input_str)
        
        # Check if the parsed input is a tuple, which we'll use to pass multiple arguments
        if isinstance(parsed_input, tuple):
            result = {function_name}(*parsed_input)
        else:
            # Otherwise, pass it as a single argument
            result = {function_name}(parsed_input)
            
        # The AI's generated solution must print the result to be captured.
        # For validation, we assume it does.
        if result is not None:
            print(result)

except Exception as e:
    # This helps debug issues with the wrapper or the user's code during execution
    print(f"Execution Error: {{e}}", file=sys.stderr)
"""
        source_to_run += wrapper

    for i, test_case in enumerate(problem["test_cases"]):
        stdin_to_run = test_case.get("input_data")
        
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
                break

            # Case 2: Runtime Error, TLE, or other execution issues
            if status_desc not in ["Accepted", "Wrong Answer"]:
                error_details.append(
                    f"Test case {i+1} failed: {status_desc}. "
                    f"Details: {result_data.stderr or 'No error message captured.'}"
                )
                # For critical errors, we might stop, but for now we continue to see other test cases
                continue

            # Case 3: No output produced
            if result_data.stdout is None or result_data.stdout.strip() == "":
                error_details.append(
                    f"Test case {i+1} failed: Wrong Answer. "
                    f"Expected: '{test_case.get('expected_output')}', Got: No output. "
                    f"Ensure your function returns a value and uses 'print()'."
                )
                continue

            # Case 4: Output produced, compare with expected
            actual_output = (result_data.stdout or "").strip()
            expected_output = str(test_case.get("expected_output") or "").strip()

            if actual_output != expected_output:
                error_details.append(
                    f"Test case {i+1} failed: Wrong Answer. "
                    f"Expected: '{expected_output}', Got: '{actual_output}'"
                )
            else:
                passed_tests += 1
                logger.info(f"Test case {i+1} passed. Expected: '{expected_output}', Got: '{actual_output}'")

        except Exception as e:
            logger.error(f"Error executing test case {i+1}: {e}")
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


async def _execute_code_against_public_tests(submission: schemas.CodeSubmission, problem: dict) -> CodeExecutionResult:
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


class DuelFlowService:
    async def handle_submission(
        self,
        db: AsyncSession,
        duel_id: UUID,
        submission: schemas.DuelSubmission,
    ) -> CodeExecutionResult:
        duel = await service.get_duel(db, duel_id)
        user_id = submission.player_id

        if not duel or duel.status != models.DuelStatus.IN_PROGRESS:
            return CodeExecutionResult(is_correct=False, error="Duel not found or not in progress.")

        # 1. Get problem data
        problem_data = None
        if duel.results and duel.results.get("ai_problem_data"):
            problem_data = duel.results["ai_problem_data"]
        else:
            try:
                problem_data = await get_problem_from_service(duel.problem_id)
            except HTTPException:
                 return CodeExecutionResult(is_correct=False, error="Could not fetch problem details.")
        
        if not problem_data:
            return CodeExecutionResult(is_correct=False, error="Problem data is missing.")

        # HACK: Manually add function_name for testing since we can't modify problems-service
        if "function_name" not in problem_data:
            slug = problem_data.get("slug", "")
            problem_data["function_name"] = slug.replace('-', '_')

        # 2. Execute code against test cases
        code_submission = schemas.CodeSubmission(code=submission.code, language=submission.language)
        execution_result = await _execute_code_against_tests(code_submission, problem_data)
        logger.info(f"Execution result for user {user_id} in duel {duel_id}: is_correct={execution_result.is_correct}, error='{execution_result.error}', details='{execution_result.details}'")

        # 2. Update submission count and test results
        is_player_one = duel.player_one_id == user_id
        
        results_data = duel.results or {}
        player_subs_key = "p1_subs" if is_player_one else "p2_subs"
        player_passed_key = "p1_passed_tests" if is_player_one else "p2_passed_tests"
        player_total_key = "p1_total_tests" if is_player_one else "p2_total_tests"

        results_data[player_subs_key] = results_data.get(player_subs_key, 0) + 1
        results_data[player_passed_key] = execution_result.passed
        results_data[player_total_key] = execution_result.total
        
        await service.update_duel_results(db, duel, results_data)

        if not execution_result.is_correct:
            # We still return the result to potentially show failure reasons on the UI
            logger.warning(f"Submission by {user_id} for duel {duel_id} is incorrect. Not ending duel.")
            return execution_result
            
        # 3. Code is correct, record solve time and end the duel.
        player_solved_key = "p1_solved_at" if is_player_one else "p2_solved_at"
        # Avoid overwriting if already solved
        if player_solved_key in results_data:
            logger.info(f"Player {user_id} has already solved duel {duel_id}. Not ending again.")
            return execution_result

        logger.info(f"Correct submission by {user_id} for duel {duel_id}. Recording solve time.")
        finish_time = datetime.now(timezone.utc)
        results_data[player_solved_key] = finish_time.isoformat()

        other_player_solved_key = "p2_solved_at" if is_player_one else "p1_solved_at"
        was_first_to_solve = other_player_solved_key not in results_data

        if was_first_to_solve:
            results_data['first_solver'] = 'p1' if is_player_one else 'p2'

        await service.update_duel_results(db, duel, results_data)

        # 4. End the duel and broadcast results
        logger.info(f"All tests passed for user {user_id}. Ending duel {duel_id}.")
        await self.end_duel_and_broadcast(db, duel.id)
        return execution_result


    async def end_duel_and_broadcast(self, db: AsyncSession, duel_id: UUID, is_timeout: bool = False, for_ai: bool = False):
        duel = await service.get_duel(db, duel_id)
        if not duel or duel.status == models.DuelStatus.COMPLETED:
            logger.warning(f"Duel {duel_id} already ended or does not exist.")
            return

        # Determine winner
        winner_id, final_results = await self._determine_winner(db, duel)
        
        # Call the service to formally end the duel and save results
        status = models.DuelStatus.TIMED_OUT if is_timeout else models.DuelStatus.COMPLETED
        await service.end_duel(db, duel_id, final_results, status=status)
        
        # Update ELO ratings
        if winner_id and not for_ai:
            if str(winner_id) == str(duel.player_one_id):
                loser_id = duel.player_two_id
            else:
                loser_id = duel.player_one_id
            
            if loser_id: # Ensure there is a loser to update
                await service.update_ratings_after_duel(db, winner_id=winner_id, loser_id=loser_id)

        # Broadcast duel end state to all participants
        end_message = schemas.DuelEndMessage(
            type="duel_end",
            data=final_results.model_dump(mode='json')
        )

        logger.info(f"Broadcasting duel_end event for duel {duel_id}.")
        await manager.broadcast_to_all(str(duel_id), json.dumps(end_message.model_dump(mode='json'), default=str))

    async def _determine_winner(self, db: AsyncSession, duel: models.Duel) -> tuple[UUID | str | None, schemas.DuelResult]:
        player_one_solved_at_str = duel.results.get("p1_solved_at")
        player_two_solved_at_str = duel.results.get("p2_solved_at")

        player_one_solved_at = datetime.fromisoformat(player_one_solved_at_str) if player_one_solved_at_str else None
        player_two_solved_at = datetime.fromisoformat(player_two_solved_at_str) if player_two_solved_at_str else None

        duel_start_time = duel.started_at

        player_one_score = 0
        player_two_score = 0
        player_one_time_taken = 0.0
        player_two_time_taken = 0.0
        
        is_player_one_winner = False
        is_player_two_winner = False
        winner_id = None

        if player_one_solved_at and duel_start_time:
            was_first_to_solve_p1 = duel.results.get('first_solver') == 'p1'
            player_one_score, player_one_time_taken = scoring_service.calculate_score(
                duel_start_time, player_one_solved_at, duel.results.get('p1_subs', 0), was_first_to_solve_p1
            )

        if player_two_solved_at and duel_start_time:
            was_first_to_solve_p2 = duel.results.get('first_solver') == 'p2'
            player_two_score, player_two_time_taken = scoring_service.calculate_score(
                duel_start_time, player_two_solved_at, duel.results.get('p2_subs', 0), was_first_to_solve_p2
            )

        # Determine winner based on scores or first to solve
        if player_one_solved_at and player_two_solved_at:
            if player_one_score > player_two_score:
                is_player_one_winner = True
                winner_id = duel.player_one_id
            elif player_two_score > player_one_score:
                is_player_two_winner = True
                winner_id = duel.player_two_id
            else: # Tie-breaker: whoever submitted first wins
                if player_one_time_taken < player_two_time_taken:
                    is_player_one_winner = True
                    winner_id = duel.player_one_id
                elif player_two_time_taken < player_one_time_taken:
                    is_player_two_winner = True
                    winner_id = duel.player_two_id
        elif player_one_solved_at:
            is_player_one_winner = True
            winner_id = duel.player_one_id
        elif player_two_solved_at:
            is_player_two_winner = True
            winner_id = duel.player_two_id
        else:
            # If neither player solved, determine winner by most passed tests
            p1_passed = duel.results.get("p1_passed_tests", 0)
            p2_passed = duel.results.get("p2_passed_tests", 0)

            if p1_passed > p2_passed:
                is_player_one_winner = True
                winner_id = duel.player_one_id
            elif p2_passed > p1_passed:
                is_player_two_winner = True
                winner_id = duel.player_two_id
            # If still tied (same tests passed, or 0 tests passed), it's a draw/no winner

        player_one_result = schemas.PlayerResult(
            player_id=str(duel.player_one_id),
            score=player_one_score,
            time_taken_seconds=player_one_time_taken,
            submission_count=duel.results.get('p1_subs', 0),
            is_winner=is_player_one_winner
        )

        player_two_result = None
        if duel.player_two_id:
            player_two_result = schemas.PlayerResult(
                player_id=str(duel.player_two_id),
                score=player_two_score,
                time_taken_seconds=player_two_time_taken,
                submission_count=duel.results.get('p2_subs', 0),
                is_winner=is_player_two_winner
            )
        else: # Always create a PlayerResult for AI if player_two_id is None
            ai_solve_time = duel.results.get("ai_solved_at")
            ai_time_taken = 0.0
            ai_submission_count = duel.results.get('ai_subs', 0)
            ai_score = duel.results.get('ai_passed_tests', 0)

            if ai_solve_time and duel_start_time:
                ai_solve_datetime = datetime.fromisoformat(ai_solve_time)
                was_first_to_solve_ai = duel.results.get('first_solver') == 'ai'
                ai_score, ai_time_taken = scoring_service.calculate_score(
                    duel_start_time, ai_solve_datetime, ai_submission_count, was_first_to_solve_ai
                )
            
            # Ensure is_player_two_winner is correctly determined for AI
            is_ai_winner = False
            if winner_id and str(winner_id) == "ai": # Check if the determined winner is 'ai'
                is_ai_winner = True

            player_two_result = schemas.PlayerResult(
                player_id="ai", # AI's ID should always be a string literal
                score=ai_score,
                time_taken_seconds=ai_time_taken,
                submission_count=ai_submission_count,
                is_winner=is_ai_winner
            )

        final_results = schemas.DuelResult(
            winner_id=winner_id,
            player_one_result=player_one_result,
            player_two_result=player_two_result,
            finished_at=datetime.now(timezone.utc),
            is_ai_duel=duel.player_two_id is None
        )
        return winner_id, final_results


duel_flow_service = DuelFlowService()

def get_duel_flow_service() -> DuelFlowService:
    """Dependency injector for the DuelFlowService."""
    return duel_flow_service 