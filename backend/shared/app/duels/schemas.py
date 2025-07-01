from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from datetime import datetime
from .models import DuelStatus

class PlayerResult(BaseModel):
    player_id: UUID | str # Can be "ai"
    score: int
    time_taken_seconds: float
    submission_count: int
    is_winner: bool

class DuelResult(BaseModel):
    winner_id: Optional[UUID | str] = None # Can be "ai"
    player_one_result: Optional[PlayerResult] = None
    player_two_result: Optional[PlayerResult] = None
    finished_at: datetime
    is_timeout: bool = False
    is_ai_duel: bool = False

class TestCase(BaseModel):
    input_data: str
    expected_output: str
    is_public: Optional[bool] = False

class CodeTemplate(BaseModel):
    language: str
    template_code: str

class DuelProblem(BaseModel):
    id: UUID
    title: str
    description: str
    difficulty: str
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    test_cases: List[TestCase]
    code_templates: List[CodeTemplate]
    starter_code: Optional[Dict[str, str]] = {} # Will be populated by validator

class DuelBase(BaseModel):
    problem_id: UUID
    status: DuelStatus = DuelStatus.PENDING
    player_one_id: UUID
    player_two_id: Optional[UUID] = None

class DuelCreate(DuelBase):
    pass

class CodeSubmission(BaseModel):
    language: str
    code: str

class Duel(BaseModel):
    id: UUID
    problem_id: UUID
    status: DuelStatus
    player_one_id: UUID
    player_two_id: Optional[UUID] = None
    player_one_code: Optional[str] = None
    player_two_code: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    problem: Optional[DuelProblem] = None

    model_config = ConfigDict(from_attributes=True, extra='ignore')

    @model_validator(mode='after')
    def create_problem_from_results(self) -> 'Duel':
        if self.results and 'ai_problem_data' in self.results:
            ai_problem_data = self.results['ai_problem_data']
            
            # Convert code_templates to starter_code dictionary
            starter_code = {
                template['language']: template['template_code']
                for template in ai_problem_data.get('code_templates', [])
            }
            ai_problem_data['starter_code'] = starter_code
            
            # Ensure problem_id from the duel is used in the problem object
            ai_problem_data['id'] = self.problem_id

            self.problem = DuelProblem.model_validate(ai_problem_data)

        return self

class DuelUpdate(BaseModel):
    status: Optional[DuelStatus] = None
    player_one_code: Optional[str] = None
    player_two_code: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    finished_at: Optional[datetime] = None

class DuelSubmission(BaseModel):
    player_id: UUID
    language: str
    code: str

class AIDuelCreateRequest(BaseModel):
    user_id: UUID
    theme: str
    difficulty: str
    language: str

class DuelStats(BaseModel):
    total_duels: int
    wins: int
    losses: int
    win_rate: float
    average_rating: int

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    elo_rating: int
    total_matches: int
    wins: int
    win_rate: float
    current_streak: int

class MatchHistoryItem(BaseModel):
    id: str
    duel_id: str
    opponent_name: str
    is_victory: bool
    rating_change: Optional[int] = None
    problem_title: str
    played_at: datetime

class DuelEndMessage(BaseModel):
    type: Literal["duel_end"] = "duel_end"
    data: DuelResult