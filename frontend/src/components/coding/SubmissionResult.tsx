/**
 * 🏆 SUBMISSION RESULT COMPONENT
 * Компонент для отображения результатов отправки решения.
 * Теперь он универсален и может показывать ошибки, состояние загрузки и успешные результаты.
 */

import React from 'react';
import { 
  ServerCrash
} from 'lucide-react';

// Упрощенный интерфейс, который может содержать либо ошибку, либо успешные данные
interface UniversalResult {
  error?: string;
  details?: string[];
  message?: string; // Для сообщений типа "Ожидание результата..."
  status?: string;
  accepted?: boolean;
  score?: number;
  passed_tests?: number;
  total_tests?: number;
  execution_time?: string;
  memory_usage?: string;
}

interface SubmissionResultProps {
  result: UniversalResult | null;
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
  if (result.error) {
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
  
  // === Рендеринг простого сообщения (например, "ожидание...") ===
  if (result.message && !result.status) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <span>{result.message}</span>
        </div>
      );
  }

  // === Рендеринг УСПЕШНОГО РЕЗУЛЬТАТА (старая логика) ===
  // (Здесь должна быть ваша сложная логика для отображения оценок, статистики и т.д.)
  // Этот блок будет работать, когда WebSocket вернет полный объект результата.
  if (result.status) {
    return (
      <div className="text-green-400">
        <h3 className="text-lg font-bold">Success!</h3>
        <p>Status: {result.status}</p>
        <p>Passed: {result.passed_tests}/{result.total_tests}</p>
        {/* Добавьте остальную часть вашего красивого рендеринга здесь */}
      </div>
    );
  }

  return null; // На случай если result не соответствует ни одному из условий
};

export default SubmissionResult; 