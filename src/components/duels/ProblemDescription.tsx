import type { DuelProblem } from '../../types/duel.types';
import { TFunction } from 'i18next';

export interface ProblemDescriptionProps {
  problem: DuelProblem | null;
  t: TFunction;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem, t }) => {
  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        {/* ... existing code ... */}
      </div>
    );
  }

  // ... existing code ...
} 