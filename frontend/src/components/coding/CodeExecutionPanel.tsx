/**
 * 🚀 CODE EXECUTION PANEL
 * Основной компонент для выполнения кода в стиле LeetCode
 * Этот компонент теперь является "глупым" компонентом, который получает все данные и колбэки через пропсы.
 * Он отвечает только за отображение редактора кода и результатов выполнения/отправки.
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

// Импортируем только необходимые типы и интерфейсы
import type { Problem, DuelProblem, Language, SubmissionResponse } from '../../types/duel.types';
import SubmissionResult from './SubmissionResult'; // Убедимся, что SubmissionResultProps принимает testResults

interface CodeExecutionPanelProps {
  // `problem` теперь передается как пропс, содержит метаданные задачи
  problem: Problem | DuelProblem | null;
  // `onCodeChange` для уведомления родительского компонента об изменениях в коде
  onCodeChange: (code: string) => void;
  // `initialCode` для установки начального кода в редакторе
  initialCode?: string;
  // `isSubmitting` и `isRunningTests` для управления состоянием загрузки UI
  isSubmitting: boolean;
  isRunningTests: boolean;
  // `submissionResult` для отображения окончательного результата отправки решения
  submissionResult: SubmissionResponse | null;
  // `selectedLanguage` передается как пропс, так как язык управляется родителем
  selectedLanguage: Language;
  // `onLanguageChange` здесь не используется для внутренней логики, но может быть полезен для родителя
  onLanguageChange: (language: Language) => void; 
  // `className` для стилизации
  className?: string;
}

const CodeExecutionPanel: React.FC<CodeExecutionPanelProps> = ({
  onCodeChange,
  initialCode = '',
  isSubmitting,
  isRunningTests,
  submissionResult,
  selectedLanguage, // Принимаем, но не используем для внутреннего выбора языка Monaco Editor напрямую здесь
  className = '', 
}) => {
  
  const editorRef = useRef<any>(null);
  
  // Внутреннее состояние для кода, так как этот компонент управляет своим собственным содержимым редактора
  const [code, setCode] = useState(initialCode);
  
  useEffect(() => {
    // Обновляем код редактора, если initialCode изменился
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
    // Уведомляем родительский компонент об изменениях кода
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  // Определяем язык для Monaco Editor на основе `selectedLanguage` пропса
  const getMonacoLanguage = (language: Language) => {
    switch (language) {
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

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Editor Area */}
      <div className="flex-grow relative">
        <Editor
          height="100%"
          language={getMonacoLanguage(selectedLanguage)} // Используем пропс selectedLanguage
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
            <span>CONSOLE OUTPUT</span>
            {(submissionResult && submissionResult.passed !== undefined && submissionResult.total !== undefined) && (
              <span className="text-xs text-arena-text-muted">
                {submissionResult.passed} / {submissionResult.total} tests passed
              </span>
            )}
          </div>
        </div>
        {/* Console Output */}
        <div className="p-4 overflow-auto flex-grow bg-gray-800/50">
          <SubmissionResult 
            result={submissionResult} // Передаем submissionResult пропс
            isLoading={isSubmitting || isRunningTests} // Используем пропсы для состояния загрузки
          />
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionPanel;