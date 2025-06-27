import sys
import os
import json
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import random
from typing_extensions import Annotated

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, Query, Request, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from shared.app.database import get_db
from shared.app.auth.security import get_current_user
from shared.app.auth.jwt_models import JWTUser
from shared.app.problems.code_runner import code_runner
from duel_service.service import duel_service  # Use professional instance
from duel_service.schemas import (
    DuelCreateRequest, AIDuelCreateRequest, DuelJoinRequest, DuelResponse, CodeSubmission,
    PlayerStatsResponse, LeaderboardResponse, MatchHistoryItem,
    PlayerRatingResponse, DuelStartMessage, CodeUpdateMessage,
    TestResultMessage, DuelCompleteMessage, WSMessageType,
    ParticipantInfo, TestCase, DuelProblemResponse,
    DuplicateReportRequest, DuplicateReportResponse, ProblemHistoryResponse, AntiDuplicateStatsResponse  # 🚨 Anti-duplicate schemas
)
from duel_service.websocket_manager import WebSocketManager
from duel_service.models import DuelStatus, DuelMode, DuelDifficulty
from duel_service.ai_opponent import ai_opponent  # Use professional instance
from duel_service.anti_duplicate import anti_duplicate_manager  # 🧱 Anti-duplicate system

# Add debug middleware logging
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware

print("🚀🚀🚀 ROUTER MODULE LOADED - ADDING DEBUG MIDDLEWARE")

class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"🌐🌐🌐 INCOMING REQUEST: {request.method} {request.url}")
        print(f"🌐 Headers: {dict(request.headers)}")
        
        response = await call_next(request)
        
        print(f"🌐 OUTGOING RESPONSE: {response.status_code}")
        return response


router = APIRouter(prefix="/api/v1/duels", tags=["duels"])
public_router = APIRouter(prefix="/api/v1/public/duels", tags=["public-duels"])
# duel_service is already imported as professional instance
ws_manager = WebSocketManager()


@router.post("/create", response_model=DuelResponse)
async def create_duel(
    request: DuelCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Create a new duel"""
    duel = await duel_service.create_duel(db, current_user.id, request)
    
    # Convert to response model
    return await _duel_to_response(db, duel, current_user.id)


@router.post("/join", response_model=DuelResponse)
async def join_duel(
    request: DuelJoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Join an existing duel or return None if no suitable duel found"""
    try:
        # Pass difficulty to the service for better matchmaking
        duel = await duel_service.join_duel(
            db, 
            current_user.id, 
            request.room_code,
            request.difficulty
        )
        
        if not duel:
            raise HTTPException(
                status_code=404,
                detail="No suitable duel found"
            )
        
        # Send duel started notification to both participants
        await ws_manager.send_duel_started(duel.id)
        
        return await _duel_to_response(db, duel, current_user.id)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error joining duel: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to join duel"
        )


@router.post("/ai-duel", response_model=DuelResponse)
async def create_ai_duel(
    request: AIDuelCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: JWTUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a duel against AI opponent"""
    try:
        duel = await duel_service.create_ai_duel(
            db=db,
            user_id=current_user.id,
            difficulty=request.difficulty,
            background_tasks=background_tasks,
            problem_type=request.problem_type
        )
        
        if duel.status == DuelStatus.IN_PROGRESS:
            try:
                await ws_manager.send_duel_started(duel.id)
                print(f"📢 Sent duel_started notification for AI duel {duel.id}")
            except Exception as e:
                print(f"⚠️ Failed to send duel_started notification for AI duel: {e}")
        
        return await _duel_to_response(db, duel, current_user.id)
    
    except Exception as e:
        print(f"Error creating AI duel: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/active", response_model=DuelResponse)
async def get_active_duel(
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Get user's active duel"""
    duel = await duel_service.get_active_duel(db, current_user.id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="No active duel found")
    
    return await _duel_to_response(db, duel, current_user.id)


@router.get("/active-or-waiting", response_model=Optional[DuelResponse])
async def get_active_or_waiting_duel(
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Get user's active or waiting duel (for page refresh recovery)"""
    duel = await duel_service.get_active_duel(db, current_user.id)
    
    if not duel:
        return None
    
    return await _duel_to_response(db, duel, current_user.id)


@router.get("/{duel_id}", response_model=DuelResponse)
async def get_duel(
    duel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Get duel by ID"""
    duel = await duel_service.get_duel_by_id(db, duel_id)
    
    if not duel:
        raise HTTPException(status_code=404, detail="Duel not found")
    
    # Ensure participants are loaded before checking
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from duel_service.models import Duel
    
    duel_query = select(Duel).where(Duel.id == duel_id).options(selectinload(Duel.participants))
    result = await db.execute(duel_query)
    duel = result.scalar_one()
    
    # Check if user is participant - convert to strings for comparison to handle UUID vs string mismatch
    current_user_id_str = str(current_user.id)
    is_participant = any(
        str(p.user_id) == current_user_id_str 
        for p in duel.participants 
        if p.user_id is not None
    )
    
    if not is_participant:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return await _duel_to_response(db, duel, current_user.id)


@router.post("/{duel_id}/submit")
async def submit_code(
    duel_id: UUID,
    submission: CodeSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Submit code for final testing and potential win"""
    
    print("🚀🚀🚀 SUBMIT ENDPOINT CALLED!", flush=True)
    print(f"🚀 duel_id: {duel_id}", flush=True)
    print(f"🚀 code: {submission.code[:100]}...", flush=True)
    
    try:
        print(f"🚀 Submit code request: duel_id={duel_id}, user_id={current_user.id}", flush=True)
        print(f"📝 Code length: {len(submission.code)}, language: {submission.language}", flush=True)
        
        # Use the service method which handles all the logic correctly
        results_dict = await duel_service.submit_code(db, duel_id, current_user.id, submission)
        
        # If solution is correct, send WebSocket notification
        if results_dict.get('is_solution_correct'):
            print(f"🏆 Solution is correct! Sending WebSocket notification...", flush=True)
            
            # Get duel info for WebSocket notification
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            from duel_service.models import Duel
            
            duel_query = select(Duel).where(Duel.id == duel_id).options(
                selectinload(Duel.participants),
                selectinload(Duel.problem)
            )
            result = await db.execute(duel_query)
            duel = result.scalar_one_or_none()
            
            if duel:
                # Find winner and prepare result data
                winner = next((p for p in duel.participants if p.is_winner), None)
                opponent = next((p for p in duel.participants if not p.is_winner), None)
                
                if winner:
                    duel_result = {
                        "duel_id": str(duel.id),
                        "winner_id": str(winner.user_id),
                        "winner_username": f"User_{str(winner.user_id)[:8]}",
                        "winner_solve_time": f"{winner.solve_duration_seconds // 60}:{winner.solve_duration_seconds % 60:02d}" if winner.solve_duration_seconds else "0:00",
                        "winner_rating_change": winner.rating_change or 0,
                        "loser_id": str(opponent.user_id) if opponent and opponent.user_id else None,
                        "loser_username": "AI Bot" if opponent and opponent.is_ai else f"User_{str(opponent.user_id)[:8]}" if opponent and opponent.user_id else "Unknown",
                        "loser_rating_change": opponent.rating_change or 0 if opponent else 0
                    }
                    
                    print(f"🏆 Sending duel completion: {duel_result}", flush=True)
                    
                    # Send WebSocket notification
                    await ws_manager.send_duel_complete(duel.id, duel_result)
        
        # Return the results from service method
        return {
            "success": results_dict.get('is_solution_correct', False),
            "passed": results_dict.get('passed', 0),
            "failed": results_dict.get('failed', 0),
            "total_tests": results_dict.get('total_tests', 0),
            "error": results_dict.get('error'),
            "execution_time_ms": results_dict.get('execution_time_ms', 0),
            "progress_percentage": results_dict.get('progress_percentage', 0),
            "is_solution_correct": results_dict.get('is_solution_correct', False),
            "is_winner": results_dict.get('is_solution_correct', False)
        }
            
    except Exception as e:
        print(f"❌ Error in submit_code: {e}", flush=True)
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
        return {
            "success": False,
            "passed": 0,
            "failed": 0,
            "total_tests": 0,
            "error": str(e),
            "execution_time_ms": 0,
            "progress_percentage": 0,
            "is_solution_correct": False,
            "is_winner": False
        }


@router.post("/{duel_id}/test-code")
async def test_code_only(
    duel_id: UUID,
    submission: CodeSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Test code without submitting (for real-time feedback)"""
    
    print("🔥🔥🔥 TEST-CODE ENDPOINT CALLED!", flush=True)
    print(f"🔥 duel_id: {duel_id}", flush=True)
    print(f"🔥 code: {submission.code[:100]}...", flush=True)
    
    try:
        print(f"🧪 Test code request: duel_id={duel_id}, user_id={current_user.id}", flush=True)
        print(f"📝 Code length: {len(submission.code)}, language: {submission.language}", flush=True)
        
        # Get duel problem with eager loading
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from duel_service.models import Duel
        
        duel_query = select(Duel).where(Duel.id == duel_id).options(
            selectinload(Duel.participants),
            selectinload(Duel.problem)
        )
        result = await db.execute(duel_query)
        duel = result.scalar_one_or_none()
        
        if not duel or not duel.problem:
            print(f"❌ Duel or problem not found: duel={duel}, problem={duel.problem if duel else None}", flush=True)
            raise HTTPException(status_code=404, detail="Duel or problem not found")
        
        print(f"✅ Found duel and problem: {duel.problem.title}", flush=True)
        
        # Parse test cases for this problem
        test_cases = duel.problem.test_cases if duel.problem.test_cases else []
        print(f"📊 Test cases: {len(test_cases)}", flush=True)
        
        # **🔥 USE LEETCODE-STYLE RUNNER**
        print(f"🔧 Running LeetCode-style tests...", flush=True)
        from shared.app.problems.leetcode_runner import leetcode_runner
        
        result = await leetcode_runner.run_leetcode_test(
            user_code=submission.code,
            problem_title=duel.problem.title,
            test_cases=test_cases
        )
        
        print(f"✅ Code execution completed: is_correct={result.is_solution_correct}, passed={result.passed}/{result.total_tests}", flush=True)
        
        # Send real-time update via WebSocket
        await ws_manager.send_test_result(
            duel_id, 
            current_user.id, 
            {
                "type": "test_result",
                "passed": result.passed,
                "failed": result.failed,
                "total_tests": result.total_tests,
                "success": result.is_solution_correct,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
                "progress_percentage": result.progress_percentage,
                "is_solution_correct": result.is_solution_correct,
                "actual": [test.get("actual", "") for test in result.test_results] if result.test_results else []
            }
        )
        
        return {
            "success": result.is_solution_correct,
            "passed": result.passed,
            "failed": result.failed,
            "total_tests": result.total_tests,
            "error": result.error or None,
            "execution_time_ms": result.execution_time_ms,
            "progress_percentage": result.progress_percentage,
            "is_solution_correct": result.is_solution_correct,
            "actual": [test.get("actual", "") for test in result.test_results] if result.test_results else []
        }
        
    except Exception as e:
        print(f"❌ Error in test_code_only: {e}", flush=True)
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
        return {
            "success": False,
            "passed": 0,
            "failed": 0,
            "total_tests": 0,
            "error": str(e),
            "execution_time_ms": 0,
            "progress_percentage": 0,
            "is_solution_correct": False,
            "actual": []
        }


@router.get("/stats/me", response_model=PlayerStatsResponse)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Get current user's duel statistics"""
    stats = await duel_service.get_player_stats(db, current_user.id)
    return PlayerStatsResponse(**stats)


@router.get("/stats/{user_id}", response_model=PlayerStatsResponse)
async def get_user_stats(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """Get specific user's duel statistics"""
    stats = await duel_service.get_player_stats(db, user_id)
    return PlayerStatsResponse(**stats)


@router.get("/leaderboard-test")
async def get_leaderboard_test():
    """Test leaderboard endpoint without auth"""
    return {"message": "leaderboard test works", "entries": [], "total_players": 0}


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get leaderboard"""
    leaderboard = await duel_service.get_leaderboard(db, limit, offset)
    return LeaderboardResponse(**leaderboard)


@router.get("/history", response_model=List[MatchHistoryItem])
async def get_match_history(
    current_user: JWTUser = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get match history for current user"""
    history = await duel_service.get_match_history(db, current_user.id, limit, offset)
    return [MatchHistoryItem(**match) for match in history]


@router.websocket("/ws/{duel_id}")
async def duel_websocket(
    websocket: WebSocket,
    duel_id: UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time duel updates"""
    
    try:
        # Verify JWT token first
        from shared.app.auth.security import verify_token
        payload = verify_token(token)
        user_id = UUID(payload.get("user_id"))
        
        conn_key = f"{duel_id}:{user_id}"
        print(f"🔌 WebSocket connection attempt: {conn_key}")
        
        # Initialize connection tracking if not exists
        if not hasattr(ws_manager, '_connecting_sessions'):
            ws_manager._connecting_sessions = set()
        
        # Reject if already connecting
        if conn_key in ws_manager._connecting_sessions:
            print(f"❌ Rejecting duplicate connection for {conn_key}")
            try:
                await websocket.close(code=4429, reason="Connection already in progress")
            except:
                pass
            return
        
        # Mark as connecting
        ws_manager._connecting_sessions.add(conn_key)
        connection_accepted = False
        
        try:
            # Verify duel exists and user has access with eager loading
            print(f"🔍 Verifying duel access for {conn_key}")
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload
            from duel_service.models import Duel
            
            duel_query = select(Duel).where(Duel.id == duel_id).options(
                selectinload(Duel.participants),
                selectinload(Duel.problem)
            )
            result = await db.execute(duel_query)
            duel = result.scalar_one_or_none()
            
            if not duel:
                print(f"❌ Duel not found for {conn_key}")
                await websocket.close(code=4004, reason="Duel not found")
                return
            
            # Check if user is participant
            user_id_str = str(user_id)
            is_participant = any(
                str(p.user_id) == user_id_str 
                for p in duel.participants 
                if p.user_id is not None
            )
            
            if not is_participant:
                print(f"❌ Access denied for {conn_key}")
                await websocket.close(code=4003, reason="Access denied")
                return
            
            print(f"✅ Accepting WebSocket connection for {conn_key}")
            
            # Accept the WebSocket connection FIRST before any other operations
            await websocket.accept()
            connection_accepted = True
            print(f"✅ WebSocket accepted for {conn_key}")
            
            # Small delay to ensure connection is fully established
            await asyncio.sleep(0.1)
            
            # Disconnect any existing connection for this user AFTER accepting
            if ws_manager.is_user_connected(duel_id, user_id):
                print(f"⚠️ Disconnecting existing connection for {conn_key}")
                old_ws = ws_manager.user_connections[duel_id][user_id]
                try:
                    # Force cleanup first
                    ws_manager.disconnect(old_ws, duel_id, user_id)
                    # Then close the WebSocket
                    if hasattr(old_ws, 'client_state') and old_ws.client_state.name not in ['DISCONNECTED', 'DISCONNECTING']:
                        await old_ws.close(code=4000, reason="New connection replacing old")
                except Exception as e:
                    print(f"⚠️ Error disconnecting old connection for {conn_key}: {e}")
                # Small delay to ensure cleanup
                await asyncio.sleep(0.1)
            
            # Connection is now established, remove from connecting sessions
            ws_manager._connecting_sessions.discard(conn_key)
            print(f"🎉 Connection fully established for {conn_key}")
            
            # Register with WebSocket manager AFTER accept
            print(f"📝 Registering connection for {conn_key}")
            await ws_manager.connect(websocket, duel_id, user_id)
            
            # Wait a moment for connection to be fully ready
            await asyncio.sleep(0.2)
            
            # Send initial duel state only after everything is set up
            if duel.status == DuelStatus.IN_PROGRESS:
                try:
                    await _send_duel_state(websocket, duel, user_id)
                except Exception as state_error:
                    print(f"⚠️ Error sending duel state for {conn_key}: {state_error}")
            
            # Notify other users about this connection after state is sent
            try:
                await ws_manager._safe_broadcast_user_status(duel_id, user_id, "connected")
            except Exception as status_error:
                print(f"⚠️ Error broadcasting user status for {conn_key}: {status_error}")
                
            # Check if this is an AI duel and start AI simulation
            ai_participant = next((p for p in duel.participants if p.is_ai), None)
            if ai_participant and duel.status == DuelStatus.IN_PROGRESS:
                # Delay AI start to prevent race conditions
                async def start_ai_delayed():
                    await asyncio.sleep(1)  # Give time for connection to stabilize
                    await _simulate_ai_opponent(duel, ai_participant, db)
                asyncio.create_task(start_ai_delayed())
            
            # Main message loop with comprehensive error handling
            try:
                while True:
                    try:
                        # Check WebSocket state before receiving
                        if hasattr(websocket, 'client_state'):
                            if websocket.client_state.name in ['DISCONNECTED', 'DISCONNECTING']:
                                print(f"🔌 WebSocket state changed to {websocket.client_state.name} for {conn_key}")
                                break
                        
                        # Receive messages with timeout
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=60.0)
                        
                        message_type = data.get("type")
                        
                        if message_type == "code_update":
                            await ws_manager.broadcast_code_update(
                                duel_id, user_id, data.get("code", ""),
                                data.get("language", "python"), data.get("cursor_position")
                            )
                        
                        elif message_type == "typing_status":
                            await ws_manager.broadcast_typing_status(
                                duel_id, user_id, data.get("is_typing", False)
                            )
                        
                        elif message_type == "test_code":
                            try:
                                submission = CodeSubmission(
                                    code=data.get("code", ""),
                                    language=data.get("language", "python")
                                )
                                result = await _test_code_websocket(duel_id, submission, user_id, db)
                                await ws_manager.send_test_result(duel_id, user_id, result)
                            except Exception as e:
                                print(f"⚠️ Test code error for {conn_key}: {e}")
                                error_result = {
                                    "passed": 0, "failed": 1, "total_tests": 1,
                                    "execution_time_ms": 0, "error": str(e), "progress_percentage": 0
                                }
                                await ws_manager.send_test_result(duel_id, user_id, error_result)
                        
                        elif message_type == "ping":
                            await ws_manager.update_connection_health(duel_id, user_id)
                            pong_message = {
                                "type": "pong", 
                                "timestamp": data.get("timestamp", asyncio.get_event_loop().time())
                            }
                            await ws_manager.send_to_user(duel_id, user_id, pong_message)
                            
                    except asyncio.TimeoutError:
                        # Send ping to keep connection alive
                        try:
                            if hasattr(websocket, 'client_state') and websocket.client_state.name == 'CONNECTED':
                                ping_message = {"type": "ping", "timestamp": asyncio.get_event_loop().time()}
                                await ws_manager.send_to_user(duel_id, user_id, ping_message)
                        except Exception as ping_error:
                            print(f"❌ Ping failed for {conn_key}: {ping_error}")
                            break
                            
                    except WebSocketDisconnect:
                        print(f"🔌 WebSocket disconnect detected for {conn_key}")
                        break
                        
                    except Exception as e:
                        error_msg = str(e)
                        print(f"⚠️ WebSocket message error for {conn_key}: {error_msg}")
                        
                        # Break on ASGI protocol errors
                        if "websocket.accept" in error_msg or "ASGI" in error_msg:
                            print(f"❌ ASGI protocol error detected, breaking connection: {error_msg}")
                            break
                        
                        # Continue on other errors
                        continue
                        
            except Exception as main_loop_error:
                print(f"❌ Main loop error for {conn_key}: {main_loop_error}")
                
        except WebSocketDisconnect:
            print(f"🔌 WebSocket disconnect during setup for {conn_key}")
        except Exception as setup_error:
            print(f"❌ Setup error for {conn_key}: {setup_error}")
            
            # Only try to close if we haven't accepted yet or if we're in a valid state
            if not connection_accepted:
                try:
                    await websocket.close(code=1011, reason="Setup error")
                except:
                    pass
            elif hasattr(websocket, 'client_state') and websocket.client_state.name not in ['DISCONNECTED', 'DISCONNECTING']:
                try:
                    await websocket.close(code=1011, reason="Internal error")
                except:
                    pass
                
        finally:
            # Always cleanup
            print(f"🧹 Cleaning up connection for {conn_key}")
            if connection_accepted:  # Only cleanup if connection was accepted
                ws_manager.disconnect(websocket, duel_id, user_id)
            ws_manager._connecting_sessions.discard(conn_key)
            print(f"✅ Cleanup completed for {conn_key}")
            
    except Exception as auth_error:
        print(f"❌ Authentication error: {auth_error}")
        try:
            await websocket.close(code=4001, reason="Authentication failed")
        except:
            pass


# Helper functions
async def _duel_to_response(db: AsyncSession, duel, user_id: UUID) -> DuelResponse:
    """Convert duel model to response format"""
    # Ensure participants are loaded
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from duel_service.models import Duel
    
    # Reload duel with participants and problem to avoid lazy loading issues
    duel_query = select(Duel).where(Duel.id == duel.id).options(
        selectinload(Duel.participants),
        selectinload(Duel.problem)
    )
    result = await db.execute(duel_query)
    duel = result.scalar_one()
    
    # Get participants info
    participants = []
    for p in duel.participants:
        participant_info = ParticipantInfo(
            id=p.id,
            user_id=p.user_id,
            username="AI Bot" if p.is_ai else f"User_{str(p.user_id)[:8]}",
            is_ai=p.is_ai,
            rating=p.rating_before,
            is_winner=p.is_winner or False,
            solve_duration_seconds=p.solve_duration_seconds,
            tests_passed=p.tests_passed or 0,
            total_tests=p.total_tests or 0
        )
        participants.append(participant_info)
    
    # Get problem info
    problem_response = None
    if duel.problem:
        # 🐛 DEBUG: Log the starter_code that's being sent to frontend
        print(f"🐛 STARTER_CODE DEBUG for problem '{duel.problem.title}':")
        print(f"🐛 Raw starter_code from DB: {duel.problem.starter_code}")
        
        # Handle starter_code as string or dict
        starter_code_dict = {}
        if isinstance(duel.problem.starter_code, str):
            # If it's a string, use it as Python code
            starter_code_dict = {"python": duel.problem.starter_code}
            print(f"🐛 Converted string to dict: python -> {repr(duel.problem.starter_code[:100])}...")
        elif isinstance(duel.problem.starter_code, dict):
            # If it's already a dict, use it as is
            starter_code_dict = duel.problem.starter_code
            for lang, code in starter_code_dict.items():
                print(f"🐛 Language '{lang}': {repr(code[:100] if code else '')}...")
        else:
            # Fallback to empty dict
            starter_code_dict = {"python": "# Write your solution here\npass"}
            print(f"🐛 Using fallback starter code")
        
        # Filter visible test cases only
        visible_test_cases = []
        for tc in (duel.problem.test_cases or []):
            if not tc.get("is_hidden", False):  # Only visible test cases
                test_case = TestCase(
                    input=tc.get("input", ""),
                    output=tc.get("output", ""),
                    is_hidden=tc.get("is_hidden", False)
                )
                visible_test_cases.append(test_case)
        
        problem_response = DuelProblemResponse(
            id=duel.problem.id,
            title=duel.problem.title,
            description=duel.problem.description,
            difficulty=duel.problem.difficulty,
            problem_type=duel.problem.problem_type,
            starter_code=starter_code_dict,  # Use the processed starter_code_dict
            test_cases=visible_test_cases,
            constraints=duel.problem.constraints,
            hints=duel.problem.hints,
            times_used=duel.problem.times_used or 0,
            average_solve_time=duel.problem.average_solve_time,
            success_rate=duel.problem.success_rate,
            created_at=duel.problem.created_at
        )
    
    # Find winner
    winner_id = None
    for p in duel.participants:
        if p.is_winner and p.user_id:
            winner_id = p.user_id
            break
    
    # 🕐 Debug timing information before sending to frontend
    print(f"🕐 Sending duel response to frontend:")
    print(f"🕐 Duel ID: {duel.id}")
    print(f"🕐 Status: {duel.status}")
    print(f"🕐 created_at: {duel.created_at}")
    print(f"🕐 started_at: {duel.started_at}")
    print(f"🕐 started_at ISO: {duel.started_at.isoformat() if duel.started_at else 'None'}")
    print(f"🕐 Current UTC time: {datetime.utcnow().isoformat()}")
    
    # 🕐 Convert datetime objects to proper UTC ISO format with 'Z' suffix
    def to_utc_iso(dt):
        if dt is None:
            return None
        # Ensure the datetime has UTC timezone info and format with 'Z'
        return dt.isoformat() + 'Z' if dt.isoformat().endswith('Z') == False else dt.isoformat()
    
    return DuelResponse(
        id=duel.id,
        mode=duel.mode,
        difficulty=duel.difficulty,
        problem_type=duel.problem_type,
        status=duel.status,
        room_code=duel.room_code,
        participants=participants,
        problem=problem_response,
        created_at=duel.created_at,
        started_at=duel.started_at,
        completed_at=duel.completed_at,
        duration_seconds=duel.duration_seconds,
        winner_id=winner_id
    )


async def _send_duel_state(websocket: WebSocket, duel, user_id: UUID):
    """Send current duel state to newly connected user"""
    # Note: assume duel.participants is already loaded in the calling function
    # Get opponent info
    opponent = None
    for p in duel.participants:
        if p.user_id != user_id:
            opponent = {
                "id": str(p.id),
                "user_id": str(p.user_id) if p.user_id else None,
                "username": "AI Bot" if p.is_ai else f"User_{str(p.user_id)[:8]}",
                "is_ai": p.is_ai,
                "tests_passed": p.tests_passed or 0,
                "total_tests": p.total_tests or 0
            }
            break
    
    # Get latest code snapshots
    latest_snapshots = await duel_service.get_latest_code_snapshots(duel.id)
    
    state_message = {
        "type": "duel_state",
        "duel_id": str(duel.id),
        "status": duel.status.value,
        "opponent": opponent,
        "code_snapshots": latest_snapshots,
        "started_at": duel.started_at.isoformat() if duel.started_at else None,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    await ws_manager.send_to_user(duel.id, user_id, state_message)


# AI simulation task
async def _simulate_ai_opponent(duel, ai_participant, db: AsyncSession):
    """Simulate AI opponent behavior with improved error handling"""
    try:
        print(f"🤖 Starting AI simulation for duel {duel.id}")
        
        # Get AI difficulty
        ai_difficulty = ai_participant.ai_difficulty or DuelDifficulty.MEDIUM
        
        # Wait a bit before AI starts "thinking"
        await asyncio.sleep(2)
        
        # Simulate AI typing with progress updates
        print(f"🤖 AI starting to 'type' solution...")
        
        async def ws_callback(msg_type: str, data: dict):
            """Helper to send WebSocket messages with error handling"""
            try:
                if msg_type == "code_update":
                    await ws_manager.broadcast_code_update(
                        duel.id, ai_participant.id, data["code"], "python", None
                    )
                elif msg_type == "test_result":
                    await ws_manager.send_test_result(duel.id, ai_participant.id, data)
                elif msg_type == "typing_status":
                    await ws_manager.broadcast_typing_status(
                        duel.id, ai_participant.id, data["is_typing"]
                    )
            except Exception as e:
                print(f"⚠️ Error in AI WebSocket callback: {e}")
        
        # Simulate AI solving the problem
        await ws_callback("typing_status", {"is_typing": True})
        
        # Generate AI solution using professional opponent
        print(f"🤖 AI generating solution for problem: {duel.problem.title}")
        
        # Prepare problem data for professional AI
        problem_data = {
            'title': duel.problem.title,
            'description': duel.problem.description,
            'test_cases': duel.problem.test_cases,
            'constraints': getattr(duel.problem, 'constraints', ''),
            'function_signature': getattr(duel.problem, 'function_signature', {}),
            'difficulty': ai_difficulty.value
        }
        
        # Simulate professional AI thinking time
        thinking_time = random.uniform(5.0, 15.0)  # 5-15 seconds
        print(f"🤖 AI thinking for {thinking_time:.1f} seconds...")
        await asyncio.sleep(thinking_time)
        
        try:
            result = await ai_opponent.solve_problem_professionally(
                problem_data=problem_data,
                difficulty=ai_difficulty,
                language="python",
                websocket_callback=ws_callback,
                user_id=ai_participant.id,
                real_time_simulation=True
            )
        except Exception as ai_error:
            print(f"⚠️ AI opponent failed: {ai_error}")
            # Use fallback AI solution
            result = {
                "code": """import math

def square_root_sum(n):
    total = 0.0
    for i in range(1, n + 1):
        total += math.sqrt(i)
    return round(total)""",
                "language": "python"
            }
            print(f"🔄 Using fallback AI solution")
        
        await ws_callback("typing_status", {"is_typing": False})
        
        print(f"🤖 AI solution generated: {len(result['code'])} chars")
        print(f"🤖 AI solution preview: {result['code'][:100]}...")
        
        # 🚫 REMOVED: AI auto-testing and auto-winning
        # ИИ теперь только показывает код, но НЕ автоматически тестирует и выигрывает
        # Игрок должен сам решать когда тестировать и отправлять свое решение
        
        print(f"✅ AI finished coding. Player can now compete!")
        print(f"🎯 AI will not auto-test or auto-submit. Fair competition!")
            
    except Exception as e:
        print(f"💥 Error in AI simulation: {e}")
        import traceback
        traceback.print_exc()


# Public endpoints (no authentication required)
@public_router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_public_leaderboard(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get public leaderboard - no authentication required"""
    leaderboard = await duel_service.get_leaderboard(db, limit, offset)
    return LeaderboardResponse(**leaderboard)


@public_router.get("/recent-matches")
async def get_public_recent_matches(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get recent matches across all users - public endpoint"""
    try:
        # Get recent completed duels with proper async loading
        from sqlalchemy import select, desc
        from sqlalchemy.orm import selectinload
        from duel_service.models import Duel, DuelParticipant, DuelProblem
        
        query = (
            select(Duel)
            .options(
                selectinload(Duel.participants),
                selectinload(Duel.problem)
            )
            .where(Duel.status == DuelStatus.COMPLETED)
            .order_by(desc(Duel.completed_at))
            .limit(limit)
            .offset(offset)
        )
        
        result = await db.execute(query)
        duels = result.scalars().unique().all()
        
        matches = []
        for duel in duels:
            if len(duel.participants) >= 2:
                winner = next((p for p in duel.participants if p.is_winner), None)
                loser = next((p for p in duel.participants if not p.is_winner and not p.is_ai), None)
                
                if winner:
                    # Create match history item
                    match_data = {
                        "id": str(duel.id),
                        "duel_id": str(duel.id),
                        "opponent_name": "AI Bot" if winner.is_ai else f"User_{str(winner.user_id)[:8]}" if winner.user_id else "Unknown Player",
                        "is_victory": True,  # From winner's perspective
                        "solve_time": f"{winner.solve_duration_seconds}s" if winner.solve_duration_seconds else None,
                        "problem_title": duel.problem.title if duel.problem else "Unknown Problem",
                        "rating_change": (winner.rating_after - winner.rating_before) if (winner.rating_after and winner.rating_before) else None,
                        "played_at": duel.completed_at.isoformat() if duel.completed_at else duel.created_at.isoformat()
                    }
                    matches.append(match_data)
        
        return matches
        
    except Exception as e:
        print(f"❌ Error in get_public_recent_matches: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch recent matches"
        )


async def _test_code_websocket(duel_id: UUID, submission: CodeSubmission, user_id: UUID, db: AsyncSession):
    """Test code for WebSocket context with error handling"""
    try:
        duel = await duel_service.get_duel_by_id(db, duel_id)
        if not duel or not duel.problem:
            return {
                "passed": 0, "failed": 1, "total_tests": 1,
                "execution_time_ms": 0, "error": "Duel or problem not found", "progress_percentage": 0
            }
        
        visible_test_cases = [tc for tc in duel.problem.test_cases if not tc.get('is_hidden', False)]
        
        # **🔥 USE LEETCODE-STYLE RUNNER**
        from shared.app.problems.leetcode_runner import leetcode_runner
        
        result = await leetcode_runner.run_leetcode_test(
            user_code=submission.code,
            problem_title=duel.problem.title,
            test_cases=visible_test_cases
        )
        
        # Convert LeetCodeResult to dict format
        result_dict = {
            "passed": result.passed,
            "failed": result.failed,
            "total_tests": result.total_tests,
            "execution_time_ms": result.execution_time_ms,
            "error": result.error,
            "test_results": result.test_results,
            "is_solution_correct": result.is_solution_correct,
            "progress_percentage": result.progress_percentage
        }
        
        await duel_service.save_code_snapshot(
            db, duel_id, user_id, submission.code, submission.language, result_dict
        )
        
        return result_dict
        
    except Exception as e:
        print(f"Error in _test_code_websocket: {e}")
        return {
            "passed": 0, "failed": 1, "total_tests": 1,
            "execution_time_ms": 0, "error": str(e), "progress_percentage": 0
        }


@router.get("/test-debug")
async def test_debug_endpoint():
    """Debug endpoint for testing"""
    now_utc = datetime.utcnow()
    return {
        "message": "debug works", 
        "utc_time": now_utc.isoformat(),
        "started_at_example": now_utc.isoformat(),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/test-time")
async def test_time_endpoint():
    """Test time handling endpoint"""
    now = datetime.utcnow()
    
    # Simulate what gets sent to frontend
    mock_duel_response = {
        "started_at": now,
        "created_at": now,
        "current_time": now
    }
    
    return {
        "backend_utc_time": now.isoformat(),
        "mock_duel_data": mock_duel_response,
        "timezone_info": "Backend uses UTC, frontend should handle conversion"
    }


@router.get("/ws-stats")
async def get_websocket_stats(
    current_user: JWTUser = Depends(get_current_user)
):
    """Get WebSocket connection statistics for debugging"""
    stats = ws_manager.get_connection_stats()
    return stats


@router.post("/ws-cleanup")
async def trigger_websocket_cleanup(
    current_user: JWTUser = Depends(get_current_user)
):
    """Manually trigger WebSocket cleanup for debugging"""
    await ws_manager.cleanup_broken_connections()
    stats = ws_manager.get_connection_stats()
    return {"message": "Cleanup completed", "stats": stats}


@router.post("/test-code-simple")
async def test_code_simple(submission: CodeSubmission):
    """Simple test code endpoint without authentication"""
    print("🔥🔥🔥 SIMPLE TEST CODE ENDPOINT CALLED!", flush=True)
    print(f"🔥 Code: {submission.code[:100]}...", flush=True)
    
    return {
        "success": True,
        "message": "Simple endpoint works",
        "code_length": len(submission.code),
        "language": submission.language
    }


@public_router.get("/test-simple")
async def test_simple_public():
    """Simplest possible test endpoint"""
    print("🎉🎉🎉 PUBLIC TEST ENDPOINT CALLED!", flush=True)
    return {"message": "Public test works!", "status": "success"}


@router.post("/cancel")
async def cancel_duel(
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
    duel_id: Optional[UUID] = None,
):
    """Cancel a waiting duel"""
    try:
        print(f"🚫 Cancel request: user_id={current_user.id}, duel_id={duel_id}")
        
        result = await duel_service.cancel_duel(db, current_user.id, duel_id)
        
        if result:
            print(f"✅ Duel cancelled successfully")
            return {"message": "Duel cancelled successfully"}
        else:
            print(f"❌ No waiting duel found to cancel")
            raise HTTPException(
                status_code=404,
                detail="No waiting duel found to cancel"
            )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error cancelling duel: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to cancel duel"
        )


# 🚨 ANTI-DUPLICATE SYSTEM ENDPOINTS

@router.post("/report-duplicate", response_model=DuplicateReportResponse)
async def report_duplicate(
    report: DuplicateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """🚨 Пожаловаться на дубликат задачи"""
    try:
        await anti_duplicate_manager.report_duplicate(
            db=db,
            user_id=current_user.id,
            problem_id=report.problem_id,
            feedback=f"[{report.similarity_reason}] {report.feedback}"
        )
        
        return DuplicateReportResponse(
            success=True,
            message="Спасибо за обратную связь! Мы учтём вашу жалобу при генерации будущих задач.",
            reported_at=datetime.utcnow()
        )
        
    except Exception as e:
        print(f"❌ Error reporting duplicate: {e}")
        return DuplicateReportResponse(
            success=False,
            message=f"Ошибка при отправке жалобы: {str(e)}",
            reported_at=datetime.utcnow()
        )


@router.get("/problem-history", response_model=List[ProblemHistoryResponse])
async def get_problem_history(
    current_user: JWTUser = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """📊 История задач пользователя"""
    from sqlalchemy import select, desc
    from duel_service.models import UserProblemHistory
    
    try:
        query = select(UserProblemHistory).where(
            UserProblemHistory.user_id == current_user.id
        ).order_by(desc(UserProblemHistory.used_at)).limit(limit).offset(offset)
        
        result = await db.execute(query)
        history_records = result.scalars().all()
        
        return [
            ProblemHistoryResponse(
                problem_id=record.problem_id,
                problem_title=record.problem_title,
                difficulty=record.difficulty,
                problem_type=record.problem_type,
                solved=record.solved,
                tests_passed=record.tests_passed,
                total_tests=record.total_tests,
                solve_time_seconds=record.solve_time_seconds,
                used_at=record.used_at,
                reported_as_duplicate=record.reported_as_duplicate
            )
            for record in history_records
        ]
        
    except Exception as e:
        print(f"❌ Error getting problem history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get problem history")


@router.get("/anti-duplicate-stats", response_model=AntiDuplicateStatsResponse)
async def get_anti_duplicate_stats(
    db: AsyncSession = Depends(get_db),
    current_user: JWTUser = Depends(get_current_user),
):
    """📈 Статистика анти-дубликатной системы"""
    from sqlalchemy import select, func, desc, and_
    from duel_service.models import UserProblemHistory, DuelProblem
    
    try:
        # Общее количество сыгранных задач
        total_query = select(func.count(UserProblemHistory.id)).where(
            UserProblemHistory.user_id == current_user.id
        )
        total_result = await db.execute(total_query)
        total_problems_played = total_result.scalar() or 0
        
        # Количество уникальных задач
        unique_query = select(func.count(func.distinct(UserProblemHistory.problem_id))).where(
            UserProblemHistory.user_id == current_user.id
        )
        unique_result = await db.execute(unique_query)
        unique_problems_count = unique_result.scalar() or 0
        
        # Количество жалоб на дубликаты
        duplicates_query = select(func.count(UserProblemHistory.id)).where(
            and_(
                UserProblemHistory.user_id == current_user.id,
                UserProblemHistory.reported_as_duplicate == True
            )
        )
        duplicates_result = await db.execute(duplicates_query)
        duplicate_reports_count = duplicates_result.scalar() or 0
        
        # Среднее переиспользование задач
        avg_reuse = total_problems_played / max(unique_problems_count, 1)
        
        # Последняя сыгранная задача
        last_query = select(UserProblemHistory.used_at).where(
            UserProblemHistory.user_id == current_user.id
        ).order_by(desc(UserProblemHistory.used_at)).limit(1)
        last_result = await db.execute(last_query)
        last_problem_played = last_result.scalar()
        
        return AntiDuplicateStatsResponse(
            total_problems_played=total_problems_played,
            unique_problems_count=unique_problems_count,
            duplicate_reports_count=duplicate_reports_count,
            avg_problem_reuse=round(avg_reuse, 2),
            last_problem_played=last_problem_played
        )
        
    except Exception as e:
        print(f"❌ Error getting anti-duplicate stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get anti-duplicate stats")


 