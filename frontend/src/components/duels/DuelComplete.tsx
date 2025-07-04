import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trophy, ShieldOff, BarChart, Home, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TestResultResponse } from '../../types/duel.types';
import { useAuth } from '../../contexts/AuthContext';

export interface DuelCompleteProps {
  results: {
    playerScore: number | undefined;
    opponentScore: number | undefined;
    userTestResults: TestResultResponse | null;
    opponentTestResults: TestResultResponse | null;
  };
  onRematch: () => void;
  t: any;
}

export const DuelComplete: React.FC<DuelCompleteProps> = ({ results, onRematch, t }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!results) {
    return null; // or a loading/error state
  }

  const { playerScore, opponentScore } = results;

  const winner_id = playerScore !== undefined && opponentScore !== undefined 
    ? (playerScore > opponentScore ? user?.id : (playerScore < opponentScore ? 'opponent' : null))
    : null;

  const isWinner = winner_id === user?.id;
  const currentUserResult = playerScore !== undefined ? { player_id: user?.id, score: playerScore, time_taken_seconds: 0, submission_count: 0, is_winner: isWinner } : null;
  const opponentResult = opponentScore !== undefined ? { player_id: 'opponent', score: opponentScore, time_taken_seconds: 0, submission_count: 0, is_winner: !isWinner } : null;

  const title = isWinner ? t('duel.victory') : t('duel.defeat');
  const Icon = isWinner ? Trophy : ShieldOff;
  const iconColor = isWinner ? 'text-yellow-400' : 'text-red-400';
  const borderColor = isWinner ? 'border-yellow-400/30' : 'border-red-400/30';

  return (
    <div className="min-h-screen bg-arena-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-2xl"
      >
        <Card variant="glass" hover="glow" className={`border ${borderColor}`}>
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: [0, 15, -10, 5, 0] }}
              transition={{
                delay: 0.2,
                scale: { type: "spring", stiffness: 300, damping: 10 },
                rotate: { duration: 0.5, ease: "easeInOut" }
              }}
            >
              <Icon className={`mx-auto h-20 w-20 ${iconColor}`} />
            </motion.div>
            <CardTitle className={`text-4xl font-bold gradient-text mt-4 ${iconColor}`}>{title}</CardTitle>
            <p className="text-arena-text-muted mt-2">
              {winner_id ? t('duel.winner', { winner: winner_id === user?.id ? user?.username : t('duel.opponent') }) : t('duel.draw')}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-arena-surface/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-arena-text mb-3 flex items-center gap-2">
                <BarChart size={20} />
                {t('duel.duelSummary')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-arena-dark/50 p-3 rounded-md">
                  <p className="text-arena-text-muted">{t('duel.outcome')}</p>
                  <p className={`font-bold text-lg ${iconColor}`}>{title}</p>
                </div>
                <div className="bg-arena-dark/50 p-3 rounded-md">
                  <p className="text-arena-text-muted">{t('duel.opponent')}</p>
                  <p className="font-bold text-lg text-arena-text truncate">{opponentResult?.player_id || t('common.ai')}</p>
                </div>
                <div className="bg-arena-dark/50 p-3 rounded-md">
                  <p className="text-arena-text-muted">{t('duel.scoreGained')}</p>
                  <p className={`font-bold text-lg ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                    {currentUserResult?.score !== undefined 
                      ? (isWinner ? `+${currentUserResult.score}` : `-${Math.round(Math.abs(currentUserResult.score) / 2)}`) 
                      : t('common.notApplicable')}
                  </p>
                </div>
                <div className="bg-arena-dark/50 p-3 rounded-md">
                  <p className="text-arena-text-muted">{t('duel.timeTaken')}</p>
                  <p className="font-bold text-lg text-arena-text">
                    {currentUserResult?.time_taken_seconds !== undefined 
                      ? t('duel.timeInSeconds', { time: currentUserResult.time_taken_seconds.toFixed(2) }) 
                      : t('common.notApplicable')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-arena-text-muted text-sm">
                {isWinner 
                  ? t('duel.victoryMessageDetail')
                  : t('duel.defeatMessageDetail')}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="w-full"
            >
              <Home size={16} className="mr-2" />
              {t('duel.goToDashboard')}
            </Button>
            <Button
              onClick={() => onRematch?.()}
              variant="gradient"
              className="w-full"
            >
              <Repeat size={16} className="mr-2" />
              {t('duel.playAgain')}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}; 