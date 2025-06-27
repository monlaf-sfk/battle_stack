import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict, field_validator
from pydantic.types import UUID4

from .models import DifficultyLevel, ProblemStatus, ProblemType


# Base schemas
class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID4
    created_at: datetime


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    logo_url: Optional[str] = Field(None, max_length=500)


class CompanyCreate(CompanyBase):
    pass


class CompanyResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID4
    created_at: datetime


# Test case schemas
class TestCaseBase(BaseModel):
    input_data: str = Field(..., description="JSON string with input data")
    expected_output: str = Field(..., description="Expected output")
    explanation: Optional[str] = Field(None, description="Test case explanation")
    is_example: bool = Field(True, description="Show to user")
    is_hidden: bool = Field(False, description="Hidden test case")
    # order_index: int = Field(0, description="Display order")  # TODO: Add DB column


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseUpdate(BaseModel):
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    explanation: Optional[str] = None
    is_example: Optional[bool] = None
    is_hidden: Optional[bool] = None
    # order_index: Optional[int] = None  # TODO: Add DB column


class TestCaseResponse(TestCaseBase):
    id: UUID4
    problem_id: UUID4


# Code template schemas
class CodeTemplateBase(BaseModel):
    language: str = Field(..., min_length=1, max_length=20)
    template_code: str = Field(..., description="Template code for the language")
    # default_code: Optional[str] = Field(None, description="Default code for user")  # TODO: Add DB column


class CodeTemplateCreate(CodeTemplateBase):
    pass


class CodeTemplateUpdate(BaseModel):
    language: Optional[str] = None
    template_code: Optional[str] = None
    # default_code: Optional[str] = None  # TODO: Add DB column


class CodeTemplateResponse(CodeTemplateBase):
    id: UUID4
    problem_id: UUID4


# Solution schemas
class SolutionBase(BaseModel):
    language: str = Field(..., min_length=1, max_length=20)
    solution_code: str = Field(..., description="Solution code")
    explanation: Optional[str] = Field(None, description="Solution explanation")
    is_official: bool = Field(False, description="Official solution")
    approach_name: Optional[str] = Field(None, max_length=100)
    time_complexity: Optional[str] = Field(None, max_length=50)
    space_complexity: Optional[str] = Field(None, max_length=50)


class SolutionCreate(SolutionBase):
    pass


class SolutionUpdate(BaseModel):
    language: Optional[str] = None
    solution_code: Optional[str] = None
    explanation: Optional[str] = None
    is_official: Optional[bool] = None
    approach_name: Optional[str] = None
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None


class SolutionResponse(SolutionBase):
    id: UUID4
    problem_id: UUID4
    created_at: datetime
    created_by: UUID4


# Problem schemas
class ProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    difficulty: DifficultyLevel
    problem_type: ProblemType = Field(default=ProblemType.ALGORITHM)
    time_limit_ms: int = Field(default=2000, gt=0, le=30000)
    memory_limit_mb: int = Field(default=128, gt=0, le=1024)
    hints: Optional[List[str]] = Field(None, description="List of hints")
    editorial: Optional[str] = Field(None, description="Editorial/explanation")
    is_premium: bool = Field(default=False)

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        return v.strip()

    @field_validator('hints')
    @classmethod
    def validate_hints(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return [hint.strip() for hint in v if hint.strip()]
        return v


class ProblemCreate(ProblemBase):
    slug: Optional[str] = Field(None, description="URL slug, auto-generated if not provided")
    tag_ids: Optional[List[UUID4]] = Field(default_factory=list)
    company_ids: Optional[List[UUID4]] = Field(default_factory=list)
    test_cases: Optional[List[TestCaseCreate]] = Field(default_factory=list)
    code_templates: Optional[List[CodeTemplateCreate]] = Field(default_factory=list)

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            # Basic slug validation
            import re
            v = v.strip().lower()
            if not re.match(r'^[a-z0-9-]+$', v):
                raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = Field(None, min_length=1)
    difficulty: Optional[DifficultyLevel] = None
    problem_type: Optional[ProblemType] = None
    status: Optional[ProblemStatus] = None
    time_limit_ms: Optional[int] = Field(None, gt=0, le=30000)
    memory_limit_mb: Optional[int] = Field(None, gt=0, le=1024)
    hints: Optional[List[str]] = None
    editorial: Optional[str] = None
    is_premium: Optional[bool] = None
    tag_ids: Optional[List[UUID4]] = None
    company_ids: Optional[List[UUID4]] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip()
        return v

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            import re
            v = v.strip().lower()
            if not re.match(r'^[a-z0-9-]+$', v):
                raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v


class ProblemResponse(ProblemBase):
    id: UUID4
    slug: str
    status: ProblemStatus
    acceptance_rate: Optional[float]
    total_submissions: int
    total_accepted: int
    likes: int
    dislikes: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    created_by: UUID4
    
    # Relationships
    tags: List[TagResponse] = Field(default_factory=list)
    companies: List[CompanyResponse] = Field(default_factory=list)


class ProblemPublicResponse(ProblemResponse):
    """Public problem response with test cases and templates (no solutions)"""
    code_templates: List[CodeTemplateResponse] = Field(default_factory=list)
    test_cases: List[TestCaseResponse] = Field(default_factory=list)


class ProblemDetailResponse(ProblemResponse):
    """Extended problem response with test cases, templates, and solutions"""
    code_templates: List[CodeTemplateResponse] = Field(default_factory=list)
    test_cases: List[TestCaseResponse] = Field(default_factory=list)
    solutions: List[SolutionResponse] = Field(default_factory=list)


class ProblemListResponse(BaseModel):
    """Response for paginated problem list"""
    problems: List[ProblemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# Code execution schemas
class CodeRunRequest(BaseModel):
    language: str = Field(..., min_length=1, max_length=20)
    code: str = Field(..., description="Code to run")


class TestResult(BaseModel):
    test_case_id: Optional[str] = None
    input_data: str
    expected_output: str
    actual_output: Optional[str] = None
    passed: bool
    runtime_ms: Optional[int] = None
    memory_mb: Optional[float] = None
    error: Optional[str] = None


class CodeRunResponse(BaseModel):
    success: bool
    results: List[TestResult]
    runtime_ms: Optional[int] = None
    memory_mb: Optional[float] = None
    error: Optional[str] = None


# Submission schemas
class SubmissionCreate(BaseModel):
    problem_id: UUID4
    language: str = Field(..., min_length=1, max_length=20)
    solution_code: str = Field(..., description="User's solution code")


class SubmissionResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    problem_id: UUID4
    language: str
    solution_code: str
    status: str
    runtime_ms: Optional[int]
    memory_mb: Optional[float]
    test_results: Optional[Dict]
    submitted_at: datetime
    judged_at: Optional[datetime]


# Filter schemas for admin
class ProblemFilters(BaseModel):
    title: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    status: Optional[ProblemStatus] = None
    problem_type: Optional[ProblemType] = None
    tag_ids: Optional[List[UUID4]] = None
    company_ids: Optional[List[UUID4]] = None
    is_premium: Optional[bool] = None
    created_by: Optional[UUID4] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# Bulk operations
class BulkProblemStatusUpdate(BaseModel):
    problem_ids: List[UUID4] = Field(..., min_length=1)
    status: ProblemStatus


class BulkProblemDelete(BaseModel):
    problem_ids: List[UUID4] = Field(..., min_length=1)


# Statistics
class ProblemStats(BaseModel):
    total_problems: int
    by_difficulty: Dict[str, int]
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    recent_problems: int  # Problems created in last 30 days
    top_tags: List[Dict[str, int]]  # Most used tags


# Admin dashboard
class AdminDashboardResponse(BaseModel):
    stats: ProblemStats
    recent_submissions: List[SubmissionResponse]
    pending_reviews: List[ProblemResponse]  # Problems in review status 