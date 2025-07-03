import { duelsApi } from './api';
import type { DuelCreateRequest, DuelResponse, DuelSubmission, CodeSubmission, LeaderboardEntry, MatchHistoryItem, DuelJoinRequest, SubmissionResponse, ProblemType, DuelDifficulty, AIDuelCreateRequest } from '../types/duel.types';

export class DuelService {
  async createDuel(request: DuelCreateRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/', request);
    return response.data;
  }

  async joinDuel(duelId: string): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>(`/${duelId}/join`);
    return response.data;
  }

  async submitSolution(duelId: string, submission: DuelSubmission): Promise<SubmissionResponse> {
    const response = await duelsApi.post<SubmissionResponse>(`/${duelId}/submit`, submission);
    return response.data;
  }

  async testCode(duelId: string, submission: CodeSubmission): Promise<SubmissionResponse> {
    const response = await duelsApi.post<SubmissionResponse>(`/${duelId}/test`, submission);
    return response.data;
  }

  async getDuel(duelId: string): Promise<DuelResponse> {
    const response = await duelsApi.get<DuelResponse>(`/${duelId}`);
    return response.data;
  }

  async getDuelForUser(userId: string): Promise<DuelResponse> {
    const response = await duelsApi.get<DuelResponse>(`/user/${userId}/active-or-waiting`);
    return response.data;
  }

  async getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    const url = limit ? `/leaderboard?limit=${limit}` : '/leaderboard';
    const response = await duelsApi.get<LeaderboardEntry[]>(url);
    return response.data;
  }

  async getMatchHistory(limit?: number): Promise<MatchHistoryItem[]> {
    const url = limit ? `/matches/recent?limit=${limit}` : '/matches/recent';
    const response = await duelsApi.get<MatchHistoryItem[]>(url);
    return response.data;
  }

  async leaveDuel(duelId: string): Promise<void> {
    await duelsApi.post(`/${duelId}/leave`);
  }

  async createPrivateRoom(request: DuelJoinRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/rooms', request);
    return response.data;
  }

  async joinRoom(roomCode: string): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/rooms/join', { room_code: roomCode });
    return response.data;
  }

  async createAIDuel(request: AIDuelCreateRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/ai-duel-custom', request);
    return response.data;
  }
}

export const duelsApiService = new DuelService();

// Specific service functions for different duel types

// Create an AI duel with custom settings
export const createAIDuel = async (
  request: AIDuelCreateRequest
): Promise<DuelResponse> => {
  return await duelsApiService.createAIDuel(request);
};

// Legacy functions - deprecated, use createAIDuel instead
export const createPrivateRoom = async (difficulty: DuelDifficulty = 'medium', problemType: ProblemType = 'algorithm'): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/', {
    mode: 'private_room',
    difficulty,
    problem_type: problemType,
  });
  return response.data;
};

export default duelsApiService;
