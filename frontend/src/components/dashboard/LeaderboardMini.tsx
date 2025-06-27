import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { duelsApiService, type LeaderboardEntry } from '../../services/duelService';
import { 
  Crown, 
  Trophy, 
  Medal, 
  TrendingUp, 
  Users,
  Star,
  ChevronRight,
  Award
} from 'lucide-react';

const LeaderboardMini: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yourRank, setYourRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await duelsApiService.getLeaderboard(5, 0);
        setLeaderboard(response.data.entries || []);
        setYourRank(response.data.your_rank || null);
      } catch (err: any) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={16} />;
      case 2:
        return <Trophy className="text-gray-300" size={16} />;
      case 3:
        return <Medal className="text-amber-600" size={16} />;
      default:
        return <Star className="text-arena-text-muted" size={16} />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100';
      default:
        return 'bg-arena-surface/30 text-arena-text-muted';
    }
  };

  const formatWinRate = (winRate: number) => {
    return `${winRate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown size={20} className="text-arena-accent" />
            Top Coders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-arena-surface/30 rounded-lg"></div>
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
            <Crown size={20} className="text-arena-accent" />
            Top Coders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown size={20} className="text-arena-accent" />
            Top Coders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm">
              No rankings yet. Be the first to climb the leaderboard!
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
            <Crown size={20} className="text-arena-accent" />
            Top Coders
          </div>
          {yourRank && (
            <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
              You: #{yourRank}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((player, index) => (
            <motion.div
              key={player.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden border border-arena-border rounded-lg p-3 hover:border-arena-accent/40 transition-all duration-200 bg-arena-surface/10 hover:bg-arena-surface/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getRankBadgeColor(player.rank)}`}>
                    <span className="text-xs font-bold">
                      #{player.rank}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getRankIcon(player.rank)}
                      <span className="font-medium text-sm text-white truncate">
                        {player.username}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-arena-text-muted">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} />
                        {player.elo_rating} ELO
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Trophy size={10} />
                        {formatWinRate(player.win_rate)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Star size={10} />
                        {player.current_streak}
                      </div>
                    </div>
                  </div>
                </div>
                
                <ChevronRight 
                  size={14} 
                  className="text-arena-text-muted group-hover:text-arena-accent transition-colors opacity-0 group-hover:opacity-100" 
                />
              </div>
              
              {/* Rank position indicator */}
              {player.rank <= 3 && (
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[15px] border-l-transparent border-t-[15px] border-t-arena-accent/20"></div>
              )}
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-arena-border">
          <button className="w-full text-center text-xs text-arena-accent hover:text-arena-accent-bright transition-colors flex items-center justify-center gap-1">
            View Full Leaderboard
            <ChevronRight size={12} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderboardMini; 