import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type DashboardStats, type Achievement, type AIRecommendation, type NewsItem, type DailyActivity } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

interface DashboardData {
  stats: DashboardStats | null;
  achievements: Achievement[];
  recommendations: AIRecommendation[];
  newsItems: NewsItem[];
  userRank: number | null;
  dailyActivity: DailyActivity[];
}

interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  activityLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchActivityForYear: (year: number) => Promise<void>;
  updateProgress: (category: string, progress: number) => Promise<void>;
  addAchievement: (name: string, description: string, icon?: string) => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    stats: null,
    achievements: [],
    recommendations: [],
    newsItems: [],
    userRank: null,
    dailyActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentYear = new Date().getFullYear();
      const [statsResponse, achievementsResponse, recommendationsResponse, newsResponse, dailyActivityResponse] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAchievements(),
        dashboardApi.getRecommendations(),
        dashboardApi.getNews(),
        dashboardApi.getDailyActivity(currentYear),
      ]);

      setData(prevData => ({
        ...prevData,
        stats: statsResponse.data,
        achievements: achievementsResponse.data,
        recommendations: recommendationsResponse.data,
        newsItems: newsResponse.data,
        dailyActivity: dailyActivityResponse.data,
      }));
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load dashboard data';
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Dashboard Error',
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchActivityForYear = async (year: number) => {
    try {
      setActivityLoading(true);
      const response = await dashboardApi.getDailyActivity(year);
      setData(prev => ({ ...prev, dailyActivity: response.data }));
    } catch (err: any) {
      console.error(`Failed to fetch activity for year ${year}:`, err);
      addToast({
        type: 'error',
        title: 'Activity Error',
        message: `Failed to load activity data for ${year}.`,
        duration: 5000,
      });
    } finally {
      setActivityLoading(false);
    }
  };
  
  const updateProgress = async (category: string, progress: number) => {
    try {
      await dashboardApi.updateProgress(category, progress);
      
      // Update local state optimistically
      setData(prev => ({
        ...prev,
        stats: prev.stats ? {
          ...prev.stats,
          progress_data: prev.stats.progress_data.map(item => 
            item.name === category ? { ...item, value: progress } : item
          )
        } : null
      }));

      addToast({
        type: 'success',
        title: 'Progress Updated',
        message: `${category} progress updated to ${progress}%`,
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Failed to update progress:', err);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update progress. Please try again.',
        duration: 5000,
      });
    }
  };

  const addAchievement = async (name: string, description: string, icon: string = 'award') => {
    try {
      await dashboardApi.addAchievement(name, description, icon);
      
      // Refetch data to get updated achievements
      await fetchDashboardData();

      addToast({
        type: 'success',
        title: 'Achievement Unlocked!',
        message: `Congratulations! You earned "${name}"`,
        duration: 4000,
      });
    } catch (err: any) {
      console.error('Failed to add achievement:', err);
      addToast({
        type: 'error',
        title: 'Achievement Error',
        message: 'Failed to add achievement. Please try again.',
        duration: 5000,
      });
    }
  };

  const refetch = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  return {
    data,
    loading,
    activityLoading,
    error,
    refetch,
    fetchActivityForYear,
    updateProgress,
    addAchievement,
  };
}; 