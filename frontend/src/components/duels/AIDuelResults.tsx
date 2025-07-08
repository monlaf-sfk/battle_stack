import React from 'react';
import { Target, RotateCcw, Home, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLucideIcon } from '../../utils/iconMap';

interface Achievement {
  name: string;
  status: string;
  details: string;
  icon: string;
  earned_at?: string; // Assuming it comes as a string from backend for simplicity in this interface
}

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
    achievements?: Achievement[]; // Updated to match backend schema
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

const getResultMessage = (isVictory: boolean, t: any) => {
  if (isVictory) {
    return {
      title: t('duels.victoryTitle'),
      subtitle: t('duels.victorySubtitle'),
      message: t('duels.victoryMessage')
    };
  } else {
    return {
      title: t('duels.defeatTitle'),
      subtitle: t('duels.defeatSubtitle'),
      message: t('duels.defeatMessage')
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
  const { t } = useTranslation();
  const resultInfo = getResultMessage(isVictory, t);

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
                {t(`duel.${problem.difficulty.toLowerCase()}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Comparison */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('duels.performanceComparison')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Player Stats */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-white">👤</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('duels.you')}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.testsPassedStat')}</span>
                  <span className="font-bold text-lg">
                    {playerStats.testsPassed}/{playerStats.totalTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.totalTime')}</span>
                  <span className="font-bold text-lg">
                    {formatTime(playerStats.totalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.attempts')}</span>
                  <span className="font-bold text-lg">{playerStats.attempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.successRate')}</span>
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
                <h3 className="text-xl font-bold text-gray-900">{t('duels.aiOpponent')}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.testsPassedStat')}</span>
                  <span className="font-bold text-lg">
                    {aiStats.testsPassed}/{aiStats.totalTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.totalTime')}</span>
                  <span className="font-bold text-lg">
                    {formatTime(aiStats.totalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.attempts')}</span>
                  <span className="font-bold text-lg">{aiStats.attempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('duels.successRate')}</span>
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
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{t('duels.rewardsProgress')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {xpGained && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-bold text-lg text-blue-600">+{xpGained} XP</div>
                    <div className="text-sm text-gray-600">{t('duels.xpGained')}</div>
                  </div>
                )}
                
                {ratingChange && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">📈</div>
                    <div className={`font-bold text-lg ${ratingChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ratingChange > 0 ? '+' : ''}{ratingChange}
                    </div>
                    <div className="text-sm text-gray-600">{t('duels.ratingChange')}</div>
                  </div>
                )}
                
                {achievements && achievements.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-bold text-lg text-purple-600">{achievements.length}</div>
                    <div className="text-sm text-gray-600">{t('duels.newAchievements')}</div>
                  </div>
                )}
              </div>
              
              {/* Achievement Details */}
              {achievements && achievements.length > 0 && (
                <div className="mt-4 pt-4 border-t border-yellow-200">
                  <h4 className="font-semibold mb-2">{t('duels.unlockedAchievements')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {achievements.map((achievement, index) => {
                      const IconComponent = getLucideIcon(achievement.icon);
                      return (
                        <span key={index} className="badge badge-lg bg-purple-100 text-purple-800 font-medium px-3 py-1 rounded-full flex items-center gap-1">
                          {IconComponent && <IconComponent size={16} />}
                          {achievement.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={onRematch}
              className="btn btn-primary bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <RotateCcw size={20} /> {t('duels.rematch')}
            </button>
            <button
              onClick={onReviewCode}
              className="btn btn-ghost border border-gray-300 text-gray-800 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Eye size={20} /> {t('duels.reviewCode')}
            </button>
            <button
              onClick={onBackToDashboard}
              className="btn btn-ghost border border-gray-300 text-gray-800 font-bold py-3 px-6 rounded-full hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              <Home size={20} /> {t('duels.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 