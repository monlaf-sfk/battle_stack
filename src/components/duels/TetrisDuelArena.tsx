import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { TFunction } from 'i18next';
import { ProblemDescription } from '@/components/duels/ProblemDescription';
import { SubmissionResult } from '@/components/duels/SubmissionResult';
import { Skeleton } from '@/components/ui/skeleton';
import { AIOpponentStatus } from '@/components/duels/AIOpponentStatus';
import { AntiCopyBlurOverlay } from '@/components/duels/AntiCopyBlurOverlay';
import { UserProgress } from '@/components/duels/UserProgress';
import { LanguageSelector } from '@/components/coding/LanguageSelector';
import { useDuel } from '@/contexts/DuelContext';
import { useTranslation } from 'react-i18next';

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
    userTestResults,
    opponentTestResults,
    opponentIsTyping,
    isCompleted,
    isConnecting,
    error,
    aiOpponentCode,
    aiProgressPercentage
  } = useDuel();

  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('problem');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submissionResult, setSubmissionResult] = useState(null);
  
  useEffect(() => {
    if (problemIdParam) {
      connect(problemIdParam);
    }
    return () => {
      if (problemIdParam) {
        disconnect();
      }
    };
  }, [problemIdParam, connect, disconnect]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (duelState.duel?.id) {
      updateCode(duelState.duel.id, language, newCode);
    }
  };

  const onSubmit = () => {
    if (duelState.duel?.id) {
      submitCode(duelState.duel.id, code, language);
    }
  };

  if (isConnecting) return <Skeleton className="h-full w-full" />;
  if (error) return <p>Error: {error}</p>;
  if (!duelState.duel || !duelState.problem) return <p>Loading duel...</p>;

  return (
    <div className="flex h-full p-4 space-x-4">
      <Card className="w-1/2 flex flex-col">
        <CardHeader>
          <CardTitle>{duelState.problem.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <ProblemDescription problem={duelState.problem} t={t} />
        </CardContent>
      </Card>
      <div className="w-1/2 flex flex-col space-y-4">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />
          </CardHeader>
          <CardContent className="flex-grow">
            <CodeEditor
              value={code}
              language={language}
              onChange={handleEditorChange}
              theme="vs-dark"
            />
          </CardContent>
        </Card>
        <div className="flex space-x-2">
            <Button onClick={onSubmit}>Submit</Button>
        </div>
        <Card>
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
                {userTestResults && <SubmissionResult submission={userTestResults} t={t} />}
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TetrisDuelArena;
