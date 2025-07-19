export interface DuelSubmission {
  player_id: string;
  language: string;
  code: string;
}

export interface DuelPlayer {
  id: string;
  username: string;
}

export interface TestCase {
  input_data: string;
  expected_output: string;
  explanation?: string;
  is_public?: boolean;
}

export interface CodeTemplate {
  language: string;
  template_code: string;
}

export interface DuelProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  test_cases: TestCase[];
  code_templates: CodeTemplate[];
  starter_code?: Record<string, string>;
}

export const DuelStatus = {
  PENDING: "pending",
  WAITING: "waiting",
  GENERATING_PROBLEM: "generating_problem",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  TIMED_OUT: "timed_out",
  CANCELLED: "cancelled",
  ERROR: "error",
  FAILED_GENERATION: "failed_generation",
} as const;

export type DuelStatus = typeof DuelStatus[keyof typeof DuelStatus];

export interface PlayerResult {
  player_id: string;
  score: number;
  time_taken_seconds: number;
  submission_count: number;
  is_winner: boolean;
}

export interface DuelResponse {
  id: string;
  status: DuelStatus;
  player_one_id: string;
  player_two_id?: string | null;
  player_one_ready: boolean;
  player_two_ready: boolean;
  players: DuelPlayer[];
  problem?: DuelProblem; 
  results?: any;
  time_limit_seconds?: number;
  room_code?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface DuelCreateRequest {
  problem_id: string;
  player_one_id: string;
  player_two_id?: string;
  status?: DuelStatus;
}

export interface AIDuelCreateRequest {
  user_id: string;
  theme: string;
  difficulty: string;
  language: string;
  category: string;
}

export interface DuelJoinRequest {
  user_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: 'algorithm' | 'sql' | 'devops' | 'frontend';
}

export interface JoinRoomRequest {
  room_code: string;
  user_id: string;
}

export type ProblemType = 'algorithm' | 'sql' | 'devops' | 'frontend';
export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DuelResult {
  winner_id: string | null;
  player_one_result: PlayerResult;
  player_two_result: PlayerResult | null;
  finished_at: string;
  is_timeout: boolean;
  is_ai_duel: boolean;
  is_draw: boolean;
  final_scores: Record<string, number>;
  elo_changes: Record<string, number>;
}

export interface DuelTestResponse {
  is_correct: boolean;
  error?: string;
  details?: any;
  passed_count: number;
  total_count: number;
}
