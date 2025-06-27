import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  duelsApiService,
  type DuelResponse,
  type Language
} from '../../services/duelService';
import type {
  DuelProblem,
  Participant,
  TestResult,
  WSMessage,
  ConnectionStatus,
  DuelComplete
} from '../../types/duel.types';
import { 
  formatTime, 
  createCodeUpdateMessage, 
  createTypingStatusMessage,
  clearDuelCodeFromStorage
} from '../../utils/duelHelpers';
import { useNotifications } from '../../hooks/useNotifications';
import { useDuelWebSocket } from '../../hooks/useDuelWebSocket';
import { DuelLoading } from './DuelLoading';
import { DuelError } from './DuelError';
import { DuelComplete as DuelCompleteComponent } from './DuelComplete';
import { DuelHeader } from './DuelHeader';
import { AIOpponentStatus } from './AIOpponentStatus';
import { ProblemDescription } from './ProblemDescription';
import { CodeTerminal } from './CodeTerminal';
import { NotificationToast } from './NotificationToast';



export const RealTimeDuel: React.FC = () => {
  const { duelId } = useParams<{ duelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, showNotification, removeNotification } = useNotifications();
  
  // State management
  const [duel, setDuel] = useState<DuelResponse | null>(null);
  const [problem, setProblem] = useState<DuelProblem | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myCode, setMyCode] = useState<string>('');
  const [opponentCode, setOpponentCode] = useState<string>('');
  const [language, setLanguage] = useState<Language>('python');
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [opponentTestResults, setOpponentTestResults] = useState<TestResult | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [opponentIsTyping, setOpponentIsTyping] = useState(false);
  const [duelCompleted, setDuelCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup and debouncing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const codeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for stable WebSocket callbacks - prevent re-renders
  const participantsRef = useRef<Participant[]>([]);
  const userIdRef = useRef<string>('');
  const duelIdRef = useRef<string>('');
  const showNotificationRef = useRef(showNotification);
  
  // Update refs when values change
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  
  useEffect(() => {
    userIdRef.current = user?.id || '';
  }, [user?.id]);
  
  useEffect(() => {
    duelIdRef.current = duelId || '';
  }, [duelId]);
  
  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      document.title = 'BattleStack - Code Duels';
    };
  }, []);

  // Load initial duel data
  useEffect(() => {
    if (!duelId) return;
    
    const loadDuelData = async () => {
      try {
        console.log(`Loading duel data for: ${duelId}`);
        const duelData = await duelsApiService.getDuel(duelId);
        console.log('✅ Duel data loaded:', duelData);
        console.log('🐛 Duel status:', duelData.status);
        console.log('🐛 Duel problem:', duelData.problem);
        console.log('🐛 Duel participants:', duelData.participants);
        
        // 🚨 ЭКСТРЕННАЯ ОЧИСТКА: Проверяем подозрительный код в проблеме
        if (duelData.problem && duelData.problem.starter_code) {
          const pythonCode = duelData.problem.starter_code.python || '';
          const looksLikeBadCode = (
            pythonCode.includes('square_root_sum') && 
            pythonCode.includes('return round(n*(n+1)*(2*n+1)/6**0.5)')
          );
          
          if (looksLikeBadCode) {
            console.log('🚨 DETECTED BAD STARTER CODE! Emergency cleanup...');
            
            // Очистить все duel коды из localStorage
            const allKeys = Object.keys(localStorage);
            const duelKeys = allKeys.filter(key => key.startsWith('duel_') && key.endsWith('_code'));
            duelKeys.forEach(key => localStorage.removeItem(key));
            
            // Создать правильный стартовый код
            const correctStarterCode = {
              python: `def square_root_sum(n):
    # TODO: Calculate the sum of square roots from 1 to n
    # Example: for n=5, return sqrt(1) + sqrt(2) + sqrt(3) + sqrt(4) + sqrt(5)
    # Hint: Use math.sqrt() and a loop
    pass`,
              javascript: `function squareRootSum(n) {
    // TODO: Calculate the sum of square roots from 1 to n
    // Example: for n=5, return sqrt(1) + sqrt(2) + sqrt(3) + sqrt(4) + sqrt(5)
    // Hint: Use Math.sqrt() and a loop
    return 0;
}`
            };
            
            // Заменить в проблеме
            duelData.problem.starter_code = correctStarterCode;
            
            showNotification(
              'success',
              '🔧 Auto-Fixed!',
              'Detected and corrected bad starter code automatically'
            );
          }
        }
        
        setDuel(duelData);
        setProblem(duelData.problem);
        console.log('✅ Setting problem:', duelData.problem.title);
        
        // Clear opponent code on fresh load to prevent AI terminal bugs
        setOpponentCode('');
        
        // Set participants
        setParticipants(duelData.participants.map((p: any) => ({
          ...p,
          tests_passed: p.tests_passed || 0,
          total_tests: p.total_tests || 0,
          is_winner: p.is_winner || false
        })));
        
        if (duelData.started_at) {
          // 🔧 FIX: Properly parse UTC time from backend
          let duelStartTime: Date;
          
          if (duelData.started_at.endsWith('Z')) {
            // Already has UTC timezone info
            duelStartTime = new Date(duelData.started_at);
          } else {
            // Backend sends UTC time without 'Z', so we need to add it
            duelStartTime = new Date(duelData.started_at + 'Z');
          }
          
          console.log('🕐 Duel timing debug (FIXED):');
          console.log('🕐 Raw started_at:', duelData.started_at);
          console.log('🕐 Parsed as UTC start time:', duelStartTime);
          console.log('🕐 Current time:', new Date());
          console.log('🕐 Time difference (ms):', new Date().getTime() - duelStartTime.getTime());
          console.log('🕐 Time difference (seconds):', Math.floor((new Date().getTime() - duelStartTime.getTime()) / 1000));
          
          setStartTime(duelStartTime);
          
          // Set initial elapsed time
          const initialElapsed = Math.max(0, Math.floor((new Date().getTime() - duelStartTime.getTime()) / 1000));
          console.log('🕐 Setting initial elapsed time (FIXED):', initialElapsed);
          setElapsedTime(initialElapsed);
        }
        
        // Check if duel is already completed
        if (duelData.status === 'completed') {
          console.log('✅ Duel is already completed, skipping timer setup');
          setDuelCompleted(true);
          setWinner(duelData.winner_id || null);
          return; // Skip timer and WebSocket setup for completed duels
        }
      } catch (error) {
        console.error('❌ Failed to load duel data:', error);
        setError('Failed to load duel. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadDuelData();
  }, [duelId]); // Removed language dependency to prevent reload on language change

  // Update starter code when language changes (separate effect)
  useEffect(() => {
    if (problem && problem.starter_code[language]) {
      // Check if we have saved code for this duel and language
      const savedCodeKey = `duel_${duelId}_${language}_code`;
      const savedCode = localStorage.getItem(savedCodeKey);
      
      if (savedCode && savedCode.trim() !== problem.starter_code[language].trim()) {
        // Use saved code if it's different from starter code
        console.log('📥 Restored saved code from localStorage');
        setMyCode(savedCode);
      } else {
        console.log('📝 Using starter code from problem');
        setMyCode(problem.starter_code[language]);
      }
    }
  }, [language, problem, duelId]); // Added duelId dependency
  
  // Save opponent code to localStorage
  useEffect(() => {
    if (duelId && opponentCode) {
      const savedCodeKey = `duel_${duelId}_opponent_code`;
      localStorage.setItem(savedCodeKey, opponentCode);
    }
  }, [duelId, opponentCode]);
  
  // Load opponent code from localStorage on mount
  useEffect(() => {
    if (duelId) {
      const savedCodeKey = `duel_${duelId}_opponent_code`;
      const savedCode = localStorage.getItem(savedCodeKey);
      if (savedCode) {
        setOpponentCode(savedCode);
        console.log('📥 Restored opponent code from localStorage');
      } else {
        // Set initial AI status message if no code yet
        const isAIDuel = participants.some(p => p.is_ai);
        if (isAIDuel && problem && problem.starter_code[language]) {
          setOpponentCode(`# 🤖 AI is analyzing the problem...\n# Starting to code shortly...\n\n${problem.starter_code[language]}`);
        }
      }
    }
  }, [duelId, participants, problem, language]);

  // 🔧 НОВОЕ: Очистка localStorage при смене дуэли
  useEffect(() => {
    if (duelId) {
      // Очищаем код от предыдущих дуэлей
      const allKeys = Object.keys(localStorage);
      const oldDuelKeys = allKeys.filter(key => 
        key.startsWith('duel_') && 
        key.endsWith('_code') && 
        !key.includes(duelId)
      );
      
      oldDuelKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('🧹 Cleared old duel code:', key);
      });
    }
  }, [duelId]);

  // Timer effect
  useEffect(() => {
    if (!startTime || duelCompleted || duel?.status === 'completed') return;
    
    console.log('⏰ Timer effect started, startTime:', startTime);
    
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // Debug excessive time values
      if (elapsed > 600) { // More than 10 minutes
        console.warn('⚠️ Excessive elapsed time detected:', elapsed, 'seconds');
        console.warn('⚠️ Start time:', startTime);
        console.warn('⚠️ Current time:', now);
      }
      
      setElapsedTime(Math.max(0, elapsed)); // Ensure non-negative
      
      // 🕐 Check if time is up (30 minutes = 1800 seconds)
      // Only auto-complete for reasonable time limits, not for old duels
      const DUEL_DURATION = 30 * 60; // Increased to 30 minutes
      const REASONABLE_MAX_TIME = 2 * 60 * 60; // 2 hours max
      
      if (elapsed >= DUEL_DURATION && elapsed < REASONABLE_MAX_TIME && !duelCompleted) {
        console.log('⏰ Time is up! Auto-completing duel...');
        setDuelCompleted(true);
        showNotification(
          'error',
          '⏰ Time\'s Up!',
          'The duel has ended due to time limit. Results based on current progress.'
        );
      } else if (elapsed >= REASONABLE_MAX_TIME) {
        // For very old duels, just mark as completed without notification spam
        console.warn('⚠️ Very old duel detected, marking as completed');
        setDuelCompleted(true);
      }
      
      // 🤖 AI Progress Simulation - update AI code every 30 seconds if no real updates
      const isAIDuel = participants.some(p => p.is_ai);
      if (isAIDuel && elapsed % 30 === 0 && elapsed > 0) {
        const hasRealAICode = opponentCode && !opponentCode.includes('🤖 AI is analyzing');
        if (!hasRealAICode && problem) {
          const progressMessages = [
            `# 🤖 AI is thinking... (${Math.floor(elapsed/60)}m${elapsed%60}s)\n# Analyzing test cases and constraints\n\n${problem.starter_code[language]}`,
            `# 🤖 AI is coding... (${Math.floor(elapsed/60)}m${elapsed%60}s)\n# Writing solution logic\n\ndef ${problem.title.toLowerCase().replace(/\s+/g, '_')}():\n    # AI is implementing the algorithm...\n    pass`,
            `# 🤖 AI is optimizing... (${Math.floor(elapsed/60)}m${elapsed%60}s)\n# Testing and debugging\n\ndef solution():\n    # AI is refining the solution...\n    return result`
          ];
          
          const messageIndex = Math.min(Math.floor(elapsed / 30) - 1, progressMessages.length - 1);
          if (messageIndex >= 0) {
            setOpponentCode(progressMessages[messageIndex]);
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, duelCompleted, participants, opponentCode, problem, language, showNotification]);

  // Enhanced WebSocket message handler - stabilized with refs to prevent re-renders
  const handleWebSocketMessage = useCallback((message: WSMessage) => {
    const currentUserId = userIdRef.current;
    const currentDuelId = duelIdRef.current;
    const currentParticipants = participantsRef.current;
    
    switch (message.type) {
      case 'code_update':
        if (message.user_id !== currentUserId) {
          console.log('🤖 Received AI code update:', message.code?.substring(0, 100) + '...');
          const opponent = currentParticipants.find(p => p.user_id !== currentUserId || p.is_ai);
          if (opponent && (message.user_id === opponent.user_id || opponent.is_ai)) {
            setOpponentCode(message.code);
            // Save AI code to localStorage
            if (currentDuelId) {
              localStorage.setItem(`duel_${currentDuelId}_opponent_code`, message.code);
            }
          }
        }
        break;
        
      case 'test_result': {
        const testResult = message as TestResult;
        if (testResult.user_id === currentUserId) {
          setTestResults(testResult);
        } else {
          setOpponentTestResults(testResult);
          setParticipants(prev => prev.map(p => 
            p.user_id === testResult.user_id 
              ? { ...p, tests_passed: testResult.passed, total_tests: testResult.total_tests }
              : p
          ));
        }
        break;
      }
        
      case 'duel_complete': {
        const completeMessage = message as DuelComplete;
        setDuelCompleted(true);
        setWinner(completeMessage.result.winner_id);
        
        if (currentDuelId) {
          clearDuelCodeFromStorage(currentDuelId);
        }
        
        const isWinner = completeMessage.result.winner_id === currentUserId;
        
        // Browser notification
        if (!document.hasFocus() && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(
              isWinner ? '🏆 Вы победили!' : '😔 Вы проиграли',
              {
                body: isWinner 
                  ? `Дуэль завершена! Время: ${completeMessage.result.winner_solve_time}`
                  : `Противник решил задачу за ${completeMessage.result.winner_solve_time}`,
                icon: '/favicon.ico',
                tag: 'duel-result'
              }
            );
          } catch (error) {
            console.log('Failed to show notification:', error);
          }
        }
        
        // Use showNotification through a stable ref
        showNotificationRef.current(
          isWinner ? 'success' : 'error',
          isWinner ? '🏆 Победа!' : '😔 Поражение',
          isWinner 
            ? `Поздравляем! Вы решили задачу за ${completeMessage.result.winner_solve_time}`
            : `Противник победил со временем ${completeMessage.result.winner_solve_time}. Попробуйте ещё раз!`
        );
        
        // Play sound
        try {
          const audio = new Audio(isWinner ? '/sounds/victory.mp3' : '/sounds/defeat.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (error) {
          console.log('Failed to play sound:', error);
        }
        
        document.title = isWinner ? '🏆 Победа! - BattleStack' : '😔 Поражение - BattleStack';
        break;
      }
        
      case 'typing_status':
        if (message.user_id !== currentUserId) {
          setOpponentIsTyping(message.is_typing);
        }
        break;
        
      case 'user_status':
        if (message.user_id !== currentUserId) {
          setIsOpponentConnected(message.status === 'connected');
        }
        break;
        
      case 'duel_started': {
        if (!document.hasFocus() && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('⚔️ Дуэль началась!', {
              body: 'Ваш противник найден. Время кодить!',
              icon: '/favicon.ico',
              tag: 'duel-started'
            });
          } catch (error) {
            console.log('Failed to show duel started notification:', error);
          }
        }
        
        showNotificationRef.current(
          'info',
          '⚔️ Дуэль началась!',
          'Ваш противник найден. Время показать свои навыки программирования!'
        );
        
        try {
          const audio = new Audio('/sounds/duel-start.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (error) {
          console.log('Failed to play duel start sound:', error);
        }
        
        document.title = '⚔️ Дуэль идёт - BattleStack';
        break;
      }
    }
  }, []); // No dependencies needed - all values accessed through refs

  // Stable callbacks for WebSocket hook
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);
  
  const handleWebSocketConnect = useCallback(() => {
    setIsConnected(true);
  }, []);

  // WebSocket hook
  const { sendMessage } = useDuelWebSocket({
    duelId: duelId || '',
    userId: user?.id || '',
    onMessage: handleWebSocketMessage,
    onStatusChange: handleConnectionStatusChange,
    onConnect: handleWebSocketConnect,
    enabled: !!duelId && !!user?.id
  });

  // Debounced code update - stabilized to prevent re-renders
  const handleCodeChange = useCallback((newCode: string) => {
    setMyCode(newCode);
    
    const currentDuelId = duelIdRef.current;
    const currentUserId = userIdRef.current;
    
    if (currentDuelId && language) {
      localStorage.setItem(`duel_${currentDuelId}_${language}_code`, newCode);
    }
    
    if (!isTyping) {
      setIsTyping(true);
      sendMessage(createTypingStatusMessage(currentUserId, true));
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendMessage(createTypingStatusMessage(currentUserId, false));
    }, 1000);
    
    if (codeUpdateTimeoutRef.current) {
      clearTimeout(codeUpdateTimeoutRef.current);
    }
    
    codeUpdateTimeoutRef.current = setTimeout(() => {
      sendMessage(createCodeUpdateMessage(currentUserId, newCode, language));
    }, 300);
  }, [language, isTyping, sendMessage]); // Removed duelId and user?.id dependencies

  // Test code
  const handleTestCode = async () => {
    if (!duelId || isTestingCode) return;
    
    setIsTestingCode(true);
    try {
      const result = await duelsApiService.testCode(duelId, {
        code: myCode,
        language
      });
      
      setTestResults({
        type: 'test_result',
        user_id: user?.id || '',
        passed: result.passed,
        failed: result.failed,
        total_tests: result.total_tests,
        execution_time_ms: result.execution_time_ms,
        error: result.error,
        is_solution_correct: result.progress_percentage === 100,
        progress_percentage: result.progress_percentage,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTestingCode(false);
    }
  };

  // Submit code
  const handleSubmitCode = async () => {
    if (!duelId || isSubmittingCode) return;
    
    setIsSubmittingCode(true);
    try {
      const result = await duelsApiService.submitCode(duelId, {
        code: myCode,
        language
      });
      
      if (result.is_winner) {
        setDuelCompleted(true);
        setWinner(user?.id || null);
      }
      
      setTestResults({
        type: 'test_result',
        user_id: user?.id || '',
        passed: result.tests_passed,
        failed: result.total_tests - result.tests_passed,
        total_tests: result.total_tests,
        execution_time_ms: result.execution_time_ms,
        error: undefined,
        is_solution_correct: result.is_winner,
        progress_percentage: (result.tests_passed / result.total_tests) * 100,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Helper functions
  const getOpponent = (): Participant | undefined => {
    return participants.find(p => p.user_id !== user?.id || p.is_ai);
  };

  const getMyProgress = (): number => {
    return testResults ? (testResults.progress_percentage || 0) : 0;
  };

  const getOpponentProgress = (): number => {
    return opponentTestResults ? (opponentTestResults.progress_percentage || 0) : 0;
  };

  // Show loading state
  if (loading) {
    return <DuelLoading />;
  }

  // Show error state
  if (error) {
    return <DuelError error={error} />;
  }

  // Check if we have required data
  if (!problem || !duel) {
    return <DuelLoading />;
  }

  // Show completed duel
  if (duelCompleted) {
    const isWinner = winner === user?.id;
    const opponent = getOpponent();
    return <DuelCompleteComponent isWinner={isWinner} opponent={opponent} />;
  }

  // Main duel interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      <DuelHeader
        problem={problem}
        elapsedTime={elapsedTime}
        connectionStatus={connectionStatus}
        language={language}
        onLanguageChange={setLanguage}
        onTestCode={handleTestCode}
        onSubmitCode={handleSubmitCode}
        isTestingCode={isTestingCode}
        isSubmittingCode={isSubmittingCode}
        isConnected={isConnected}
      />
      
      <div className="relative z-10 max-w-full mx-auto p-6">
        <div className="space-y-6">
          {/* Connection Status */}
          {connectionStatus !== 'connected' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                <span className="text-yellow-800 font-medium">
                  {connectionStatus === 'connecting' ? 'Connecting to duel...' : 
                   connectionStatus === 'disconnected' ? 'Reconnecting...' : 
                   'Connection error'}
                </span>
              </div>
            </div>
          )}

          {/* AI Opponent Status */}
          <AIOpponentStatus
            isAIOpponent={participants.some(p => p.is_ai)}
            opponentIsTyping={opponentIsTyping}
            opponentTestResults={opponentTestResults}
            getOpponentProgress={getOpponentProgress}
          />
          
          {/* Main Arena */}
          <div className="grid grid-cols-12 gap-4" style={{ height: '600px' }}>
            {/* Problem Description */}
            <div className="col-span-3">
              <ProblemDescription problem={problem} />
            </div>
          
            {/* Code Editors */}
            <div className="col-span-9 grid grid-cols-2 gap-4">
              {/* Player Terminal */}
              <CodeTerminal
                title="⚔️ YOUR TERMINAL"
                titleColor="text-cyan-400"
                borderColor="border-cyan-400/40"
                isPlayer={true}
                language={language}
                code={myCode}
                onCodeChange={handleCodeChange}
                isTyping={isTyping}
                testResults={testResults}
                progress={getMyProgress()}
              />

              {/* AI Terminal */}
              <CodeTerminal
                title="🤖 ENEMY TERMINAL"
                titleColor="text-red-400"
                borderColor="border-red-400/40"
                isPlayer={false}
                language={language}
                code={opponentCode}
                isTyping={opponentIsTyping}
                isConnected={isOpponentConnected}
                testResults={opponentTestResults}
                progress={getOpponentProgress()}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Notifications */}
      <NotificationToast 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
}; 