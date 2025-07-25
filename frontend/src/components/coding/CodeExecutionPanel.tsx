/**
 * 🚀 CODE EXECUTION PANEL
 * This is the main component for code execution, designed in a LeetCode style.
 * It acts as a "dumb" component, receiving all data and callbacks via props.
 * Its sole responsibility is to display the code editor and execution/submission results.
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';

// Import only necessary types and interfaces
import type { Problem } from '../../services/api';
import type { SupportedLanguage as Language, SubmissionResponse } from '../../services/codeExecutionService';
import SubmissionResult from './SubmissionResult';
import type { SubmissionResultData } from './SubmissionResult';

// Adapter function to convert SubmissionResponse to SubmissionResultData
const adaptSubmissionData = (submission: SubmissionResponse | null): SubmissionResultData | null => {
  if (!submission) return null;

  const statusName = submission.status?.name || 'Error';
  const isCorrect = statusName === 'Accepted';

  return {
    is_correct: isCorrect,
    error: submission.error_message || (!isCorrect ? submission.status?.description : null),
    details: submission.test_cases?.map(tc => tc.status?.description || 'No details available.'),
    passed: submission.passed_tests || 0,
    total: submission.total_tests || 0,
  };
};

interface CodeExecutionPanelProps {
  // `problem` is now passed as a prop, containing problem metadata
  problem: Problem | null;
  // `onCodeChange` to notify the parent component of code changes
  onCodeChange: (code: string) => void;
  // `initialCode` to set the initial code in the editor
  initialCode?: string;
  // `submissionResult` to display the final submission result
  submissionResult: SubmissionResponse | null;
  // `selectedLanguage` is passed as a prop, as language is managed by the parent
  selectedLanguage: Language;
  // `onLanguageChange` is not used here for internal logic, but can be useful for the parent
  onLanguageChange: (language: Language) => void; 
  // `className` for styling
  className?: string;
}

const CodeExecutionPanel: React.FC<CodeExecutionPanelProps> = ({
  onCodeChange,
  initialCode = '',
  submissionResult,
  selectedLanguage, // Accept, but do not directly use for internal Monaco Editor language selection here
  className = '', 
}) => {
  const { t } = useTranslation();
  const editorRef = useRef<any>(null);
  
  // Internal state for code, as this component manages its own editor content
  const [code, setCode] = useState(initialCode);
  
  useEffect(() => {
    // Update editor code if initialCode changed
    if (initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode, code]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    // Notify parent component of code changes
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  // Determine language for Monaco Editor based on `selectedLanguage` prop
  const getMonacoLanguage = (language: Language) => {
    switch (language.id) {
      case 'python':
        return 'python';
      case 'javascript':
        return 'javascript';
      case 'java':
        return 'java';
      case 'cpp':
        return 'cpp';
      default:
        return 'plaintext'; // Fallback for unsupported languages
    }
  };

  const adaptedResult = adaptSubmissionData(submissionResult);

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Editor Area */}
      <div className="flex-grow relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(selectedLanguage)} // Use selectedLanguage prop
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Console Area */}
      <div className="flex-shrink-0 h-1/3 border-t-2 border-gray-700 flex flex-col">
        {/* Console Header */}
        <div className="bg-arena-surface/40 p-4 rounded-t-lg relative">
          <div className="font-mono text-sm text-arena-text-dim mb-2 flex justify-between items-center">
            <span>{t('coding.consoleOutput').toUpperCase()}</span>
            {(submissionResult && submissionResult.passed_tests !== undefined && submissionResult.total_tests !== undefined) && (
              <span className="text-xs text-arena-text-muted">
                {t('coding.testsPassed', { passed: submissionResult.passed_tests, total: submissionResult.total_tests })}
              </span>
            )}
          </div>
        </div>
        {/* Console Output */}
        <div className="p-4 overflow-auto flex-grow bg-gray-800/50">
          <SubmissionResult 
            result={adaptedResult} // Pass adapted result
            t={t} // Pass t prop
          />
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionPanel;