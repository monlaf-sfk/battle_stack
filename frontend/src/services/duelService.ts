import axios from 'axios';
import type { 
    DuelDifficulty, 
    DuelResponse, 
    DuelMode, 
    ProblemType, 
    DuelJoinRequest, 
    DuelCreateRequest, 
    CodeSubmission,
    DuelSubmission,
    SubmissionResponse, 
    TestResultResponse, 
    WebSocketMessage, 
    LeaderboardEntry,
    MatchHistoryItem, 
    PlayerStats, 
    DuelStatus 
} from '../types/duel.types';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8004/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const duelsApiService = {
  async createDuel(request: DuelCreateRequest): Promise<DuelResponse> {
    const response = await apiClient.post('/duels', request);
    return response.data;
  },

  async joinDuel(request?: DuelJoinRequest): Promise<DuelResponse> {
    const response = await apiClient.post('/duels/matchmaking/join', request);
    return response.data;
  },

  async getActiveOrWaitingDuel(userId: string): Promise<DuelResponse | null> {
    try {
      const response = await apiClient.get(`/duels/user/${userId}/active-or-waiting`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async getDuel(duelId: string): Promise<DuelResponse> {
      const response = await apiClient.get(`/duels/${duelId}`);
      return response.data;
  },

  async submitCode(duelId: string, submission: DuelSubmission): Promise<SubmissionResponse> {
      const response = await apiClient.post(`/duels/${duelId}/submit`, submission);
      return response.data;
  },

  async testCode(duelId: string, submission: CodeSubmission): Promise<{ message: string }> {
      const response = await apiClient.post(`/duels/${duelId}/test`, submission);
      return response.data;
  },

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get('/duels/leaderboard', { params: { limit } });
    return response.data;
  },

  async getMyRank(userId: string): Promise<{rank: number}> {
    const response = await apiClient.get('/duels/leaderboard', { params: { user_id: userId, limit: 1 } });
    if (Array.isArray(response.data) && response.data.length > 0) {
      return { rank: response.data[0].rank };
    }
    throw new Error('Rank not found');
  },

  async getPublicRecentMatches(limit: number = 10): Promise<MatchHistoryItem[]> {
    const response = await apiClient.get('/duels/matches/recent', { params: { limit } });
    return response.data;
  },
};

export interface AIDuelCreateRequest {
  user_id: string | null;
  theme: string;
  difficulty: string;
  language: string;
}

export const createAIDuel = async (settings: AIDuelCreateRequest): Promise<DuelResponse> => {
  console.log('🤖 Creating customized AI duel with settings:', settings);
  try {
    const response = await apiClient.post('/duels/ai-duel-custom', settings);
    console.log(`🎯 Created customized AI duel: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating customized AI duel:', error);
    throw error;
  }
};

export const createPrivateRoom = async (difficulty: DuelDifficulty = 'medium', problemType: ProblemType = 'algorithm'): Promise<DuelResponse> => {
  // This is a placeholder implementation. The backend needs to support private rooms with room codes.
  // For now, we'll create a standard duel and log the intention.
  console.log(`Attempting to create a private room with difficulty: ${difficulty} and type: ${problemType}`);
  
  // As there's no specific endpoint, we'll simulate by creating a duel that waits for another player.
  const duelData: DuelCreateRequest = {
    mode: 'private_room',
    difficulty,
    problem_type: problemType,
  };
  
  const response = await duelsApiService.createDuel(duelData);
  // The backend would need to generate and return a room_code here.
  // We'll simulate this part on the frontend for now.
  const simulatedResponse = {
    ...response,
    room_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
  };

  return simulatedResponse;
};

export const joinPrivateRoom = async (roomCode: string): Promise<DuelResponse> => {
  console.log(`Attempting to join private room with code: ${roomCode}`);
  // This will require a new backend endpoint, e.g., POST /duels/join/{roomCode}
  // This is a placeholder implementation.
  throw new Error("Joining private rooms is not yet supported by the backend.");
};

export const quickDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  console.log(`Finding quick duel with difficulty: ${difficulty}`);
  // This should call a matchmaking endpoint. find_or_create_duel seems to be for specific problems.
  // This is a placeholder.
  const duelData: DuelJoinRequest = {
    difficulty,
  };
  return await duelsApiService.joinDuel(duelData);
};

export const aiDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  console.log(`Starting AI duel with difficulty: ${difficulty}`);
  // This is a placeholder as createAIDuel requires more specific settings.
  // We'll use some defaults.
  const settings: AIDuelCreateRequest = {
    user_id: null, // User ID should be filled by the caller
    theme: 'algorithms',
    difficulty,
    language: 'python'
  };
  return createAIDuel(settings);
}; 