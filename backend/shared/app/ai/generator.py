import os
import json
import asyncio
import uuid
from openai import AsyncAzureOpenAI, NotGiven
from pydantic import BaseModel, Field, RootModel, field_validator, ValidationError
from typing import List, Dict, Any, Union, Optional
import logging
import re
from fastapi import HTTPException

from ..code_runner import execute_code, SubmissionParams
from ..config import settings

logger = logging.getLogger(__name__)

def _create_slug(title: str) -> str:
    """Creates a URL-friendly slug from a title."""
    # Convert to lowercase
    slug = title.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'\s+', '-', slug)
    # Remove any characters that are not alphanumeric or hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug

def get_language_id(language: str) -> int:
    """Get Judge0 language ID for the given language"""
    language_ids = {
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
    return language_ids.get(language.lower(), 71)  # Default to Python

def create_language_wrapper(language: str, function_name: str) -> str:
    """Create language-specific wrapper for testing solutions using LeetCode-style approach"""
    from .language_templates import get_language_template
    
    template = get_language_template(language)
    # For now, we'll use a simplified approach, but this can be extended
    # to use the full template system
    
    if language.lower() == "python":
        return f"""
import sys
import ast
import json

# User's solution is above this line
try:
    input_str = sys.stdin.read().strip()
    if input_str:
        parsed_input = ast.literal_eval(input_str)
        
        try:
            # First try: pass input as single argument (most common for algorithms)
            result = {function_name}(parsed_input)
        except TypeError:
            # If that fails and input is a list/tuple, try unpacking
            if isinstance(parsed_input, (list, tuple)) and len(parsed_input) > 1:
                result = {function_name}(*parsed_input)
            else:
                raise
            
        if result is not None:
            # Format output similar to LeetCode
            if isinstance(result, (list, dict)):
                print(json.dumps(result))
            else:
                print(result)

except Exception as e:
    import traceback
    print(f"Execution Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
"""
    
    elif language.lower() in ["javascript", "typescript"]:
        return f"""
// LeetCode-style JavaScript runner
{function_name} = {function_name} || function() {{ return null; }};

let input = '';
process.stdin.on('data', (chunk) => {{
    input += chunk;
}});

process.stdin.on('end', () => {{
    try {{
        const trimmedInput = input.trim();
        if (trimmedInput) {{
            // Convert Python-style input to JavaScript
            let testInput = trimmedInput;
            
            // Handle Python tuples -> arrays
            if (testInput.startsWith('(') && testInput.endsWith(')')) {{
                testInput = '[' + testInput.slice(1, -1) + ']';
            }}
            
            // Handle Python literals
            testInput = testInput.replace(/None/g, 'null')
                               .replace(/True/g, 'true')
                               .replace(/False/g, 'false')
                               .replace(/'/g, '"');
            
            const parsedInput = JSON.parse(testInput);
            
            // Check if function exists
            if (typeof {function_name} !== 'function') {{
                console.error('EXECUTION_ERROR: Function {function_name} is not defined');
                return;
            }}
            
            // Validate input
            if (!Array.isArray(parsedInput)) {{
                console.error('EXECUTION_ERROR: Expected array input, got:', typeof parsedInput);
                return;
            }}
            
            // Call function (for algorithm problems, pass array directly)
            const result = {function_name}(parsedInput);
            
            // Validate and format result
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
        }}
    }} catch (error) {{
        console.error('Error:', error.message);
    }}
}});
"""
    
    elif language.lower() == "java":
        return f"""
import java.util.*;
import java.io.*;
import com.google.gson.*;

// User's solution class should be above this line

public class Main {{
    public static void main(String[] args) {{
        try {{
            Scanner scanner = new Scanner(System.in);
            String input = scanner.nextLine().trim();
            
            if (!input.isEmpty()) {{
                Gson gson = new Gson();
                Object[] testData = gson.fromJson(input, Object[].class);
                
                // This would need dynamic generation based on function signature
                // For now, simplified approach
                System.out.println("Java execution not fully implemented");
            }}
        }} catch (Exception e) {{
            System.err.println("Execution Error: " + e.getMessage());
        }}
    }}
}}
"""
    
    else:
        # For other languages, use Python wrapper as fallback
        return f"""
import sys
import ast
import json

try:
    input_str = sys.stdin.read().strip()
    if input_str:
        parsed_input = ast.literal_eval(input_str)
        
        try:
            # First try: pass input as single argument (most common for algorithms)
            result = {function_name}(parsed_input)
        except TypeError:
            # If that fails and input is a list/tuple, try unpacking
            if isinstance(parsed_input, (list, tuple)) and len(parsed_input) > 1:
                result = {function_name}(*parsed_input)
            else:
                raise
            
        if result is not None:
            if isinstance(result, (list, dict)):
                print(json.dumps(result))
            else:
                print(result)

except Exception as e:
    import traceback
    print(f"Execution Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
"""

# It's good practice to initialize the client once and reuse it.
if not all([settings.AZURE_OPENAI_ENDPOINT, settings.AZURE_OPENAI_API_KEY]):
    logger.warning("Azure OpenAI settings are not fully configured. AI generator will not be available.")
    _openai_client = None
else:
    _openai_client = AsyncAzureOpenAI(
        api_version=settings.AZURE_OPENAI_API_VERSION,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_key=settings.AZURE_OPENAI_API_KEY,
    )

class CustomAIDuelSettings(BaseModel):
    category: str
    theme: str
    difficulty: str
    language: str

class GeneratorInvalidResponse(Exception):
    """Custom exception for invalid responses from the AI problem generator."""
    pass

class AIGeneratorClient:
    def __init__(self, client: Optional[AsyncAzureOpenAI]):
        self._client = client

    async def generate(self, prompt: str, response_format: Optional[Dict[str, str]] = None) -> Any:
        if not self._client:
            logger.error("Azure OpenAI client is not configured. Cannot generate content.")
            raise GeneratorInvalidResponse("AI service is not configured on the server.")
        try:
            # Ensure re is available in this scope, although it should be global
            import re
            completion = await self._client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": "You are an expert AI assistant that generates structured JSON output."},
                    {"role": "user", "content": prompt}
                ],
                response_format=response_format if response_format else NotGiven,
                temperature=0.7
            )
            response_content = completion.choices[0].message.content
            if not response_content:
                raise GeneratorInvalidResponse("Empty response from AI generator.")
            
            # Extract JSON from markdown if present
            json_match = re.search(r"```json\s*([\s\S]*?)\s*```", response_content)
            if json_match:
                json_string = json_match.group(1)
            else:
                json_string = response_content # Assume it's pure JSON if no markdown wrapper

            # Attempt to parse JSON to ensure validity
            parsed_response = json.loads(json_string)
            
            # Return the parsed response directly; caller will validate its structure (list/dict)
            return parsed_response
        except json.JSONDecodeError as e:
            logger.error(f"AI response was not valid JSON: {json_string}. Error: {e}")
            raise GeneratorInvalidResponse(f"AI response was not valid JSON: {e}")
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise GeneratorInvalidResponse(f"Error calling OpenAI API: {e}")

generator_client = AIGeneratorClient(_openai_client)

class TestCase(BaseModel):
    input_data: str
    expected_output: str
    explanation: str
    is_public: bool = False
    is_correct: Optional[bool] = None

class CodeTemplate(BaseModel):
    language: str
    template_code: str

class GeneratedProblem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique identifier for the problem.")
    title: str = Field(..., description="A clear, descriptive title for the problem (e.g., 'Two Sum', 'Reverse a Linked List').")
    slug: str = Field(..., description="A URL-friendly slug for the problem (e.g., 'two-sum', 'reverse-linked-list').")
    description: str = Field(..., description="A detailed explanation of the problem, including input/output formats and constraints.")
    difficulty: str = Field(..., description="The difficulty of the problem (e.g., 'Easy', 'Medium', 'Hard').")
    solution: str = Field(..., description="The complete, correct Python solution for the problem. Must contain only the function definition(s).")
    code_templates: List[CodeTemplate] = Field(..., description="A list of code templates for different languages.")
    function_name: str = Field(..., description="The name of the main function to be tested (e.g., 'solve_problem').")
    test_cases: List[TestCase] = Field(..., description="A list of test cases to validate the solution.")
    time_limit_ms: int = 2000
    memory_limit_mb: int = 128



def generate_algorithm_problem_prompt(theme: str, difficulty: str, language: str) -> str:
    """Generate prompt for algorithmic programming problems"""
    
    output_format = {
        "title": "string - Short, descriptive title",
        "description": "string - Detailed problem description with examples",
        "difficulty": "string - easy, medium, or hard",
        "solution": f"string - The complete, correct {language} solution code",
        "test_cases": [
            {
                "input_data": "string - Input for the test case",
                "expected_output": "string - Expected output",
                "explanation": "string - Brief explanation of the test case"
            }
        ],
        "code_templates": [
            {
                "language": "string - Programming language",
                "template_code": "string - Complete code template that reads input, calls function, and prints output"
            }
        ],
        "time_limit_ms": "integer - Time limit in milliseconds (default 2000)",
        "memory_limit_mb": "integer - Memory limit in MB (default 128)"
    }
    
    prompt = f"""
    Generate a competitive programming problem for a real-time coding duel.
    
    Theme: {theme}
    Difficulty: {difficulty}
    Primary Language: {language}
    
    Requirements:
    1. Create a high-quality, solvable, and interesting problem suitable for competitive programming.
    2. Provide a COMPLETE and **100% CORRECT** solution in the `solution` field for {language}. This field must contain **ONLY** the function/method definition(s) required to solve the problem, with no top-level script, example calls, or output statements.
    3. The `code_templates` field should contain ONLY the function signature with the EXACT same function name as in your solution. Users will implement the body but cannot change the function name.
    4. **MANDATORY**: Include exactly 10-15 diverse and comprehensive test cases, including edge cases, boundary conditions, and stress tests.
    5. **CRITICAL**: For each test case, the `expected_output` MUST be the result of running your provided `solution` code with the `input_data`. You must verify this yourself. Double-check for correctness. Do not include incorrect test cases.
    6. **FUNCTION NAME CONSISTENCY**: The function name in `code_templates` MUST exactly match the function name in `solution`. This is critical for the system to work properly.
    7. Provide code templates for {language} and optionally other languages.
    7. Make sure the problem can be solved in under 5-10 minutes for the given difficulty.
    8. Include proper function signatures, clear variable names, and a detailed description with examples and constraints.
    
    TEST CASES REQUIREMENTS:
    - **CRITICAL**: The `input_data` for each test case must be a string that can be parsed by Python's `ast.literal_eval`. The solution function will receive the parsed object as an argument.
    - For example, if the function expects a list of integers, `input_data` MUST be a string literal like `"[1, 2, 3]"`.
    - If the function expects a string, `input_data` MUST be a quoted string literal like `"'hello'"`.
    - If the function takes multiple arguments, they MUST be provided in a tuple literal, e.g., `"(1, 'a', [2, 3])"`. A list `"[1, 'a', [2, 3]]"` is INCORRECT and will cause the test to fail.
    - Generate 10-15 test cases total.
    - Include basic examples, edge cases (empty inputs, single elements), boundary conditions, and performance tests.
    - Ensure comprehensive coverage of the problem space.
    
    IMPORTANT CODE TEMPLATE REQUIREMENTS:
    - The `code_templates` must contain the EXACT function signature that users will implement. Users should NOT be able to change the function name.
    - The function body should contain only a 'TODO' comment and placeholder return statement.
    - The function name MUST match exactly with the `solution` field function name.
    
    Language-specific template examples (use the EXACT function name from your solution):
    - Python: `def your_function_name(params):\n    # TODO: Implement your solution here\n    pass`
    - JavaScript: `function yourFunctionName(params) {{\n    // TODO: Implement your solution here\n    return null;\n}}`
    - Java: `public static ReturnType yourFunctionName(ParamType params) {{\n    // TODO: Implement your solution here\n    return null;\n}}`
    - C++: `ReturnType yourFunctionName(ParamType params) {{\n    // TODO: Implement your solution here\n    return ReturnType();\n}}`

    CRITICAL: The function name in the template MUST be identical to the function name in your solution.
    The `solution` field must contain ONLY the raw function definition(s) for {language}.
    
    **Verification Step (Internal Monologue for you, the AI):**
    - "After generating the solution and test cases, I will mentally (or actually) run the solution against each input to confirm the output is correct. For `[4, 4, 4]`, the subarrays are [4], [4], [4], [4,4], [4,4], [4,4,4]. The maxes are 4, 4, 4, 4, 4, 4. The sum is 24. My `expected_output` for this test case must be '24'."
    
    Difficulty guidelines:
    - Easy: Basic loops, conditionals, simple data structures (10-12 test cases)
    - Medium: Arrays, strings, basic algorithms, simple math (12-14 test cases)
    - Hard: Complex algorithms, dynamic programming, graph theory (14-15 test cases)
    
    The output must be a single, valid JSON object. Do not include any text outside the JSON.
    
    JSON Structure:
    {json.dumps(output_format, indent=2)}
    """
    return prompt

def generate_sql_problem_prompt(theme: str, difficulty: str) -> str:
    """
    Generates a prompt for the AI to create a SQL problem.
    """
    return f"""
Please generate a SQL problem for a competitive programming platform.
The problem should be about '{theme}' and have a difficulty of '{difficulty}'.
The output must be a JSON object with the following fields:
- "title": A short, descriptive title for the problem.
- "description": A detailed description of the problem, including the schema of the tables involved.
- "solution": The correct SQL query that solves the problem.
- "test_cases": A JSON array of test cases. Each test case should be an object with "setup_sql" and "expected_output".
  - "setup_sql": The SQL statements to create and populate the tables for the test case.
  - "expected_output": The expected result of the solution query, as a JSON array of objects.
"""

async def generate_algorithm_problem(theme: str, difficulty: str, language: str = "python") -> GeneratedProblem:
    """
    Generates a new algorithmic problem using AI for competitive programming duels.
    This function now also self-corrects the test cases by running the generated solution.
    """
    # Keep this import here as well for maximal safety, given the previous error.
    import re
    prompt = generate_algorithm_problem_prompt(theme, difficulty, language)
    
    try:
        response_json = await generator_client.generate(prompt, response_format={"type": "json_object"})
        
        # Extract function name from the generated solution before validation
        function_name = None
        solution_code = response_json.get("solution", "")
        
        # Language-specific function name extraction patterns
        patterns = {
            "python": r"def\s+(\w+)\s*\(",
            "javascript": r"function\s+(\w+)\s*\(",
            "typescript": r"function\s+(\w+)\s*\(",
            "java": r"(?:public\s+)?(?:static\s+)?\w+\s+(\w+)\s*\(",
            "cpp": r"\w+\s+(\w+)\s*\(",
            "c": r"\w+\s+(\w+)\s*\(",
            "go": r"func\s+(\w+)\s*\(",
            "rust": r"fn\s+(\w+)\s*\(",
            "sql": r"" # SQL doesn't have functions in the same way
        }
        
        if language.lower() == "sql":
            # For SQL, we don't have a function name, so use a default
            function_name = "sql_query"
        else:
            pattern = patterns.get(language.lower(), r"(\w+)\s*\(")
            if pattern:
                match = re.search(pattern, solution_code)
                if match:
                    function_name = match.group(1)
                else:
                    # If we can't extract function name, this is an invalid response
                    logger.error(f"Could not extract function name from {language} solution: {solution_code}")
                    raise GeneratorInvalidResponse(f"Generated solution does not contain a valid {language} function definition")
        
        # Add the extracted function name and a generated slug to the response data
        response_json['function_name'] = function_name
        if response_json.get("title"):
            response_json['slug'] = _create_slug(response_json['title'])


        # Validate the parsed JSON against our Pydantic model
        problem = GeneratedProblem(**response_json)
        
        # Self-correction step: Run the generated solution against the generated inputs
        # to create a ground-truth for expected outputs.
        logger.info(f"Self-correcting test cases for generated problem: {problem.title}")
        
        # Find function name for wrapper
        if not function_name:
            logger.warning(f"Could not determine function name for self-correction. Skipping.")
            return problem # Or handle as an error
            
        # Create language-specific wrapper
        wrapper = create_language_wrapper(language, function_name)
        source_to_run = problem.solution + "\n" + wrapper

        validation_successful = True
        corrected_test_cases = []

        for i, test_case in enumerate(problem.test_cases):
            # Prepare input data based on language
            if language.lower() in ["javascript", "typescript"]:
                # For JavaScript, convert Python-style input to JSON
                input_str = str(test_case.input_data)
                # Convert Python literals to JSON
                import ast
                try:
                    # Parse Python literal and convert to JSON
                    python_obj = ast.literal_eval(input_str)
                    import json
                    stdin_to_run = json.dumps(python_obj)
                except:
                    # Fallback to original string
                    stdin_to_run = input_str
            else:
                # For Python and other languages, use original format
                stdin_to_run = str(test_case.input_data)
            
            logger.info(f"Running solution against test case {i+1} input: {stdin_to_run}")
            logger.info(f"Language: {language}, Language ID: {get_language_id(language)}")

            # Get the correct language_id for the language
            language_id = get_language_id(language)
            
            params = SubmissionParams(
                source_code=source_to_run,
                language_id=language_id,
                stdin=stdin_to_run,
                expected_output=None,
                cpu_time_limit=problem.time_limit_ms / 1000,
                memory_limit=problem.memory_limit_mb * 1024
            )
            
            try:
                result_data = await execute_code(params)
                status_desc = result_data.status.get("description")
                
                # Check for execution errors first
                if status_desc not in ["Accepted", "Wrong Answer"]:
                    logger.error(f"Generated solution failed validation for input '{stdin_to_run}'. Error: {status_desc} - {result_data.stderr or result_data.compile_output}")
                    test_case.is_correct = False
                    validation_successful = False
                else:
                    actual_output = (result_data.stdout or "").strip()
                    expected_output_str = str(test_case.expected_output).strip()

                    if actual_output != expected_output_str:
                        logger.warning(f"Correcting test case {i+1}. Original output: '{expected_output_str}', Corrected output: '{actual_output}'")
                        test_case.expected_output = actual_output
                        test_case.is_correct = True
                    else:
                        test_case.is_correct = True
            
            except Exception as e:
                logger.error(f"An unexpected error occurred during test case validation: {e}", exc_info=True)
                test_case.is_correct = False
                validation_successful = False

            corrected_test_cases.append(test_case)

        problem.test_cases = corrected_test_cases
        
        if validation_successful:
            logger.info("✅ All test cases self-corrected successfully.")
        else:
            logger.warning("⚠️ Validation failed or timed out. Using original test cases from AI generation.")
        
        # Mark some test cases as public
        if problem.test_cases:
            difficulty_str = str(problem.difficulty).lower()
            public_count = 2 if difficulty_str == "easy" else 3
            for i in range(min(public_count, len(problem.test_cases))):
                problem.test_cases[i].is_public = True
        
        return problem
        
    except GeneratorInvalidResponse:
        raise # Re-raise if it's already a known invalid response
    except Exception as e:
        logger.error(f"Failed to generate algorithm problem: {e}")
        raise GeneratorInvalidResponse(f"Failed to generate algorithm problem: {e}")

# Legacy SQL problem generator
class SQLTestCase(BaseModel):
    name: str
    description: str
    verification_query: str

class SQLGeneratedProblem(BaseModel):
    title: str = Field(..., description="A clear, descriptive title for the SQL problem.")
    description: str
    schema_setup_sql: str
    correct_solution_sql: str
    test_cases: List[SQLTestCase]

async def generate_sql_problem(theme: str, difficulty: str) -> SQLGeneratedProblem:
    """
    Generates a new SQL problem using AI.
    """
    prompt = generate_sql_problem_prompt(theme, difficulty)
    
    try:
        response_json = await generator_client.generate(prompt, response_format={"type": "json_object"})
        problem = SQLGeneratedProblem.model_validate(response_json)
        
        # Here, you might want to add a self-correction step for SQL as well.
        # This would involve running the solution query against the test cases' setup_sql
        # and comparing the output. For simplicity, we'll skip this for now.

        return problem
    except (ValidationError, json.JSONDecodeError) as e:
        logger.error(f"Error generating or validating SQL problem: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate a valid SQL problem.")

async def generate_problem(category: str, difficulty: str, topic: str, language: str) -> Union[GeneratedProblem, SQLGeneratedProblem]:
    """
    Generates a problem based on category. This is a dispatcher function.
    """
    if category.lower() == "algorithms":
        return await generate_algorithm_problem(topic, difficulty, language) # topic here maps to theme
    elif category.lower() == "sql":
        return await generate_sql_problem(topic, difficulty)
    else:
        raise ValueError(f"Unsupported problem category: {category}")

# Example of how to use it:
# async def main():
#     try:
#         problem = await generate_problem("sql", "medium", "JOINs with aggregate functions")
#         print(problem.model_dump_json(indent=2))
#     except Exception as e:
#         print(f"Failed to generate problem: {e}")

# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main()) 