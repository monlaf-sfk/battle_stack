/**
 * 🎯 CODE EXECUTION DEMO PAGE
 * Демо-страница для профессиональной системы выполнения кода
 */

import React, { useState  } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { Button } from '@/components/ui/Button';
import LanguageSelector from '@/components/coding/LanguageSelector';
import SubmissionResult from '@/components/coding/SubmissionResult';
import type { SubmissionResultData } from '@/components/coding/SubmissionResult';
import type { SupportedLanguage, SubmissionResponse } from '@/services/codeExecutionService';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const adaptToResultData = (submission: SubmissionResponse | null): SubmissionResultData | null => {
  if (!submission) return null;
  return {
    is_correct: submission.accepted ?? false,
    error: submission.error_message,
    details: submission.test_cases?.map(tc => tc.status.description || ''),
    passed: submission.passed_tests || 0,
    total: submission.total_tests || 0,
  };
};

const CodeExecutionDemoPage: React.FC = () => {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>('print("Hello, World!")');
  const [language, setLanguage] = useState<SupportedLanguage>({ id: 'python', name: 'Python', extension: '.py', supports_classes: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [input, setInput] = useState('');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  const handleSubmit = (code: string, input: string) => {
    // Simulate API call
    setIsSubmitting(true);
    setSubmissionResult(null); // Clear previous results

    setTimeout(() => {
      let result: SubmissionResponse;
      if (code.includes("error")) {
        result = {
          token: "some-token",
          status: { id: 4, name: "Runtime Error", description: "Error" },
          error_message: "Traceback (most recent call last):\n  File \"<stdin>\", line 1, in <module>\nNameError: name 'error' is not defined",
          accepted: false,
          passed_tests: 0,
          total_tests: 1,
        };
      } else if (code.includes("correct")) {
        result = {
          token: "some-token",
          status: { id: 3, name: "Accepted", description: "Accepted" },
          passed_tests: 1,
          total_tests: 1,
          accepted: true,
          test_cases: [{
            stdin: input,
            stdout: "Hello, World!",
            expected_output: "Hello, World!",
            status: { id: 3, name: "Accepted", description: "Accepted" },
            time: "0.123",
            memory: 1024,
            is_public: true,
            compile_output: null,
            stderr: null,
          }],
        };
      } else {
        result = {
          token: "some-token",
          status: { id: 4, name: "Wrong Answer", description: "Wrong Answer" },
          passed_tests: 0,
          total_tests: 1,
          accepted: false,
          test_cases: [{
            stdin: input,
            stdout: "Something else",
            expected_output: "Hello, World!",
            status: { id: 4, name: "Wrong Answer", description: "Wrong Answer" },
            time: "0.124",
            memory: 1024,
            is_public: true,
            compile_output: null,
            stderr: null,
          }],
        };
      }
      setSubmissionResult(result);
      setIsSubmitting(false);
    }, 1500);
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4 h-full flex flex-col"
    >
      <h1 className="text-2xl font-bold text-white mb-4">{t('demo.title')}</h1>
      <ResizablePanelGroup direction="vertical" className="flex-grow rounded-lg border border-gray-700">
        <ResizablePanel defaultSize={60}>
          <div className="flex h-full">
            <div className="w-1/2 flex flex-col">
              <div className="p-2 bg-gray-800 border-b border-r border-gray-700">
                <LanguageSelector
                  selectedLanguage={language}
                  onLanguageChange={handleLanguageChange}
                />
              </div>
              <CodeEditor
                language={language.id}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
              />
            </div>
            <div className="w-1/2 flex flex-col border-l border-gray-700">
              <div className="p-2 bg-gray-800 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">{t('demo.input')}</h2>
              </div>
              <textarea
                className="flex-grow p-2 bg-gray-900 text-white font-mono focus:outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('demo.inputPlaceholder')}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <div className="flex flex-col h-full">
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">{t('demo.output')}</h2>
              <Button onClick={() => handleSubmit(code, input)} disabled={isSubmitting}>
                {isSubmitting ? t('demo.submitting') : t('demo.submit')}
              </Button>
            </div>
            <div className="flex-grow p-4 bg-gray-900 overflow-y-auto">
              {isSubmitting ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : (
                <SubmissionResult result={adaptToResultData(submissionResult)} t={t} />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </motion.div>
  );
};

export default CodeExecutionDemoPage;