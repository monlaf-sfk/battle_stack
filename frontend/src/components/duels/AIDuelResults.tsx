import React from 'react';
import { Target, RotateCcw, Home, Eye } from 'lucide-react';

interface AIDuelResultsProps {
  duelResult: {
    isVictory: boolean;
    playerStats: {
      testsPassed: number;
      totalTests: number;
      totalTime: number; // seconds
      attempts: number;
    };
    aiStats: {
      testsPassed: number;
      totalTests: number;
      totalTime: number; // seconds
      attempts: number;
    };
    problem: {
      title: string;
      difficulty: string;
    };
    xpGained?: number;
    ratingChange?: number;
    achievements?: string[];
  };
  onRematch: () => void;
  onReviewCode: () => void;
  onBackToDashboard: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getResultColor = (isVictory: boolean) => {
  return isVictory 
    ? 'from-green-500 to-emerald-600' 
    : 'from-red-500 to-rose-600';
};

const getResultIcon = (isVictory: boolean) => {
  return isVictory ? '🎉' : '💪';
};

const getResultMessage = (isVictory: boolean) => {
  if (isVictory) {
    return {
      title: 'Victory!',
      subtitle: 'You defeated the AI opponent',
      message: 'Excellent problem-solving skills!'
    };
  } else {
    return {
      title: 'Defeat',
      subtitle: 'AI opponent performed better',
      message: 'Great effort! Learn and try again!'
    };
  }
};

export const AIDuelResults: React.FC<AIDuelResultsProps> = ({
  duelResult,
  onRematch,
  onReviewCode,
  onBackToDashboard
}) => {
  const { isVictory, playerStats, aiStats, problem, xpGained, ratingChange, achievements } = duelResult;
  const resultInfo = getResultMessage(isVictory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        {/* Hero Section */}
        <div className={`bg-gradient-to-r ${getResultColor(isVictory)} px-8 py-12 text-white text-center relative overflow-hidden`}>
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 text-6xl animate-bounce">
              {getResultIcon(isVictory)}
            </div>
            <div className="absolute top-8 right-8 text-4xl animate-pulse">⭐</div>
            <div className="absolute bottom-4 left-1/4 text-3xl animate-bounce delay-500">✨</div>
            <div className="absolute bottom-8 right-1/4 text-5xl animate-pulse delay-1000">🎯</div>
          </div>

          <div className="relative z-10">
            <h1 className="text-5xl font-bold mb-2">{resultInfo.title}</h1>
            <p className="text-xl opacity-90 mb-4">{resultInfo.subtitle}</p>
            <p className="text-lg opacity-80">{resultInfo.message}</p>
            
            {/* Problem Info */}
            <div className="mt-6 inline-flex items-center bg-black bg-opacity-20 rounded-full px-6 py-2">
              <Target className="w-5 h-5 mr-2" />
              <span className="font-medium">{problem.title}</span>
              <span className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-sm font-medium">
                {problem.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Comparison */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">📊 Performance Comparison</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Player Stats */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-white">👤</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">You</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tests Passed</span>
                  <span className="font-bold text-lg">
                    {playerStats.testsPassed}/{playerStats.totalTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Time</span>
                  <span className="font-bold text-lg">
                    {formatTime(playerStats.totalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Attempts</span>
                  <span className="font-bold text-lg">{playerStats.attempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-bold text-lg">
                    {Math.round((playerStats.testsPassed / playerStats.totalTests) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Stats */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-white">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">AI Opponent</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tests Passed</span>
                  <span className="font-bold text-lg">
                    {aiStats.testsPassed}/{aiStats.totalTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Time</span>
                  <span className="font-bold text-lg">
                    {formatTime(aiStats.totalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Attempts</span>
                  <span className="font-bold text-lg">{aiStats.attempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-bold text-lg">
                    {Math.round((aiStats.testsPassed / aiStats.totalTests) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          {(xpGained || ratingChange || achievements?.length) && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">🎁 Rewards & Progress</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {xpGained && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-bold text-lg text-blue-600">+{xpGained} XP</div>
                    <div className="text-sm text-gray-600">Experience Points</div>
                  </div>
                )}
                
                {ratingChange && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">📈</div>
                    <div className={`font-bold text-lg ${ratingChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ratingChange > 0 ? '+' : ''}{ratingChange}
                    </div>
                    <div className="text-sm text-gray-600">Rating Change</div>
                  </div>
                )}
                
                {achievements && achievements.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-bold text-lg text-purple-600">{achievements.length}</div>
                    <div className="text-sm text-gray-600">New Achievements</div>
                  </div>
                )}
              </div>
              
              {/* Achievement Details */}
              {achievements && achievements.length > 0 && (
                <div className="mt-4 pt-4 border-t border-yellow-200">
                  <h4 className="font-semibold mb-2">🏆 Unlocked Achievements:</h4>
                  <div className="flex flex-wrap gap-2">
                    {achievements.map((achievement, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                      >
                        {achievement}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onRematch}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Rematch vs AI
            </button>
            
            <button
              onClick={onReviewCode}
              className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Eye className="w-5 h-5 mr-2" />
              Review Code
            </button>
            
            <button
              onClick={onBackToDashboard}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 