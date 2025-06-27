from typing import List, Optional
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import UUID4

from shared.app.auth.models import User
from .dependencies import (
    get_problem_service, get_submission_service,
    get_current_user_optional, valid_problem_slug,
    get_pagination_params, get_sorting_params
)
from .service import ProblemService, SubmissionService
from .schemas import (
    ProblemResponse, ProblemPublicResponse, ProblemDetailResponse, ProblemListResponse,
    ProblemFilters, SubmissionCreate, SubmissionResponse,
    TestCaseResponse, CodeRunRequest, CodeRunResponse, TestResult
)
from .models import ProblemStatus, DifficultyLevel, ProblemType


router = APIRouter(prefix="/problems", tags=["Problems"])


@router.get("", response_model=ProblemListResponse)
async def get_published_problems(
    title: Optional[str] = Query(None, description="Search by title"),
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty"),
    problem_type: Optional[ProblemType] = Query(None, description="Filter by type"),
    tag_ids: Optional[List[UUID4]] = Query(None, description="Filter by tag IDs"),
    company_ids: Optional[List[UUID4]] = Query(None, description="Filter by company IDs"),
    pagination: dict = Depends(get_pagination_params),
    sorting: dict = Depends(get_sorting_params),
    current_user: Optional[User] = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get published problems for users"""
    
    filters = ProblemFilters(
        title=title,
        difficulty=difficulty,
        status=ProblemStatus.PUBLISHED,  # Only published problems
        problem_type=problem_type,
        tag_ids=tag_ids or [],
        company_ids=company_ids or [],
        is_premium=None if current_user else False  # Hide premium if not authenticated
    )
    
    problems, total = await problem_service.get_problems(
        filters=filters,
        page=pagination["page"],
        per_page=pagination["per_page"],
        sort_by=sorting["sort_by"],
        sort_order=sorting["sort_order"]
    )
    
    total_pages = ceil(total / pagination["per_page"])
    
    return ProblemListResponse(
        problems=problems,
        total=total,
        page=pagination["page"],
        per_page=pagination["per_page"],
        total_pages=total_pages
    )


@router.get("/{slug}", response_model=ProblemPublicResponse)
async def get_problem_by_slug(
    slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get problem details by slug"""
    problem = await problem_service.get_problem_by_slug(slug, include_solutions=False)
    
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    
    # Check if problem is published
    if problem.status != ProblemStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    
    # Check premium access
    if problem.is_premium and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for premium problems"
        )
    
    # TODO: Add premium subscription check
    # if problem.is_premium and not current_user.has_premium:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Premium subscription required"
    #     )
    
    return problem


@router.get("/{slug}/test-cases", response_model=List[TestCaseResponse])
async def get_problem_test_cases(
    slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get visible test cases for a problem"""
    problem = await problem_service.get_problem_by_slug(slug)
    
    if not problem or problem.status != ProblemStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    
    # Check premium access
    if problem.is_premium and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for premium problems"
        )
    
    # Return only visible test cases (not hidden)
    visible_test_cases = [
        tc for tc in problem.test_cases 
        if tc.is_example and not tc.is_hidden
    ]
    
    return visible_test_cases


@router.post("/{slug}/run", response_model=CodeRunResponse)
async def run_code(
    slug: str,
    run_request: CodeRunRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Run code against problem test cases (example cases only)"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to run code"
        )
    
    problem = await problem_service.get_problem_by_slug(slug)
    
    if not problem or problem.status != ProblemStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    
    # Check premium access
    if problem.is_premium:
        # TODO: Add premium subscription check
        pass
    
    # Get example test cases only (not hidden)
    example_test_cases = [
        tc for tc in problem.test_cases 
        if tc.is_example and not tc.is_hidden
    ]
    
    if not example_test_cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No example test cases available for this problem"
        )
    
    # Execute code using real code runner
    try:
        # Try Docker-based runner first
        try:
            from .code_runner import run_code as execute_code
            print("Using Docker-based code runner")
        except ImportError:
            # Fallback to simple runner
            from .simple_runner import run_code_simple as execute_code
            print("Using simple code runner (Docker not available)")
        
        # Convert test cases to format expected by code runner
        test_cases_data = []
        for tc in example_test_cases:
            test_cases_data.append({
                "input_data": tc.input_data,
                "expected_output": tc.expected_output,
                "explanation": tc.explanation
            })
        
        # Execute user code
        results = await execute_code(
            language=run_request.language,
            user_code=run_request.code,
            test_cases=test_cases_data
        )
        
        # Calculate overall metrics
        total_runtime = sum(r.runtime_ms for r in results if r.runtime_ms) or 0
        avg_memory = sum(r.memory_mb for r in results if r.memory_mb) / len(results) if results else 0
        all_passed = all(r.passed for r in results)
        
        return CodeRunResponse(
            success=all_passed,
            results=results,
            runtime_ms=total_runtime,
            memory_mb=avg_memory,
            error=None
        )
        
    except Exception as e:
        # Final fallback to mock results if both runners fail
        print(f"Code runner error: {e}")
        
        results = []
        for tc in example_test_cases:
            result = TestResult(
                test_case_id=str(tc.id),
                input_data=tc.input_data,
                expected_output=tc.expected_output,
                actual_output="",
                passed=False,
                runtime_ms=None,
                memory_mb=None,
                error=f"Code execution service unavailable: {str(e)}"
            )
            results.append(result)
        
        return CodeRunResponse(
            success=False,
            results=results,
            runtime_ms=None,
            memory_mb=None,
            error=f"Code execution service error: {str(e)}"
        )


@router.post("/{slug}/submit", response_model=SubmissionResponse)
async def submit_solution(
    slug: str,
    submission_request: CodeRunRequest,  # Using same schema as run for consistency
    current_user: User = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service),
    submission_service: SubmissionService = Depends(get_submission_service)
):
    """Submit solution for a problem"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to submit solutions"
        )
    
    problem = await problem_service.get_problem_by_slug(slug)
    
    if not problem or problem.status != ProblemStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    
    # Check premium access
    if problem.is_premium:
        # TODO: Add premium subscription check
        pass
    
    # Create submission data
    submission_data = SubmissionCreate(
        problem_id=problem.id,
        language=submission_request.language,
        solution_code=submission_request.code
    )
    
    # Create submission
    submission = await submission_service.create_submission(current_user.id, submission_data)
    
    # Judge the submission immediately using all test cases
    try:
        # Get all test cases (including hidden ones) for judging
        all_test_cases = problem.test_cases
        
        if all_test_cases:
            # Execute code using real code runner
            try:
                from .code_runner import run_code as execute_code
                print("Using Docker-based code runner for submission")
            except ImportError:
                from .simple_runner import run_code_simple as execute_code
                print("Using simple code runner for submission")
            
            # Convert test cases to format expected by code runner
            test_cases_data = []
            for tc in all_test_cases:
                test_cases_data.append({
                    "input_data": tc.input_data,
                    "expected_output": tc.expected_output,
                    "explanation": tc.explanation
                })
            
            # Execute user code against all test cases
            results = await execute_code(
                language=submission_request.language,
                user_code=submission_request.code,
                test_cases=test_cases_data
            )
            
            # Check if all tests passed
            all_passed = all(r.passed for r in results)
            total_runtime = sum(r.runtime_ms for r in results if r.runtime_ms) or 0
            avg_memory = sum(r.memory_mb for r in results if r.memory_mb) / len(results) if results else 0
            
            # Update submission with results
            status = "Accepted" if all_passed else "Wrong Answer"
            await submission_service.update_submission_result(
                submission.id,
                status=status,
                runtime_ms=total_runtime,
                memory_mb=avg_memory,
                test_results={"results": [r.model_dump() for r in results]}
            )
            
        else:
            # No test cases, mark as accepted
            await submission_service.update_submission_result(
                submission.id,
                status="Accepted",
                runtime_ms=0,
                memory_mb=0,
                test_results={"results": []}
            )
            
    except Exception as e:
        # Mark submission as failed if judging fails
        await submission_service.update_submission_result(
            submission.id,
            status="Runtime Error",
            runtime_ms=None,
            memory_mb=None,
            test_results={"error": str(e)}
        )
    
    # Get updated submission
    updated_submissions = await submission_service.get_user_submissions(current_user.id, limit=1)
    updated_submission = next((s for s in updated_submissions if s.id == submission.id), submission)
    
    return updated_submission


@router.get("/submissions/my", response_model=List[SubmissionResponse])
async def get_my_submissions(
    problem_slug: Optional[str] = Query(None, description="Filter by problem slug"),
    limit: int = Query(50, le=100, description="Number of submissions to return"),
    current_user: User = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service),
    submission_service: SubmissionService = Depends(get_submission_service)
):
    """Get current user's submissions"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    problem_id = None
    if problem_slug:
        problem = await problem_service.get_problem_by_slug(problem_slug)
        if problem:
            problem_id = problem.id
    
    submissions = await submission_service.get_user_submissions(
        current_user.id, 
        problem_id=problem_id, 
        limit=limit
    )
    
    return submissions


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: UUID4,
    current_user: User = Depends(get_current_user_optional),
    submission_service: SubmissionService = Depends(get_submission_service)
):
    """Get submission details"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Get submission from database
    submissions = await submission_service.get_user_submissions(
        current_user.id, 
        limit=1000  # Get all user submissions to find this one
    )
    
    submission = next((s for s in submissions if s.id == submission_id), None)
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    return submission 