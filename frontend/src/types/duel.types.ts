export type UUID = string;

export type DuelMode = 'random_player' | 'private_room' | 'ai_opponent';
export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ProblemType = 'algorithm' | 'data_structure' | 'dynamic_programming' | 'graph' | 'string' | 'array' | 'tree' | 'math' | 'hash_table' | 'stack_queue' | 'heap' | 'linked_list' | 'binary_search' | 'recursion' | 'backtracking' | 'bit_manipulation' | 'sliding_window' | 'two_pointers' | 'sorting' | 'searching' | 'design' | 'simulation' | 'geometry' | 'combinatorics';
export type DuelStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'pending' | 'generating_problem' | 'timed_out';
export type ParticipantStatus = 'joined' | 'ready' | 'coding' | 'finished' | 'disconnected';
export type Language = 'python' | 'javascript' | 'java' | 'cpp';

export interface CodeTemplate {
  language: string;
  template_code: string;
}

export interface TestCase {
  input_data: string;
  expected_output: string;
  explanation?: string;
  is_hidden?: boolean;
}

export interface Problem {
  id: string | number;
  title: string;
  slug: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: string;
  category: string;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  hints?: string[];
  test_cases?: TestCase[];
  code_templates?: CodeTemplate[] | null;
  starter_code?: Record<string, string>;
  tags: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  submission_stats?: {
    total_submissions: number;
    acceptance_rate: number;
    user_solved: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export interface DuelProblem {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  code_templates: CodeTemplate[] | null;
  created_at: string;
  updated_at: string;
  test_cases?: TestCase[];
  constraints?: string;
  starter_code?: Record<string, string>;
  solution?: string;
  ai_solution_length?: number;
}

export interface Participant {
  id: string;
  user_id?: string;
  username: string;
  is_ai: boolean;
  tests_passed: number;
  total_tests: number;
  is_winner: boolean;
  rating_before?: number;
  rating_after?: number;
  solve_duration_seconds?: number;
}

export interface IndividualTestCaseResult {
  input_data: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  runtime_ms?: number;
  memory_mb?: number;
  error?: string | null;
  is_hidden?: boolean;
}

export interface TestResult {
  is_correct: boolean;
  error?: string | null;
  details?: string[] | null;
  passed: number;
  total: number;
  failed?: number;
}

export interface CodeUpdate {
  type: 'code_update';
  user_id: string;
  code: string;
  language: string;
  cursor_position?: { line: number; column: number };
  timestamp: number;
}

export interface DuelComplete {
  type: 'duel_complete';
  result: {
    winner_id: string | null;
    winner_username: string | null;
    winner_solve_time: string | null;
    winner_rating_change: number;
    loser_username?: string;
    loser_rating_change?: number;
    timeout?: boolean;
    message?: string;
  };
  timestamp: number;
}

export interface TypingStatus {
  type: 'typing_status';
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}

export interface UserStatus {
  type: 'user_status';
  user_id: string;
  status: 'connected' | 'disconnected';
  timestamp: number;
}

export interface DuelStarted {
  type: 'duel_started';
  duel_id: string;
  timestamp: number;
}

// Backend-compatible result schemas
export interface PlayerResult {
    player_id: string;
    score: number;
    time_taken_seconds: number;
    submission_count: number;
    is_winner: boolean;
}

export interface DuelResult {
    winner_id: string | null;
    player_one_result: PlayerResult | null;
    player_two_result: PlayerResult | null;
    finished_at: string;
    is_timeout: boolean;
    is_ai_duel: boolean;
    ai_problem_data?: any;
}

// New WebSocket message for duel end
export interface DuelEndMessage {
  type: 'duel_end';
  data: DuelResult;
}

export interface DuelStartMessage {
    type: 'duel_start';
    data: DuelResponse;
}

export interface TestResultMessage {
    type: 'test_result';
    user_id: string;
    data: {
        is_correct: boolean;
        error?: string;
        details?: string[];
        passed: number;
        total: number;
        failed?: number;
    };
}

export interface AIProgressMessage {
    type: 'ai_progress';
    data: {
        code_chunk: string;
    };
}

export interface AIDeleteMessage {
    type: 'ai_delete';
    data: {
        char_count: number;
    };
}

export type WSMessage =
  | { type: 'duel_state'; user_id: string; data: Duel; timestamp: string }
  | { type: 'duel_start'; user_id: string; data: DuelResponse; timestamp: string }
  | { type: 'duel_end'; user_id: string; data: DuelResult | string; timestamp: string }
  | { type: 'code_update'; user_id: string; data: { code: string; language: Language }; timestamp: string }
  | { type: 'ai_progress'; user_id: string; data: { code_chunk: string }; timestamp: string }
  | { type: 'ai_delete'; user_id: string; data: { char_count: number }; timestamp: string }
  | { type: 'test_result'; user_id: string; data: TestResultResponse; timestamp: string }
  | { type: 'ai_start'; user_id: string; data: Record<string, never>; timestamp: string };

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DuelParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  rating: number;
  status: ParticipantStatus;
  joined_at: string;
  is_ai: boolean;
  code_snapshots: Array<{
    language: string;
    code: string;
    timestamp: string;
  }>;
  submissions: Array<{
    id: string;
    code: string;
    language: string;
    score: number;
    submitted_at: string;
  }>;
  current_progress: {
    tests_passed: number;
    total_tests: number;
    percentage: number;
  };
}

export interface DuelResponse {
  id: string;
  mode: DuelMode;
  status: DuelStatus;
  difficulty: DuelDifficulty;
  problem_type: ProblemType;
  problem: DuelProblem;
  participants: DuelParticipant[];
  room_code?: string;
  max_participants: number;
  time_limit_minutes: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  winner_id?: string;
  rating_changes?: Record<string, number>;
  problem_id: string;
  player_one_id: string;
  player_two_id?: string | null;
  player_one_code?: string;
  results?: DuelResult | null;
  finished_at?: string | null;
  player_one_code_language?: Language;
}

export interface DuelCreateRequest {
  mode: DuelMode;
  difficulty: DuelDifficulty;
  problem_type: ProblemType;
  room_code?: string;
  time_limit_minutes?: number;
}

export interface DuelSubmission {
  player_id: UUID;
  language: Language;
  code: string;
}

export interface DuelJoinRequest {
  room_code?: string;
  difficulty?: DuelDifficulty;
}

export interface CodeSubmission {
  code: string;
  language: Language;
}

export interface TestResultResponse {
  passed: number;
  failed: number;
  total_tests: number;
  percentage: number;
  execution_time_ms: number;
  memory_usage_mb: number;
  error?: string;
  progress_percentage: number;
  is_solution_correct?: boolean;
  test_results: Array<{
    test_case: number;
    status: 'passed' | 'failed';
    execution_time_ms: number;
    memory_usage_mb?: number;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>;
}

export interface SubmissionResponse {
  is_correct: boolean;
  error?: string | null;
  details?: string[] | null;
  passed: number;
  total: number;
}

export interface WebSocketMessage {
  type: 'code_update' | 'typing_status' | 'test_result' | 'submission_result' | 'user_joined' | 'user_left' | 'duel_completed' | 'ping' | 'pong';
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  elo_rating: number;
  total_matches: number;
  wins: number;
  win_rate: number;
  current_streak: number;
}

export interface MatchHistoryItem {
  id: string;
  duel_id: string;
  opponent_name: string;
  is_victory: boolean;
  rating_change?: number;
  problem_title: string;
  solve_time?: string;
  played_at: string;
}

export interface PlayerRating {
  total_duels: number;
  wins: number;
  losses: number;
  win_rate: number;
  elo_rating: number;
  rank: string;
  current_streak: number;
  best_streak: number;
  average_solve_time?: number;
}

export interface PlayerAchievement {
  achievement_type: string;
  earned_at: string;
  description?: string;
}

export interface PlayerStats {
  user_id: string;
  username: string;
  rating: PlayerRating;
  recent_matches: MatchHistoryItem[];
  achievements: PlayerAchievement[];
}

export interface Duel {
  id: string;
  problem_id: string;
  status: DuelStatus;
  player_one_id: string;
  player_two_id?: string | null;
  player_one_code?: string;
  player_two_code?: string;
  results?: DuelResult | null;
  time_limit_seconds?: number;
  created_at: string;
  started_at?: string;
  finished_at?: string | null;
  problem?: DuelProblem;
  difficulty: DuelDifficulty;
  player_one_code_language?: Language;
  rating_changes?: Record<string, number>;
}

export interface AIDuelCreateRequest {
  user_id: string | null;
  theme: string;
  difficulty: string;
  language: string;
  category: string;
}

// Existing AI message interfaces (already part of WSMessage union, but explicitly defined for clarity/import if needed)
export interface AIProgressMessageData {
    code_chunk: string;
}

export interface AIDeleteMessageData {
    char_count: number;
}

export interface TestResultResponse {
  passed: number;
  failed: number;
  total_tests: number;
  percentage: number;
  execution_time_ms: number;
  memory_usage_mb: number;
  error?: string;
  progress_percentage: number;
  is_solution_correct?: boolean;
  test_results: Array<{
    test_case: number;
    status: 'passed' | 'failed';
    execution_time_ms: number;
    memory_usage_mb?: number;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>;
}