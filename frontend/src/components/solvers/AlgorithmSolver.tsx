import React, { useState, useEffect } from 'react';
import type { DuelProblem, TestResult } from '../../types/duel.types';
import { CodeEditor, LanguageSelector, ThemeToggle } from '../ui/CodeEditor';
import CodeExecutionPanel from '../coding/CodeExecutionPanel';
import { Button } from '../ui/Button';
import { Play, Send } from 'lucide-react';

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
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');

  useEffect(() => {
    if (problem.code_templates) {
      const template = problem.code_templates.find(t => t.language === selectedLanguage);
      if (template) {
        setCode(template.template_code);
        onCodeChange(selectedLanguage, template.template_code);
      } else {
        const defaultTemplate = problem.code_templates[0];
        if (defaultTemplate) {
          setSelectedLanguage(defaultTemplate.language);
          setCode(defaultTemplate.template_code);
          onCodeChange(defaultTemplate.language, defaultTemplate.template_code);
        }
      }
    }
  }, [selectedLanguage, problem.code_templates]);

  const handleLocalCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange(selectedLanguage, newCode);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow flex flex-col min-h-0">
        <div className="bg-arena-background-darker p-2 flex justify-between items-center rounded-t-lg">
          <LanguageSelector
            languages={problem.code_templates?.map(t => t.language) || ['python']}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
          />
          <ThemeToggle theme={editorTheme} onToggleTheme={setEditorTheme} />
        </div>
        <div className="flex-grow min-h-0">
          <CodeEditor
            language={selectedLanguage}
            value={code}
            onChange={(c) => handleLocalCodeChange(c || '')}
            theme={editorTheme}
          />
        </div>
      </div>
      <div className="flex-shrink-0">
        <CodeExecutionPanel
          testResults={testResults}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
        >
          <div className="flex items-center gap-4 p-4 bg-arena-background-darker rounded-b-lg">
            <Button onClick={onRunTests} disabled={isRunning || isSubmitting} variant="secondary" className="gap-2">
              <Play size={16} />
              Run Tests
            </Button>
            <Button onClick={onSubmit} disabled={isRunning || isSubmitting} variant="gradient" className="gap-2">
              <Send size={16} />
              Submit
            </Button>
          </div>
        </CodeExecutionPanel>
      </div>
    </div>
  );
}; 