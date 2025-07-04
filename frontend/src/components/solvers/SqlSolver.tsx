import React, { useState } from 'react';
import { CodeEditor } from '../ui/CodeEditor';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

interface SqlSolverProps {
  problem: {
    description: string;
    // Add other relevant problem properties here
  };
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
        <p className="mt-2 text-sm">{problem.description}</p>
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