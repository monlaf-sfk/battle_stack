"""
LeetCode-style code execution system
Simple, reliable, and predictable like LeetCode
"""

import os
import time
import tempfile
import asyncio
import subprocess
import json
import math
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class LeetCodeResult:
    """Result of LeetCode-style execution"""
    passed: int = 0
    failed: int = 0
    total_tests: int = 0
    execution_time_ms: int = 0
    error: Optional[str] = None
    test_results: List[Dict] = None
    is_solution_correct: bool = False
    progress_percentage: float = 0.0

    def __post_init__(self):
        if self.test_results is None:
            self.test_results = []


class LeetCodeRunner:
    """
    LeetCode-style code execution
    - Fixed function signatures
    - Direct function calls
    - Simple test comparisons
    """
    
    def __init__(self):
        self.timeout_seconds = 10
        
        # Problem templates with fixed signatures
        self.problem_templates = {
            "square_root_sum": {
                "function_name": "square_root_sum",
                "signature": "def square_root_sum(n: int) -> int:",
                "template": """
import math

def square_root_sum(n: int) -> int:
    # TODO: Calculate sum of square roots from 1 to n
    # Example: for n=5, return sqrt(1) + sqrt(2) + sqrt(3) + sqrt(4) + sqrt(5)
    # Round to nearest integer
    pass

# Test runner (DO NOT MODIFY)
def run_test():
    import sys
    n = int(sys.argv[1])
    result = square_root_sum(n)
    print(result)

if __name__ == "__main__":
    run_test()
""",
                "test_cases": [
                    {"input": 5, "expected": 8},
                    {"input": 10, "expected": 22},
                    {"input": 1, "expected": 1},
                    {"input": 100, "expected": 671},
                    {"input": 1000000, "expected": 666666000}
                ]
            },
            
            "two_sum": {
                "function_name": "two_sum", 
                "signature": "def two_sum(nums: List[int], target: int) -> List[int]:",
                "template": """
from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    # TODO: Find two numbers that add up to target
    # Return indices of the two numbers
    pass

# Test runner (DO NOT MODIFY)
def run_test():
    import sys
    import json
    nums = json.loads(sys.argv[1])
    target = int(sys.argv[2])
    result = two_sum(nums, target)
    print(json.dumps(result))

if __name__ == "__main__":
    run_test()
""",
                "test_cases": [
                    {"input": [[2, 7, 11, 15], 9], "expected": [0, 1]},
                    {"input": [[3, 2, 4], 6], "expected": [1, 2]},
                    {"input": [[3, 3], 6], "expected": [0, 1]}
                ]
            },
            
            "is_palindrome": {
                "function_name": "is_palindrome",
                "signature": "def is_palindrome(s: str) -> bool:",
                "template": """
def is_palindrome(s: str) -> bool:
    # TODO: Check if string is a palindrome
    # Consider only alphanumeric characters and ignore case
    pass

# Test runner (DO NOT MODIFY)
def run_test():
    import sys
    s = sys.argv[1]
    result = is_palindrome(s)
    print("true" if result else "false")

if __name__ == "__main__":
    run_test()
""",
                "test_cases": [
                    {"input": "A man, a plan, a canal: Panama", "expected": True},
                    {"input": "race a car", "expected": False},
                    {"input": "", "expected": True}
                ]
            }
        }

    def get_problem_template(self, problem_title: str) -> Dict[str, Any]:
        """Get LeetCode-style template for a problem - UNIVERSAL approach"""
        # Convert title to key
        key = problem_title.lower().replace(" ", "_").replace("-", "_")
        
        # Find matching template
        for template_key, template in self.problem_templates.items():
            if template_key in key or key in template_key:
                print(f"🎯 Found specific template for: {problem_title}")
                return template
        
        # UNIVERSAL template for ANY problem
        print(f"🌍 Using universal template for: {problem_title}")
        return {
            "function_name": "solution",  # This will be ignored anyway
            "signature": "def solution(*args) -> Any:",
            "template": f"""
def solution(*args):
    # TODO: Implement solution for {problem_title}
    pass
""",
            "test_cases": []
        }

    async def run_leetcode_test(
        self,
        user_code: str,
        problem_title: str,
        test_cases: List[Dict[str, Any]]
    ) -> LeetCodeResult:
        """
        UNIVERSAL LeetCode-style execution - works with ANY function!
        1. Find ANY user function (not just specific names)
        2. Auto-detect function parameters 
        3. Smart argument passing
        4. Simple result comparison
        """
        print(f"🌍 UNIVERSAL LeetCode execution for: {problem_title}")
        
        template = self.get_problem_template(problem_title)
        
        # Use provided test cases or template defaults
        if not test_cases:
            test_cases = template["test_cases"]
        
        print(f"📊 Running {len(test_cases)} test cases")
        
        # Extract ANY user function
        print(f"📝 User code preview: {user_code[:200]}...")
        
        user_function = self._extract_user_function(user_code, template["function_name"])
        if not user_function:
            error_msg = f"Could not find ANY user function in the code. Please make sure you have at least one function defined."
            print(f"❌ {error_msg}")
            return LeetCodeResult(
                total_tests=len(test_cases),
                error=error_msg
            )
        
        passed = 0
        failed = 0
        test_results = []
        total_time = 0
        
        for i, test_case in enumerate(test_cases):
            print(f"🧪 Test {i+1}/{len(test_cases)}: {test_case['input']}")
            
            start_time = time.time()
            
            try:
                # Run single test case
                result = await self._run_single_test(
                    user_function,
                    template,
                    test_case
                )
                
                execution_time = int((time.time() - start_time) * 1000)
                total_time += execution_time
                
                # Compare results
                expected = test_case.get("expected") or test_case.get("output")
                is_correct = self._compare_results(result, expected)
                
                if is_correct:
                    passed += 1
                    print(f"   ✅ PASSED: {result}")
                else:
                    failed += 1
                    print(f"   ❌ FAILED: expected {expected}, got {result}")
                
                test_results.append({
                    "test_case": i + 1,
                    "input": test_case["input"],
                    "expected": expected,
                    "actual": result,
                    "passed": is_correct,
                    "execution_time_ms": execution_time
                })
                
            except Exception as e:
                failed += 1
                error_msg = str(e)
                print(f"   💥 ERROR: {error_msg}")
                
                test_results.append({
                    "test_case": i + 1,
                    "input": test_case["input"], 
                    "expected": test_case.get("expected") or test_case.get("output"),
                    "actual": None,
                    "passed": False,
                    "error": error_msg
                })
        
        is_solution_correct = passed == len(test_cases)
        progress = (passed / len(test_cases)) * 100 if test_cases else 0
        
        print(f"📊 Results: {passed}/{len(test_cases)} passed ({progress:.1f}%)")
        
        return LeetCodeResult(
            passed=passed,
            failed=failed,
            total_tests=len(test_cases),
            execution_time_ms=total_time,
            test_results=test_results,
            is_solution_correct=is_solution_correct,
            progress_percentage=progress
        )

    def _extract_user_function(self, user_code: str, function_name: str) -> Optional[str]:
        """Extract ANY user function with imports - truly universal approach"""
        lines = user_code.strip().split('\n')
        
        print(f"🔍 Looking for ANY user function (not just '{function_name}')...")
        
        # First, extract all imports from the user code
        imports = []
        for line in lines:
            line_stripped = line.strip()
            if (line_stripped.startswith("import ") or 
                line_stripped.startswith("from ") and " import " in line_stripped):
                imports.append(line_stripped)
                print(f"📦 Found import: {line_stripped}")
        
        # Find ALL user-defined functions (excluding system/test functions)
        user_functions = []
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if (line_stripped.startswith("def ") and 
                not line_stripped.startswith("def main") and
                not line_stripped.startswith("def test") and
                not line_stripped.startswith("def run_test") and
                not line_stripped.startswith("def __") and
                not "# Test runner" in line):
                
                # Extract function name
                try:
                    func_def = line_stripped[4:]  # Remove "def "
                    func_name = func_def.split('(')[0].strip()
                    user_functions.append((i, func_name, line_stripped))
                    print(f"📝 Found user function: {line_stripped}")
                except:
                    continue
        
        if not user_functions:
            print(f"❌ No user functions found in code: {user_code[:200]}...")
            return None
        
        # Strategy: Pick the best function
        func_start = -1
        chosen_function = None
        
        # Priority 1: Try to find function that matches expected name patterns
        expected_patterns = [
            function_name,
            function_name.replace('_', ''),
            function_name.replace('_', ' '),
            'solution', 'solve', 'main_function'
        ]
        
        # Add problem-specific patterns
        if function_name == "square_root_sum":
            expected_patterns.extend(['squareRootSum', 'sqrt_sum', 'calculate_sum', 'sum_sqrt'])
        elif function_name == "two_sum":
            expected_patterns.extend(['twoSum', 'find_two_sum', 'two_sum_indices'])
        elif function_name == "find_max":
            expected_patterns.extend(['findMax', 'find_maximum', 'max_element'])
        elif function_name == "is_palindrome":
            expected_patterns.extend(['isPalindrome', 'check_palindrome'])
        
        for i, func_name, func_line in user_functions:
            for pattern in expected_patterns:
                if func_name.lower() == pattern.lower():
                    func_start = i
                    chosen_function = func_name
                    print(f"🎯 Matched function '{func_name}' with pattern '{pattern}'")
                    break
            if func_start != -1:
                break
        
        # Priority 2: If no match, take the first function
        if func_start == -1:
            func_start, chosen_function, func_line = user_functions[0]
            print(f"🔄 No exact match, using first function: {chosen_function}")
        
        # Find function end
        func_end = len(lines)
        indent_level = len(lines[func_start]) - len(lines[func_start].lstrip())
        
        for i in range(func_start + 1, len(lines)):
            line = lines[i]
            if line.strip() and (len(line) - len(line.lstrip())) <= indent_level:
                if line.strip().startswith(('def ', 'class ', 'if __name__')):
                    func_end = i
                    break
        
        # Extract just the function body
        function_body = '\n'.join(lines[func_start:func_end])
        
        # Combine imports with function
        if imports:
            extracted_function = '\n'.join(imports) + '\n\n' + function_body
            print(f"✅ Extracted function '{chosen_function}' with imports: {len(extracted_function)} chars")
        else:
            extracted_function = function_body
            print(f"✅ Extracted function '{chosen_function}' (no imports found): {len(extracted_function)} chars")
        
        return extracted_function

    def _get_actual_function_name(self, user_function: str) -> Optional[str]:
        """Extract the actual function name from user code"""
        lines = user_function.strip().split('\n')
        
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith("def "):
                # Extract function name: "def function_name(" -> "function_name"
                try:
                    func_def = line_stripped[4:]  # Remove "def "
                    func_name = func_def.split('(')[0].strip()
                    return func_name
                except:
                    continue
        
        return None

    async def _run_single_test(
        self,
        user_function: str,
        template: Dict[str, Any],
        test_case: Dict[str, Any]
    ) -> Any:
        """Run a single test case with automatic parameter detection"""
        
        # Extract actual function name from user code
        actual_function_name = self._get_actual_function_name(user_function)
        if not actual_function_name:
            actual_function_name = template['function_name']  # fallback
        
        # Create complete test file with smart argument handling
        test_code = f"""
import inspect
import sys
{user_function}

# Universal test execution
if __name__ == "__main__":
    try:
        # Get test input - FIXED: don't wrap in extra list
        test_input = {repr(test_case['input'])}
        
        # Get function object
        user_func = globals()['{actual_function_name}']
        
        # Inspect function signature
        sig = inspect.signature(user_func)
        param_count = len(sig.parameters)
        
        print(f"Debug: Function '{actual_function_name}' expects {{param_count}} parameters", file=sys.stderr)
        print(f"Debug: Test input: {{repr(test_input)}}", file=sys.stderr)
        print(f"Debug: Function signature: {{sig}}", file=sys.stderr)
        
        # Smart argument passing with proper handling
        if param_count == 0:
            # No parameters
            result = user_func()
        elif param_count == 1:
            # Single parameter - smart unwrapping for nested lists
            if isinstance(test_input, list) and len(test_input) == 1 and not isinstance(test_input[0], str):
                # Likely a single argument wrapped in a list - unwrap it
                actual_input = test_input[0]
                print(f"Debug: Unwrapping single argument: {{test_input}} -> {{actual_input}}", file=sys.stderr)
                result = user_func(actual_input)
            else:
                # Pass the value directly
                result = user_func(test_input)
        else:
            # Multiple parameters - test_input should be a list/tuple
            if isinstance(test_input, (list, tuple)):
                if len(test_input) >= param_count:
                    # Pass first N arguments
                    result = user_func(*test_input[:param_count])
                else:
                    # Not enough arguments
                    raise ValueError(f"Not enough arguments: need {{param_count}}, got {{len(test_input)}}")
            else:
                # Single value for multiple params - this is unusual, raise error
                raise ValueError(f"Function expects {{param_count}} parameters but got single value: {{test_input}}")
        
        print(repr(result))
        
    except Exception as e:
        print(f"ERROR: {{str(e)}}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
"""
        
        # Write to temp file and execute
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(test_code)
            temp_file = f.name
        
        try:
            process = await asyncio.create_subprocess_exec(
                'python3', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout_seconds
            )
            
            output = stdout.decode().strip()
            error = stderr.decode().strip()
            
            if process.returncode != 0:
                raise Exception(f"Execution failed: {error}")
            
            if output.startswith("ERROR:"):
                raise Exception(output[6:])  # Remove "ERROR:" prefix
            
            # Parse result
            try:
                return eval(output)
            except:
                return output
                
        finally:
            os.unlink(temp_file)

    def _compare_results(self, actual: Any, expected: Any) -> bool:
        """Compare actual and expected results with smart tolerance"""
        
        # Handle None cases
        if actual is None and expected is None:
            return True
        if actual is None or expected is None:
            return False
        
        # Exact match
        if actual == expected:
            return True
        
        # Numeric comparison with tolerance
        if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
            # Smart tolerance based on the magnitude of numbers
            if isinstance(expected, int):
                # For integers, use dynamic tolerance based on magnitude
                if abs(expected) <= 100:
                    tolerance = 1  # Small numbers: ±1
                elif abs(expected) <= 10000:
                    tolerance = 2  # Medium numbers: ±2  
                elif abs(expected) <= 1000000:
                    tolerance = int(abs(expected) * 0.0001)  # Large numbers: 0.01% tolerance
                else:
                    tolerance = int(abs(expected) * 0.001)   # Very large numbers: 0.1% tolerance
                
                is_close = abs(actual - expected) <= tolerance
                if not is_close:
                    print(f"🔍 Tolerance check: |{actual} - {expected}| = {abs(actual - expected)} > {tolerance}")
                return is_close
            else:
                return abs(actual - expected) <= 1e-6
        
        # String comparison (case insensitive for booleans)
        if isinstance(actual, str) and isinstance(expected, str):
            return actual.lower() == expected.lower()
        
        # List comparison
        if isinstance(actual, list) and isinstance(expected, list):
            if len(actual) != len(expected):
                return False
            return all(self._compare_results(a, e) for a, e in zip(actual, expected))
        
        return False


# Global instance
leetcode_runner = LeetCodeRunner() 