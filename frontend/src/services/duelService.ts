import axios from 'axios';
import { userApi, duelsApi } from './api';
import type { DuelCreateRequest, DuelResponse, DuelSubmission, CodeSubmission, LeaderboardEntry, MatchHistoryItem, DuelJoinRequest, SubmissionResponse, ProblemType, DuelDifficulty, AIDuelCreateRequest } from '../types/duel.types';

export class DuelService {
  async createDuel(request: DuelCreateRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/', request);
    return response.data;
  }

  async joinDuel(request?: DuelJoinRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/matchmaking/find_or_create', null, {
      params: request,
    });
    return response.data;
  }

  async getActiveOrWaitingDuel(userId: string): Promise<DuelResponse | null> {
    try {
      const response = await duelsApi.get<DuelResponse>(`/user/${userId}/active-or-waiting`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getDuel(duelId: string): Promise<DuelResponse> {
    const response = await duelsApi.get<DuelResponse>(`/${duelId}`);
    return response.data;
  }

  async submitCode(duelId: string, submission: DuelSubmission): Promise<SubmissionResponse> {
    const response = await duelsApi.post<SubmissionResponse>(`/${duelId}/submit`, submission);
    return response.data;
  }

  async testCode(duelId: string, submission: CodeSubmission): Promise<{ message: string }> {
    const response = await duelsApi.post<{ message: string }>(`/${duelId}/test`, submission);
    return response.data;
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const response = await duelsApi.get<LeaderboardEntry[]>('/leaderboard', { params: { limit } });
    return response.data;
  }

  async getMyRank(userId: string): Promise<{ rank: number }> {
    const response = await duelsApi.get<LeaderboardEntry[]>(`/leaderboard`, { params: { user_id: userId } });
    const userEntry = response.data.find(entry => entry.user_id === userId);
    return { rank: userEntry ? userEntry.rank : 0 };
  }

  // Get recent matches (public)
  async getPublicRecentMatches(limit: number = 10): Promise<MatchHistoryItem[]> {
    // The actual endpoint for recent duels is in the user service
    const response = await userApi.get<MatchHistoryItem[]>('/duels/recent', { params: { limit } });
    return response.data;
  }

  async createCustomAIDuel(settings: AIDuelCreateRequest): Promise<DuelResponse> {
    const response = await duelsApi.post<DuelResponse>('/ai-duel-custom', settings);
    return response.data;
  }
}

export const duelsApiService = new DuelService();

// Duels API endpoints
export const createAIDuel = async (settings: AIDuelCreateRequest): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/ai-duel-custom', settings);
  return response.data;
};

export const createPrivateRoom = async (difficulty: DuelDifficulty = 'medium', problemType: ProblemType = 'algorithm'): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/', {
    mode: 'private_room',
    difficulty,
    problem_type: problemType,
  });
  return response.data;
};

export const joinPrivateRoom = async (roomCode: string): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/matchmaking/join', null, {
    params: {
      room_code: roomCode,
    },
  });
  return response.data;
};

export const quickDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/matchmaking/find_or_create', {
    problem_id: 'some-default-problem-id', // Replace with actual logic for selecting a problem
    mode: 'random_player',
    difficulty,
  });
  return response.data;
};

export const aiDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  const response = await duelsApi.post<DuelResponse>('/ai-duel', {
    problem_id: 'some-default-problem-id', // Replace with actual logic for selecting a problem
    mode: 'ai_opponent',
    difficulty,
  });
  return response.data;
};
