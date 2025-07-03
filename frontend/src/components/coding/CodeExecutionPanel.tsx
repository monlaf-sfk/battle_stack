/**
 * 🚀 CODE EXECUTION PANEL
 * Основной компонент для выполнения кода в стиле LeetCode
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import { duelsApiService } from '../../services/duelService';
import type { CodeSubmission, DuelSubmission, Language } from '../../types/duel.types';
import LanguageSelector from './LanguageSelector';
import SubmissionResult from './SubmissionResult';

interface CodeExecutionPanelProps {
  duelId: string;
  problemSlug?: string;
  initialCode?: string;
  className?: string;
}

const CodeExecutionPanel: React.FC<CodeExecutionPanelProps> = ({
  duelId,
  initialCode = '',
  className = '',
}) => {
  const { user, isAuthenticated } = useAuth();
  
  const editorRef = useRef<any>(null);
  
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [resultTitle, setResultTitle] = useState('Output');

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId);
  };

  const performApiCall = async (apiCall: () => Promise<any>, title: string) => {
    if (!isAuthenticated || !code.trim()) return;

    setIsLoading(true);
    setResult(null);
    setResultTitle(title);

    try {
      const apiResponse = await apiCall();
      // В реальном сценарии результат придет по WebSocket, 
      // но для обработки ошибок мы можем показать что-то здесь.
      console.log(`${title} initiated:`, apiResponse);
      setResult({ message: "Execution started. Waiting for results via WebSocket..." });

    } catch (error) {
      console.error(`Failed to ${title.toLowerCase()}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as { detail?: { message?: string, details?: string[] } };
        const message = errorData.detail?.message || 'Submission failed.';
        const details = errorData.detail?.details || ['No additional details available.'];
        setResult({ error: message, details });
      } else {
        setResult({ 
          error: 'An unexpected error occurred.',
          details: [error instanceof Error ? error.message : String(error)] 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = () => {
    const submission: CodeSubmission = { code: code.trim(), language: selectedLanguage as Language };
    performApiCall(() => duelsApiService.testCode(duelId, submission), 'Test Run');
  };

  const handleSubmitSolution = () => {
    if (!user) return;
    const submission: DuelSubmission = { player_id: user.id, code: code.trim(), language: selectedLanguage as Language };
    performApiCall(() => duelsApiService.submitSolution(duelId, submission), 'Submission');
  };

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

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Editor Area */}
      <div className="flex-grow relative">
        <Editor
          height="100%"
          language={'python'}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
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
        <div className="flex items-center justify-between bg-gray-800 p-2 border-b border-gray-700">
          <h3 className="text-white font-semibold px-2">{resultTitle}</h3>
          <div className="flex items-center space-x-2">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              disabled={isLoading}
            />
            <button
              onClick={handleRunCode}
              disabled={!isAuthenticated || !code.trim() || isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && resultTitle === 'Test Run' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Run</span>
            </button>
            <button
              onClick={handleSubmitSolution}
              disabled={!isAuthenticated || !code.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && resultTitle === 'Submission' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit</span>
            </button>
          </div>
        </div>
        {/* Console Output */}
        <div className="p-4 overflow-auto flex-grow bg-gray-800/50">
          <SubmissionResult result={result} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionPanel; 