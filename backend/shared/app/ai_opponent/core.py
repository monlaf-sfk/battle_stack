import difflib
import random
from pydantic import BaseModel, Field, RootModel
from typing import List, Literal, Union
import logging

logger = logging.getLogger(__name__)

class CodeTypingAction(BaseModel):
    action: Literal["type"] = "type"
    content: str = Field(..., description="The code snippet to type out.")
    speed: float = Field(default=1.0, description="Typing speed multiplier (1.0 is normal).")

class PauseAction(BaseModel):
    action: Literal["pause"] = "pause"
    duration: float = Field(..., description="Duration of the pause in seconds.")

class DeleteAction(BaseModel):
    action: Literal["delete"] = "delete"
    char_count: int = Field(..., description="Number of characters to delete.")

class CodingStep(RootModel):
    root: Union[CodeTypingAction, PauseAction, DeleteAction] = Field(..., discriminator='action')

async def generate_ai_coding_process(solution: str, template: str, language: str) -> List[CodingStep]:
    """
    Generates a realistic sequence of coding actions, including mistakes and corrections,
    by using an LLM to plan the transition from a template to the final solution.
    """
    from shared.app.ai.generator import generator_client, GeneratorInvalidResponse

    prompt = f"""
    You are an AI assistant simulating a programmer solving a coding problem. Your task is to generate a realistic sequence of actions to transform a given code template into a final solution in the {language} language.

    The simulation should look human. Humans don't just type code perfectly from start to finish. They make mistakes, they pause to think, they delete code, and they refactor.

    Here is the starting template:
    ```python
    {template}
    ```

    Here is the final, correct solution:
    ```python
    {solution}
    ```

    You must generate a JSON array of "coding steps" that represents this process. The available actions are:
    1. `{{ "action": "type", "content": "...", "speed": <float> }}`: Types out a string of code. `speed` is a multiplier (e.g., 2.0 is twice as fast).
    2. `{{ "action": "pause", "duration": <float> }}`: Pauses for a duration in seconds.
    3. `{{ "action": "delete", "char_count": <int> }}`: Deletes a specified number of characters from the end of the current code.

    **CRITICAL INSTRUCTIONS:**
    - The final state of the code after all actions are performed MUST exactly match the provided solution.
    - Start by deleting the placeholder content from the template.
    - Simulate a thought process. Use pauses before large blocks of code.
    - Introduce plausible errors. For example, a typo in a variable name, a wrong operator, or a logical mistake.
    - After making a mistake, pause, then use the "delete" action to correct it before typing the right code.
    - Keep the `content` in "type" actions relatively short to simulate real typing.
    - Ensure all code, including indentation and newlines, is correctly represented in the `content` fields. Use `\\n` for newlines within the JSON string.
    - Your entire output must be a single, valid JSON array of action objects. Do not include any text before or after the JSON array.

    Generate the JSON array of coding steps now.
    """
    try:
        response_json = await generator_client.generate(prompt)
        
        # The output from the generator is a list of dictionaries.
        # We need to validate and convert them into our Pydantic models.
        validated_steps = [CodingStep.model_validate(step) for step in response_json]
        return validated_steps

    except GeneratorInvalidResponse as e:
        # Fallback to the simpler, non-mistake-prone generation if the LLM fails.
        logger.error(f"LLM failed to generate valid coding steps: {e}. Falling back to simple typing.")
        solution_lines = solution.splitlines(True)
        return [
            CodingStep(root=CodeTypingAction(content=line, speed=random.uniform(1.8, 3.0)))
            for line in solution_lines if line.strip()
        ]
    except Exception as e:
        logger.error(f"An unexpected error occurred during AI process generation: {e}. Falling back to simple typing.")
        solution_lines = solution.splitlines(True)
        return [
            CodingStep(root=CodeTypingAction(content=line, speed=random.uniform(1.8, 3.0)))
            for line in solution_lines if line.strip()
        ] 