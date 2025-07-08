import React from 'react';
import type { TFunction } from 'i18next';
import type { DuelProblem } from '../../types/duel.types';

export interface ProblemDescriptionProps {
  problem: DuelProblem | null;
  t: TFunction;
  className?: string;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem, t, className }) => {
  if (!problem) {
    return (
      <div className={`p-4 bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-400">{t('duels.loadingDuel')}</p>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'hard': return 'text-red-400 bg-red-900/30';
      default: return 'text-blue-400 bg-blue-900/30';
    }
  };
  
  const visibleTestCases = problem.test_cases?.filter(tc => !tc.is_hidden) || [];

  return (
    <div className={`p-6 bg-gray-900/50 rounded-lg border border-gray-700/50 h-full overflow-y-auto ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-white">{problem.title}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
          {t(`duel.${problem.difficulty.toLowerCase()}`)}
        </span>
      </div>

      <div
        className="prose prose-invert prose-sm max-w-none text-gray-300"
        dangerouslySetInnerHTML={{ __html: problem.description }}
      />

      {/* Constraints */}
      {problem.constraints && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium text-yellow-400 mb-2">{t('duels.constraintsTitle')}</h3>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">{problem.constraints}</pre>
        </div>
      )}

      {/* Examples */}
      {visibleTestCases.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium text-green-400 mb-3">{t('duels.examplesTitle')}</h3>
          <div className="space-y-3">
            {visibleTestCases.map((tc, idx) => (
              <div key={idx} className="bg-gray-900 rounded-md p-3">
                <div className="text-sm font-medium text-gray-400 mb-2">{t('duels.exampleNumber', { number: idx + 1 })}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-blue-400 mb-1 uppercase">{t('duels.inputLabel')}</div>
                    <code className="text-sm text-gray-300 bg-black/50 p-2 rounded block">
                      {tc.input_data}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-green-400 mb-1 uppercase">{t('duels.outputLabel')}</div>
                    <code className="text-sm text-gray-300 bg-black/50 p-2 rounded block">
                      {tc.expected_output}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="font-medium text-blue-400 mb-2">💡 {t('duels.tipsTitle')}</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• {t('duels.readExamplesTip')}</li>
          <li>• {t('duels.checkConstraintsTip')}</li>
          <li>• {t('duels.testCodeTip')}</li>
          <li>• {t('duels.submitShortcutTip')}</li>
        </ul>
      </div>
    </div>
  );
}; 