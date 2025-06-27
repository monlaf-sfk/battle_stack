"""
Simple code runner without Docker (fallback)
"""
import subprocess
import tempfile
import os
import json
import time
import sys
from typing import List, Dict, Any

from .schemas import TestResult


class SimpleCodeRunner:
    """Simple code runner for local execution (less secure)"""
    
    def __init__(self):
        self.timeout_seconds = 5
        
    async def execute_code(
        self, 
        language: str, 
        user_code: str, 
        test_cases: List[Dict[str, Any]]
    ) -> List[TestResult]:
        """Execute user code locally (Python only for now)"""
        
        if language != "python":
            return [TestResult(
                input_data="",
                expected_output="",
                actual_output="",
                passed=False,
                error=f"Language {language} not supported in simple runner. Only Python is available."
            )]
        
        results = []
        
        for test_case in test_cases:
            try:
                result = await self._run_python_code(user_code, test_case)
                results.append(result)
            except Exception as e:
                results.append(TestResult(
                    input_data=test_case.get("input_data", str(test_case.get("input", ""))),
                    expected_output=test_case.get("expected_output", str(test_case.get("output", ""))),
                    actual_output="",
                    passed=False,
                    error=f"Execution error: {str(e)}"
                ))
        
        return results
    
    async def _run_python_code(self, user_code: str, test_case: Dict[str, Any]) -> TestResult:
        """Run Python code for a single test case using universal smart calling"""
        
        # Handle both old and new test case formats
        input_data = test_case.get("input_data", test_case.get("input", ""))
        expected_output = test_case.get("expected_output", test_case.get("output", ""))
        
        # Create the complete Python script with universal smart calling
        wrapper_code = f'''
import json
import sys
import traceback
import inspect
from typing import List, Any

{user_code}

def main():
    try:
        # Read test input
        input_line = """{json.dumps(input_data)}"""
        input_data = json.loads(input_line)
        
        result = None
        
        # Get all user-defined functions (excluding built-ins and imports)
        user_functions = []
        for name, obj in globals().items():
            if (not name.startswith('_') and 
                callable(obj) and 
                name not in ['main', 'json', 'sys', 'traceback', 'inspect', 'List', 'Any', 'call_function_with_smart_args'] and
                hasattr(obj, '__module__') and obj.__module__ == '__main__'):
                user_functions.append((name, obj))
        
        print(f"Debug: Found user functions: {{[name for name, _ in user_functions]}}", file=sys.stderr)
        
        # Try Solution class first (if exists)
        if 'Solution' in globals():
            try:
                solution = globals()['Solution']()
                solution_methods = [attr for attr in dir(solution) 
                                  if not attr.startswith('_') and callable(getattr(solution, attr))]
                print(f"Debug: Found Solution methods: {{solution_methods}}", file=sys.stderr)
                
                for method_name in solution_methods:
                    method = getattr(solution, method_name)
                    result = call_function_with_smart_args(method, input_data, method_name)
                    if result is not None:
                        break
                        
            except Exception as e:
                print(f"Debug: Solution class attempt failed: {{e}}", file=sys.stderr)
        
        # Try standalone functions
        if result is None:
            for func_name, func in user_functions:
                try:
                    result = call_function_with_smart_args(func, input_data, func_name)
                    if result is not None:
                        print(f"Debug: Successfully called function {{func_name}}", file=sys.stderr)
                        break
                except Exception as e:
                    print(f"Debug: Function {{func_name}} failed: {{e}}", file=sys.stderr)
                    continue
        
        # Output result
        if result is not None:
            print(json.dumps(result))
        else:
            print(f"Debug: No result found. Available functions: {{[name for name, _ in user_functions]}}", file=sys.stderr)
            print(json.dumps("No valid result"))
            
    except Exception as e:
        print(f"Debug: Main execution failed: {{e}}", file=sys.stderr)
        print(json.dumps("Error: " + str(e)))

def call_function_with_smart_args(func, input_data, func_name):
    """
    Smart function caller that tries to match input data to function parameters
    """
    try:
        # Get function signature
        sig = inspect.signature(func)
        params = list(sig.parameters.keys())
        param_count = len(params)
        
        print(f"Debug: Function {{func_name}} has parameters: {{params}}", file=sys.stderr)
        
        # Case 1: No parameters
        if param_count == 0:
            return func()
        
        # Case 2: Single parameter
        elif param_count == 1:
            # If input_data is a dict with one key, pass the value
            if isinstance(input_data, dict) and len(input_data) == 1:
                return func(list(input_data.values())[0])
            # Otherwise pass input_data directly
            else:
                return func(input_data)
        
        # Case 3: Two parameters
        elif param_count == 2:
            if isinstance(input_data, dict):
                # Common two-parameter patterns
                keys = list(input_data.keys())
                
                # Pattern: nums, target (Two Sum)
                if 'nums' in input_data and 'target' in input_data:
                    return func(input_data['nums'], input_data['target'])
                
                # Pattern: arrival, departure (Min Platforms)
                elif 'arrival' in input_data and 'departure' in input_data:
                    return func(input_data['arrival'], input_data['departure'])
                
                # Pattern: arr1, arr2 (Two Arrays)
                elif 'arr1' in input_data and 'arr2' in input_data:
                    return func(input_data['arr1'], input_data['arr2'])
                
                # Generic two-value pattern - use first two values
                elif len(keys) >= 2:
                    return func(input_data[keys[0]], input_data[keys[1]])
                
                # Try parameter name matching
                elif len(keys) == 1:
                    # If single dict value is a list with 2 elements
                    value = list(input_data.values())[0]
                    if isinstance(value, list) and len(value) == 2:
                        return func(value[0], value[1])
                    else:
                        # Try to call with the same argument twice (edge case)
                        return func(value, value)
                        
            elif isinstance(input_data, list) and len(input_data) == 2:
                return func(input_data[0], input_data[1])
        
        # Case 4: Three or more parameters
        elif param_count >= 3:
            if isinstance(input_data, dict):
                # Try to match parameter names with keys
                args = []
                for param in params:
                    if param in input_data:
                        args.append(input_data[param])
                    else:
                        # Try common aliases
                        aliases = {{
                            'arr': ['array', 'nums', 'list'],
                            'array': ['arr', 'nums', 'list'],
                            'nums': ['arr', 'array', 'list'],
                            'target': ['tgt', 'goal'],
                            'n': ['num', 'number'],
                            's': ['str', 'string']
                        }}
                        found = False
                        if param in aliases:
                            for alias in aliases[param]:
                                if alias in input_data:
                                    args.append(input_data[alias])
                                    found = True
                                    break
                        if not found:
                            # Use first available value as fallback
                            if input_data:
                                args.append(list(input_data.values())[0])
                            else:
                                args.append(None)
                
                if len(args) == param_count:
                    return func(*args)
                    
            elif isinstance(input_data, list):
                if len(input_data) >= param_count:
                    return func(*input_data[:param_count])
        
        # Fallback: try **kwargs if function accepts it
        try:
            if isinstance(input_data, dict):
                return func(**input_data)
        except TypeError:
            pass
        
        # Final fallback: try *args
        try:
            if isinstance(input_data, (list, tuple)):
                return func(*input_data)
            else:
                return func(input_data)
        except TypeError:
            pass
            
        return None
        
    except Exception as e:
        print(f"Debug: Smart call failed for {{func_name}}: {{e}}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()
'''
        
        # Write code to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(wrapper_code)
            temp_file = f.name
        
        try:
            start_time = time.time()
            
            # Run the Python script
            process = subprocess.run(
                [sys.executable, temp_file],
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds
            )
            
            end_time = time.time()
            runtime_ms = int((end_time - start_time) * 1000)
            
            if process.returncode == 0:
                actual_output = process.stdout.strip()
                
                # Compare outputs
                try:
                    # Handle various expected output formats
                    if isinstance(expected_output, (int, float, bool)):
                        expected_json = expected_output
                    elif isinstance(expected_output, str):
                        try:
                            expected_json = json.loads(expected_output)
                        except json.JSONDecodeError:
                            expected_json = expected_output.strip()
                    else:
                        expected_json = expected_output
                        
                    actual_json = json.loads(actual_output)
                    passed = expected_json == actual_json
                except (json.JSONDecodeError, ValueError):
                    # Fallback to string comparison
                    passed = str(actual_output).strip() == str(expected_output).strip()
                
                return TestResult(
                    input_data=str(input_data),
                    expected_output=str(expected_output),
                    actual_output=actual_output,
                    passed=passed,
                    runtime_ms=runtime_ms,
                    memory_mb=10.0,  # Estimated
                    error=None
                )
            else:
                error_msg = process.stderr or "Unknown error"
                return TestResult(
                    input_data=str(input_data),
                    expected_output=str(expected_output),
                    actual_output="",
                    passed=False,
                    runtime_ms=runtime_ms,
                    error=f"Runtime error: {error_msg}"
                )
                
        except subprocess.TimeoutExpired:
            return TestResult(
                input_data=str(input_data),
                expected_output=str(expected_output),
                actual_output="",
                passed=False,
                error="Time limit exceeded"
            )
        except Exception as e:
            return TestResult(
                input_data=str(input_data),
                expected_output=str(expected_output),
                actual_output="",
                passed=False,
                error=f"Execution error: {str(e)}"
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file)
            except:
                pass


# Global simple runner instance
simple_runner = SimpleCodeRunner()


async def run_code_simple(language: str, user_code: str, test_cases: List[Dict[str, Any]]) -> List[TestResult]:
    """Convenience function to run code with simple runner"""
    return await simple_runner.execute_code(language, user_code, test_cases) 