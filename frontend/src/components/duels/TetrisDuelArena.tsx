import React, { useState, useEffect } from 'react';
import { useDuel } from '@/contexts/DuelContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { FullTetrisDuel } from './FullTetrisDuel';
import { DuelLoading } from './DuelLoading';
import { DuelError } from './DuelError';
import { DuelComplete } from './DuelComplete';
import { ProblemDescription } from './ProblemDescription';
import LanguageSelector from '../coding/LanguageSelector';
import SubmissionResult from '../coding/SubmissionResult';
import { Button } from '../ui/Button';
import { Play, Send } from 'lucide-react';
import { CodeEditor } from '../ui/CodeEditor';
import { AntiCopyBlurOverlay, useAntiCopyProtection } from './AntiCopyBlurOverlay';
import { AIOpponentStatus } from './AIOpponentStatus';
import type { SubmissionResponse } from '@/types/duel.types';

interface TetrisDuelArenaProps {
  problemIdParam?: string;
}

const TetrisDuelArena: React.FC<TetrisDuelArenaProps> = ({ problemIdParam }) => {
  const {
    duelState,
    connect,
    disconnect,
    updateCode,
    submitCode,
    testCode,
    joinDuel,
    setProblemId,
    opponentIsTyping,
    opponentTestResults,
    aiProgressPercentage
  } = useDuel();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isBlurred, triggerBlur } = useAntiCopyProtection();
  
  const currentDuel = duelState.duel;

  useEffect(() => {
    if (problemIdParam) {
      setProblemId(problemIdParam);
      if (!currentDuel || currentDuel.id !== problemIdParam) {
        connect(problemIdParam);
      }
    }
    return () => {
      if (currentDuel) {
        disconnect();
      }
    };
  }, [problemIdParam, connect, disconnect, setProblemId, currentDuel]);

  useEffect(() => {
    if (currentDuel?.problem?.starter_code) {
      const starterCode = currentDuel.problem.starter_code[selectedLanguage] || '';
      setCode(starterCode);
    }
  }, [currentDuel?.problem?.starter_code, selectedLanguage]);

  useEffect(() => {
    if (user && currentDuel && !duelState.isConnected) {
      joinDuel();
    }
  }, [user, currentDuel, duelState.isConnected, joinDuel]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (currentDuel) {
      updateCode(currentDuel.id, selectedLanguage, newCode);
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (currentDuel?.problem?.starter_code) {
      setCode(currentDuel.problem.starter_code[language] || '');
    }
  };

  const onTest = () => {
    if (currentDuel) {
      setIsRunning(true);
      testCode(currentDuel.id, code, selectedLanguage);
      setTimeout(() => setIsRunning(false), 2000);
    }
  };

  const onSubmit = () => {
    if (currentDuel) {
      setIsSubmitting(true);
      submitCode(currentDuel.id, code, selectedLanguage);
      setTimeout(() => setIsSubmitting(false), 2000); // Reset after a while
    }
  };

  if (duelState.isConnecting) return <DuelLoading message={t('duels.initializingArena')} t={t} />;
  if (duelState.error) return <DuelError message={duelState.error} t={t} />;
  if (!currentDuel) return <DuelLoading message={t('duels.loadingDuel')} t={t}/>;

  if (duelState.isCompleted && duelState.duelResult) {
    return <DuelComplete results={{
      playerScore: duelState.duelResult.player_one_result?.score,
      opponentScore: duelState.duelResult.player_two_result?.score,
      userTestResults: duelState.userTestResults,
      opponentTestResults: duelState.opponentTestResults
    }} onRematch={() => {}} t={t} />;
  }
  
  const isOpponentPresent = currentDuel.participants.length > 1;

  const userSubmissionResult = (): SubmissionResponse | null => {
    const testResult = duelState.userTestResults;
    if (!testResult) return null;

    return {
      is_correct: testResult.is_solution_correct ?? (testResult.passed === testResult.total_tests),
      passed: testResult.passed,
      total: testResult.total_tests,
      error: testResult.error,
      details: testResult.test_results?.map(r => `Test case ${r.test_case}: ${r.status}`)
    };
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans" onCopy={triggerBlur}>
      <AntiCopyBlurOverlay isBlurred={isBlurred} t={t} message={t('duels.potentialCodeCopy')} />

      {/* Problem Description */}
      <div className="w-1/3 p-4 border-r border-gray-800 flex flex-col">
        <ProblemDescription problem={currentDuel.problem} t={t} />
      </div>

      {/* Code Editor and Console */}
      <div className="w-1/3 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
          />
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={onTest} disabled={isRunning}>
              <Play size={16} className="mr-2" />
              {isRunning ? t('duels.executing') : t('duels.run')}
            </Button>
            <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
              <Send size={16} className="mr-2" />
              {isSubmitting ? t('duels.submitting') : t('duels.submit')}
            </Button>
          </div>
        </div>
        {/* Editor */}
        <div className="flex-grow">
          <CodeEditor
            language={selectedLanguage}
            value={code}
            onChange={handleEditorChange}
            height="100%"
            theme="vs-dark"
          />
        </div>
        {/* Console */}
        <div className="h-1/3 border-t-2 border-gray-800 flex flex-col">
          <div className="bg-gray-800 p-2 text-sm font-semibold text-gray-300">
            {t('duels.consoleOutput')}
          </div>
          <div className="p-4 overflow-auto flex-grow bg-gray-900">
            <SubmissionResult submission={userSubmissionResult()} t={t} />
          </div>
        </div>
      </div>

      {/* Opponent View */}
      <div className="w-1/3 p-4 border-l border-gray-800 flex flex-col">
        <AIOpponentStatus 
            isAIOpponent={true} 
            t={t} 
            opponentIsTyping={opponentIsTyping}
            opponentTestResults={opponentTestResults}
            getOpponentProgress={() => aiProgressPercentage}
        />
        {isOpponentPresent ? (
          <FullTetrisDuel
            problem={currentDuel.problem}
            participants={currentDuel.participants}
            currentUser={user}
            timeRemaining={600}
            isCompleted={duelState.isCompleted}
          />
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-500">{t('duels.waitingForOpponent')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TetrisDuelArena; 