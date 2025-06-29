import React from 'react';
import type { DuelProblem } from '../../types/duel.types';

export const FrontendSolver: React.FC<{ problem: DuelProblem }> = ({ problem }) => {
  return (
    <div className="p-4 rounded-lg border border-dashed border-blue-500/30 bg-blue-500/10 text-blue-300">
      <p className="font-semibold">Frontend Solver (Work in Progress)</p>
      <p className="text-sm">
        This will contain an interactive environment for solving frontend challenges.
      </p>
    </div>
  );
}; 