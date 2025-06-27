import json
import sys
import os
from typing import Dict, Any, List, Tuple
from openai import AsyncOpenAI
import asyncio
import re
import random

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from shared.app.config import get_settings
from duel_service.models import DuelDifficulty, ProblemType


class ProfessionalAIProblemGenerator:
    """
    🏆 ПРОФЕССИОНАЛЬНЫЙ генератор задач с продуманными:
    - Шаблонами кода с правильными аргументами
    - Комплексными тест-кейсами 
    - Умной генерацией задач
    - Интеграцией с универсальным runner
    """
    
    def __init__(self):
        # Initialize OpenAI client if API key is available
        settings = get_settings()
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
        
        if self.api_key and self.api_key != "":
            self.client = AsyncOpenAI(api_key=self.api_key)
            print(f"✅ Professional OpenAI API initialized")
        else:
            self.client = None
            print(f"⚠️  OpenAI API key not found. Using professional predefined problems.")
        
        # 📊 Professional problem templates with intelligent categorization
        self.complexity_levels = {
            DuelDifficulty.EASY: {
                "time_limit": "5-8 minutes",
                "concepts": ["basic loops", "if statements", "array iteration", "simple math"],
                "operations": 1,
                "max_complexity": "O(n)"
            },
            DuelDifficulty.MEDIUM: {
                "time_limit": "8-12 minutes", 
                "concepts": ["nested loops", "hash maps", "two pointers", "recursion"],
                "operations": 2,
                "max_complexity": "O(n log n)"
            },
            DuelDifficulty.HARD: {
                "time_limit": "12-20 minutes",
                "concepts": ["dynamic programming", "graph algorithms", "advanced data structures"],
                "operations": 3,
                "max_complexity": "O(n²)"
            },
            DuelDifficulty.EXPERT: {
                "time_limit": "20+ minutes",
                "concepts": ["complex algorithms", "optimization", "mathematical insights"],
                "operations": 4,
                "max_complexity": "O(n³) or optimized"
            }
        }
    
    async def generate_professional_problem(
        self,
        difficulty: DuelDifficulty,
        problem_type: ProblemType,
        user_preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """🎯 Generate a professional-grade coding problem"""
        
        print(f"🏆 Generating PROFESSIONAL problem: {difficulty.value} {problem_type.value}")
        
        # If no API client, use enhanced predefined problems
        if not self.client:
            return self._get_enhanced_predefined_problem(difficulty, problem_type, user_preferences)
        
        # Generate using enhanced AI with professional prompting
        try:
            problem_data = await self._generate_with_professional_ai(difficulty, problem_type, user_preferences)
            problem_data['generation_method'] = 'professional_ai'
            problem_data['quality_score'] = self._calculate_quality_score(problem_data)
            
            # ✅ Professional validation and enhancement
            problem_data = self._enhance_problem_quality(problem_data, difficulty, problem_type)
            
            print(f"✅ Professional AI problem generated: {problem_data.get('title')} (Quality: {problem_data.get('quality_score', 0)}/10)")
            return problem_data
            
        except Exception as e:
            print(f"❌ Professional AI generation failed: {e}")
            return self._get_enhanced_predefined_problem(difficulty, problem_type, user_preferences)
    
    async def _generate_with_professional_ai(
        self,
        difficulty: DuelDifficulty,
        problem_type: ProblemType,
        user_preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """🤖 Generate problem using enhanced AI with professional prompting"""
        
        complexity_info = self.complexity_levels[difficulty]
        
        # 🎯 Professional prompt engineering
        prompt = f"""You are a WORLD-CLASS competitive programming problem creator, used by top companies like Google, Meta, and LeetCode.

Create a {difficulty.value.upper()} level {problem_type.value} problem that is:
- ENGAGING and PRACTICAL (real-world inspired)  
- PERFECTLY BALANCED for {complexity_info['time_limit']} solving time
- COMPREHENSIVE with edge cases and test coverage
- COMPATIBLE with universal function execution (any function name, *args support)

STRICT JSON FORMAT REQUIRED:
{{
    "title": "Descriptive Title (3-4 words)",
    "description": "Clear problem description with 2+ detailed examples showing input→output flow. Explain edge cases and constraints clearly.",
    "real_world_context": "Brief explanation of where this problem appears in real software development",
    "constraints": "Detailed input constraints and complexity requirements: {complexity_info['max_complexity']}",
    "difficulty_rationale": "Why this is {difficulty.value} difficulty",
    "hints": [
        "Strategic hint for approach",
        "Implementation detail hint", 
        "Optimization hint",
        "Edge case consideration"
    ],
    "function_signature": {{
        "name": "descriptive_function_name",
        "parameters": [
            {{"name": "param1", "type": "appropriate_type", "description": "what this parameter represents"}},
            {{"name": "param2", "type": "appropriate_type", "description": "what this parameter represents"}}
        ],
        "return_type": "appropriate_return_type",
        "return_description": "what the function should return"
    }},
    "starter_code": {{
        "python": "def function_name(param1, param2):\\n    # TODO: {complexity_info['concepts'][0]} approach\\n    # Hint: {complexity_info['concepts'][1]}\\n    pass",
        "javascript": "function functionName(param1, param2) {{\\n    // TODO: {complexity_info['concepts'][0]} approach\\n    // Hint: {complexity_info['concepts'][1]}\\n    return null;\\n}}"
    }},
    "test_cases": [
        {{"input": "basic_example_input", "expected": "expected_output", "is_hidden": false, "description": "Basic example case"}},
        {{"input": "comprehensive_example", "expected": "expected_output", "is_hidden": false, "description": "More comprehensive example"}},
        {{"input": "edge_case_empty", "expected": "edge_result", "is_hidden": true, "description": "Empty input edge case"}},
        {{"input": "edge_case_single", "expected": "single_result", "is_hidden": true, "description": "Single element case"}},
        {{"input": "edge_case_large", "expected": "large_result", "is_hidden": true, "description": "Large input boundary case"}},
        {{"input": "corner_case_special", "expected": "special_result", "is_hidden": true, "description": "Special corner case"}},
        {{"input": "performance_test", "expected": "performance_result", "is_hidden": true, "description": "Performance boundary test"}}
    ],
    "ai_solution": {{
        "approach": "Step-by-step solution approach explanation",
        "complexity": {{"time": "{complexity_info['max_complexity']}", "space": "space_complexity"}},
        "code": "def function_name(param1, param2):\\n    # Professional solution implementation\\n    return result"
    }}
}}

REQUIREMENTS:
- Exactly 7 test cases: 2 visible examples + 5 hidden edge/performance cases
- Test cases must cover: normal, empty, single element, large, corner, performance
- Function should accept parameters as specified (not *args unless specifically needed)
- Starter code must NOT contain solution logic
- AI solution should be optimal and well-commented
- Problem should be inspired by real coding interview questions
- Focus on {problem_type.value} concepts: {', '.join(complexity_info['concepts'])}
"""
        
        if user_preferences:
            prompt += f"\nUser preferences: {json.dumps(user_preferences)}"
        
        return await self._call_professional_openai(prompt)
    
    async def _call_professional_openai(self, prompt: str) -> Dict[str, Any]:
        """🤖 Call OpenAI with professional settings"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",  # 🔥 Use GPT-4 for better quality
                messages=[
                    {
                        "role": "system",
                        "content": """You are an EXPERT competitive programming problem designer with 10+ years experience creating problems for Google Code Jam, LeetCode, and Codeforces. 

Your problems are known for:
- Perfect difficulty calibration
- Comprehensive edge case coverage  
- Real-world applicability
- Clean, professional presentation
- Universal compatibility

ALWAYS respond with ONLY valid JSON. No additional text."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=3000,  # More tokens for detailed problems
                temperature=0.8,  # Balanced creativity and consistency
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from Professional OpenAI")
            
            return self._parse_and_validate_professional_response(content)
            
        except Exception as e:
            print(f"❌ Professional OpenAI API error: {e}")
            raise
    
    def _parse_and_validate_professional_response(self, response: str) -> Dict[str, Any]:
        """🔍 Parse and validate AI response with professional standards"""
        try:
            data = json.loads(response)
            
            # ✅ Professional validation suite
            self._validate_professional_structure(data)
            self._validate_function_signature(data)
            self._validate_test_coverage(data)
            self._validate_starter_code_quality(data)
            self._validate_ai_solution(data)
            
            print(f"✅ Professional validation passed: {len(data['test_cases'])} test cases")
            return data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in professional AI response: {e}")
        except Exception as e:
            raise ValueError(f"Professional validation failed: {e}")
    
    def _validate_professional_structure(self, data: Dict[str, Any]) -> None:
        """🏗️ Validate professional problem structure"""
        required_fields = [
            'title', 'description', 'real_world_context', 'constraints',
            'difficulty_rationale', 'hints', 'function_signature', 
            'starter_code', 'test_cases', 'ai_solution'
        ]
        
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing professional field: {field}")
        
        # Validate hints quality
        if not isinstance(data['hints'], list) or len(data['hints']) < 3:
            raise ValueError("Professional problems require at least 3 strategic hints")
    
    def _validate_function_signature(self, data: Dict[str, Any]) -> None:
        """🔧 Validate function signature specification"""
        sig = data['function_signature']
        
        required_sig_fields = ['name', 'parameters', 'return_type', 'return_description']
        for field in required_sig_fields:
            if field not in sig:
                raise ValueError(f"Missing function signature field: {field}")
        
        # Validate parameters
        if not isinstance(sig['parameters'], list):
            raise ValueError("Function parameters must be a list")
        
        for param in sig['parameters']:
            if not all(key in param for key in ['name', 'type', 'description']):
                raise ValueError("Each parameter must have name, type, and description")
    
    def _validate_test_coverage(self, data: Dict[str, Any]) -> None:
        """🧪 Validate comprehensive test coverage"""
        test_cases = data['test_cases']
        
        if len(test_cases) < 5:
            raise ValueError("Professional problems require minimum 5 test cases")
        
        # Check test case types
        visible_cases = [tc for tc in test_cases if not tc.get('is_hidden', True)]
        hidden_cases = [tc for tc in test_cases if tc.get('is_hidden', False)]
        
        if len(visible_cases) < 2:
            raise ValueError("Need at least 2 visible example cases")
        if len(hidden_cases) < 3:
            raise ValueError("Need at least 3 hidden edge/performance cases")
        
        # Validate test case descriptions
        for tc in test_cases:
            if 'description' not in tc:
                raise ValueError("All test cases must have descriptions")
    
    def _validate_starter_code_quality(self, data: Dict[str, Any]) -> None:
        """📝 Validate starter code quality"""
        starter_code = data['starter_code']
        
        for lang in ['python', 'javascript']:
            if lang not in starter_code:
                raise ValueError(f"Missing starter code for {lang}")
            
            code = starter_code[lang]
            
            # Check that it's actually starter code, not solution
            if self._looks_like_solution(code, lang):
                print(f"⚠️ Fixing starter code for {lang}")
                starter_code[lang] = self._generate_professional_starter_code(
                    data['function_signature'], lang
                )
    
    def _validate_ai_solution(self, data: Dict[str, Any]) -> None:
        """🤖 Validate AI solution quality"""
        solution = data['ai_solution']
        
        required_solution_fields = ['approach', 'complexity', 'code']
        for field in required_solution_fields:
            if field not in solution:
                raise ValueError(f"Missing AI solution field: {field}")
        
        # Validate complexity specification
        complexity = solution['complexity']
        if 'time' not in complexity or 'space' not in complexity:
            raise ValueError("AI solution must specify time and space complexity")
    
    def _looks_like_solution(self, code: str, language: str) -> bool:
        """🔍 Enhanced solution detection"""
        code_lower = code.lower()
        
        # Strong solution indicators
        strong_patterns = [
            'for ', 'while ', 'if ', 'return [^;]*[a-z]',  # Control flow with logic
            'sum(', 'max(', 'min(', 'sorted(', '.sort(',  # Built-in functions
            '\\+', '\\*', '\\/', '\\-',  # Arithmetic operations
            '\\.append', '\\.extend', '\\.insert',  # List operations
            'len(', 'range(', 'enumerate('  # Common functions
        ]
        
        # Starter code indicators
        starter_patterns = [
            'todo', 'pass', '# your code', '# implement', 'null;', 'return null'
        ]
        
        strong_count = sum(1 for pattern in strong_patterns if re.search(pattern, code_lower))
        starter_count = sum(1 for pattern in starter_patterns if pattern in code_lower)
        
        # If lots of logic and no starter indicators = solution
        return strong_count >= 3 and starter_count == 0
    
    def _generate_professional_starter_code(
        self,
        function_signature: Dict[str, Any],
        language: str
    ) -> str:
        """🏗️ Generate professional starter code"""
        
        func_name = function_signature['name']
        params = function_signature['parameters']
        return_desc = function_signature.get('return_description', 'result')
        
        if language == 'python':
            param_str = ', '.join(param['name'] for param in params)
            param_comments = '\n    '.join(f"# {param['name']}: {param['description']}" for param in params)
            
            return f"""def {func_name}({param_str}):
    '''
    {param_comments}
    Returns: {return_desc}
    '''
    # TODO: Implement your solution here
    # Read the problem description and hints carefully
    pass"""
        
        elif language == 'javascript':
            param_str = ', '.join(param['name'] for param in params)
            param_comments = '\n    '.join(f"// {param['name']}: {param['description']}" for param in params)
            
            return f"""function {func_name}({param_str}) {{
    /*
    {param_comments}
    Returns: {return_desc}
    */
    // TODO: Implement your solution here
    // Read the problem description and hints carefully
    return null;
}}"""
        
        return f"// TODO: Implement {func_name}"
    
    def _enhance_problem_quality(
        self,
        problem_data: Dict[str, Any],
        difficulty: DuelDifficulty,
        problem_type: ProblemType
    ) -> Dict[str, Any]:
        """🚀 Enhance problem quality with professional standards"""
        
        # Add professional metadata
        problem_data['difficulty'] = difficulty.value
        problem_data['type'] = problem_type.value
        problem_data['estimated_time_minutes'] = self._estimate_solving_time(difficulty)
        problem_data['professional_grade'] = True
        
        # Enhance test cases with better descriptions
        problem_data['test_cases'] = self._enhance_test_cases(problem_data['test_cases'])
        
        # Add performance benchmarks
        problem_data['performance_benchmarks'] = self._generate_performance_benchmarks(difficulty)
        
        return problem_data
    
    def _estimate_solving_time(self, difficulty: DuelDifficulty) -> Tuple[int, int]:
        """⏱️ Estimate solving time range"""
        time_ranges = {
            DuelDifficulty.EASY: (3, 8),
            DuelDifficulty.MEDIUM: (8, 15),
            DuelDifficulty.HARD: (15, 25),
            DuelDifficulty.EXPERT: (25, 40)
        }
        return time_ranges.get(difficulty, (10, 20))
    
    def _enhance_test_cases(self, test_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """🧪 Enhance test cases with better metadata"""
        enhanced = []
        
        for i, tc in enumerate(test_cases):
            enhanced_tc = tc.copy()
            enhanced_tc['test_id'] = f"test_{i+1}"
            enhanced_tc['category'] = self._categorize_test_case(tc, i)
            enhanced_tc['difficulty_weight'] = self._calculate_test_difficulty(tc, i)
            enhanced.append(enhanced_tc)
        
        return enhanced
    
    def _categorize_test_case(self, test_case: Dict[str, Any], index: int) -> str:
        """🏷️ Categorize test case by type"""
        if index < 2:
            return "example"
        elif "empty" in test_case.get('description', '').lower():
            return "edge_empty"
        elif "single" in test_case.get('description', '').lower():
            return "edge_single"
        elif "large" in test_case.get('description', '').lower():
            return "performance"
        elif "corner" in test_case.get('description', '').lower():
            return "corner_case"
        else:
            return "validation"
    
    def _calculate_test_difficulty(self, test_case: Dict[str, Any], index: int) -> float:
        """📊 Calculate test case difficulty weight"""
        base_weight = 1.0
        
        if index < 2:  # Example cases
            return base_weight * 0.5
        elif test_case.get('is_hidden', False):
            return base_weight * (1.5 + index * 0.2)
        else:
            return base_weight
    
    def _generate_performance_benchmarks(self, difficulty: DuelDifficulty) -> Dict[str, Any]:
        """⚡ Generate performance benchmarks"""
        benchmarks = {
            DuelDifficulty.EASY: {"max_operations": 10**6, "memory_mb": 50},
            DuelDifficulty.MEDIUM: {"max_operations": 10**7, "memory_mb": 100}, 
            DuelDifficulty.HARD: {"max_operations": 10**8, "memory_mb": 200},
            DuelDifficulty.EXPERT: {"max_operations": 10**9, "memory_mb": 500}
        }
        
        return benchmarks.get(difficulty, benchmarks[DuelDifficulty.MEDIUM])
    
    def _calculate_quality_score(self, problem_data: Dict[str, Any]) -> int:
        """📈 Calculate problem quality score (1-10)"""
        score = 0
        
        # Structure completeness (0-3 points)
        required_fields = ['title', 'description', 'test_cases', 'starter_code']
        completeness = sum(1 for field in required_fields if field in problem_data)
        score += min(3, completeness)
        
        # Test coverage (0-3 points)
        test_cases = problem_data.get('test_cases', [])
        if len(test_cases) >= 5:
            score += 2
            if len(test_cases) >= 7:
                score += 1
        
        # Professional features (0-4 points)
        professional_features = ['hints', 'function_signature', 'ai_solution', 'real_world_context']
        prof_score = sum(1 for feature in professional_features if feature in problem_data)
        score += prof_score
        
        return min(10, score)
    
    def _get_enhanced_predefined_problem(
        self,
        difficulty: DuelDifficulty,
        problem_type: ProblemType,
        user_preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """🎯 Get enhanced predefined problem with professional standards"""
        
        # 🏆 PROFESSIONAL predefined problems database
        problems = {
            (DuelDifficulty.EASY, ProblemType.ARRAY): {
                "title": "Find Maximum Element",
                "description": """Given an array of integers, find and return the maximum element.

Example 1:
Input: [3, 7, 1, 9, 4]
Output: 9
Explanation: 9 is the largest number in the array.

Example 2:
Input: [1]
Output: 1
Explanation: Single element is the maximum.""",
                "real_world_context": "Finding maximum values is common in data analytics, performance monitoring, and statistical calculations.",
                "constraints": "1 ≤ array length ≤ 10^4\n-10^9 ≤ element ≤ 10^9\nTime complexity: O(n)\nSpace complexity: O(1)",
                "difficulty_rationale": "Easy problem requiring basic array iteration with single pass through data.",
                "hints": [
                    "Iterate through the array once",
                    "Keep track of the maximum value seen so far",
                    "Handle negative numbers correctly",
                    "Consider single element arrays"
                ],
                "function_signature": {
                    "name": "find_max",
                    "parameters": [
                        {"name": "arr", "type": "List[int]", "description": "Array of integers to search"}
                    ],
                    "return_type": "int",
                    "return_description": "The maximum element in the array"
                },
                "starter_code": {
                    "python": """def find_max(arr):
    '''
    arr: Array of integers to search
    Returns: The maximum element in the array
    '''
    # TODO: Implement your solution here
    # Hint: Iterate through array and track maximum
    pass""",
                    "javascript": """function findMax(arr) {
    /*
    arr: Array of integers to search
    Returns: The maximum element in the array
    */
    // TODO: Implement your solution here  
    // Hint: Iterate through array and track maximum
    return null;
}"""
                },
                "test_cases": [
                    {"input": [3, 7, 1, 9, 4], "expected": 9, "is_hidden": False, "description": "Basic example with positive numbers", "category": "example"},
                    {"input": [1], "expected": 1, "is_hidden": False, "description": "Single element array", "category": "example"},
                    {"input": [-5, -1, -10], "expected": -1, "is_hidden": True, "description": "All negative numbers", "category": "edge_negative"},
                    {"input": [0, 0, 0], "expected": 0, "is_hidden": True, "description": "All zeros", "category": "edge_zeros"},
                    {"input": [100, 99, 101], "expected": 101, "is_hidden": True, "description": "Close values test", "category": "validation"},
                    {"input": list(range(1000)), "expected": 999, "is_hidden": True, "description": "Large array performance test", "category": "performance"},
                    {"input": [-1000000, 1000000], "expected": 1000000, "is_hidden": True, "description": "Extreme value bounds", "category": "boundary"}
                ],
                "ai_solution": {
                    "approach": "Single pass through array tracking maximum value",
                    "complexity": {"time": "O(n)", "space": "O(1)"},
                    "code": """def find_max(arr):
    if not arr:
        return None
    
    max_val = arr[0]
    for num in arr[1:]:
        if num > max_val:
            max_val = num
    
    return max_val"""
                }
            },
            
            (DuelDifficulty.MEDIUM, ProblemType.MATH): {
                "title": "Square Root Sum",
                "description": """Given a positive integer n, find the sum of the square roots of all numbers from 1 to n (inclusive). Return the sum rounded to the nearest integer.

Example 1:
Input: n = 5
Output: 8
Explanation: sqrt(1) + sqrt(2) + sqrt(3) + sqrt(4) + sqrt(5) = 1.00 + 1.41 + 1.73 + 2.00 + 2.24 = 8.38 ≈ 8

Example 2:
Input: n = 10  
Output: 22
Explanation: Sum of square roots from 1 to 10 equals approximately 22.46 ≈ 22""",
                "real_world_context": "Square root calculations appear in physics simulations, computer graphics, signal processing, and statistical analysis.",
                "constraints": "1 ≤ n ≤ 10^6\nTime complexity: O(n)\nSpace complexity: O(1)",
                "difficulty_rationale": "Medium problem requiring mathematical computation and understanding of floating-point precision.",
                "hints": [
                    "Use the math.sqrt() function for square root calculation",
                    "Iterate from 1 to n and sum the square roots",
                    "Round the final result to nearest integer",
                    "Consider precision issues with floating point arithmetic"
                ],
                "function_signature": {
                    "name": "square_root_sum",
                    "parameters": [
                        {"name": "n", "type": "int", "description": "Upper bound for square root sum calculation"}
                    ],
                    "return_type": "int", 
                    "return_description": "Sum of square roots from 1 to n, rounded to nearest integer"
                },
                "starter_code": {
                    "python": """import math

def square_root_sum(n):
    '''
    n: Upper bound for square root sum calculation
    Returns: Sum of square roots from 1 to n, rounded to nearest integer
    '''
    # TODO: Implement your solution here
    # Hint: Use math.sqrt() and sum from 1 to n
    pass""",
                    "javascript": """function squareRootSum(n) {
    /*
    n: Upper bound for square root sum calculation
    Returns: Sum of square roots from 1 to n, rounded to nearest integer
    */
    // TODO: Implement your solution here
    // Hint: Use Math.sqrt() and sum from 1 to n
    return null;
}"""
                },
                "test_cases": [
                    {"input": 5, "expected": 8, "is_hidden": False, "description": "Basic example", "category": "example"},
                    {"input": 10, "expected": 22, "is_hidden": False, "description": "Larger example", "category": "example"},
                    {"input": 1, "expected": 1, "is_hidden": True, "description": "Minimum input", "category": "edge_single"},
                    {"input": 100, "expected": 671, "is_hidden": True, "description": "Moderate size test", "category": "validation"},
                    {"input": 1000, "expected": 21097, "is_hidden": True, "description": "Large input test", "category": "performance"},
                    {"input": 50000, "expected": 7453559, "is_hidden": True, "description": "Performance boundary", "category": "performance"},
                    {"input": 2, "expected": 2, "is_hidden": True, "description": "Small boundary", "category": "boundary"}
                ],
                "ai_solution": {
                    "approach": "Iterate through 1 to n, calculate square root of each number, sum them up, and round to nearest integer",
                    "complexity": {"time": "O(n)", "space": "O(1)"},
                    "code": """import math

def square_root_sum(n):
    total = 0.0
    for i in range(1, n + 1):
        total += math.sqrt(i)
    return round(total)"""
                }
            },
            
            (DuelDifficulty.MEDIUM, ProblemType.ARRAY): {
                "title": "Array Intersection Count",
                "description": """Given two arrays of integers, find the count of unique elements that are common in both arrays.

Example 1:
Input: arr1 = [1, 2, 3, 4, 5], arr2 = [3, 4, 5, 6, 7]
Output: 3
Explanation: Common elements are 3, 4, and 5. Total count = 3.

Example 2:
Input: arr1 = [-1, 0, 1, 2], arr2 = [-2, -1, 0, 1] 
Output: 3
Explanation: Common elements are -1, 0, and 1. Total count = 3.""",
                "real_world_context": "Set intersection is fundamental in database queries, data analysis, recommendation systems, and social network analysis.",
                "constraints": "1 ≤ array length ≤ 10^5\n-10^9 ≤ element ≤ 10^9\nTime complexity: O(n + m)\nSpace complexity: O(min(n, m))",
                "difficulty_rationale": "Medium problem requiring set operations and understanding of hash-based data structures.",
                "hints": [
                    "Convert arrays to sets for efficient intersection",
                    "Use set intersection to find common elements",
                    "Return the count of unique common elements",
                    "Consider using hash sets for O(1) lookup time"
                ],
                "function_signature": {
                    "name": "array_intersection_count",
                    "parameters": [
                        {"name": "arr1", "type": "List[int]", "description": "First array of integers"},
                        {"name": "arr2", "type": "List[int]", "description": "Second array of integers"}
                    ],
                    "return_type": "int",
                    "return_description": "Count of unique elements common to both arrays"
                },
                "starter_code": {
                    "python": """def array_intersection_count(arr1, arr2):
    '''
    arr1: First array of integers
    arr2: Second array of integers
    Returns: Count of unique elements common to both arrays
    '''
    # TODO: Implement your solution here
    # Hint: Use set intersection for efficient comparison
    pass""",
                    "javascript": """function arrayIntersectionCount(arr1, arr2) {
    /*
    arr1: First array of integers
    arr2: Second array of integers
    Returns: Count of unique elements common to both arrays
    */
    // TODO: Implement your solution here
    // Hint: Use Set for efficient comparison
    return null;
}"""
                },
                "test_cases": [
                    {"input": [[1, 2, 3, 4, 5], [3, 4, 5, 6, 7]], "expected": 3, "is_hidden": False, "description": "Basic intersection example", "category": "example"},
                    {"input": [[-1, 0, 1, 2], [-2, -1, 0, 1]], "expected": 3, "is_hidden": False, "description": "Example with negative numbers", "category": "example"},
                    {"input": [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]], "expected": 0, "is_hidden": True, "description": "No common elements", "category": "edge_empty"},
                    {"input": [[1, 2, 3, 4, 5], [5, 4, 3, 2, 1]], "expected": 5, "is_hidden": True, "description": "All elements common", "category": "edge_full"},
                    {"input": [[-10, 0, 10, 100, 1000], [-10, 0, 10, 100, 1000]], "expected": 5, "is_hidden": True, "description": "Identical arrays", "category": "validation"},
                    {"input": [[1, 1, 2, 2, 3], [2, 2, 3, 3, 4]], "expected": 2, "is_hidden": True, "description": "Duplicate elements", "category": "validation"},
                    {"input": [list(range(10000)), list(range(5000, 15000))], "expected": 5000, "is_hidden": True, "description": "Large arrays performance", "category": "performance"}
                ],
                "ai_solution": {
                    "approach": "Convert both arrays to sets and find intersection, then return the count",
                    "complexity": {"time": "O(n + m)", "space": "O(min(n, m))"},
                    "code": """def array_intersection_count(arr1, arr2):
    set1 = set(arr1)
    set2 = set(arr2)
    intersection = set1 & set2
    return len(intersection)"""
                }
            }
        }
        
        # Get problem or create a fallback
        problem_key = (difficulty, problem_type)
        if problem_key in problems:
            problem = problems[problem_key]
        else:
            # Use Square Root Sum as default fallback
            problem = problems[(DuelDifficulty.MEDIUM, ProblemType.MATH)]
        
        # 🚀 Enhance with professional metadata
        problem = self._enhance_problem_quality(problem, difficulty, problem_type)
        problem['generation_method'] = 'enhanced_predefined'
        problem['quality_score'] = self._calculate_quality_score(problem)
        
        return problem


# Create global instance with new professional class
ai_problem_generator = ProfessionalAIProblemGenerator() 