import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { DuelStatus, type DuelResponse, type DuelResult, type DuelTestResponse } from '../services/duelService';
import { duelsApiService } from '../services/api';
import { codeExecutionService, type SupportedLanguage } from '../services/codeExecutionService';
import type { SubmissionResultData } from '../components/coding/SubmissionResult';
import { getDuelStorageKeys, clearDuelStorage } from '../utils/duelStorage';
import { logDuelState, logWebSocketMessage, logLanguageSetup } from '../utils/duelDebug';
import { logAiState, checkAiCodeConsistency, validateAiRestore } from '../utils/aiStateDebug';
import { startLocalStorageMonitoring, stopLocalStorageMonitoring } from '../utils/localStorageMonitor';
// import type { UUID } from 'uuid'; // Removed as UUIDs are strings on frontend

interface DuelContextType {
  duel: DuelResponse | null;
  isLoading: boolean;
  error: string | null;
  opponent: any | null;
  connect: (duelId: string) => void;
  disconnect: () => void;
  startPollingForDuel: (userId: string) => void;
  sendCodeUpdate: (code: string, language: SupportedLanguage) => void;
  sendTypingStatus: (isTyping: boolean) => void;
  submitSolution: (code: string, language: SupportedLanguage) => Promise<SubmissionResultData | null>;
  runTests: (code: string, language: SupportedLanguage) => Promise<SubmissionResultData | null>;
  sendReadyState: (isReady: boolean) => void;
  sendStartDuel: () => void;
  isConnected: boolean;
  opponentCode: string;
  opponentTyping: boolean;
  aiStatus: 'thinking' | 'typing' | 'struggling' | 'solved' | 'gave_up' | null;
  generationStatus: string;
  elapsedTime: number;
  aiCodingProcess: any[]; // To simulate AI typing animation
  aiProgress: number;
  aiFinishedTyping: boolean;
  duelResult: DuelResult | null;
  currentLanguage: SupportedLanguage | null;
  setCurrentLanguage: (lang: SupportedLanguage) => void;
  submissionResult: SubmissionResultData | null;
  setSubmissionResult: (result: SubmissionResultData | null) => void;
}

const DuelContext = createContext<DuelContextType | undefined>(undefined);

export const DuelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const { addToast } = useToast();
  const { duelId } = useParams<{ duelId: string }>();
  const navigate = useNavigate();

  const [duel, setDuel] = useState<DuelResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<'thinking' | 'typing' | 'struggling' | 'solved' | 'gave_up' | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [opponent, setOpponent] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [aiCodingProcess, setAiCodingProcess] = useState<any[]>([]);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiFinishedTyping, setAiFinishedTyping] = useState(false);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResultData | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentLanguageRef = useRef(currentLanguage);
  currentLanguageRef.current = currentLanguage;

  const getStorageKey = useCallback((name: string) => {
    if (!duelId) return null;
    const keys = getDuelStorageKeys(duelId, user?.id);
    switch (name) {
      case 'ai-process': return keys.aiProcess;
      case 'ai-progress': return keys.aiProgress;
      case 'ai-code': return keys.aiCode;
      default: return `duel-${duelId}-${name}`;
    }
  }, [duelId, user?.id]);

  const getWebSocketUrl = () => {
    if (import.meta.env.VITE_WEBSOCKET_URL) {
      return import.meta.env.VITE_WEBSOCKET_URL;
    }
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss' : 'ws';
    const host = window.location.host;
    return `${protocol}://${host}/api/v1/duels/ws`;
  };

  const setInitialLanguageFromDuel = useCallback(async (duelData: DuelResponse) => {
    logDuelState('Setting initial language', { duelData, currentLanguage: currentLanguageRef.current });

    // Always try to set language if we don't have one, or if problem is available
    if (!currentLanguageRef.current || (duelData.problem && !currentLanguageRef.current)) {
      try {
        const supportedLangs = await codeExecutionService.getSupportedLanguages();

        const debugData = {
          currentLanguage: currentLanguageRef.current,
          supportedLanguages: supportedLangs,
          problemLanguages: duelData.problem?.code_templates?.map((t: any) => t.language) || [],
          duelProblem: !!duelData.problem
        };

        logLanguageSetup('Initial setup', debugData);

        if (duelData.problem?.code_templates) {
          const problemLangs = duelData.problem.code_templates.map((t: any) => t.language) || [];
          console.log('Problem languages:', problemLangs);
          const defaultLangId = 'python';

          let langToSetId = problemLangs.includes(defaultLangId) ? defaultLangId : problemLangs[0];

          if (langToSetId) {
            const langObject = supportedLangs.find(l => l.id === langToSetId);
            if (langObject) {
              console.log('Setting language to:', langObject);
              setCurrentLanguage(langObject);
              return;
            }
          }
        }

        // Fallback to Python if available
        const pythonLang = supportedLangs.find(l => l.id === 'python');
        if (pythonLang) {
          console.log('Fallback to Python:', pythonLang);
          setCurrentLanguage(pythonLang);
        } else if (supportedLangs.length > 0) {
          // Last resort: use first available language
          console.log('Last resort language:', supportedLangs[0]);
          setCurrentLanguage(supportedLangs[0]);
        }
      } catch (error) {
        console.error('Error setting initial language:', error);
        // Try to set a default language anyway
        try {
          const supportedLangs = await codeExecutionService.getSupportedLanguages();
          if (supportedLangs.length > 0) {
            setCurrentLanguage(supportedLangs[0]);
          }
        } catch (fallbackError) {
          console.error('Fallback language setting failed:', fallbackError);
        }
      }
    }
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('WebSocket not open. Message not sent.', type, payload);
    }
  }, []);

  const startAiTypingSimulation = useCallback((process: any[], startProgress = 0) => {
    if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);

    let totalDelay = 0;
    const startIndex = Math.floor((startProgress / 100) * process.length);

    const executeStep = (stepIndex: number) => {
      if (stepIndex >= process.length) {
        aiTypingTimerRef.current = setTimeout(() => {
          setAiFinishedTyping(true);
          setOpponentTyping(false);
          setAiProgress(100);
          const progressKey = getStorageKey('ai-progress');
          const codeKey = getStorageKey('ai-code');
          if (progressKey) localStorage.setItem(progressKey, '100');
          // Save final AI code
          if (codeKey) {
            setOpponentCode(currentCode => {
              localStorage.setItem(codeKey, currentCode);
              return currentCode;
            });
          }
        }, 1000 + Math.random() * 1000); // Final pause before finishing
        return;
      }

      const step = process[stepIndex];
      const action = step.root;
      let stepDelay = 0;

      if (action.action === 'type') {
        const typingSpeed = (250 / action.speed) * (0.8 + Math.random() * 0.4); // Human-like speed variation
        for (let i = 0; i < action.content.length; i++) {
          totalDelay += typingSpeed;
          setTimeout(() => {
            setOpponentCode(prev => {
              const newCode = prev + action.content[i];
              // Save code incrementally
              const codeKey = getStorageKey('ai-code');
              if (codeKey) localStorage.setItem(codeKey, newCode);
              return newCode;
            });
            setOpponentTyping(true);
          }, totalDelay);
        }
        stepDelay = totalDelay - (stepIndex > 0 ? process[stepIndex - 1].delay || 0 : 0);

      } else if (action.action === 'pause') {
        stepDelay = action.duration * 1000 * (0.5 + Math.random()); // "Thinking" time
        totalDelay += stepDelay;
        setTimeout(() => {
          setOpponentTyping(false);
        }, totalDelay);

      } else if (action.action === 'delete') {
        const deleteSpeed = 150 * (0.8 + Math.random() * 0.4); // Human-like mistake correction
        for (let i = 0; i < action.char_count; i++) {
          totalDelay += deleteSpeed;
          setTimeout(() => {
            setOpponentCode(prev => {
              const newCode = prev.slice(0, -1);
              // Save code after deletion
              const codeKey = getStorageKey('ai-code');
              if (codeKey) localStorage.setItem(codeKey, newCode);
              return newCode;
            });
            setOpponentTyping(true);
          }, totalDelay);
        }
        stepDelay = totalDelay - (stepIndex > 0 ? process[stepIndex - 1].delay || 0 : 0);
      }

      // Update progress after the action is visually complete
      setTimeout(() => {
        const newProgress = (stepIndex + 1) / process.length * 100;
        setAiProgress(newProgress);
        const progressKey = getStorageKey('ai-progress');
        if (progressKey) {
          localStorage.setItem(progressKey, JSON.stringify(newProgress));
        }
      }, totalDelay);

      // Store the cumulative delay for the next step's calculation
      process[stepIndex].delay = totalDelay;

      // Schedule the next step
      executeStep(stepIndex + 1);
    };

    executeStep(startIndex);

  }, [getStorageKey]);

  // Effect to load and reconstruct AI state on mount
  useEffect(() => {
    const processKey = getStorageKey('ai-process');
    const progressKey = getStorageKey('ai-progress');
    const codeKey = getStorageKey('ai-code');

    console.log('Loading AI state from localStorage:', { processKey, progressKey, codeKey });

    // Start monitoring localStorage changes for debugging
    if (duelId) {
      startLocalStorageMonitoring(duelId);
    }

    if (codeKey) {
      const savedCode = localStorage.getItem(codeKey);
      const savedProgressJSON = localStorage.getItem(progressKey || '');
      const savedProcessJSON = localStorage.getItem(processKey || '');

      console.log('Saved AI data:', {
        savedCode: savedCode ? savedCode.length + ' chars' : 'none',
        savedProgress: savedProgressJSON,
        savedProcess: savedProcessJSON ? 'exists' : 'none'
      });

      // Priority 1: Use saved code directly if available
      if (savedCode) {
        console.log('🔄 Restoring AI code from localStorage');
        console.log('Saved code length:', savedCode.length);
        console.log('Saved code content:', savedCode);

        logAiState('Restoring from saved code', {
          codeLength: savedCode.length,
          codePreview: savedCode.substring(0, 100) + '...',
          fullCode: savedCode
        });

        setOpponentCode(savedCode);

        // Set progress if available
        if (savedProgressJSON) {
          try {
            const savedProgress = JSON.parse(savedProgressJSON);
            console.log('Restored AI progress:', savedProgress);
            setAiProgress(savedProgress);
            if (savedProgress >= 100) {
              setAiFinishedTyping(true);
            }
          } catch (e) {
            console.error('Failed to parse saved progress:', e);
          }
        }

        // Set process if available (for animation continuation)
        if (savedProcessJSON) {
          try {
            const savedProcess = JSON.parse(savedProcessJSON);
            console.log('Restored AI process steps:', savedProcess.length);
            setAiCodingProcess(savedProcess);
          } catch (e) {
            console.error('Failed to parse saved process:', e);
          }
        }

        // Validate the restore
        if (duelId) {
          validateAiRestore(duelId, savedCode);
        }

        return; // Exit early since we have the code
      }

      // Priority 2: Reconstruct from process if no direct code saved
      if (savedProcessJSON && savedProgressJSON) {
        try {
          const savedProcess = JSON.parse(savedProcessJSON);
          const savedProgress = JSON.parse(savedProgressJSON);

          if (savedProcess.length > 0 && savedProgress > 0) {
            console.log('Reconstructing AI code from process, progress:', savedProgress);

            let reconstructedCode = '';
            const endIndex = Math.floor((savedProgress / 100) * savedProcess.length);

            for (let i = 0; i < endIndex; i++) {
              const action = savedProcess[i].root;
              if (action.action === 'type') {
                reconstructedCode += action.content;
              } else if (action.action === 'delete' && reconstructedCode.length > 0) {
                reconstructedCode = reconstructedCode.slice(0, -action.char_count);
              }
            }

            console.log('🔧 Reconstructed AI code length:', reconstructedCode.length);
            console.log('🔧 Reconstructed AI code content:', reconstructedCode);
            setOpponentCode(reconstructedCode);
            setAiProgress(savedProgress);
            setAiCodingProcess(savedProcess);

            // Save the reconstructed code for next time
            console.log('💾 Saving reconstructed code to localStorage');
            localStorage.setItem(codeKey, reconstructedCode);

            if (savedProgress < 100) {
              startAiTypingSimulation(savedProcess, savedProgress);
            } else {
              setAiFinishedTyping(true);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved duel state:", e);
          if (processKey) localStorage.removeItem(processKey);
          if (progressKey) localStorage.removeItem(progressKey);
          localStorage.removeItem(codeKey);
        }
      }
    }
  }, [getStorageKey, startAiTypingSimulation]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      console.log('Closing WebSocket connection.');
      ws.current.close(1000, 'Client disconnected');
      ws.current = null;
      setIsConnected(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      setOpponent(null);
    }

    // Stop localStorage monitoring
    stopLocalStorageMonitoring();
  }, []);

  const fetchDuelData = useCallback(async (id: string) => {
    try {
      console.log('Fetching duel data for ID:', id);
      const fetchedDuel = await duelsApiService.getDuel(id);
      console.log('Fetched duel:', fetchedDuel);
      setDuel(fetchedDuel);
      await setInitialLanguageFromDuel(fetchedDuel);

      if (
        fetchedDuel.status === DuelStatus.PENDING ||
        fetchedDuel.status === DuelStatus.GENERATING_PROBLEM
      ) {
        const interval = setInterval(async () => {
          try {
            const updatedDuel = await duelsApiService.getDuel(id);
            if (
              updatedDuel.status !== DuelStatus.PENDING &&
              updatedDuel.status !== DuelStatus.GENERATING_PROBLEM
            ) {
              setDuel(updatedDuel);
              await setInitialLanguageFromDuel(updatedDuel);
              clearInterval(interval);
            }
          } catch (err) {
            console.error('Error polling duel status:', err);
            clearInterval(interval);
          }
        }, 2000);
      }

      // Start elapsed time timer if duel is in progress
      if (fetchedDuel.status === DuelStatus.IN_PROGRESS && fetchedDuel.started_at) {
        const start = new Date(fetchedDuel.started_at).getTime();
        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } else if (fetchedDuel.status === DuelStatus.COMPLETED || fetchedDuel.status === DuelStatus.TIMED_OUT) {
        // If already completed, calculate final time and show results
        if (fetchedDuel.started_at && fetchedDuel.finished_at) {
          setElapsedTime(Math.floor((new Date(fetchedDuel.finished_at).getTime() - new Date(fetchedDuel.started_at).getTime()) / 1000));
        }
        if (fetchedDuel.results) {
          setDuelResult(fetchedDuel.results as DuelResult);
        }
      }

    } catch (err: any) {
      console.error('Failed to fetch duel data:', err);
      setError(err.message || 'Failed to load duel data.');
      addToast({ type: 'error', title: 'Loading Error', message: 'Failed to load duel data.' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, addToast, setInitialLanguageFromDuel]);

  const connect = useCallback((id: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }
    if (!user?.id || !token) {
      console.error('Cannot connect: User not authenticated or token is missing.');
      addToast({ type: 'error', title: 'Connection Error', message: 'User not authenticated for WebSocket.' });
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`Attempting to connect to WebSocket for duel ${id}...`);

    const wsUrl = getWebSocketUrl();
    const socket = new WebSocket(`${wsUrl}/${id}?token=${token}`);

    socket.onopen = () => {
      console.log('WebSocket connected.');
      setIsConnected(true);
      setIsLoading(false);
      // Fetch duel data upon successful connection
      fetchDuelData(id);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      logWebSocketMessage(message);
      switch (message.type) {
        case 'player_joined':
        case 'player_left':
        case 'player_ready_changed': {
          // These events will contain the full updated duel object
          if (message.data && typeof message.data === 'object' && message.data.id) {
            const updatedDuel = message.data as DuelResponse;
            setDuel(updatedDuel);
          }
          break;
        }
        case 'match_found': {
          // Match found, connect to the new duel ID
          const newDuelId = message.data.duel_id;
          // Disconnect from the old matchmaking connection if any
          disconnect();
          // Connect to the new duel
          connect(newDuelId);
          break;
        }
        case 'problem_generated':
          // This is a signal that the duel problem is ready, we can refetch the duel data
          // to get the problem details.
          if (duelId) {
            fetchDuelData(duelId);
          }
          break;
        case 'code_update':
          if (message.user_id !== user?.id) {
            setOpponentCode(message.code);
            // Save opponent code updates
            const codeKey = getStorageKey('ai-code');
            if (codeKey) localStorage.setItem(codeKey, message.code);
          }
          break;
        case 'typing_status':
          if (message.user_id !== user?.id) {
            setOpponentTyping(message.is_typing);
          }
          break;
        case 'duel_state':
        case 'duel_update': {
          // This message can be a simple signal or contain the full duel object
          if (message.data && typeof message.data === 'object' && message.data.id) {
            const updatedDuel = message.data as DuelResponse;
            logDuelState('Duel update received', updatedDuel);
            setDuel(updatedDuel);

            // Only set language if we don't have one yet
            if (!currentLanguageRef.current) {
              setInitialLanguageFromDuel(updatedDuel);
            }

            // Start timer if it hasn't started
            if (updatedDuel.status === DuelStatus.IN_PROGRESS && updatedDuel.started_at && !timerRef.current) {
              const start = new Date(updatedDuel.started_at).getTime();
              timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - start) / 1000));
              }, 1000);
            }
          } else if (id) {
            // Fallback to refetching if no data is present
            fetchDuelData(id);
          }
          break;
        }
        case 'duel_start': {
          const duelData = message.data as DuelResponse;
          logDuelState('Duel started', duelData);
          setDuel(duelData);

          // Only set language if we don't have one yet
          if (!currentLanguageRef.current) {
            setInitialLanguageFromDuel(duelData);
          }

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          navigate(`/duel/${duelData.id}`);
          break;
        }
        case 'test_result': {
          const adaptedData: SubmissionResultData = {
            is_correct: message.data.is_correct,
            error: message.data.error,
            details: message.data.details,
            passed: message.data.passed,
            total: message.data.total,
          };
          setSubmissionResult(adaptedData);
          break;
        }
        case 'duel_end':
          setDuelResult(message.data);
          setDuel(prev => prev ? { ...prev, status: message.data.is_timeout ? DuelStatus.TIMED_OUT : DuelStatus.COMPLETED } : null);
          // Clear storage on duel end
          if (duelId && user?.id) {
            clearDuelStorage(duelId, user.id);
          }

          disconnect(); // Disconnect after duel ends
          break;
        case 'error':
          setError(message.message);
          addToast({ type: 'error', title: 'Duel Error', message: message.message });
          disconnect();
          break;
        case 'ai_start': {
          console.log("AI opponent has started.");
          setAiStatus('thinking');

          // Check if we already have AI code saved
          const codeKey = getStorageKey('ai-code');
          const existingCode = codeKey ? localStorage.getItem(codeKey) : null;

          if (existingCode && existingCode.length > 0) {
            console.log('AI already has code saved, not restarting:', existingCode.length, 'characters');
            // Don't reset AI state if we already have code
            setAiStatus('typing');
          }
          // No action needed, backend will push updates
          break;
        }
        case 'ai_coding_process': {
          const newProcess = message.data;
          console.log('Received new AI coding process:', newProcess);

          // Check if this is a duplicate process (same as already saved)
          const processKey = getStorageKey('ai-process');
          const codeKey = getStorageKey('ai-code');
          const existingCode = codeKey ? localStorage.getItem(codeKey) : null;
          const existingProcessJSON = processKey ? localStorage.getItem(processKey) : null;

          let isDuplicateProcess = false;
          if (existingProcessJSON) {
            try {
              const existingProcess = JSON.parse(existingProcessJSON);
              // Simple check: compare first few actions
              if (existingProcess.length > 0 && newProcess.length > 0) {
                const firstExisting = existingProcess[0]?.root?.content || '';
                const firstNew = newProcess[0]?.root?.content || '';
                isDuplicateProcess = firstExisting === firstNew && existingProcess.length === newProcess.length;
              }
            } catch (e) {
              console.error('Error comparing processes:', e);
            }
          }

          console.log('Process analysis:', {
            isDuplicate: isDuplicateProcess,
            existingCodeLength: existingCode ? existingCode.length : 0,
            newProcessLength: newProcess.length
          });

          // Only reset if this is truly a new process and we don't have significant existing code
          if (!isDuplicateProcess && (!existingCode || existingCode.length < 50)) {
            console.log('Starting new AI process - resetting code');
            setAiCodingProcess(newProcess);

            if (processKey) {
              localStorage.setItem(processKey, JSON.stringify(newProcess));
            }

            setOpponentCode('');
            setAiProgress(0);
            setAiFinishedTyping(false);

            // Clear saved code when new process starts
            if (codeKey) localStorage.removeItem(codeKey);
            startAiTypingSimulation(newProcess, 0);
          } else {
            console.log('Ignoring duplicate or continuing existing AI process');
            // Just update the process but keep existing code
            setAiCodingProcess(newProcess);
            if (processKey) {
              localStorage.setItem(processKey, JSON.stringify(newProcess));
            }
          }
          break;
        }
        case 'ai_progress': {
          logAiState('Progress received', message.data);

          if (message.data.code_chunk) {
            setOpponentCode(prev => {
              const newCode = prev + message.data.code_chunk;

              console.log('📝 AI code chunk received:', {
                chunk: message.data.code_chunk,
                chunkLength: message.data.code_chunk.length,
                previousLength: prev.length,
                newLength: newCode.length,
                previousCode: prev,
                newCode: newCode
              });

              logAiState('Code updated', {
                previousLength: prev.length,
                newLength: newCode.length,
                chunk: message.data.code_chunk,
                chunkLength: message.data.code_chunk.length
              });

              // Save code incrementally
              const codeKey = getStorageKey('ai-code');
              if (codeKey) {
                console.log('💾 Saving AI code to localStorage:', newCode);
                localStorage.setItem(codeKey, newCode);
              }
              return newCode;
            });
          }
          if (message.data.progress) {
            setAiProgress(message.data.progress);
            const progressKey = getStorageKey('ai-progress');
            if (progressKey) {
              localStorage.setItem(progressKey, JSON.stringify(message.data.progress));
            }
          }
          setOpponentTyping(true);
          setAiStatus('typing');

          // Check consistency after update
          if (duelId) {
            setTimeout(() => checkAiCodeConsistency(duelId), 100);
          }
          break;
        }
        case 'ai_delete': {
          if (message.data && message.data.char_count) {
            setOpponentCode(prev => {
              const newCode = prev.slice(0, -message.data.char_count);
              // Save code after AI deletion
              const codeKey = getStorageKey('ai-code');
              if (codeKey) localStorage.setItem(codeKey, newCode);
              return newCode;
            });
          }
          break;
        }
        case 'ai_solved':
          addToast({
            type: 'success',
            title: 'AI Solved!',
            message: message.data.message || 'AI opponent solved the problem!',
          });
          setOpponentTyping(false);
          setAiFinishedTyping(true);
          setAiStatus('solved');
          break;
        case 'ai_struggling':
          addToast({
            type: 'info',
            title: 'AI Struggling',
            message: message.data.message || 'AI opponent is having trouble...',
          });
          setAiStatus('struggling');
          break;
        case 'ai_gave_up':
          addToast({
            type: 'warning',
            title: 'AI Gave Up',
            message: message.data.message || 'AI opponent gave up. You have more time!',
          });
          setOpponentTyping(false);
          setAiFinishedTyping(true);
          setAiStatus('gave_up');
          break;
        case 'generation_status':
          // Keep connection alive during problem generation
          console.log('Generation status:', message.data.message);
          setGenerationStatus(message.data.message);
          // Optionally show a toast for important stages
          if (message.data.stage === 'starting_ai') {
            addToast({
              type: 'info',
              title: 'Problem Ready',
              message: message.data.message,
            });
          }
          break;
        case 'ping':
          // Respond to keepalive ping with pong
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'pong',
              data: { timestamp: message.data.timestamp }
            }));
          }
          break;
        case 'duel_creation_failed':
          addToast({
            type: 'error',
            title: 'Error',
            message: message.data.error || 'Failed to create duel.',
          });
          setIsLoading(false);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event);
      setIsConnected(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);

      if (event.wasClean) {
        addToast({ type: 'info', title: 'Disconnected', message: 'You have disconnected from the duel.' });
      } else if (event.code === 1001) { // Going away (browser navigating)
        console.log('Browser navigating away, no toast needed.');
      } else {
        // Only show error toast if it wasn't a clean disconnect.
        const reason = event.reason || `code: ${event.code}`;
        console.error('WebSocket disconnected unexpectedly:', reason);
        addToast({ type: 'error', title: 'Disconnected', message: `Connection lost: ${reason}` });
        setError(`WebSocket disconnected: ${reason}`);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error.');
      addToast({ type: 'error', title: 'Connection Failed', message: 'Could not connect to duel.' });
      setIsLoading(false);
      disconnect();
    };

    ws.current = socket;
  }, [user?.id, token, addToast, setInitialLanguageFromDuel, fetchDuelData, sendMessage, aiProgress, startAiTypingSimulation, disconnect, navigate]);

  const sendReadyState = useCallback((isReady: boolean) => {
    sendMessage('set_ready', { is_ready: isReady });
  }, [sendMessage]);

  const sendStartDuel = useCallback(() => {
    sendMessage('start_duel', {});
  }, [sendMessage]);

  const startPollingForDuel = useCallback((userId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(async () => {
      try {
        const activeDuel = await duelsApiService.getDuelForUser(userId);
        if (activeDuel) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Found an active duel, navigate to it
          navigate(`/duel/${activeDuel.id}`);
        }
      } catch (error) {
        // It's expected to get 404s here, so we don't need to show a toast
        console.log("Polling for duel, no active duel found yet...");
      }
    }, 3000); // Poll every 3 seconds
  }, [connect, navigate]);

  useEffect(() => {
    // If there's a duelId in the URL, we are joining a specific duel.
    if (duelId && isAuthenticated && user?.id) {
      connect(duelId);
      return; // Exit early to avoid checking for active duels
    }

    // If no duelId in URL, we don't need to do anything automatically,
    // as matchmaking flow will now be handled explicitly by component calls.
    if (!duelId) {
      setIsLoading(false);
    }

    return () => {
      disconnect();
    };
  }, [duelId, isAuthenticated, user?.id, connect, disconnect]);

  const sendCodeUpdate = useCallback((code: string, language: SupportedLanguage) => {
    sendMessage('code_update', { user_id: user?.id, code, language: language.id });
  }, [sendMessage, user?.id]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    sendMessage('typing_status', { user_id: user?.id, is_typing: isTyping });
  }, [sendMessage, user?.id]);

  const submitSolution = useCallback(async (code: string, language: SupportedLanguage): Promise<SubmissionResultData | null> => {
    if (!duel?.id || !user?.id) {
      addToast({ type: 'error', title: 'Error', message: 'Duel not active or user not logged in.' });
      return null;
    }
    try {
      await duelsApiService.submitSolution(duel.id, { player_id: user.id, code, language: language.id });
      // The websocket will broadcast the result, so we don't need to return it here.
      return null;
    } catch (err: any) {
      console.error('Submission failed:', err);
      addToast({ type: 'error', title: 'Submission Error', message: err.response?.data?.detail || 'Failed to submit solution.' });
      return null;
    }
  }, [duel?.id, user?.id, addToast]);

  const runTests = useCallback(async (code: string, language: SupportedLanguage): Promise<SubmissionResultData | null> => {
    if (!duel?.id) {
      addToast({ type: 'error', title: 'Error', message: 'Duel not active.' });
      return null;
    }
    try {
      const result: DuelTestResponse = await duelsApiService.testCode(duel.id, { code, language: language.id });

      const detailsArray = Array.isArray(result.details)
        ? result.details.map((tc, index) => {
          if (tc.status === 'COMPILATION_ERROR') {
            return `Compilation Error: ${tc.error_message}`;
          }
          const status = tc.status === 'PASSED' ? 'passed' : 'failed';
          return `Test case #${index + 1} ${status}: Input: '${tc.input}', Expected: '${tc.expected}', Got: '${tc.got}'`;
        })
        : result.details ? [result.details] : [];

      const adaptedData: SubmissionResultData = {
        is_correct: result.is_correct,
        error: result.error,
        details: detailsArray,
        passed: result.passed_count,
        total: result.total_count,
      };

      setSubmissionResult(adaptedData);
      return adaptedData;

    } catch (err: any) {
      console.error('Test run failed:', err);
      addToast({ type: 'error', title: 'Test Error', message: err.response?.data?.detail || 'Failed to run tests.' });
      return null;
    }
  }, [duel?.id, addToast]);

  return (
    <DuelContext.Provider
      value={{
        duel,
        isLoading,
        error,
        opponent,
        connect,
        disconnect,
        startPollingForDuel,
        sendCodeUpdate,
        sendTypingStatus,
        submitSolution,
        runTests,
        sendReadyState,
        sendStartDuel,
        isConnected,
        opponentCode,
        opponentTyping,
        aiStatus,
        generationStatus,
        elapsedTime,
        aiCodingProcess,
        aiProgress,
        aiFinishedTyping,
        duelResult,
        currentLanguage,
        setCurrentLanguage,
        submissionResult,
        setSubmissionResult,
      }}
    >
      {children}
    </DuelContext.Provider>
  );
};

export const useDuel = () => {
  const context = useContext(DuelContext);
  if (context === undefined) {
    throw new Error('useDuel must be used within a DuelProvider');
  }
  return context;
}; 