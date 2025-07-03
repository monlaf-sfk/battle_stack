import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Timer, 
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  Play,
  Send,
  Loader2,
  AlertCircle,
  Book,
  X,
  TestTube
} from 'lucide-react';

import { CodeEditor } from '../ui/CodeEditor';
import { useUniversalDuelSocket } from '../../hooks/useUniversalDuelSocket';
import { DuelComplete } from './DuelComplete';
import type { Duel, WSMessage, DuelResult, Language, DuelProblem, DuelSubmission } from '../../types/duel.types';
import { duelsApiService } from '../../services/duelService';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

interface TetrisDuelArenaProps {
  duel: Duel;
}

interface SubmissionError {
  message: string;
  details: string[];
  passed?: number;
  total?: number;
}

// Helper to extract problem data
const getProblemData = (duel: Duel): DuelProblem | null => {
    if (duel.results?.ai_problem_data) {
        return duel.results.ai_problem_data;
    }
    return duel.problem || null;
};

export const TetrisDuelArena: React.FC<TetrisDuelArenaProps> = ({ duel }) => {
  const { user } = useAuth();
  const userId = user?.id || '';
  const problemData = getProblemData(duel);
  
  const getInitialCode = () => {
    const defaultCode = `def solution(nums):
    # Write your solution here
    pass`;
    
    if (!problemData || !problemData.code_templates) return defaultCode;

    const template = problemData.code_templates.find((t: { language: string; template_code: string }) => t.language === 'python');
    return template ? template.template_code : defaultCode;
  };
  
  // State management
  const [code, setCode] = useState(getInitialCode());
  const [language] = useState<Language>('python');
  const [opponentCode, setOpponentCode] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<SubmissionError | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [aiStartedTyping, setAiStartedTyping] = useState(false);
  const [duelComplete, setDuelComplete] = useState(false);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  const { showNotification } = useNotifications();

  // Calculate remaining time
  const timeLimit = duel.time_limit_seconds || 900;
  const remainingTime = Math.max(0, timeLimit - elapsedTime);
  const isTimeWarning = remainingTime < 60;
  const isTimeCritical = remainingTime < 30;

  // Timer effect
  useEffect(() => {
    if (duel.status !== 'in_progress' || !duel.started_at) {
      setElapsedTime(0);
      return;
    }

    const calculateElapsed = () => {
      const startTime = new Date(duel.started_at as string).getTime();
      const now = new Date().getTime();
      return Math.floor((now - startTime) / 1000);
    };

    setElapsedTime(calculateElapsed());

    const interval = setInterval(() => {
      const currentElapsedTime = calculateElapsed();
      if (currentElapsedTime >= timeLimit) {
        clearInterval(interval);
         if(duel.status === 'in_progress') {
          showNotification('error', "Time's Up!", 'The duel has ended due to time limit.');
        }
      }
      setElapsedTime(currentElapsedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [duel.status, duel.started_at, timeLimit, showNotification]);

  // WebSocket message handler
  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'code_update':
        if (message.user_id !== userId) setOpponentCode(message.code || '');
        break;
      case 'ai_progress':
        // This is AI typing progress
        const aiCodeChunk = message.data.code_chunk;
        setAiStartedTyping(true);
        setOpponentCode(prev => prev + aiCodeChunk);

        // Update AI's code in the duel state (optional for rendering AI's code)
        // if (aiCodeChunk !== undefined) {
        //   // Assuming you have a dispatch function to update the duel state
        //   // dispatch({
        //   //   type: 'SOCKET_MESSAGE_RECEIVED',
        //   //   payload: {
        //   //     type: 'code_update',
        //   //     user_id: aiOpponentId,
        //   //     code: (duel.player_two_code || '') + aiCodeChunk,
        //   //     language: selectedLanguage, // Assume AI uses the same language as player for now
        //   //     timestamp: Date.now(),
        //   //   },
        //   // });
        // }
        break;
      case 'ai_delete':
        // Handle AI deleting characters
        const charCount = message.data.char_count;
        setOpponentCode(prev => prev.slice(0, -charCount));
        setAiStartedTyping(true);

        // Update AI's code in the duel state (optional for rendering AI's code)
        // dispatch({
        //   type: 'SOCKET_MESSAGE_RECEIVED',
        //   payload: {
        //   //     type: 'code_update',
        //   //     user_id: aiOpponentId,
        //   //     code: (duel.player_two_code || '').slice(0, -charCount),
        //   //     language: selectedLanguage, // Assume AI uses the same language as player for now
        //   //     timestamp: Date.now(),
        //   },
        // });
        break;
      case 'test_result':
        if (message.user_id === userId) {
            setTestResults(message.data);
            setIsTesting(false);
            setShowTestResults(true);
        }
        break;
      case 'duel_end':
        try {
          const duelEndMessageData = message.data; // Now directly an object
          setDuelComplete(true);
          setDuelResult(duelEndMessageData);
        } catch (error) {
          console.error('Error processing duel_end message in TetrisDuelArena:', error, message.data);
        }
        break;
      default:
        console.log('Unknown message type', (message as any).type);
    }
  }, [userId, aiStartedTyping]);

  const { sendMessage } = useUniversalDuelSocket({
    duelId: duel.id,
    userId,
    onMessage: handleMessage,
    onStatusChange: setConnectionStatus,
    enabled: true
  });

  // Code change handler
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    sendMessage({ type: 'code_update', user_id: userId, data: { code: newCode, language } });
  }, [sendMessage, language, userId]);

  // Test code handler
  const handleTestCode = useCallback(async () => {
    if (!code.trim() || isTesting) return;
    setIsTesting(true);
    setTestResults(null);
    try {
      await duelsApiService.testCode(duel.id, { code, language });
      showNotification('info', 'Test Submitted', 'Your code is being tested...');
    } catch (error) {
      console.error('Error testing code:', error);
      showNotification('error', 'Test Failed', 'Could not submit your code for testing.');
      setIsTesting(false);
    }
  }, [code, language, duel.id, isTesting, showNotification]);

  // Submit code handler
  const handleSubmitCode = useCallback(async () => {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const submission: DuelSubmission = {
        player_id: userId,
        code,
        language,
      };
      const result = await duelsApiService.submitSolution(duel.id, submission);

      if (result.is_correct) {
        showNotification('success', 'Solution Submitted', 'Your final solution was correct!');
      } else {
        // Even if not correct, we show the results from the response.
        setSubmissionError({ 
            message: result.error || 'One or more test cases failed.',
            details: result.details || [],
            passed: result.passed,
            total: result.total,
        });
        setShowTestResults(true);
        showNotification('error', 'Submission Failed', result.error || 'Your solution failed one or more test cases.');
      }
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      // Fallback for unexpected network errors
      showNotification('error', 'Submission Error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, duel.id, userId, showNotification, isSubmitting]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (duelComplete && duelResult) {
    return <DuelComplete result={duelResult} currentUserId={userId} />;
  }

  if (!problemData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const visibleTestCases = problemData.test_cases?.filter(tc => !tc.is_hidden) || [];
  
  const resultsToDisplay = submissionError || testResults;
  
  const userStats = {
    pieces: testResults?.passed || 0,
    attack: testResults?.passed ? testResults.passed * 10 : 0,
    ko: testResults?.is_correct ? 1 : 0
  };

  const opponentStats = {
    pieces: 0,
    attack: 0,
    ko: 0
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-black/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProblemModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors border border-purple-600/30"
          >
            <Book className="w-4 h-4" />
            <span className="font-medium">View Problem</span>
          </button>
          <h1 className="text-xl font-bold">{problemData.title}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            problemData.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            problemData.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {problemData.difficulty}
          </span>
        </div>
        <div className={`flex items-center gap-2 text-2xl font-mono font-bold ${
          isTimeCritical ? 'text-red-500 animate-pulse' : 
          isTimeWarning ? 'text-yellow-500' : 
          'text-white'
        }`}>
          <Timer className="w-6 h-6" />
          {formatTime(remainingTime)}
        </div>
      </div>

      {/* Main Arena */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Player Side */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          {/* Player Header */}
          <div className="h-20 bg-gradient-to-r from-blue-600/20 to-transparent border-b border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg">
                {user?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div>
                <div className="font-bold">{user?.username || 'Player'}</div>
                <div className="text-sm text-gray-400">You</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-gray-400">PIECES</div>
                <div className="text-2xl font-bold">{userStats.pieces}</div>
                <div className="text-xs text-gray-500">0.55/s</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">ATTACK</div>
                <div className="text-2xl font-bold">{userStats.attack}</div>
                <div className="text-xs text-gray-500">11.10/M</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">KO's</div>
                <div className="text-2xl font-bold">{userStats.ko}</div>
              </div>
            </div>
          </div>

          {/* Player Code Editor */}
          <div className="flex-1 bg-gray-950">
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              language={language}
              readOnly={false}
            />
          </div>

          {/* Player Actions */}
          <div className="h-16 bg-black/50 border-t border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              {connectionStatus === 'connected' ? (
                <Activity className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-gray-400">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
              {testResults && (
                <button
                  onClick={() => setShowTestResults(true)}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  <span>View Results</span>
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleTestCode}
                disabled={isTesting || isSubmitting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Test
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isSubmitting || isTesting}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Center Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-purple-500 to-transparent"></div>

        {/* Opponent Side */}
        <div className="flex-1 flex flex-col">
          {/* Opponent Header */}
          <div className="h-20 bg-gradient-to-l from-red-600/20 to-transparent border-b border-gray-800 flex items-center justify-between px-6">
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-gray-400">PIECES</div>
                <div className="text-2xl font-bold">{opponentStats.pieces}</div>
                <div className="text-xs text-gray-500">0.50/s</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">ATTACK</div>
                <div className="text-2xl font-bold">{opponentStats.attack}</div>
                <div className="text-xs text-gray-500">3.17/M</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">KO's</div>
                <div className="text-2xl font-bold">{opponentStats.ko}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="font-bold text-right">AI Opponent</div>
                <div className="text-sm text-gray-400 text-right">Level {problemData.difficulty}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center font-bold text-lg">
                AI
              </div>
            </div>
          </div>

          {/* Opponent Code Editor */}
          <div className="flex-1 bg-gray-950">
            <CodeEditor
              value={opponentCode}
              onChange={() => {}}
              language={language}
              readOnly={true}
            />
          </div>

          {/* Opponent Status */}
          <div className="h-16 bg-black/50 border-t border-gray-800 flex items-center justify-center">
            {aiStartedTyping ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">AI is coding...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Waiting for AI...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Problem Modal */}
      <AnimatePresence>
        {showProblemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProblemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold">{problemData.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    problemData.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    problemData.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {problemData.difficulty}
                  </span>
                </div>
                <button
                  onClick={() => setShowProblemModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Description */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-3 text-purple-400">Description</h3>
                  <div className="text-gray-300 whitespace-pre-wrap">{problemData.description}</div>
                </div>

                {/* Constraints */}
                {problemData.constraints && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-yellow-400">Constraints</h3>
                    <pre className="text-sm text-gray-300 bg-gray-900 p-4 rounded-lg overflow-x-auto">
                      {problemData.constraints}
                    </pre>
                  </div>
                )}

                {/* Test Cases */}
                {visibleTestCases.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-cyan-400">Examples</h3>
                    <div className="space-y-4">
                      {visibleTestCases.map((tc, idx) => (
                        <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="font-bold text-sm mb-3 text-gray-400">Example {idx + 1}</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-blue-400 mb-2 font-medium">Input:</div>
                              <pre className="bg-black/50 p-3 rounded text-sm text-gray-300 overflow-x-auto">
                                {tc.input_data}
                              </pre>
                            </div>
                            <div>
                              <div className="text-sm text-green-400 mb-2 font-medium">Output:</div>
                              <pre className="bg-black/50 p-3 rounded text-sm text-gray-300 overflow-x-auto">
                                {tc.expected_output}
                              </pre>
                            </div>
                          </div>
                          {tc.explanation && (
                            <div className="mt-3 text-sm text-gray-400">
                              <span className="font-medium">Explanation:</span> {tc.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Results Modal */}
      <AnimatePresence>
        {showTestResults && resultsToDisplay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowTestResults(false)}
          >
            <div
              className="bg-gray-800 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <TestTube size={24} />
                  Test Results
                </h2>
                <button onClick={() => setShowTestResults(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              {resultsToDisplay ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    resultsToDisplay.is_correct || (!resultsToDisplay.error && !resultsToDisplay.message)
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {resultsToDisplay.is_correct || (!resultsToDisplay.error && !resultsToDisplay.message) ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <div>
                      <h3 className="font-bold text-lg">
                        {resultsToDisplay.message || (resultsToDisplay.is_correct ? 'All Public Tests Passed' : 'Some Tests Failed')}
                      </h3>
                      <p className="text-sm">
                        {resultsToDisplay.passed ?? '0'} out of {resultsToDisplay.total ?? '0'} test cases passed
                      </p>
                    </div>
                  </div>
                  {resultsToDisplay.details && resultsToDisplay.details.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-300">Failure Details:</h4>
                      <div className="max-h-60 overflow-y-auto bg-black/30 p-3 rounded-md space-y-2">
                        {resultsToDisplay.details.map((detail: string, index: number) => (
                          <p key={index} className="font-mono text-xs text-red-300 bg-red-900/20 p-2 rounded">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {resultsToDisplay.error && !resultsToDisplay.message && (
                      <p className="font-mono text-xs text-red-300 bg-red-900/20 p-2 rounded">
                        {resultsToDisplay.error}
                      </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-400 py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Running tests...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 