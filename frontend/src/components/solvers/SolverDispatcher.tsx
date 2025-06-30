import type { DuelProblem, TestResult } from '../../types/duel.types';
import { AlgorithmSolver } from './AlgorithmSolver';
import { SqlSolver } from './SqlSolver';

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
  // Default to 'algorithm' if problem_type is not available
  const problemType = (problem as any).problem_type || 'algorithm';
  
  switch (problemType) {
    case 'algorithm':
    case 'data_structure':
    case 'dynamic_programming':
    case 'graph':
    case 'string':
    case 'array':
    case 'tree':
    case 'math':
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
    case 'sql':
      return (
        <SqlSolver
          problem={problem}
          onCodeChange={onCodeChange}
        />
      );
    
    default:
      return (
        <div className="p-6 text-center">
          <p className="text-arena-text-muted">
            The solver for problem type "{problemType}" is not yet implemented.
          </p>
        </div>
      );
  }
}; 