"""
🔒 SECURITY MODULE FOR CODE EXECUTION
Модуль безопасности для системы выполнения кода
"""

import os
import re
import hashlib
import tempfile
import shutil
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
import subprocess
import time
import json
from dataclasses import dataclass
from enum import Enum

class SecurityLevel(str, Enum):
    """🛡️ Уровни безопасности"""
    DEVELOPMENT = "development"  # Минимальные ограничения для разработки
    TESTING = "testing"          # Умеренные ограничения для тестирования
    PRODUCTION = "production"    # Максимальные ограничения для production

@dataclass
class SecurityLimits:
    """⚙️ Лимиты безопасности"""
    max_file_size_kb: int = 100        # Максимальный размер файла кода
    max_execution_time_s: int = 5       # Максимальное время выполнения
    max_memory_mb: int = 256            # Максимальная память
    max_output_size_kb: int = 1024      # Максимальный размер вывода
    max_files_count: int = 10           # Максимальное количество файлов
    max_processes: int = 1              # Максимальное количество процессов
    allowed_network: bool = False       # Разрешён ли сетевой доступ
    allowed_file_operations: bool = False  # Разрешены ли файловые операции

class CodeSecurityValidator:
    """🛡️ Валидатор безопасности кода"""
    
    def __init__(self, security_level: SecurityLevel = SecurityLevel.PRODUCTION):
        self.security_level = security_level
        self.limits = self._get_security_limits()
        
        # 🚫 Запрещённые паттерны для разных языков
        self.forbidden_patterns = {
            "python": [
                r"import\s+os",
                r"import\s+sys",
                r"import\s+subprocess",
                r"import\s+socket",
                r"import\s+urllib",
                r"import\s+requests",
                r"import\s+http",
                r"from\s+os\s+import",
                r"from\s+sys\s+import",
                r"from\s+subprocess\s+import",
                r"__import__\s*\(",
                r"eval\s*\(",
                r"exec\s*\(",
                r"compile\s*\(",
                r"open\s*\(",
                r"file\s*\(",
                r"input\s*\(",
                r"raw_input\s*\(",
                r"quit\s*\(",
                r"exit\s*\(",
                r"globals\s*\(",
                r"locals\s*\(",
                r"vars\s*\(",
                r"dir\s*\(",
                r"delattr\s*\(",
                r"getattr\s*\(",
                r"setattr\s*\(",
                r"hasattr\s*\(",
                r"reload\s*\(",
                r"while\s+True\s*:",  # Потенциальные бесконечные циклы
                r"for\s+.*\s+in\s+range\s*\(\s*\d{6,}\s*\)",  # Большие циклы
            ],
            "java": [
                r"import\s+java\.io",
                r"import\s+java\.net",
                r"import\s+java\.lang\.Runtime",
                r"import\s+java\.lang\.Process",
                r"Runtime\.getRuntime\(\)",
                r"ProcessBuilder",
                r"System\.exit\(",
                r"System\.gc\(",
                r"Thread\.sleep\(",
                r"new\s+Thread\(",
                r"\.exec\s*\(",
                r"Scanner\s*\(",
                r"System\.in",
                r"while\s*\(\s*true\s*\)",  # Бесконечные циклы
                r"for\s*\(.*;\s*;\s*.*\)",   # Потенциально бесконечные циклы
            ],
            "cpp": [
                r"#include\s*<\s*cstdlib\s*>",
                r"#include\s*<\s*system\s*>",
                r"#include\s*<\s*unistd\.h\s*>",
                r"#include\s*<\s*sys/.*\s*>",
                r"#include\s*<\s*windows\.h\s*>",
                r"system\s*\(",
                r"exec\w*\s*\(",
                r"fork\s*\(",
                r"pthread_create",
                r"std::system",
                r"std::thread",
                r"fopen\s*\(",
                r"freopen\s*\(",
                r"remove\s*\(",
                r"rename\s*\(",
                r"while\s*\(\s*true\s*\)",  # Бесконечные циклы
                r"for\s*\(\s*;\s*;\s*\)",    # Бесконечные циклы
            ],
            "javascript": [
                r"require\s*\(",
                r"import\s+.*\s+from\s+['\"][^'\"]*fs['\"]",
                r"import\s+.*\s+from\s+['\"][^'\"]*child_process['\"]",
                r"import\s+.*\s+from\s+['\"][^'\"]*net['\"]",
                r"import\s+.*\s+from\s+['\"][^'\"]*http['\"]",
                r"eval\s*\(",
                r"Function\s*\(",
                r"setTimeout\s*\(",
                r"setInterval\s*\(",
                r"XMLHttpRequest",
                r"fetch\s*\(",
                r"process\.",
                r"global\.",
                r"__dirname",
                r"__filename",
                r"while\s*\(\s*true\s*\)",  # Бесконечные циклы
            ],
            "go": [
                r"import\s+\"os\"",
                r"import\s+\"os/exec\"",
                r"import\s+\"net\"",
                r"import\s+\"net/http\"",
                r"import\s+\"syscall\"",
                r"exec\.Command",
                r"os\.Exit",
                r"os\.Getenv",
                r"os\.Setenv",
                r"runtime\.GC",
                r"for\s*\{\s*\}",  # Бесконечные циклы
                r"for\s+;\s*;\s*\{",
            ]
        }
        
        # 🔍 Разрешённые импорты для каждого языка
        self.allowed_imports = {
            "python": [
                "math", "random", "itertools", "functools", "collections", 
                "heapq", "bisect", "string", "re", "datetime", "decimal",
                "fractions", "statistics", "json", "copy", "typing"
            ],
            "java": [
                "java.util.*", "java.math.*", "java.lang.*", "java.text.*"
            ],
            "cpp": [
                "iostream", "vector", "string", "algorithm", "map", "set",
                "unordered_map", "unordered_set", "queue", "stack", "deque",
                "utility", "numeric", "cmath", "climits", "cfloat"
            ]
        }

    def _get_security_limits(self) -> SecurityLimits:
        """⚙️ Получить лимиты безопасности для текущего уровня"""
        if self.security_level == SecurityLevel.DEVELOPMENT:
            return SecurityLimits(
                max_file_size_kb=500,
                max_execution_time_s=30,
                max_memory_mb=512,
                max_output_size_kb=5120,
                max_files_count=50,
                max_processes=5,
                allowed_network=True,
                allowed_file_operations=True
            )
        elif self.security_level == SecurityLevel.TESTING:
            return SecurityLimits(
                max_file_size_kb=200,
                max_execution_time_s=10,
                max_memory_mb=256,
                max_output_size_kb=2048,
                max_files_count=20,
                max_processes=2,
                allowed_network=False,
                allowed_file_operations=False
            )
        else:  # PRODUCTION
            return SecurityLimits(
                max_file_size_kb=100,
                max_execution_time_s=5,
                max_memory_mb=128,
                max_output_size_kb=1024,
                max_files_count=10,
                max_processes=1,
                allowed_network=False,
                allowed_file_operations=False
            )

    def validate_code(self, code: str, language: str) -> Dict[str, Any]:
        """
        🔍 Валидировать код на предмет безопасности
        
        Args:
            code: Код для проверки
            language: Язык программирования
            
        Returns:
            Результат валидации с деталями
        """
        validation_result = {
            "is_safe": True,
            "violations": [],
            "warnings": [],
            "sanitized_code": code,
            "risk_level": "low"
        }
        
        # 📏 Проверка размера кода
        code_size_kb = len(code.encode('utf-8')) / 1024
        if code_size_kb > self.limits.max_file_size_kb:
            validation_result["violations"].append(
                f"Code size ({code_size_kb:.1f}KB) exceeds limit ({self.limits.max_file_size_kb}KB)"
            )
            validation_result["is_safe"] = False
            validation_result["risk_level"] = "high"

        # 🚫 Проверка запрещённых паттернов
        language_patterns = self.forbidden_patterns.get(language.lower(), [])
        for pattern in language_patterns:
            if re.search(pattern, code, re.IGNORECASE | re.MULTILINE):
                violation = f"Forbidden pattern detected: {pattern}"
                validation_result["violations"].append(violation)
                validation_result["is_safe"] = False
                validation_result["risk_level"] = "high"

        # ⚠️ Проверка потенциально опасных конструкций
        self._check_warnings(code, language, validation_result)
        
        # 🧹 Санитизация кода (если возможно)
        if validation_result["is_safe"]:
            validation_result["sanitized_code"] = self._sanitize_code(code, language)

        return validation_result

    def _check_warnings(self, code: str, language: str, result: Dict[str, Any]):
        """⚠️ Проверка потенциально опасных, но не критичных конструкций"""
        
        warning_patterns = {
            "python": [
                (r"range\s*\(\s*\d{4,}\s*\)", "Large range detected - may cause performance issues"),
                (r".*\*\*\s*\d{3,}", "Large exponentiation detected"),
                (r"recursion", "Recursion detected - watch for stack overflow"),
            ],
            "java": [
                (r"new\s+int\s*\[\s*\d{6,}\s*\]", "Large array allocation detected"),
                (r"Math\.pow\s*\(.*,\s*\d{3,}\s*\)", "Large exponentiation detected"),
            ],
            "cpp": [
                (r"new\s+\w+\s*\[\s*\d{6,}\s*\]", "Large array allocation detected"),
                (r"pow\s*\(.*,\s*\d{3,}\s*\)", "Large exponentiation detected"),
            ]
        }
        
        patterns = warning_patterns.get(language.lower(), [])
        for pattern, message in patterns:
            if re.search(pattern, code, re.IGNORECASE):
                result["warnings"].append(message)
                if result["risk_level"] == "low":
                    result["risk_level"] = "medium"

    def _sanitize_code(self, code: str, language: str) -> str:
        """🧹 Санитизация кода (базовая очистка)"""
        
        # Удаляем комментарии с потенциально опасным содержимым
        if language.lower() == "python":
            # Удаляем однострочные комментарии с подозрительным содержимым
            lines = code.split('\n')
            sanitized_lines = []
            for line in lines:
                if '#' in line and any(word in line.lower() for word in ['hack', 'exploit', 'malware']):
                    # Удаляем подозрительные комментарии
                    line = line.split('#')[0].rstrip()
                sanitized_lines.append(line)
            code = '\n'.join(sanitized_lines)
        
        return code

    def create_secure_environment(self, work_dir: Path) -> Dict[str, Any]:
        """
        🏗️ Создать безопасную среду выполнения
        
        Args:
            work_dir: Рабочая директория
            
        Returns:
            Конфигурация безопасной среды
        """
        env_config = {
            "work_dir": str(work_dir),
            "environment_vars": {
                "HOME": str(work_dir),
                "TMPDIR": str(work_dir / "tmp"),
                "PATH": "/usr/local/bin:/usr/bin:/bin",  # Ограниченный PATH
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
            },
            "resource_limits": {
                "cpu_time": self.limits.max_execution_time_s,
                "memory": self.limits.max_memory_mb * 1024 * 1024,
                "file_size": self.limits.max_output_size_kb * 1024,
                "open_files": 20,
                "processes": self.limits.max_processes,
            },
            "filesystem": {
                "read_only_paths": ["/usr", "/lib", "/lib64", "/bin", "/sbin"],
                "writable_paths": [str(work_dir)],
                "blocked_paths": ["/etc", "/var", "/home", "/root", "/proc", "/sys"],
            },
            "network": {
                "allowed": self.limits.allowed_network,
                "blocked_ports": [22, 23, 25, 53, 80, 443, 993, 995] if not self.limits.allowed_network else [],
            }
        }
        
        # Создаём безопасную структуру директорий
        self._setup_secure_directory(work_dir)
        
        return env_config

    def _setup_secure_directory(self, work_dir: Path):
        """📁 Настройка безопасной структуры директорий"""
        try:
            # Создаём основные директории
            work_dir.mkdir(parents=True, exist_ok=True)
            (work_dir / "tmp").mkdir(exist_ok=True)
            
            # Устанавливаем права доступа (только владелец может читать/писать)
            os.chmod(work_dir, 0o700)
            os.chmod(work_dir / "tmp", 0o700)
            
        except Exception as e:
            print(f"Warning: Could not setup secure directory: {e}")

    def generate_execution_token(self, user_id: str, problem_slug: str) -> str:
        """
        🎟️ Генерировать токен для выполнения кода
        
        Args:
            user_id: ID пользователя
            problem_slug: Слаг задачи
            
        Returns:
            Уникальный токен для сессии выполнения
        """
        timestamp = str(int(time.time()))
        data = f"{user_id}:{problem_slug}:{timestamp}"
        token = hashlib.sha256(data.encode()).hexdigest()[:16]
        return f"exec_{token}"

    def rate_limit_check(self, user_id: str, max_requests: int = 10, window_minutes: int = 1) -> Dict[str, Any]:
        """
        🚦 Проверка лимитов частоты запросов
        
        Args:
            user_id: ID пользователя
            max_requests: Максимальное количество запросов
            window_minutes: Окно времени в минутах
            
        Returns:
            Результат проверки лимитов
        """
        # Простая реализация in-memory rate limiting
        # В production следует использовать Redis или подобную систему
        
        current_time = time.time()
        window_seconds = window_minutes * 60
        
        # Инициализируем глобальное хранилище если его нет
        if not hasattr(self, '_rate_limit_storage'):
            self._rate_limit_storage = {}
        
        user_requests = self._rate_limit_storage.get(user_id, [])
        
        # Очищаем старые запросы
        user_requests = [req_time for req_time in user_requests 
                        if current_time - req_time < window_seconds]
        
        # Проверяем лимит
        if len(user_requests) >= max_requests:
            return {
                "allowed": False,
                "requests_count": len(user_requests),
                "max_requests": max_requests,
                "window_minutes": window_minutes,
                "reset_time": min(user_requests) + window_seconds
            }
        
        # Добавляем текущий запрос
        user_requests.append(current_time)
        self._rate_limit_storage[user_id] = user_requests
        
        return {
            "allowed": True,
            "requests_count": len(user_requests),
            "max_requests": max_requests,
            "window_minutes": window_minutes,
            "remaining_requests": max_requests - len(user_requests)
        }

    def audit_log(self, event_type: str, user_id: str, details: Dict[str, Any]):
        """
        📝 Логирование событий безопасности
        
        Args:
            event_type: Тип события
            user_id: ID пользователя
            details: Детали события
        """
        log_entry = {
            "timestamp": time.time(),
            "event_type": event_type,
            "user_id": user_id,
            "security_level": self.security_level.value,
            "details": details
        }
        
        # В production следует использовать настоящую систему логирования
        print(f"🔒 SECURITY AUDIT: {json.dumps(log_entry, indent=2)}")


# 🌟 Глобальный экземпляр валидатора безопасности
def get_security_validator(security_level: SecurityLevel = None) -> CodeSecurityValidator:
    """Получить валидатор безопасности с настройками из окружения"""
    if security_level is None:
        # Определяем уровень безопасности из переменной окружения
        env_level = os.getenv("SECURITY_LEVEL", "production").lower()
        try:
            security_level = SecurityLevel(env_level)
        except ValueError:
            security_level = SecurityLevel.PRODUCTION
    
    return CodeSecurityValidator(security_level)


# 🧪 Тестирование модуля безопасности
if __name__ == "__main__":
    # Тестируем валидатор безопасности
    validator = get_security_validator(SecurityLevel.PRODUCTION)
    
    # Тест 1: Безопасный код
    safe_code = """
def two_sum(nums, target):
    hash_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hash_map:
            return [hash_map[complement], i]
        hash_map[num] = i
    return []
"""
    
    result = validator.validate_code(safe_code, "python")
    print("🟢 Safe code validation:", result["is_safe"])
    
    # Тест 2: Опасный код
    dangerous_code = """
import os
import subprocess
os.system("rm -rf /")
subprocess.call(["ls", "/etc/passwd"])
"""
    
    result = validator.validate_code(dangerous_code, "python")
    print("🔴 Dangerous code validation:", result["is_safe"])
    print("Violations:", result["violations"])
    
    print("✅ Security module tests completed!") 