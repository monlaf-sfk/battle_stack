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
    a more human-like AI opponent writing code.
    """
    steps = []
    
    # The AI's final code should be the provided solution. The template is for the
    # human user, and the AI should write the complete, correct solution.
    full_code_target = solution

    # Add initial long thinking pause (human-like behavior)
    steps.append(CodingStep(root=PauseAction(duration=random.uniform(5.0, 12.0))))

    # Now, simulate the typing process for the `full_code_target`
    remaining_code = full_code_target
    
    while remaining_code:
        # More frequent pauses for thinking (50% chance vs 20%)
        if random.random() < 0.5:
            # Longer thinking pauses (2-8 seconds vs 0.5-2)
            thinking_time = random.uniform(2.0, 8.0)
            steps.append(CodingStep(root=PauseAction(duration=thinking_time)))

        # Much higher chance of mistakes (25% vs 5%)
        if random.random() < 0.25 and len(steps) > 0:
            # More substantial mistakes (5-20 characters vs 3-10)
            delete_count = random.randint(5, 20)
            steps.append(CodingStep(root=DeleteAction(char_count=delete_count)))
            
            # Longer pause after mistake to "think" about correction
            steps.append(CodingStep(root=PauseAction(duration=random.uniform(1.0, 4.0))))
            
            # Sometimes add a second mistake while "correcting"
            if random.random() < 0.3:
                smaller_mistake = random.randint(2, 8)
                steps.append(CodingStep(root=DeleteAction(char_count=smaller_mistake)))
                steps.append(CodingStep(root=PauseAction(duration=random.uniform(0.5, 2.0))))

        # Type smaller chunks more slowly (3-8 characters vs 5-15)
        chunk_size = random.randint(3, 8)
        code_chunk = remaining_code[:chunk_size]
        remaining_code = remaining_code[chunk_size:]
        
        # Much slower and more variable typing speed (0.3-0.8 vs 0.8-1.5)
        typing_speed = random.uniform(0.3, 0.8)
        steps.append(CodingStep(root=CodeTypingAction(content=code_chunk, speed=typing_speed)))
        
        # Occasional mid-typing pause (like a human stopping to think)
        if random.random() < 0.15:
            steps.append(CodingStep(root=PauseAction(duration=random.uniform(1.0, 3.0))))
    
    # Add final review pause before "submitting"
    steps.append(CodingStep(root=PauseAction(duration=random.uniform(3.0, 8.0))))
    
    return steps 