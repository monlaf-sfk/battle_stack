import asyncio
import json
import random
from uuid import UUID
import uuid
import logging
from typing import Dict, Any, cast

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, WebSocket, WebSocketDisconnect, status
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
from shared.app.duels.matchmaking_service import MatchmakingService
from shared.app.config import settings
from shared.app.schemas import Message # Import Message from shared.app.schemas
from ast import literal_eval


router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Matchmaking Service
matchmaking_service = MatchmakingService(settings.REDIS_URL)

# In-memory store for AI-generated problems
# {duel_id: GeneratedProblem}
generated_problem_cache: Dict[UUID, Any] = {}


@router.post("/ai-duel-custom", response_model=schemas.Duel, status_code=201)
async def create_custom_ai_duel(
    settings: problem_generator.CustomAIDuelSettings,
    background_tasks: BackgroundTasks,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new duel against an AI opponent with custom settings.
    A background task is started to generate the problem.
    """
    duel = await service.create_duel(db, schemas.DuelCreate(
        player_one_id=user_id,
        status=models.DuelStatus.GENERATING_PROBLEM,
        problem_id=UUID(int=0) # Placeholder
    ))
    
    background_tasks.add_task(
        generate_problem_and_run_ai, 
        db, 
        duel.id, # Pass the UUID value directly
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


@router.post("/rooms", response_model=schemas.Duel)
async def create_private_room(
    req: schemas.PrivateRoomCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Creates a private duel room and returns the duel with a room code."""
    import random
    import string
    
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    duel = await service.create_duel(db, schemas.DuelCreate(
        player_one_id=UUID(req.user_id),
        status=models.DuelStatus.PENDING,
        problem_id=UUID(int=0) # Placeholder
    ))
    
    # Store duel settings to be used when the second player joins
    duel_settings = {
        "difficulty": req.difficulty,
        "category": req.category,
        "theme": req.theme,
        "language": req.language_id,
    }

    await db.execute(
        models.Duel.__table__.update()
        .where(models.Duel.id == duel.id)
        .values(room_code=room_code, results=duel_settings)
    )
    await db.commit()
    await db.refresh(duel)
    
    return duel


@router.post("/rooms/join", response_model=schemas.Duel)
async def join_private_room(
    req: schemas.PrivateRoomJoinRequest,
    db: AsyncSession = Depends(get_db)
):
    """Joins a private duel room and returns the duel."""
    duel = await service.get_duel_by_room_code(db, req.room_code.upper())
    
    if not duel:
        raise HTTPException(status_code=404, detail="Room not found.")
    
    if duel.player_two_id is not None:
        raise HTTPException(status_code=400, detail="Room is already full.")

    if str(duel.player_one_id) == req.user_id:
        raise HTTPException(status_code=400, detail="You cannot join your own room.")
        
    await db.execute(
        models.Duel.__table__.update()
        .where(models.Duel.id == duel.id)
        .values(player_two_id=UUID(req.user_id), status=models.DuelStatus.WAITING)
    )
    await db.commit()
    await db.refresh(duel)
    
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

    # Start keepalive task to prevent WebSocket timeout
    keepalive_task = asyncio.create_task(send_periodic_keepalive(str(duel_id)))

    try:
        logger.info(f"🤖 Generating AI problem for duel {duel_id}...")
        
        # Send initial status to keep WebSocket alive
        await manager.broadcast_to_all(
            str(duel_id),
            json.dumps({"type": "generation_status", "data": {"message": "🤖 AI is thinking of a problem...", "stage": "generating"}})
        )
        
        for attempt in range(MAX_RETRIES):
            try:
                problem_candidate = await problem_generator.generate_problem(
                    category=settings.category, topic=settings.theme, difficulty=settings.difficulty, language=settings.language
                )
                
                logger.info(f"Validating generated problem ({settings.category}), attempt {attempt + 1}...")
                
                # Send validation status
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "generation_status", "data": {"message": f"🔍 Validating problem (attempt {attempt + 1})...", "stage": "validating"}})
                )

                if settings.category == "algorithms" and isinstance(problem_candidate, problem_generator.GeneratedProblem):
                    validation_submission = schemas.CodeSubmission(
                        code=problem_candidate.solution,
                        language=settings.language
                    )
                    problem_dict = problem_candidate.model_dump(mode='json')
                    execution_result = await _execute_code_against_tests(validation_submission, problem_dict)

                    if execution_result.is_correct:
                        logger.info("✅ Generated algorithm problem passed validation.")
                        await manager.broadcast_to_all(
                            str(duel_id),
                            json.dumps({"type": "generation_status", "data": {"message": "✅ Problem validated! Starting AI opponent...", "stage": "starting_ai"}})
                        )
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

        # Use mode='json' to properly serialize UUID and other complex types
        duel_results = {"ai_problem_data": generated_problem_obj.model_dump(mode='json')}
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
            json.dumps({"type": "problem_generated", "data": generated_problem_obj.model_dump(mode='json')})
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
    finally:
        # Cancel keepalive task
        keepalive_task.cancel()
        try:
            await keepalive_task
        except asyncio.CancelledError:
            pass

async def send_periodic_keepalive(duel_id: str):
    """Send periodic keepalive messages during long operations"""
    try:
        while True:
            await asyncio.sleep(10)  # Send keepalive every 10 seconds
            await manager.send_keepalive(duel_id)
    except asyncio.CancelledError:
        pass

@router.get("/leaderboard", response_model=list[schemas.LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    leaderboard_data = await service.get_leaderboard(db, limit=limit)
    
    # Get user IDs from leaderboard data
    user_ids = [str(entry.user_id) for entry in leaderboard_data]
    
    # Make HTTP request to auth-service to get user details
    import httpx
    user_details_map = {}
    
    if user_ids:
        try:
            async with httpx.AsyncClient() as client:
                # Call auth-service to get user details
                response = await client.post(
                    "http://auth-service:8000/api/v1/auth/users/batch",
                    json={"user_ids": user_ids},
                    timeout=5.0
                )
                if response.status_code == 200:
                    users_data = response.json()
                    user_details_map = {user["id"]: user for user in users_data}
        except Exception as e:
            logger.warning(f"Failed to fetch user details from auth-service: {e}")
    
    response_data = []
    for i, entry in enumerate(leaderboard_data):
        # Safely access attributes, ensuring they are Python scalar types
        wins = int(entry.wins)
        losses = int(entry.losses)
        draws = int(entry.draws)
        total_matches = int(entry.total_matches) # Cast here as well
        elo_rating = int(entry.elo_rating) # Cast here
        current_streak = int(entry.current_streak) # Cast here

        win_rate = (float(wins) / total_matches * 100) if total_matches > 0 else 0.0
        
        # Get user details from the user_details_map
        user_details = user_details_map.get(str(entry.user_id))
        username = user_details.get("username") if user_details else f"User-{str(entry.user_id)[:8]}"
        full_name = user_details.get("full_name") if user_details and user_details.get("full_name") else username
        
        leaderboard_entry = schemas.LeaderboardEntry(
            rank=i + 1,
            user_id=str(entry.user_id),
            username=username,
            full_name=full_name,
            elo_rating=elo_rating,
            total_matches=total_matches,
            wins=wins,
            losses=losses,
            draws=draws,
            win_rate=round(win_rate, 1),
            current_streak=current_streak
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

@router.get("/activity/{user_id}", response_model=list[schemas.DailyActivity])
async def get_user_activity(
    user_id: UUID,
    year: int = Query(datetime.now(timezone.utc).year),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the daily activity count for a specific user and year.
    """
    return await service.get_user_activity_by_year(db, user_id=user_id, year=year)

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
    
    # Explicitly load problem data if available in duel.results
    if duel.results is not None and isinstance(duel.results, dict) and "ai_problem_data" in duel.results:
        try:
            # Access the data directly as it's already a dictionary from the ORM
            problem_data = dict(duel.results.get("ai_problem_data", {}))
            
            # Ensure id field exists for DuelProblem validation
            if 'id' not in problem_data:
                problem_data['id'] = uuid.uuid4()
            
            # Convert code_templates to starter_code dictionary
            starter_code = {
                template['language']: template['template_code']
                for template in problem_data.get('code_templates', [])
            }
            problem_data['starter_code'] = starter_code

            duel.problem = schemas.DuelProblem.model_validate(problem_data)
        except Exception as e:
            logger.error(f"Error parsing problem data for duel {duel.id}: {e}")
            # Optionally, clear problem data to prevent frontend issues
            duel.problem = None

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
    if not duel or not isinstance(duel.results, dict) or "ai_problem_data" not in duel.results:
        raise HTTPException(status_code=404, detail="Duel or problem data not found.")
    
    problem_data = dict(duel.results.get("ai_problem_data", {}))
    
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
    Ensures the final code matches the solution exactly.
    """
    full_code = ""
    solution_index = 0  # Track position in the target solution
    
    for step in steps:
        action = step.root.action
        
        if action == "type":
            content = step.root.content
            speed = step.root.speed
            # Simulate typing character by character with realistic delays
            for char in content:
                # Make sure we're typing the correct character from the solution
                if solution_index < len(solution):
                    correct_char = solution[solution_index]
                    full_code += correct_char
                    solution_index += 1
                    
                    await manager.broadcast_to_all(
                        str(duel_id),
                        json.dumps({"type": "ai_progress", "data": {"code_chunk": correct_char}})
                    )
                    
                    # More realistic typing delay
                    base_delay = 0.1 / speed
                    delay_variation = random.uniform(0.8, 1.2)
                    
                    # Extra delay for complex characters
                    if correct_char in '()[]{}:;,."\'':
                        delay_variation *= 1.3
                    # Longer delay after spaces
                    if correct_char == ' ':
                        delay_variation *= 1.5
                    # Even longer delay after newlines
                    if correct_char == '\n':
                        delay_variation *= 2.0
                        
                    await asyncio.sleep(base_delay * delay_variation)
        
        elif action == "pause":
            await asyncio.sleep(step.root.duration)
            
        elif action == "delete":
            char_count = step.root.char_count
            # Make sure we don't delete more than what we have
            actual_delete_count = min(char_count, len(full_code))
            if actual_delete_count > 0:
                full_code = full_code[:-actual_delete_count]
                solution_index = max(0, solution_index - actual_delete_count)  # Adjust solution index
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "ai_delete", "data": {"char_count": actual_delete_count}})
                )

    # After simulation, decide if AI "solves" the problem
    # Make AI more human-like by not always succeeding
    ai_success_rate = 0.75  # 75% success rate - sometimes AI fails like humans
    
    duel = await service.get_duel(db, duel_id)
    if duel and duel.status == models.DuelStatus.IN_PROGRESS:
        current_results = duel.results or {}
        if isinstance(current_results, dict):
            
            if random.random() < ai_success_rate:
                # AI "solves" the problem
                current_results["ai_solved_at"] = datetime.now(timezone.utc).isoformat()
                
                # Check if AI is the first solver
                if 'p1_solved_at' not in current_results:
                    current_results['first_solver'] = 'ai'
                
                await service.update_duel_results(db, duel.id, current_results)
                await duel_flow_service.end_duel_and_broadcast(db, duel.id, for_ai=True)
                
                # Broadcast that AI solved
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "ai_solved", "data": {"message": "AI opponent solved the problem!"}})
                )
            else:
                # AI "gives up" or makes mistakes - more human-like
                await manager.broadcast_to_all(
                    str(duel_id),
                    json.dumps({"type": "ai_struggling", "data": {"message": "AI opponent is having trouble with this problem..."}})
                )
                
                # Add some more time for the human to solve
                await asyncio.sleep(random.uniform(30.0, 60.0))  # AI "keeps trying" for 30-60 more seconds
                
                # Sometimes AI gives up completely
                if random.random() < 0.3:  # 30% chance AI gives up
                    await manager.broadcast_to_all(
                        str(duel_id),
                        json.dumps({"type": "ai_gave_up", "data": {"message": "AI opponent gave up. You have more time to solve!"}})
                    )

@router.post("/matchmaking/join", response_model=Message)
async def join_matchmaking_queue(
    request: schemas.MatchmakingRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint for a user to join the matchmaking queue.
    """
    # Check if user is already in a duel or waiting for one
    existing_duel = await service.get_active_or_waiting_duel(db, user_id)
    if existing_duel and existing_duel.status in [models.DuelStatus.IN_PROGRESS, models.DuelStatus.GENERATING_PROBLEM, models.DuelStatus.WAITING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in an active or waiting duel."
        )

    await matchmaking_service.enqueue_player(
        user_id=user_id,
        difficulty=request.difficulty,
        category=request.category
    )
    logger.info(f"User {user_id} joined matchmaking queue for {request.difficulty} {request.category} duel.")
    
    return Message(message="Joined matchmaking queue.")

@router.post("/matchmaking/cancel", response_model=Message)
async def leave_matchmaking_queue(
    request: schemas.MatchmakingRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Endpoint for a user to leave the matchmaking queue.
    """
    await matchmaking_service.dequeue_player(
        user_id=user_id,
        difficulty=request.difficulty,
        category=request.category
    )
    logger.info(f"User {user_id} left matchmaking queue for {request.difficulty} {request.category} duel.")
    return Message(message="Left matchmaking queue.")
