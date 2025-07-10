/**
 * 🏆 SUBMISSION RESULT COMPONENT
 * Component for displaying submission results.
 * It is now versatile and can show errors, loading states, and successful results.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

// Matches the backend's CodeExecutionResult and Judge0 status
export interface SubmissionResultData {
  is_correct: boolean;
  error?: string | null;
  details?: string[] | null;
  passed: number;
  total: number;
}

interface SubmissionResultProps {
  result: SubmissionResultData | null;
  t: (key: string, options?: any) => string;
}

const getStatusIcon = (isCorrect: boolean, error?: string | null) => {
  if (isCorrect) return <CheckCircle className="text-green-400" size={18} />;
  if (error) {
    if (error.includes('Time Limit')) return <Clock className="text-yellow-400" size={18} />;
    if (error.includes('Compilation')) return <AlertTriangle className="text-red-500" size={20}/>;
    if (error.includes('Runtime')) return <AlertTriangle className="text-orange-400" size={18} />;
  }
  return <XCircle className="text-red-400" size={18} />;
};

const ResultCard: React.FC<{ detail: string; index: number, t: SubmissionResultProps['t'] }> = ({ detail, index, t }) => {
    const isError = /failed|error/i.test(detail);
    
    const titleRegex = /^(Test case #?\d+ (?:passed|failed)|Compilation Error|Runtime Error|Time Limit Exceeded)/i;
    const titleMatch = detail.match(titleRegex);
    const title = titleMatch ? titleMatch[0] : `Test Case #${index + 1}`;
    
    const detailsContent = detail.replace(titleRegex, '').trim().replace(/^: /,'');

    const inputMatch = detailsContent.match(/Input: '([^']*)'/);
    const expectedMatch = detailsContent.match(/Expected: '([^']*)'/);
    const gotMatch = detailsContent.match(/Got: '([^']*)'/);
    const detailsErrorMatch = detailsContent.match(/Details: (.*)/s);

    return (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-cod-gray-800/20 border rounded-lg p-4 mb-3 ${isError ? 'border-red-500/30' : 'border-green-500/30'}`}
    >
        <div className="flex items-center gap-2 mb-2">
        {getStatusIcon(!isError, detail)}
        <span className={`font-bold ${isError ? 'text-red-300' : 'text-green-300'}`}>
            {title}
        </span>
        </div>
        
        {(inputMatch || expectedMatch || gotMatch || detailsErrorMatch) && (
            <div className="text-xs space-y-2 mt-3 bg-cod-gray-900 p-2 rounded">
                {inputMatch && (
                <div>
                    <p className="font-semibold text-gray-300">{t('coding.input')}:</p>
                    <pre className="text-gray-400 whitespace-pre-wrap">{inputMatch[1]}</pre>
                </div>
                )}
                {gotMatch && (
                <div>
                    <p className="font-semibold text-gray-300">{t('coding.yourOutput')}:</p>
                    <pre className="text-gray-400 whitespace-pre-wrap">{gotMatch[1]}</pre>
                </div>
                )}
                {expectedMatch && (
                <div>
                    <p className="font-semibold text-gray-300">{t('coding.expectedOutput')}:</p>
                    <pre className="text-gray-400 whitespace-pre-wrap">{expectedMatch[1]}</pre>
                </div>
                )}
                {detailsErrorMatch && (
                    <pre className="text-red-400 whitespace-pre-wrap">{detailsErrorMatch[1]}</pre>
                )}
            </div>
        )}
    </motion.div>
    );
};


const SubmissionResult: React.FC<SubmissionResultProps> = ({ result, t }) => {
    if (!result) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <span>{t('coding.runSubmitPrompt')}</span>
          </div>
        );
    }
  
    // Handle top-level errors like compilation or service errors
    if (result.error && (!result.details || result.details.length === 0)) {
        return (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-white">
            <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(false, result.error)}
                <h3 className="text-xl font-bold text-red-300">{t('common.error')}</h3>
            </div>
            <pre className="text-sm text-red-200 bg-cod-gray-900 p-3 rounded-md whitespace-pre-wrap">
                {result.error}
            </pre>
          </div>
        );
    }
  
    const overallStatus = result.is_correct ? 'Accepted' : 'Failed';
  
    return (
      <div className="text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-bold ${overallStatus === 'Accepted' ? 'text-green-400' : 'text-red-400'}`}>
            {overallStatus === 'Accepted' ? t('coding.allTestsPassed') : t('coding.testsFailed')}
          </h2>
          <div className="text-lg">
            <span className="font-semibold">{t('coding.score')}: </span>
            <span>{result.passed} / {result.total}</span>
          </div>
        </div>
  
        <AnimatePresence>
          {result.details?.map((detail, index) => (
            <ResultCard 
              key={index} 
              detail={detail} 
              index={index} 
              t={t} 
            />
          ))}
          {result.is_correct && (
            <div className="text-center text-green-400 p-4">
              <p>{t('coding.allPublicTestsPassed')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  export default SubmissionResult;