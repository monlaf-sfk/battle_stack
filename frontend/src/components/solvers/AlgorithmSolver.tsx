import { useState } from 'react';
import type { DuelProblem, TestResult } from '../../types/duel.types';
import { CodeEditor, LanguageSelector } from '../ui/CodeEditor';
import { Button } from '../ui/Button';

import { Card, CardContent } from '../ui/Card';

interface AlgorithmSolverProps {
  problem: DuelProblem;
  onCodeChange: (language: string, code: string) => void;
  onSubmit: () => void;
  onRunTests: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  testResults: TestResult[];
}

export const AlgorithmSolver: React.FC<AlgorithmSolverProps> = ({
  problem,
  onCodeChange,
  onSubmit,
  onRunTests,
  isRunning,
  isSubmitting,
  testResults,
}) => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(() => {
    // Get initial code from problem's starter code or code templates
    if (problem.starter_code && problem.starter_code[language]) {
      return problem.starter_code[language];
    }
    if (problem.code_templates && problem.code_templates.length > 0) {
      const template = problem.code_templates.find(t => t.language === language);
      return template?.template_code || '';
    }
    return '';
  });

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Get starter code for the new language
    let newCode = '';
    if (problem.starter_code && problem.starter_code[newLanguage]) {
      newCode = problem.starter_code[newLanguage];
    } else if (problem.code_templates && problem.code_templates.length > 0) {
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

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card variant="glass">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-arena-text mb-4">Test Results</h3>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.is_solution_correct
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-red-500/30 bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Test Case {index + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          result.is_solution_correct
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {result.is_solution_correct ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    {result.error && (
                      <p className="text-red-400 text-sm mt-2">{result.error}</p>
                    )}
                    {result.execution_time_ms && (
                      <p className="text-arena-text-muted text-xs mt-1">
                        Execution time: {result.execution_time_ms}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}; 