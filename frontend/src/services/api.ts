import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { SubmissionResponse } from './codeExecutionService'; // Import SubmissionResponse
import type { DuelResponse } from './duelService';

const authApi = axios.create({
  baseURL: '/api/v1/auth',
});

const userApi = axios.create({
  baseURL: '/api/v1/users',
});

const problemsApi = axios.create({
  baseURL: '/api/v1/problems',
});

const duelsApi = axios.create({
  baseURL: '/api/v1/duels',
});

// Add auth token to requests
const addAuthInterceptor = (api: AxiosInstance) => {
  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

addAuthInterceptor(authApi);
addAuthInterceptor(userApi);
addAuthInterceptor(problemsApi);
addAuthInterceptor(duelsApi); // Make sure duelsApi is added to interceptors

// Helper to transform duel response to include problem object
const transformDuelResponse = (duelData: DuelResponse): DuelResponse => {
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
};

export interface DailyActivity {
  date: string;
  count: number;
}

// Dashboard API endpoints
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      return await userApi.get('/dashboard/stats');
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },
  
  // Get user achievements
  getAchievements: async () => {
    try {
      return await userApi.get('/achievements');
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      throw error;
    }
  },
  
  // Get AI recommendations
  getRecommendations: async () => {
    try {
      return await userApi.get('/recommendations');
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      throw error;
    }
  },
  
  // Update progress for a category
  updateProgress: async (category: string, progress: number) => {
    return await userApi.post(`/progress/${category}?progress=${progress}`);
  },
  
  // Update user statistics
  updateStats: async (stats: {
    tasks_completed?: number;
    current_streak?: number;
    successful_duels?: number;
    total_duels?: number;
    tournaments_won?: number;
  }) => {
    return await userApi.post('/stats/update', null, { params: stats });
  },
  
  // Add achievement
  addAchievement: async (name: string, description: string, icon: string = 'award') => {
    return await userApi.post(`/achievements/add?achievement_name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&icon=${icon}`);
  },
  
  // Get news feed
  getNews: async () => {
    return await userApi.get('/news');
  },
  
  getDailyActivity: async (year?: number): Promise<{ data: DailyActivity[] }> => {
    const params = year ? `?year=${year}` : '';
    return await userApi.get(`/activity/streak${params}`);
  },
  
  // Get roadmap events
  getRoadmap: async () => {
    return await userApi.get('/roadmap');
  },
  
  // Get recent duels
  // This function is being replaced by duelsApiService.getPublicRecentMatches
  // getRecentDuels: async () => {
  //   const response = await userApi.get('/duels/recent');
  //   return response.data;
  // },
};

// Problems API endpoints - NO MORE MOCK FALLBACKS
export const problemsApiService = {
  // Get problems list
  getProblems: async (filters?: {
    difficulty?: string;
    type?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    
    return await problemsApi.get(`/problems?${params.toString()}`);
  },
  
  // Get problem by slug
  getProblem: async (slug: string) => {
    return await problemsApi.get(`/problems/${slug}`);
  },
  
  // Run tests for a problem
  runTests: async (slug: string, language: string, code: string): Promise<SubmissionResponse> => {
    const response = await problemsApi.post<SubmissionResponse>(`/problems/${slug}/run`, {
      language,
      code
    });
    return response.data; // Return only the data
  },
  
  // Submit solution
  submitSolution: async (slug: string, language: string, code: string): Promise<SubmissionResponse> => {
    const response = await problemsApi.post<SubmissionResponse>(`/problems/${slug}/submit`, {
      language,
      code
    });
    return response.data; // Return only the data
  },

  // Get random problem
  getRandomProblem: async () => {
    const response = await problemsApi.get('/problems/random');
    return response.data;
  }
};

// Duels API endpoints
export const duelsApiService = {
  // Get player statistics
  getPlayerStats: async () => {
    return await duelsApi.get('/stats/me');
  },
  
  // Get leaderboard
  getLeaderboard: async (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return await duelsApi.get(`/leaderboard?${params.toString()}`);
  },
  
  // Get duel history
  getHistory: async () => {
    return await duelsApi.get('/history');
  },
  
  // Get recent matches (public)
  getRecentMatches: async (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return await duelsApi.get(`/matches/recent?${params.toString()}`);
  },
  
  // Get public leaderboard
  getPublicLeaderboard: async () => {
    return await duelsApi.get('/leaderboard');
  },

  // Join matchmaking
  joinMatchmaking: async (problemId: string, userId: string) => {
    return await duelsApi.post('/matchmaking/join', null, {
      params: {
        problem_id: problemId,
        current_user_id: userId,
      }
    });
  },

  // Start AI opponent for a duel
  startAiOpponent: async (duelId: string) => {
    return await duelsApi.post(`/${duelId}/start-ai`);
  },

  // Get duel by ID
  getDuel: async (duelId: string) => {
    const response = await duelsApi.get(`/${duelId}`);
    return transformDuelResponse(response.data);
  },

  // Submit solution for a duel
  submitSolution: async (duelId: string, submission: { player_id: string; language: string; code: string; }) => {
    const response = await duelsApi.post(`/${duelId}/submit`, submission);
    return response.data;
  },

  // Test code against public tests for a duel
  testCode: async (
    duelId: string,
    submission: { code: string; language: string }
  ) => {
    const response = await duelsApi.post(
      `/${duelId}/run-public-tests`,
      submission
    );
    return response.data;
  },

  // Get active or waiting duel for a user
  getDuelForUser: async (userId: string) => {
    try {
      const response = await duelsApi.get(`/user/${userId}/active-or-waiting`);
      return transformDuelResponse(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null; // No active duel found
      }
      throw error;
    }
  },

  // Create an AI duel with custom settings
  createAIDuel: async (request: any) => { // Using `any` for now, will be defined in duelService.ts
    const response = await duelsApi.post('/ai-duel-custom', request);
    return transformDuelResponse(response.data);
  },

  // Create a private room duel
  createPrivateRoom: async (userId: string, difficulty: any, category: string) => {
    const response = await duelsApi.post('/rooms', {
      user_id: userId,
      difficulty,
      category,
    });
    return response.data;
  },

  // Join a private room
  joinRoom: async (roomCode: string, userId: string) => {
    const response = await duelsApi.post('/rooms/join', { room_code: roomCode, user_id: userId });
    return response.data;
  },
};

// Auth API endpoints
export const authApiService = {
  // Register user
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) => {
    return await authApi.post('/register', userData);
  },
  
  // Check username availability
  checkUsernameAvailability: async (username: string) => {
    return await authApi.get(`/check-username?username=${username}`);
  },

  // Check email availability
  checkEmailAvailability: async (email: string) => {
    return await authApi.get(`/check-email?email=${email}`);
  },
  
  // Login user
  login: async (username: string, password: string, rememberMe: boolean = false) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const url = rememberMe ? '/token?remember_me=true' : '/token';
    
    return await authApi.post(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  
  // Refresh token
  refreshToken: async (refreshToken: string) => {
    return await authApi.post('/refresh', {
      refresh_token: refreshToken
    });
  },
  
  // Get current user
  getCurrentUser: async () => {
    return await authApi.get('/me');
  },

  // Update username
  updateUsername: async (username: string) => {
    return await authApi.patch('/me', { username });
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    return await authApi.post('/change-password', { old_password: oldPassword, new_password: newPassword });
  },

  // Google OAuth Login
  googleLogin: async (credential: string) => {
    return await authApi.post('/google', { credential });
  },
};

// Type definitions
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface DashboardStats {
  tasks_completed: number;
  current_streak: number;
  successful_duels: number;
  total_duels: number;
  tournaments_won: number;
  hours_coded: number;
  elo_rating: number;
  progress_data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export interface Achievement {
  id: string;
  name: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  details: string;
  icon: string;
  earned_at?: string;
}

export interface AIRecommendation {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_time: string;
  improvement: string;
}

export interface NewsItem {
  title: string;
  description: string;
  type: string;
  icon: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: string;
  category?: string;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  hints?: string[];
  test_cases?: TestCase[];
  code_templates?: CodeTemplate[];
  starter_code?: Record<string, string>;
  tags: Tag[];
  companies: Company[];
  submission_stats?: {
    total_submissions: number;
    acceptance_rate: number;
    user_solved: boolean;
  };
}

export interface TestCase {
  input_data: string;
  expected_output: string;
  explanation?: string;
  is_example?: boolean;
}

export interface CodeTemplate {
  language: string;
  template_code: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface TestResult {
  input_data: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  runtime_ms?: number;
  memory_mb?: number;
  error?: string;
}

// User profile API
export const profileApi = {
  // Get current user profile
  getProfile: () => userApi.get('/profile/me'),
  
  // Get public user profile
  getPublicProfile: (username: string) => userApi.get(`/profile/${username}`),
};

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  full_name: string;
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
  rating_change: number | null;
  problem_title: string;
  played_at: string;
}

// export interface Recommendation {
//   title: string;
//   description: string;
//   difficulty: 'Easy' | 'Medium' | 'Hard';
//   estimated_time: string;
//   improvement: string;
// }

export { authApi, userApi, problemsApi, duelsApi };
