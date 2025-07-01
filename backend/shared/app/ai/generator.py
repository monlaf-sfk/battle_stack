import os
import json
import asyncio
import uuid
from openai import OpenAI
from pydantic import BaseModel, Field, RootModel, field_validator
from typing import List, Dict, Any, Union
import logging

from shared.app.code_runner import execute_code, SubmissionParams

# It's good practice to initialize the client once and reuse it.
# The API key will be read from the OPENAI_API_KEY environment variable.
client = OpenAI()
logger = logging.getLogger(__name__)

class TestCase(BaseModel):
    input_data: str
    expected_output: str
    explanation: str
    is_public: bool = False

class CodeTemplate(BaseModel):
    language: str
    template_code: str

class GeneratedProblem(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    title: str
    description: str
    difficulty: str
    solution: str = Field(..., description="The complete, correct solution code for the problem.")
    test_cases: List[TestCase]
    code_templates: List[CodeTemplate]
    time_limit_ms: int = 2000
    memory_limit_mb: int = 128

def generate_algorithm_problem_prompt(theme: str, difficulty: str, language: str) -> str:
    """Generate prompt for algorithmic programming problems"""
    
    output_format = {
        "title": "string - Short, descriptive title",
        "description": "string - Detailed problem description with examples",
        "difficulty": "string - easy, medium, or hard",
        "solution": "string - The complete, correct solution code for the problem.",
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
    2. Provide a COMPLETE and **100% CORRECT** solution in the `solution` field. This field must contain **ONLY** the function definition(s) required to solve the problem, with no top-level script, example calls, or `print` statements.
    3. The `code_templates` field should contain only boilerplate/starter code with a 'TODO' comment, NOT the solution. It must be a full, runnable script that handles input and output.
    4. Include 3-5 diverse and effective test cases, including edge cases.
    5. **CRITICAL**: For each test case, the `expected_output` MUST be the result of running your provided `solution` code with the `input_data`. You must verify this yourself. Double-check for correctness. Do not include incorrect test cases.
    6. Provide code templates for at least Python.
    7. Make sure the problem can be solved in under 5-10 minutes for the given difficulty.
    8. Include proper function signatures, clear variable names, and a detailed description with examples and constraints.
    
    IMPORTANT CODE TEMPLATE REQUIREMENTS:
    - The `code_templates` must be BOILERPLATE ONLY. It should define the function signature and a simple I/O wrapper.
    - The function body should be empty or contain a 'pass' statement with a 'TODO' comment.
    - Example Python `template_code`:
      ```python
      def function_name(params):
          # TODO: Implement solution
          pass
      
      # Read input and call function
      input_data = eval(input())
      result = function_name(input_data)
      print(result)
      ```

    The `solution` field must contain ONLY the raw function definition(s), like `def my_function(a, b): ...`.
    
    **Verification Step (Internal Monologue for you, the AI):**
    - "After generating the solution and test cases, I will mentally (or actually) run the solution against each input to confirm the output is correct. For `[4, 4, 4]`, the subarrays are [4], [4], [4], [4,4], [4,4], [4,4,4]. The maxes are 4, 4, 4, 4, 4, 4. The sum is 24. My `expected_output` for this test case must be '24'."
    
    Difficulty guidelines:
    - Easy: Basic loops, conditionals, simple data structures
    - Medium: Arrays, strings, basic algorithms, simple math
    - Hard: Complex algorithms, dynamic programming, graph theory
    
    The output must be a single, valid JSON object. Do not include any text outside the JSON.
    
    JSON Structure:
    {json.dumps(output_format, indent=2)}
    """
    return prompt

def generate_sql_problem_prompt(category: str, difficulty: str, topic: str) -> str:
    """Generate prompt for SQL problems (legacy)"""
    output_format = {
        "task_description": "string",
        "schema_setup_sql": "string",
        "correct_solution_sql": "string",
        "test_cases": [
            {
                "name": "string",
                "description": "string",
                "verification_query": "string"
            }
        ]
    }
    
    prompt = f"""
    Generate a SQL programming problem for a competitive programming platform.
    
    Category: {category}
    Difficulty: {difficulty}
    Topic: {topic}
    
    The output must be a single, valid JSON object that conforms to the following structure.
    Do not include any text, explanations, or code formatting outside of the JSON object.
    
    JSON Structure:
    {json.dumps(output_format, indent=2)}
    """
    return prompt

async def generate_algorithm_problem(theme: str, difficulty: str, language: str = "python") -> GeneratedProblem:
    """
    Generates a new algorithmic problem using AI for competitive programming duels.
    This function now also self-corrects the test cases by running the generated solution.
    """
    prompt = generate_algorithm_problem_prompt(theme, difficulty, language)
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert competitive programming problem setter. You are extremely meticulous and always verify your work. You create engaging, solvable problems with clear, correct examples. The code templates must be complete and executable - they should read input, call the function, and print output. You will only output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7  # Add some creativity
        )
        
        response_json = completion.choices[0].message.content
        parsed_json = json.loads(response_json)
        
        # Validate the parsed JSON against our Pydantic model
        problem = GeneratedProblem(**parsed_json)
        
        # Self-correction step: Run the generated solution against the generated inputs
        # to create a ground-truth for expected outputs.
        logger.info(f"Self-correcting test cases for generated problem: {problem.title}")
        for i, test_case in enumerate(problem.test_cases):
            logger.info(f"Running solution against test case {i+1} input: {test_case.input_data}")
            params = SubmissionParams(
                source_code=problem.solution,
                language_id=71,  # Python 3
                stdin=test_case.input_data,
            )
            result = await execute_code(params)

            if result.status['description'] == 'Accepted' and result.stdout is not None:
                corrected_output = result.stdout.strip()
                if test_case.expected_output.strip() != corrected_output:
                    logger.warning(f"Correcting test case {i+1}. Original output: '{test_case.expected_output}', Corrected output: '{corrected_output}'")
                test_case.expected_output = corrected_output
            else:
                # If the solution code fails on one of its own test cases, the problem is invalid.
                error_details = result.stderr or result.compile_output or result.message
                logger.error(f"Generated solution failed validation for input '{test_case.input_data}'. Error: {error_details}")
                raise ValueError(f"Generated solution is invalid and failed on its own test case: {test_case.input_data}")
        
        logger.info("✅ All test cases self-corrected successfully.")
        
        # Manually set the first two test cases to be public
        if problem.test_cases:
            for i in range(min(2, len(problem.test_cases))):
                problem.test_cases[i].is_public = True
        
        # Safety net: ensure template is just a stub, not the full solution
        if problem.solution and problem.code_templates:
            for template in problem.code_templates:
                # Basic check: if template contains solution logic, replace it.
                # A more robust check would be needed for production.
                if "TODO" not in template.template_code or len(template.template_code) > (len(problem.solution) * 0.8):
                    import re
                    match = re.search(r"def\s+(.+?)\):", template.template_code)
                    if match:
                        signature = match.group(0)
                        template.template_code = f"""{signature}
    # TODO: Implement solution
    pass

# Read input, call the function, and print the result.
try:
    input_data = eval(input())
    result = {match.group(1).split('(')[0].strip()}(input_data)
    print(result)
except:
    pass
"""

        return problem
        
    except Exception as e:
        logger.error(f"Error generating and self-correcting algorithm problem: {e}", exc_info=True)
        raise

# Legacy SQL problem generator
class SQLTestCase(BaseModel):
    name: str
    description: str
    verification_query: str

class SQLGeneratedProblem(BaseModel):
    task_description: str
    schema_setup_sql: str
    correct_solution_sql: str
    test_cases: List[SQLTestCase]

async def generate_sql_problem(category: str, difficulty: str, topic: str) -> SQLGeneratedProblem:
    """
    Generates a new SQL problem using an LLM (legacy function).
    """
    prompt = generate_sql_problem_prompt(category, difficulty, topic)
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a problem generator for a competitive programming platform. You only output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        response_json = completion.choices[0].message.content
        parsed_json = json.loads(response_json)
        
        problem = SQLGeneratedProblem.model_validate(parsed_json)
        
        return problem
        
    except Exception as e:
        print(f"Error generating SQL problem: {e}")
        raise

# For backward compatibility
async def generate_problem(category: str, difficulty: str, topic: str) -> SQLGeneratedProblem:
    """Legacy function for SQL problems"""
    return await generate_sql_problem(category, difficulty, topic)

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