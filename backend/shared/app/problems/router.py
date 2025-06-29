from typing import List, Optional
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import UUID4
from shared.app.auth.models import User
from shared.app.auth.security import get_current_user
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
from .code_templates import code_template_generator, LanguageType
from .professional_runner import professional_code_runner, TestCase, SubmissionResult
from shared.app.problems.models import Problem, TestCase, Tag, Company
from shared.app.auth.security import get_current_active_superuser
from shared.app.schemas import Pagination
from shared.app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from uuid import UUID
from shared.app.problems import service

# 🌍 Universal Code Executor Import
try:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).parent.parent.parent.parent / "duel_service"))
    
    from universal_code_executor import (
        execute_code, execute_for_problem, execute_for_duel,
        get_supported_languages as get_universal_languages,
        is_language_supported as is_universal_supported,
        ExecutionMode, ExecutionResult
    )
    UNIVERSAL_EXECUTOR_AVAILABLE = True
    print("✅ Universal Code Executor is available")
except ImportError as e:
    print(f"⚠️ Universal Code Executor not available: {e}")
    UNIVERSAL_EXECUTOR_AVAILABLE = False


router = APIRouter(prefix="/problems", tags=["Problems"])


@router.get("/languages")
async def get_supported_languages():
    """📋 Список поддерживаемых языков программирования"""
    
    # Базовые языки
    base_languages = [
        {
            "id": lang.value,
            "name": lang.value.title(),
            "extension": {
                "python": ".py",
                "python3": ".py", 
                "java": ".java",
                "cpp": ".cpp",
                "c": ".c",
                "javascript": ".js",
                "typescript": ".ts",
                "go": ".go",
                "rust": ".rs"
            }.get(lang.value, ".txt"),
            "supports_classes": lang.value in ["python", "python3", "java", "cpp", "rust"],
            "runner": "standard"
        }
        for lang in LanguageType
    ]
    
    # Языки Universal Executor
    universal_languages = []
    if UNIVERSAL_EXECUTOR_AVAILABLE:
        try:
            supported_langs = get_universal_languages()
            universal_languages = [
                {
                    "id": lang,
                    "name": lang.title(),
                    "extension": {
                        "python": ".py",
                        "python3": ".py",
                        "java": ".java",
                        "cpp": ".cpp",
                        "javascript": ".js",
                        "typescript": ".ts",
                        "go": ".go",
                        "rust": ".rs",
                        "csharp": ".cs",
                        "kotlin": ".kt",
                        "swift": ".swift"
                    }.get(lang, ".txt"),
                    "supports_classes": lang in ["python", "python3", "java", "cpp", "rust", "csharp", "kotlin", "swift"],
                    "runner": "universal_executor"
                }
                for lang in supported_langs
            ]
        except Exception as e:
            print(f"⚠️ Failed to get Universal Executor languages: {e}")
    
    return {
        "supported_languages": base_languages,
        "universal_executor": {
            "available": UNIVERSAL_EXECUTOR_AVAILABLE,
            "languages": universal_languages
        },
        "total_languages": len(base_languages) + len(universal_languages),
        "runners": {
            "standard": len(base_languages),
            "universal_executor": len(universal_languages)
        }
    }


@router.get("/universal/languages")
async def get_universal_languages():
    """🌍 Получить языки Universal Executor"""
    if not UNIVERSAL_EXECUTOR_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Universal Code Executor not available"
        )
    
    try:
        languages = get_universal_languages()
        return {
            "supported_languages": languages,
            "total": len(languages),
            "status": "available"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Universal Executor languages: {str(e)}"
        )


@router.get("/examples/templates")
async def get_example_templates():
    """🎨 Демонстрация шаблонов кода для примера"""
    
    templates = code_template_generator.generate_example_templates()
    
    return {
        "problem": "longestSubsequenceRepeatedK",
        "description": "Find the longest subsequence of string s that appears at least k times",
        "templates": templates,
        "example_usage": {
            "input": 's = "letsleetcode", k = 2',
            "output": '"let"'
        }
    }


@router.get("/random", response_model=ProblemDetailResponse, tags=["problems"])
async def get_random_problem_endpoint(
    difficulty: str = Query(None, description="Filter by difficulty"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single random problem, optionally filtering by difficulty.
    This is useful for internal services like the Duels service.
    """
    problem = await service.get_random_problem(db, difficulty)
    if not problem:
        raise HTTPException(
            status_code=404,
            detail="No problems found for the given criteria."
        )
    return problem


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
    
    # 🌍 **UNIVERSAL EXECUTOR**: If available and language supported, use it
    use_universal = (
        UNIVERSAL_EXECUTOR_AVAILABLE and
        is_universal_supported(run_request.language)
    )
    
    if use_universal:
        try:
            print(f"🌍 Using Universal Executor for {run_request.language}")
            
            # Convert test cases to Universal Executor format
            test_cases_data = []
            for tc in example_test_cases:
                test_cases_data.append({
                    "input": tc.input_data,
                    "expected": tc.expected_output,
                    "hidden": False
                })
            
            # Execute using Universal Executor
            universal_result = await execute_for_problem(
                code=run_request.code,
                language=run_request.language,
                test_cases=test_cases_data
            )
            
            return universal_result
            
        except Exception as e:
            print(f"⚠️ Universal Executor failed, falling back: {e}")
    
    # Execute code using professional runner (fallback)
    try:
        print("Using professional code runner as fallback")
        execute_code = professional_code_runner.submit_solution
        
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
            # 🌍 **UNIVERSAL EXECUTOR**: If available and language supported, use it
            use_universal = (
                UNIVERSAL_EXECUTOR_AVAILABLE and
                is_universal_supported(submission_request.language)
            )
            
            if use_universal:
                try:
                    print(f"🌍 Submitting with Universal Executor for {submission_request.language}")
                    
                    # Convert all test cases for submission
                    test_cases_data = []
                    for tc in all_test_cases:
                        test_cases_data.append({
                            "input": tc.input,
                            "expected": tc.output,
                            "hidden": tc.is_hidden
                        })
                    
                    # Execute with universal executor
                    exec_result = await execute_for_submission(
                        code=submission_request.code,
                        language=submission_request.language,
                        test_cases=test_cases_data,
                        entrypoint_class=problem.entrypoint_class,
                        entrypoint_method=problem.entrypoint_method
                    )
                    
                    submission_result = SubmissionResult(
                        success=exec_result.success,
                        passed=exec_result.passed_tests,
                        total=exec_result.total_tests,
                        execution_time=exec_result.runtime_ms,
                        error=exec_result.error,
                        test_results=exec_result.test_results or []
                    )
                    
                except Exception as e:
                    print(f"⚠️ Universal Executor submission failed, falling back: {e}")
                    submission_result = SubmissionResult(
                        success=False, passed=0, total=len(all_test_cases),
                        error=f"Universal executor failed: {e}", test_results=[]
                    )
            
            else:
                # **STANDARD RUNNER**: Fallback or default
                # Execute code using professional runner for submission
                print("Using professional code runner for submission")
                execute_code = professional_code_runner.submit_solution
                
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


@router.get("/templates/{problem_slug}")
async def get_code_templates(
    problem_slug: str,
    current_user: User = Depends(get_current_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """🎨 Получить шаблоны кода для всех языков программирования"""
    
    # Получаем информацию о проблеме
    problem = await problem_service.get_problem_by_slug(problem_slug)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Парсим параметры функции из описания или используем стандартные
    function_name = getattr(problem, 'function_name', None) or "solution"
    parameters = [
        {"name": "nums", "type": "List[int]"},
        {"name": "target", "type": "int"}
    ]
    return_type = "int"
    
    # Генерируем шаблоны для всех языков
    templates = code_template_generator.generate_templates(
        function_name=function_name,
        parameters=parameters,
        return_type=return_type,
        problem_description=problem.description,
        constraints=getattr(problem, 'constraints', None) or "",
        examples=[]
    )
    
    return {
        "problem_slug": problem_slug,
        "function_name": function_name,
        "templates": templates,
        "supported_languages": [lang.value for lang in LanguageType]
    }


@router.post("/{problem_slug}/run")
async def run_professional_code(
    problem_slug: str,
    submission_data: dict,
    current_user: User = Depends(get_current_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """🧪 Запуск кода против видимых тест-кейсов"""
    
    # Валидируем входные данные
    code = submission_data.get("code", "")
    language = submission_data.get("language", "python")
    
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    # Получаем проблему
    problem = await problem_service.get_problem_by_slug(problem_slug)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Загружаем только видимые тест-кейсы для демонстрации
    test_cases = professional_code_runner.load_real_test_cases(
        problem_slug=problem_slug,
        include_hidden=False  # Только видимые примеры
    )
    
    try:
        # Преобразуем строку языка в enum
        language_enum = LanguageType(language.lower())
        
        # Выполняем тестирование
        result = await professional_code_runner.submit_solution(
            code=code,
            language=language_enum,
            test_cases=test_cases,
            function_name=getattr(problem, 'function_name', None) or "solution",
            main_wrapper=True
        )
        
        # Преобразуем TestResult в формат для фронтенда
        test_results_response = []
        if result.test_results:
            for test_result in result.test_results:
                test_results_response.append({
                    "test_case_index": test_result.test_case_index,
                    "passed": test_result.passed,
                    "input_data": test_result.input_data,
                    "expected_output": test_result.expected_output,
                    "actual_output": test_result.actual_output,
                    "execution_time": test_result.execution_time,
                    "error_message": test_result.error_message,
                    "hidden": test_result.hidden,
                    "stdout": test_result.stdout,
                    "stderr": test_result.stderr
                })
        
        return {
            "success": result.status == "Accepted",
            "results": test_results_response,
            "runtime_ms": result.execution_time * 1000,  # Конвертируем в миллисекунды
            "memory_mb": result.memory_usage / 1024,  # Конвертируем из KB в MB
            "error": result.error_message if result.status != "Accepted" else None,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
        
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported language: {language}. Supported: {[lang.value for lang in LanguageType]}"
        )
    except Exception as e:
        return {
            "success": False,
            "results": [],
            "runtime_ms": None,
            "memory_mb": None,
            "error": f"Internal error: {str(e)}"
        }


@router.post("/submit/{problem_slug}")
async def submit_professional_solution(
    problem_slug: str,
    submission_data: dict,
    current_user: User = Depends(get_current_user),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """🏆 Профессиональная отправка решения как на LeetCode"""
    
    # Валидируем входные данные
    code = submission_data.get("code", "")
    language = submission_data.get("language", "python")
    
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    # Получаем проблему
    problem = await problem_service.get_problem_by_slug(problem_slug)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Загружаем реальные тест-кейсы для задачи
    test_cases = professional_code_runner.load_real_test_cases(
        problem_slug=problem_slug,
        include_hidden=True  # Включаем скрытые тест-кейсы для полной проверки
    )
    
    try:
        # Преобразуем строку языка в enum
        language_enum = LanguageType(language.lower())
        
        # Выполняем профессиональную проверку
        result = await professional_code_runner.submit_solution(
            code=code,
            language=language_enum,
            test_cases=test_cases,
            function_name=getattr(problem, 'function_name', None) or "solution",
            main_wrapper=True
        )
        
        # Сохраняем результат в базу данных (если нужно)
        # await save_submission_result(db, current_user.id, problem.id, result)
        
        return {
            "submission_id": f"sub_{problem.id}_{current_user.id}",
            "status": result.status,
            "passed_tests": result.passed_tests,
            "total_tests": result.total_tests,
            "execution_time": f"{result.execution_time:.3f}s",
            "memory_usage": f"{result.memory_usage}KB",
            "score": result.score,
            "error_message": result.error_message,
            "accepted": result.status == "Accepted"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported language: {language}. Supported: {[lang.value for lang in LanguageType]}"
        )
    except Exception as e:
        return {
            "submission_id": None,
            "status": "Internal Error",
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "execution_time": "0.000s",
            "memory_usage": "0KB",
            "score": 0.0,
            "error_message": f"Internal error: {str(e)}",
            "accepted": False
        }


@router.post("/{slug}/universal/run")
async def run_code_universal(
    slug: str,
    run_request: CodeRunRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    problem_service: ProblemService = Depends(get_problem_service)
):
    """🌍 Run code using Universal Executor specifically"""
    if not UNIVERSAL_EXECUTOR_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Universal Code Executor is not available for this operation."
        )
    
    problem = await problem_service.get_problem_by_slug(slug)
    if not problem or problem.status != ProblemStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
        
    example_test_cases = problem.example_test_cases or []
    
    # Check if language is supported by Universal Executor
    if not is_universal_supported(run_request.language):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language '{run_request.language}' is not supported by Universal Executor."
        )
    
    try:
        # Convert test cases to Universal Executor format
        test_cases_data = []
        for tc in example_test_cases:
            test_cases_data.append({
                "input": tc.input_data,
                "expected": tc.expected_output
            })
        
        # Execute using Universal Executor
        universal_result = await execute_for_problem(
            code=run_request.code,
            language=run_request.language,
            test_cases=test_cases_data
        )
        
        return universal_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code execution failed: {str(e)}"
        )


@router.get("/universal/status")
async def get_universal_executor_status():
    """🌍 Получить статус Universal Executor"""
    if not UNIVERSAL_EXECUTOR_AVAILABLE:
        return {
            "available": False,
            "error": "Universal Code Executor not available"
        }
    
    try:
        from universal_code_executor import get_system_status
        status_info = get_system_status()
        return {
            "available": True,
            **status_info
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e)
        }


 