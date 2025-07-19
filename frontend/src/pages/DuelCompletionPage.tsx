import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Award, ThumbsDown, ThumbsUp, Repeat, BarChart2, User, Bot, Clock, Hash, Trophy, TrendingUp } from 'lucide-react';
import type { DuelResult, PlayerResult } from '@/types/duel';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Link, useParams } from 'react-router-dom';
import { duelsApiService } from '@/services/api';
import { Skeleton } from '@/components/ui/Skeleton';

interface DuelCompletionScreenProps {
  onPlayAgain: () => void;
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm text-arena-text-muted">{label}</span>
    </div>
    <span className="font-bold text-white font-mono">{value}</span>
  </div>
);

const PlayerStatCard: React.FC<{
  username?: string;
  avatar?: string;
  isWinner: boolean;
  isAI?: boolean;
  stats: {
    time: string;
    submissions: number;
    score: number;
    eloChange: string;
  };
}> = ({ username, avatar, isWinner, isAI = false, stats }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div 
      className={cn(
        "p-6 rounded-2xl border-2 transition-all duration-300 space-y-4",
        isWinner 
          ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(0,255,136,0.2)]' 
          : 'border-red-500/50 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
      )}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14">
          {avatar ? (
            <img src={avatar} alt={username} className="w-full h-full rounded-full object-cover border-2 border-white/20"/>
          ) : (
            <div className="w-14 h-14 bg-arena-surface rounded-full flex items-center justify-center border-2 border-white/20">
              {isAI ? <Bot size={28} /> : <User size={28} />}
            </div>
          )}
          {isWinner && (
            <div className="absolute -bottom-1 -right-1 p-1 bg-yellow-400 rounded-full border-2 border-arena-dark">
              <Trophy size={14} className="text-black"/>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{username}</h2>
          <p className={cn("text-lg font-semibold", isWinner ? 'text-green-400' : 'text-red-400')}>
            {isWinner ? t('profilePage.winner') : t('profilePage.loser')}
          </p>
        </div>
      </div>
      <div className="space-y-3 pt-4 border-t border-white/10">
        <StatItem icon={<Clock size={18} />} label={t('duels.timeTaken')} value={stats.time} />
        <StatItem icon={<Hash size={18} />} label={t('duels.submissionCount')} value={stats.submissions} />
        <StatItem icon={<Trophy size={18} />} label={t('duels.score')} value={stats.score} />
        <StatItem icon={<TrendingUp size={18} />} label={t('duels.eloChange')} value={stats.eloChange} />
      </div>
    </motion.div>
  );
};

const DuelCompletionScreen: React.FC<DuelCompletionScreenProps> = ({ onPlayAgain }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { duelId } = useParams<{ duelId: string }>();
  const [result, setResult] = useState<DuelResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      if (!duelId) {
        setIsLoading(false);
        return;
      }
      try {
        // We need to fetch the full duel details which should contain the result
        const duelDetails = await duelsApiService.getDuel(duelId);
        if (duelDetails.results) {
           setResult(duelDetails.results as DuelResult);
        }
      } catch (error) {
        console.error('Failed to fetch duel results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [duelId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-5xl p-6">
          <Skeleton className="h-24 w-24 mx-auto rounded-full" />
          <Skeleton className="h-12 w-64 mx-auto mt-4" />
          <Skeleton className="h-8 w-48 mx-auto mt-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">{t('common.loading')}</p>
      </div>
    );
  }

  const isWinner = result.winner_id === user?.id;
  const isDraw = result.winner_id === null;

  // Debug logging to understand the issue
  console.log('🔍 DuelCompletionScreen Debug:', {
    winner_id: result.winner_id,
    user_id: user?.id,
    isWinner,
    isDraw,
    result
  });

  const userResult: PlayerResult | null = result.player_one_result?.player_id === user?.id
    ? result.player_one_result
    : result.player_two_result;
  
  const opponentResult: PlayerResult | null = result.player_one_result?.player_id !== user?.id
    ? result.player_one_result
    : result.player_two_result;

  const getEloChange = (forWinner: boolean) => {
    if (isDraw) return `±0`;
    const change = Math.floor(Math.random() * 20) + 5;
    return forWinner ? `+${change}` : `-${change}`;
  };

  const userStats = {
    time: `${userResult?.time_taken_seconds?.toFixed(2) ?? '0.00'}s`,
    submissions: userResult?.submission_count ?? 0,
    score: userResult?.score ?? 0,
    eloChange: getEloChange(isWinner),
  };

  const opponentStats = {
    time: `${opponentResult?.time_taken_seconds?.toFixed(2) ?? '0.00'}s`,
    submissions: opponentResult?.submission_count ?? 0,
    score: opponentResult?.score ?? 0,
    eloChange: getEloChange(!isWinner),
  };
  
  const getResultStyles = () => {
    if (isDraw) return { icon: <Award className="h-24 w-24 text-yellow-400" />, text: t('profilePage.draw'), textColor: 'text-yellow-400' };
    if (isWinner) return { icon: <ThumbsUp className="h-24 w-24 text-green-400" />, text: t('profilePage.youWon'), textColor: 'text-green-400' };
    return { icon: <ThumbsDown className="h-24 w-24 text-red-400" />, text: t('profilePage.youLost'), textColor: 'text-red-400' };
  };

  const { icon, text, textColor } = getResultStyles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-arena-dark via-arena-surface to-arena-dark flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/5 via-transparent to-purple-500/5 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(0,255,136,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.1)_0%,transparent_50%),radial-gradient(circle_at_0%_50%,rgba(6,182,212,0.1)_0%,transparent_50%)]"></div>

      <motion.div
        className="w-full max-w-5xl z-10"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        <motion.div 
          className="text-center mb-10"
          variants={{ hidden: { opacity: 0, y: -30 }, visible: { opacity: 1, y: 0 } }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
            className="inline-block relative"
          >
            {icon}
            <div className={cn("absolute inset-0 blur-3xl -z-10", textColor.replace('text-', 'bg-') + '/30')} />
          </motion.div>
          <h1 className="text-5xl font-bold mt-4">{text}</h1>
          <p className="text-arena-text-muted mt-2 text-lg">{t('duels.duelSummary')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <PlayerStatCard
            username={user?.username || 'You'}
            avatar={user?.google_picture}
            isWinner={isWinner || isDraw}
            stats={userStats}
          />
          <PlayerStatCard
            username={result.is_ai_duel ? 'AI Opponent' : 'Opponent'}
            isWinner={isDraw ? true : !isWinner}
            isAI={result.is_ai_duel}
            stats={opponentStats}
          />
        </div>

        <motion.div 
          className="flex justify-center gap-4"
          variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
        >
          <Button onClick={onPlayAgain} variant="secondary" className="flex items-center gap-2">
            <Repeat size={18} />
            {t('profilePage.playAgain')}
          </Button>
          <Link to="/leaderboards">
            <Button variant="primary" className="flex items-center gap-2">
              <BarChart2 size={18} />
              {t('duels.viewLeaderboard')}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DuelCompletionScreen; 