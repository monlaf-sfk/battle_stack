import React from 'react';
import { AlgorithmSolver } from './AlgorithmSolver';
import SqlSolver from './SqlSolver';
import type { DuelProblem, TestResult } from '@/types/duel.types';

interface SolverDispatcherProps {
  problem: DuelProblem;
  onCodeChange: (language: string, code: string) => void;
  onSubmit: () => void;
  onRunTests?: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  testResults?: TestResult[];
}

const SolverDispatcher: React.FC<SolverDispatcherProps> = ({ 
  problem, 
  onCodeChange, 
  onSubmit,
  onRunTests,
  isRunning,
  isSubmitting,
  testResults 
}) => {
  if (!problem) {
    return <div>Loading problem...</div>;
  }

  const category = problem.category || 'algorithm'; 

  if (category === 'sql') {
    return (
      <SqlSolver
        problem={problem}
        onSubmit={(solution) => {
          onCodeChange('sql', solution);
          onSubmit();
        }}
      />
    );
  }

  // Default to AlgorithmSolver
  return (
    <AlgorithmSolver
      problem={problem}
      onCodeChange={onCodeChange}
      onSubmit={onSubmit}
      onRunTests={onRunTests || (() => {})}
      isRunning={isRunning || false}
      isSubmitting={isSubmitting || false}
      testResults={testResults || []}
    />
  );
};

export default SolverDispatcher; 