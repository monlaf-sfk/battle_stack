"""
🚀 PROFESSIONAL MULTI-LANGUAGE CODE RUNNER
Система выполнения кода в стиле LeetCode с профессиональными возможностями
"""

import asyncio
import json
import subprocess
import tempfile
import os
import shutil
import time
import signal
import docker
import sys
from typing import Dict, List, Any, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import uuid

from .code_templates import LanguageType, code_template_generator
from .real_test_cases import get_test_cases_for_problem, get_example_test_cases, get_hidden_test_cases
from .security import get_security_validator, SecurityLevel


@dataclass
class TestCase:
    """📝 Тест-кейс для проверки решения"""
    input_data: Any
    expected_output: Any
    description: str = ""
    hidden: bool = False  # Скрытые тест-кейсы как на LeetCode


@dataclass
class ExecutionResult:
    """📊 Результат выполнения кода"""
    success: bool
    output: Any = None
    error: str = ""
    execution_time: float = 0.0
    memory_usage: int = 0  # В KB
    status: str = "Unknown"
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0


@dataclass
class TestResult:
    """✅ Результат тестирования решения"""
    test_case_index: int
    passed: bool
    input_data: Any
    expected_output: Any
    actual_output: Any
    execution_time: float
    error_message: str = ""
    hidden: bool = False
    stdout: str = ""
    stderr: str = ""


@dataclass
class SubmissionResult:
    """🏆 Итоговый результат отправки решения"""
    status: str  # "Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", etc.
    passed_tests: int
    total_tests: int
    execution_time: float
    memory_usage: int
    error_message: str = ""
    test_results: List[TestResult] = None
    score: float = 0.0  # 0-100%
    stdout: str = ""
    stderr: str = ""


class ExecutionStatus(str, Enum):
    """🎯 Статусы выполнения как на LeetCode"""
    ACCEPTED = "Accepted"
    WRONG_ANSWER = "Wrong Answer"
    TIME_LIMIT_EXCEEDED = "Time Limit Exceeded"
    MEMORY_LIMIT_EXCEEDED = "Memory Limit Exceeded"
    RUNTIME_ERROR = "Runtime Error"
    COMPILATION_ERROR = "Compilation Error"
    INTERNAL_ERROR = "Internal Error"
    SECURITY_ERROR = "Security Error"


class ProfessionalCodeRunner:
    """🚀 Профессиональный code runner в стиле LeetCode"""
    
    def __init__(self, security_level: SecurityLevel = SecurityLevel.PRODUCTION):
        self.docker_client = None
        self.temp_dir = Path("/tmp/battlestack_code_execution")
        self.temp_dir.mkdir(exist_ok=True)
        
        # 🔒 Инициализация модуля безопасности
        self.security_validator = get_security_validator(security_level)
        self.security_level = security_level
        
        # Лимиты выполнения
        self.time_limits = {
            LanguageType.PYTHON: 5.0,
            LanguageType.PYTHON3: 5.0,
            LanguageType.JAVA: 8.0,
            LanguageType.CPP: 3.0,
            LanguageType.C: 3.0,
            LanguageType.JAVASCRIPT: 5.0,
            LanguageType.TYPESCRIPT: 6.0,
            LanguageType.GO: 4.0,
            LanguageType.RUST: 5.0,
        }
        
        # Лимиты памяти (в MB)
        self.memory_limits = {
            LanguageType.PYTHON: 256,
            LanguageType.PYTHON3: 256,
            LanguageType.JAVA: 512,
            LanguageType.CPP: 128,
            LanguageType.C: 128,
            LanguageType.JAVASCRIPT: 256,
            LanguageType.TYPESCRIPT: 256,
            LanguageType.GO: 256,
            LanguageType.RUST: 256,
        }
        
        # Команды компиляции и выполнения
        self.execution_configs = {
            LanguageType.PYTHON: {
                "compile_cmd": None,
                "run_cmd": ["python3", "{filename}"],
                "extension": ".py",
                "image": "python:3.11-slim"
            },
            LanguageType.PYTHON3: {
                "compile_cmd": None,
                "run_cmd": ["python3", "{filename}"],
                "extension": ".py",
                "image": "python:3.11-slim"
            },
            LanguageType.JAVA: {
                "compile_cmd": ["javac", "{filename}"],
                "run_cmd": ["java", "{classname}"],
                "extension": ".java",
                "image": "openjdk:17-slim"
            },
            LanguageType.CPP: {
                "compile_cmd": ["g++", "-o", "{output}", "{filename}", "-std=c++17"],
                "run_cmd": ["./{output}"],
                "extension": ".cpp",
                "image": "gcc:latest"
            },
            LanguageType.C: {
                "compile_cmd": ["gcc", "-o", "{output}", "{filename}"],
                "run_cmd": ["./{output}"],
                "extension": ".c",
                "image": "gcc:latest"
            },
            LanguageType.JAVASCRIPT: {
                "compile_cmd": None,
                "run_cmd": ["node", "{filename}"],
                "extension": ".js",
                "image": "node:18-slim"
            },
            LanguageType.TYPESCRIPT: {
                "compile_cmd": ["tsc", "{filename}"],
                "run_cmd": ["node", "{output}"],
                "extension": ".ts",
                "image": "node:18-slim"
            },
            LanguageType.GO: {
                "compile_cmd": ["go", "build", "-o", "{output}", "{filename}"],
                "run_cmd": ["./{output}"],
                "extension": ".go",
                "image": "golang:1.21-slim"
            },
            LanguageType.RUST: {
                "compile_cmd": ["rustc", "-o", "{output}", "{filename}"],
                "run_cmd": ["./{output}"],
                "extension": ".rs",
                "image": "rust:slim"
            }
        }

    async def submit_solution(
        self,
        code: str,
        language: LanguageType,
        test_cases: List[TestCase],
        function_name: str = "",
        main_wrapper: bool = True
    ) -> SubmissionResult:
        """
        🏆 Основная функция для отправки решения как на LeetCode
        
        Args:
            code: Код решения
            language: Язык программирования
            test_cases: Список тест-кейсов
            function_name: Имя функции для тестирования
            main_wrapper: Добавлять ли main wrapper
        """
        start_time = time.time()
        test_results = []
        total_execution_time = 0.0
        max_memory_usage = 0
        all_stdout = []
        all_stderr = []
        
        # 🔒 БЕЗОПАСНОСТЬ: Валидация кода перед выполнением
        security_check = self.security_validator.validate_code(code, language.value)
        if not security_check["is_safe"]:
            return SubmissionResult(
                status=ExecutionStatus.SECURITY_ERROR,
                passed_tests=0,
                total_tests=len(test_cases),
                execution_time=0.0,
                memory_usage=0,
                error_message=f"Security violations: {'; '.join(security_check['violations'])}",
                score=0.0
            )
        
        # Логируем предупреждения безопасности
        if security_check["warnings"]:
            print(f"⚠️ Security warnings: {security_check['warnings']}")
        
        try:
            # 🔧 Подготавливаем код для выполнения
            if main_wrapper:
                code = self._add_main_wrapper(code, language, function_name, test_cases)
            
            # 🧪 Выполняем все тест-кейсы
            for i, test_case in enumerate(test_cases):
                try:
                    execution_result = await self._execute_single_test(
                        code, language, test_case, i
                    )
                    
                    # Собираем stdout/stderr
                    if execution_result.stdout:
                        all_stdout.append(f"--- Test Case {i+1} ---\n{execution_result.stdout}")
                    if execution_result.stderr:
                        all_stderr.append(f"--- Test Case {i+1} ---\n{execution_result.stderr}")
                    
                    # ⏱️ Проверяем лимиты времени
                    if execution_result.execution_time > self.time_limits.get(language, 5.0):
                        return SubmissionResult(
                            status=ExecutionStatus.TIME_LIMIT_EXCEEDED,
                            passed_tests=i,
                            total_tests=len(test_cases),
                            execution_time=execution_result.execution_time,
                            memory_usage=execution_result.memory_usage,
                            error_message=f"Time Limit Exceeded: {execution_result.execution_time:.2f}s"
                        )
                    
                    # 🧠 Проверяем лимиты памяти
                    if execution_result.memory_usage > self.memory_limits.get(language, 256) * 1024:
                        return SubmissionResult(
                            status=ExecutionStatus.MEMORY_LIMIT_EXCEEDED,
                            passed_tests=i,
                            total_tests=len(test_cases),
                            execution_time=execution_result.execution_time,
                            memory_usage=execution_result.memory_usage,
                            error_message="Memory Limit Exceeded"
                        )
                    
                    # ❌ Проверяем ошибки выполнения
                    if not execution_result.success:
                        return SubmissionResult(
                            status=ExecutionStatus.RUNTIME_ERROR,
                            passed_tests=i,
                            total_tests=len(test_cases),
                            execution_time=execution_result.execution_time,
                            memory_usage=execution_result.memory_usage,
                            error_message=execution_result.error
                        )
                    
                    # ✅ Проверяем правильность ответа
                    passed = self._compare_outputs(
                        test_case.expected_output, 
                        execution_result.output
                    )
                    
                    test_results.append(TestResult(
                        test_case_index=i,
                        passed=passed,
                        input_data=test_case.input_data,
                        expected_output=test_case.expected_output,
                        actual_output=execution_result.output,
                        execution_time=execution_result.execution_time,
                        error_message=execution_result.error,
                        hidden=test_case.hidden,
                        stdout=execution_result.stdout,
                        stderr=execution_result.stderr
                    ))
                    
                    total_execution_time += execution_result.execution_time
                    max_memory_usage = max(max_memory_usage, execution_result.memory_usage)
                    
                    # ❌ Если тест не прошёл
                    if not passed:
                        return SubmissionResult(
                            status=ExecutionStatus.WRONG_ANSWER,
                            passed_tests=i,
                            total_tests=len(test_cases),
                            execution_time=total_execution_time,
                            memory_usage=max_memory_usage,
                            error_message=f"Wrong Answer on test case {i + 1}",
                            test_results=test_results
                        )
                
                except Exception as e:
                    return SubmissionResult(
                        status=ExecutionStatus.INTERNAL_ERROR,
                        passed_tests=i,
                        total_tests=len(test_cases),
                        execution_time=total_execution_time,
                        memory_usage=max_memory_usage,
                        error_message=f"Internal error: {str(e)}"
                    )
            
            passed_tests_count = sum(1 for r in test_results if r.passed)
            
            return SubmissionResult(
                status=ExecutionStatus.ACCEPTED if passed_tests_count == len(test_cases) else ExecutionStatus.WRONG_ANSWER,
                passed_tests=passed_tests_count,
                total_tests=len(test_cases),
                execution_time=total_execution_time,
                memory_usage=max_memory_usage,
                test_results=test_results,
                score=(passed_tests_count / len(test_cases)) * 100 if test_cases else 100,
                stdout="\n".join(all_stdout),
                stderr="\n".join(all_stderr)
            )
            
        except Exception as e:
            return SubmissionResult(
                status=ExecutionStatus.INTERNAL_ERROR,
                passed_tests=0,
                total_tests=len(test_cases),
                execution_time=time.time() - start_time,
                memory_usage=0,
                error_message=f"Compilation or setup error: {str(e)}"
            )

    async def _execute_single_test(
        self,
        code: str,
        language: LanguageType,
        test_case: TestCase,
        test_index: int
    ) -> ExecutionResult:
        """🧪 Выполняет один тест-кейс"""
        
        # Создаём уникальную рабочую директорию
        execution_id = str(uuid.uuid4())[:8]
        work_dir = self.temp_dir / f"exec_{execution_id}_{test_index}"
        work_dir.mkdir(exist_ok=True)
        
        try:
            config = self.execution_configs[language]
            
            # 📁 Подготавливаем файлы
            filename = f"solution{config['extension']}"
            filepath = work_dir / filename
            
            # 💾 Записываем код в файл
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # 🔨 Компилируем если нужно
            if config.get("compile_cmd"):
                compile_result = await self._compile_code(work_dir, config, filename)
                if not compile_result.success:
                    return ExecutionResult(
                        success=False,
                        error=f"Compilation error: {compile_result.stderr}",
                        status=ExecutionStatus.COMPILATION_ERROR
                    )
            
            # 🚀 Выполняем код
            execution_result = await self._run_code(
                work_dir, config, filename, test_case, language
            )
            
            return execution_result
            
        finally:
            # 🧹 Очищаем временные файлы
            try:
                shutil.rmtree(work_dir)
            except:
                pass

    async def _compile_code(
        self, 
        work_dir: Path, 
        config: Dict, 
        filename: str
    ) -> ExecutionResult:
        """🔨 Компилирует код"""
        
        compile_cmd = config["compile_cmd"].copy()
        
        # Заменяем плейсхолдеры
        for i, arg in enumerate(compile_cmd):
            if "{filename}" in arg:
                compile_cmd[i] = arg.replace("{filename}", filename)
            elif "{output}" in arg:
                compile_cmd[i] = arg.replace("{output}", "solution")
            elif "{classname}" in arg:
                compile_cmd[i] = arg.replace("{classname}", "Solution")
        
        try:
            # ⏱️ Компилируем с таймаутом
            process = await asyncio.create_subprocess_exec(
                *compile_cmd,
                cwd=work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                limit=1024*1024  # 1MB лимит на stdout/stderr
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=30.0  # 30 секунд на компиляцию
            )
            
            return ExecutionResult(
                success=process.returncode == 0,
                stdout=stdout.decode('utf-8', errors='ignore'),
                stderr=stderr.decode('utf-8', errors='ignore'),
                exit_code=process.returncode,
                status="Compiled" if process.returncode == 0 else "Compilation Failed"
            )
            
        except asyncio.TimeoutError:
            return ExecutionResult(
                success=False,
                error="Compilation timeout",
                status="Compilation Timeout"
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                error=f"Compilation error: {str(e)}",
                status="Compilation Error"
            )

    async def _run_code(
        self,
        work_dir: Path,
        config: Dict,
        filename: str,
        test_case: TestCase,
        language: LanguageType
    ) -> ExecutionResult:
        """🚀 Выполняет скомпилированный код"""
        
        run_cmd = config["run_cmd"].copy()
        
        # Заменяем плейсхолдеры
        for i, arg in enumerate(run_cmd):
            if "{filename}" in arg:
                run_cmd[i] = arg.replace("{filename}", filename)
            elif "{output}" in arg:
                run_cmd[i] = arg.replace("{output}", "solution")
            elif "{classname}" in arg:
                run_cmd[i] = arg.replace("{classname}", "Solution")
        
        try:
            start_time = time.time()
            
            # 📝 Подготавливаем входные данные
            input_data = self._format_input_data(test_case.input_data, language)
            
            # 🚀 Запускаем процесс
            process = await asyncio.create_subprocess_exec(
                *run_cmd,
                cwd=work_dir,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                limit=1024*1024  # 1MB лимит
            )
            
            # ⏱️ Выполняем с таймаутом
            timeout = self.time_limits.get(language, 5.0)
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input=input_data.encode('utf-8')),
                timeout=timeout
            )
            
            execution_time = time.time() - start_time
            
            # 📊 Анализируем результат
            if process.returncode == 0:
                output = self._parse_output(stdout.decode('utf-8', errors='ignore'), language)
                return ExecutionResult(
                    success=True,
                    output=output,
                    execution_time=execution_time,
                    memory_usage=0,  # TODO: реальное измерение памяти
                    stdout=stdout.decode('utf-8', errors='ignore'),
                    stderr=stderr.decode('utf-8', errors='ignore'),
                    exit_code=process.returncode,
                    status="Success"
                )
            else:
                return ExecutionResult(
                    success=False,
                    error=stderr.decode('utf-8', errors='ignore'),
                    execution_time=execution_time,
                    stdout=stdout.decode('utf-8', errors='ignore'),
                    stderr=stderr.decode('utf-8', errors='ignore'),
                    exit_code=process.returncode,
                    status="Runtime Error"
                )
                
        except asyncio.TimeoutError:
            try:
                process.kill()
                await process.wait()
            except:
                pass
            return ExecutionResult(
                success=False,
                error="Time Limit Exceeded",
                execution_time=self.time_limits.get(language, 5.0),
                status="Time Limit Exceeded"
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                error=f"Execution error: {str(e)}",
                status="Execution Error"
            )

    def _add_main_wrapper(
        self,
        code: str,
        language: LanguageType,
        function_name: str,
        test_cases: List[TestCase]
    ) -> str:
        """🎁 Добавляет main wrapper для тестирования функции"""
        
        if language in [LanguageType.PYTHON, LanguageType.PYTHON3]:
            return self._add_python_main_wrapper(code, function_name, test_cases)
        elif language == LanguageType.JAVA:
            return self._add_java_main_wrapper(code, function_name, test_cases)
        elif language == LanguageType.CPP:
            return self._add_cpp_main_wrapper(code, function_name, test_cases)
        elif language == LanguageType.JAVASCRIPT:
            return self._add_js_main_wrapper(code, function_name, test_cases)
        else:
            return code

    def _add_python_main_wrapper(
        self, 
        code: str, 
        function_name: str, 
        test_cases: List[TestCase]
    ) -> str:
        """🐍 Добавляет Python main wrapper"""
        
        wrapper = f'''
import sys
import json

{code}

if __name__ == "__main__":
    # Читаем входные данные
    input_line = input().strip()
    args = json.loads(input_line)
    
    # Создаём экземпляр Solution
    solution = Solution()
    
    # Вызываем функцию
    if isinstance(args, list):
        result = getattr(solution, "{function_name}")(*args)
    else:
        result = getattr(solution, "{function_name}")(args)
    
    # Выводим результат
    print(json.dumps(result))
'''
        return wrapper

    def _add_java_main_wrapper(
        self, 
        code: str, 
        function_name: str, 
        test_cases: List[TestCase]
    ) -> str:
        """☕ Добавляет Java main wrapper"""
        
        wrapper = f'''
import com.google.gson.*;
import java.util.*;
import java.io.*;

{code}

public class Main {{
    public static void main(String[] args) throws IOException {{
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String inputLine = reader.readLine();
        
        Gson gson = new Gson();
        JsonArray jsonArgs = gson.fromJson(inputLine, JsonArray.class);
        
        Solution solution = new Solution();
        
        // Вызываем функцию с аргументами
        // TODO: Добавить типизированный парсинг аргументов
        Object result = null; // solution.{function_name}(...);
        
        System.out.println(gson.toJson(result));
    }}
}}
'''
        return wrapper

    def _add_cpp_main_wrapper(
        self, 
        code: str, 
        function_name: str, 
        test_cases: List[TestCase]
    ) -> str:
        """⚡ Добавляет C++ main wrapper"""
        
        wrapper = f'''
#include <iostream>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

using namespace std;
using json = nlohmann::json;

{code}

int main() {{
    string input_line;
    getline(cin, input_line);
    
    json j = json::parse(input_line);
    
    Solution solution;
    
    // TODO: Добавить типизированный парсинг аргументов
    // auto result = solution.{function_name}(...);
    
    // cout << json(result) << endl;
    
    return 0;
}}
'''
        return wrapper

    def _add_js_main_wrapper(
        self, 
        code: str, 
        function_name: str, 
        test_cases: List[TestCase]
    ) -> str:
        """🟨 Добавляет JavaScript main wrapper"""
        
        wrapper = f'''
const readline = require('readline');

{code}

const rl = readline.createInterface({{
    input: process.stdin,
    output: process.stdout
}});

rl.on('line', (input) => {{
    const args = JSON.parse(input);
    
    let result;
    if (Array.isArray(args)) {{
        result = {function_name}(...args);
    }} else {{
        result = {function_name}(args);
    }}
    
    console.log(JSON.stringify(result));
    rl.close();
}});
'''
        return wrapper

    def _format_input_data(self, input_data: Any, language: LanguageType) -> str:
        """📝 Форматирует входные данные для передачи в программу"""
        if isinstance(input_data, (list, tuple)):
            return json.dumps(list(input_data))
        elif isinstance(input_data, dict):
            return json.dumps(input_data)
        else:
            return json.dumps(input_data)

    def _parse_output(self, output: str, language: LanguageType) -> Any:
        """📤 Парсит выходные данные программы"""
        try:
            output = output.strip()
            if output:
                return json.loads(output)
            return None
        except json.JSONDecodeError:
            # Если не JSON, возвращаем как строку
            return output.strip()

    def _compare_outputs(self, expected: Any, actual: Any) -> bool:
        """🔍 Сравнивает ожидаемый и фактический результаты"""
        
        # Нормализуем типы
        if isinstance(expected, str) and isinstance(actual, str):
            return expected.strip() == actual.strip()
        
        if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
            # Для чисел с плавающей точкой используем tolerance
            if isinstance(expected, float) or isinstance(actual, float):
                return abs(expected - actual) < 1e-9
            return expected == actual
        
        if isinstance(expected, list) and isinstance(actual, list):
            if len(expected) != len(actual):
                return False
            return all(self._compare_outputs(e, a) for e, a in zip(expected, actual))
        
        return expected == actual

    def load_real_test_cases(self, problem_slug: str, include_hidden: bool = True) -> List[TestCase]:
        """
        🧪 Загружает реальные тест-кейсы для задачи
        
        Args:
            problem_slug: Идентификатор задачи
            include_hidden: Включать ли скрытые тест-кейсы
        
        Returns:
            Список тест-кейсов в формате ProfessionalCodeRunner
        """
        real_test_cases = []
        
        try:
            # Получаем тест-кейсы из нашей базы
            if include_hidden:
                test_cases_data = get_test_cases_for_problem(problem_slug)
            else:
                test_cases_data = get_example_test_cases(problem_slug)
            
            # Конвертируем в формат TestCase
            for tc in test_cases_data:
                real_test_cases.append(TestCase(
                    input_data=tc.input_data,
                    expected_output=tc.expected_output,
                    description=tc.explanation,
                    hidden=tc.is_hidden
                ))
            
            return real_test_cases
            
        except Exception as e:
            print(f"Warning: Could not load real test cases for {problem_slug}: {e}")
            # Возвращаем базовые тест-кейсы для демонстрации
            return self._get_fallback_test_cases(problem_slug)

    def _get_fallback_test_cases(self, problem_slug: str) -> List[TestCase]:
        """
        🔄 Возвращает базовые тест-кейсы если реальные недоступны
        """
        if "longest-subsequence-repeated-k" in problem_slug:
            return [
                TestCase(
                    input_data={"s": "letsleetcode", "k": 2},
                    expected_output="let",
                    description="Example 1",
                    hidden=False
                ),
                TestCase(
                    input_data={"s": "bb", "k": 2},
                    expected_output="b",
                    description="Example 2",
                    hidden=False
                )
            ]
        elif "two-sum" in problem_slug:
            return [
                TestCase(
                    input_data={"nums": [2, 7, 11, 15], "target": 9},
                    expected_output=[0, 1],
                    description="Example 1",
                    hidden=False
                )
            ]
        else:
            return [
                TestCase(
                    input_data={"input": "test"},
                    expected_output="test",
                    description="Basic test",
                    hidden=False
                )
            ]


# 🌟 Глобальный экземпляр runner'а
professional_code_runner = ProfessionalCodeRunner() 