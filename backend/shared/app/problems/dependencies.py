import uuid
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import UUID4

from shared.app.database import get_async_session
from shared.app.auth.security import get_current_user
from shared.app.auth.models import User, UserRole
from shared.app.auth.audit import AuditService

from .service import ProblemService, TagService, CompanyService, TestCaseService, SubmissionService
from .models import Problem, Tag, Company


# Database session dependency
async def get_db() -> AsyncSession:
    """Get database session"""
    async for session in get_async_session():
        yield session


# Service dependencies
def get_problem_service(db: AsyncSession = Depends(get_db)) -> ProblemService:
    """Get problem service instance"""
    return ProblemService(db)


def get_tag_service(db: AsyncSession = Depends(get_db)) -> TagService:
    """Get tag service instance"""
    return TagService(db)


def get_company_service(db: AsyncSession = Depends(get_db)) -> CompanyService:
    """Get company service instance"""
    return CompanyService(db)


def get_test_case_service(db: AsyncSession = Depends(get_db)) -> TestCaseService:
    """Get test case service instance"""
    return TestCaseService(db)


def get_submission_service(db: AsyncSession = Depends(get_db)) -> SubmissionService:
    """Get submission service instance"""
    return SubmissionService(db)


def get_audit_service(db: AsyncSession = Depends(get_db)) -> AuditService:
    """Get audit service instance"""
    return AuditService(db)


# Authentication and authorization dependencies
async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current admin user with proper role checking"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Check if user has admin privileges
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required. Contact administrator for access."
        )
    
    return current_user


async def get_current_moderator_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user with moderator+ privileges"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    if not current_user.is_moderator():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator privileges required"
        )
    
    return current_user


async def get_current_super_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user with super admin privileges"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    if current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    
    return current_user


async def get_current_user_optional(
    request: Request
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    try:
        # Try to extract token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return None
            
        token = authorization.split(" ")[1]
        # Import and call get_current_user with the token
        from shared.app.auth.security import get_current_user
        user = await get_current_user(token)
        return user
    except Exception:
        # If any authentication error occurs, return None instead of raising
        return None


# Resource validation dependencies
async def valid_problem_id(
    problem_id: UUID4,
    problem_service: ProblemService = Depends(get_problem_service)
) -> Problem:
    """Validate that problem exists and return it"""
    problem = await problem_service.get_problem_by_id(problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    return problem


async def valid_problem_slug(
    slug: str,
    problem_service: ProblemService = Depends(get_problem_service)
) -> Problem:
    """Validate that problem exists by slug and return it"""
    problem = await problem_service.get_problem_by_slug(slug)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    return problem


async def valid_tag_id(
    tag_id: UUID4,
    tag_service: TagService = Depends(get_tag_service)
) -> Tag:
    """Validate that tag exists and return it"""
    tags = await tag_service.get_tags()
    tag = next((t for t in tags if t.id == tag_id), None)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    return tag


async def valid_company_id(
    company_id: UUID4,
    company_service: CompanyService = Depends(get_company_service)
) -> Company:
    """Validate that company exists and return it"""
    companies = await company_service.get_companies()
    company = next((c for c in companies if c.id == company_id), None)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


async def valid_problem_owner(
    problem: Problem = Depends(valid_problem_id),
    current_user: User = Depends(get_current_admin_user)
) -> Problem:
    """Validate that current user is the owner of the problem or admin"""
    # For now, allow all admin users to edit any problem
    # You can implement more granular permissions here
    return problem


async def publishable_problem(
    problem: Problem = Depends(valid_problem_id),
    problem_service: ProblemService = Depends(get_problem_service)
) -> Problem:
    """Validate that problem can be published (has test cases, etc.)"""
    from .models import TestCase
    from sqlalchemy import select
    
    # Check if problem has required components for publishing
    test_cases_result = await problem_service.db.execute(
        select(TestCase).where(TestCase.problem_id == problem.id)
    )
    test_cases = test_cases_result.scalars().all()
    
    if not test_cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Problem must have at least one test case before publishing"
        )
    
    if not problem.description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Problem must have a description before publishing"
        )
    
    return problem


# Pagination dependencies
def get_pagination_params(
    page: int = 1,
    per_page: int = 20
) -> dict:
    """Get pagination parameters with validation"""
    if page < 1:
        page = 1
    if per_page < 1 or per_page > 100:
        per_page = 20
    
    return {"page": page, "per_page": per_page}


# Sorting dependencies
def get_sorting_params(
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> dict:
    """Get sorting parameters with validation"""
    allowed_sort_fields = [
        "title", "difficulty", "status", "problem_type", 
        "created_at", "updated_at", "published_at", 
        "total_submissions", "acceptance_rate"
    ]
    
    if sort_by not in allowed_sort_fields:
        sort_by = "created_at"
    
    if sort_order not in ["asc", "desc"]:
        sort_order = "desc"
    
    return {"sort_by": sort_by, "sort_order": sort_order} 