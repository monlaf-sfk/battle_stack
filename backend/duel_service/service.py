import time
import random
import string
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import (
    Duel, DuelParticipant, DuelProblem, PlayerRating,
    DuelCodeSnapshot, PlayerAchievement, DuelMatchHistory,
    DuelStatus, DuelMode, DuelDifficulty, ProblemType,
    PlayerRank, AchievementType
)
from .schemas import (
    DuelCreateRequest, DuelProblemCreate, CodeSubmission,
    DuelResult, TestCase
)
from .ai_problem_generator import ai_problem_generator  # Use new professional instance
from .validated_ai_generator import validated_ai_generator, DifficultyLevel  # Import validated generator
from .ai_opponent import ai_opponent  # Use new professional instance
from .anti_duplicate import anti_duplicate_manager, ProblemFingerprint  # 🧱 Anti-duplicate system

# Import the shared code runner
try:
    from shared.app.problems.code_runner import code_runner
except ImportError:
    # Fallback if import fails
    code_runner = None

from shared.app.problems.code_runner import CodeRunner, CodeExecutionResult
from shared.app.problems.leetcode_runner import leetcode_runner, LeetCodeResult
from shared.app.problems.sandbox_runner import sandbox_runner, SandboxResult
from shared.app.problems.schemas import TestResult

from fastapi import BackgroundTasks


class DuelService:
    """
    🏆 ПРОФЕССИОНАЛЬНЫЙ сервис дуэлей с:
    - Интеграцией профессионального генератора задач
    - Умным ИИ-оппонентом
    - Универсальным runner для любых функций
    - Продуманными тестами и метриками
    """
    
    def __init__(self):
        self.ai_generator = ai_problem_generator  # Professional instance
        self.ai_opponent = ai_opponent  # Professional instance
        print("✅ Professional Duel Service initialized with advanced AI components")
    
    @staticmethod
    def generate_room_code() -> str:
        """Generate a unique room code for private duels"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    async def get_active_duel(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[Duel]:
        """Get user's active duel if any"""
        # First get participant records for this user
        participant_query = select(DuelParticipant.duel_id).where(
            DuelParticipant.user_id == user_id
        )
        participant_result = await db.execute(participant_query)
        duel_ids = [row for row in participant_result.scalars().all()]
        
        if not duel_ids:
            return None
        
        # Then get active duels from those IDs - take the most recent one
        query = select(Duel).where(
            and_(
                Duel.id.in_(duel_ids),
                Duel.status.in_([DuelStatus.WAITING, DuelStatus.IN_PROGRESS])
            )
        ).options(
            selectinload(Duel.participants),
            selectinload(Duel.problem)
        ).order_by(Duel.created_at.desc())  # Order by most recent first
        
        result = await db.execute(query)
        return result.scalars().first()  # Use first() instead of scalar_one_or_none()
    
    async def get_duel_by_id(
        self,
        db: AsyncSession,
        duel_id: UUID
    ) -> Optional[Duel]:
        """Get duel by ID with all related data"""
        query = select(Duel).where(Duel.id == duel_id).options(
            selectinload(Duel.participants),
            selectinload(Duel.problem),
            selectinload(Duel.code_snapshots)
        )
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def save_code_snapshot(
        self,
        db: AsyncSession,
        duel_id: UUID,
        user_id: UUID,
        code: str,
        language: str,
        test_results: Dict[str, Any]
    ):
        """Save a code snapshot with test results"""
        snapshot = DuelCodeSnapshot(
            duel_id=duel_id,
            user_id=user_id,
            code=code,
            language=language,
            tests_passed=test_results.get('passed', 0),
            tests_failed=test_results.get('failed', 0),
            execution_time_ms=test_results.get('execution_time_ms'),
            error_message=test_results.get('error')
        )
        db.add(snapshot)
        await db.commit()
        return snapshot
    
    async def get_latest_code_snapshots(
        self,
        duel_id: UUID,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get latest code snapshots for all participants"""
        if not db:
            return {}
        
        query = select(DuelCodeSnapshot).where(
            DuelCodeSnapshot.duel_id == duel_id
        ).order_by(DuelCodeSnapshot.timestamp.desc())
        
        result = await db.execute(query)
        snapshots = result.scalars().all()
        
        # Group by user_id and get the latest for each
        latest_snapshots = {}
        for snapshot in snapshots:
            user_id_str = str(snapshot.user_id)
            if user_id_str not in latest_snapshots:
                latest_snapshots[user_id_str] = {
                    "code": snapshot.code,
                    "language": snapshot.language,
                    "tests_passed": snapshot.tests_passed,
                    "tests_failed": snapshot.tests_failed,
                    "timestamp": snapshot.timestamp.isoformat(),
                    "error_message": snapshot.error_message
                }
        
        return latest_snapshots
    
    async def complete_duel_with_winner(
        self,
        db: AsyncSession,
        duel_id: UUID,
        winner_user_id: UUID
    ) -> Dict[str, Any]:
        """Complete duel with specific winner and return result data"""
        duel = await self.get_duel_by_id(db, duel_id)
        if not duel:
            raise ValueError("Duel not found")
        
        # Find winner and mark them
        winner_participant = None
        for participant in duel.participants:
            if participant.user_id == winner_user_id:
                participant.is_winner = True
                participant.submission_time = datetime.utcnow()
                if duel.started_at:
                    participant.solve_duration_seconds = int(
                        (participant.submission_time - duel.started_at).total_seconds()
                    )
                winner_participant = participant
                break
        
        if not winner_participant:
            raise ValueError("Winner not found in duel participants")
        
        # Complete the duel
        await self.complete_duel(db, duel)
        
        # Prepare result data
        loser_participant = next(
            (p for p in duel.participants if p.user_id != winner_user_id), 
            None
        )
        
        result_data = {
            "duel_id": str(duel_id),
            "winner_id": str(winner_user_id),
            "winner_username": f"User_{str(winner_user_id)[:8]}",
            "winner_solve_time": f"{winner_participant.solve_duration_seconds // 60}:{winner_participant.solve_duration_seconds % 60:02d}",
            "winner_rating_change": winner_participant.rating_change or 0
        }
        
        if loser_participant:
            result_data.update({
                "loser_id": str(loser_participant.user_id) if loser_participant.user_id else None,
                "loser_username": "AI Bot" if loser_participant.is_ai else f"User_{str(loser_participant.user_id)[:8]}",
                "loser_solve_time": None,
                "loser_rating_change": loser_participant.rating_change or 0
            })
        
        return result_data
    
    async def get_match_history(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get match history for user"""
        query = select(DuelMatchHistory).where(
            DuelMatchHistory.user_id == user_id
        ).order_by(
            DuelMatchHistory.played_at.desc()
        ).limit(limit).offset(offset)
        
        result = await db.execute(query)
        matches = result.scalars().all()
        
        match_history = []
        for match in matches:
            match_history.append({
                "id": str(match.id),
                "duel_id": str(match.duel_id),
                "opponent_username": match.opponent_username,
                "is_winner": match.is_victory,
                "rating_change": match.rating_change,
                "problem_title": match.problem_title,
                "solve_time_seconds": match.solve_time_seconds,
                "played_at": match.played_at.isoformat()
            })
        
        return match_history
    
    async def create_duel(
        self,
        db: AsyncSession,
        user_id: UUID,
        request: DuelCreateRequest
    ) -> Duel:
        """Create a new duel"""
        # Check if user already has an active duel
        existing_duel = await self.get_active_duel(db, user_id)
        if existing_duel:
            # Cancel old waiting duel if exists
            if existing_duel.status == DuelStatus.WAITING:
                existing_duel.status = DuelStatus.CANCELLED
                existing_duel.completed_at = datetime.utcnow()
                await db.commit()
                print(f"🚫 Cancelled old waiting duel {existing_duel.id} for user {user_id}")
            else:
                # Return existing active duel if it's in progress
                print(f"⚠️ User {user_id} already has active duel {existing_duel.id}")
                return existing_duel
        
        # Generate room code for private rooms
        room_code = None
        if request.mode == DuelMode.PRIVATE_ROOM:
            room_code = self.generate_room_code()
        
        # Create duel
        duel = Duel(
            mode=request.mode,
            difficulty=request.difficulty,
            problem_type=request.problem_type,
            room_code=room_code,
            status=DuelStatus.WAITING
        )
        db.add(duel)
        await db.flush()
        
        # Create player rating if doesn't exist
        player_rating = await self.get_or_create_player_rating(db, user_id)
        
        # Add creator as participant
        participant = DuelParticipant(
            duel_id=duel.id,
            user_id=user_id,
            rating_before=player_rating.elo_rating
        )
        db.add(participant)
        
        # For AI opponent mode, immediately add AI participant
        if request.mode == DuelMode.AI_OPPONENT:
            ai_participant = DuelParticipant(
                duel_id=duel.id,
                is_ai=True,
                ai_difficulty=request.difficulty
            )
            db.add(ai_participant)
            
            # 🧱 Generate problem with anti-duplicate for user (not AI)
            problem = await self.generate_problem(db, request.difficulty, request.problem_type, [user_id])
            duel.problem_id = problem.id
            duel.status = DuelStatus.IN_PROGRESS
            duel.started_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(duel)
        
        return duel
    
    async def join_duel(
        self,
        db: AsyncSession,
        user_id: UUID,
        room_code: Optional[str] = None,
        difficulty: Optional[DuelDifficulty] = None
    ) -> Optional[Duel]:
        """Join an existing duel with improved matchmaking"""
        # Check if user already has an active duel
        existing_duel = await self.get_active_duel(db, user_id)
        if existing_duel:
            # Cancel old waiting duel if exists
            if existing_duel.status == DuelStatus.WAITING:
                existing_duel.status = DuelStatus.CANCELLED
                existing_duel.completed_at = datetime.utcnow()
                await db.commit()
                print(f"🚫 Cancelled old waiting duel {existing_duel.id} for user {user_id} before joining new one")
            else:
                # Don't allow joining new duel if already in progress
                print(f"⚠️ User {user_id} already has active duel {existing_duel.id} in progress")
                raise ValueError("You already have an active duel in progress")
        
        if room_code:
            # Join private room
            query = select(Duel).where(
                and_(
                    Duel.room_code == room_code,
                    Duel.status == DuelStatus.WAITING
                )
            )
        else:
            # Find random opponent with difficulty matching
            base_conditions = [
                Duel.mode == DuelMode.RANDOM_PLAYER,
                Duel.status == DuelStatus.WAITING
            ]
            
            # Add difficulty filter if specified
            if difficulty:
                base_conditions.append(Duel.difficulty == difficulty)
            
            # Order by creation time to be fair (FIFO)
            query = select(Duel).where(
                and_(*base_conditions)
            ).order_by(Duel.created_at)
        
        # Use FOR UPDATE to prevent race conditions
        query = query.with_for_update()
        result = await db.execute(query.options(selectinload(Duel.participants)))
        
        # Try to find suitable duels
        duels = result.scalars().all()
        suitable_duel = None
        
        for duel in duels:
            # Check if user is already in this duel
            if any(p.user_id == user_id for p in duel.participants):
                continue
                
            # Check if duel has space (should have exactly 1 participant for random duels)
            if len(duel.participants) == 1:
                suitable_duel = duel
                break
        
        if not suitable_duel:
            return None
        
        print(f"🎯 Found suitable duel {suitable_duel.id} for user {user_id}")
        
        # Get player rating
        player_rating = await self.get_or_create_player_rating(db, user_id)
        
        # Add user as participant
        participant = DuelParticipant(
            duel_id=suitable_duel.id,
            user_id=user_id,
            rating_before=player_rating.elo_rating
        )
        db.add(participant)
        
        # 🧱 Generate problem with anti-duplicate system
        # Get all participant user_ids for filtering
        all_user_ids = [p.user_id for p in suitable_duel.participants if p.user_id] + [user_id]
        problem = await self.generate_problem(db, suitable_duel.difficulty, suitable_duel.problem_type, all_user_ids)
        
        # Save problem_id immediately to avoid lazy loading issues
        problem_id = problem.id
        suitable_duel.problem_id = problem_id
        suitable_duel.status = DuelStatus.IN_PROGRESS
        suitable_duel.started_at = datetime.utcnow()
        
        # 🔧 Extract duel ID before commit to avoid greenlet issues
        duel_id = suitable_duel.id
        
        await db.commit()
        await db.refresh(suitable_duel)
        
        print(f"✅ User {user_id} joined duel {duel_id}, duel started!")
        return suitable_duel
    
    async def generate_problem(
        self,
        db: AsyncSession,
        difficulty: DuelDifficulty,
        problem_type: ProblemType,
        user_ids: Optional[List[UUID]] = None
    ) -> DuelProblem:
        """🔧 IMPROVED: Check for existing problem first, then create unique if needed"""
        print(f"🔧 IMPROVED: Creating or reusing simple problem for testing")
        
        # First, try to find existing problem with this fingerprint
        existing_query = select(DuelProblem).where(
            DuelProblem.fingerprint == "fixed_problem_12345"
        )
        result = await db.execute(existing_query)
        existing_problem = result.scalar_one_or_none()
        
        if existing_problem:
            # Extract values BEFORE commit to avoid greenlet issues
            problem_title = existing_problem.title
            problem_id = existing_problem.id
            
            print(f"✅ Reusing existing problem: {problem_title} (ID: {problem_id})")
            # Update usage stats
            existing_problem.times_used += 1
            existing_problem.last_used_at = datetime.utcnow()
            await db.commit()
            return existing_problem
        
        # Create a new problem with unique fingerprint
        import time
        import random
        unique_suffix = f"_{int(time.time())}_{random.randint(1000, 9999)}"
        unique_fingerprint = f"fixed_problem{unique_suffix}"
        
        problem = DuelProblem(
            title="Simple Array Sum",
            description="Find the sum of all elements in an array.",
            difficulty=difficulty,
            problem_type=problem_type,
            fingerprint=unique_fingerprint,
            starter_code={"python": "def solve(arr):\n    # TODO: Implement your solution\n    pass"},
            test_cases=[
                {"input": [1, 2, 3], "output": 6, "is_hidden": False, "description": "Simple test"},
                {"input": [10, 20], "output": 30, "is_hidden": False, "description": "Another test"}
            ],
            constraints="1 ≤ n ≤ 1000",
            hints=["Use a loop or built-in sum function"],
            ai_generated=False,
            generation_prompt="Fixed test problem",
            last_used_at=datetime.utcnow()
        )
        
        try:
            db.add(problem)
            await db.flush()
            
            # Extract ID before refresh
            problem_id = problem.id
            
            await db.refresh(problem)
            
            print(f"✅ Created new problem with unique fingerprint: {unique_fingerprint} (ID: {problem_id})")
            return problem
            
        except Exception as e:
            print(f"❌ Error creating problem: {e}")
            # Rollback and re-raise
            await db.rollback()
            raise
    
    async def _generate_basic_problem(
        self,
        db: AsyncSession,
        difficulty: DuelDifficulty,
        problem_type: ProblemType
    ) -> DuelProblem:
        """🔄 Basic problem generation for backward compatibility"""
        try:
            # Simple reuse logic (30% chance)
            should_reuse = random.random() < 0.3
            
            if should_reuse:
                query = select(DuelProblem).where(
                    and_(
                        DuelProblem.difficulty == difficulty,
                        DuelProblem.problem_type == problem_type,
                        DuelProblem.times_used < 3
                    )
                ).order_by(func.random()).limit(1)
                
                result = await db.execute(query)
                problem = result.scalar_one_or_none()
                
                if problem:
                    # 🔧 Extract attributes before any database operations
                    problem_title = problem.title
                    
                    problem.times_used += 1
                    problem.last_used_at = datetime.utcnow()
                    await db.commit()
                    await db.refresh(problem)
                    print(f"♻️ BASIC: Reusing problem '{problem_title}'")
                    return problem
            
            # Generate new problem using validated AI generator
            print(f"🆕 BASIC: Generating new problem...")
            
            difficulty_mapping = {
                DuelDifficulty.EASY: DifficultyLevel.EASY,
                DuelDifficulty.MEDIUM: DifficultyLevel.MEDIUM,
                DuelDifficulty.HARD: DifficultyLevel.HARD
            }
            validated_difficulty = difficulty_mapping.get(difficulty, DifficultyLevel.MEDIUM)
            
            try:
                generated_problem = await validated_ai_generator.generate_validated_problem(
                    difficulty=validated_difficulty,
                    language="python",
                    topic=problem_type.value if problem_type else None
                )
                
                if generated_problem.validation_passed:
                    # Calculate fingerprint
                    problem_data = {
                        "title": generated_problem.title,
                        "description": generated_problem.description,
                        "starter_code": generated_problem.starter_code,
                        "input_format": generated_problem.input_format,
                        "difficulty": difficulty.value,
                        "problem_type": problem_type.value
                    }
                    fingerprint = ProblemFingerprint.calculate_fingerprint(problem_data)
                    
                    # 🔧 Transform basic test cases format: expected -> output  
                    basic_test_cases = []
                    for test_case in generated_problem.test_cases:
                        basic_test_cases.append({
                            "input": test_case.get("input"),
                            "output": test_case.get("expected"),  # Use 'expected' as 'output'
                            "is_hidden": test_case.get("is_hidden", False),
                            "description": test_case.get("description", "")
                        })
                    
                    # 🔧 Transform starter_code to JSON format if it's a string
                    basic_starter_code = generated_problem.starter_code
                    if isinstance(basic_starter_code, str):
                        basic_starter_code = {"python": basic_starter_code}

                    problem = DuelProblem(
                        title=generated_problem.title,
                        description=generated_problem.description,
                        difficulty=difficulty,
                        problem_type=problem_type,
                        fingerprint=fingerprint,
                        starter_code=basic_starter_code,
                        test_cases=basic_test_cases,  # 🔧 Use transformed format
                        constraints=generated_problem.input_format.get('constraints', ''),
                        hints=None,
                        ai_generated=True,
                        generation_prompt=f"Basic {difficulty.value} {problem_type.value} problem",
                        last_used_at=datetime.utcnow()
                    )
                    
                    db.add(problem)
                    await db.flush()
                    
                    # 🔧 Extract attributes before refresh to avoid greenlet issues
                    problem_title = problem.title
                    
                    await db.refresh(problem)
                    
                    print(f"✅ BASIC: Generated problem '{problem_title}' with fingerprint {fingerprint[:8]}...")
                    return problem
            
            except Exception as e:
                print(f"⚠️ Basic generation failed: {e}")
                raise e
                
        except Exception as e:
            print(f"❌ Error in basic problem generation: {e}")
            raise e
    
    async def submit_code(
        self,
        db: AsyncSession,
        duel_id: UUID,
        user_id: UUID,
        submission: CodeSubmission
    ) -> Dict[str, Any]:
        """Submit code for testing"""
        # Get duel and participant
        query = select(Duel).where(Duel.id == duel_id).options(
            selectinload(Duel.participants),
            selectinload(Duel.problem)
        )
        result = await db.execute(query)
        duel = result.scalar_one_or_none()
        
        if not duel or duel.status != DuelStatus.IN_PROGRESS:
            raise ValueError("Invalid duel or duel not in progress")
        
        participant = next((p for p in duel.participants if p.user_id == user_id), None)
        if not participant:
            # Debug: Print participant information
            print(f"❌ User {user_id} not found in duel participants")
            print(f"   Duel ID: {duel_id}")
            print(f"   Duel participants:")
            for i, p in enumerate(duel.participants):
                print(f"     {i+1}. user_id={p.user_id} (type: {type(p.user_id)}), is_ai={p.is_ai}")
            print(f"   Current user_id={user_id} (type: {type(user_id)})")
            
            # Try string comparison as fallback
            participant = next((p for p in duel.participants if str(p.user_id) == str(user_id)), None)
            if participant:
                print(f"✅ Found participant using string comparison!")
            else:
                raise ValueError("User not a participant in this duel")
        
        # **🐳 USE PROFESSIONAL SANDBOX RUNNER**
        print(f"🐳 Running SECURE SANDBOX tests for problem: {duel.problem.title}")
        
        try:
            # Try sandbox execution first (Docker isolation)
            sandbox_result = await sandbox_runner.run_code_securely(
                user_code=submission.code,
                test_cases=duel.problem.test_cases,
                language=submission.language,
                problem_title=duel.problem.title
            )
            
            # Convert SandboxResult to dict format
            results_dict = {
                "passed": sandbox_result.passed,
                "failed": sandbox_result.failed,
                "total_tests": sandbox_result.total_tests,
                "execution_time_ms": sandbox_result.execution_time_ms,
                "error": sandbox_result.error,
                "test_results": sandbox_result.test_results,
                "is_solution_correct": sandbox_result.is_solution_correct,
                "progress_percentage": (sandbox_result.passed / sandbox_result.total_tests * 100) if sandbox_result.total_tests > 0 else 0
            }
            
            print(f"🛡️ Sandbox execution completed: {sandbox_result.passed}/{sandbox_result.total_tests} passed")
            
        except Exception as sandbox_error:
            print(f"⚠️ Sandbox execution failed: {sandbox_error}")
            print(f"🔄 Falling back to LeetCode runner...")
            
            # Fallback to LeetCode runner if sandbox fails
            test_result = await leetcode_runner.run_leetcode_test(
                user_code=submission.code,
                problem_title=duel.problem.title,
                test_cases=duel.problem.test_cases
            )
            
            # Convert LeetCodeResult to dict format
            results_dict = {
                "passed": test_result.passed,
                "failed": test_result.failed,
                "total_tests": test_result.total_tests,
                "execution_time_ms": test_result.execution_time_ms,
                "error": test_result.error,
                "test_results": test_result.test_results,
                "is_solution_correct": test_result.is_solution_correct,
                "progress_percentage": test_result.progress_percentage
            }
            
            print(f"✅ LeetCode fallback completed: {test_result.passed}/{test_result.total_tests} passed")
        
        # Save code snapshot
        snapshot = DuelCodeSnapshot(
            duel_id=duel_id,
            user_id=user_id,
            code=submission.code,
            language=submission.language,
            tests_passed=results_dict.get('passed', 0),
            tests_failed=results_dict.get('failed', 0),
            execution_time_ms=results_dict.get('execution_time_ms'),
            error_message=results_dict.get('error')
        )
        db.add(snapshot)
        
        # Check if all tests passed
        total_tests = len(duel.problem.test_cases)
        if results_dict.get('passed', 0) == total_tests and results_dict.get('failed', 0) == 0:
            # User solved the problem
            participant.is_winner = True
            participant.submission_time = datetime.utcnow()
            participant.solve_duration_seconds = int(
                (participant.submission_time - duel.started_at).total_seconds()
            )
            participant.tests_passed = results_dict.get('passed', 0)
            participant.total_tests = total_tests
            participant.final_code = submission.code
            
            # Mark as solution correct
            results_dict['is_solution_correct'] = True
            
            # Complete the duel (includes commit)
            await self.complete_duel(db, duel)
        else:
            # Just commit the snapshot if not all tests passed
            await db.commit()
        
        return results_dict
    
    async def test_code(
        self,
        db: AsyncSession,
        duel_id: UUID,
        user_id: UUID,
        code: str,
        language: str = "python"
    ) -> Dict[str, Any]:
        """Test user code against problem test cases - LeetCode style"""
        print(f"🧪 Test code request: duel_id={duel_id}, user_id={user_id}")
        print(f"📝 Code length: {len(code)}, language: {language}")
        
        try:
            # Get duel and problem
            query = select(Duel).where(Duel.id == duel_id).options(
                selectinload(Duel.problem)
            )
            result = await db.execute(query)
            duel = result.scalar_one_or_none()
            
            if not duel:
                raise ValueError("Duel not found")
            
            if not duel.problem:
                raise ValueError("Problem not found for duel")
            
            print(f"✅ Found duel and problem: {duel.problem.title}")
            print(f"📊 Test cases: {len(duel.problem.test_cases)}")
            
            # **🐳 USE PROFESSIONAL SANDBOX RUNNER**
            try:
                # Try sandbox execution first (Docker isolation)
                sandbox_result = await sandbox_runner.run_code_securely(
                    user_code=code,
                    test_cases=duel.problem.test_cases,
                    language=language,
                    problem_title=duel.problem.title
                )
                
                # Convert SandboxResult to dict format
                test_result = {
                    "passed": sandbox_result.passed,
                    "failed": sandbox_result.failed,
                    "total_tests": sandbox_result.total_tests,
                    "execution_time_ms": sandbox_result.execution_time_ms,
                    "error": sandbox_result.error,
                    "test_results": sandbox_result.test_results,
                    "is_solution_correct": sandbox_result.is_solution_correct,
                    "progress_percentage": (sandbox_result.passed / sandbox_result.total_tests * 100) if sandbox_result.total_tests > 0 else 0
                }
                
                print(f"🛡️ Sandbox test completed: {sandbox_result.passed}/{sandbox_result.total_tests} passed")
                
            except Exception as sandbox_error:
                print(f"⚠️ Sandbox test failed: {sandbox_error}")
                print(f"🔄 Falling back to LeetCode runner...")
                
                # Fallback to LeetCode runner if sandbox fails
                result = await leetcode_runner.run_leetcode_test(
                    user_code=code,
                    problem_title=duel.problem.title,
                    test_cases=duel.problem.test_cases
                )
                
                # Convert LeetCodeResult to dict format
                test_result = {
                    "passed": result.passed,
                    "failed": result.failed,
                    "total_tests": result.total_tests,
                    "execution_time_ms": result.execution_time_ms,
                    "error": result.error,
                    "test_results": result.test_results,
                    "is_solution_correct": result.is_solution_correct,
                    "progress_percentage": result.progress_percentage
                }
                
                print(f"✅ LeetCode fallback completed: {result.passed}/{result.total_tests} passed")
            
            print(f"📊 Test results: {result.passed}/{result.total_tests} passed")
            return test_result
            
        except Exception as e:
            print(f"❌ Error in test_code: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise e
    
    async def run_tests(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Run test cases against submitted code (fallback implementation)"""
        # This would integrate with the code runner service
        # For now, return mock results
        passed = random.randint(0, len(test_cases))
        failed = len(test_cases) - passed
        
        return {
            "passed": passed,
            "failed": failed,
            "total_tests": len(test_cases),
            "execution_time_ms": random.randint(10, 1000),
            "error": None if random.random() > 0.3 else "Sample error",
            "is_solution_correct": passed == len(test_cases) and failed == 0,
            "progress_percentage": (passed / len(test_cases) * 100) if test_cases else 0
        }
    
    async def complete_duel(self, db: AsyncSession, duel: Duel):
        """📝 Complete a duel, update ratings, and record problem usage in anti-duplicate system"""
        # Save duel.id before any database operations to avoid lazy loading issues
        duel_id = duel.id
        print(f"🏁 Completing duel {duel_id}...")
        
        duel.status = DuelStatus.COMPLETED
        duel.completed_at = datetime.utcnow()
        duel.duration_seconds = int((duel.completed_at - duel.started_at).total_seconds())
        
        print(f"✅ Duel {duel_id} marked as COMPLETED at {duel.completed_at}")
        
        # 📝 ANTI-DUPLICATE: Record problem usage for all participants
        if duel.problem:
            for participant in duel.participants:
                if participant.user_id and not participant.is_ai:  # Only record for real users
                    # 🔧 TEMPORARILY DISABLE record_problem_usage
                    # await anti_duplicate_manager.record_problem_usage(
                    #     db=db,
                    #     user_id=participant.user_id,
                    #     problem=duel.problem,
                    #     duel_id=duel_id,
                    #     solved=participant.is_winner,
                    #     tests_passed=participant.tests_passed,
                    #     total_tests=participant.total_tests,
                    #     solve_time_seconds=participant.solve_duration_seconds
                    # )
                    print(f"📝 Would record problem usage for user {str(participant.user_id)[:8]} (disabled)")
        
        # Find winner and loser
        winner = next((p for p in duel.participants if p.is_winner), None)
        loser = next((p for p in duel.participants if not p.is_winner), None)
        
        if winner and loser and not winner.is_ai and not loser.is_ai:
            print(f"👑 Winner: {winner.user_id}, Loser: {loser.user_id}")
            
            # Update ELO ratings
            await self.update_ratings(db, winner, loser)
            
            # Update match history
            await self.update_match_history(db, duel, winner, loser)
            
            # Check achievements
            await self.check_achievements(db, winner.user_id)
        
        # 🚨 CRITICAL: Commit the completion to database
        await db.commit()
        print(f"💾 Duel {duel_id} completion committed to database")
        
        # Ensure fresh state for next query
        await db.refresh(duel)
    
    async def update_ratings(
        self,
        db: AsyncSession,
        winner: DuelParticipant,
        loser: DuelParticipant
    ):
        """Update ELO ratings after a duel"""
        K = 32  # K-factor for ELO calculation
        
        # Get player ratings
        winner_rating = await self.get_or_create_player_rating(db, winner.user_id)
        loser_rating = await self.get_or_create_player_rating(db, loser.user_id)
        
        # Calculate expected scores
        winner_expected = 1 / (1 + 10 ** ((loser_rating.elo_rating - winner_rating.elo_rating) / 400))
        loser_expected = 1 / (1 + 10 ** ((winner_rating.elo_rating - loser_rating.elo_rating) / 400))
        
        # Calculate new ratings
        winner_new_rating = winner_rating.elo_rating + K * (1 - winner_expected)
        loser_new_rating = loser_rating.elo_rating + K * (0 - loser_expected)
        
        # Update winner stats
        winner_rating.elo_rating = int(winner_new_rating)
        winner_rating.wins += 1
        winner_rating.total_duels += 1
        winner_rating.current_streak += 1
        winner_rating.best_streak = max(winner_rating.best_streak, winner_rating.current_streak)
        winner_rating.last_duel_at = datetime.utcnow()
        winner_rating.experience_points += 100  # XP for winning
        
        # Update loser stats
        loser_rating.elo_rating = int(loser_new_rating)
        loser_rating.losses += 1
        loser_rating.total_duels += 1
        loser_rating.current_streak = 0
        loser_rating.last_duel_at = datetime.utcnow()
        loser_rating.experience_points += 25  # XP for participating
        
        # Update participant records
        winner.rating_after = winner_rating.elo_rating
        winner.rating_change = winner_rating.elo_rating - winner.rating_before
        
        loser.rating_after = loser_rating.elo_rating
        loser.rating_change = loser_rating.elo_rating - loser.rating_before
        
        # Update ranks
        winner_rating.rank = self.calculate_rank(winner_rating.elo_rating)
        loser_rating.rank = self.calculate_rank(loser_rating.elo_rating)
        
        # Update average solve times
        if winner.solve_duration_seconds:
            if winner_rating.average_solve_time:
                winner_rating.average_solve_time = (
                    winner_rating.average_solve_time * (winner_rating.wins - 1) + 
                    winner.solve_duration_seconds
                ) / winner_rating.wins
            else:
                winner_rating.average_solve_time = winner.solve_duration_seconds
            
            if not winner_rating.fastest_solve_time or winner.solve_duration_seconds < winner_rating.fastest_solve_time:
                winner_rating.fastest_solve_time = winner.solve_duration_seconds
    
    async def update_match_history(
        self,
        db: AsyncSession,
        duel: Duel,
        winner: DuelParticipant,
        loser: DuelParticipant
    ):
        """Update match history for both players"""
        # Winner's history
        winner_history = DuelMatchHistory(
            user_id=winner.user_id,
            duel_id=duel.id,
            opponent_id=loser.user_id if not loser.is_ai else None,
            opponent_name="AI Bot" if loser.is_ai else f"User_{str(loser.user_id)[:8]}",
            is_victory=True,
            solve_time=f"{winner.solve_duration_seconds // 60}:{winner.solve_duration_seconds % 60:02d}",
            problem_title=duel.problem.title,
            rating_change=winner.rating_change
        )
        db.add(winner_history)
        
        # Loser's history
        if not loser.is_ai:
            loser_history = DuelMatchHistory(
                user_id=loser.user_id,
                duel_id=duel.id,
                opponent_id=winner.user_id,
                opponent_name=f"User_{str(winner.user_id)[:8]}",
                is_victory=False,
                solve_time=f"{loser.solve_duration_seconds // 60}:{loser.solve_duration_seconds % 60:02d}" if loser.solve_duration_seconds else None,
                problem_title=duel.problem.title,
                rating_change=loser.rating_change
            )
            db.add(loser_history)
    
    async def check_achievements(self, db: AsyncSession, user_id: UUID):
        """Check and award achievements"""
        rating = await self.get_or_create_player_rating(db, user_id)
        
        # First Victory
        if rating.wins == 1:
            await self.award_achievement(db, rating.id, AchievementType.FIRST_VICTORY)
        
        # Speed Demon - solve in under 2 minutes
        if rating.fastest_solve_time and rating.fastest_solve_time < 120:
            await self.award_achievement(db, rating.id, AchievementType.SPEED_DEMON)
        
        # Winning Streak
        if rating.current_streak >= 5:
            await self.award_achievement(db, rating.id, AchievementType.WINNING_STREAK)
        
        # Perfect Week - 7 wins in 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = select(func.count(DuelMatchHistory.id)).where(
            and_(
                DuelMatchHistory.user_id == user_id,
                DuelMatchHistory.is_victory == True,
                DuelMatchHistory.played_at >= week_ago
            )
        )
        result = await db.execute(query)
        recent_wins = result.scalar()
        
        if recent_wins >= 7:
            await self.award_achievement(db, rating.id, AchievementType.PERFECT_WEEK)
    
    async def award_achievement(
        self,
        db: AsyncSession,
        player_rating_id: UUID,
        achievement_type: AchievementType
    ):
        """Award achievement to player"""
        # Check if already has this achievement
        query = select(PlayerAchievement).where(
            and_(
                PlayerAchievement.player_rating_id == player_rating_id,
                PlayerAchievement.achievement_type == achievement_type
            )
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        
        if not existing:
            achievement = PlayerAchievement(
                player_rating_id=player_rating_id,
                achievement_type=achievement_type,
                progress=100,
                target=100
            )
            db.add(achievement)
    
    async def get_or_create_player_rating(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> PlayerRating:
        """Get or create player rating"""
        query = select(PlayerRating).where(PlayerRating.user_id == user_id)
        result = await db.execute(query)
        rating = result.scalar_one_or_none()
        
        if not rating:
            rating = PlayerRating(user_id=user_id)
            db.add(rating)
            await db.flush()
        
        return rating
    
    @staticmethod
    def calculate_rank(elo_rating: int) -> PlayerRank:
        """Calculate rank based on ELO rating"""
        if elo_rating >= 2400:
            return PlayerRank.GRANDMASTER
        elif elo_rating >= 2200:
            return PlayerRank.MASTER
        elif elo_rating >= 2000:
            return PlayerRank.DIAMOND
        elif elo_rating >= 1800:
            return PlayerRank.PLATINUM_III
        elif elo_rating >= 1700:
            return PlayerRank.PLATINUM_II
        elif elo_rating >= 1600:
            return PlayerRank.PLATINUM_I
        elif elo_rating >= 1500:
            return PlayerRank.GOLD_III
        elif elo_rating >= 1400:
            return PlayerRank.GOLD_II
        elif elo_rating >= 1300:
            return PlayerRank.GOLD_I
        elif elo_rating >= 1200:
            return PlayerRank.SILVER_III
        elif elo_rating >= 1100:
            return PlayerRank.SILVER_II
        elif elo_rating >= 1000:
            return PlayerRank.SILVER_I
        elif elo_rating >= 900:
            return PlayerRank.BRONZE_III
        elif elo_rating >= 800:
            return PlayerRank.BRONZE_II
        else:
            return PlayerRank.BRONZE_I
    
    async def get_player_stats(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get comprehensive player statistics"""
        # Get player rating
        rating = await self.get_or_create_player_rating(db, user_id)
        
        # Get recent matches
        recent_matches_query = select(DuelMatchHistory).where(
            DuelMatchHistory.user_id == user_id
        ).order_by(DuelMatchHistory.played_at.desc()).limit(10)
        
        recent_result = await db.execute(recent_matches_query)
        recent_matches = recent_result.scalars().all()
        
        # Get achievements
        achievements_query = select(PlayerAchievement).where(
            PlayerAchievement.player_rating_id == rating.id
        )
        
        achievements_result = await db.execute(achievements_query)
        achievements = achievements_result.scalars().all()
        
        return {
            "rating": {
                "user_id": rating.user_id,
                "elo_rating": rating.elo_rating,
                "rank": rating.rank,
                "total_duels": rating.total_duels,
                "wins": rating.wins,
                "losses": rating.losses,
                "draws": rating.draws,
                "win_rate": rating.win_rate,
                "current_streak": rating.current_streak,
                "best_streak": rating.best_streak,
                "average_solve_time": rating.average_solve_time,
                "experience_points": rating.experience_points,
                "level": rating.level
            },
            "recent_matches": [
                {
                    "id": match.id,
                    "duel_id": match.duel_id,
                    "opponent_name": match.opponent_name,
                    "is_victory": match.is_victory,
                    "solve_time": match.solve_time,
                    "problem_title": match.problem_title,
                    "rating_change": match.rating_change,
                    "played_at": match.played_at
                }
                for match in recent_matches
            ],
            "achievements": [
                {
                    "achievement_type": achievement.achievement_type,
                    "unlocked_at": achievement.unlocked_at,
                    "progress": achievement.progress,
                    "target": achievement.target
                }
                for achievement in achievements
            ]
        }
    
    async def get_leaderboard(
        self,
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get global leaderboard"""
        # Get top players
        query = select(PlayerRating).order_by(
            PlayerRating.elo_rating.desc()
        ).limit(limit).offset(offset)
        
        result = await db.execute(query)
        players = result.scalars().all()
        
        # Get total player count
        count_query = select(func.count(PlayerRating.id))
        count_result = await db.execute(count_query)
        total_players = count_result.scalar()
        
        entries = []
        for idx, player in enumerate(players):
            entries.append({
                "rank": offset + idx + 1,
                "user_id": player.user_id,
                "username": f"User_{str(player.user_id)[:8]}",
                "elo_rating": player.elo_rating,
                "player_rank": player.rank,
                "win_rate": player.win_rate,
                "total_duels": player.total_duels,
                "current_streak": player.current_streak
            })
        
        return {
            "entries": entries,
            "total_players": total_players,
            "your_rank": None  # Would need to calculate user's rank
        }
    
    async def create_ai_duel(
        self,
        db: AsyncSession,
        user_id: UUID,
        difficulty: DuelDifficulty,
        background_tasks: BackgroundTasks,
        problem_type: ProblemType = ProblemType.ALGORITHM
    ) -> Duel:
        """Create a new duel against AI opponent with background task for AI solving"""
        try:
            print(f"Creating AI duel for user {user_id}, difficulty {difficulty}, problem_type {problem_type}")
            
            # Check if user already has an active duel (exclude completed duels)
            existing_duel = await self.get_active_duel(db, user_id)
            if existing_duel:
                # 🔧 Extract existing duel attributes early to avoid greenlet issues
                existing_duel_id = existing_duel.id
                existing_duel_status = existing_duel.status
                
                print(f"Found existing active duel {existing_duel_id} for user {user_id} with status {existing_duel_status}")
                
                # 🚨 STRICT CHECK: Only return duels that are truly active
                if existing_duel_status == DuelStatus.COMPLETED:
                    print(f"❌ Found COMPLETED duel {existing_duel_id}, it should not be active. This is a bug!")
                    # Force cleanup of bad state and proceed to create new duel
                    print(f"🔧 Forcing cleanup and creating new duel...")
                elif existing_duel_status == DuelStatus.CANCELLED:
                    print(f"❌ Found CANCELLED duel {existing_duel_id}, it should not be active. Creating new duel...")
                elif not existing_duel.problem:
                    print(f"❌ Existing duel {existing_duel_id} has no problem, marking as completed")
                    existing_duel.status = DuelStatus.COMPLETED
                    existing_duel.completed_at = datetime.utcnow()
                    await db.commit()
                    print(f"✅ Completed broken duel {existing_duel_id}, proceeding to create new one")
                else:
                    # Existing duel is valid and truly active, return it
                    print(f"✅ Existing duel {existing_duel_id} is valid and active, returning it")
                    return existing_duel
            
            print("No valid existing active duel found, generating new problem...")
            
            # Generate problem with anti-duplicate for user
            problem = await self.generate_problem(db, difficulty, problem_type, [user_id])
            
            # 🔧 Access all problem attributes immediately after generation (before any commits)
            problem_id = problem.id
            problem_title = problem.title
            problem_description = problem.description
            problem_difficulty = problem.difficulty
            problem_type_val = problem.problem_type
            problem_starter_code = problem.starter_code
            problem_test_cases = problem.test_cases
            problem_constraints = problem.constraints
            problem_hints = problem.hints
            
            print(f"Generated NEW problem {problem_id}: {problem_title}")
            
            # Create new duel
            duel = Duel(
                mode=DuelMode.AI_OPPONENT,
                difficulty=difficulty,
                problem_type=problem_type,
                problem_id=problem_id,  # Use the extracted ID
                status=DuelStatus.WAITING
            )
            db.add(duel)
            await db.flush()  # Get duel ID immediately
            
            # 🔧 Extract duel ID immediately after flush
            duel_id = duel.id
            print(f"Created NEW duel {duel_id}")
            
            # Add human participant
            human_participant = DuelParticipant(
                duel_id=duel_id,  # Use extracted ID
                user_id=user_id,
                is_ai=False
            )
            db.add(human_participant)
            print(f"Added human participant for user {user_id}")
            
            # Add PROFESSIONAL AI participant
            ai_username = self.ai_opponent.get_professional_ai_username(difficulty)
            ai_rating = self.ai_opponent.calculate_professional_rating(difficulty)
            print(f"🤖 Created professional AI '{ai_username}' with rating {ai_rating}")
            
            ai_participant = DuelParticipant(
                duel_id=duel_id,  # Use extracted ID
                user_id=None,  # AI doesn't have user_id
                is_ai=True,
                ai_difficulty=difficulty,
                rating_before=ai_rating
            )
            db.add(ai_participant)
            await db.flush()  # Get AI participant ID
            
            # 🔧 Extract AI participant ID immediately after flush
            ai_participant_id = ai_participant.id
            print(f"Added AI participant with rating {ai_rating}")
            
            # Start the duel immediately
            duel.status = DuelStatus.IN_PROGRESS
            duel.started_at = datetime.utcnow()
            
            print(f"🕐 Setting duel start time: {duel.started_at}")
            print(f"🕐 Start time ISO format: {duel.started_at.isoformat()}")
            
            # Single commit and refresh to avoid multiple DB operations
            await db.commit()
            await db.refresh(duel)
            
            print(f"🕐 After commit/refresh - start time: {duel.started_at}")
            print(f"🕐 After commit/refresh - ISO format: {duel.started_at.isoformat()}")
            
            problem_data = {
                "id": str(problem_id),
                "title": problem_title,
                "description": problem_description,
                "difficulty": problem_difficulty,
                "problem_type": problem_type_val,
                "starter_code": problem_starter_code,
                "test_cases": problem_test_cases,
                "constraints": problem_constraints,
                "hints": problem_hints
            }
            
            background_tasks.add_task(
                self._start_ai_solving_task,
                duel_id=duel_id,  # Use extracted ID
                difficulty=difficulty,
                problem_data=problem_data,
                ai_participant_id=ai_participant_id  # Use extracted ID
            )
            
            print(f"🚀 Started AI solving task for duel {duel_id} in background")
            print(f"Started NEW duel {duel_id} - COMPLETE SUCCESS")
            
            # Return the duel directly instead of calling get_duel_by_id
            return duel
            
        except Exception as e:
            print(f"Error in create_ai_duel: {e}")
            print(f"Exception type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise e
    
    async def _start_ai_solving_task(
        self,
        duel_id: UUID,
        difficulty: DuelDifficulty,
        problem_data: Dict[str, Any],
        ai_participant_id: UUID
    ):
        """🚀 Background task to run AI opponent solving process with connection check"""
        from .websocket_manager import ws_manager
        
        print(f"🤖 AI solving task started for duel {duel_id}, waiting for connection...")
        
        try:
            # 🚀 Wait for WebSocket connection to be established
            for _ in range(10): # Wait up to 10 seconds
                if duel_id in ws_manager.active_connections:
                    print(f"✅ WebSocket connection found for duel {duel_id}")
                    break
                await asyncio.sleep(1)
            else:
                print(f"⚠️ WebSocket connection not found for duel {duel_id} after waiting.")
                # We can proceed, but updates won't be sent until connection is made
            
            # Simulate a brief delay before AI starts typing
            await asyncio.sleep(random.uniform(1, 3))
            
            # 🔧 Create proper WebSocket callback wrapper for AI
            async def ai_websocket_callback(message_type: str, data: Dict):
                """Callback wrapper that handles AI WebSocket messages properly"""
                if message_type == 'code_update':
                    print(f"🤖 AI sending code update: {len(data.get('code', ''))} chars")
                    await ws_manager.broadcast_code_update(
                        duel_id=duel_id,
                        user_id=ai_participant_id,
                        code=data.get('code', ''),
                        language=data.get('language', 'python')
                    )
                elif message_type == 'typing_status':
                    await ws_manager.broadcast_typing_status(
                        duel_id=duel_id,
                        user_id=ai_participant_id,
                        is_typing=data.get('is_typing', False)
                    )
            
            await self.ai_opponent.solve_problem_professionally(
                problem_data=problem_data,
                difficulty=difficulty,
                language="python",
                websocket_callback=ai_websocket_callback,  # Use wrapper
                user_id=ai_participant_id, # Use AI's participant ID
                real_time_simulation=True
            )
            
            print(f"✅ AI solving task completed for duel {duel_id}")
            
        except Exception as e:
            print(f"❌ Error in AI solving task for duel {duel_id}: {e}")
            import traceback
            print(traceback.format_exc())
    
    async def cancel_duel(
        self,
        db: AsyncSession,
        user_id: UUID,
        duel_id: Optional[UUID] = None
    ) -> bool:
        """Cancel a waiting duel"""
        print(f"🚫 cancel_duel called: user_id={user_id}, duel_id={duel_id}")
        
        if duel_id:
            # Cancel specific duel
            print(f"🔍 Looking for specific duel {duel_id} in WAITING status")
            query = select(Duel).where(
                and_(
                    Duel.id == duel_id,
                    Duel.status == DuelStatus.WAITING
                )
            ).options(selectinload(Duel.participants))
        else:
            # Cancel user's active waiting duel
            print(f"🔍 Looking for any waiting duel for user {user_id}")
            participant_query = select(DuelParticipant.duel_id).where(
                DuelParticipant.user_id == user_id
            )
            participant_result = await db.execute(participant_query)
            duel_ids = [row for row in participant_result.scalars().all()]
            
            print(f"🔍 Found {len(duel_ids)} duels for user: {duel_ids}")
            if not duel_ids:
                print(f"❌ No duels found for user {user_id}")
                return False
                
            query = select(Duel).where(
                and_(
                    Duel.id.in_(duel_ids),
                    Duel.status == DuelStatus.WAITING
                )
            ).options(selectinload(Duel.participants))
        
        result = await db.execute(query)
        duel = result.scalars().first()
        
        if not duel:
            # Check what status the duel actually has
            if duel_id:
                status_query = select(Duel.status).where(Duel.id == duel_id)
                status_result = await db.execute(status_query)
                actual_status = status_result.scalar_one_or_none()
                print(f"❌ Duel {duel_id} not found in WAITING status. Actual status: {actual_status}")
            else:
                print(f"❌ No waiting duel found for user {user_id}")
            return False
        
        print(f"✅ Found duel {duel.id} with status {duel.status}")
        
        # Check if user is a participant  
        user_id_str = str(user_id)
        participant = None
        for p in duel.participants:
            if str(p.user_id) == user_id_str:
                participant = p
                break
        
        if not participant:
            participant_ids = [str(p.user_id) for p in duel.participants]
            print(f"❌ User {user_id} not found as participant. Participants: {participant_ids}")
            return False
        
        print(f"✅ User {user_id} confirmed as participant")
        
        # Mark duel as cancelled using completely raw SQL to avoid greenlet issues
        try:
            from sqlalchemy import text
            
            # Use raw SQL with manual transaction to completely avoid greenlet issues
            await db.execute(text("BEGIN;"))
            await db.execute(
                text("UPDATE duels SET status = 'CANCELLED', completed_at = NOW() WHERE id = :duel_id;"),
                {"duel_id": str(duel.id)}
            )
            await db.execute(text("COMMIT;"))
            
            print(f"✅ Duel {duel.id} cancelled by user {user_id}")
            return True
        except Exception as commit_error:
            print(f"❌ Error committing cancellation: {commit_error}")
            try:
                await db.execute(text("ROLLBACK;"))
            except Exception as rollback_error:
                print(f"❌ Error during rollback: {rollback_error}")
            return False
    
    async def cleanup_stuck_duels(self, db: AsyncSession) -> int:
        """Clean up duels that have been stuck for too long"""
        from datetime import timedelta
        
        # 🎯 RANDOM PLAYER MATCHMAKING FIX: Different timeout rules for different modes
        # - Random player duels: 30 minutes (allow time for matchmaking)
        # - AI opponent duels: 10 minutes (should start immediately)
        # - Private room duels: 60 minutes (may wait for specific players)
        
        random_player_cutoff = datetime.utcnow() - timedelta(minutes=30)
        ai_opponent_cutoff = datetime.utcnow() - timedelta(minutes=10)
        private_room_cutoff = datetime.utcnow() - timedelta(minutes=60)
        
        query = select(Duel).where(
            and_(
                Duel.status == DuelStatus.WAITING,
                or_(
                    and_(Duel.mode == DuelMode.RANDOM_PLAYER, Duel.created_at < random_player_cutoff),
                    and_(Duel.mode == DuelMode.AI_OPPONENT, Duel.created_at < ai_opponent_cutoff),
                    and_(Duel.mode == DuelMode.PRIVATE_ROOM, Duel.created_at < private_room_cutoff)
                )
            )
        )
        
        result = await db.execute(query)
        stuck_duels = result.scalars().all()
        
        count = 0
        for duel in stuck_duels:
            duel.status = DuelStatus.CANCELLED
            duel.completed_at = datetime.utcnow()
            count += 1
            print(f"🧹 Cleaned up stuck waiting duel {duel.id}")
        
        if count > 0:
            await db.commit()
        
        return count




# Create global professional duel service instance
duel_service = DuelService() 