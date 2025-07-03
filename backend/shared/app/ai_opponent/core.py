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
    root: Union[CodeTypingAction, PauseAction, DeleteAction]

async def generate_ai_coding_process(
    solution: str, template: str, language: str
) -> List[CodingStep]:
    """
    Generates a sequence of coding actions (typing, pausing, deleting) to simulate
    an AI opponent writing code.
    """
    steps = []
    
    # The AI's final code should be the provided solution. The template is for the
    # human user, and the AI should write the complete, correct solution.
    full_code_target = solution

    # Now, simulate the typing process for the `full_code_target`
    remaining_code = full_code_target
    
    while remaining_code:
        # Add a pause to simulate thinking
        if random.random() < 0.2: # 20% chance of a pause
            steps.append(CodingStep(root=PauseAction(duration=random.uniform(0.5, 2.0))))

        # Add a "mistake" and correction
        if random.random() < 0.05 and len(steps) > 0: # 5% chance of a mistake
            # Delete a few characters
            delete_count = random.randint(3, 10)
            steps.append(CodingStep(root=DeleteAction(char_count=delete_count)))
            # Add a short pause
            steps.append(CodingStep(root=PauseAction(duration=random.uniform(0.2, 0.5))))
            # This is a simplified model; we don't actually "re-type" the correct code here,
            # but we assume the `full_code_target` is what is eventually typed out.

        # Type a chunk of code
        chunk_size = random.randint(5, 15)
        code_chunk = remaining_code[:chunk_size]
        remaining_code = remaining_code[chunk_size:]
        
        typing_speed = random.uniform(0.8, 1.5) # Varies typing speed
        steps.append(CodingStep(root=CodeTypingAction(content=code_chunk, speed=typing_speed)))
    
    return steps 