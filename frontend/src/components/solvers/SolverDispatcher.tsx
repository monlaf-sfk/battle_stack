import React from 'react';
import type { DuelProblem, TestResult } from '../../types/duel.types';
import { AlgorithmSolver } from './AlgorithmSolver';
import { SqlSolver } from './SqlSolver';
import { FrontendSolver } from './FrontendSolver';
import { DevOpsSolver } from './DevOpsSolver';

interface SolverDispatcherProps {
  problem: DuelProblem;
  onCodeChange: (language: string, code: string) => void;
  onSubmit: () => void;
  onRunTests: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  testResults: TestResult[];
}

export const SolverDispatcher: React.FC<SolverDispatcherProps> = ({
  problem,
  onCodeChange,
  onSubmit,
  onRunTests,
  isRunning,
  isSubmitting,
  testResults,
}) => {
  switch (problem.problem_type) {
    case 'algorithm':
      return (
        <AlgorithmSolver
          problem={problem}
          onCodeChange={onCodeChange}
          onSubmit={onSubmit}
          onRunTests={onRunTests}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          testResults={testResults}
        />
      );
    case 'database':
      return <SqlSolver problem={problem} onCodeChange={onCodeChange} />;
    // case 'frontend':
    //   return <FrontendSolver problem={problem} />;
    // case 'shell':
    //   return <DevOpsSolver problem={problem} />;
    default:
      return (
        <div className="p-4 rounded-lg border border-dashed border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
          <p className="font-semibold">Unsupported Problem Type</p>
          <p className="text-sm">
            The solver for problem type "{problem.problem_type}" is not yet implemented.
          </p>
        </div>
      );
  }
}; 