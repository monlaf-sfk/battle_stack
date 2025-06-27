"""
🧱 ANTI-DUPLICATE SYSTEM
Профессиональная система предотвращения дубликатов задач в дуэлях
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Set, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from duel_service.models import DuelProblem, UserProblemHistory, DuelDifficulty, ProblemType


class ProblemFingerprint:
    """🔐 Уникальный отпечаток задачи для предотвращения дубликатов"""
    
    @staticmethod
    def calculate_fingerprint(problem_data: Dict[str, Any]) -> str:
        """
        Вычисляет MD5 fingerprint задачи на основе семантических признаков
        
        Args:
            problem_data: Словарь с данными задачи
            
        Returns:
            32-символьный MD5 хеш
        """
        # Извлекаем ключевые компоненты
        title = problem_data.get("title", "").strip().lower()
        description = problem_data.get("description", "").strip().lower()
        
        # Извлекаем название функции из starter_code
        function_name = ""
        starter_code = problem_data.get("starter_code", {})
        if isinstance(starter_code, dict):
            python_code = starter_code.get("python", "")
            if "def " in python_code:
                # Извлекаем название функции
                import re
                match = re.search(r'def\s+(\w+)\s*\(', python_code)
                if match:
                    function_name = match.group(1).lower()
        
        # Формируем параметры функции для fingerprint
        input_format = problem_data.get("input_format", {})
        params_signature = ""
        if isinstance(input_format, dict) and "params" in input_format:
            params = input_format["params"]
            if isinstance(params, list):
                # Сортируем параметры для консистентности
                param_strings = []
                for param in params:
                    if isinstance(param, dict):
                        param_name = param.get("name", "")
                        param_type = param.get("type", "")
                        param_strings.append(f"{param_name}:{param_type}")
                params_signature = "|".join(sorted(param_strings))
        
        # Создаем уникальный ключ
        key_components = [
            title,
            function_name,
            params_signature,
            # Берем первые 100 символов описания для семантической схожести
            description[:100]
        ]
        
        key = "|".join(key_components)
        
        # Вычисляем MD5
        fingerprint = hashlib.md5(key.encode('utf-8')).hexdigest()
        
        print(f"🔐 Fingerprint calculated:")
        print(f"   Title: {title}")
        print(f"   Function: {function_name}")
        print(f"   Params: {params_signature}")
        print(f"   Description preview: {description[:50]}...")
        print(f"   Fingerprint: {fingerprint}")
        
        return fingerprint

    @staticmethod
    def detect_semantic_similarity(problem1: Dict[str, Any], problem2: Dict[str, Any]) -> float:
        """
        Определяет семантическую схожесть двух задач (0.0 - 1.0)
        
        Returns:
            Коэффициент схожести от 0.0 (разные) до 1.0 (идентичные)
        """
        similarity_score = 0.0
        
        # 1. Схожесть названий (30%)
        title1 = problem1.get("title", "").lower()
        title2 = problem2.get("title", "").lower()
        
        if title1 == title2:
            similarity_score += 0.3
        elif title1 in title2 or title2 in title1:
            similarity_score += 0.15
        
        # 2. Схожесть функций (25%)
        func1 = ProblemFingerprint._extract_function_name(problem1)
        func2 = ProblemFingerprint._extract_function_name(problem2)
        
        if func1 and func2:
            if func1 == func2:
                similarity_score += 0.25
            elif func1.replace("_", "") == func2.replace("_", ""):
                similarity_score += 0.15
        
        # 3. Схожесть типа задачи (20%)
        type1 = problem1.get("problem_type", "")
        type2 = problem2.get("problem_type", "")
        if type1 == type2:
            similarity_score += 0.2
        
        # 4. Схожесть сложности (15%)
        diff1 = problem1.get("difficulty", "")
        diff2 = problem2.get("difficulty", "")
        if diff1 == diff2:
            similarity_score += 0.15
        
        # 5. Схожесть описания (10%)
        desc1 = problem1.get("description", "").lower()
        desc2 = problem2.get("description", "").lower()
        
        # Простая проверка общих ключевых слов
        keywords1 = set(desc1.split()[:20])  # Первые 20 слов
        keywords2 = set(desc2.split()[:20])
        
        if keywords1 and keywords2:
            common_words = keywords1.intersection(keywords2)
            if len(common_words) > 0:
                keyword_similarity = len(common_words) / max(len(keywords1), len(keywords2))
                similarity_score += 0.1 * keyword_similarity
        
        return min(similarity_score, 1.0)
    
    @staticmethod
    def _extract_function_name(problem_data: Dict[str, Any]) -> Optional[str]:
        """Извлекает название функции из starter_code"""
        starter_code = problem_data.get("starter_code", {})
        if isinstance(starter_code, dict):
            python_code = starter_code.get("python", "")
            if "def " in python_code:
                import re
                match = re.search(r'def\s+(\w+)\s*\(', python_code)
                if match:
                    return match.group(1).lower()
        return None


class AntiDuplicateManager:
    """🛡️ Менеджер анти-дубликатной системы"""
    
    def __init__(self):
        self.ttl_days = 30  # Повторное использование через 30 дней
        self.max_reuse_count = 3  # Максимум 3 переиспользования
        self.similarity_threshold = 0.7  # Порог схожести для дубликатов
    
    async def check_problem_eligibility(
        self,
        db: AsyncSession,
        user_ids: List[UUID],
        difficulty: DuelDifficulty,
        problem_type: ProblemType
    ) -> Tuple[List[str], Dict[str, datetime]]:
        """
        Проверяет какие задачи НЕ подходят для игроков
        
        Returns:
            (excluded_fingerprints, last_used_map)
        """
        excluded_fingerprints = []
        last_used_map = {}
        
        # Получаем историю всех игроков
        for user_id in user_ids:
            history_query = select(UserProblemHistory).where(
                and_(
                    UserProblemHistory.user_id == user_id,
                    UserProblemHistory.difficulty == difficulty,
                    UserProblemHistory.problem_type == problem_type
                )
            ).order_by(desc(UserProblemHistory.used_at))
            
            result = await db.execute(history_query)
            user_history = result.scalars().all()
            
            for record in user_history:
                fingerprint = record.fingerprint
                used_at = record.used_at
                
                # Проверяем TTL (30 дней)
                time_since_used = datetime.utcnow() - used_at
                if time_since_used.days < self.ttl_days:
                    if fingerprint not in excluded_fingerprints:
                        excluded_fingerprints.append(fingerprint)
                
                # Сохраняем последнее использование
                if fingerprint not in last_used_map or used_at > last_used_map[fingerprint]:
                    last_used_map[fingerprint] = used_at
        
        print(f"🚫 Excluded {len(excluded_fingerprints)} fingerprints for users: {[str(u)[:8] for u in user_ids]}")
        return excluded_fingerprints, last_used_map
    
    async def find_suitable_problems(
        self,
        db: AsyncSession,
        user_ids: List[UUID],
        difficulty: DuelDifficulty,
        problem_type: ProblemType,
        limit: int = 5
    ) -> List[DuelProblem]:
        """
        Находит подходящие задачи с учетом анти-дубликатной системы
        """
        excluded_fingerprints, _ = await self.check_problem_eligibility(
            db, user_ids, difficulty, problem_type
        )
        
        # Ищем задачи которых нет в исключенных
        query = select(DuelProblem).where(
            and_(
                DuelProblem.difficulty == difficulty,
                DuelProblem.problem_type == problem_type,
                DuelProblem.times_used < self.max_reuse_count,
                or_(
                    DuelProblem.fingerprint.is_(None),  # Старые задачи без fingerprint
                    ~DuelProblem.fingerprint.in_(excluded_fingerprints)  # Не в исключенных
                )
            )
        ).order_by(func.random()).limit(limit)
        
        result = await db.execute(query)
        suitable_problems = result.scalars().all()
        
        print(f"✅ Found {len(suitable_problems)} suitable problems")
        return suitable_problems
    
    async def record_problem_usage(
        self,
        db: AsyncSession,
        user_id: UUID,
        problem: DuelProblem,
        duel_id: UUID,
        solved: bool = False,
        tests_passed: int = 0,
        total_tests: int = 0,
        solve_time_seconds: Optional[int] = None
    ):
        """Записывает использование задачи в историю пользователя"""
        
        # 🔧 Extract all problem attributes immediately to avoid greenlet issues
        problem_id = problem.id
        problem_fingerprint = problem.fingerprint or "unknown"
        problem_title = problem.title
        problem_difficulty = problem.difficulty
        problem_type = problem.problem_type
        
        # Создаем запись в истории
        history_record = UserProblemHistory(
            user_id=user_id,
            problem_id=problem_id,
            duel_id=duel_id,
            fingerprint=problem_fingerprint,
            problem_title=problem_title,
            difficulty=problem_difficulty,
            problem_type=problem_type,
            solved=solved,
            tests_passed=tests_passed,
            total_tests=total_tests,
            solve_time_seconds=solve_time_seconds
        )
        
        db.add(history_record)
        
        # Обновляем last_used_at у задачи
        problem.last_used_at = datetime.utcnow()
        
        print(f"📝 Recorded problem usage: {problem_title} for user {str(user_id)[:8]}")
    
    async def generate_exclusion_context(
        self,
        db: AsyncSession,
        user_ids: List[UUID],
        difficulty: DuelDifficulty,
        problem_type: ProblemType
    ) -> Dict[str, Any]:
        """
        Генерирует контекст исключений для AI генератора
        """
        excluded_fingerprints, last_used = await self.check_problem_eligibility(
            db, user_ids, difficulty, problem_type
        )
        
        # Получаем названия и типы исключенных задач
        excluded_titles = []
        excluded_functions = []
        problem_types_used = set()
        
        if excluded_fingerprints:
            query = select(DuelProblem).where(
                DuelProblem.fingerprint.in_(excluded_fingerprints)
            )
            result = await db.execute(query)
            excluded_problems = result.scalars().all()
            
            for problem in excluded_problems:
                # 🔧 Extract attributes immediately to avoid greenlet issues
                problem_title = problem.title
                problem_type_value = problem.problem_type.value
                problem_starter_code = problem.starter_code
                
                excluded_titles.append(problem_title)
                problem_types_used.add(problem_type_value)
                
                # Извлекаем название функции
                if isinstance(problem_starter_code, dict):
                    python_code = problem_starter_code.get("python", "")
                    if "def " in python_code:
                        import re
                        match = re.search(r'def\s+(\w+)\s*\(', python_code)
                        if match:
                            excluded_functions.append(match.group(1))
        
        return {
            "exclude_titles": excluded_titles,
            "exclude_functions": excluded_functions,
            "exclude_fingerprints": excluded_fingerprints,
            "problem_types_used": list(problem_types_used),
            "user_count": len(user_ids),
            "difficulty": difficulty.value,
            "target_type": problem_type.value
        }
    
    async def report_duplicate(
        self,
        db: AsyncSession,
        user_id: UUID,
        problem_id: UUID,
        feedback: str
    ):
        """Система жалоб на дубликаты"""
        
        # Найти запись в истории
        query = select(UserProblemHistory).where(
            and_(
                UserProblemHistory.user_id == user_id,
                UserProblemHistory.problem_id == problem_id
            )
        ).order_by(desc(UserProblemHistory.used_at)).limit(1)
        
        result = await db.execute(query)
        history_record = result.scalar_one_or_none()
        
        if history_record:
            history_record.reported_as_duplicate = True
            history_record.duplicate_feedback = feedback
            
            print(f"🚨 Duplicate reported: {history_record.problem_title} by user {str(user_id)[:8]}")
            print(f"   Feedback: {feedback}")
            
            await db.commit()


# Глобальный экземпляр
anti_duplicate_manager = AntiDuplicateManager() 