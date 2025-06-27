#!/usr/bin/env python3
"""
🐳 Sandbox Code Runner
Безопасное выполнение пользовательского кода в Docker контейнерах
"""
import asyncio
import tempfile
import os
import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import docker
from docker.errors import DockerException, ContainerError

@dataclass
class SandboxResult:
    """Результат выполнения в sandbox"""
    success: bool
    output: str
    error: str
    execution_time_ms: int
    memory_used_mb: float
    passed: int = 0
    failed: int = 0
    total_tests: int = 0
    test_results: List[Dict] = None
    is_solution_correct: bool = False

class SandboxRunner:
    """
    🛡️ Безопасный runner для выполнения пользовательского кода
    """
    
    def __init__(self):
        self.docker_client = None
        self.timeout_seconds = 10
        self.memory_limit = "128m"
        self.cpu_limit = 0.5
        
        # Docker образы для разных языков
        self.language_images = {
            "python": "python:3.11-slim",
            "javascript": "node:18-alpine", 
            "java": "openjdk:17-alpine",
            "cpp": "gcc:latest"
        }
        
        self._ensure_docker_client()
    
    def _ensure_docker_client(self):
        """Инициализация Docker клиента"""
        try:
            self.docker_client = docker.from_env()
            self.docker_client.ping()
            print("🐳 Docker client initialized successfully")
        except DockerException as e:
            print(f"⚠️ Docker not available: {e}")
            self.docker_client = None
    
    async def run_code_securely(
        self,
        user_code: str,
        test_cases: List[Dict[str, Any]],
        language: str = "python",
        problem_title: str = "Generic Problem"
    ) -> SandboxResult:
        """
        🔒 Безопасное выполнение кода в изолированном контейнере
        """
        if not self.docker_client:
            # Fallback на обычный runner если Docker недоступен
            print("⚠️ Docker unavailable, falling back to local execution")
            return await self._fallback_execution(user_code, test_cases, language)
        
        print(f"🐳 Running code securely in Docker container ({language})")
        
        start_time = time.time()
        
        try:
            # Создаем временные файлы
            with tempfile.TemporaryDirectory() as temp_dir:
                
                # Подготавливаем файлы для контейнера
                code_files = await self._prepare_code_files(
                    temp_dir, user_code, test_cases, language, problem_title
                )
                
                # Запускаем контейнер
                result = await self._run_in_container(
                    temp_dir, language, code_files
                )
                
                execution_time = int((time.time() - start_time) * 1000)
                result.execution_time_ms = execution_time
                
                return result
                
        except Exception as e:
            print(f"❌ Sandbox execution error: {e}")
            return SandboxResult(
                success=False,
                output="",
                error=f"Sandbox error: {str(e)}",
                execution_time_ms=int((time.time() - start_time) * 1000),
                memory_used_mb=0.0
            )
    
    async def _prepare_code_files(
        self,
        temp_dir: str,
        user_code: str,
        test_cases: List[Dict[str, Any]],
        language: str,
        problem_title: str
    ) -> Dict[str, str]:
        """📝 Подготовка файлов для выполнения в контейнере"""
        
        if language == "python":
            return await self._prepare_python_files(temp_dir, user_code, test_cases)
        elif language == "javascript":
            return await self._prepare_js_files(temp_dir, user_code, test_cases)
        else:
            raise ValueError(f"Unsupported language: {language}")
    
    async def _prepare_python_files(
        self,
        temp_dir: str,
        user_code: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """🐍 Подготовка Python файлов"""
        
        # Основной файл с пользовательским кодом
        solution_file = os.path.join(temp_dir, "solution.py")
        with open(solution_file, 'w') as f:
            f.write(user_code)
        
        # Runner для выполнения тестов
        runner_code = f"""
import sys
import json
import traceback
import time
import inspect
from solution import *

def run_tests():
    test_cases = {json.dumps(test_cases)}
    results = []
    passed = 0
    
    # Найти пользовательскую функцию
    user_functions = [name for name, obj in globals().items() 
                     if callable(obj) and not name.startswith('_') 
                     and name not in ['run_tests', 'json', 'traceback', 'time', 'inspect', 'sys']]
    
    if not user_functions:
        print(json.dumps({{
            "success": False,
            "error": "No user function found",
            "passed": 0,
            "failed": len(test_cases),
            "total_tests": len(test_cases),
            "test_results": []
        }}))
        return
    
    user_func = globals()[user_functions[0]]
    
    for i, test_case in enumerate(test_cases):
        try:
            test_input = test_case['input']
            expected = test_case['expected']
            
            # Умная передача аргументов
            sig = inspect.signature(user_func)
            param_count = len(sig.parameters)
            
            if param_count == 0:
                result = user_func()
            elif isinstance(test_input, list) and len(test_input) == 2:
                result = user_func(test_input[0], test_input[1])
            elif isinstance(test_input, list):
                if '*args' in str(sig):
                    result = user_func(*test_input)
                else:
                    result = user_func(test_input)
            else:
                result = user_func(test_input)
            
            is_correct = result == expected
            if is_correct:
                passed += 1
            
            results.append({{
                "test_case": i + 1,
                "input": test_input,
                "expected": expected,
                "actual": result,
                "passed": is_correct
            }})
            
        except Exception as e:
            results.append({{
                "test_case": i + 1,
                "input": test_case.get('input'),
                "expected": test_case.get('expected'),
                "actual": None,
                "passed": False,
                "error": str(e)
            }})
    
    total_tests = len(test_cases)
    failed = total_tests - passed
    
    print(json.dumps({{
        "success": passed == total_tests,
        "passed": passed,
        "failed": failed,
        "total_tests": total_tests,
        "test_results": results,
        "is_solution_correct": passed == total_tests
    }}))

if __name__ == "__main__":
    run_tests()
"""
        
        runner_file = os.path.join(temp_dir, "runner.py")
        with open(runner_file, 'w') as f:
            f.write(runner_code)
        
        return {
            "solution.py": solution_file,
            "runner.py": runner_file
        }
    
    async def _prepare_js_files(
        self,
        temp_dir: str,
        user_code: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """🟨 Подготовка JavaScript файлов"""
        
        # JavaScript runner
        runner_code = f"""
{user_code}

const testCases = {json.dumps(test_cases)};
const results = [];
let passed = 0;

// Найти пользовательскую функцию
const userFunctionNames = Object.getOwnPropertyNames(global).filter(name => 
    typeof global[name] === 'function' && 
    !name.startsWith('_') &&
    !['require', 'console', 'Buffer', 'process'].includes(name)
);

if (userFunctionNames.length === 0) {{
    console.log(JSON.stringify({{
        success: false,
        error: "No user function found",
        passed: 0,
        failed: testCases.length,
        total_tests: testCases.length,
        test_results: []
    }}));
    process.exit(1);
}}

const userFunc = global[userFunctionNames[0]];

testCases.forEach((testCase, i) => {{
    try {{
        const input = testCase.input;
        const expected = testCase.expected;
        
        let result;
        if (Array.isArray(input)) {{
            result = userFunc(...input);
        }} else {{
            result = userFunc(input);
        }}
        
        const isCorrect = JSON.stringify(result) === JSON.stringify(expected);
        if (isCorrect) passed++;
        
        results.push({{
            test_case: i + 1,
            input: input,
            expected: expected,
            actual: result,
            passed: isCorrect
        }});
        
    }} catch (error) {{
        results.push({{
            test_case: i + 1,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: error.message
        }});
    }}
}});

const totalTests = testCases.length;
const failed = totalTests - passed;

console.log(JSON.stringify({{
    success: passed === totalTests,
    passed: passed,
    failed: failed,
    total_tests: totalTests,
    test_results: results,
    is_solution_correct: passed === totalTests
}}));
"""
        
        runner_file = os.path.join(temp_dir, "runner.js")
        with open(runner_file, 'w') as f:
            f.write(runner_code)
        
        return {"runner.js": runner_file}
    
    async def _run_in_container(
        self,
        temp_dir: str,
        language: str,
        code_files: Dict[str, str]
    ) -> SandboxResult:
        """🐳 Запуск кода в Docker контейнере"""
        
        image = self.language_images.get(language)
        if not image:
            raise ValueError(f"No Docker image for language: {language}")
        
        # Команда для выполнения
        if language == "python":
            command = ["python3", "/code/runner.py"]
        elif language == "javascript":
            command = ["node", "/code/runner.js"]
        else:
            raise ValueError(f"Execution command not defined for: {language}")
        
        try:
            # Запуск контейнера с ограничениями
            container = self.docker_client.containers.run(
                image=image,
                command=command,
                volumes={temp_dir: {'bind': '/code', 'mode': 'ro'}},
                mem_limit=self.memory_limit,
                cpus=self.cpu_limit,
                network_disabled=True,  # Отключаем интернет
                remove=True,
                detach=False,
                stdout=True,
                stderr=True,
                timeout=self.timeout_seconds
            )
            
            output = container.decode('utf-8')
            
            # Парсим результат
            try:
                result_data = json.loads(output)
                return SandboxResult(
                    success=result_data.get('success', False),
                    output=output,
                    error="",
                    execution_time_ms=0,  # Будет установлено выше
                    memory_used_mb=0.0,  # TODO: Получить из Docker stats
                    passed=result_data.get('passed', 0),
                    failed=result_data.get('failed', 0),
                    total_tests=result_data.get('total_tests', 0),
                    test_results=result_data.get('test_results', []),
                    is_solution_correct=result_data.get('is_solution_correct', False)
                )
            except json.JSONDecodeError:
                return SandboxResult(
                    success=False,
                    output=output,
                    error="Failed to parse execution result",
                    execution_time_ms=0,
                    memory_used_mb=0.0
                )
        
        except ContainerError as e:
            return SandboxResult(
                success=False,
                output="",
                error=f"Container execution error: {e}",
                execution_time_ms=0,
                memory_used_mb=0.0
            )
        except Exception as e:
            return SandboxResult(
                success=False,
                output="",
                error=f"Docker execution error: {e}",
                execution_time_ms=0,
                memory_used_mb=0.0
            )
    
    async def _fallback_execution(
        self,
        user_code: str,
        test_cases: List[Dict[str, Any]],
        language: str
    ) -> SandboxResult:
        """🔄 Fallback на обычное выполнение если Docker недоступен"""
        
        if language == "python":
            # Используем существующий LeetCode runner
            from shared.app.problems.leetcode_runner import leetcode_runner
            
            result = await leetcode_runner.run_leetcode_test(
                user_code=user_code,
                problem_title="Sandbox Fallback",
                test_cases=test_cases
            )
            
            return SandboxResult(
                success=result.is_solution_correct,
                output="Fallback execution",
                error=result.error or "",
                execution_time_ms=result.execution_time_ms,
                memory_used_mb=0.0,
                passed=result.passed,
                failed=result.failed,
                total_tests=result.total_tests,
                test_results=result.test_results,
                is_solution_correct=result.is_solution_correct
            )
        else:
            return SandboxResult(
                success=False,
                output="",
                error=f"Fallback not implemented for {language}",
                execution_time_ms=0,
                memory_used_mb=0.0
            )

# Global instance
sandbox_runner = SandboxRunner() 