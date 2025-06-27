#!/usr/bin/env python3
"""
🧠 Validated AI Problem Generator
Генерация задач с автоматической валидацией через ground_truth
"""
import json
import asyncio
import openai
import random
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import tempfile
import os
import time

@dataclass
class GeneratedProblem:
    """Структура сгенерированной задачи"""
    title: str
    description: str
    function_name: str
    input_format: Dict[str, Any]
    starter_code: str
    ground_truth: str
    test_cases: List[Dict[str, Any]]
    difficulty: str
    quality_score: float
    validation_passed: bool
    fingerprint: str
    
class DifficultyLevel(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"

class ValidatedAIGenerator:
    """
    🔍 AI генератор с валидацией через ground_truth
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.client = None
        if openai_api_key:
            openai.api_key = openai_api_key
            self.client = openai
            
        # Кэш валидированных задач
        self.validated_problems_cache = {}
        
        # Fallback задачи если AI недоступен
        self.fallback_problems = self._load_fallback_problems()
    
    async def generate_validated_problem(
        self,
        difficulty: DifficultyLevel,
        language: str = "python",
        topic: Optional[str] = None,
        exclusions: Optional[Dict[str, Any]] = None
    ) -> GeneratedProblem:
        """
        🎯 Генерация и валидация задачи с поддержкой исключений
        """
        print(f"🧠 Generating {difficulty.value} problem for {language}")
        
        # 🔥 FORCE VARIETY: Always use fallback problems for guaranteed diversity
        print("🎲 FORCING FALLBACK: Using diverse fallback problems for guaranteed variety")
        return self._get_fallback_problem(difficulty, language, exclusions)
        
        # # Handle exclusions for variety - DISABLED FOR NOW TO FORCE VARIETY
        # excluded_titles = exclusions.get("exclude_titles", []) if exclusions else []
        # excluded_functions = exclusions.get("exclude_functions", []) if exclusions else []
        # 
        # # Попытка генерации через AI
        # if self.client:
        #     for attempt in range(3):  # 3 попытки
        #         try:
        #             problem = await self._generate_ai_problem(difficulty, language, topic, exclusions)
        #             if problem:
        #                 # Check if this problem conflicts with exclusions
        #                 title = problem.get("title", "").lower()
        #                 function_name = problem.get("function_name", "").lower()
        #                 
        #                 if any(excluded.lower() in title for excluded in excluded_titles):
        #                     print(f"🚫 Skipping excluded title: {title}")
        #                     continue
        #                     
        #                 if any(excluded.lower() in function_name for excluded in excluded_functions):
        #                     print(f"🚫 Skipping excluded function: {function_name}")
        #                     continue
        #                 
        #                 # Валидация через ground_truth
        #                 validation_result = await self._validate_problem(problem)
        #                 if validation_result.validation_passed:
        #                     print(f"✅ AI problem validated successfully (attempt {attempt + 1})")
        #                     await self._cache_validated_problem(validation_result)
        #                     return validation_result
        #                 else:
        #                     print(f"❌ AI problem validation failed (attempt {attempt + 1})")
        #         except Exception as e:
        #             print(f"⚠️ AI generation attempt {attempt + 1} failed: {e}")
        # 
        # # Fallback на проверенные задачи
        # print("🔄 Using fallback validated problem")
        # return self._get_fallback_problem(difficulty, language, exclusions)
    
    async def _generate_ai_problem(
        self,
        difficulty: DifficultyLevel,
        language: str,
        topic: Optional[str],
        exclusions: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """🤖 Генерация задачи через AI"""
        
        topic_context = f" focusing on {topic}" if topic else ""
        exclusion_context = ""
        
        # Add exclusion hints to prompt
        if exclusions:
            excluded_titles = exclusions.get("exclude_titles", [])
            excluded_functions = exclusions.get("exclude_functions", [])
            if excluded_titles or excluded_functions:
                exclusion_context = f"\n\nAvoid these titles: {excluded_titles}\nAvoid these function names: {excluded_functions}"
        
        prompt = f"""
Generate a {difficulty.value} level coding problem in {language}{topic_context}.{exclusion_context}

Return ONLY valid JSON in this exact format:
{{
  "title": "Problem Title",
  "description": "Clear problem description with examples",
  "function_name": "function_name_in_snake_case",
  "input_format": {{
    "params": [
      {{"name": "param1", "type": "List[int]", "description": "Parameter description"}}
    ],
    "returns": "Return type and description"
  }},
  "starter_code": "def function_name(param1):\\n    # TODO: Implement solution\\n    pass",
  "ground_truth": "def function_name(param1):\\n    # Working solution\\n    return result",
  "test_cases": [
    {{"input": [1, 2, 3], "expected": 6, "description": "Sum of [1,2,3]"}},
    {{"input": [4, 5], "expected": 9, "description": "Sum of [4,5]"}},
    {{"input": [], "expected": 0, "description": "Empty array"}}
  ]
}}

Requirements:
1. Problem must be solvable and well-defined
2. Ground truth must be a working solution
3. Test cases must cover edge cases
4. Description must be clear and include examples
5. Function name should be descriptive snake_case
6. {difficulty.value} difficulty: {'Simple algorithm, O(n) complexity' if difficulty == DifficultyLevel.EASY else 'Moderate complexity with data structures' if difficulty == DifficultyLevel.MEDIUM else 'Advanced algorithms and optimization'}

DO NOT include any text outside the JSON.
"""
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are an expert {language} programming instructor. Generate only valid JSON responses for coding problems."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # Очистка от markdown блоков
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            return json.loads(content)
            
        except Exception as e:
            print(f"❌ AI generation error: {e}")
            return None
    
    async def _validate_problem(self, problem_data: Dict[str, Any]) -> GeneratedProblem:
        """
        ✅ Валидация задачи через выполнение ground_truth на всех тестах
        """
        try:
            # Извлекаем данные
            title = problem_data.get("title", "Unknown Problem")
            description = problem_data.get("description", "")
            function_name = problem_data.get("function_name", "solution")
            input_format = problem_data.get("input_format", {})
            starter_code = problem_data.get("starter_code", "")
            ground_truth = problem_data.get("ground_truth", "")
            test_cases = problem_data.get("test_cases", [])
            
            print(f"🔍 Validating problem: {title}")
            print(f"📊 Test cases to validate: {len(test_cases)}")
            
            # Проверяем базовую структуру
            if not all([title, description, ground_truth, test_cases]):
                return GeneratedProblem(
                    title=title,
                    description=description,
                    function_name=function_name,
                    input_format=input_format,
                    starter_code=starter_code,
                    ground_truth=ground_truth,
                    test_cases=test_cases,
                    difficulty="unknown",
                    quality_score=0.0,
                    validation_passed=False,
                    fingerprint=""
                )
            
            # Выполняем ground_truth на всех тестах
            validation_success = await self._execute_ground_truth(ground_truth, test_cases)
            
            if validation_success:
                quality_score = self._calculate_quality_score(problem_data)
                fingerprint = self._generate_fingerprint(title, ground_truth)
                
                print(f"✅ Problem validation successful (quality: {quality_score:.1f}/10)")
                
                return GeneratedProblem(
                    title=title,
                    description=description,
                    function_name=function_name,
                    input_format=input_format,
                    starter_code=starter_code,
                    ground_truth=ground_truth,
                    test_cases=test_cases,
                    difficulty="validated",
                    quality_score=quality_score,
                    validation_passed=True,
                    fingerprint=fingerprint
                )
            else:
                print(f"❌ Ground truth validation failed for: {title}")
                return GeneratedProblem(
                    title=title,
                    description=description,
                    function_name=function_name,
                    input_format=input_format,
                    starter_code=starter_code,
                    ground_truth=ground_truth,
                    test_cases=test_cases,
                    difficulty="failed",
                    quality_score=0.0,
                    validation_passed=False,
                    fingerprint=""
                )
                
        except Exception as e:
            print(f"❌ Validation error: {e}")
            return GeneratedProblem(
                title="Validation Error",
                description="",
                function_name="solution",
                input_format={},
                starter_code="",
                ground_truth="",
                test_cases=[],
                difficulty="error",
                quality_score=0.0,
                validation_passed=False,
                fingerprint=""
            )
    
    async def _execute_ground_truth(
        self,
        ground_truth_code: str,
        test_cases: List[Dict[str, Any]]
    ) -> bool:
        """
        🧪 Выполняем ground_truth решение на всех тестах
        """
        try:
            # Создаем временный файл с ground_truth кодом
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                test_code = f"""
import json
import sys
import traceback

{ground_truth_code}

# Найти пользовательскую функцию
user_functions = [name for name in dir() if callable(globals()[name]) and not name.startswith('_')]
user_functions = [name for name in user_functions if name not in ['json', 'sys', 'traceback']]

if not user_functions:
    print("ERROR: No user function found")
    sys.exit(1)

user_func = globals()[user_functions[0]]

test_cases = {json.dumps(test_cases)}
all_passed = True

for i, test_case in enumerate(test_cases):
    try:
        test_input = test_case['input']
        expected = test_case['expected']
        
        # Умная передача аргументов
        if isinstance(test_input, list):
            result = user_func(*test_input)
        else:
            result = user_func(test_input)
        
        if result != expected:
            print(f"FAIL: Test {{i+1}} expected {{expected}}, got {{result}}")
            all_passed = False
        else:
            print(f"PASS: Test {{i+1}}")
            
    except Exception as e:
        print(f"ERROR: Test {{i+1}} failed with exception: {{e}}")
        all_passed = False

if all_passed:
    print("SUCCESS: All tests passed")
else:
    print("FAILURE: Some tests failed")
    sys.exit(1)
"""
                f.write(test_code)
                temp_file = f.name
            
            # Выполняем код
            process = await asyncio.create_subprocess_exec(
                'python3', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=5
            )
            
            output = stdout.decode().strip()
            error = stderr.decode().strip()
            
            # Удаляем временный файл
            os.unlink(temp_file)
            
            if process.returncode == 0 and "SUCCESS: All tests passed" in output:
                return True
            else:
                print(f"❌ Ground truth failed: {output} {error}")
                return False
                
        except Exception as e:
            print(f"❌ Ground truth execution error: {e}")
            return False
    
    def _calculate_quality_score(self, problem_data: Dict[str, Any]) -> float:
        """📊 Рассчитываем качество задачи"""
        score = 0.0
        
        # Проверка описания (0-3 балла)
        description = problem_data.get("description", "")
        if len(description) > 100:
            score += 1.0
        if "example" in description.lower():
            score += 1.0
        if len(description.split('\n')) >= 3:
            score += 1.0
        
        # Проверка тестов (0-4 балла)
        test_cases = problem_data.get("test_cases", [])
        if len(test_cases) >= 3:
            score += 2.0
        if len(test_cases) >= 5:
            score += 1.0
        if any("edge" in tc.get("description", "").lower() for tc in test_cases):
            score += 1.0
        
        # Проверка кода (0-3 балла)
        ground_truth = problem_data.get("ground_truth", "")
        starter_code = problem_data.get("starter_code", "")
        if len(ground_truth) > 50:
            score += 1.0
        if "def " in ground_truth and "return" in ground_truth:
            score += 1.0
        if len(starter_code) > 20:
            score += 1.0
        
        return score
    
    def _generate_fingerprint(self, title: str, ground_truth: str) -> str:
        """🔒 Генерируем уникальный отпечаток для проблемы против дублей"""
        # Include timestamp and random component for uniqueness
        timestamp = str(int(time.time()))
        random_component = str(random.randint(1000, 9999))
        content = f"{title}:{ground_truth}:{timestamp}:{random_component}"
        
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    async def _cache_validated_problem(self, problem: GeneratedProblem):
        """💾 Кэшируем валидированную задачу"""
        cache_key = f"{problem.difficulty}_{problem.fingerprint}"
        self.validated_problems_cache[cache_key] = problem
        print(f"💾 Cached validated problem: {problem.title}")
    
    def _get_fallback_problem(self, difficulty: DifficultyLevel, language: str, exclusions: Optional[Dict[str, Any]] = None) -> GeneratedProblem:
        """🔄 Возвращаем fallback задачу с ГАРАНТИРОВАННЫМ разнообразием"""
        available_problems = self.fallback_problems.get(difficulty.value, [])
        
        print(f"🎯 Available {difficulty.value} problems: {len(available_problems)}")
        for i, p in enumerate(available_problems):
            print(f"   {i+1}. {p['title']} ({p['function_name']})")
        
        # Apply exclusions if provided
        if exclusions and available_problems:
            excluded_titles = exclusions.get("exclude_titles", [])
            excluded_functions = exclusions.get("exclude_functions", [])
            
            filtered_problems = []
            for problem in available_problems:
                title = problem["title"].lower()
                function_name = problem["function_name"].lower()
                
                # Skip if title matches exclusions
                if any(excluded.lower() in title for excluded in excluded_titles):
                    print(f"🚫 Excluding title: {title}")
                    continue
                    
                # Skip if function name matches exclusions
                if any(excluded.lower() in function_name for excluded in excluded_functions):
                    print(f"🚫 Excluding function: {function_name}")
                    continue
                    
                filtered_problems.append(problem)
            
            # Use filtered problems if available, otherwise use all
            if filtered_problems:
                available_problems = filtered_problems
                print(f"✅ Using {len(filtered_problems)} filtered problems")
            else:
                print(f"⚠️ No problems left after filtering, using all {len(available_problems)}")
        
        # GUARANTEED RANDOMNESS: Use current time as seed for extra randomness
        import time
        import random
        import os
        
        # Use multiple sources of randomness for maximum variety
        microsecond_seed = int(time.time() * 1000000) % 1000000  # Microsecond precision
        process_seed = os.getpid() if hasattr(os, 'getpid') else 0
        random_seed = random.randint(1, 100000)
        
        # Combine multiple entropy sources
        combined_seed = (microsecond_seed + process_seed + random_seed) % 1000000
        random.seed(combined_seed)
        
        print(f"🎲 Random seed: {combined_seed} (ensuring maximum variety)")
        
        # Select random problem
        selected_problem = random.choice(available_problems)
        
        print(f"🎲 SELECTED RANDOM TASK: '{selected_problem['title']}'")
        print(f"   Function: {selected_problem['function_name']}")
        print(f"   Tests: {len(selected_problem['test_cases'])}")
        
        # Generate unique fingerprint with timestamp for uniqueness
        import time
        unique_timestamp = str(int(time.time() * 1000))  # millisecond precision
        fingerprint = self._generate_fingerprint(
            f"{selected_problem['title']}_{unique_timestamp}", 
            selected_problem['ground_truth']
        )
        
        return GeneratedProblem(
            title=selected_problem["title"],
            description=selected_problem["description"],
            function_name=selected_problem["function_name"],
            input_format=selected_problem["input_format"],
            starter_code=selected_problem["starter_code"],
            ground_truth=selected_problem["ground_truth"],
            test_cases=selected_problem["test_cases"],
            difficulty=difficulty.value,
            quality_score=8.0,  # Fallback задачи предварительно проверены
            validation_passed=True,
            fingerprint=fingerprint
        )
    
    def _load_fallback_problems(self) -> Dict[str, List[Dict[str, Any]]]:
        """📚 Загружаем fallback задачи с большим разнообразием"""
        return {
            "easy": [
                {
                    "title": "Sum of Array",
                    "description": "Calculate the sum of all elements in an array.\n\nExample:\nInput: [1, 2, 3, 4, 5]\nOutput: 15",
                    "function_name": "sum_array",
                    "input_format": {
                        "params": [{"name": "arr", "type": "List[int]", "description": "Array of integers"}],
                        "returns": "int"
                    },
                    "starter_code": "def sum_array(arr):\n    # TODO: Calculate sum of array elements\n    pass",
                    "ground_truth": "def sum_array(arr):\n    return sum(arr)",
                    "test_cases": [
                        {"input": [[1, 2, 3, 4, 5]], "expected": 15, "description": "Sum of positive numbers"},
                        {"input": [[-1, -2, -3]], "expected": -6, "description": "Sum of negative numbers"},
                        {"input": [[]], "expected": 0, "description": "Empty array"},
                        {"input": [[0, 0, 0]], "expected": 0, "description": "Array of zeros"}
                    ]
                },
                {
                    "title": "Find Maximum Number",
                    "description": "Find the maximum number in an array.\n\nExample:\nInput: [3, 1, 4, 1, 5, 9]\nOutput: 9",
                    "function_name": "find_max",
                    "input_format": {
                        "params": [{"name": "arr", "type": "List[int]", "description": "Array of integers"}],
                        "returns": "int"
                    },
                    "starter_code": "def find_max(arr):\n    # TODO: Find maximum element\n    pass",
                    "ground_truth": "def find_max(arr):\n    return max(arr) if arr else None",
                    "test_cases": [
                        {"input": [[3, 1, 4, 1, 5, 9]], "expected": 9, "description": "Positive numbers"},
                        {"input": [[-10, -5, -20]], "expected": -5, "description": "Negative numbers"},
                        {"input": [[42]], "expected": 42, "description": "Single element"}
                    ]
                },
                {
                    "title": "Count Even Numbers",
                    "description": "Count how many even numbers are in an array.\n\nExample:\nInput: [1, 2, 3, 4, 5, 6]\nOutput: 3",
                    "function_name": "count_even",
                    "input_format": {
                        "params": [{"name": "arr", "type": "List[int]", "description": "Array of integers"}],
                        "returns": "int"
                    },
                    "starter_code": "def count_even(arr):\n    # TODO: Count even numbers\n    pass",
                    "ground_truth": "def count_even(arr):\n    return sum(1 for x in arr if x % 2 == 0)",
                    "test_cases": [
                        {"input": [[1, 2, 3, 4, 5, 6]], "expected": 3, "description": "Mixed numbers"},
                        {"input": [[1, 3, 5]], "expected": 0, "description": "All odd"},
                        {"input": [[2, 4, 6]], "expected": 3, "description": "All even"}
                    ]
                },
                {
                    "title": "Reverse String",
                    "description": "Reverse a string.\n\nExample:\nInput: 'hello'\nOutput: 'olleh'",
                    "function_name": "reverse_string",
                    "input_format": {
                        "params": [{"name": "s", "type": "str", "description": "Input string"}],
                        "returns": "str"
                    },
                    "starter_code": "def reverse_string(s):\n    # TODO: Reverse the string\n    pass",
                    "ground_truth": "def reverse_string(s):\n    return s[::-1]",
                    "test_cases": [
                        {"input": ["hello"], "expected": "olleh", "description": "Regular string"},
                        {"input": [""], "expected": "", "description": "Empty string"},
                        {"input": ["a"], "expected": "a", "description": "Single character"}
                    ]
                },
                {
                    "title": "Is Palindrome",
                    "description": "Check if a string is a palindrome (reads the same forwards and backwards).\n\nExample:\nInput: 'racecar'\nOutput: True",
                    "function_name": "is_palindrome",
                    "input_format": {
                        "params": [{"name": "s", "type": "str", "description": "Input string"}],
                        "returns": "bool"
                    },
                    "starter_code": "def is_palindrome(s):\n    # TODO: Check if string is palindrome\n    pass",
                    "ground_truth": "def is_palindrome(s):\n    return s.lower() == s.lower()[::-1]",
                    "test_cases": [
                        {"input": ["racecar"], "expected": True, "description": "Palindrome"},
                        {"input": ["hello"], "expected": False, "description": "Not palindrome"},
                        {"input": [""], "expected": True, "description": "Empty string"}
                    ]
                }
            ],
            "medium": [
                {
                    "title": "Two Sum",
                    "description": "Given an array of integers and a target sum, return indices of two numbers that add up to the target.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
                    "function_name": "two_sum",
                    "input_format": {
                        "params": [
                            {"name": "nums", "type": "List[int]", "description": "Array of integers"},
                            {"name": "target", "type": "int", "description": "Target sum"}
                        ],
                        "returns": "List[int]"
                    },
                    "starter_code": "def two_sum(nums, target):\n    # TODO: Find two numbers that sum to target\n    pass",
                    "ground_truth": "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
                    "test_cases": [
                        {"input": [[2, 7, 11, 15], 9], "expected": [0, 1], "description": "Basic two sum"},
                        {"input": [[3, 2, 4], 6], "expected": [1, 2], "description": "Two sum with different order"},
                        {"input": [[3, 3], 6], "expected": [0, 1], "description": "Two identical numbers"}
                    ]
                },
                {
                    "title": "Valid Parentheses",
                    "description": "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nExample:\nInput: '()[]{}'\nOutput: True",
                    "function_name": "is_valid_parentheses",
                    "input_format": {
                        "params": [{"name": "s", "type": "str", "description": "String with brackets"}],
                        "returns": "bool"
                    },
                    "starter_code": "def is_valid_parentheses(s):\n    # TODO: Check if parentheses are valid\n    pass",
                    "ground_truth": "def is_valid_parentheses(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n        else:\n            stack.append(char)\n    return not stack",
                    "test_cases": [
                        {"input": ["()[]{}"], "expected": True, "description": "Valid brackets"},
                        {"input": ["([)]"], "expected": False, "description": "Invalid order"},
                        {"input": [""], "expected": True, "description": "Empty string"}
                    ]
                },
                {
                    "title": "Fibonacci Sequence",
                    "description": "Calculate the nth Fibonacci number.\n\nExample:\nInput: 6\nOutput: 8 (sequence: 0,1,1,2,3,5,8)",
                    "function_name": "fibonacci",
                    "input_format": {
                        "params": [{"name": "n", "type": "int", "description": "Position in sequence"}],
                        "returns": "int"
                    },
                    "starter_code": "def fibonacci(n):\n    # TODO: Calculate nth Fibonacci number\n    pass",
                    "ground_truth": "def fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b",
                    "test_cases": [
                        {"input": [6], "expected": 8, "description": "6th Fibonacci"},
                        {"input": [0], "expected": 0, "description": "0th Fibonacci"},
                        {"input": [1], "expected": 1, "description": "1st Fibonacci"}
                    ]
                },
                {
                    "title": "Remove Duplicates",
                    "description": "Remove duplicates from a sorted array in-place and return the new length.\n\nExample:\nInput: [1,1,2,2,3]\nOutput: 3",
                    "function_name": "remove_duplicates",
                    "input_format": {
                        "params": [{"name": "nums", "type": "List[int]", "description": "Sorted array"}],
                        "returns": "int"
                    },
                    "starter_code": "def remove_duplicates(nums):\n    # TODO: Remove duplicates and return length\n    pass",
                    "ground_truth": "def remove_duplicates(nums):\n    if not nums:\n        return 0\n    i = 0\n    for j in range(1, len(nums)):\n        if nums[j] != nums[i]:\n            i += 1\n            nums[i] = nums[j]\n    return i + 1",
                    "test_cases": [
                        {"input": [[1,1,2,2,3]], "expected": 3, "description": "With duplicates"},
                        {"input": [[1,2,3,4,5]], "expected": 5, "description": "No duplicates"},
                        {"input": [[1]], "expected": 1, "description": "Single element"}
                    ]
                },
                {
                    "title": "Binary Search",
                    "description": "Search for a target value in a sorted array using binary search.\n\nExample:\nInput: nums = [1,3,5,7,9], target = 5\nOutput: 2",
                    "function_name": "binary_search",
                    "input_format": {
                        "params": [
                            {"name": "nums", "type": "List[int]", "description": "Sorted array"},
                            {"name": "target", "type": "int", "description": "Target value"}
                        ],
                        "returns": "int"
                    },
                    "starter_code": "def binary_search(nums, target):\n    # TODO: Implement binary search\n    pass",
                    "ground_truth": "def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
                    "test_cases": [
                        {"input": [[1,3,5,7,9], 5], "expected": 2, "description": "Found target"},
                        {"input": [[1,3,5,7,9], 6], "expected": -1, "description": "Target not found"},
                        {"input": [[1], 1], "expected": 0, "description": "Single element"}
                    ]
                },
                {
                    "title": "Merge Sorted Arrays",
                    "description": "Merge two sorted arrays into one sorted array.\n\nExample:\nInput: [1,3,5], [2,4,6]\nOutput: [1,2,3,4,5,6]",
                    "function_name": "merge_sorted",
                    "input_format": {
                        "params": [
                            {"name": "arr1", "type": "List[int]", "description": "First sorted array"},
                            {"name": "arr2", "type": "List[int]", "description": "Second sorted array"}
                        ],
                        "returns": "List[int]"
                    },
                    "starter_code": "def merge_sorted(arr1, arr2):\n    # TODO: Merge two sorted arrays\n    pass",
                    "ground_truth": "def merge_sorted(arr1, arr2):\n    result = []\n    i = j = 0\n    while i < len(arr1) and j < len(arr2):\n        if arr1[i] <= arr2[j]:\n            result.append(arr1[i])\n            i += 1\n        else:\n            result.append(arr2[j])\n            j += 1\n    result.extend(arr1[i:])\n    result.extend(arr2[j:])\n    return result",
                    "test_cases": [
                        {"input": [[1,3,5], [2,4,6]], "expected": [1,2,3,4,5,6], "description": "Equal length"},
                        {"input": [[1,2,3], [4,5]], "expected": [1,2,3,4,5], "description": "Different lengths"},
                        {"input": [[], [1,2,3]], "expected": [1,2,3], "description": "Empty first array"}
                    ]
                }
            ],
            "hard": [
                {
                    "title": "Longest Increasing Subsequence",
                    "description": "Find the length of the longest strictly increasing subsequence.\n\nExample:\nInput: [10,9,2,5,3,7,101,18]\nOutput: 4",
                    "function_name": "longest_increasing_subsequence",
                    "input_format": {
                        "params": [{"name": "nums", "type": "List[int]", "description": "Array of integers"}],
                        "returns": "int"
                    },
                    "starter_code": "def longest_increasing_subsequence(nums):\n    # TODO: Find LIS length\n    pass",
                    "ground_truth": "def longest_increasing_subsequence(nums):\n    if not nums:\n        return 0\n    dp = [1] * len(nums)\n    for i in range(1, len(nums)):\n        for j in range(i):\n            if nums[i] > nums[j]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp)",
                    "test_cases": [
                        {"input": [[10,9,2,5,3,7,101,18]], "expected": 4, "description": "Mixed sequence"},
                        {"input": [[0,1,0,3,2,3]], "expected": 4, "description": "Another mixed sequence"},
                        {"input": [[7,7,7,7,7,7,7]], "expected": 1, "description": "All same numbers"}
                    ]
                },
                {
                    "title": "Maximum Subarray Sum",
                    "description": "Find the contiguous subarray with the largest sum (Kadane's algorithm).\n\nExample:\nInput: [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6",
                    "function_name": "max_subarray",
                    "input_format": {
                        "params": [{"name": "nums", "type": "List[int]", "description": "Array of integers"}],
                        "returns": "int"
                    },
                    "starter_code": "def max_subarray(nums):\n    # TODO: Find maximum subarray sum\n    pass",
                    "ground_truth": "def max_subarray(nums):\n    max_sum = current_sum = nums[0]\n    for num in nums[1:]:\n        current_sum = max(num, current_sum + num)\n        max_sum = max(max_sum, current_sum)\n    return max_sum",
                    "test_cases": [
                        {"input": [[-2,1,-3,4,-1,2,1,-5,4]], "expected": 6, "description": "Mixed positive/negative"},
                        {"input": [[-2,-3,-1,-5]], "expected": -1, "description": "All negative"},
                        {"input": [[1,2,3,4,5]], "expected": 15, "description": "All positive"}
                    ]
                },
                {
                    "title": "Edit Distance",
                    "description": "Calculate the minimum edit distance between two strings.\n\nExample:\nInput: 'horse', 'ros'\nOutput: 3",
                    "function_name": "edit_distance",
                    "input_format": {
                        "params": [
                            {"name": "word1", "type": "str", "description": "First string"},
                            {"name": "word2", "type": "str", "description": "Second string"}
                        ],
                        "returns": "int"
                    },
                    "starter_code": "def edit_distance(word1, word2):\n    # TODO: Calculate edit distance\n    pass",
                    "ground_truth": "def edit_distance(word1, word2):\n    m, n = len(word1), len(word2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(m + 1):\n        dp[i][0] = i\n    for j in range(n + 1):\n        dp[0][j] = j\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if word1[i-1] == word2[j-1]:\n                dp[i][j] = dp[i-1][j-1]\n            else:\n                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\n    return dp[m][n]",
                    "test_cases": [
                        {"input": ["horse", "ros"], "expected": 3, "description": "Different strings"},
                        {"input": ["intention", "execution"], "expected": 5, "description": "Longer strings"},
                        {"input": ["", "abc"], "expected": 3, "description": "Empty string"}
                    ]
                },
                {
                    "title": "Coin Change",
                    "description": "Find the minimum number of coins needed to make a given amount.\n\nExample:\nInput: coins = [1,3,4], amount = 6\nOutput: 2",
                    "function_name": "coin_change",
                    "input_format": {
                        "params": [
                            {"name": "coins", "type": "List[int]", "description": "Available coin denominations"},
                            {"name": "amount", "type": "int", "description": "Target amount"}
                        ],
                        "returns": "int"
                    },
                    "starter_code": "def coin_change(coins, amount):\n    # TODO: Find minimum coins needed\n    pass",
                    "ground_truth": "def coin_change(coins, amount):\n    dp = [float('inf')] * (amount + 1)\n    dp[0] = 0\n    for coin in coins:\n        for x in range(coin, amount + 1):\n            dp[x] = min(dp[x], dp[x - coin] + 1)\n    return dp[amount] if dp[amount] != float('inf') else -1",
                    "test_cases": [
                        {"input": [[1,3,4], 6], "expected": 2, "description": "Basic case"},
                        {"input": [[2], 3], "expected": -1, "description": "Impossible case"},
                        {"input": [[1,2,5], 11], "expected": 3, "description": "Multiple solutions"}
                    ]
                }
            ]
        }

# Global instance
validated_ai_generator = ValidatedAIGenerator() 