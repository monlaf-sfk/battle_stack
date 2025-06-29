from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import httpx
import json
import asyncio
import uuid
import logging
from sqlalchemy import func
from datetime import datetime, timezone
import random

from .websocket_manager import manager
from . import schemas, service, models
from .models import DuelStatus
from .flow_service import duel_flow_service, _execute_code_against_tests, _execute_code_against_public_tests, CodeExecutionResult
from shared.app.database import get_db, SessionLocal
from shared.app.auth.security import get_current_user_id
from shared.app.ai_opponent.core import generate_ai_coding_process, CodeTypingAction, PauseAction, DeleteAction
from .problem_provider import get_problem_from_service, generate_ai_problem
from shared.app.ai.generator import generate_algorithm_problem, GeneratedProblem
from . import flow_service
from shared.app.auth.security import get_current_user
from shared.app.auth.jwt_models import JWTUser
from shared.app.duels.flow_service import DuelFlowService, get_duel_flow_service

# Define the base URL for the problems service (legacy - for existing problems)
PROBLEMS_SERVICE_URL = "http://problems-service:8000/api/v1/problems"

logger = logging.getLogger(__name__)

async def get_problem_from_service(problem_id: UUID) -> dict:
    """Fetches a specific problem from the problems_service (legacy)."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{PROBLEMS_SERVICE_URL}/{problem_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Error fetching problem from service: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Problems service is unavailable: {e}")


async def generate_ai_problem(theme: str, difficulty: str, language: str) -> GeneratedProblem:
    """Generates a new problem using AI instead of fetching from database."""
    try:
        return await generate_algorithm_problem(theme, difficulty, language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI problem: {str(e)}")


router = APIRouter(prefix="/duels")

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

async def generate_problem_and_run_ai(duel_id: UUID, settings: schemas.AIDuelCreateRequest):
    """
    A background task to generate a problem for a duel and run the AI.
    """
    db = SessionLocal()
    try:
        logger.info(f"🤖 Generating AI problem for duel {duel_id}...")
        
        MAX_RETRIES = 3
        generated_problem = None
        for attempt in range(MAX_RETRIES):
            try:
                problem_to_validate: GeneratedProblem = await generate_ai_problem(
                    theme=settings.theme, difficulty=settings.difficulty, language=settings.language
                )
                
                # Validate the generated problem
                logger.info(f"Validating generated problem, attempt {attempt + 1}...")
                validation_submission = schemas.CodeSubmission(
                    code=problem_to_validate.solution,
                    language="python" # Assuming solution is always python for now
                )
                
                # Use a simplified version of problem_to_validate for execution
                problem_dict = problem_to_validate.model_dump()
                
                execution_result = await _execute_code_against_tests(validation_submission, problem_dict)

                if execution_result.is_correct:
                    logger.info("✅ Generated problem passed validation.")
                    generated_problem = problem_to_validate
                    break # Exit loop on success
                else:
                    logger.warning(f"Validation failed: {execution_result.details}. Retrying...")
            except Exception as e:
                logger.error(f"Error during problem generation/validation attempt {attempt + 1}: {e}")
        
        if not generated_problem:
            raise Exception("Failed to generate a valid problem after multiple retries.")

        # Set time limit based on difficulty
        time_limits = {
            "easy": 600,    # 10 minutes
            "medium": 900,  # 15 minutes
            "hard": 1200    # 20 minutes
        }
        time_limit = time_limits.get(generated_problem.difficulty.lower(), 900)
        
        # Problem generated, now update the duel
        db_duel = await service.get_duel(db, duel_id)
        if not db_duel:
            raise Exception(f"Duel {duel_id} not found after problem generation.")

        db_duel.problem_id = UUID(generated_problem.id)
        db_duel.status = DuelStatus.IN_PROGRESS
        db_duel.started_at = datetime.now(timezone.utc)
        db_duel.time_limit_seconds = time_limit
        db_duel.results = {
            "ai_problem_data": generated_problem.model_dump(),
            "duel_type": "ai_generated",
        }
        await db.commit()
        await db.refresh(db_duel)

        # Broadcast the duel start to all participants in the room
        await manager.broadcast_to_all(str(duel_id), json.dumps({
            "type": "duel_start",
            "data": schemas.Duel.model_validate(db_duel).model_dump(mode='json')
        }))

        # Generate the AI's coding process
        template_for_lang = next((t.template_code for t in generated_problem.code_templates if t.language == settings.language), '')
        ai_coding_steps = await generate_ai_coding_process(
            solution=generated_problem.solution,
            template=template_for_lang,
            language=settings.language
        )
        
        # Now start the AI opponent task, passing the pre-generated steps
        logger.info(f"Starting AI opponent for duel {db_duel.id}")
        await run_ai_opponent(
            str(db_duel.id), 
            generated_problem.solution,
            template_for_lang,
            [step.model_dump(mode='json') for step in ai_coding_steps] # Pass steps as dicts
        )

    except Exception as e:
        logger.error(f"Error in AI duel setup for duel {duel_id}: {e}", exc_info=True)
        db_duel = await service.get_duel(db, duel_id)
        if db_duel:
            db_duel.status = models.DuelStatus.FAILED_GENERATION
            await db.commit()
        
        await manager.send_to_user_in_duel(str(duel_id), str(settings.user_id), json.dumps({
            "type": "duel_creation_failed",
            "data": {"error": "Could not generate an AI problem. Please try again."},
        }))
    finally:
        await db.close()

@router.post("/ai-duel-custom", response_model=schemas.Duel, status_code=201)
async def create_custom_ai_duel(
    settings: schemas.AIDuelCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Synchronously creates a duel with a 'generating_problem' status,
    returns it, and starts the AI problem generation in the background.
    """
    temp_problem_id = uuid.uuid4()

    duel_data = schemas.DuelCreate(
        problem_id=temp_problem_id,
        player_one_id=settings.user_id,
        status=models.DuelStatus.GENERATING_PROBLEM,
    )
    db_duel = await service.create_duel(db, duel=duel_data)
    
    await db.commit()
    await db.refresh(db_duel)

    background_tasks.add_task(generate_problem_and_run_ai, db_duel.id, settings)

    return db_duel

@router.post("/", response_model=schemas.Duel)
async def create_duel(
    duel: schemas.DuelCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new duel. This can be for a player vs. player (PvP) match
    or a player vs. AI (PvE) match.
    """
    # For PvP, player_two_id would be provided.
    # For PvE, player_two_id can be null, and we can assign an AI later.
    return await service.create_duel(db=db, duel=duel)

@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    user_id: UUID = Query(None),
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
    duel_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the details of a specific duel.
    """
    db_duel = await service.get_duel(db, duel_id=duel_id)
    if db_duel is None:
        raise HTTPException(status_code=404, detail="Duel not found")
    return db_duel

@router.post("/matchmaking/join", response_model=schemas.Duel)
async def join_matchmaking(
    problem_id: UUID,
    # In a real app, you'd get the user_id from a dependency that
    # decodes a JWT token, not from the request body.
    # For now, we'll pass it directly for simplicity.
    current_user_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """
    Finds a pending duel for a specific problem or creates a new one.
    """
    duel = await service.find_or_create_duel(
        db=db, player_id=current_user_id, problem_id=problem_id
    )
    # This endpoint now needs to commit the transaction
    await db.commit()
    await db.refresh(duel)
    return duel

@router.websocket("/ws/{duel_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, duel_id: str, user_id: str):
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

async def run_ai_opponent(duel_id: str, solution: str, template: str, steps: list = None):
    """A background task that simulates an AI opponent typing out a solution."""
    try:
        if steps:
            logger.info(f"[AI Opponent] Duel {duel_id}: Using pre-generated steps.")
            ai_process = [CodingStep.model_validate(step) for step in steps]
        else:
            logger.info(f"[AI Opponent] Duel {duel_id}: Generating new steps.")
            # The language parameter is kept for compatibility but not used in the new implementation.
            ai_process = await generate_ai_coding_process(solution=solution, template=template, language="python")

        if not ai_process:
            logger.warning(f"[AI Opponent] Duel {duel_id}: No AI coding steps were generated. Aborting.")
            return

        logger.info(f"[AI Opponent] Duel {duel_id}: Generated process with {len(ai_process)} steps.")
        await asyncio.sleep(3) # Initial delay to simulate thinking

        for step_model in ai_process:
            step = step_model.root

            if isinstance(step, CodeTypingAction):
                # Typing delay based on speed and content length
                delay = max(0.05, len(step.content) * 0.1 / step.speed)
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

        db = SessionLocal()
        try:
            duel = await service.get_duel(db, UUID(duel_id))
            if not duel:
                logger.error(f"[AI Opponent] Duel {duel_id}: Could not find duel to submit.")
                return

            # Check if player one has already solved it
            if duel.results and duel.results.get("p1_solved_at"):
                logger.info(f"[AI Opponent] Duel {duel_id}: Player 1 already solved. AI will not submit.")
                return

            # Record AI's solve time. Since there's no player_two, we use a special key.
            results_data = duel.results or {}
            results_data["ai_solved_at"] = datetime.now(timezone.utc).isoformat()
            
            # The AI is always the first (and only) solver in this context
            results_data["first_solver"] = "ai"

            await service.update_duel_results(db, duel, results_data)
            
            # End the duel and broadcast the results
            await duel_flow_service.end_duel_and_broadcast(db, duel.id, for_ai=True)

        finally:
            await db.close()

    except Exception as e:
        logger.error(f"[AI Opponent] Duel {duel_id}: An error occurred: {e}", exc_info=True)

@router.get("/user/{user_id}/active-or-waiting", response_model=schemas.Duel, description="Get the active or waiting duel for a user.")
async def get_active_or_waiting_duel_for_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    duel = await service.get_active_or_waiting_duel(db, user_id=user_id)
    if not duel:
        raise HTTPException(status_code=404, detail="No active or waiting duel found for this user.")
    return duel

@router.post("/{duel_id}/test", status_code=202)
async def test_solution(
    duel_id: UUID,
    submission: schemas.CodeSubmission,
    background_tasks: BackgroundTasks,
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Handles code testing against public test cases for a duel.
    Runs the tests in a background task.
    """
    # Explicitly pass the necessary data to the background task
    background_tasks.add_task(run_tests_and_notify, duel_id, user_id, submission.code, submission.language)
    return {"message": "Test execution started"}

async def run_tests_and_notify(duel_id: UUID, user_id: UUID, code: str, language: str):
    """
    Asynchronously runs the user's code against PUBLIC test cases and notifies them of the result.
    """
    logger.info(f"Starting public test execution for duel {duel_id} by user {user_id}")
    
    db = SessionLocal()
    try:
        # Prepare a submission object for testing
        submission_obj = schemas.CodeSubmission(code=code, language=language)

        # Fetch problem data for public tests only
        duel = await service.get_duel(db, duel_id)
        problem_data = None
        if duel and duel.results and duel.results.get("ai_problem_data"):
            problem_data = duel.results["ai_problem_data"]
        else:
            if not duel:
                logger.error(f"Could not find duel {duel_id} for test run.")
                return 
            try:
                problem_data = await get_problem_from_service(duel.problem_id)
            except HTTPException as e:
                logger.error(f"Failed to get problem data for duel {duel_id}: {e}")
                error_payload = {
                    "type": "test_result",
                    "user_id": str(user_id),
                    "data": {
                        "is_correct": False,
                        "error": f"Failed to load problem data: {e.detail}",
                        "details": [],
                        "passed": 0,
                        "failed": 0
                    },
                }
                await manager.send_to_user_in_duel(str(duel_id), str(user_id), json.dumps(error_payload))
                return

        # Ensure function_name exists for python helper calls
        if problem_data and "function_name" not in problem_data:
            slug = problem_data.get("slug", "")
            problem_data["function_name"] = slug.replace('-', '_')

        execution_result = await flow_service._execute_code_against_public_tests(submission_obj, problem_data)
        
        if not problem_data.get("test_cases") and not execution_result.error:
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
    finally:
        await db.close()

@router.post("/{duel_id}/submit", response_model=flow_service.CodeExecutionResult, status_code=200)
async def submit_solution(
    duel_id: UUID,
    submission: schemas.DuelSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
    flow_service: DuelFlowService = Depends(get_duel_flow_service)
):
    """
    Submits a solution for a duel, runs it against test cases,
    and returns immediate feedback.
    """
    if UUID(current_user.id) != submission.player_id:
        raise HTTPException(status_code=403, detail="Player ID does not match authenticated user.")

    result = await flow_service.handle_submission(
        db=db,
        duel_id=duel_id,
        submission=submission
    )

    # Always return a 200. The frontend will determine the outcome based on is_correct.
    # The result object now contains all necessary details.
    return result

@router.post("/matchmaking/find_or_create", response_model=schemas.Duel)
async def find_or_create_duel_endpoint(
    problem_id: UUID,
    # In a real app, you'd get the user_id from a dependency that
    # decodes a JWT token, not from the request body.
    # For now, we'll pass it directly for simplicity.
    current_user_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """
    Finds a pending duel for a specific problem or creates a new one.
    """
    duel = await service.find_or_create_duel(
        db=db, player_id=current_user_id, problem_id=problem_id
    )
    # This endpoint now needs to commit the transaction
    await db.commit()
    await db.refresh(duel)
    return duel 