// --- Type Definitions for Duels --- //

export interface DuelTestResponse {
  is_correct: boolean;
  passed_count: number;
  total_count: number;
  error?: string;
  details?: {
    input: string;
    expected: string;
    got: string;
    status: 'PASSED' | 'FAILED' | 'COMPILATION_ERROR';
    is_public: boolean;
    error_message?: string;
  }[];
}

export const DuelStatus = {
  PENDING: "pending",
  GENERATING_PROBLEM: "generating_problem",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  TIMED_OUT: "timed_out",
  CANCELLED: "cancelled",
  ERROR: "error",
  FAILED_GENERATION: "failed_generation",
} as const;

export type DuelStatus = typeof DuelStatus[keyof typeof DuelStatus];

export interface TestCase {
  input_data: string;
  expected_output: string;
  explanation?: string;
  is_public?: boolean; // Specific for duel problems to show some tests
}

export interface CodeTemplate {
  language: string;
  template_code: string;
}

export interface DuelProblem {
  id: string; // Problem ID from backend
  title: string;
  description: string;
  difficulty: string;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  test_cases: TestCase[];
  code_templates: CodeTemplate[];
  starter_code?: Record<string, string>; // Client-side generated for convenience
  // Add any other problem-related fields that might come from AI or backend
}

export interface PlayerResult {
  player_id: string;
  score: number;
  time_taken_seconds: number;
  submission_count: number;
  is_winner: boolean;
}

export interface DuelResult {
  winner_id: string | null; // Can be 'ai' or user ID
  player_one_result: PlayerResult;
  player_two_result: PlayerResult | null; // Null if AI duel
  finished_at: string; // ISO string
  is_timeout: boolean;
  is_ai_duel: boolean;
}

export interface DuelResponse {
  id: string;
  problem_id: string;
  status: DuelStatus;
  player_one_id: string;
  player_two_id?: string | null; // Null if AI duel
  player_one_code?: string | null;
  player_two_code?: string | null;
  results?: {
    ai_problem_data?: DuelProblem; // AI generated problem details
    p1_solved_at?: string; // ISO string
    p2_solved_at?: string; // ISO string
    first_solver?: string; // 'p1' or 'p2' or 'ai'
    p1_subs?: number;
    p2_subs?: number;
    ai_subs?: number;
    p1_passed_tests?: number;
    p2_passed_tests?: number;
    ai_passed_tests?: number;
  } | null;
  time_limit_seconds?: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  problem?: DuelProblem; // Populated by frontend transformer
  room_code?: string; // For private rooms
}

export interface DuelCreateRequest {
  problem_id: string;
  player_one_id: string;
  player_two_id?: string; // Optional for PvP
  status?: DuelStatus; // Optional, defaults to PENDING
}

export interface AIDuelCreateRequest {
  user_id: string;
  theme: string;
  difficulty: string;
  language: string; // Language ID string
  category: string; // e.g., 'algorithms', 'sql'
}

export interface DuelJoinRequest {
  user_id: string; // Player who wants to join
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: 'algorithm' | 'sql' | 'devops' | 'frontend';
}

export interface JoinRoomRequest {
  room_code: string;
  user_id: string;
}

export interface DuelSubmission {
  player_id: string;
  language: string;
  code: string;
}

export type ProblemType = 'algorithm' | 'sql' | 'devops' | 'frontend';
export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// --- Duel Service is now in api.ts --- //
// This file now only contains type definitions and constants. 