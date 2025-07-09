import React from 'react';
import { AlgorithmSolver } from './AlgorithmSolver';
import SqlSolver from './SqlSolver';
import type { Problem } from '@/services/api'; // Import Problem from api.ts
import type { TestCaseResult } from '@/services/codeExecutionService'; // Import TestCaseResult

interface SolverDispatcherProps {
  problem: Problem; // Change from DuelProblem to Problem
  onCodeChange: (language: string, code: string) => void;
  onSubmit: () => void;
  onRunTests?: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  testResults?: TestCaseResult[]; // Change from TestResult[] to TestCaseResult[]
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