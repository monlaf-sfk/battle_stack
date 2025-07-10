import { useState } from 'react';
import type { Problem } from '../../services/api'; // Import Problem
import type { TestCaseResult, SupportedLanguage, SubmissionResponse } from '../../services/codeExecutionService'; // Import new types
import { CodeEditor } from '../ui/CodeEditor';
import LanguageSelector from '../coding/LanguageSelector'; // Use the new LanguageSelector
import { Button } from '../ui/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AlgorithmSolverProps {
  problem: Problem | null; // Change from DuelProblem to Problem
  onCodeChange: (languageId: string, code: string) => void; // Keep languageId as string for onCodeChange
  onSubmit: () => void;
  onRunTests: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  testResults: TestCaseResult[]; // Change from TestResult[] to TestCaseResult[]
  submissionResult?: SubmissionResponse; // Change from TestResult to SubmissionResponse
}

export const AlgorithmSolver: React.FC<AlgorithmSolverProps> = ({
  problem,
  onCodeChange,
  onSubmit,
  onRunTests,
  isRunning,
  isSubmitting,
  testResults,
  submissionResult,
}) => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<SupportedLanguage | null>(null); // State to hold SupportedLanguage object
  const [code, setCode] = useState(() => {
    // Get initial code from problem's starter code or code templates
    // Default to python if no language selected yet
    const initialLanguageId = 'python'; 
    const initialCodeFromProblem = problem?.starter_code?.[initialLanguageId] || '';
    // If no starter code, check code templates for the initial language
    if (!initialCodeFromProblem && problem?.code_templates && problem.code_templates.length > 0) {
        const template = problem.code_templates.find(t => t.language === initialLanguageId);
        return template?.template_code || '';
    }
    return initialCodeFromProblem;
  });

  // Effect to set initial language once languages are loaded or problem changes
  useState<boolean>(true); // Dummy state to trigger update after problem/languages load

  const handleLanguageChange = (selectedLang: SupportedLanguage) => { // Accepts SupportedLanguage object
    setLanguage(selectedLang);
    const newCode = problem?.starter_code?.[selectedLang.id] || '';
    setCode(newCode);
    onCodeChange(selectedLang.id, newCode); // Pass language.id as string to parent
  };

  const handleLocalCodeChange = (newCode: string | undefined) => {
    const currentCode = newCode || '';
    setCode(currentCode);
    if (language) {
        onCodeChange(language.id, currentCode); // Pass current language.id
    }
  };

  const editorHeight = submissionResult ? 'calc(100% - 120px)' : '100%';

  return (
    <div className="h-full flex flex-col">
      {/* Language Selector */}
      <div className="mb-4">
        <LanguageSelector
          selectedLanguage={language || { id: 'python', name: 'Python', extension: '.py', supports_classes: true }} // Provide a default object
          onLanguageChange={handleLanguageChange}
          // languages={['python', 'javascript', 'typescript', 'java', 'cpp']} // Removed, LanguageSelector fetches internally
        />
      </div>

      <div className="space-y-6">
        <div className="flex-grow">
          <CodeEditor
            value={code}
            language={language?.id || 'python'} // Use language.id
            onChange={handleLocalCodeChange}
            height={editorHeight}
            theme="vs-dark"
            className="border border-arena-border rounded-lg overflow-hidden"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onRunTests}
            disabled={isRunning || !code.trim() || !language}
            variant="ghost"
            className="flex-1 border border-arena-border hover:border-arena-accent/40"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-accent border-t-transparent mr-2"></div>
                {t('coding.runningTests')}...
              </>
            ) : (
              t('coding.runTests')
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim() || !language}
            variant="gradient"
            className="flex-1 font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                {t('coding.submitting')}...
              </>
            ) : (
              t('coding.submitSolution')
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {testResults && testResults.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-white">{t('coding.testResults')}</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className={`p-2 rounded-md text-sm flex items-center gap-2 ${
                    result.status.name === 'Accepted' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {result.status.name === 'Accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>{t('coding.testCase', { number: index + 1 })}: {result.status.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissionResult && (
            <div className={`p-3 rounded-md text-sm ${
              submissionResult.accepted ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
            }`}>
              <h3 className="font-bold mb-1">
                {submissionResult.accepted ? t('coding.solutionAccepted') : t('coding.solutionIncorrect')}
              </h3>
              <p>{t('coding.passedTestCases', { passed: submissionResult.passed_tests, total: submissionResult.total_tests })}</p>
              {submissionResult.error_message && <p className="mt-1">{t('common.error')}: {submissionResult.error_message}</p>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <Button
            onClick={onRunTests}
            disabled={isRunning || !code.trim() || !language}
            variant="ghost"
            className="flex-1 border border-arena-border hover:border-arena-accent/40"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-accent border-t-transparent mr-2"></div>
                {t('coding.runningTests')}...
              </>
            ) : (
              t('coding.runTests')
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim() || !language}
            variant="gradient"
            className="flex-1 font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                {t('coding.submitting')}...
              </>
            ) : (
              t('coding.submitSolution')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 