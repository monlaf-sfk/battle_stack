#!/usr/bin/env python3
"""
⚡ Async Tasks with Celery
Асинхронная обработка проверки кода и генерации задач
"""
import asyncio
import json
import os
from typing import Dict, List, Any, Optional
from celery import Celery
from celery.result import AsyncResult
import redis
from datetime import datetime, timedelta

# Celery configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# Initialize Celery
celery_app = Celery(
    "battlestack_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["shared.app.async_tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=3600,  # 1 hour
    task_soft_time_limit=30,  # 30 seconds soft limit
    task_time_limit=60,  # 1 minute hard limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=True
)

# Redis client for additional caching
redis_client = redis.from_url(REDIS_URL)

@celery_app.task(bind=True, max_retries=2)
def check_solution_task(self, duel_id: str, user_id: str, code: str, language: str, test_cases: List[Dict]):
    """
    🧪 Асинхронная проверка решения пользователя
    """
    try:
        print(f"⚡ Processing solution check: duel_id={duel_id}, user_id={user_id}")
        
        # Import here to avoid circular imports
        from shared.app.problems.sandbox_runner import sandbox_runner
        
        # Запускаем sandbox в отдельном event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                sandbox_runner.run_code_securely(
                    user_code=code,
                    test_cases=test_cases,
                    language=language,
                    problem_title=f"Duel_{duel_id}"
                )
            )
            
            # Конвертируем результат в словарь
            result_dict = {
                "success": result.success,
                "output": result.output,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
                "memory_used_mb": result.memory_used_mb,
                "passed": result.passed,
                "failed": result.failed,
                "total_tests": result.total_tests,
                "test_results": result.test_results,
                "is_solution_correct": result.is_solution_correct
            }
            
            # Кэшируем результат
            cache_key = f"solution_result:{duel_id}:{user_id}"
            redis_client.setex(cache_key, 3600, json.dumps(result_dict))
            
            print(f"✅ Solution check completed: {result.passed}/{result.total_tests} passed")
            return result_dict
            
        finally:
            loop.close()
            
    except Exception as exc:
        print(f"❌ Solution check failed: {exc}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            print(f"🔄 Retrying... (attempt {self.request.retries + 1})")
            raise self.retry(countdown=2 ** self.request.retries)
        
        # Final failure
        return {
            "success": False,
            "error": f"Task failed after retries: {str(exc)}",
            "passed": 0,
            "failed": 1,
            "total_tests": 1,
            "is_solution_correct": False
        }

@celery_app.task(bind=True, max_retries=1)
def generate_ai_problem_task(self, difficulty: str, language: str, topic: Optional[str] = None):
    """
    🧠 Асинхронная генерация AI задачи с валидацией
    """
    try:
        print(f"🧠 Generating AI problem: difficulty={difficulty}, language={language}")
        
        # Import here to avoid circular imports
        from duel_service.validated_ai_generator import validated_ai_generator, DifficultyLevel
        
        # Конвертируем строку в enum
        difficulty_enum = DifficultyLevel(difficulty)
        
        # Запускаем генерацию в отдельном event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            problem = loop.run_until_complete(
                validated_ai_generator.generate_validated_problem(
                    difficulty=difficulty_enum,
                    language=language,
                    topic=topic
                )
            )
            
            if problem.validation_passed:
                # Конвертируем в словарь для JSON сериализации
                problem_dict = {
                    "title": problem.title,
                    "description": problem.description,
                    "function_name": problem.function_name,
                    "input_format": problem.input_format,
                    "starter_code": problem.starter_code,
                    "ground_truth": problem.ground_truth,
                    "test_cases": problem.test_cases,
                    "difficulty": problem.difficulty,
                    "quality_score": problem.quality_score,
                    "validation_passed": problem.validation_passed,
                    "fingerprint": problem.fingerprint
                }
                
                # Кэшируем валидированную задачу
                cache_key = f"ai_problem:{difficulty}:{problem.fingerprint}"
                redis_client.setex(cache_key, 7200, json.dumps(problem_dict))  # 2 hours
                
                print(f"✅ AI problem generated and validated: {problem.title} (quality: {problem.quality_score}/10)")
                return problem_dict
            else:
                raise Exception("AI problem validation failed")
                
        finally:
            loop.close()
            
    except Exception as exc:
        print(f"❌ AI problem generation failed: {exc}")
        
        # Retry logic for generation failures
        if self.request.retries < self.max_retries:
            print(f"🔄 Retrying AI generation... (attempt {self.request.retries + 1})")
            raise self.retry(countdown=5)
        
        # Return fallback problem
        print("🔄 Using fallback problem")
        fallback_problems = {
            "easy": {
                "title": "Find Maximum",
                "description": "Find the maximum element in an array.",
                "function_name": "find_max",
                "starter_code": "def find_max(arr):\n    # TODO: Find maximum element\n    pass",
                "test_cases": [
                    {"input": [[1, 2, 3, 4, 5]], "expected": 5},
                    {"input": [[-1, -2, -3]], "expected": -1},
                    {"input": [[42]], "expected": 42}
                ]
            }
        }
        
        return fallback_problems.get(difficulty, fallback_problems["easy"])

@celery_app.task
def warm_up_docker_images():
    """
    🔥 Предварительный прогрев Docker образов
    """
    try:
        from shared.app.problems.sandbox_runner import sandbox_runner
        
        # Простой тест для прогрева
        test_code = "def test(): return 42"
        test_cases = [{"input": [], "expected": 42}]
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                sandbox_runner.run_code_securely(
                    user_code=test_code,
                    test_cases=test_cases,
                    language="python",
                    problem_title="Warmup"
                )
            )
            print(f"🔥 Docker warmup completed: {result.success}")
            return {"warmed_up": True, "success": result.success}
        finally:
            loop.close()
            
    except Exception as e:
        print(f"❌ Docker warmup failed: {e}")
        return {"warmed_up": False, "error": str(e)}

class AsyncTaskManager:
    """
    📋 Менеджер асинхронных задач
    """
    
    def __init__(self):
        self.redis_client = redis_client
    
    async def submit_solution_check(
        self,
        duel_id: str,
        user_id: str,
        code: str,
        language: str,
        test_cases: List[Dict]
    ) -> str:
        """
        🚀 Отправляем задачу на проверку решения
        """
        try:
            # Проверяем кэш
            cache_key = f"solution_result:{duel_id}:{user_id}"
            cached_result = self.redis_client.get(cache_key)
            
            if cached_result:
                print(f"📦 Using cached solution result for {user_id}")
                return "CACHED"
            
            # Отправляем задачу в Celery
            task = check_solution_task.delay(
                duel_id=duel_id,
                user_id=user_id,
                code=code,
                language=language,
                test_cases=test_cases
            )
            
            print(f"⚡ Solution check task submitted: {task.id}")
            return task.id
            
        except Exception as e:
            print(f"❌ Failed to submit solution check: {e}")
            raise
    
    async def get_solution_result(self, task_id: str, duel_id: str, user_id: str) -> Optional[Dict]:
        """
        📥 Получаем результат проверки решения
        """
        try:
            if task_id == "CACHED":
                # Возвращаем кэшированный результат
                cache_key = f"solution_result:{duel_id}:{user_id}"
                cached_result = self.redis_client.get(cache_key)
                if cached_result:
                    return json.loads(cached_result)
                return None
            
            # Получаем результат из Celery
            task_result = AsyncResult(task_id, app=celery_app)
            
            if task_result.ready():
                if task_result.successful():
                    return task_result.result
                else:
                    print(f"❌ Task failed: {task_result.info}")
                    return {
                        "success": False,
                        "error": str(task_result.info),
                        "passed": 0,
                        "failed": 1,
                        "total_tests": 1,
                        "is_solution_correct": False
                    }
            else:
                # Задача еще выполняется
                return None
                
        except Exception as e:
            print(f"❌ Failed to get solution result: {e}")
            return {
                "success": False,
                "error": str(e),
                "passed": 0,
                "failed": 1,
                "total_tests": 1,
                "is_solution_correct": False
            }
    
    async def submit_ai_problem_generation(
        self,
        difficulty: str,
        language: str,
        topic: Optional[str] = None
    ) -> str:
        """
        🧠 Отправляем задачу на генерацию AI проблемы
        """
        try:
            # Проверяем кэш валидированных задач
            cache_pattern = f"ai_problem:{difficulty}:*"
            cached_keys = self.redis_client.keys(cache_pattern)
            
            if cached_keys:
                print(f"📦 Using cached AI problem for {difficulty}")
                return "CACHED"
            
            # Отправляем задачу в Celery
            task = generate_ai_problem_task.delay(
                difficulty=difficulty,
                language=language,
                topic=topic
            )
            
            print(f"🧠 AI problem generation task submitted: {task.id}")
            return task.id
            
        except Exception as e:
            print(f"❌ Failed to submit AI problem generation: {e}")
            raise
    
    async def get_ai_problem_result(self, task_id: str, difficulty: str) -> Optional[Dict]:
        """
        📥 Получаем результат генерации AI проблемы
        """
        try:
            if task_id == "CACHED":
                # Возвращаем случайную кэшированную задачу
                cache_pattern = f"ai_problem:{difficulty}:*"
                cached_keys = self.redis_client.keys(cache_pattern)
                if cached_keys:
                    import random
                    random_key = random.choice(cached_keys)
                    cached_result = self.redis_client.get(random_key)
                    if cached_result:
                        return json.loads(cached_result)
                return None
            
            # Получаем результат из Celery
            task_result = AsyncResult(task_id, app=celery_app)
            
            if task_result.ready():
                if task_result.successful():
                    return task_result.result
                else:
                    print(f"❌ AI generation task failed: {task_result.info}")
                    return None
            else:
                # Задача еще выполняется
                return None
                
        except Exception as e:
            print(f"❌ Failed to get AI problem result: {e}")
            return None
    
    def start_warmup(self):
        """🔥 Запускаем прогрев системы"""
        try:
            task = warm_up_docker_images.delay()
            print(f"🔥 Warmup task started: {task.id}")
            return task.id
        except Exception as e:
            print(f"❌ Failed to start warmup: {e}")
            return None

# Global instance
task_manager = AsyncTaskManager() 