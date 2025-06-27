import React from 'react';
import type { TestResult } from '../../types/duel.types';

interface AIOpponentStatusProps {
  isAIOpponent: boolean;
  opponentIsTyping: boolean;
  opponentTestResults: TestResult | null;
  getOpponentProgress: () => number;
}

export const AIOpponentStatus: React.FC<AIOpponentStatusProps> = ({
  isAIOpponent,
  opponentIsTyping,
  opponentTestResults,
  getOpponentProgress
}) => {
  if (!isAIOpponent) return null;
  
  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-red-300 font-bold text-lg">🤖 AI OPPONENT</span>
          {opponentIsTyping && (
            <span className="text-orange-400 text-sm font-medium animate-pulse">⚡ CODING...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {opponentTestResults && opponentTestResults.total_tests > 0 && (
            <>
              <span className="text-red-300 font-bold">
                {opponentTestResults.passed}/{opponentTestResults.total_tests} tests
              </span>
              <div className="w-32 h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500 relative"
                  style={{ width: `${getOpponentProgress()}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              {getOpponentProgress() === 100 && (
                <span className="text-yellow-400 font-bold animate-bounce">⚠️ DANGER!</span>
              )}
            </>
          )}
          {!opponentTestResults && (
            <span className="text-gray-400 text-sm">Preparing attack...</span>
          )}
        </div>
      </div>
    </div>
  );
}; 