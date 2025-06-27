from typing import List, Optional
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import UUID4

from shared.app.auth.models import User
from shared.app.auth.audit import AuditService
from .dependencies import (
    get_problem_service, get_tag_service, get_company_service,
    get_test_case_service, get_submission_service,
    get_current_admin_user, valid_problem_id, valid_problem_owner,
    get_pagination_params, get_sorting_params, get_audit_service
)
from .service import (
    ProblemService, TagService, CompanyService, 
    TestCaseService, SubmissionService
)
from .schemas import (
    # Problem schemas
    ProblemCreate, ProblemUpdate, ProblemResponse, ProblemDetailResponse, ProblemPublicResponse,
    ProblemListResponse, ProblemFilters, BulkProblemStatusUpdate, 
    BulkProblemDelete, ProblemStats, AdminDashboardResponse,
    
    # Tag schemas
    TagCreate, TagResponse,
    
    # Company schemas
    CompanyCreate, CompanyResponse,
    
    # Test case schemas
    TestCaseCreate, TestCaseResponse, TestCaseUpdate,
    
    # Submission schemas
    SubmissionResponse
)
from .models import ProblemStatus, DifficultyLevel, ProblemType


router = APIRouter(prefix="/admin", tags=["Admin - Problems"])


# Dashboard endpoint
@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service),
    submission_service: SubmissionService = Depends(get_submission_service)
):
    """Get admin dashboard with statistics and recent activity"""
    
    # Get problem statistics
    stats = await problem_service.get_problem_stats()
    
    # Get recent submissions (last 10)
    recent_submissions = []  # TODO: Implement this in service
    
    # Get problems pending review
    filters = ProblemFilters(status=ProblemStatus.IN_REVIEW)
    pending_reviews, _ = await problem_service.get_problems_dict(filters, per_page=10)
    
    return AdminDashboardResponse(
        stats=stats,
        recent_submissions=recent_submissions,
        pending_reviews=pending_reviews
    )


# Problem management endpoints
@router.post("/problems", response_model=ProblemPublicResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Create a new problem"""
    try:
        problem = await problem_service.create_problem(problem_data, current_user.id)
        
        # Log the action
        await audit_service.log_problem_created(
            user=current_user,
            problem_id=str(problem['id']),
            problem_title=problem['title'],
            request=request
        )
        
        # Return the problem dictionary directly
        return problem
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/problems", response_model=ProblemListResponse)
async def get_problems(
    title: Optional[str] = Query(None, description="Filter by title"),
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty"),
    status: Optional[ProblemStatus] = Query(None, description="Filter by status"),
    problem_type: Optional[ProblemType] = Query(None, description="Filter by type"),
    is_premium: Optional[bool] = Query(None, description="Filter by premium status"),
    tag_ids: Optional[List[UUID4]] = Query(None, description="Filter by tag IDs"),
    company_ids: Optional[List[UUID4]] = Query(None, description="Filter by company IDs"),
    pagination: dict = Depends(get_pagination_params),
    sorting: dict = Depends(get_sorting_params),
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get paginated list of problems with filters"""
    
    filters = ProblemFilters(
        title=title,
        difficulty=difficulty,
        status=status,
        problem_type=problem_type,
        is_premium=is_premium,
        tag_ids=tag_ids or [],
        company_ids=company_ids or []
    )
    
    problems, total = await problem_service.get_problems_dict(
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


@router.get("/problems/{problem_id}", response_model=ProblemPublicResponse)
async def get_problem(
    problem_id: UUID4,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get problem by ID with all details"""
    problem = await problem_service.get_problem_dict_by_id(problem_id, include_solutions=False)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


@router.put("/problems/{problem_id}", response_model=ProblemPublicResponse)
async def update_problem(
    problem_id: UUID4,
    problem_data: ProblemUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Update problem"""
    try:
        # Get original problem for audit
        original_problem = await problem_service.get_problem_by_id(problem_id)
        if not original_problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
        
        problem = await problem_service.update_problem(problem_id, problem_data)
        
        # Log the action
        changes = {}
        if problem_data.title is not None:
            changes["title"] = {"old": original_problem.title, "new": problem_data.title}
        if problem_data.status is not None:
            changes["status"] = {"old": original_problem.status, "new": problem_data.status}
        if problem_data.difficulty is not None:
            changes["difficulty"] = {"old": original_problem.difficulty, "new": problem_data.difficulty}
        
        await audit_service.log_problem_updated(
            user=current_user,
            problem_id=str(problem_id),
            problem_title=problem['title'],
            changes=changes,
            request=request
        )
        
        return problem
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: UUID4,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Delete problem"""
    # Get problem details before deletion for audit
    problem = await problem_service.get_problem_by_id(problem_id)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    
    success = await problem_service.delete_problem(problem_id)
    if success:
        # Log the action
        await audit_service.log_problem_deleted(
            user=current_user,
            problem_id=str(problem_id),
            problem_title=problem.title,
            request=request
        )


# Bulk operations
@router.patch("/problems/bulk/status")
async def bulk_update_problem_status(
    bulk_data: BulkProblemStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Bulk update problem status"""
    updated_count = await problem_service.bulk_update_status(
        bulk_data.problem_ids, 
        bulk_data.status
    )
    
    # Log the bulk action
    await audit_service.log_bulk_action(
        user=current_user,
        action="UPDATE_STATUS",
        resource_type="problem",
        resource_ids=[str(pid) for pid in bulk_data.problem_ids],
        description=f"Bulk updated {updated_count} problems to status: {bulk_data.status}",
        request=request
    )
    
    return {"updated_count": updated_count}


@router.delete("/problems/bulk")
async def bulk_delete_problems(
    bulk_data: BulkProblemDelete,
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Bulk delete problems"""
    deleted_count = 0
    for problem_id in bulk_data.problem_ids:
        if await problem_service.delete_problem(problem_id):
            deleted_count += 1
    
    return {"deleted_count": deleted_count}


# Test case management
@router.post("/problems/{problem_id}/test-cases", response_model=TestCaseResponse)
async def create_test_case(
    problem_id: UUID4,
    test_case_data: TestCaseCreate,
    current_user: User = Depends(get_current_admin_user),
    test_case_service: TestCaseService = Depends(get_test_case_service)
):
    """Create test case for problem"""
    test_case = await test_case_service.create_test_case(problem_id, test_case_data)
    return test_case


@router.get("/problems/{problem_id}/test-cases", response_model=List[TestCaseResponse])
async def get_test_cases(
    problem_id: UUID4,
    include_hidden: bool = Query(True, description="Include hidden test cases"),
    current_user: User = Depends(get_current_admin_user),
    test_case_service: TestCaseService = Depends(get_test_case_service)
):
    """Get test cases for problem"""
    test_cases = await test_case_service.get_test_cases(problem_id, include_hidden)
    return test_cases


@router.delete("/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    test_case_id: UUID4,
    current_user: User = Depends(get_current_admin_user),
    test_case_service: TestCaseService = Depends(get_test_case_service)
):
    """Delete test case"""
    success = await test_case_service.delete_test_case(test_case_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")


# Tag management
@router.post("/tags", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    tag_service: TagService = Depends(get_tag_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Create new tag"""
    tag = await tag_service.create_tag(tag_data)
    
    # Log the action
    await audit_service.log_tag_created(
        user=current_user,
        tag_id=str(tag.id),
        tag_name=tag.name,
        request=request
    )
    
    return tag


@router.get("/tags", response_model=List[TagResponse])
async def get_tags(
    search: Optional[str] = Query(None, description="Search tags by name"),
    current_user: User = Depends(get_current_admin_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get all tags"""
    tags = await tag_service.get_tags(search)
    return tags


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID4,
    current_user: User = Depends(get_current_admin_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Delete tag"""
    success = await tag_service.delete_tag(tag_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")


# Company management
@router.post("/companies", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    company_service: CompanyService = Depends(get_company_service),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Create new company"""
    company = await company_service.create_company(company_data)
    
    # Log the action
    await audit_service.log_company_created(
        user=current_user,
        company_id=str(company.id),
        company_name=company.name,
        request=request
    )
    
    return company


@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(
    search: Optional[str] = Query(None, description="Search companies by name"),
    current_user: User = Depends(get_current_admin_user),
    company_service: CompanyService = Depends(get_company_service)
):
    """Get all companies"""
    companies = await company_service.get_companies(search)
    return companies


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: UUID4,
    current_user: User = Depends(get_current_admin_user),
    company_service: CompanyService = Depends(get_company_service)
):
    """Delete company"""
    success = await company_service.delete_company(company_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")


# Statistics
@router.get("/stats", response_model=ProblemStats)
async def get_problem_stats(
    current_user: User = Depends(get_current_admin_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """Get problem statistics"""
    stats = await problem_service.get_problem_stats()
    return stats 