import { duelsApi } from './api';
import type { AxiosResponse } from 'axios';
import type { SubmissionResponse } from './codeExecutionService';

// --- Type Definitions for Duels --- //

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

// --- Duel Service Class --- //

class DuelService {
  // Create a new duel
  async createDuel(request: DuelCreateRequest): Promise<DuelResponse> {
    const response: AxiosResponse<DuelResponse> = await duelsApi.post('/', request);
    return response.data;
  }

  // Create an AI duel with custom settings
  async createAIDuel(request: AIDuelCreateRequest): Promise<DuelResponse> {
    const response: AxiosResponse<DuelResponse> = await duelsApi.post('/ai-duel-custom', request);
    // Transform the response to include the `problem` object directly
    return this.transformDuelResponse(response.data);
  }

  // Create a private room duel
  async createPrivateRoom(userId: string, difficulty: DuelDifficulty, category: string): Promise<DuelResponse> {
    const response: AxiosResponse<DuelResponse> = await duelsApi.post('/rooms', {
      user_id: userId,
      difficulty,
      category,
    });
    return response.data;
  }

  // Join a private room
  async joinRoom(roomCode: string, userId: string): Promise<DuelResponse> {
    const response: AxiosResponse<DuelResponse> = await duelsApi.post('/rooms/join', { room_code: roomCode, user_id: userId });
    return response.data;
  }

  // Get duel by ID
  async getDuel(duelId: string): Promise<DuelResponse> {
    const response: AxiosResponse<DuelResponse> = await duelsApi.get(`/${duelId}`);
    return this.transformDuelResponse(response.data);
  }

  // Get active or waiting duel for a user
  async getDuelForUser(userId: string): Promise<DuelResponse | null> {
    try {
      const response: AxiosResponse<DuelResponse> = await duelsApi.get(`/user/${userId}/active-or-waiting`);
      return this.transformDuelResponse(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null; // No active duel found
      }
      throw error;
    }
  }

  // Submit solution for a duel
  async submitSolution(duelId: string, submission: DuelSubmission): Promise<SubmissionResponse> {
    const response: AxiosResponse<SubmissionResponse> = await duelsApi.post(`/${duelId}/submit`, submission);
    return response.data;
  }

  // Test code against public tests for a duel
  async testCode(duelId: string, submission: Omit<DuelSubmission, 'player_id'>): Promise<SubmissionResponse> {
    const response: AxiosResponse<SubmissionResponse> = await duelsApi.post(`/${duelId}/test`, submission);
    return response.data;
  }

  // Leave a duel
  async leaveDuel(duelId: string): Promise<void> {
    await duelsApi.post(`/${duelId}/leave`);
  }

  // Get leaderboard (from api.ts)
  // getLeaderboard is now in api.ts, so no need to redefine here

  // Get match history (from api.ts)
  // getMatchHistory is now in api.ts, so no need to redefine here

  // Helper to transform duel response to include problem object
  private transformDuelResponse(duelData: DuelResponse): DuelResponse {
    if (duelData.results && duelData.results.ai_problem_data) {
      const aiProblemData = duelData.results.ai_problem_data;
      // Ensure starter_code is generated from code_templates if not present
      if (!aiProblemData.starter_code) {
        aiProblemData.starter_code = {};
        for (const template of aiProblemData.code_templates) {
          aiProblemData.starter_code[template.language] = template.template_code;
        }
      }
      duelData.problem = aiProblemData; // Attach the AI problem data as 'problem'
    }
    return duelData;
  }
}

export const duelsApiService = new DuelService(); 