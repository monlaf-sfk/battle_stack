import asyncio
import json
from uuid import UUID
import logging
from typing import Dict, Any, cast

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from shared.app.database import get_db
from shared.app.duels import schemas, service, models
from shared.app.duels.flow_service import (
    duel_flow_service, 
    _execute_code_against_public_tests, 
    _execute_code_against_tests
)
from shared.app.ai import generator as problem_generator
from shared.app.ai_opponent.core import generate_ai_coding_process
from shared.app.duels.websocket_manager import manager
from shared.app.auth.security import get_current_user_id, get_user_id_from_token
from datetime import datetime, timezone


router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for AI-generated problems
# {duel_id: GeneratedProblem}
generated_problem_cache: Dict[UUID, Any] = {}


@router.post("/ai-duel-custom", response_model=schemas.Duel, status_code=201)
async def create_custom_ai_duel(
    settings: problem_generator.CustomAIDuelSettings,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """
    Creates a new duel against an AI opponent with custom settings.
    A background task is started to generate the problem.
    """
    if background_tasks is None:
        raise HTTPException(status_code=500, detail="BackgroundTasks dependency not found.")

    duel = await service.create_duel(db, schemas.DuelCreate(
        player_one_id=user_id,
        status=models.DuelStatus.GENERATING_PROBLEM,
        problem_id=UUID(int=0) # Placeholder
    ))
    
    background_tasks.add_task(
        generate_problem_and_run_ai, 
        db, 
        duel.id, 
        user_id, 
        settings
    )

    return duel


@router.get("/user/{user_id}/active-or-waiting", response_model=schemas.Duel)
async def get_user_active_or_waiting_duel(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if a user has an active or waiting duel and returns it.
    """
    active_statuses = [
        models.DuelStatus.IN_PROGRESS,
        models.DuelStatus.GENERATING_PROBLEM
    ]
    duel = await service.get_duel_by_user_and_status(db, user_id, active_statuses)
    
    if not duel:
        raise HTTPException(status_code=404, detail="No active or waiting duel found for this user.")
        
    return duel


async def generate_problem_and_run_ai(
    db: AsyncSession,
    duel_id: UUID, 
    user_id: UUID,
    settings: problem_generator.CustomAIDuelSettings
):
    """
    Background task to generate a problem, update the duel, and start the AI opponent.
    """
    MAX_RETRIES = 3
    generated_problem_obj = None

    try:
        logger.info(f"🤖 Generating AI problem for duel {duel_id}...")
        
        for attempt in range(MAX_RETRIES):
            try:
                problem_candidate = await problem_generator.generate_problem(
                    category=settings.category, topic=settings.theme, difficulty=settings.difficulty, language=settings.language
                )
                
                logger.info(f"Validating generated problem ({settings.category}), attempt {attempt + 1}...")

                if settings.category == "algorithms" and isinstance(problem_candidate, problem_generator.GeneratedProblem):
                    validation_submission = schemas.CodeSubmission(
                        code=problem_candidate.solution,
                        language=settings.language
                    )
                    problem_dict = problem_candidate.model_dump()
                    execution_result = await _execute_code_against_tests(validation_submission, problem_dict)

                    if execution_result.is_correct:
                        logger.info("✅ Generated algorithm problem passed validation.")
                        generated_problem_obj = problem_candidate
                        break
                    else:
                        logger.warning(f"Algorithm validation failed: {execution_result.details}. Retrying...")
                elif settings.category == "sql" and isinstance(problem_candidate, problem_generator.SQLGeneratedProblem):
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

        duel_results = {"ai_problem_data": generated_problem_obj.model_dump()}
        await service.update_duel_results(db, duel_id, duel_results)

        await db.execute(
            models.Duel.__table__.update()
            .where(models.Duel.id == duel_id)
            .values(status=models.DuelStatus.IN_PROGRESS, started_at=datetime.now(timezone.utc))
        )
        await db.commit()
            
        solution_code = ""
        template_for_lang = ""
        if isinstance(generated_problem_obj, problem_generator.GeneratedProblem):
            solution_code = generated_problem_obj.solution
            template_for_lang = next((t.template_code for t in generated_problem_obj.code_templates if t.language == settings.language), "")
        elif isinstance(generated_problem_obj, problem_generator.SQLGeneratedProblem):
            solution_code = generated_problem_obj.correct_solution_sql
        
        ai_coding_steps = await generate_ai_coding_process(
            solution=solution_code,
            template=template_for_lang,
            language=settings.language
        )
                
        asyncio.create_task(run_ai_coding_simulation(db, duel_id, ai_coding_steps, solution_code))

        await manager.broadcast_to_all(
            str(duel_id),
            json.dumps({"type": "problem_generated", "data": generated_problem_obj.model_dump()})
        )

    except Exception as e:
        logger.error(f"Error in AI duel setup for duel {duel_id}: {e}", exc_info=True)
        await db.execute(
            models.Duel.__table__.update().where(models.Duel.id == duel_id).values(status=models.DuelStatus.FAILED_GENERATION)
        )
        await db.commit()
        await manager.send_to_user_in_duel(
            str(duel_id),
            str(user_id),
            json.dumps({
                "type": "duel_creation_failed",
                "data": {"error": "Could not generate an AI problem. Please try again."}
            })
        )

@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    leaderboard_data = await service.get_leaderboard(db, limit=limit)
    
    response_data = []
    for i, entry in enumerate(leaderboard_data):
        # Handle case where draws attribute might not exist yet (migration not applied)
        draws = getattr(entry, 'draws', 0)
        total_matches = entry.wins + entry.losses + draws
        win_rate = (entry.wins / total_matches * 100) if total_matches > 0 else 0.0
        
        leaderboard_entry = schemas.LeaderboardEntry(
            rank=i + 1,
            user_id=str(entry.user_id),
            username="",  # Will be filled by frontend
            full_name="",  # Will be filled by frontend
            elo_rating=entry.elo_rating,
            total_matches=total_matches,
            wins=entry.wins,
            losses=entry.losses,
            draws=draws,
            win_rate=round(win_rate, 1),
            current_streak=entry.current_streak
        )
        response_data.append(leaderboard_entry)
        
    return response_data


@router.get("/matches/recent", response_model=list[schemas.MatchHistoryItem])
async def get_recent_matches(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the most recent public matches to display on a leaderboard or activity feed.
    This endpoint is public and does not require authentication.
    """
    match_history = await service.get_recent_matches(db, limit=limit)
    return match_history

@router.get("/{duel_id}", response_model=schemas.Duel)
async def get_duel_details(
    duel_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves details for a specific duel.
    """
    duel = await service.get_duel(db, duel_id)
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    return duel

@router.post("/{duel_id}/submit", response_model=schemas.SubmissionResult)
async def submit_solution(
    duel_id: UUID,
    submission: schemas.DuelSubmission,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a solution for a duel.
    """
    result = await duel_flow_service.handle_submission(db, duel_id, submission)
    details_str = None
    if result.details:
        details_str = json.dumps(result.details) if isinstance(result.details, list) else result.details
        
    return schemas.SubmissionResult(
        is_correct=result.is_correct,
        details=details_str,
        passed=result.passed,
        total=result.total,
        error=result.error
    )

@router.post("/{duel_id}/run-public-tests", response_model=schemas.SubmissionResult)
async def run_public_tests(
    duel_id: UUID,
    submission: schemas.CodeSubmission,
    db: AsyncSession = Depends(get_db)
):
    """
    Runs the user's code against the public test cases for the duel's problem.
    """
    duel = await service.get_duel(db, duel_id)
    if not duel or not duel.results or "ai_problem_data" not in duel.results:
        raise HTTPException(status_code=404, detail="Duel or problem data not found.")
    
    problem_data = cast(Dict[str, Any], duel.results.get("ai_problem_data"))
    
    result = await _execute_code_against_public_tests(submission, problem_data)
    details_str = None
    if result.details:
        details_str = json.dumps(result.details) if isinstance(result.details, list) else result.details
    
    return schemas.SubmissionResult(
        is_correct=result.is_correct,
        details=details_str,
        passed=result.passed,
        total=result.total,
        error=result.error
    )

@router.websocket("/ws/{duel_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    duel_id: str,
    token: str = Query(...)
):
    """
    Handles WebSocket connections for a specific duel.
    Authenticates user via a token in the query parameters.
    """
    try:
        user_id = get_user_id_from_token(token)
        if not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(duel_id, user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            # For now, we just broadcast any message received.
            # You might want to add more structured message handling here.
            await manager.broadcast_to_all(duel_id, data)
    except WebSocketDisconnect:
        manager.disconnect(duel_id, user_id, websocket)
        logger.info(f"User {user_id} disconnected from duel {duel_id}")

async def run_ai_coding_simulation(db: AsyncSession, duel_id: UUID, steps: list, solution: str):
    """
    Simulates the AI opponent's coding process, sending updates via WebSocket.
    """
    full_code = ""
    for step in steps:
        action = step.root.action
        
        if action == "type":
            content = step.root.content
            speed = step.root.speed
            # Simulate typing character by character with a delay
            for char in content:
                full_code += char
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "ai_progress", "data": {"code_chunk": char}})
                )
                await asyncio.sleep(0.1 / speed)
        
        elif action == "pause":
            await asyncio.sleep(step.root.duration)
            
        elif action == "delete":
            char_count = step.root.char_count
            full_code = full_code[:-char_count]
            await manager.broadcast_to_all(
                str(duel_id),
                json.dumps({"type": "ai_delete", "data": {"char_count": char_count}})
            )

    # After simulation, "submit" the final, correct code
    duel = await service.get_duel(db, duel_id)
    if duel and duel.status == models.DuelStatus.IN_PROGRESS:
        current_results = duel.results or {}
        current_results["ai_solved_at"] = datetime.now(timezone.utc).isoformat()
        
        # Check if AI is the first solver
        if 'p1_solved_at' not in current_results:
            current_results['first_solver'] = 'ai'
        
        await service.update_duel_results(db, duel_id, current_results)
        await duel_flow_service.end_duel_and_broadcast(db, duel_id, for_ai=True)
