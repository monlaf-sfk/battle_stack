import React, { 
// ... existing code ...
import type { SubmissionResponse } from '../../types/duel.types';

interface SubmissionResultProps {
  submission: SubmissionResponse | null;
  t: any;
  className?: string;
}

const SubmissionResult: React.FC<SubmissionResultProps> = ({ submission, t, className }) => {

  if (!submission) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
        <span>{t('coding.runSubmitPrompt')}</span>
      </div>
    );
  }
// ... existing code ...
    const statusText = isAccepted ? t('coding.accepted') : t('coding.wrongAnswer');

    return (
      <div className={`${textColor} ${className}`}>
        <h3 className="text-lg font-bold">{statusText}</h3>
        <p>{t('coding.passedTests', { passed: submission.passed, total: submission.total })}</p>
        {submission.details && submission.details.length > 0 && (
// ... existing code ...
      </div>
    );
  }

  return (
    <div className={`${textColor} ${className}`}>
      <h3 className="text-lg font-bold">{statusText}</h3>
      <p>{t('coding.passedTests', { passed: submission.passed, total: submission.total })}</p>
      {submission.details && submission.details.length > 0 && (
        <div className="mt-2">
          {submission.details.map((detail, index) => (
            <p key={index}>{detail}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubmissionResult; 