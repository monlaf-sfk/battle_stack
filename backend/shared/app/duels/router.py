from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks, Query, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import json
import asyncio
import uuid
import logging
from sqlalchemy import func
from datetime import datetime, timezone
import random
from typing import Dict, Any, cast

from .websocket_manager import manager
from . import schemas, service, models
from .models import DuelStatus, Duel
from .flow_service import duel_flow_service, _execute_code_against_tests, _execute_code_against_public_tests, CodeExecutionResult
from shared.app.database import get_db, SessionLocal
from shared.app.auth.security import get_current_user_id
from shared.app.ai_opponent.core import generate_ai_coding_process, CodeTypingAction, PauseAction, DeleteAction, CodingStep
import shared.app.ai.generator as problem_generator
from . import flow_service
from shared.app.auth.security import get_current_user
from shared.app.auth.jwt_models import JWTUser
from shared.app.duels.flow_service import DuelFlowService, get_duel_flow_service

# All duels now use AI-generated problems only

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/test-debug")
async def test_debug():
    print("Debug test endpoint called!")
    return {"message": "Debug test successful"}



@router.get("/stats/me", response_model=schemas.DuelStats)
async def get_my_stats(
    # This would be a dependency getting the current user from a token
    # current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the duel stats for the current user.
    """
    # For now, this is a placeholder. In a real app, you'd get the
    # user ID from the token and call a service function.
    return {
        "total_duels": 0,
        "wins": 0,
        "losses": 0,
        "win_rate": 0.0,
        "average_rating": 1200
    }

# New helper function to recursively convert UUIDs to strings
def convert_uuids_to_str(obj):
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {k: convert_uuids_to_str(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_uuids_to_str(elem) for elem in obj]
    return obj

async def generate_problem_and_run_ai(duel_id: uuid.UUID, settings: schemas.AIDuelCreateRequest):
    """
    A background task to generate a problem for a duel and run the AI.
    """
    # Import SessionLocal dynamically and wait until it's initialized
    from shared.app.database import SessionLocal
    
    # Wait until the SessionLocal is initialized by the main application startup
    while SessionLocal is None:
        await asyncio.sleep(0.1)
    
    async with SessionLocal() as db:
        try:
            logger.info(f"🤖 Generating AI problem for duel {duel_id}...")
            
            MAX_RETRIES = 3
            generated_problem_obj = None
            for attempt in range(MAX_RETRIES):
                try:
                    problem_candidate = await problem_generator.generate_problem(
                        category=settings.category, topic=settings.theme, difficulty=settings.difficulty, language=settings.language
                    )
                    
                    # Validate the generated problem based on its type
                    logger.info(f"Validating generated problem ({settings.category}), attempt {attempt + 1}...")

                    if settings.category == "algorithms" and isinstance(problem_candidate, problem_generator.GeneratedProblem):
                        validation_submission = schemas.CodeSubmission(
                            code=problem_candidate.solution,
                            language=settings.language # Use selected language for algo
                        )
                        problem_dict = problem_candidate.model_dump()
                        execution_result = await _execute_code_against_tests(validation_submission, problem_dict)

                        if execution_result.is_correct:
                            logger.info("✅ Generated algorithm problem passed validation.")
                            generated_problem_obj = problem_candidate
                            break # Exit loop on success
                        else:
                            logger.warning(f"Algorithm validation failed: {execution_result.details}. Retrying...")
                    elif settings.category == "sql" and isinstance(problem_candidate, problem_generator.SQLGeneratedProblem):
                        # For SQL, basic validation might involve checking schema setup query can run,
                        # and solution query can run without errors against the setup.
                        # This is a simplified check for now.
                        # A more robust check would involve actually running tests.
                        if problem_candidate.schema_setup_sql and problem_candidate.correct_solution_sql:
                            logger.info("✅ Generated SQL problem passed basic validation (schema and solution present).")
                            generated_problem_obj = problem_candidate
                            break
                        else:
                            logger.warning("SQL problem validation failed: Missing schema setup or solution. Retrying...")
                    else:
                        logger.warning(f"Generated problem type mismatch or unsupported category: {settings.category}. Retrying...")
                except Exception as e:
                    logger.error(f"Error during problem generation/validation attempt {attempt + 1}: {e}")
            
            if not generated_problem_obj:
                raise Exception("Failed to generate a valid problem after multiple retries.")

            # Set time limit based on difficulty
            time_limits = {
                "easy": 600,    # 10 minutes
                "medium": 900,  # 15 minutes
                "hard": 1200    # 20 minutes
            }
            time_limit = time_limits.get(settings.difficulty.lower(), 900)
            
            # Problem generated, now update the duel
            db_duel_raw = await service.get_duel(db, duel_id)
            if not db_duel_raw:
                raise Exception(f"Duel {duel_id} not found after problem generation.")
            
            db_duel: models.Duel = cast(models.Duel, db_duel_raw) # Explicitly type db_duel

            # Assign values directly to the ORM object attributes
            db_duel.problem_id = generated_problem_obj.id if isinstance(generated_problem_obj, problem_generator.GeneratedProblem) else uuid.uuid4()
            db_duel.status = DuelStatus.IN_PROGRESS
            db_duel.started_at = datetime.now(timezone.utc)
            db_duel.time_limit_seconds = time_limit
            
            # Convert to dictionary and then ensure UUIDs are strings
            problem_data_for_db = convert_uuids_to_str(generated_problem_obj.model_dump())
            
            # Prepare the results dictionary for the service function
            current_results: Dict[str, Any] = cast(Dict[str, Any], db_duel.results) if db_duel.results is not None else {}
            current_results["ai_problem_data"] = problem_data_for_db
            current_results["duel_type"] = "ai_generated"
            current_results["problem_category"] = settings.category # Store category for later use
            
            await service.update_duel_results(db, db_duel, current_results) # Use service function to update JSONB

            await db.commit()
            await db.refresh(db_duel)

            # Broadcast the duel start to all participants in the room
            await manager.broadcast_to_all(str(duel_id), json.dumps({
                "type": "duel_start",
                "data": schemas.Duel.model_validate(db_duel).model_dump(mode='json')
            }))

            # Generate the AI's coding process only for algorithm problems
            if isinstance(generated_problem_obj, problem_generator.GeneratedProblem):
                template_for_lang = next((t.template_code for t in generated_problem_obj.code_templates if t.language == settings.language), '')
                ai_coding_steps = await generate_ai_coding_process(
                    solution=generated_problem_obj.solution,
                    template=template_for_lang,
                    language=settings.language
                )
                
                # Now start the AI opponent task, passing the pre-generated steps
                logger.info(f"Starting AI opponent for duel {db_duel.id}")
                await run_ai_opponent(
                    str(db_duel.id), 
                    generated_problem_obj.solution,
                    template_for_lang,
                    [step.model_dump(mode='json') for step in ai_coding_steps] # Pass steps as dicts
                )
            elif isinstance(generated_problem_obj, problem_generator.SQLGeneratedProblem):
                logger.info(f"AI opponent not implemented for SQL problems in duel {db_duel.id}")

        except Exception as e:
            logger.error(f"Error in AI duel setup for duel {duel_id}: {e}", exc_info=True)
            db_duel_raw = await service.get_duel(db, duel_id)
            if db_duel_raw:
                db_duel: models.Duel = cast(models.Duel, db_duel_raw) # Explicitly type db_duel
                db_duel.status = models.DuelStatus.FAILED_GENERATION
                await db.commit()
            
            await manager.send_to_user_in_duel(str(duel_id), str(settings.user_id), json.dumps({
                "type": "duel_creation_failed",
                "data": {"error": "Could not generate an AI problem. Please try again."},
            }))

@router.post("/ai-duel-custom", response_model=schemas.Duel, status_code=201)
async def create_custom_ai_duel(
    settings: schemas.AIDuelCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """
    Synchronously creates a duel with a 'generating_problem' status,
    returns it, and starts the AI problem generation in the background.
    """
    # Validate that the user is creating a duel for themselves
    if str(current_user.id) != str(settings.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create a duel for yourself.",
        )
        
    temp_problem_id = uuid.uuid4()

    duel_data = schemas.DuelCreate(
        problem_id=temp_problem_id,
        player_one_id=settings.user_id,
        status=models.DuelStatus.GENERATING_PROBLEM,
    )
    db_duel_raw = await service.create_duel(db, duel=duel_data)
    
    db_duel: models.Duel = cast(models.Duel, db_duel_raw) # Explicitly type db_duel

    await db.commit()
    await db.refresh(db_duel)

    background_tasks.add_task(generate_problem_and_run_ai, cast(uuid.UUID, db_duel.id), settings) # Cast db_duel.id to uuid.UUID

    return db_duel

# Removed generic create_duel endpoint - use AI duel generation instead via /ai-duel-custom

@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    user_id: uuid.UUID = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the top players for the leaderboard, or rank for a specific user if user_id is provided.
    """
    if user_id:
        # Получить рейтинг пользователя
        leaderboard = await service.get_leaderboard(db, limit=10000)  # Получить всех для поиска ранга
        leaderboard_sorted = sorted(leaderboard, key=lambda x: -x.elo_rating)
        user_entry = next((entry for entry in leaderboard_sorted if str(entry.user_id) == str(user_id)), None)
        if not user_entry:
            raise HTTPException(status_code=404, detail="User not found in leaderboard")
        # Найти ранг (индекс + 1)
        user_rank = leaderboard_sorted.index(user_entry) + 1
        user_entry.rank = user_rank
        return [user_entry]
    else:
        return await service.get_leaderboard(db, limit=limit)

@router.get("/matches/recent", response_model=list[schemas.MatchHistoryItem])
async def get_public_recent_matches(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the most recent public matches.
    """
    return await service.get_recent_matches(db, limit=limit)

@router.get("/{duel_id}", response_model=schemas.Duel)
async def get_duel(
    duel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the details of a specific duel.
    """
    db_duel = await service.get_duel(db, duel_id=duel_id)
    if db_duel is None:
        raise HTTPException(status_code=404, detail="Duel not found")
    return db_duel

# Removed join_matchmaking endpoint - use AI duel generation instead

@router.websocket("/ws/{duel_id}")
async def websocket_endpoint(websocket: WebSocket, duel_id: str, user_id: str = Query(...)):
    await manager.connect(duel_id, user_id, websocket)
    try:
        # The connection is kept alive to receive broadcasts (e.g., from the AI opponent).
        # We don't need to process incoming messages in a simple AI duel scenario.
        while True:
            await websocket.receive_text() # Just keep the connection open.
    except WebSocketDisconnect:
        manager.disconnect(duel_id, user_id, websocket)
        logger.info(f"User {user_id} disconnected from duel {duel_id}")
    except Exception as e:
        logger.error(f"Error in websocket for duel {duel_id}, user {user_id}: {e}")
        manager.disconnect(duel_id, user_id, websocket)

async def run_ai_opponent(duel_id: str, solution: str, template: str, steps: list[Any] | None = None):
    """A background task that simulates an AI opponent typing out a solution."""
    try:
        # Import SessionLocal dynamically and wait until it's initialized
        from shared.app.database import SessionLocal
        
        # Wait until the SessionLocal is initialized by the main application startup
        while SessionLocal is None:
            await asyncio.sleep(0.1)
        
        # Check duel status right at the start with a fresh session
        async with SessionLocal() as db_session_start:
            duel_raw = await service.get_duel(db_session_start, uuid.UUID(duel_id))
            if not duel_raw:
                logger.info(f"[AI Opponent] Duel {duel_id}: Duel not found. AI will not proceed.")
                return
            initial_duel: models.Duel = cast(models.Duel, duel_raw)
            if initial_duel.status is not models.DuelStatus.IN_PROGRESS: # Use 'is not' for enum comparison
                logger.info(f"[AI Opponent] Duel {duel_id}: Already ended or not in progress (status: {initial_duel.status}). AI will not proceed.")
                return

        # Initialize ai_process
        ai_process = []
        if steps:
            logger.info(f"[AI Opponent] Duel {duel_id}: Using pre-generated steps.")
            ai_process = [CodingStep.model_validate(step) for step in steps]
        else:
            logger.info(f"[AI Opponent] Duel {duel_id}: Generating new steps.")
            ai_process = await generate_ai_coding_process(solution=solution, template=template, language="python")

        if not ai_process:
            logger.warning(f"[AI Opponent] Duel {duel_id}: No AI coding steps were generated. Aborting.")
            return

        logger.info(f"[AI Opponent] Duel {duel_id}: Generated process with {len(ai_process)} steps.")
        
        # Send a start signal which can be used by the frontend to clear the AI's editor
        await manager.broadcast_to_all(duel_id, json.dumps({"type": "ai_start"}))
        
        await asyncio.sleep(3) # Initial delay to simulate thinking

        for step_model in ai_process:
            # Re-check duel status before each significant step (typing/pause)
            async with SessionLocal() as db_session_step:
                duel_raw_step = await service.get_duel(db_session_step, uuid.UUID(duel_id))
                if not duel_raw_step:
                    logger.info(f"[AI Opponent] Duel {duel_id}: Duel not found during AI typing. Aborting AI process.")
                    return
                duel_in_loop: models.Duel = cast(models.Duel, duel_raw_step)
                if duel_in_loop.status is not models.DuelStatus.IN_PROGRESS: # Use 'is not' for enum comparison
                    logger.info(f"[AI Opponent] Duel {duel_id}: Duel ended during AI typing. Aborting AI process.")
                    return

                step = step_model.root

                if isinstance(step, CodeTypingAction):
                    # Typing delay based on speed and content length
                    delay = max(0.05, len(step.content) * 0.15 / step.speed)
                    await asyncio.sleep(delay)

                    payload = {"type": "ai_progress", "data": {"code_chunk": step.content}}
                    logger.info(f"[AI Opponent] Duel {duel_id}: Broadcasting chunk: {step.content[:40]}...")
                    await manager.broadcast_to_all(duel_id, json.dumps(payload))

                elif isinstance(step, PauseAction):
                    await asyncio.sleep(step.duration)
                    logger.info(f"[AI Opponent] Duel {duel_id}: Paused for {step.duration}s.")

                elif isinstance(step, DeleteAction):
                    # Send a special message for deletion; frontend can implement this later
                    await asyncio.sleep(0.5) # Short delay for effect
                    payload = {"type": "ai_delete", "data": {"char_count": step.char_count}}
                    logger.info(f"[AI Opponent] Duel {duel_id}: Deleting {step.char_count} characters.")
                    await manager.broadcast_to_all(duel_id, json.dumps(payload))

        logger.info(f"[AI Opponent] Duel {duel_id}: Finished typing.")

        # AI has finished, now it "submits" its correct solution to end the duel
        await asyncio.sleep(random.uniform(1.0, 3.0)) # Simulate a final check before submitting
        logger.info(f"[AI Opponent] Duel {duel_id}: Submitting solution.")

        # Crucial final check before AI attempts to submit
        async with SessionLocal() as db_session_final:
            final_duel_raw = await service.get_duel(db_session_final, uuid.UUID(duel_id))
            if not final_duel_raw:
                logger.info(f"[AI Opponent] Duel {duel_id}: Duel not found for final submission. AI will not submit.")
                return
            final_duel: models.Duel = cast(models.Duel, final_duel_raw)
            if final_duel.status is not models.DuelStatus.IN_PROGRESS: # Use 'is not' for enum comparison
                logger.info(f"[AI Opponent] Duel {duel_id}: Duel already completed before AI submission. AI will not submit.")
                return

            # Check if player one has already solved it (secondary check, duel.status is primary)
            current_results_for_update: Dict[str, Any] = cast(Dict[str, Any], final_duel.results) if final_duel.results is not None else {} # New variable name to avoid confusion
            if current_results_for_update.get("p1_solved_at"):
                logger.info(f"[AI Opponent] Duel {duel_id}: Player 1 already solved. AI will not submit.")
                return

            # Record AI's solve time.
            current_results_for_update["ai_solved_at"] = datetime.now(timezone.utc).isoformat()
            current_results_for_update["first_solver"] = "ai"

            await service.update_duel_results(db_session_final, final_duel, current_results_for_update)
            
            # End the duel and broadcast the results
            await duel_flow_service.end_duel_and_broadcast(db_session_final, cast(uuid.UUID, final_duel.id), for_ai=True) # Cast duel.id to uuid.UUID

    except Exception as e:
        logger.error(f"[AI Opponent] Duel {duel_id}: An error occurred: {e}", exc_info=True)

@router.get("/user/{user_id}/active-or-waiting", response_model=schemas.Duel, description="Get the active or waiting duel for a user.")
async def get_active_or_waiting_duel_for_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    duel = await service.get_active_or_waiting_duel(db, user_id=user_id)
    if not duel:
        raise HTTPException(status_code=404, detail="No active or waiting duel found for this user.")
    return duel

@router.post("/{duel_id}/test", status_code=202)
async def test_solution(
    duel_id: uuid.UUID,
    submission: schemas.CodeSubmission,
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """
    Handles code testing against public test cases for a duel.
    Runs the tests in a background task.
    """
    # Explicitly pass the necessary data to the background task
    background_tasks.add_task(run_tests_and_notify, duel_id, user_id, submission.code, submission.language)
    return {"message": "Test execution started"}

async def run_tests_and_notify(duel_id: uuid.UUID, user_id: uuid.UUID, code: str, language: str):
    """
    Asynchronously runs the user's code against PUBLIC test cases and notifies them of the result.
    """
    logger.info(f"Starting public test execution for duel {duel_id} by user {user_id}")
    
    # Import SessionLocal dynamically and wait until it's initialized
    from shared.app.database import SessionLocal
    
    # Wait until the SessionLocal is initialized by the main application startup
    while SessionLocal is None:
        await asyncio.sleep(0.1)
    
    async with SessionLocal() as db:
        try:
            # Prepare a submission object for testing
            submission_obj = schemas.CodeSubmission(code=code, language=language)

            # Fetch problem data for public tests only (must be AI generated)
            duel_raw = await service.get_duel(db, duel_id)
            problem_data: Dict[str, Any] | None = None # Explicitly type problem_data as Dict[str, Any]
            problem_category = None

            if duel_raw and duel_raw.results is not None: # Check duel.results is not None
                current_duel_state: models.Duel = cast(models.Duel, duel_raw)
                current_duel_results: Dict[str, Any] = cast(Dict[str, Any], current_duel_state.results) # Assign to a new typed variable and cast
                problem_data = current_duel_results.get("ai_problem_data")
                problem_category = current_duel_results.get("problem_category", "algorithms") # Default to algorithms
            
            if problem_data is None: # If problem_data is None after checks
                if not duel_raw:
                    logger.error(f"Could not find duel {duel_id} for test run.")
                    return 
                logger.error(f"No AI problem data found for duel {duel_id}")
                error_payload = {
                    "type": "test_result",
                    "user_id": str(user_id),
                    "data": {
                        "is_correct": False,
                        "error": "Only AI-generated duels are supported",
                        "details": [],
                        "passed": 0,
                        "failed": 0
                    },
                }
                await manager.send_to_user_in_duel(str(duel_id), str(user_id), json.dumps(error_payload))
                return

            # Handle different problem types for execution
            execution_result = None
            if problem_category == "algorithms":
                # Ensure function_name exists for python helper calls
                # problem_data is guaranteed not to be None here due to the check above
                if "function_name" not in problem_data: 
                    slug = problem_data.get("slug", "")
                    problem_data["function_name"] = slug.replace('-', '_')

                execution_result = await flow_service._execute_code_against_public_tests(submission_obj, problem_data)
            elif problem_category == "sql":
                # For SQL problems, the _execute_code_against_public_tests would need to be adapted
                # or a new function for SQL execution would be needed.
                # For now, return a placeholder error.
                execution_result = CodeExecutionResult(
                    is_correct=False,
                    error="SQL problem execution not yet fully implemented for tests.",
                    details=[]
                )
            else:
                execution_result = CodeExecutionResult(
                    is_correct=False,
                    error=f"Unsupported problem category: {problem_category}",
                    details=[]
                )
            
            if not execution_result.error and not problem_data.get("test_cases"):
                 execution_result.error = "No public test cases available to run."

            result_payload = {
                "type": "test_result",
                "user_id": str(user_id),
                "data": {
                    "is_correct": execution_result.is_correct,
                    "error": execution_result.error,
                    "details": execution_result.details,
                    "passed": execution_result.passed,
                    "failed": execution_result.total - execution_result.passed,
                    "total": execution_result.total
                },
            }
            
            logger.info(f"Test completed for duel {duel_id} by user {user_id}. Result: {execution_result.is_correct}, Passed: {execution_result.passed}, Failed: {execution_result.total - execution_result.passed}")
            await manager.send_to_user_in_duel(str(duel_id), str(user_id), json.dumps(result_payload))
        
        except Exception as e:
            logger.error(f"Error in run_tests_and_notify for duel {duel_id}: {e}", exc_info=True)
            error_payload = {
                "type": "test_result",
                "user_id": str(user_id),
                "data": {
                    "is_correct": False,
                    "error": f"Test execution failed: {str(e)}",
                    "details": [],
                    "passed": 0,
                    "failed": 0
                },
            }
            await manager.send_to_user_in_duel(str(duel_id), str(user_id), json.dumps(error_payload))

@router.post("/{duel_id}/submit", response_model=flow_service.CodeExecutionResult, status_code=200)
async def submit_solution(
    duel_id: uuid.UUID,
    submission: schemas.DuelSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
    flow_service: DuelFlowService = Depends(get_duel_flow_service)
):
    """
    Submits a solution for a duel, runs it against test cases,
    and returns immediate feedback.
    """
    if uuid.UUID(current_user.id) != submission.player_id:
        raise HTTPException(status_code=403, detail="Player ID does not match authenticated user.")

    result = await flow_service.handle_submission(
        db=db,
        duel_id=duel_id,
        submission=submission
    )

    # Always return a 200. The frontend will determine the outcome based on is_correct.
    # The result object now contains all necessary details.
    return result

# Removed find_or_create_duel_endpoint - use AI duel generation instead 

@router.post("/ai", response_model=schemas.Duel)
async def create_ai_duel_endpoint(
    request: schemas.AIDuelCreateRequest,
    user: JWTUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.id != str(request.user_id):
        raise HTTPException(status_code=403, detail="User ID does not match authenticated user.")
    
    duel_response = await service.create_ai_duel(db, request.user_id, request.theme, request.difficulty, request.language, request.category)
    return duel_response
