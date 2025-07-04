import React from 'react';
import type { TestResultResponse } from '../../types/duel.types';

interface AIOpponentStatusProps {
  isAIOpponent: boolean;
  t: any;
  opponentIsTyping: boolean;
  opponentTestResults: TestResultResponse | null;
  getOpponentProgress: () => number;
}

export const AIOpponentStatus: React.FC<AIOpponentStatusProps> = ({
  isAIOpponent,
  t,
  opponentIsTyping,
  opponentTestResults,
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
          <span className="text-red-300 font-bold text-lg">🤖 {t('duel.aiOpponent').toUpperCase()}</span>
          {opponentIsTyping && <span className="text-gray-400 text-sm">{t('duel.typing')}...</span>}
        </div>
        <div className="text-sm text-gray-300">
            {Math.round(progress)}%
        </div>
      </div>
      {opponentTestResults && (
        <div className="mt-2 text-xs text-gray-400">
            {t('duel.testsPassed', {passed: opponentTestResults.passed, total: opponentTestResults.total_tests})}
        </div>
      )}
    </div>
  );
}; 