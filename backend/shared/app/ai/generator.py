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
        "solution": "string - The complete, correct Python function definition (must start with 'def function_name(...):')",
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
    2. Provide a COMPLETE and **100% CORRECT** solution in the `solution` field. This field must contain **ONLY** the function definition(s) required to solve the problem, with no top-level script, example calls, or `print` statements. The solution MUST start with a valid Python function definition (e.g., "def solve_problem(...):").
    3. The `code_templates` field should contain only boilerplate/starter code with a 'TODO' comment, NOT the solution. It must be a full, runnable script that handles input and output.
    4. **MANDATORY**: Include exactly 10-15 diverse and comprehensive test cases, including edge cases, boundary conditions, and stress tests.
    5. **CRITICAL**: For each test case, the `expected_output` MUST be the result of running your provided `solution` code with the `input_data`. You must verify this yourself. Double-check for correctness. Do not include incorrect test cases.
    6. Provide code templates for at least Python.
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
    - The `code_templates` must contain ONLY the function signature and a 'TODO' comment. It should NOT include any input/output handling (like `input()` or `print()` calls). The system will handle I/O automatically.
    - The function body should be empty or contain a 'pass' statement with a 'TODO' comment.
    - Example Python `template_code`:
      ```python
      def function_name(params):
          # TODO: Implement solution
          pass
      ```

    The `solution` field must contain ONLY the raw function definition(s), like `def my_function(a, b): ...`.
    
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
        if language == "python":
            solution_code = response_json.get("solution", "")
            match = re.search(r"def\s+(\w+)\s*\(", solution_code)
            if match:
                function_name = match.group(1)
            else:
                # If we can't extract function name, this is an invalid response
                logger.error(f"Could not extract function name from solution: {solution_code}")
                raise GeneratorInvalidResponse("Generated solution does not contain a valid Python function definition")
        
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
            
        # Safer I/O wrapper using ast.literal_eval
        wrapper = f"""
import sys
import ast

# User's solution is above this line
try:
    input_str = sys.stdin.read().strip()
    if input_str:
        # Safely parse the input string into a Python object
        # It's expected to be a list or tuple literal, e.g., "[1, 2, 3]" or "('a', 'b')"
        parsed_input = ast.literal_eval(input_str)
        
        # Handle different input patterns by trying to unpack first
        try:
            # This will work for multi-argument functions expecting a tuple or list of arguments
            result = {function_name}(*parsed_input)
        except TypeError:
            # If unpacking fails (e.g., function takes 1 argument but receives many),
            # it's likely a single argument.
            result = {function_name}(parsed_input)
            
        # Print the result to stdout
        if result is not None:
            print(result)

except Exception as e:
    import traceback
    print(f"Execution Error: {{type(e).__name__}}: {{e}}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
"""
        source_to_run = problem.solution + "\n" + wrapper

        validation_successful = True
        corrected_test_cases = []

        for i, test_case in enumerate(problem.test_cases):
            # The input data should be a string literal of the python object
            # e.g., "[1, 2, 3]" for a list
            stdin_to_run = str(test_case.input_data)
            
            logger.info(f"Running solution against test case {i+1} input: {stdin_to_run}")

            params = SubmissionParams(
                source_code=source_to_run,
                language_id=71, # Python
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