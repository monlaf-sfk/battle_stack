import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import type { DuelProblem, DuelResult, WSMessage, TestResultResponse, DuelResponse, AIProgressMessage, AIDeleteMessage } from '../types/duel.types';
import { useAuth } from './AuthContext';
import { useUniversalDuelSocket } from '../hooks/useUniversalDuelSocket';
import * as api from '../services/api'; // Import the API service

export interface DuelState {
    duel: DuelResponse | null;
    problem: DuelProblem | null;
    results: DuelResult[] | null;
    error: string | null;
    isConnecting: boolean;
    ws: WebSocket | null; // Keep for now, but will be managed by hook
    isConnected: boolean; // New: Track actual connection status
    aiOpponentCode: string; // New: To store AI typing progress
    opponentIsTyping: boolean; // New: To track if AI is typing
    userTestResults: TestResultResponse | null;
    opponentTestResults: TestResultResponse | null; // New: To store AI test results
    aiProgressPercentage: number; // New: AI's typing progress
    duelResult: DuelResult | null;
    isCompleted: boolean;
}

interface DuelContextType {
    duelState: DuelState;
    connect: (duelId: string) => void;
    disconnect: () => void;
    updateCode: (duelId: string, language: string, code: string) => void;
    sendSolution: (duelId: string, code: string, language: string) => void;
    testCode: (duelId: string, code: string, language: string) => void;
    submitCode: (duelId: string, code: string, language: string) => void;
    joinDuel: () => void;
    leaveDuel: () => void;
    sendTetrisState: (state: any) => void;
    sendTetrisBoard: (board: any) => void;
    setProblemId: (problemId: string) => void;
    aiOpponentCode: string; // Expose AI typing progress
    opponentIsTyping: boolean; // Expose AI typing status
    userTestResults: TestResultResponse | null;
    opponentTestResults: TestResultResponse | null; // Expose AI test results
    aiProgressPercentage: number; // Expose AI's typing progress
    duelResult: DuelResult | null;
    isCompleted: boolean;
}

const DuelContext = createContext<DuelContextType | undefined>(undefined);

export const DuelProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const { user } = useAuth();

    const [duelState, setDuelState] = useState<DuelState>({
        duel: null,
        problem: null,
        results: null,
        error: null,
        isConnecting: false,
        ws: null,
        isConnected: false,
        aiOpponentCode: '',
        opponentIsTyping: false,
        userTestResults: null,
        opponentTestResults: null,
        aiProgressPercentage: 0,
        duelResult: null,
        isCompleted: false,
    });

    // Ref to hold the current code of the user, for sending with submissions
    const userCodeRef = useRef<Record<string, string>>({});
    const userLanguageRef = useRef<string>('python');
    const problemIdRef = useRef<string | null>(null);

    const handleWsMessage = useCallback((message: WSMessage) => {
        // console.log("Received WebSocket message:", message);

        setDuelState(prev => {
            const newState = { ...prev };
            switch (message.type) {
                case 'duel_start':
                    newState.duel = message.data as DuelResponse;
                    newState.problem = (message.data as DuelResponse).problem ?? null;
                    newState.isConnecting = false;
                    newState.isConnected = true;
                    newState.error = null;
                    // Initialize AI code with the problem's starter code if available
                    if (newState.problem && newState.problem.starter_code && (message.data as DuelResponse).player_two_id === null) {
                        newState.aiOpponentCode = newState.problem.starter_code[(message.data as DuelResponse).player_one_code_language || 'python'] || '';
                    }
                    break;
                case 'duel_end': {
                    try {
                        const duelEndData = typeof message.data === 'string' 
                            ? JSON.parse(message.data) as DuelResult 
                            : message.data as DuelResult;

                        return {
                            ...newState,
                            duel: { ...newState.duel!, status: 'completed' } as DuelResponse,
                            duelResult: duelEndData,
                            isCompleted: true,
                        };
                    } catch (error) {
                        console.error("Error parsing duel_end message data:", error, message.data);
                        return { ...newState, error: "Failed to parse duel end data." };
                    }
                }
                case 'ai_start':
                    newState.aiOpponentCode = '';
                    break;
                case 'ai_progress':
                    newState.aiOpponentCode += (message.data as AIProgressMessage['data']).code_chunk;
                    newState.opponentIsTyping = true;
                    // Calculate AI progress based on estimated solution length
                    const totalSolutionLength = newState.problem?.ai_solution_length || 1;
                    const currentAITypingLength = newState.aiOpponentCode.length;
                    newState.aiProgressPercentage = (currentAITypingLength / totalSolutionLength) * 100;
                    break;
                case 'ai_delete':
                    newState.aiOpponentCode = newState.aiOpponentCode.slice(0, -(message.data as AIDeleteMessage['data']).char_count);
                    // Adjust percentage down based on deletion
                    const totalSolLength = newState.problem?.ai_solution_length || 1;
                    const currentAITypingLen = newState.aiOpponentCode.length;
                    newState.aiProgressPercentage = (currentAITypingLen / totalSolLength) * 100;
                    break;
                case 'test_result': {
                    const testResult = message.data as TestResultResponse;
                    if (message.user_id === user?.id) {
                        newState.userTestResults = testResult;
                    } else {
                        newState.opponentTestResults = testResult;
                    }
                    break;
                }
                // case 'code_update':
                //     if (message.user_id !== user?.id) {
                //         // For multi-player, update opponent's code here
                //     }
                //     break;
                default:
                    console.warn("Unhandled WebSocket message type:", message.type);
            }
            return newState;
        });
    }, [user]);

    const handleWsStatusChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
        setDuelState(prev => ({
            ...prev,
            isConnecting: status === 'connecting',
            isConnected: status === 'connected',
            error: status === 'error' ? 'WebSocket connection error.' : null,
        }));
        // Special handling for AI typing status on disconnect
        if (status === 'disconnected' || status === 'error') {
            setDuelState(prev => ({ ...prev, opponentIsTyping: false }));
        }
    }, []);

    const { disconnect: disconnectWs, sendMessage } = useUniversalDuelSocket({
        duelId: duelState.duel?.id || '',
        userId: user?.id || '',
        onMessage: handleWsMessage,
        onStatusChange: handleWsStatusChange,
        enabled: !!duelState.duel?.id && !!user?.id && !duelState.results, // Enable only when duelId & userId are present and not completed
    });

    const connectToDuel = useCallback(async (duelId: string) => {
        if (!user) {
            setDuelState(prev => ({ ...prev, error: "User not authenticated. Cannot start duel." }));
            return;
        }

        setDuelState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Fetch duel details first to ensure we have problem data before connecting WS
            const duelDetails = await api.duelsApiService.getDuel(duelId);
            setDuelState(prev => ({
                ...prev,
                duel: duelDetails,
                problem: duelDetails.problem ?? null,
                isConnecting: false, // Connection will be handled by useUniversalDuelSocket
            }));
            // useUniversalDuelSocket will now connect because duelState.duel.id is set
        } catch (err) {
            console.error("Failed to fetch duel details:", err);
            setDuelState(prev => ({ ...prev, error: "Failed to load duel. Please try again.", isConnecting: false }));
        }
    }, [user]);

    // Existing disconnect now calls the hook's disconnect
    const disconnectFromDuel = useCallback(() => {
        disconnectWs(); // Call the disconnect function from the hook
        setDuelState(prev => ({ ...prev, duel: null, problem: null, results: null, error: null, isConnected: false, aiOpponentCode: '', opponentIsTyping: false, userTestResults: null, opponentTestResults: null, aiProgressPercentage: 0, duelResult: null, isCompleted: false }));
    }, [disconnectWs]);

    // New functions for Tetris Duel Arena
    const joinDuel = useCallback(() => {
        if (problemIdRef.current) {
            connectToDuel(problemIdRef.current);
        }
    }, [connectToDuel]);

    const leaveDuel = useCallback(() => {
        disconnectFromDuel();
    }, [disconnectFromDuel]);

    const sendTetrisState = useCallback((state: any) => {
        sendMessage({ type: 'tetris_state', user_id: user?.id || '', data: state });
    }, [sendMessage, user?.id]);

    const sendTetrisBoard = useCallback((board: any) => {
        sendMessage({ type: 'tetris_board', user_id: user?.id || '', data: board });
    }, [sendMessage, user?.id]);

    const setProblemId = useCallback((id: string) => {
        problemIdRef.current = id;
    }, []);

    // Update internal refs for latest code/language
    const updateCode = useCallback((duelId: string, language: string, code: string) => {
        userCodeRef.current[duelId] = code;
        userLanguageRef.current = language; // Assuming one language per duel for now
        // Optionally send code updates via WS for real-time multiplayer display
        // sendMessage({ type: 'code_update', user_id: user?.id, code, language });
    }, [/* user */]);

    const sendSolution = useCallback(async (duelId: string, code: string, language: string) => {
        if (!user?.id) return;

        setDuelState(prev => ({ ...prev, isConnecting: true })); // Indicate submission in progress

        try {
            const response = await api.duelsApiService.submitSolution(duelId, {
                player_id: user.id,
                language: language as any, // Cast to any because the API expects a specific string literal
                code: code,
            });
            // The actual duel end message will come via WebSocket from the server
            // We can show immediate feedback from this API call if needed
            console.log("Solution submission response:", response);
            setDuelState(prev => ({
                ...prev,
                userTestResults: response as unknown as TestResultResponse, // Assuming submission returns TestResultResponse
                isConnecting: false,
            }));
        } catch (err) {
            console.error("Failed to submit solution:", err);
            setDuelState(prev => ({ ...prev, error: "Failed to submit solution.", isConnecting: false }));
        }
    }, [user]);

    // Define submitCode function explicitly
    const submitCode = useCallback(async (duelId: string, code: string, language: string) => {
        if (!user?.id) return;

        setDuelState(prev => ({ ...prev, isConnecting: true })); // Indicate submission in progress

        try {
            const response = await api.duelsApiService.submitSolution(duelId, {
                player_id: user.id,
                language: language as any, // Cast to any because the API expects a specific string literal
                code: code,
            });
            console.log("Code submitted:", response);
            setDuelState(prev => ({
                ...prev,
                userTestResults: response as unknown as TestResultResponse,
                isConnecting: false,
                // Assuming submission also updates submissionResult in duelState
            }));
        } catch (err) {
            console.error("Failed to submit code:", err);
            setDuelState(prev => ({ ...prev, error: "Failed to submit code.", isConnecting: false }));
        }
    }, [user]);

    const testCode = useCallback(async (duelId: string, code: string, language: string) => {
        if (!user?.id) return;

        setDuelState(prev => ({ ...prev, isConnecting: true })); // Indicate testing in progress

        try {
            const response = await api.duelsApiService.testCode(duelId, {
                language: language as any,
                code,
            });
            // Test results will come via WebSocket from the server (test_result type)
            console.log("Code test initiated:", response);
            setDuelState(prev => ({
                ...prev,
                userTestResults: response as unknown as TestResultResponse, // Assuming test returns TestResultResponse
                isConnecting: false,
            }));
        } catch (err) {
            console.error("Failed to run tests:", err);
            setDuelState(prev => ({ ...prev, error: "Failed to run tests.", isConnecting: false }));
        }
    }, [user]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            disconnectWs();
        };
    }, [disconnectWs]);

    return (
        <DuelContext.Provider value={{
            duelState,
            connect: connectToDuel, // Renamed to avoid conflict
            disconnect: disconnectFromDuel, // Renamed to avoid conflict
            updateCode,
            sendSolution,
            testCode,
            submitCode, // Correctly reference the new submitCode function
            joinDuel,
            leaveDuel,
            sendTetrisState,
            sendTetrisBoard,
            setProblemId,
            aiOpponentCode: duelState.aiOpponentCode,
            opponentIsTyping: duelState.opponentIsTyping,
            userTestResults: duelState.userTestResults,
            opponentTestResults: duelState.opponentTestResults,
            aiProgressPercentage: duelState.aiProgressPercentage,
            duelResult: duelState.duelResult,
            isCompleted: duelState.isCompleted,
        }}>
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