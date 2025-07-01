import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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
addAuthInterceptor(duelsApi);

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
  runTests: async (slug: string, language: string, code: string) => {
    return await problemsApi.post(`/problems/${slug}/run`, {
      language,
      code
    });
  },
  
  // Submit solution
  submitSolution: async (slug: string, language: string, code: string) => {
    return await problemsApi.post(`/problems/${slug}/submit`, {
      language,
      code
    });
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
  getLeaderboard: async () => {
    return await duelsApi.get('/leaderboard');
  },
  
  // Get duel history
  getHistory: async () => {
    return await duelsApi.get('/history');
  },
  
  // Get recent matches (public)
  getRecentMatches: async () => {
    const publicDuelsApi = axios.create({
      baseURL: '/api/v1/duels',
    });
    return await publicDuelsApi.get('/recent-matches');
  },
  
  // Get public leaderboard
  getPublicLeaderboard: async () => {
    const publicDuelsApi = axios.create({
      baseURL: '/api/v1/duels',
    });
    return await publicDuelsApi.get('/leaderboard');
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
    return await duelsApi.get(`/${duelId}`);
  }
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
  progress_data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export interface Achievement {
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

export interface Duel {
  id: string;
  problem_id: string;
  status: 'pending' | 'in_progress' | 'finished' | 'cancelled' | 'error';
  player_one_id: string;
  player_two_id?: string;
  player_one_code?: string;
  player_two_code?: string;
  results?: any;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface Recommendation {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_time: string;
  improvement: string;
}

export { authApi, userApi, problemsApi, duelsApi };
