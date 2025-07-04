import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trophy, ShieldOff, BarChart, Home, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DuelResult } from '../../types/duel.types';
import { useAuth } from '../../contexts/AuthContext';
import { TFunction } from 'i18next';

export interface DuelCompleteProps {
  results: DuelResult;
  currentUserId: string;
  onRematch: () => void;
  t: TFunction;
}

export const DuelComplete: React.FC<DuelCompleteProps> = ({ results, currentUserId, onRematch, t }) => {
  const { user } = useAuth();

  const { winner_id, player_one_result, player_two_result } = results;

  const isWinner = winner_id === currentUserId;
  const currentUserResult = player_one_result?.player_id === currentUserId ? player_one_result : player_two_result;
  const opponentResult = player_one_result?.player_id !== currentUserId ? player_one_result : player_two_result;

  const navigate = useNavigate();
  
  const title = isWinner ? t('duel.victory') : t('duel.defeat');

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">+{currentUserResult?.score_gained || 0}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <div className="bg-arena-dark/50 p-3 rounded-md">
                <p className="text-arena-text-muted">{t('duel.opponent')}</p>
                <p className="font-bold text-lg text-arena-text truncate">{opponentResult?.player_id ? (opponentResult.player_id === 'ai' ? t('common.ai') : opponentResult.player_id) : t('common.ai')}</p>
              </div>
              <div className="bg-arena-dark/50 p-3 rounded-md">
                <p className="text-arena-text-muted">{t('duel.scoreGained')}</p>
  // ... existing code ...
} 