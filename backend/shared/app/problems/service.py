import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from math import ceil

from sqlalchemy import and_, func, or_, select, desc, asc, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from pydantic import UUID4

from .models import (
    Problem, Tag, Company, TestCase, CodeTemplate, UserSubmission,
    ProblemStatus, DifficultyLevel, ProblemType, problem_tags, problem_companies
)
from .schemas import (
    ProblemCreate, ProblemUpdate, ProblemFilters, ProblemStats,
    TagCreate, CompanyCreate, TestCaseCreate, CodeTemplateCreate,
    SubmissionCreate
)


class ProblemService:
    """Service layer for problem management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dict, handling relationships"""
        if model is None:
            return None
            
        result = {}
        
        # Get all columns first using __dict__ to avoid lazy loading
        # This gets the loaded attributes without triggering lazy loads
        for key, value in model.__dict__.items():
            if not key.startswith('_'):  # Skip private/SQLAlchemy internal attributes
                result[key] = value
        
        # Manually add any mapped columns that might have different names
        table_columns = {col.name for col in model.__table__.columns}
        for col_name in table_columns:
            if col_name not in result and hasattr(model, col_name):
                try:
                    # Only get if it's already loaded
                    value = getattr(model, col_name)
                    result[col_name] = value
                except Exception:
                    # Skip if accessing it would cause lazy loading
                    pass
        
        # Handle relationships only if they're already loaded
        for rel_name in ['tags', 'companies', 'code_templates', 'test_cases']:
            if hasattr(model, rel_name):
                try:
                    # Check if relationship is already loaded
                    rel_value = getattr(model, rel_name)
                    if rel_value is not None:
                        if isinstance(rel_value, list):
                            result[rel_name] = [self._model_to_dict(item) for item in rel_value]
                        else:
                            result[rel_name] = self._model_to_dict(rel_value)
                    else:
                        result[rel_name] = None if rel_name in ['tags', 'companies'] else []
                except Exception:
                    # If accessing causes lazy loading, set to empty/None
                    result[rel_name] = [] if rel_name in ['tags', 'companies', 'code_templates', 'test_cases'] else None
                    
        return result
    
    async def create_problem(self, problem_data: ProblemCreate, created_by: UUID4) -> Optional[Dict[str, Any]]:
        """Create a new problem with all related data"""
        
        # Generate slug if not provided
        slug = problem_data.slug or self._generate_slug(problem_data.title)
        
        # Check if slug is unique
        if await self._is_slug_taken(slug):
            # Add random suffix if slug exists
            slug = f"{slug}-{uuid.uuid4().hex[:8]}"
        
        # Create problem
        problem = Problem(
            title=problem_data.title,
            slug=slug,
            description=problem_data.description,
            difficulty=problem_data.difficulty,
            problem_type=problem_data.problem_type,
            time_limit_ms=problem_data.time_limit_ms,
            memory_limit_mb=problem_data.memory_limit_mb,
            hints=problem_data.hints,
            editorial=problem_data.editorial,
            is_premium=problem_data.is_premium,
            created_by=created_by
        )
        
        self.db.add(problem)
        await self.db.flush()  # Get problem ID
        
        # Add tags
        if problem_data.tag_ids:
            tags = await self.db.execute(
                select(Tag).where(Tag.id.in_(problem_data.tag_ids))
            )
            problem.tags = tags.scalars().all()
        
        # Add companies
        if problem_data.company_ids:
            companies = await self.db.execute(
                select(Company).where(Company.id.in_(problem_data.company_ids))
            )
            problem.companies = companies.scalars().all()
        
        # Add test cases
        for test_case_data in problem_data.test_cases:
            test_case = TestCase(
                problem_id=problem.id,
                **test_case_data.model_dump()
            )
            self.db.add(test_case)
        
        # Add code templates
        for template_data in problem_data.code_templates:
            template = CodeTemplate(
                problem_id=problem.id,
                **template_data.model_dump()
            )
            self.db.add(template)
        
        await self.db.commit()
        
        # Return the problem as dict to avoid lazy loading issues
        return await self.get_problem_dict_by_id(problem.id, include_solutions=False)
    
    async def get_problem_by_id(
        self, 
        problem_id: UUID4, 
        include_solutions: bool = False
    ) -> Optional[Problem]:
        """Get problem by ID with all related data"""
        query = select(Problem).where(Problem.id == problem_id)
        
        # Load relationships
        query = query.options(
            selectinload(Problem.tags),
            selectinload(Problem.companies),
            selectinload(Problem.code_templates),
            selectinload(Problem.test_cases)
        )
        
        # Temporary disable solutions loading due to column mismatch
        # if include_solutions:
        #     query = query.options(selectinload(Problem.solutions))
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_problem_dict_by_id(
        self, 
        problem_id: UUID4, 
        include_solutions: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get problem by ID as dict to avoid lazy loading issues"""
        query = select(Problem).where(Problem.id == problem_id)
        
        # Load relationships
        query = query.options(
            selectinload(Problem.tags),
            selectinload(Problem.companies),
            selectinload(Problem.code_templates),
            selectinload(Problem.test_cases)
        )
        
        result = await self.db.execute(query)
        problem = result.scalar_one_or_none()
        
        if problem:
            # Force access to all attributes while session is active
            problem_dict = {
                'id': problem.id,
                'title': problem.title,
                'slug': problem.slug,
                'description': problem.description,
                'difficulty': problem.difficulty,
                'status': problem.status,
                'problem_type': problem.problem_type,
                'time_limit_ms': problem.time_limit_ms,
                'memory_limit_mb': problem.memory_limit_mb,
                'hints': problem.hints,
                'editorial': problem.editorial,
                'acceptance_rate': problem.acceptance_rate,
                'total_submissions': problem.total_submissions,
                'total_accepted': problem.total_accepted,
                'likes': problem.likes,
                'dislikes': problem.dislikes,
                'is_premium': problem.is_premium,
                'created_at': problem.created_at,
                'updated_at': problem.updated_at,
                'published_at': problem.published_at,
                'created_by': problem.created_by,
                'tags': [
                    {
                        'id': tag.id,
                        'name': tag.name,
                        'description': tag.description,
                        'created_at': tag.created_at
                    } for tag in problem.tags
                ],
                'companies': [
                    {
                        'id': company.id,
                        'name': company.name,
                        'logo_url': company.logo_url,
                        'created_at': company.created_at
                    } for company in problem.companies
                ],
                'code_templates': [
                    {
                        'id': template.id,
                        'problem_id': template.problem_id,
                        'language': template.language,
                        'template_code': template.template_code,
                        'is_locked': template.is_locked,
                        'created_at': template.created_at
                    } for template in problem.code_templates
                ],
                'test_cases': [
                    {
                        'id': case.id,
                        'problem_id': case.problem_id,
                        'input_data': case.input_data,
                        'expected_output': case.expected_output,
                        'explanation': case.explanation,
                        'is_example': case.is_example,
                        'is_hidden': case.is_hidden,
                        'created_at': case.created_at
                    } for case in problem.test_cases
                ]
            }
            return problem_dict
        return None
    
    async def get_problem_by_slug(
        self, 
        slug: str, 
        include_solutions: bool = False
    ) -> Optional[Problem]:
        """Get problem by slug with all related data"""
        query = select(Problem).where(Problem.slug == slug)
        
        # Load relationships
        query = query.options(
            selectinload(Problem.tags),
            selectinload(Problem.companies),
            selectinload(Problem.code_templates),
            selectinload(Problem.test_cases)
        )
        
        # Temporary disable solutions loading due to column mismatch
        # if include_solutions:
        #     query = query.options(selectinload(Problem.solutions))
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_problems(
        self,
        filters: ProblemFilters,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Problem], int]:
        """Get paginated list of problems with filters"""
        
        query = select(Problem).options(
            selectinload(Problem.tags),
            selectinload(Problem.companies)
        )
        
        # Apply filters
        conditions = []
        
        if filters.title:
            conditions.append(Problem.title.ilike(f"%{filters.title}%"))
        
        if filters.difficulty:
            conditions.append(Problem.difficulty == filters.difficulty)
        
        if filters.status:
            conditions.append(Problem.status == filters.status)
        
        if filters.problem_type:
            conditions.append(Problem.problem_type == filters.problem_type)
        
        if filters.is_premium is not None:
            conditions.append(Problem.is_premium == filters.is_premium)
        
        if filters.created_by:
            conditions.append(Problem.created_by == filters.created_by)
        
        if filters.date_from:
            conditions.append(Problem.created_at >= filters.date_from)
        
        if filters.date_to:
            conditions.append(Problem.created_at <= filters.date_to)
        
        # Tag filter
        if filters.tag_ids:
            query = query.join(problem_tags).where(
                problem_tags.c.tag_id.in_(filters.tag_ids)
            )
        
        # Company filter
        if filters.company_ids:
            query = query.join(problem_companies).where(
                problem_companies.c.company_id.in_(filters.company_ids)
            )
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply sorting
        if hasattr(Problem, sort_by):
            order_func = desc if sort_order == "desc" else asc
            query = query.order_by(order_func(getattr(Problem, sort_by)))
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        
        result = await self.db.execute(query)
        problems = result.scalars().all()
        
        return problems, total
    
    async def get_problems_dict(
        self,
        filters: ProblemFilters,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get paginated list of problems as dictionaries with filters"""
        problems, total = await self.get_problems(filters, page, per_page, sort_by, sort_order)
        
        # Convert each problem to dictionary
        problem_dicts = []
        for problem in problems:
            problem_dict = {
                'id': problem.id,
                'title': problem.title,
                'slug': problem.slug,
                'description': problem.description,
                'difficulty': problem.difficulty,
                'status': problem.status,
                'problem_type': problem.problem_type,
                'time_limit_ms': problem.time_limit_ms,
                'memory_limit_mb': problem.memory_limit_mb,
                'hints': problem.hints,
                'editorial': problem.editorial,
                'acceptance_rate': problem.acceptance_rate,
                'total_submissions': problem.total_submissions,
                'total_accepted': problem.total_accepted,
                'likes': problem.likes,
                'dislikes': problem.dislikes,
                'is_premium': problem.is_premium,
                'created_at': problem.created_at,
                'updated_at': problem.updated_at,
                'published_at': problem.published_at,
                'created_by': problem.created_by,
                'tags': [
                    {
                        'id': tag.id,
                        'name': tag.name,
                        'description': tag.description,
                        'created_at': tag.created_at
                    } for tag in problem.tags
                ],
                'companies': [
                    {
                        'id': company.id,
                        'name': company.name,
                        'logo_url': company.logo_url,
                        'created_at': company.created_at
                    } for company in problem.companies
                ]
            }
            problem_dicts.append(problem_dict)
        
        return problem_dicts, total
    
    async def update_problem(
        self, 
        problem_id: UUID4, 
        problem_data: ProblemUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update problem"""
        problem = await self.get_problem_by_id(problem_id)
        if not problem:
            return None
        
        # Update basic fields
        update_data = problem_data.model_dump(exclude_unset=True, exclude={'tag_ids', 'company_ids'})
        
        # Check slug uniqueness if updating
        if 'slug' in update_data and update_data['slug'] != problem.slug:
            if await self._is_slug_taken(update_data['slug'], exclude_id=problem_id):
                raise ValueError("Slug already exists")
        
        for field, value in update_data.items():
            setattr(problem, field, value)
        
        # Update tags if provided
        if problem_data.tag_ids is not None:
            if problem_data.tag_ids:
                tags = await self.db.execute(
                    select(Tag).where(Tag.id.in_(problem_data.tag_ids))
                )
                problem.tags = tags.scalars().all()
            else:
                problem.tags = []
        
        # Update companies if provided
        if problem_data.company_ids is not None:
            if problem_data.company_ids:
                companies = await self.db.execute(
                    select(Company).where(Company.id.in_(problem_data.company_ids))
                )
                problem.companies = companies.scalars().all()
            else:
                problem.companies = []
        
        # Set published_at when status changes to published
        if problem_data.status == ProblemStatus.PUBLISHED and not problem.published_at:
            problem.published_at = datetime.utcnow()
        
        problem.updated_at = datetime.utcnow()
        
        await self.db.commit()
        
        # Return the updated problem as dict to avoid lazy loading issues
        return await self.get_problem_dict_by_id(problem_id, include_solutions=False)
    
    async def delete_problem(self, problem_id: UUID4) -> bool:
        """Delete problem"""
        problem = await self.get_problem_by_id(problem_id)
        if not problem:
            return False
        
        await self.db.delete(problem)
        await self.db.commit()
        return True
    
    async def bulk_update_status(
        self, 
        problem_ids: List[UUID4], 
        status: ProblemStatus
    ) -> int:
        """Bulk update problem status"""
        query = select(Problem).where(Problem.id.in_(problem_ids))
        result = await self.db.execute(query)
        problems = result.scalars().all()
        
        updated_count = 0
        for problem in problems:
            problem.status = status
            if status == ProblemStatus.PUBLISHED and not problem.published_at:
                problem.published_at = datetime.utcnow()
            problem.updated_at = datetime.utcnow()
            updated_count += 1
        
        await self.db.commit()
        return updated_count
    
    async def get_problem_stats(self) -> ProblemStats:
        """Get problem statistics for admin dashboard"""
        
        # Total problems
        total_result = await self.db.execute(select(func.count(Problem.id)))
        total_problems = total_result.scalar()
        
        # By difficulty
        difficulty_result = await self.db.execute(
            select(Problem.difficulty, func.count(Problem.id))
            .group_by(Problem.difficulty)
        )
        by_difficulty = {row[0]: row[1] for row in difficulty_result.fetchall()}
        
        # By status
        status_result = await self.db.execute(
            select(Problem.status, func.count(Problem.id))
            .group_by(Problem.status)
        )
        by_status = {row[0]: row[1] for row in status_result.fetchall()}
        
        # By type
        type_result = await self.db.execute(
            select(Problem.problem_type, func.count(Problem.id))
            .group_by(Problem.problem_type)
        )
        by_type = {row[0]: row[1] for row in type_result.fetchall()}
        
        # Recent problems (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_result = await self.db.execute(
            select(func.count(Problem.id))
            .where(Problem.created_at >= thirty_days_ago)
        )
        recent_problems = recent_result.scalar()
        
        # Top tags
        top_tags_result = await self.db.execute(
            select(Tag.name, func.count(problem_tags.c.problem_id))
            .join(problem_tags, Tag.id == problem_tags.c.tag_id)
            .group_by(Tag.name)
            .order_by(desc(func.count(problem_tags.c.problem_id)))
            .limit(10)
        )
        top_tags = [{"name": row[0], "count": row[1]} for row in top_tags_result.fetchall()]
        
        return ProblemStats(
            total_problems=total_problems,
            by_difficulty=by_difficulty,
            by_status=by_status,
            by_type=by_type,
            recent_problems=recent_problems,
            top_tags=top_tags
        )
    
    def _generate_slug(self, title: str) -> str:
        """Generate URL slug from title"""
        slug = title.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)  # Remove special chars
        slug = re.sub(r'[-\s]+', '-', slug)   # Replace spaces/hyphens with single hyphen
        slug = slug.strip('-')                # Remove leading/trailing hyphens
        return slug[:100]  # Limit length
    
    async def _is_slug_taken(self, slug: str, exclude_id: Optional[UUID4] = None) -> bool:
        """Check if slug is already taken"""
        query = select(Problem.id).where(Problem.slug == slug)
        if exclude_id:
            query = query.where(Problem.id != exclude_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None


class TagService:
    """Service for managing tags"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_tag(self, tag_data: TagCreate) -> Tag:
        """Create new tag"""
        tag = Tag(**tag_data.model_dump())
        self.db.add(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        return tag
    
    async def get_tags(self, search: Optional[str] = None) -> List[Tag]:
        """Get all tags with optional search"""
        query = select(Tag).order_by(Tag.name)
        
        if search:
            query = query.where(Tag.name.ilike(f"%{search}%"))
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete_tag(self, tag_id: UUID4) -> bool:
        """Delete tag"""
        tag = await self.db.get(Tag, tag_id)
        if not tag:
            return False
        
        await self.db.delete(tag)
        await self.db.commit()
        return True


class CompanyService:
    """Service for managing companies"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_company(self, company_data: CompanyCreate) -> Company:
        """Create new company"""
        company = Company(**company_data.model_dump())
        self.db.add(company)
        await self.db.commit()
        await self.db.refresh(company)
        return company
    
    async def get_companies(self, search: Optional[str] = None) -> List[Company]:
        """Get all companies with optional search"""
        query = select(Company).order_by(Company.name)
        
        if search:
            query = query.where(Company.name.ilike(f"%{search}%"))
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete_company(self, company_id: UUID4) -> bool:
        """Delete company"""
        company = await self.db.get(Company, company_id)
        if not company:
            return False
        
        await self.db.delete(company)
        await self.db.commit()
        return True


class TestCaseService:
    """Service for managing test cases"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_test_case(
        self, 
        problem_id: UUID4, 
        test_case_data: TestCaseCreate
    ) -> Dict[str, Any]:
        """Create test case for problem"""
        test_case = TestCase(
            problem_id=problem_id,
            **test_case_data.model_dump()
        )
        self.db.add(test_case)
        await self.db.commit()
        await self.db.refresh(test_case)
        
        # Return as dictionary
        return {
            'id': test_case.id,
            'problem_id': test_case.problem_id,
            'input_data': test_case.input_data,
            'expected_output': test_case.expected_output,
            'explanation': test_case.explanation,
            'is_example': test_case.is_example,
            'is_hidden': test_case.is_hidden,
            'created_at': test_case.created_at
        }
    
    async def get_test_cases(
        self, 
        problem_id: UUID4, 
        include_hidden: bool = False
    ) -> List[Dict[str, Any]]:
        """Get test cases for problem"""
        query = select(TestCase).where(TestCase.problem_id == problem_id)
        
        if not include_hidden:
            query = query.where(TestCase.is_hidden == False)
        
        query = query.order_by(TestCase.id)  # TODO: Add order_index column and ordering
        
        result = await self.db.execute(query)
        test_cases = result.scalars().all()
        
        # Return as list of dictionaries
        return [
            {
                'id': tc.id,
                'problem_id': tc.problem_id,
                'input_data': tc.input_data,
                'expected_output': tc.expected_output,
                'explanation': tc.explanation,
                'is_example': tc.is_example,
                'is_hidden': tc.is_hidden,
                'created_at': tc.created_at
            } for tc in test_cases
        ]
    
    async def delete_test_case(self, test_case_id: UUID4) -> bool:
        """Delete test case"""
        test_case = await self.db.get(TestCase, test_case_id)
        if not test_case:
            return False
        
        await self.db.delete(test_case)
        await self.db.commit()
        return True


class SubmissionService:
    """Service for managing user submissions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_submission(
        self, 
        user_id: UUID4, 
        submission_data: SubmissionCreate
    ) -> UserSubmission:
        """Create user submission"""
        submission = UserSubmission(
            user_id=user_id,
            **submission_data.model_dump(),
            status="Pending"  # Initial status
        )
        self.db.add(submission)
        await self.db.commit()
        await self.db.refresh(submission)
        return submission
    
    async def get_user_submissions(
        self, 
        user_id: UUID4, 
        problem_id: Optional[UUID4] = None,
        limit: int = 50
    ) -> List[UserSubmission]:
        """Get user submissions"""
        query = select(UserSubmission).where(UserSubmission.user_id == user_id)
        
        if problem_id:
            query = query.where(UserSubmission.problem_id == problem_id)
        
        query = query.order_by(desc(UserSubmission.submitted_at)).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_submission_result(
        self,
        submission_id: UUID4,
        status: str,
        runtime_ms: Optional[int] = None,
        memory_mb: Optional[float] = None,
        test_results: Optional[Dict] = None
    ) -> Optional[UserSubmission]:
        """Update submission result after judging"""
        submission = await self.db.get(UserSubmission, submission_id)
        if not submission:
            return None
        
        submission.status = status
        submission.runtime_ms = runtime_ms
        submission.memory_mb = memory_mb
        submission.test_results = test_results
        submission.judged_at = datetime.utcnow()
        
        # Update problem statistics if accepted
        if status == "Accepted":
            problem = await self.db.get(Problem, submission.problem_id)
            if problem:
                problem.total_accepted += 1
                # Recalculate acceptance rate
                if problem.total_submissions > 0:
                    problem.acceptance_rate = (problem.total_accepted / problem.total_submissions) * 100
                
                # Notify user service about successful problem solution
                await self._notify_user_service_problem_solved(submission.user_id, problem)
        
        # Update problem submission count
        problem = await self.db.get(Problem, submission.problem_id)
        if problem:
            problem.total_submissions += 1
            if problem.total_submissions > 0:
                problem.acceptance_rate = (problem.total_accepted / problem.total_submissions) * 100
        
        await self.db.commit()
        await self.db.refresh(submission)
        return submission
    
    async def _notify_user_service_problem_solved(self, user_id: UUID4, problem: Problem):
        """Notify user service that a problem was solved"""
        import httpx
        import os
        
        user_service_url = os.getenv("USER_SERVICE_URL", "http://localhost:8002")
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{user_service_url}/api/v1/problem-solved",
                    json={
                        "problem_id": str(problem.id),
                        "difficulty": problem.difficulty,
                        "title": problem.title
                    },
                    headers={"User-ID": str(user_id)},  # Pass user ID in header
                    timeout=5.0
                )
        except Exception as e:
            # Don't fail the submission if user service is down
            print(f"Failed to notify user service: {e}") 