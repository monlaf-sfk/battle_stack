import React from 'react';
import type { DuelProblem } from '../../types/duel.types';

export const DevOpsSolver: React.FC<{ problem: DuelProblem }> = ({ problem }) => {
  return (
    <div className="p-4 rounded-lg border border-dashed border-gray-500/30 bg-gray-500/10 text-gray-300">
      <p className="font-semibold">DevOps/Shell Solver (Work in Progress)</p>
      <p className="text-sm">
        This will contain an environment for writing and testing shell scripts.
      </p>
    </div>
  );
}; 