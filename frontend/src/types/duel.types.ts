export interface DuelProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: Record<string, string>;
  test_cases: Array<{
    input: string;
    output: string;
    is_hidden: boolean;
  }>;
  constraints?: string;
  hints?: string[];
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

export interface TestResult {
  type: 'test_result';
  user_id: string;
  passed: number;
  failed: number;
  total_tests: number;
  execution_time_ms?: number;
  error?: string;
  is_solution_correct: boolean;
  progress_percentage: number;
  timestamp: number;
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
    winner_id: string;
    winner_username: string;
    winner_solve_time: string;
    winner_rating_change: number;
    loser_username?: string;
    loser_rating_change?: number;
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

export type WSMessage = TestResult | CodeUpdate | DuelComplete | TypingStatus | UserStatus | DuelStarted;

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'; 