import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { duelsApiService } from '../../services/duelService';
import type { MatchHistoryItem } from '../../types/duel.types';
import { 
  Clock, 
  Trophy, 
  Zap, 
  Target, 
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface RecentDuel {
  id: string;
  opponent_name: string;
  is_victory: boolean;
  solve_time?: string;
  problem_title: string;
  rating_change?: number;
  played_at: string;
}

const RecentActivity: React.FC = () => {
  const [recentDuels, setRecentDuels] = useState<RecentDuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from public duels endpoint
        const publicMatches = await duelsApiService.getPublicRecentMatches(5);
        
        // Transform the data to match RecentDuel interface
        const transformedDuels = publicMatches.map((item: MatchHistoryItem) => ({
          id: item.id,
          opponent_name: item.opponent_name,
          is_victory: item.is_victory,
          solve_time: item.solve_time,
          problem_title: item.problem_title,
          rating_change: item.rating_change,
          played_at: item.played_at
        }));
        
        setRecentDuels(transformedDuels);
      } catch (err) {
        console.error('Failed to fetch recent activity:', err);
        setError('Failed to load recent activity');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const getRatingChangeColor = (change?: number) => {
    if (!change || change === 0) return 'text-arena-text-muted';
    return change > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getRatingChangeIcon = (change?: number) => {
    if (!change || change === 0) return <Minus size={12} />;
    return change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  if (loading) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock size={20} className="text-arena-accent" />
            Recent Activity
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
            Recent Activity
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
              Recent Duels
            </div>
            <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
              Global activity
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm">
              No recent duels yet. Be the first to start a coding battle!
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
            Recent Duels
          </div>
          <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
            Global activity
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
                        vs {duel.opponent_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        duel.is_victory 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {duel.is_victory ? 'Victory' : 'Defeat'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-arena-text-muted truncate">
                      {duel.problem_title}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-arena-text-muted">
                      {duel.solve_time && (
                        <div className="flex items-center gap-1">
                          <Zap size={10} />
                          {duel.solve_time}
                        </div>
                      )}
                      
                      {duel.rating_change && (
                        <div className={`flex items-center gap-1 ${getRatingChangeColor(duel.rating_change)}`}>
                          {getRatingChangeIcon(duel.rating_change)}
                          {Math.abs(duel.rating_change)} ELO
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatTimeAgo(duel.played_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <ChevronRight 
                  size={16} 
                  className="text-arena-text-muted group-hover:text-arena-accent transition-colors opacity-0 group-hover:opacity-100" 
                />
              </div>
            </motion.div>
          ))}
        </div>
        
        {recentDuels.length >= 5 && (
          <div className="mt-4 text-center">
            <button className="text-xs text-arena-accent hover:text-arena-accent-bright transition-colors">
              View all activity →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 