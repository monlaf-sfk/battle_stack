import { useState, useEffect } from 'react';
import { dashboardApi, type DashboardStats, type Achievement, type AIRecommendation } from '../services/api';
import { useToast } from '../components/ui/Toast';

interface DashboardData {
  stats: DashboardStats | null;
  achievements: Achievement[];
  recommendations: AIRecommendation[];
}

interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProgress: (category: string, progress: number) => Promise<void>;
  addAchievement: (name: string, description: string, icon?: string) => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    achievements: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all dashboard data in parallel
      const [statsResponse, achievementsResponse, recommendationsResponse] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAchievements(),
        dashboardApi.getRecommendations(),
      ]);

      setData({
        stats: statsResponse.data,
        achievements: achievementsResponse.data,
        recommendations: recommendationsResponse.data,
      });
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
    fetchDashboardData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    updateProgress,
    addAchievement,
  };
}; 