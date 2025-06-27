import React from 'react';
import { Card } from '../ui/Card';
import { Shield, Target } from 'lucide-react';
import type { DuelProblem } from '../../types/duel.types';

interface ProblemDescriptionProps {
  problem: DuelProblem;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem }) => {
  return (
    <Card className="h-full bg-gray-900/95 border-cyan-400/30 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-cyan-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-cyan-400">УСЛОВИЕ</h3>
        </div>
        
        <div className="space-y-4 text-gray-300 overflow-y-auto max-h-[calc(100vh-300px)] text-sm">
          {/* Description */}
          <div className="p-3 bg-gray-800/50 rounded-lg border border-cyan-400/20">
            <div className="leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </div>
          </div>

          {/* Constraints */}
          {problem.constraints && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
                <h4 className="font-bold text-yellow-400">ОГРАНИЧЕНИЯ:</h4>
              </div>
              <div className="text-xs text-gray-400 bg-yellow-900/20 p-2 rounded border border-yellow-500/30 whitespace-pre-wrap">
                {problem.constraints}
              </div>
            </div>
          )}
          
          {/* Examples */}
          {problem.test_cases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-400" />
                <h4 className="font-bold text-green-400">ПРИМЕРЫ:</h4>
              </div>
              {problem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                <div 
                  key={idx} 
                  className="mb-2 p-2 bg-gray-800/70 rounded border border-gray-600 text-xs"
                >
                  <div className="text-blue-400 font-bold">
                    ⚡ IN: <span className="text-white">
                      {typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)}
                    </span>
                  </div>
                  <div className="text-green-400 font-bold mt-1">
                    🎯 OUT: <span className="text-white">
                      {typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}; 