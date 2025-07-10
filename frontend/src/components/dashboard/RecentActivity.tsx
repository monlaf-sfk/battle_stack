import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { duelsApiService } from '../../services/api'; // Corrected import path
import type { MatchHistoryItem } from '../../services/api'; // Corrected import path
import { 
  Clock, 
  Trophy, 
  Target, 
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RecentActivity: React.FC = () => {
  const [recentDuels, setRecentDuels] = useState<MatchHistoryItem[]>([]); // Changed type to MatchHistoryItem[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from public duels endpoint
        const response = await duelsApiService.getRecentMatches(5);
        const publicMatches = response.data; // Access .data property
        
        // Transform the data to match RecentDuel interface
        const transformedDuels = Array.isArray(publicMatches) ? publicMatches.map((item: MatchHistoryItem) => ({
          id: item.duel_id, // Use duel_id for the key
          duel_id: item.duel_id,
          opponent_name: item.opponent_name,
          is_victory: item.is_victory,
          // solve_time: item.solve_time, // This property is not in MatchHistoryItem, consider adding if needed in backend
          problem_title: item.problem_title,
          rating_change: item.rating_change,
          played_at: item.played_at
        })) : [];
        
        setRecentDuels(transformedDuels);
      } catch (err) {
        console.error('Failed to fetch recent activity:', err);
        setError(t('dashboard.failedToLoadRecentActivity'));
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, [t]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return t('common.timeAgoMinutes', { count: diffMins });
    } else if (diffHours < 24) {
      return t('common.timeAgoHours', { count: diffHours });
    } else {
      return t('common.timeAgoDays', { count: diffDays });
    }
  };

  const getRatingChangeColor = (change?: number | null) => {
    if (change === null || change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getRatingChangeIcon = (change?: number | null) => {
    if (change === null || change === undefined || change === 0) return <Minus size={12} className="mr-1" />;
    return change > 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />;
  };

  if (loading) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock size={20} className="text-arena-accent" />
            {t('dashboard.recentActivityTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-arena-surface/30 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock size={20} className="text-arena-accent" />
            {t('dashboard.recentActivityTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-arena-text-muted">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentDuels.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-arena-accent" />
              {t('dashboard.recentDuels')}
            </div>
            <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
              {t('dashboard.globalActivity')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm">
              {t('dashboard.noRecentDuels')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-arena-accent" />
            {t('dashboard.recentDuels')}
          </div>
          <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
            {t('dashboard.globalActivity')}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {recentDuels.map((duel, index) => (
            <motion.div
              key={duel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden border border-arena-border rounded-lg p-4 hover:border-arena-accent/40 transition-all duration-200 bg-arena-surface/20 hover:bg-arena-surface/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    duel.is_victory 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {duel.is_victory ? (
                      <Trophy size={16} />
                    ) : (
                      <Target size={16} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-white truncate">
                        {t('dashboard.vs')} {duel.opponent_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        duel.is_victory 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {duel.is_victory ? t('dashboard.victory') : t('dashboard.defeat')}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 truncate">
                      {duel.problem_title}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      
                      {duel.rating_change !== null && duel.rating_change !== undefined && (
                        <div className={`flex items-center ${getRatingChangeColor(duel.rating_change)}`}>
                          {getRatingChangeIcon(duel.rating_change)}
                          {Math.abs(duel.rating_change)} {t('dashboard.elo')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="mr-1" />
                        {formatTimeAgo(duel.played_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <ChevronRight 
                  size={16} 
                  className="text-gray-600 group-hover:text-white transition-colors" 
                />
              </div>
            </motion.div>
          ))}
        </div>
        
        {recentDuels.length >= 5 && (
          <div className="mt-4 text-center">
            <button className="text-xs text-arena-accent hover:underline transition-colors">
              {t('dashboard.viewAllActivity')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 