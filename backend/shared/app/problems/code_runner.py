"""
Code execution service using Docker containers
"""
import asyncio
import json
import tempfile
import os
import shutil
import time
import signal
import subprocess
import sys
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from contextlib import asynccontextmanager
import inspect

# Try to import Docker - it's optional
try:
    import docker
    from docker.errors import ContainerError, ImageNotFound, APIError
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False

from .schemas import TestResult

# Set up logging
logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Result of code execution"""
    success: bool
    output: str
    error: str
    runtime_ms: int
    memory_mb: float
    exit_code: int


class CodeExecutionResult:
    def __init__(
        self,
        passed: int = 0,
        failed: int = 0,
        total_tests: int = 0,
        execution_time_ms: Optional[int] = None,
        error: Optional[str] = None,
        test_results: Optional[List[Dict]] = None,
        is_solution_correct: bool = False,
        progress_percentage: float = 0.0
    ):
        self.passed = passed
        self.failed = failed
        self.total_tests = total_tests
        self.execution_time_ms = execution_time_ms
        self.error = error
        self.test_results = test_results or []
        self.is_solution_correct = is_solution_correct
        self.progress_percentage = progress_percentage
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "failed": self.failed,
            "total_tests": self.total_tests,
            "execution_time_ms": self.execution_time_ms,
            "error": self.error,
            "test_results": self.test_results,
            "is_solution_correct": self.is_solution_correct,
            "progress_percentage": self.progress_percentage
        }


class CodeRunner:
    """Service for executing user code in secure containers or subprocess"""
    
    def __init__(self):
        self.docker_client = None
        if DOCKER_AVAILABLE:
            try:
                self.docker_client = docker.from_env()
                # Test if Docker is accessible
                self.docker_client.ping()
                logger.info("✅ Docker client initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ Docker not available, falling back to subprocess: {e}")
                self.docker_client = None
        
        self.timeout_seconds = 10  # Maximum execution time
        self.memory_limit = "128m"  # Memory limit for Docker
        
        # Language configurations
        self.language_configs = {
            "python": {
                "image": "python:3.11-alpine",
                "file_extension": ".py",
                "compile_cmd": None,
                "run_cmd": "python /app/solution.py",
                "local_run_cmd": "python3",
                "wrapper_template": self._get_python_wrapper()
            },
            "javascript": {
                "image": "node:18-alpine",
                "file_extension": ".js",
                "compile_cmd": None,
                "run_cmd": "node /app/solution.js",
                "local_run_cmd": "node",
                "wrapper_template": self._get_javascript_wrapper()
            },
            "java": {
                "image": "openjdk:11-alpine",
                "file_extension": ".java",
                "compile_cmd": "javac /app/Solution.java",
                "run_cmd": "java -cp /app Solution",
                "local_run_cmd": "java",
                "wrapper_template": self._get_java_wrapper()
            },
            "cpp": {
                "image": "gcc:11-alpine",
                "file_extension": ".cpp",
                "compile_cmd": "g++ -o /app/solution /app/solution.cpp",
                "run_cmd": "/app/solution",
                "local_run_cmd": "./solution",
                "wrapper_template": self._get_cpp_wrapper()
            }
        }
    
    def _get_python_wrapper(self) -> str:
        return '''import json
import sys
import traceback
import inspect
from typing import List, Any

{user_code}

def main():
    try:
        # Read test input
        input_line = input().strip()
        input_data = json.loads(input_line)
        
        result = None
        
        # Get all user-defined functions (excluding built-ins and imports)
        user_functions = []
        for name, obj in globals().items():
            if (not name.startswith('_') and 
                callable(obj) and 
                name not in ['main', 'json', 'sys', 'traceback', 'inspect', 'List', 'Any'] and
                hasattr(obj, '__module__') and obj.__module__ == '__main__'):
                user_functions.append((name, obj))
        
        print(f"Debug: Found user functions: {[name for name, _ in user_functions]}", file=sys.stderr)
        
        # Try Solution class first (if exists)
        if 'Solution' in globals():
            try:
                solution = globals()['Solution']()
                solution_methods = [attr for attr in dir(solution) 
                                  if not attr.startswith('_') and callable(getattr(solution, attr))]
                print(f"Debug: Found Solution methods: {solution_methods}", file=sys.stderr)
                
                for method_name in solution_methods:
                    method = getattr(solution, method_name)
                    result = call_function_with_smart_args(method, input_data, method_name)
                    if result is not None:
                        break
                        
            except Exception as e:
                print(f"Debug: Solution class attempt failed: {e}", file=sys.stderr)
        
        # Try standalone functions
        if result is None:
            for func_name, func in user_functions:
                try:
                    result = call_function_with_smart_args(func, input_data, func_name)
                    if result is not None:
                        print(f"Debug: Successfully called function {func_name}", file=sys.stderr)
                        break
                except Exception as e:
                    print(f"Debug: Function {func_name} failed: {e}", file=sys.stderr)
                    continue
        
        # Output result
        if result is not None:
            print(json.dumps(result))
        else:
            print(f"Debug: No result found. Available functions: {[name for name, _ in user_functions]}", file=sys.stderr)
            print(json.dumps("No valid result"))
            
    except Exception as e:
        print(f"Debug: Main execution failed: {e}", file=sys.stderr)
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
        
        print(f"Debug: Function {func_name} has parameters: {params}", file=sys.stderr)
        
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
                        aliases = {
                            'arr': ['array', 'nums', 'list'],
                            'array': ['arr', 'nums', 'list'],
                            'nums': ['arr', 'array', 'list'],
                            'target': ['tgt', 'goal'],
                            'n': ['num', 'number'],
                            's': ['str', 'string']
                        }
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
        print(f"Debug: Smart call failed for {func_name}: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    main()
'''
    
    def _get_javascript_wrapper(self) -> str:
        return '''const fs = require('fs');

{user_code}

function main() {
    try {
        // Read test case from stdin
        const input = fs.readFileSync(0, 'utf-8').trim();
        const inputData = JSON.parse(input);
        
        let result;
        
        // Call the appropriate function based on problem
        if (typeof twoSum !== 'undefined') {
            result = twoSum(inputData.nums, inputData.target);
        } else if (typeof isValid !== 'undefined') {
            result = isValid(inputData.s);
        } else if (typeof reverse !== 'undefined') {
            result = reverse(inputData.x);
        } else if (typeof isPalindrome !== 'undefined') {
            result = isPalindrome(inputData.x);
        } else {
            result = "Error: No suitable function found";
        }
        
        // Output result as JSON
        console.log(JSON.stringify(result));
        
    } catch (e) {
        console.log(JSON.stringify({"error": e.message}));
        process.exit(1);
    }
}

main();
'''
    
    def _get_java_wrapper(self) -> str:
        return '''import java.util.*;
import java.io.*;
import com.google.gson.*;

{user_code}

public class Main {
    public static void main(String[] args) {
        try {
            Scanner scanner = new Scanner(System.in);
            String input = scanner.nextLine();
            
            Gson gson = new Gson();
            JsonObject inputData = gson.fromJson(input, JsonObject.class);
            
            Solution solution = new Solution();
            Object result = null;
            
            // Call the appropriate method based on problem
            if (inputData.has("nums") && inputData.has("target")) {
                int[] nums = gson.fromJson(inputData.get("nums"), int[].class);
                int target = inputData.get("target").getAsInt();
                result = solution.twoSum(nums, target);
            } else if (inputData.has("s")) {
                String s = inputData.get("s").getAsString();
                result = solution.isValid(s);
            } else {
                result = "Error: No suitable method found";
            }
            
            System.out.println(gson.toJson(result));
            
        } catch (Exception e) {
            System.out.println("{\\"error\\": \\"" + e.getMessage() + "\\"}");
            System.exit(1);
        }
    }
}
'''
    
    def _get_cpp_wrapper(self) -> str:
        return '''#include <iostream>
#include <vector>
#include <string>
#include <nlohmann/json.hpp>

using namespace std;
using json = nlohmann::json;

{user_code}

int main() {
    try {
        string input_line;
        getline(cin, input_line);
        
        json input_data = json::parse(input_line);
        
        Solution solution;
        json result;
        
        // Call the appropriate method based on problem
        if (input_data.contains("nums") && input_data.contains("target")) {
            vector<int> nums = input_data["nums"];
            int target = input_data["target"];
            result = solution.twoSum(nums, target);
        } else if (input_data.contains("s")) {
            string s = input_data["s"];
            result = solution.isValid(s);
        } else {
            result = "Error: No suitable method found";
        }
        
        cout << result.dump() << endl;
        
    } catch (const exception& e) {
        json error_result = {{"error", e.what()}};
        cout << error_result.dump() << endl;
        return 1;
    }
    
    return 0;
}
'''
    
    async def run_code(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
        timeout_seconds: Optional[int] = None
    ) -> CodeExecutionResult:
        """Run code against test cases and return comprehensive results"""
        print(f"🔧 CodeRunner.run_code() called:")
        print(f"   Language: {language}")
        print(f"   Code length: {len(code)} chars")
        print(f"   Test cases: {len(test_cases)}")
        print(f"   Timeout: {timeout_seconds or self.timeout_seconds}s")
        
        if language not in self.language_configs:
            error_msg = f"Unsupported language: {language}"
            print(f"❌ {error_msg}")
            return CodeExecutionResult(
                error=error_msg,
                total_tests=len(test_cases)
            )
        
        config = self.language_configs[language]
        timeout = timeout_seconds or self.timeout_seconds
        
        passed = 0
        failed = 0
        test_results = []
        total_execution_time = 0
        error_message = None
        
        print(f"🏃 Starting test execution...")
        
        try:
            for i, test_case in enumerate(test_cases):
                # Safely convert input to string for logging
                input_preview = str(test_case.get('input', ''))[:50]
                print(f"🧪 Running test case {i+1}/{len(test_cases)}: {input_preview}...")
                
                if self.docker_client:
                    print(f"🐳 Using Docker execution")
                    result = await self._run_test_docker(config, code, test_case, timeout)
                else:
                    print(f"🐍 Using subprocess execution")
                    result = await self._run_test_subprocess(config, code, test_case, timeout)
                
                print(f"   Result: success={result.success}, output='{result.output[:100]}...', error='{result.error}'")
                
                test_results.append({
                    "test_case": i + 1,
                    "input": test_case.get("input", ""),
                    "expected": test_case.get("output", ""),
                    "actual": result.output,
                    "passed": result.success,
                    "error": result.error if not result.success else None,
                    "execution_time_ms": result.runtime_ms
                })
                
                if result.success:
                    passed += 1
                    print(f"   ✅ Test {i+1} PASSED")
                else:
                    failed += 1
                    if not error_message:  # Capture first error
                        error_message = result.error
                    print(f"   ❌ Test {i+1} FAILED: {result.error}")
                
                total_execution_time += result.runtime_ms
        
        except Exception as e:
            error_message = f"Execution error: {str(e)}"
            failed = len(test_cases)
            total_execution_time = 0
            print(f"💥 Exception during test execution: {e}")
            import traceback
            traceback.print_exc()
        
        total_tests = len(test_cases)
        is_solution_correct = passed == total_tests and total_tests > 0
        progress_percentage = (passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 Final results:")
        print(f"   Passed: {passed}/{total_tests}")
        print(f"   Failed: {failed}")
        print(f"   Is correct: {is_solution_correct}")
        print(f"   Progress: {progress_percentage}%")
        print(f"   Total time: {total_execution_time}ms")
        print(f"   Error: {error_message}")
        
        return CodeExecutionResult(
            passed=passed,
            failed=failed,
            total_tests=total_tests,
            execution_time_ms=total_execution_time,
            error=error_message,
            test_results=test_results,
            is_solution_correct=is_solution_correct,
            progress_percentage=progress_percentage
        )
    
    async def _run_test_docker(
        self,
        config: Dict[str, Any],
        code: str,
        test_case: Dict[str, Any],
        timeout: int
    ) -> ExecutionResult:
        """Run a single test case using Docker"""
        start_time = time.time()
        
        try:
            # Create temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                # Prepare code file - use replace instead of format to avoid issues with curly braces in user code
                wrapped_code = config["wrapper_template"].replace("{user_code}", code)
                code_file = os.path.join(temp_dir, f"solution{config['file_extension']}")
                
                with open(code_file, 'w') as f:
                    f.write(wrapped_code)
                
                # Prepare input
                test_input = self._format_test_input(test_case)
                
                # Run container
                container = self.docker_client.containers.run(
                    config["image"],
                    config["run_cmd"],
                    stdin_open=True,
                    stdout=True,
                    stderr=True,
                    remove=True,
                    detach=True,
                    mem_limit=self.memory_limit,
                    volumes={temp_dir: {'bind': '/app', 'mode': 'ro'}},
                    working_dir='/app'
                )
                
                # Send input and wait for result
                exit_code = container.wait(timeout=timeout)["StatusCode"]
                output = container.logs(stdout=True, stderr=False).decode('utf-8').strip()
                error = container.logs(stdout=False, stderr=True).decode('utf-8').strip()
                
                runtime_ms = int((time.time() - start_time) * 1000)
                
                # Check if output matches expected
                expected = test_case.get("output", "")
                success = self._compare_outputs(output, expected) and exit_code == 0
                
                return ExecutionResult(
                    success=success,
                    output=output,
                    error=error if error else None,
                    runtime_ms=runtime_ms,
                    memory_mb=0.0,  # Docker memory usage would need additional monitoring
                    exit_code=exit_code
                )
        
        except Exception as e:
            runtime_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                success=False,
                output="",
                error=f"Docker execution error: {str(e)}",
                runtime_ms=runtime_ms,
                memory_mb=0.0,
                exit_code=1
            )
    
    async def _run_test_subprocess(
        self,
        config: Dict[str, Any],
        code: str,
        test_case: Dict[str, Any],
        timeout: int
    ) -> ExecutionResult:
        """Run a single test case using subprocess (fallback)"""
        start_time = time.time()
        
        try:
            # Create temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                # Prepare code file - use replace instead of format to avoid issues with curly braces in user code
                wrapped_code = config["wrapper_template"].replace("{user_code}", code)
                code_file = os.path.join(temp_dir, f"solution{config['file_extension']}")
                
                print(f"🐍 Writing code to file: {code_file}")
                print(f"📝 Code preview: {wrapped_code[:200]}...")
                
                with open(code_file, 'w') as f:
                    f.write(wrapped_code)
                
                # Prepare input
                test_input = self._format_test_input(test_case)
                print(f"📨 Test input: {test_input}")
                
                # Determine the command to run
                if config["local_run_cmd"] == "python3":
                    cmd = ["python3", code_file]
                elif config["local_run_cmd"] == "node":
                    cmd = ["node", code_file]
                else:
                    # For compiled languages, we'd need additional compilation step
                    raise NotImplementedError(f"Subprocess execution for {config['local_run_cmd']} not implemented")
                
                print(f"🚀 Running command: {' '.join(cmd)}")
                
                # Run the process
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=temp_dir
                )
                
                try:
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(input=test_input.encode()),
                        timeout=timeout
                    )
                    exit_code = process.returncode
                    print(f"✅ Process completed with exit code: {exit_code}")
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
                    error_msg = f"Execution timed out after {timeout} seconds"
                    print(f"⏰ {error_msg}")
                    raise Exception(error_msg)
                
                runtime_ms = int((time.time() - start_time) * 1000)
                
                output = stdout.decode('utf-8').strip()
                error = stderr.decode('utf-8').strip()
                
                print(f"📤 Raw output: '{output}'")
                print(f"📤 Raw error: '{error}'")
                
                # Check if output matches expected
                expected = test_case.get("output", "")
                
                # Handle JSON error responses in output
                if output.startswith('{"error"'):
                    try:
                        error_obj = json.loads(output)
                        error_message = error_obj.get("error", "Unknown error")
                        print(f"❌ Code returned error: {error_message}")
                        return ExecutionResult(
                            success=False,
                            output="",
                            error=f"Runtime error: {error_message}",
                            runtime_ms=runtime_ms,
                            memory_mb=0.0,
                            exit_code=exit_code
                        )
                    except json.JSONDecodeError:
                        pass
                
                success = self._compare_outputs(output, expected) and exit_code == 0
                
                if success:
                    print(f"✅ Test PASSED: output matches expected")
                else:
                    print(f"❌ Test FAILED: expected='{expected}', actual='{output}', exit_code={exit_code}")
                
                final_error = None
                if not success:
                    if error:
                        final_error = f"Stderr: {error}"
                    elif exit_code != 0:
                        final_error = f"Process exited with code {exit_code}"
                    elif output != expected:
                        final_error = f"Output mismatch: expected '{expected}', got '{output}'"
                    else:
                        final_error = "Unknown error"
                
                return ExecutionResult(
                    success=success,
                    output=output,
                    error=final_error,
                    runtime_ms=runtime_ms,
                    memory_mb=0.0,
                    exit_code=exit_code
                )
        
        except Exception as e:
            runtime_ms = int((time.time() - start_time) * 1000)
            error_msg = f"Subprocess execution error: {str(e)}"
            print(f"💥 {error_msg}")
            import traceback
            traceback.print_exc()
            
            return ExecutionResult(
                success=False,
                output="",
                error=error_msg,
                runtime_ms=runtime_ms,
                memory_mb=0.0,
                exit_code=1
            )
    
    def _format_test_input(self, test_case: Dict[str, Any]) -> str:
        """Format test case input for execution"""
        raw_input = test_case.get("input", "")
        
        print(f"🔧 Original input: '{raw_input}'")
        
        # If input is already a dictionary/object, convert to JSON
        if isinstance(raw_input, dict):
            input_str = json.dumps(raw_input)
            print(f"✅ Converted dict to JSON: {input_str}")
            return input_str
        
        # If input is already a list, convert to JSON
        if isinstance(raw_input, list):
            input_str = json.dumps(raw_input)
            print(f"✅ Converted list to JSON: {input_str}")
            return input_str
        
        # Ensure we have a string to work with
        input_str = str(raw_input)
        
        # Only preprocess mathematical expressions if it's a string that might contain them
        if isinstance(input_str, str) and ('^' in input_str):
            input_str = self._preprocess_mathematical_expressions(input_str)
        
        # If already valid JSON, use it
        try:
            parsed = json.loads(input_str)
            print(f"✅ Already valid JSON: {parsed}")
            return input_str
        except:
            pass
        
        # Handle Two Arrays format: "[1, 2, 3, 4, 5], [3, 4, 5, 6, 7]"
        if "], [" in input_str:
            try:
                # Split by "], ["
                parts = input_str.split("], [")
                if len(parts) == 2:
                    # Reconstruct arrays
                    arr1_str = parts[0] + "]"  # Add back the closing bracket
                    arr2_str = "[" + parts[1]  # Add back the opening bracket
                    
                    # Parse as JSON arrays
                    arr1 = json.loads(arr1_str)
                    arr2 = json.loads(arr2_str)
                    
                    # Create structured input for two-array functions
                    result = json.dumps({"arr1": arr1, "arr2": arr2})
                    print(f"✅ Formatted Two Arrays: {result}")
                    return result
            except Exception as e:
                print(f"❌ Two Arrays format failed: {e}")
        
        # Handle Two Sum format: "[2, 7, 11, 15], 9"
        if "], " in input_str and not "], [" in input_str:
            try:
                parts = input_str.split("], ")
                nums_str = parts[0] + "]"
                target_str = parts[1].strip()
                
                nums = json.loads(nums_str)
                target = int(target_str)
                
                result = json.dumps({"nums": nums, "target": target})
                print(f"✅ Formatted Two Sum: {result}")
                return result
            except Exception as e:
                print(f"❌ Two Sum format failed: {e}")
        
        # Try as simple array: "[1, 2, 3]"
        if input_str.startswith("[") and input_str.endswith("]"):
            try:
                parsed = json.loads(input_str)
                result = json.dumps(parsed)
                print(f"✅ Formatted as array: {result}")
                return result
            except Exception as e:
                print(f"❌ Array format failed: {e}")
        
        # Try as simple string
        try:
            result = json.dumps(input_str)
            print(f"✅ Formatted as string: {result}")
            return result
        except Exception as e:
            print(f"❌ String format failed: {e}")
            return json.dumps({"input": input_str})
    
    def _preprocess_mathematical_expressions(self, input_str: str) -> str:
        """Preprocess mathematical expressions to replace ^ with actual values"""
        import re
        
        # Handle specific cases like -10^9, 10^9
        # Replace -10^9 with -1000000000 and 10^9 with 1000000000
        replacements = {
            r'-10\^9': '-1000000000',
            r'10\^9': '1000000000',
            r'-10\^8': '-100000000', 
            r'10\^8': '100000000',
            r'-10\^7': '-10000000',
            r'10\^7': '10000000',
            r'-10\^6': '-1000000',
            r'10\^6': '1000000',
            r'-10\^5': '-100000',
            r'10\^5': '100000',
            r'-10\^4': '-10000',
            r'10\^4': '10000',
            r'-10\^3': '-1000',
            r'10\^3': '1000',
        }
        
        for pattern, replacement in replacements.items():
            input_str = re.sub(pattern, replacement, input_str)
        
        # Handle more general power expressions like 2^3, 5^2, etc.
        def replace_power(match):
            base = int(match.group(1))
            exponent = int(match.group(2))
            result = base ** exponent
            return str(result)
        
        # Pattern for general power expressions (base^exponent)
        power_pattern = r'(-?\d+)\^(\d+)'
        input_str = re.sub(power_pattern, replace_power, input_str)
        
        print(f"🔧 After preprocessing: '{input_str}'")
        return input_str
    
    def _compare_outputs(self, actual: str, expected: str) -> bool:
        """Compare actual output with expected output"""
        try:
            # Handle JSON error responses
            if actual.startswith('{"error"'):
                return False
                
            # Try to parse actual as JSON
            try:
                actual_json = json.loads(actual)
            except json.JSONDecodeError:
                actual_json = actual.strip()
            
            # Handle error objects
            if isinstance(actual_json, dict) and "error" in actual_json:
                return False
            
            # Handle expected value - it might be int, str, or need JSON parsing
            try:
                if isinstance(expected, (int, float, bool)):
                    # Expected is already a primitive type
                    expected_json = expected
                elif isinstance(expected, str):
                    # Try to parse expected as JSON
                    try:
                        expected_json = json.loads(expected)
                    except json.JSONDecodeError:
                        # If parsing fails, use as string
                        expected_json = expected.strip()
                else:
                    # Expected is already parsed (list, dict, etc.)
                    expected_json = expected
            except Exception:
                # Fallback to string comparison
                expected_json = str(expected).strip()
                
            return actual_json == expected_json
            
        except Exception:
            # Fall back to string comparison
            actual_clean = str(actual).strip() if actual else ""
            expected_clean = str(expected).strip() if expected else ""
            return actual_clean == expected_clean
    
    async def health_check(self) -> bool:
        """Check if the code runner is healthy"""
        try:
            if self.docker_client:
                self.docker_client.ping()
                return True
            else:
                # Check if Python is available for subprocess
                process = await asyncio.create_subprocess_exec(
                    "python3", "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await process.wait()
                return process.returncode == 0
        except Exception:
            return False


# Create a global instance for easy import
code_runner = CodeRunner()


# Legacy function for backward compatibility
async def run_code(language: str, user_code: str, test_cases: List[Dict[str, Any]]) -> List[TestResult]:
    """Legacy function that returns TestResult list format"""
    result = await code_runner.run_code(user_code, language, test_cases)
    
    # Convert to legacy format
    test_results = []
    for test_result in result.test_results:
        test_results.append(TestResult(
            passed=test_result["passed"],
            output=test_result["actual"],
            expected=test_result["expected"],
            error=test_result.get("error"),
            execution_time_ms=test_result["execution_time_ms"]
        ))
    
    return test_results 