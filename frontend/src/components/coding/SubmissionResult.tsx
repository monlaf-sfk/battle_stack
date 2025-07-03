/**
 * 🏆 SUBMISSION RESULT COMPONENT
 * Компонент для отображения результатов отправки решения.
 * Теперь он универсален и может показывать ошибки, состояние загрузки и успешные результаты.
 */

import React from 'react';
import { 
  ServerCrash
} from 'lucide-react';

// Import TestResult and SubmissionResponse types from duel.types.ts
import type { SubmissionResponse } from '../../types/duel.types';

interface SubmissionResultProps {
  result: SubmissionResponse | null;
  isLoading: boolean;
}

const SubmissionResult: React.FC<SubmissionResultProps> = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Executing...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <span>Click 'Run' or 'Submit' to see the output here.</span>
      </div>
    );
  }

  // === Рендеринг ОШИБКИ ===
  if (result?.error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-white">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ServerCrash className="h-6 w-6 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-300">{result.error}</h3>
            {result.details && result.details.length > 0 && (
              <div className="mt-2 text-sm text-red-200">
                <ul className="list-disc space-y-1 pl-5">
                  {result.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // === Рендеринг УСПЕШНОГО/НЕУСПЕШНОГО РЕЗУЛЬТАТА ===
  // This block now handles both correct and incorrect submissions based on `is_correct`
  if (result?.is_correct !== undefined && result.passed !== undefined && result.total !== undefined) {
    const isAccepted = result.is_correct && result.passed === result.total;
    const textColor = isAccepted ? "text-green-400" : "text-red-400";
    const statusText = isAccepted ? "Accepted" : "Wrong Answer";

    return (
      <div className={`${textColor}`}>
        <h3 className="text-lg font-bold">{statusText}</h3>
        <p>Passed Tests: {result.passed}/{result.total}</p>
        {result.details && result.details.length > 0 && (
          <div className="mt-2 text-sm">
            <h4 className="font-medium">Details:</h4>
            <ul className="list-disc space-y-1 pl-5">
              {result.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null; // На случай если result не соответствует ни одному из условий
};

export default SubmissionResult;