import { useState, useEffect } from 'react';
import type { DuelProblem } from '../../types/duel.types';
import { CodeEditor, ThemeToggle } from '../ui/CodeEditor';
import { Button } from '../ui/Button';
import { Send } from 'lucide-react';

interface SqlSolverProps {
  problem: DuelProblem;
  onCodeChange: (language: string, code: string) => void;
}

export const SqlSolver: React.FC<SqlSolverProps> = ({ problem, onCodeChange }) => {
  const [code, setCode] = useState('');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');

  useEffect(() => {
    const template = problem.code_templates?.find(t => t.language === 'sql');
    const initialCode = template ? template.template_code : '-- Write your SQL query here\n';
    setCode(initialCode);
    onCodeChange('sql', initialCode);
  }, [problem]);

  const handleLocalCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange('sql', newCode);
  }

  return (
    <div className="flex flex-col h-full">
      <p className="p-2 text-sm text-arena-text-muted bg-arena-background-darker rounded-t-lg">
        Write a SQL query to solve the problem. Your query will be executed against the database schema described in the problem.
      </p>
      <div className="flex-grow min-h-0">
        <CodeEditor
          language="sql"
          value={code}
          onChange={(c) => handleLocalCodeChange(c || '')}
          theme={editorTheme}
        />
      </div>
      <div className="flex items-center gap-4 p-4 bg-arena-background-darker rounded-b-lg">
        <Button variant="gradient" className="gap-2">
          <Send size={16} />
          Submit Query
        </Button>
        <ThemeToggle theme={editorTheme} onToggleTheme={setEditorTheme} />
      </div>
    </div>
  );
}; 