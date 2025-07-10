import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { duelsApiService } from '../../services/api';
import type { LeaderboardEntry } from '../../services/api';
import { 
  Crown, 
  Trophy, 
  Medal, 
  Users,
  Star,
  ChevronRight,
  Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LeaderboardMini: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yourRank] = useState<number | null>(null);
  const { t } = useTranslation();

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await duelsApiService.getLeaderboard(5);
      setLeaderboard(response.data || []);
    } catch (err: any) {
      let message = t('dashboard.failedToLoadLeaderboard');
      if (err?.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail;
        message = `${t('dashboard.errorColon')}${status}: ${detail || err.message}`;
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
        return 'bg-yellow-400/20 text-yellow-400';
      case 2:
        return 'bg-gray-400/20 text-gray-400';
      case 3:
        return 'bg-amber-600/20 text-amber-500';
      default:
        return 'bg-gray-700/20 text-gray-400';
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
            {t('dashboard.topCodersTitle')}
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
            {t('dashboard.topCodersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm mb-2">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="text-arena-accent hover:text-arena-accent-hover transition-colors"
            >
              {t('common.tryAgain')}
            </button>
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
            {t('dashboard.topCodersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="mx-auto mb-3 text-arena-text-muted" size={32} />
            <p className="text-arena-text-muted text-sm">
              {t('dashboard.noRankingsYet')}
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
            {t('dashboard.topCodersTitle')}
          </div>
          {yourRank && (
            <span className="text-xs text-arena-text-muted bg-arena-surface/50 px-2 py-1 rounded">
              {t('common.you')}: #{yourRank}
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
              className="group relative flex items-center justify-between rounded-lg p-3 transition-all duration-200 bg-gray-900/50 hover:bg-gray-800/60"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${getRankBadgeColor(player.rank)}`}>
                  {getRankIcon(player.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">
                    {player.username}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <div className="flex items-center gap-1" title={t('leaderboardsPage.elo') as string}>
                      <Award size={12} />
                      <span>{player.elo_rating}</span>
                    </div>
                    <div className="flex items-center gap-1" title={t('leaderboardsPage.winRate') as string}>
                      <Trophy size={12} />
                      <span>{formatWinRate(player.win_rate)}</span>
                    </div>
                    <div className="flex items-center gap-1" title={t('leaderboardsPage.streak') as string}>
                      <Star size={12} />
                      <span>{player.current_streak}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`text-sm font-bold ${getRankBadgeColor(player.rank)} p-1 rounded-md`}>
                #{player.rank}
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4">
          <button className="w-full text-center text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 font-semibold">
            <span>{t('dashboard.viewFullLeaderboard')}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderboardMini; 