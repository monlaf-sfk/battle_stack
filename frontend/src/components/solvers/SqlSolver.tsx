import React, { useState } from 'react';
import { CodeEditor } from '../ui/CodeEditor';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import type { Problem } from '../../services/api'; // Import Problem type

interface SqlSolverProps {
  problem: Problem; // Use Problem type directly
  onSubmit: (solution: string) => void;
}

const SqlSolver: React.FC<SqlSolverProps> = ({ problem, onSubmit }) => {
  const { t } = useTranslation(['common', 'duel']);
  const [solution, setSolution] = useState<string>('');

  const handleSubmit = () => {
    onSubmit(solution);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-800 text-white rounded-t-lg">
        <h2 className="text-xl font-bold">{t('sqlSolver.title')}</h2>
        {/* Access description safely with optional chaining or provide fallback */}
        <p className="mt-2 text-sm">{problem.description || 'No description provided.'}</p>
      </div>
      <div className="flex-grow">
        <CodeEditor
          language="sql"
          value={solution}
          onChange={(value: string | undefined) => setSolution(value || '')}
        />
      </div>
      <div className="p-4 bg-gray-800 rounded-b-lg flex justify-end">
        <Button onClick={handleSubmit}>{t('sqlSolver.submitQuery')}</Button>
      </div>
    </div>
  );
};

export default SqlSolver;