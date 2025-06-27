import axios from 'axios';

// Base API configuration for problems service
const problemsApi = axios.create({
  baseURL: 'http://127.0.0.1:8003', // Problems service port
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
problemsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types and interfaces for problems
export type ProblemDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ProblemCategory = 'algorithm' | 'data_structure' | 'dynamic_programming' | 'graph' | 'string' | 'array' | 'tree' | 'math';
export type ProblemStatus = 'not_attempted' | 'attempted' | 'solved';

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: ProblemCategory;
  tags: string[];
  starter_code: Record<string, string>;
  test_cases: TestCase[];
  constraints?: string;
  hints?: string[];
  solution_explanation?: string;
  time_limit: number;
  memory_limit: number;
  created_at: string;
  updated_at: string;
  
  // User-specific data
  status?: ProblemStatus;
  user_attempts?: number;
  best_submission?: {
    id: string;
    code: string;
    language: string;
    execution_time_ms: number;
    memory_usage_mb: number;
    submitted_at: string;
  };
}

export interface ProblemSubmission {
  code: string;
  language: string;
}

export interface SubmissionResult {
  id: string;
  problem_id: string;
  user_id: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
  score: number;
  execution_time_ms?: number;
  memory_usage_mb?: number;
  test_results: Array<{
    test_case_id: string;
    status: 'passed' | 'failed' | 'error';
    execution_time_ms: number;
    memory_usage_mb: number;
    input: string;
    expected_output: string;
    actual_output?: string;
    error_message?: string;
  }>;
  submitted_at: string;
  judged_at?: string;
}

export interface ProblemFilters {
  difficulty?: ProblemDifficulty[];
  category?: ProblemCategory[];
  tags?: string[];
  status?: ProblemStatus[];
  search?: string;
}

export interface ProblemList {
  problems: Problem[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserProblemStats {
  total_problems: number;
  solved_problems: number;
  attempted_problems: number;
  solve_rate: number;
  difficulty_breakdown: Record<ProblemDifficulty, {
    solved: number;
    total: number;
  }>;
  category_breakdown: Record<ProblemCategory, {
    solved: number;
    total: number;
  }>;
  recent_submissions: SubmissionResult[];
  favorite_language: string;
  total_submission_time_ms: number;
  average_attempts_per_problem: number;
}

// Problems API Service
export const problemsApiService = {
  // Get all problems with filtering and pagination
  async getProblems(
    filters: ProblemFilters = {},
    page: number = 1,
    perPage: number = 20
  ): Promise<ProblemList> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    // Add filters to params
    if (filters.difficulty?.length) {
      filters.difficulty.forEach(d => params.append('difficulty', d));
    }
    if (filters.category?.length) {
      filters.category.forEach(c => params.append('category', c));
    }
    if (filters.tags?.length) {
      filters.tags.forEach(t => params.append('tags', t));
    }
    if (filters.status?.length) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    const response = await problemsApi.get(`/api/v1/problems?${params}`);
    return response.data;
  },

  // Get a specific problem by ID
  async getProblem(problemId: string): Promise<Problem> {
    const response = await problemsApi.get(`/api/v1/problems/${problemId}`);
    return response.data;
  },

  // Submit solution for a problem
  async submitSolution(problemId: string, submission: ProblemSubmission): Promise<SubmissionResult> {
    const response = await problemsApi.post(`/api/v1/problems/${problemId}/submit`, submission);
    return response.data;
  },

  // Test solution without submitting (run on visible test cases only)
  async testSolution(problemId: string, submission: ProblemSubmission): Promise<{
    passed: number;
    failed: number;
    total_tests: number;
    execution_time_ms: number;
    test_results: Array<{
      test_case: number;
      status: 'passed' | 'failed';
      execution_time_ms: number;
      input: string;
      expected: string;
      actual: string;
      error?: string;
    }>;
  }> {
    const response = await problemsApi.post(`/api/v1/problems/${problemId}/test`, submission);
    return response.data;
  },

  // Get submission by ID
  async getSubmission(submissionId: string): Promise<SubmissionResult> {
    const response = await problemsApi.get(`/api/v1/submissions/${submissionId}`);
    return response.data;
  },

  // Get user's submissions for a problem
  async getUserSubmissions(
    problemId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<SubmissionResult[]> {
    const response = await problemsApi.get(
      `/api/v1/problems/${problemId}/submissions?limit=${limit}&offset=${offset}`
    );
    return response.data;
  },

  // Get user's overall problem-solving statistics
  async getUserStats(): Promise<UserProblemStats> {
    const response = await problemsApi.get('/api/v1/problems/stats/me');
    return response.data;
  },

  // Get random problem by difficulty
  async getRandomProblem(difficulty?: ProblemDifficulty): Promise<Problem> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    const response = await problemsApi.get(`/api/v1/problems/random${params}`);
    return response.data;
  },

  // Get problem recommendations based on user's history
  async getRecommendedProblems(limit: number = 5): Promise<Problem[]> {
    const response = await problemsApi.get(`/api/v1/problems/recommended?limit=${limit}`);
    return response.data;
  },

  // Get problem tags
  async getProblemTags(): Promise<string[]> {
    const response = await problemsApi.get('/api/v1/problems/tags');
    return response.data;
  },

  // Bookmark/unbookmark a problem
  async toggleBookmark(problemId: string): Promise<{ bookmarked: boolean }> {
    const response = await problemsApi.post(`/api/v1/problems/${problemId}/bookmark`);
    return response.data;
  },

  // Get bookmarked problems
  async getBookmarkedProblems(): Promise<Problem[]> {
    const response = await problemsApi.get('/api/v1/problems/bookmarks');
    return response.data;
  },

  // Search problems
  async searchProblems(query: string, filters: ProblemFilters = {}): Promise<Problem[]> {
    const params = new URLSearchParams({ search: query });
    
    if (filters.difficulty?.length) {
      filters.difficulty.forEach(d => params.append('difficulty', d));
    }
    if (filters.category?.length) {
      filters.category.forEach(c => params.append('category', c));
    }
    
    const response = await problemsApi.get(`/api/v1/problems/search?${params}`);
    return response.data;
  }
};

// Utility functions
export const getDifficultyColor = (difficulty: ProblemDifficulty): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'hard': return 'text-orange-500';
    case 'expert': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export const getDifficultyBadgeColor = (difficulty: ProblemDifficulty): string => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'hard': return 'bg-orange-100 text-orange-800';
    case 'expert': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getCategoryIcon = (category: ProblemCategory): string => {
  switch (category) {
    case 'algorithm': return '🧮';
    case 'data_structure': return '🏗️';
    case 'dynamic_programming': return '⚡';
    case 'graph': return '🕸️';
    case 'string': return '📝';
    case 'array': return '📋';
    case 'tree': return '🌳';
    case 'math': return '🔢';
    default: return '💻';
  }
};

export const getStatusColor = (status: ProblemStatus): string => {
  switch (status) {
    case 'solved': return 'text-green-500';
    case 'attempted': return 'text-yellow-500';
    case 'not_attempted': return 'text-gray-500';
    default: return 'text-gray-500';
  }
};

export const formatExecutionTime = (timeMs: number): string => {
  if (timeMs < 1000) {
    return `${timeMs}ms`;
  }
  return `${(timeMs / 1000).toFixed(2)}s`;
};

export const formatMemoryUsage = (memoryMb: number): string => {
  if (memoryMb < 1) {
    return `${(memoryMb * 1024).toFixed(1)}KB`;
  }
  return `${memoryMb.toFixed(1)}MB`;
};

// Constants
export const PROBLEM_DIFFICULTIES: ProblemDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const PROBLEM_CATEGORIES: ProblemCategory[] = [
  'algorithm', 'data_structure', 'dynamic_programming', 'graph', 'string', 'array', 'tree', 'math'
];
export const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'cpp'] as const;

export const DIFFICULTY_LABELS: Record<ProblemDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

export const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  algorithm: 'Algorithm',
  data_structure: 'Data Structure',
  dynamic_programming: 'Dynamic Programming',
  graph: 'Graph',
  string: 'String',
  array: 'Array',
  tree: 'Tree',
  math: 'Math'
};

export default problemsApiService; 