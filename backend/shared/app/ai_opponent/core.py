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
    a realistic human programmer writing code with natural hesitations and minimal mistakes.
    """
    steps = []
    
    # The AI's final code should be the provided solution
    full_code_target = solution

    # Add initial thinking pause - humans need time to understand the problem
    initial_thinking = random.uniform(8.0, 15.0)  # Reduced from 15-30 to 8-15 seconds
    steps.append(CodingStep(root=PauseAction(duration=initial_thinking)))

    # Sometimes start with wrong approach and delete it (like humans do)
    if random.random() < 0.2:  # Reduced from 40% to 20% chance of false start
        false_start = "def solve" if language == "python" else "function solve"
        steps.append(CodingStep(root=CodeTypingAction(content=false_start, speed=0.5)))
        steps.append(CodingStep(root=PauseAction(duration=random.uniform(2.0, 4.0))))
        steps.append(CodingStep(root=DeleteAction(char_count=len(false_start))))
        steps.append(CodingStep(root=PauseAction(duration=random.uniform(3.0, 6.0))))

    # Simulate typing the solution with realistic behavior but fewer mistakes
    remaining_code = full_code_target
    
    while remaining_code:
        # Moderate thinking pauses (40% chance instead of 70%)
        if random.random() < 0.4:
            # Shorter thinking pauses
            thinking_time = random.uniform(1.0, 5.0)
            # Extra pause at complex parts but shorter
            if any(keyword in remaining_code[:20] for keyword in ['for', 'while', 'if', 'def', 'class']):
                thinking_time += random.uniform(2.0, 4.0)
            steps.append(CodingStep(root=PauseAction(duration=thinking_time)))

        # Very rare mistakes (5% chance) and only small typos
        if random.random() < 0.05 and len(remaining_code) < len(full_code_target) - 10:
            # Only delete 1-2 characters for small typos
            delete_count = random.randint(1, 2)
            steps.append(CodingStep(root=DeleteAction(char_count=delete_count)))
            steps.append(CodingStep(root=PauseAction(duration=random.uniform(0.5, 1.5))))

        # Type in reasonable chunks (2-8 characters)
        chunk_size = random.randint(2, 8)
        code_chunk = remaining_code[:chunk_size]
        remaining_code = remaining_code[chunk_size:]
        
        # Moderate typing speed
        typing_speed = random.uniform(0.4, 0.8)
        
        # Slightly slower for complex characters
        if any(char in code_chunk for char in ['(', ')', '[', ']', '{', '}', ':', ';']):
            typing_speed *= 0.8
            
        steps.append(CodingStep(root=CodeTypingAction(content=code_chunk, speed=typing_speed)))
        
        # Occasional mid-typing pauses (15% chance)
        if random.random() < 0.15:
            pause_duration = random.uniform(0.5, 2.0)
            # Longer pauses at line breaks
            if '\n' in code_chunk:
                pause_duration += random.uniform(1.0, 2.0)
            steps.append(CodingStep(root=PauseAction(duration=pause_duration)))

    # Final review pause
    final_review = random.uniform(3.0, 8.0)
    steps.append(CodingStep(root=PauseAction(duration=final_review)))
    
    return steps 