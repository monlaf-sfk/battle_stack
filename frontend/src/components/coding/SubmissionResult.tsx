/**
 * 🏆 SUBMISSION RESULT COMPONENT
 * Component for displaying submission results.
 * It is now versatile and can show errors, loading states, and successful results.
 */

import React from 'react';
import { 
  ServerCrash
} from 'lucide-react';

// Import TestResult and SubmissionResponse types from duel.types.ts
import type { SubmissionResponse } from '../../services/codeExecutionService';

interface SubmissionResultProps {
  submission: SubmissionResponse | null;
  t: any;
}

const SubmissionResult: React.FC<SubmissionResultProps> = ({ submission, t }) => {

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <span>{t('coding.runSubmitPrompt')}</span>
      </div>
    );
  }

  // === Rendering ERROR ===
  if (submission?.error_message) { // Use error_message from SubmissionResponse
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-white">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ServerCrash className="h-6 w-6 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-300">{submission.error_message}</h3>
            {/* SubmissionResponse does not have 'details' field. Remove or adapt if needed. */}
            {/* {submission.details && submission.details.length > 0 && (
              <div className="mt-2 text-sm text-red-200">
                <ul className="list-disc space-y-1 pl-5">
                  {submission.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )} */}
          </div>
        </div>
      </div>
    );
  }
  
  // === Rendering SUCCESS/FAILURE RESULT ===
  // This block now handles both correct and incorrect submissions based on `is_correct`
  if (submission?.accepted !== undefined && submission.passed_tests !== undefined && submission.total_tests !== undefined) {
    const isAccepted = submission.accepted && submission.passed_tests === submission.total_tests;
    const textColor = isAccepted ? "text-green-400" : "text-red-400";
    const statusText = isAccepted ? t('coding.accepted') : t('coding.wrongAnswer');

    return (
      <div className={`${textColor}`}>
        <h3 className="text-lg font-bold">{statusText}</h3>
        <p>{t('coding.passedTests', { passed: submission.passed_tests, total: submission.total_tests })}</p>
        {/* SubmissionResponse does not have 'details' field. Remove or adapt if needed. */}
        {/* {submission.details && submission.details.length > 0 && (
          <div className="mt-2 text-sm">
            <h4 className="font-medium">{t('coding.detailsTitle')}:</h4>
            <ul className="list-disc space-y-1 pl-5">
              {submission.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        )} */}
      </div>
    );
  }

  return null; // In case submission does not match any condition
};

export default SubmissionResult;