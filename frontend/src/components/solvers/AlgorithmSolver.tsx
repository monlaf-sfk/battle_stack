import { useState } from 'react';
import type { DuelProblem, TestResult } from '../../types/duel.types';
import { CodeEditor, LanguageSelector } from '../ui/CodeEditor';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle } from 'lucide-react';

interface AlgorithmSolverProps {
  problem: DuelProblem | null;
  onCodeChange: (language: string, code: string) => void;
  onSubmit: () => void;
  onRunTests: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  testResults: TestResult[];
  submissionResult?: TestResult;
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
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(() => {
    // Get initial code from problem's starter code or code templates
    if (problem?.starter_code && problem.starter_code[language]) {
      return problem.starter_code[language];
    }
    if (problem?.code_templates && problem.code_templates.length > 0) {
      const template = problem.code_templates.find(t => t.language === language);
      return template?.template_code || '';
    }
    return '';
  });

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Get starter code for the new language
    let newCode = '';
    if (problem?.starter_code && problem.starter_code[newLanguage]) {
      newCode = problem.starter_code[newLanguage];
    } else if (problem?.code_templates && problem.code_templates.length > 0) {
      const template = problem.code_templates.find(t => t.language === newLanguage);
      newCode = template?.template_code || '';
    }
    setCode(newCode);
    onCodeChange(newLanguage, newCode);
  };

  const handleLocalCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange(language, newCode);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Language Selector */}
      <div className="mb-4">
        <LanguageSelector
          selectedLanguage={language}
          onSelectLanguage={handleLanguageChange}
          languages={['python', 'javascript', 'typescript', 'java', 'cpp']}
        />
      </div>

      <div className="space-y-6">
        <CodeEditor
          value={code}
          onChange={handleLocalCodeChange}
          language={language}
          height="400px"
          theme="vs-dark"
          className="border border-arena-border rounded-lg overflow-hidden"
        />

        <div className="flex gap-3">
          <Button
            onClick={onRunTests}
            disabled={isRunning || !code.trim()}
            variant="ghost"
            className="flex-1 border border-arena-border hover:border-arena-accent/40"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-accent border-t-transparent mr-2"></div>
                Running Tests...
              </>
            ) : (
              'Run Tests'
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim()}
            variant="gradient"
            className="flex-1 font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Solution'
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {testResults && testResults.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-white">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className={`p-2 rounded-md text-sm flex items-center gap-2 ${
                    result.is_correct ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {result.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>Test Case {index + 1}: {result.is_correct ? 'Passed' : 'Failed'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissionResult && (
            <div className={`p-3 rounded-md text-sm ${
              submissionResult.is_correct ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
            }`}>
              <h3 className="font-bold mb-1">
                {submissionResult.is_correct ? 'Solution Accepted!' : 'Solution Incorrect'}
              </h3>
              <p>Passed {submissionResult.passed}/{submissionResult.total} test cases.</p>
              {submissionResult.error && <p className="mt-1">Error: {submissionResult.error}</p>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <Button
            onClick={onRunTests}
            disabled={isRunning || !code.trim()}
            variant="ghost"
            className="flex-1 border border-arena-border hover:border-arena-accent/40"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-accent border-t-transparent mr-2"></div>
                Running Tests...
              </>
            ) : (
              'Run Tests'
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !code.trim()}
            variant="gradient"
            className="flex-1 font-semibold"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Solution'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 