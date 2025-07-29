"""
LeetCode-style validation system for multi-language support.
This provides a more robust and scalable approach to code validation.
"""

import json
import ast
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from ..code_runner import execute_code, SubmissionParams

@dataclass
class ValidationResult:
    """Result of code validation"""
    passed: bool
    total_tests: int
    passed_tests: int
    failed_tests: List[Dict[str, Any]]
    execution_time: float = 0.0
    memory_used: int = 0
    error_message: str = ""

class LeetCodeValidator:
    """
    LeetCode-style validator that handles multiple programming languages
    with proper input/output formatting and validation.
    """
    
    # Language ID mapping for Judge0
    LANGUAGE_IDS = {
        "python": 71,      # Python 3.8.1
        "javascript": 63,  # JavaScript (Node.js 12.14.0)
        "typescript": 74,  # TypeScript (3.7.4)
        "java": 62,        # Java (OpenJDK 13.0.1)
        "cpp": 54,         # C++ (GCC 9.2.0)
        "c": 50,           # C (GCC 9.2.0)
        "go": 60,          # Go (1.13.5)
        "rust": 73,        # Rust (1.40.0)
        "sql": 82,         # SQL (SQLite 3.27.2)
    }
    
    def __init__(self):
        pass
    
    def create_test_runner(self, language: str, function_name: str, user_code: str) -> str:
        """Create a test runner for the specific language"""
        
        if language.lower() == "python":
            return f"""
import sys
import json
import ast

{user_code}

def run_test():
    try:
        input_str = sys.stdin.read().strip()
        if not input_str:
            return None
            
        # Parse test input
        test_input = ast.literal_eval(input_str)
        
        # Execute function with smart argument handling
        try:
            # First try: pass input as single argument (most common for algorithm problems)
            result = {function_name}(test_input)
        except TypeError as e:
            # If that fails and input is a list/tuple, try unpacking arguments
            if isinstance(test_input, (list, tuple)) and len(test_input) > 1:
                try:
                    result = {function_name}(*test_input)
                except TypeError:
                    # If both fail, re-raise the original error
                    raise e
            else:
                raise e
        
        # Format output for comparison
        return result
        
    except Exception as e:
        print(f"EXECUTION_ERROR: {{str(e)}}", file=sys.stderr)
        return None

# Run the test
result = run_test()
if result is not None:
    if isinstance(result, (list, dict, tuple)):
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(result)
"""
        
        elif language.lower() in ["javascript", "typescript"]:
            return f"""
{user_code}

// Enhanced JavaScript test runner with better error handling
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {{
    try {{
        const trimmedInput = input.trim();
        if (!trimmedInput) {{
            console.log('null');
            return;
        }}
        
        // Parse test input (convert Python format to JS)
        let testInput = trimmedInput;
        
        // Handle Python tuples -> arrays
        if (testInput.startsWith('(') && testInput.endsWith(')')) {{
            testInput = '[' + testInput.slice(1, -1) + ']';
        }}
        
        // Handle Python literals
        testInput = testInput.replace(/None/g, 'null')
                           .replace(/True/g, 'true')
                           .replace(/False/g, 'false')
                           .replace(/'/g, '"'); // Convert single quotes to double quotes
        
        const parsedInput = JSON.parse(testInput);
        
        // Execute function with proper error handling and validation
        let result;
        try {{
            // Check if function exists
            if (typeof {function_name} !== 'function') {{
                console.error('EXECUTION_ERROR: Function {function_name} is not defined or not a function');
                return;
            }}
            
            // Validate input before calling function
            if (!Array.isArray(parsedInput)) {{
                console.error('EXECUTION_ERROR: Expected array input, got:', typeof parsedInput);
                return;
            }}
            
            // Call the function
            result = {function_name}(parsedInput);
            
            // Validate result
            if (typeof result === 'undefined') {{
                console.error('EXECUTION_ERROR: Function returned undefined');
                return;
            }}
            
        }} catch (funcError) {{
            console.error('EXECUTION_ERROR: Function execution failed:', funcError.message);
            console.error('EXECUTION_ERROR: Stack:', funcError.stack);
            return;
        }}
        
        // Format output with proper handling of different types
        if (result === null) {{
            console.log('null');
        }} else if (result === undefined) {{
            console.log('undefined');
        }} else if (typeof result === 'number') {{
            if (isNaN(result)) {{
                console.error('EXECUTION_ERROR: Function returned NaN');
                return;
            }}
            if (!isFinite(result)) {{
                console.error('EXECUTION_ERROR: Function returned Infinity');
                return;
            }}
            console.log(result.toString());
        }} else if (typeof result === 'boolean') {{
            console.log(result.toString());
        }} else if (typeof result === 'string') {{
            console.log(JSON.stringify(result));
        }} else if (typeof result === 'object') {{
            console.log(JSON.stringify(result));
        }} else {{
            console.log(result.toString());
        }}
        
    }} catch (error) {{
        console.error('EXECUTION_ERROR: Input parsing failed:', error.message);
    }}
}});
"""
        
        else:
            # Fallback to Python for other languages
            return self.create_test_runner("python", function_name, user_code)
    
    def format_test_input(self, language: str, test_input: Any) -> str:
        """Format test input for the specific language"""
        
        if language.lower() in ["javascript", "typescript"]:
            # For JavaScript, convert to clean JSON
            if isinstance(test_input, str):
                try:
                    # Parse Python literal and convert to JSON
                    python_obj = ast.literal_eval(test_input)
                    return json.dumps(python_obj)
                except Exception as e:
                    return test_input
            return json.dumps(test_input)
        
        else:
            # For Python and others, keep original format
            return str(test_input)
    
    def compare_outputs(self, expected: Any, actual: str, language: str) -> bool:
        """Compare expected and actual outputs with language-specific handling"""
        
        try:
            # Clean up actual output
            actual = actual.strip()
            if not actual:
                return expected is None or expected == "" or expected == []
            
            # Handle None/null values
            if actual.lower() in ['none', 'null', 'undefined']:
                return expected is None
            
            # Handle boolean values
            if actual.lower() in ['true', 'false']:
                return expected == (actual.lower() == 'true')
            
            # Handle JSON outputs (arrays, objects)
            if actual.startswith(('[', '{')) or actual.startswith('"'):
                try:
                    actual_parsed = json.loads(actual)
                    return self._deep_compare(expected, actual_parsed)
                except json.JSONDecodeError:
                    pass
            
            # Handle numeric outputs with tolerance for floating point
            try:
                if isinstance(expected, (int, float)):
                    actual_num = float(actual) if '.' in actual else int(actual)
                    if isinstance(expected, float) or isinstance(actual_num, float):
                        # Use small tolerance for floating point comparison
                        return abs(expected - actual_num) < 1e-9
                    return expected == actual_num
            except (ValueError, TypeError):
                pass
            
            # Handle string outputs (with quotes handling)
            if isinstance(expected, str):
                # Remove quotes if present in actual output
                if actual.startswith('"') and actual.endswith('"'):
                    actual = actual[1:-1]
                return expected == actual
            
            # Handle list/array outputs
            if isinstance(expected, list):
                try:
                    if actual.startswith('[') and actual.endswith(']'):
                        actual_list = json.loads(actual)
                    else:
                        # Single value as list
                        actual_list = [actual]
                    return self._deep_compare(expected, actual_list)
                except:
                    pass
            
            # Handle tuple outputs (convert to list for comparison)
            if isinstance(expected, tuple):
                try:
                    actual_parsed = json.loads(actual) if actual.startswith('[') else [actual]
                    return self._deep_compare(list(expected), actual_parsed)
                except:
                    pass
            
            # Fallback: string comparison
            return str(expected).strip() == actual.strip()
            
        except Exception as e:
            print(f"Output comparison error: {e}")
            return False
    
    def _deep_compare(self, obj1: Any, obj2: Any) -> bool:
        """Deep comparison of two objects with type flexibility"""
        
        # Handle None values
        if obj1 is None or obj2 is None:
            return obj1 is obj2
        
        # Handle numeric types with flexibility
        if isinstance(obj1, (int, float)) and isinstance(obj2, (int, float)):
            if isinstance(obj1, float) or isinstance(obj2, float):
                return abs(obj1 - obj2) < 1e-9
            return obj1 == obj2
        
        # Handle string types
        if isinstance(obj1, str) and isinstance(obj2, str):
            return obj1 == obj2
        
        # Handle boolean types
        if isinstance(obj1, bool) and isinstance(obj2, bool):
            return obj1 == obj2
        
        # Handle list/tuple types (with flexibility between list and tuple)
        if isinstance(obj1, (list, tuple)) and isinstance(obj2, (list, tuple)):
            if len(obj1) != len(obj2):
                return False
            return all(self._deep_compare(a, b) for a, b in zip(obj1, obj2))
        
        # Handle dictionary types
        if isinstance(obj1, dict) and isinstance(obj2, dict):
            if set(obj1.keys()) != set(obj2.keys()):
                return False
            return all(self._deep_compare(obj1[k], obj2[k]) for k in obj1.keys())
        
        # Handle set types
        if isinstance(obj1, set) and isinstance(obj2, set):
            return obj1 == obj2
        
        # Handle mixed list/set comparisons (for problems that accept either)
        if isinstance(obj1, (list, set)) and isinstance(obj2, (list, set)):
            return set(obj1) == set(obj2)
        
        # Type mismatch but try string comparison as last resort
        if type(obj1) != type(obj2):
            return str(obj1) == str(obj2)
        
        # Default equality
        return obj1 == obj2
    
    async def validate_solution(
        self, 
        language: str, 
        function_name: str, 
        user_code: str, 
        test_cases: List[Dict[str, Any]],
        time_limit: float = 2.0,
        memory_limit: int = 128000
    ) -> ValidationResult:
        """
        Validate user solution against test cases
        Returns detailed validation result similar to LeetCode
        """
        
        language_id = self.LANGUAGE_IDS.get(language.lower(), 71)
        test_runner = self.create_test_runner(language, function_name, user_code)
        
        passed_tests = 0
        failed_tests = []
        total_execution_time = 0.0
        max_memory_used = 0
        
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get("input_data")
            expected_output = test_case.get("expected_output")
            
            # Format input for the language
            formatted_input = self.format_test_input(language, test_input)
            
            # Execute the test
            params = SubmissionParams(
                source_code=test_runner,
                language_id=language_id,
                stdin=formatted_input,
                expected_output=None,
                cpu_time_limit=time_limit,
                memory_limit=memory_limit
            )
            
            try:
                result = await execute_code(params)
                
                # Track performance metrics
                if result.time:
                    total_execution_time += float(result.time)
                if result.memory:
                    max_memory_used = max(max_memory_used, int(result.memory))
                
                # Check if execution was successful
                status = result.status.get("description", "Unknown")
                
                if status == "Accepted":
                    actual_output = (result.stdout or "").strip()
                    stderr_output = (result.stderr or "").strip()
                    
                    # Check for execution errors in stderr
                    if stderr_output and "EXECUTION_ERROR" in stderr_output:
                        failed_tests.append({
                            "test_case": i + 1,
                            "input": test_input,
                            "expected": expected_output,
                            "actual": actual_output,
                            "error": f"Runtime Error: {stderr_output.replace('EXECUTION_ERROR:', '').strip()}"
                        })
                    # Compare outputs
                    elif self.compare_outputs(expected_output, actual_output, language):
                        passed_tests += 1
                    else:
                        # Provide detailed mismatch information
                        error_detail = self._get_mismatch_detail(expected_output, actual_output)
                        failed_tests.append({
                            "test_case": i + 1,
                            "input": test_input,
                            "expected": expected_output,
                            "actual": actual_output,
                            "error": f"Wrong Answer: {error_detail}"
                        })
                else:
                    # Execution error
                    error_msg = self._format_execution_error(result, status)
                    failed_tests.append({
                        "test_case": i + 1,
                        "input": test_input,
                        "expected": expected_output,
                        "actual": None,
                        "error": error_msg
                    })
                    
            except Exception as e:
                failed_tests.append({
                    "test_case": i + 1,
                    "input": test_input,
                    "expected": expected_output,
                    "actual": None,
                    "error": f"System Error: {str(e)}"
                })
        
        # Record performance metrics
        from .performance_metrics import performance_tracker
        
        performance_metrics = performance_tracker.record_execution(
            language=language,
            execution_time=total_execution_time,
            memory_usage=max_memory_used,
            test_cases_passed=passed_tests,
            test_cases_total=len(test_cases)
        )
        
        return ValidationResult(
            passed=len(failed_tests) == 0,
            total_tests=len(test_cases),
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            execution_time=total_execution_time,
            memory_used=max_memory_used,
            error_message="" if len(failed_tests) == 0 else f"{len(failed_tests)} test(s) failed"
        )
    
    def _get_mismatch_detail(self, expected: Any, actual: str) -> str:
        """Get detailed information about output mismatch"""
        try:
            if not actual:
                return "No output produced"
            
            # Try to parse actual output for better comparison
            try:
                actual_parsed = json.loads(actual)
                if isinstance(expected, list) and isinstance(actual_parsed, list):
                    if len(expected) != len(actual_parsed):
                        return f"Length mismatch: expected {len(expected)}, got {len(actual_parsed)}"
                    else:
                        for i, (exp, act) in enumerate(zip(expected, actual_parsed)):
                            if exp != act:
                                return f"Element {i} differs: expected {exp}, got {act}"
                elif isinstance(expected, dict) and isinstance(actual_parsed, dict):
                    missing_keys = set(expected.keys()) - set(actual_parsed.keys())
                    extra_keys = set(actual_parsed.keys()) - set(expected.keys())
                    if missing_keys:
                        return f"Missing keys: {missing_keys}"
                    if extra_keys:
                        return f"Extra keys: {extra_keys}"
                    for key in expected.keys():
                        if expected[key] != actual_parsed.get(key):
                            return f"Key '{key}' differs: expected {expected[key]}, got {actual_parsed.get(key)}"
            except:
                pass
            
            return f"Expected {expected}, got {actual}"
            
        except Exception:
            return f"Expected {expected}, got {actual}"
    
    def _format_execution_error(self, result: Any, status: str) -> str:
        """Format execution error message for better readability"""
        error_parts = []
        
        if status and status != "Accepted":
            error_parts.append(f"Status: {status}")
        
        if result.stderr:
            stderr = result.stderr.strip()
            # Clean up common error patterns
            if "Traceback" in stderr:
                # Extract the actual error from Python traceback
                lines = stderr.split('\n')
                for line in reversed(lines):
                    if line.strip() and not line.startswith(' '):
                        error_parts.append(f"Error: {line.strip()}")
                        break
            else:
                error_parts.append(f"Error: {stderr}")
        
        if result.compile_output:
            error_parts.append(f"Compile Error: {result.compile_output.strip()}")
        
        return " | ".join(error_parts) if error_parts else f"Unknown error (Status: {status})"

# Global validator instance
leetcode_validator = LeetCodeValidator()