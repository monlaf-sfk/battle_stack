import axios from 'axios';

// Base API configuration for duel service
const duelsApi = axios.create({
  baseURL: 'http://127.0.0.1:8004/api/v1/duels', // Include the full prefix in base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
duelsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create a silent API client for optional authenticated requests
const silentDuelsApi = axios.create({
  baseURL: 'http://127.0.0.1:8004/api/v1/duels',
  headers: {
    'Content-Type': 'application/json',
  },
  // Suppress axios error logging
  validateStatus: (status) => status < 500, // Don't throw for 4xx errors
});

// Public duels API for unauthenticated endpoints
const publicDuelsApi = axios.create({
  baseURL: 'http://127.0.0.1:8004/api/v1/public/duels',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to silent requests
silentDuelsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors gracefully
duelsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // For 401 errors, create a cleaner error without axios noise
    if (error.response?.status === 401) {
      const cleanError = new Error('Authentication required');
      Object.assign(cleanError, { response: { status: 401 } });
      return Promise.reject(cleanError);
    }
    return Promise.reject(error);
  }
);

// Types and interfaces for duels
export type DuelMode = 'random_player' | 'private_room' | 'ai_opponent';
export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ProblemType = 'algorithm' | 'data_structure' | 'dynamic_programming' | 'graph' | 'string' | 'array' | 'tree' | 'math';
export type DuelStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'joined' | 'ready' | 'coding' | 'finished' | 'disconnected';
export type Language = 'python' | 'javascript' | 'java' | 'cpp';

export interface DuelParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  rating: number;
  status: ParticipantStatus;
  joined_at: string;
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

export interface DuelProblem {
  id: string;
  title: string;
  description: string;
  difficulty: DuelDifficulty;
  problem_type: ProblemType;
  starter_code: Record<string, string>;
  test_cases: Array<{
    input: string;
    output: string;
    is_hidden: boolean;
  }>;
  constraints?: string;
  hints?: string[];
  times_used?: number;
  average_solve_time?: number;
  success_rate?: number;
  created_at?: string;
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
}

export interface DuelCreateRequest {
  mode: DuelMode;
  difficulty: DuelDifficulty;
  problem_type: ProblemType;
  room_code?: string;
  time_limit_minutes?: number;
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
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>;
}

export interface SubmissionResponse {
  id: string;
  score: number;
  tests_passed: number;
  total_tests: number;
  execution_time_ms: number;
  memory_usage_mb: number;
  is_winner: boolean;
  duel_completed: boolean;
  rating_change?: number;
}

export interface WebSocketMessage {
  type: 'code_update' | 'typing_status' | 'test_result' | 'submission_result' | 'user_joined' | 'user_left' | 'duel_completed' | 'ping' | 'pong';
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Add missing interfaces for leaderboard and match history
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

// Add PlayerStats interface
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

// Helper function to check if JWT token is valid and not expired
function isTokenValid(token: string | null): boolean {
  if (!token) {
    return false;
  }
  
  try {
    // Parse JWT payload without verification (we just need to check expiration)
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return false;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (with 30 second buffer for clock skew)
    return payload.exp && payload.exp > (currentTime + 30);
  } catch (error) {
    console.debug('Token validation error:', error);
    return false;
  }
}

// Request deduplication cache
const requestCache = new Map<string, Promise<{ data: PlayerStats }>>();

// API Service methods
export const duelsApiService = {
  // Create a new duel
  async createDuel(request: DuelCreateRequest): Promise<DuelResponse> {
    const response = await duelsApi.post('/create', request);
    return response.data;
  },

  // Join an existing duel or create one if none available
  async joinDuel(request?: DuelJoinRequest): Promise<DuelResponse> {
    const response = await duelsApi.post('/join', request || {});
    return response.data;
  },

  // Cancel a waiting duel
  async cancelDuel(duelId?: string): Promise<{ message: string }> {
    const payload = duelId ? { duel_id: duelId } : {};
    const response = await duelsApi.post('/cancel', payload);
    return response.data;
  },

  // Get active duel for current user
  async getActiveDuel(): Promise<DuelResponse> {
    const response = await duelsApi.get('/active');
    return response.data;
  },

  // Get active or waiting duel (for page refresh recovery)
  async getActiveOrWaitingDuel(): Promise<DuelResponse | null> {
    try {
      const response = await duelsApi.get('/active-or-waiting');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Get specific duel by ID
  async getDuel(duelId: string): Promise<DuelResponse> {
    const response = await duelsApi.get(`/${duelId}`);
    return response.data;
  },

  // Submit solution
  async submitCode(duelId: string, submission: CodeSubmission): Promise<SubmissionResponse> {
    const response = await duelsApi.post(`/${duelId}/submit`, submission);
    return response.data;
  },

  // Test solution without submitting
  async testCode(duelId: string, submission: CodeSubmission): Promise<TestResultResponse> {
    const response = await duelsApi.post(`/${duelId}/test-code`, submission);
    return response.data;
  },

  // Leave a duel
  async leaveDuel(duelId: string): Promise<void> {
    await duelsApi.post(`/${duelId}/leave`);
  },

  // Get duel history
  async getDuelHistory(limit: number = 10, offset: number = 0): Promise<{
    duels: DuelResponse[];
    total: number;
  }> {
    const response = await duelsApi.get(`/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get user stats
  async getUserStats(): Promise<{
    total_duels: number;
    wins: number;
    losses: number;
    win_rate: number;
    current_rating: number;
    rating_change_today: number;
    avg_completion_time: number;
    favorite_language: string;
  }> {
    const response = await duelsApi.get('/stats/me');
    const stats = response.data;
    
    // Transform backend response to match frontend expectations
    return {
      total_duels: stats.rating?.total_duels || 0,
      wins: stats.rating?.wins || 0,
      losses: stats.rating?.losses || 0,
      win_rate: stats.rating?.win_rate || 0,
      current_rating: stats.rating?.elo_rating || 1200,
      rating_change_today: 0, // Calculate based on recent matches
      avg_completion_time: stats.rating?.average_solve_time || 0,
      favorite_language: 'python' // Default favorite language
    };
  },

  // Create WebSocket connection
  createWebSocketConnection(duelId: string): WebSocket {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    const wsUrl = `ws://127.0.0.1:8004/api/v1/duels/ws/${duelId}?token=${token}`;
    return new WebSocket(wsUrl);
  },

  // Get leaderboard
  async getLeaderboard(limit: number = 10, offset: number = 0): Promise<{
    data: {
      entries: LeaderboardEntry[];
      your_rank?: number;
    };
    total_players: number;
  }> {
    const response = await publicDuelsApi.get(`/leaderboard?limit=${limit}&offset=${offset}`);
    return { 
      data: { 
        entries: response.data.entries,
        your_rank: response.data.your_rank 
      },
      total_players: response.data.total_players 
    };
  },

  // Get match history
  async getMatchHistory(limit: number = 10, offset: number = 0): Promise<{
    data: MatchHistoryItem[];
    total: number;
  }> {
    try {
      // Try authenticated endpoint first
      const response = await duelsApi.get(`/history?limit=${limit}&offset=${offset}`);
      return { data: response.data, total: response.data.length };
    } catch {
      // If authentication fails, return empty history
      console.warn('Failed to fetch authenticated history, returning empty history');
      return { data: [], total: 0 };
    }
  },

  // Get recent matches across all users (public)
  async getPublicRecentMatches(limit: number = 10, offset: number = 0): Promise<MatchHistoryItem[]> {
    const response = await publicDuelsApi.get(`/recent-matches?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get player statistics including rating, achievements, and recent matches
  async getPlayerStats(): Promise<{ data: PlayerStats }> {
    const cacheKey = 'player-stats';
    
    // Check if there's already a pending request
    if (requestCache.has(cacheKey)) {
      return requestCache.get(cacheKey)!;
    }

    // Get current token and check if it's valid
    const token = localStorage.getItem('token');
    if (!isTokenValid(token)) {
      console.debug('Token invalid or expired, user needs to log in');
      
      // Clear invalid token
      if (token) {
        localStorage.removeItem('token');
      }
      
      const authError = new Error('Authentication required - token expired');
      Object.assign(authError, { response: { status: 401 } });
      throw authError;
    }

    // Create the request promise
    const requestPromise = (async (): Promise<{ data: PlayerStats }> => {
      try {
        // Use fetch API to avoid console logging for 401 errors
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        
        const response = await fetch('http://127.0.0.1:8004/api/v1/duels/stats/me', {
          method: 'GET',
          headers,
        });
        
        // Check for authentication error
        if (response.status === 401) {
          console.debug('Received 401, token is invalid on server side');
          
          // Clear invalid token
          localStorage.removeItem('token');
          const authError = new Error('Authentication required - server rejected token');
          Object.assign(authError, { response: { status: 401 } });
          throw authError;
        }
        
        // Check for other errors
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return { data };
      } finally {
        // Remove from cache when request completes (success or failure)
        requestCache.delete(cacheKey);
      }
    })();

    // Cache the request promise
    requestCache.set(cacheKey, requestPromise);
    
    return requestPromise;
  }
};

// WebSocket message helpers
export const createCodeUpdateMessage = (userId: string, code: string, language: string): WebSocketMessage => ({
  type: 'code_update',
  user_id: userId,
  data: { code, language },
  timestamp: new Date().toISOString()
});

export const createTypingStatusMessage = (userId: string, isTyping: boolean): WebSocketMessage => ({
  type: 'typing_status',
  user_id: userId,
  data: { is_typing: isTyping },
  timestamp: new Date().toISOString()
});

export const createTestCodeMessage = (userId: string, code: string, language: string): WebSocketMessage => ({
  type: 'test_result',
  user_id: userId,
  data: { code, language },
  timestamp: new Date().toISOString()
});

export const createPingMessage = (userId: string): WebSocketMessage => ({
  type: 'ping',
  user_id: userId,
  data: {},
  timestamp: new Date().toISOString()
});

// Quick duel functionality
export const quickDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  try {
    // Try to join an existing duel first
    return await duelsApiService.joinDuel({ difficulty });
  } catch {
    // If no duel available, create a new one
    return await duelsApiService.createDuel({
      mode: 'random_player',
      difficulty,
      problem_type: 'algorithm'
    });
  }
};

export const aiDuel = async (difficulty: DuelDifficulty = 'medium'): Promise<DuelResponse> => {
  // 🧹 Clear any cached duel data before creating new AI duel
  console.log('🤖 Creating new AI duel, clearing cached data...');
  
  // Clear any saved code from completed duels
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('duel_code_')) {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared cached code: ${key}`);
    }
  });
  
  // Clear player stats cache to force refresh
  requestCache.clear();
  
  try {
    // First check if there's an active duel, if so cancel it (safety measure)
    try {
      const activeOrWaiting = await duelsApiService.getActiveOrWaitingDuel();
      if (activeOrWaiting && (activeOrWaiting.status === 'completed' || activeOrWaiting.status === 'cancelled')) {
        console.log(`🧹 Found ${activeOrWaiting.status} duel ${activeOrWaiting.id}, clearing it...`);
        // Clear any saved code for this completed duel
        localStorage.removeItem(`duel_code_${activeOrWaiting.id}`);
      }
    } catch (error) {
      // No active duel found, which is good for creating a new one
      console.log('✅ No active duel found, ready to create new AI duel');
    }
    
    // Create the new AI duel
    const response = await duelsApi.post('/ai-duel', {
      difficulty,
      problem_type: 'algorithm'
    });
    
    console.log(`🎯 Created new AI duel: ${response.data.id} with problem: ${response.data.problem.title}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating AI duel:', error);
    throw error;
  }
};

export const createPrivateRoom = async (
  difficulty: DuelDifficulty = 'medium',
  problemType: ProblemType = 'algorithm'
): Promise<DuelResponse> => {
  return await duelsApiService.createDuel({
    mode: 'private_room',
    difficulty,
    problem_type: problemType
  });
};

export const joinPrivateRoom = async (roomCode: string): Promise<DuelResponse> => {
  return await duelsApiService.joinDuel({ room_code: roomCode });
};

// Utility functions
export const getDifficultyColor = (difficulty: DuelDifficulty): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'hard': return 'text-orange-500';
    case 'expert': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export const getStatusColor = (status: DuelStatus): string => {
  switch (status) {
    case 'waiting': return 'text-yellow-500';
    case 'in_progress': return 'text-green-500';
    case 'completed': return 'text-blue-500';
    case 'cancelled': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export const formatDuelDuration = (startTime: string, endTime?: string): string => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
  
  if (duration < 60) {
    return `${duration}s`;
  } else if (duration < 3600) {
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  } else {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export const formatRatingChange = (change: number): string => {
  return change > 0 ? `+${change}` : change.toString();
};

export const calculateProgress = (testsPassed: number, totalTests: number): number => {
  return totalTests > 0 ? Math.round((testsPassed / totalTests) * 100) : 0;
};

// Constants
export const DUEL_DIFFICULTIES: DuelDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const PROBLEM_TYPES: ProblemType[] = [
  'algorithm', 'data_structure', 'dynamic_programming', 'graph', 'string', 'array', 'tree', 'math'
];
export const SUPPORTED_LANGUAGES: Language[] = ['python', 'javascript', 'java', 'cpp'];

export const DIFFICULTY_LABELS: Record<DuelDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

export const MODE_LABELS: Record<DuelMode, string> = {
  random_player: 'Random Player',
  private_room: 'Private Room',
  ai_opponent: 'AI Opponent'
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++'
};

export default duelsApiService;