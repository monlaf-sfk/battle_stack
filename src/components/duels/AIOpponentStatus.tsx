import React from 'react';
import { TFunction } from 'i18next';
import { TestResultResponse } from '@/types/duel.types';

interface AIOpponentStatusProps {
  isAIOpponent: boolean;
  t: TFunction;
  opponentIsTyping: boolean;
  opponentTestResults: TestResultResponse | null;
  getOpponentProgress: () => number;
}

export const AIOpponentStatus: React.FC<AIOpponentStatusProps> = ({
  isAIOpponent,
  t,
  opponentIsTyping,
  getOpponentProgress,
}) => {
  if (!isAIOpponent) return null;

  const progress = getOpponentProgress();

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-red-300 font-bold text-lg">
            🤖 {t('duels.aiOpponent', 'AI OPPONENT').toUpperCase()}
          </span>
          {opponentIsTyping && (
            <span className="text-gray-400 text-sm animate-pulse">
              {t('duels.aiTyping', 'AI is typing...')}
            </span>
          )}
        </div>
        <div className="text-sm font-bold text-white">{Math.round(progress)}%</div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
        <div
          className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}; 