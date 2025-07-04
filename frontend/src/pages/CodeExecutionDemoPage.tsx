/**
 * 🎯 CODE EXECUTION DEMO PAGE
 * Демо-страница для профессиональной системы выполнения кода
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Send,
  Loader2,
} from 'lucide-react';
import { codeExecutionService, type SupportedLanguage } from '../services/codeExecutionService';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import LanguageSelector from '../components/coding/LanguageSelector';
import SubmissionResult from '../components/coding/SubmissionResult';
import { useAuth } from '../contexts/AuthContext';
import { duelsApiService } from '../services/duelService'; // Import duel service
import type { DuelProblem, Problem, SubmissionResponse, DuelResponse, Language } from '../types/duel.types';
import { useTranslation } from 'react-i18next';
import CodeExecutionPanel from '../components/coding/CodeExecutionPanel';

// Define a type for a Problem in the context of this demo page,
// combining properties from Problem and DuelProblem as needed.
// This resolves the 'code_templates' conflict by making it optional in Problem
// and explicitly allowing null in DuelProblem, ensuring compatibility.
type ProblemForDemo = Problem & DuelProblem;

const CodeExecutionDemoPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [code, setCode] = useState<string>(''); // Initial code will be loaded from problem starter_code
  const [language, setLanguage] = useState<SupportedLanguage | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [problem, setProblem] = useState<ProblemForDemo | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
  const [currentDuel, setCurrentDuel] = useState<DuelResponse | null>(null); // State for the active duel
  const { t } = useTranslation();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (!isAuthenticated || !user?.id) {
        // If not authenticated, we can't fetch or create duels
        setIsLoading(false);
        return;
      }

      try {
        // 1. Load languages
        const supportedLangs = await codeExecutionService.getSupportedLanguages();
        setLanguages(supportedLangs);
        const pythonLang = supportedLangs.find(lang => lang.id === 'python');
        if (pythonLang) {
          setLanguage(pythonLang);
        }

        let fetchedDuel: DuelResponse | null = null;
        try {
          // 2. Try to fetch an active or waiting duel for the user
          fetchedDuel = await duelsApiService.getDuelForUser(user.id);
          console.log('Fetched existing duel:', fetchedDuel);
        } catch (error) {
          console.warn('No active or waiting duel found, creating a new one.');
        }

        if (!fetchedDuel) {
          // 3. If no active duel, create a new AI duel
          console.log('Attempting to create a new AI duel...');
          const newDuel = await duelsApiService.createAIDuel({
            user_id: user.id,
            theme: 'algorithms', // Default theme
            difficulty: 'easy',  // Default difficulty
            language: pythonLang?.id || 'python', // Default language
            category: 'algorithms', // Default category
          });
          fetchedDuel = newDuel;
          console.log('Created new AI duel:', fetchedDuel);
        }

        if (fetchedDuel?.problem) {
          setCurrentDuel(fetchedDuel);
          setProblem(fetchedDuel.problem as ProblemForDemo);
          const initialCode = fetchedDuel.problem.starter_code?.[pythonLang?.id || 'python'] || '';
          setCode(initialCode);
          console.log('Problem loaded:', fetchedDuel.problem);
        } else {
          console.error('Duel or problem data is missing after fetch/create:', fetchedDuel);
          setSubmissionResult({
            is_correct: false,
            error: 'Failed to load problem data. Please try again.',
            passed: 0,
            total: 0,
            details: null,
          });
        }
      } catch (err: any) {
        console.error('Error loading duel or problem:', err);
        setSubmissionResult({
          is_correct: false,
          error: `Failed to load problem: ${err.message || 'Unknown error'}`,
          passed: 0,
          total: 0,
          details: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user?.id]); // Rerun when auth status or user ID changes

  const handleLanguageChange = (selectedLangId: string) => {
    const newLang = languages.find(lang => lang.id === selectedLangId);
    if (newLang) {
      setLanguage(newLang);
      setCode(problem?.starter_code?.[newLang.id] || '');
    }
  };

  const executeCode = async (isSubmission: boolean) => {
    if (!language || !code.trim() || !problem || !user?.id || !currentDuel?.id) {
      setSubmissionResult({
        is_correct: false,
        error: 'Please provide code, select a language, and ensure a problem is loaded and a duel is active.',
        passed: 0,
        total: 0,
        details: null,
      });
      return;
    }

    setIsLoading(true);
    setSubmissionResult(null); // Clear previous results

    try {
      let response: SubmissionResponse;
      const submissionData = {
        player_id: user.id,
        language: language.id as Language, // Cast to Language type
        code: code,
      };

      if (isSubmission) {
        response = await duelsApiService.submitSolution(currentDuel.id, submissionData);
      } else {
        // For 'Run Tests', use the same submission data
        response = await duelsApiService.testCode(currentDuel.id, { code, language: language.id as Language });
      }
      setSubmissionResult(response);
      console.log('API Response:', response);

    } catch (err: any) {
      console.error('Error during code execution:', err);
      setSubmissionResult({
        is_correct: false,
        error: err.response?.data?.detail || err.message || 'An unknown error occurred.',
        passed: 0,
        total: 0,
        details: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-80px)] p-6 space-y-6 lg:space-y-0 lg:space-x-6 bg-arena-dark text-white">
      {/* Problem Description Panel */}
      <Card className="glass p-6 rounded-lg shadow-lg relative overflow-hidden flex-1 lg:max-w-[40%]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold mb-2 flex items-center">
            <Zap className="mr-2 text-yellow-400" />
            {problem?.title || "Problem Loading..."}
          </CardTitle>
          <CardDescription className="text-arena-text-muted">
            Difficulty: {problem?.difficulty || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert text-arena-text">
            {problem?.description ? (
              <p>{problem.description}</p>
            ) : (
              <p className="animate-pulse">Loading problem description...</p>
            )}
            <h4 className="mt-4 font-semibold text-white">Examples:</h4>
            {(problem?.test_cases || []).filter(tc => !tc.is_hidden).map((tc, index) => (
              <div key={index} className="bg-arena-surface/30 p-3 rounded-md mb-2">
                <p className="font-mono text-sm">Input: <span className="text-arena-accent">{tc.input_data}</span></p>
                <p className="font-mono text-sm">Output: <span className="text-green-400">{tc.expected_output}</span></p>
                {tc.explanation && <p className="text-xs text-arena-text-dim mt-1">{tc.explanation}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Editor & Output Panel */}
      <Card className="glass p-6 rounded-lg shadow-lg relative overflow-hidden flex-1 lg:max-w-[60%] flex flex-col">
        <CardHeader className="flex flex-row justify-between items-center pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Play className="text-blue-400" />
            Your Code
          </CardTitle>
          <div className="flex items-center space-x-2">
            <LanguageSelector
              selectedLanguage={language?.id || 'python'}
              onLanguageChange={handleLanguageChange}
              className="w-40"
              disabled={isLoading || !problem}
            />
            <Button
              onClick={() => executeCode(false)}
              disabled={!isAuthenticated || !code.trim() || isLoading || !currentDuel?.id}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && !submissionResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Run Tests</span>
            </Button>
            <Button
              onClick={() => executeCode(true)}
              disabled={!isAuthenticated || !code.trim() || isLoading || !currentDuel?.id}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && submissionResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit Solution</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 p-0">
          <div className="flex-grow">
            <CodeExecutionPanel
              problem={problem}
              onCodeChange={handleCodeChange}
              initialCode={code}
              submissionResult={submissionResult}
              selectedLanguage={language?.id as Language || 'python'}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          <div className="bg-arena-surface/40 p-4 rounded-b-lg border-t border-arena-border relative">
            <div className="font-mono text-sm text-arena-text-dim mb-2 flex justify-between items-center">
              <span>CONSOLE OUTPUT</span>
              {(submissionResult && submissionResult.passed !== undefined && submissionResult.total !== undefined) && (
                <span className="text-xs text-arena-text-muted">
                  {submissionResult.passed} / {submissionResult.total} tests passed
                </span>
              )}
            </div>
            <div className="bg-arena-dark p-3 rounded-md min-h-[100px] max-h-[250px] overflow-y-auto text-arena-text whitespace-pre-wrap font-mono text-xs">
              {/* SubmissionResult will now handle all output based on `submissionResult` */}
              <SubmissionResult
                submission={submissionResult}
                t={t}
              />
              {/* Re-introducing general loading/empty state for clarity if SubmissionResult doesn't render it */}
              {!isLoading && !submissionResult && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <span>Click 'Run Tests' or 'Submit Solution' to see the output here.</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-2">
            Debug: isAuthenticated={String(isAuthenticated)}, code_empty={String(!code.trim())}, isLoading={String(isLoading)}, currentDuel_id={currentDuel?.id ? 'true' : 'false'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeExecutionDemoPage;