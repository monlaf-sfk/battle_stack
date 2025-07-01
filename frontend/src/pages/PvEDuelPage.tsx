import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { duelsApiService } from '../services/duelService';
import { useDuelState, useDuelDispatch } from '../contexts/DuelContext';
import { useUniversalDuelSocket } from '../hooks/useUniversalDuelSocket';
import type { WSMessage } from '../types/duel.types';
import { useToast } from '../components/ui/Toast';

import { AIDuelSettingsModal } from '../components/duels/AIDuelSettingsModal';
import { EnhancedRealTimeDuel } from '../components/duels/EnhancedRealTimeDuel';
import { DuelLoading } from '../components/duels/DuelLoading';
import { DuelError } from '../components/duels/DuelError';
import { AIDuelResults } from '../components/duels/AIDuelResults';

/**
 * This component manages the WebSocket connection and dispatches events to the DuelContext.
 * It does not render anything itself.
 */
const DuelSocketManager: React.FC = () => {
    const { user } = useAuth();
    const { duel } = useDuelState();
    const dispatch = useDuelDispatch();

    const handleMessage = useCallback((message: WSMessage) => {
        dispatch({ type: 'SOCKET_MESSAGE_RECEIVED', payload: message });
    }, [dispatch]);

    const handleStatusChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
        dispatch({ type: 'SET_SOCKET_STATUS', payload: status });
    }, [dispatch]);

    useUniversalDuelSocket({
        duelId: duel?.id || '',
        userId: user?.id || '',
        onMessage: handleMessage,
        onStatusChange: handleStatusChange,
        enabled: !!duel && duel.status !== 'completed' && duel.status !== 'cancelled' && duel.status !== 'timed_out',
    });

    return null; // This component does not render anything
};


const PvEDuelPage: React.FC = () => {
    const { user } = useAuth();
    const { duelId } = useParams<{ duelId: string }>(); // Extract duelId from URL parameters
    const { duel, error, socketStatus } = useDuelState();
    const dispatch = useDuelDispatch();
    const navigate = useNavigate();
    const { addToast } = useToast();
    
    useEffect(() => {
        console.log('PvEDuelPage - Current Duel State:', duel);
        console.log('PvEDuelPage - Current Socket Status:', socketStatus);
        if (duel) {
            console.log('PvEDuelPage - Duel ID:', duel.id);
            console.log('PvEDuelPage - Duel Status:', duel.status);
            if (duel.problem) {
                console.log('PvEDuelPage - Problem in Duel State (Full):', duel.problem);
            } else {
                console.log('PvEDuelPage - Problem NOT yet in Duel State. Duel object:', duel);
            }
        }
    }, [duel, socketStatus]);
    
    // Reset state when the component unmounts
    useEffect(() => {
        return () => {
            dispatch({ type: 'RESET_STATE' });
        }
    }, [dispatch]);
    
    const startCustomDuel = async (settings: { theme: string; difficulty: string; language: string; }) => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', payload: "You must be logged in to start a duel." });
            return;
        }

        try {
            const response = await duelsApiService.createCustomAIDuel({ ...settings, user_id: user.id });
            dispatch({ type: 'SET_DUEL', payload: response });
            navigate(`/duel/pve/${response.id}`, { replace: true });
            addToast({ type: 'success', title: 'Duel Started!', message: 'Your AI duel has begun. Good luck!' });
        } catch (err) {
            console.error('❌ Error creating customized AI duel:', err);
            const errorMessage = err instanceof Error ? err.message : "Failed to start duel creation process.";
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
    };

    // Fetch existing duel if duelId is in URL on component mount
    useEffect(() => {
        if (duelId && !duel && user?.id) { // Only fetch if duelId exists, duel is null, and user is logged in
            const fetchExistingDuel = async () => {
                try {
                    dispatch({ type: 'SET_SOCKET_STATUS', payload: 'connecting' }); // Show connecting status
                    const existingDuel = await duelsApiService.getDuel(duelId);
                    
                    if (existingDuel.status === 'completed') {
                        console.log('PvEDuelPage - Loaded completed duel, navigating to dashboard.');
                        addToast({ type: 'info', title: 'Duel Concluded', message: 'This duel has already finished.' });
                        navigate('/dashboard', { replace: true });
                        return;
                    }

                    dispatch({ type: 'SET_DUEL', payload: existingDuel });
                    addToast({ type: 'info', title: 'Duel Resumed', message: 'Resumed your ongoing duel.' });
                } catch (err) {
                    console.error('❌ Error fetching existing duel:', err);
                    dispatch({ type: 'SET_ERROR', payload: "Failed to load duel. It might have ended or does not exist." });
                    dispatch({ type: 'SET_SOCKET_STATUS', payload: 'error' });
                }
            };
            fetchExistingDuel();
        }
    }, [duelId, duel, user?.id, dispatch, addToast, navigate]);
    
    const isModalOpen = !duel && !error;
    const isLoading = socketStatus === 'connecting' || (duel?.status === 'pending' || duel?.status === 'generating_problem');

    const handleRematch = async () => {
        if (!user || !duel) return;
        try {
            const newDuel = await duelsApiService.createCustomAIDuel({
                user_id: user.id,
                theme: 'general', // Assuming a default theme or derive from previous duel
                difficulty: duel.difficulty,
                language: duel.problem?.code_templates?.[0]?.language || 'python', // Derive language from problem templates or default
            });
            dispatch({ type: 'SET_DUEL', payload: newDuel });
            navigate(`/duel/pve/${newDuel.id}`, { replace: true });
            addToast({ type: 'success', title: 'Rematch!', message: 'A new AI duel is starting!' });
        } catch (err) {
            console.error('Failed to start rematch:', err);
            addToast({ type: 'error', title: 'Rematch Failed', message: 'Could not start a new duel.' });
        }
    };

    const handleReviewCode = () => {
        addToast({ type: 'info', title: 'Feature Coming Soon', message: 'Code review functionality is under development!' });
        // In a real app, you might navigate to a code review page
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    // Helper to extract stats for AIDuelResults
    const getStatsForAIDuelResults = () => {
        if (!duel || !duel.results || !duel.problem || !user) return null;

        const isVictory = duel.results.winner_id === user.id;

        const playerOneResult = duel.results.player_one_result;
        const playerTwoResult = duel.results.player_two_result;

        const currentPlayerResult = duel.player_one_id === user.id ? playerOneResult : playerTwoResult;
        const opponentPlayerResult = duel.player_one_id === user.id ? playerTwoResult : playerOneResult;

        if (!currentPlayerResult || !opponentPlayerResult) return null;

        // Assuming xpGained and ratingChange are part of the duel object or can be derived
        // For now, setting them to a placeholder or 0
        const xpGained = duel.rating_changes?.[user.id] ? duel.rating_changes[user.id] * 5 : 0; // Example derivation
        const ratingChange = duel.rating_changes?.[user.id] || 0;

        return {
            isVictory: isVictory,
            playerStats: {
                testsPassed: currentPlayerResult.score, // Assuming score represents tests passed
                totalTests: duel.problem.test_cases.length,
                totalTime: currentPlayerResult.time_taken_seconds,
                attempts: currentPlayerResult.submission_count,
            },
            aiStats: {
                testsPassed: opponentPlayerResult.score,
                totalTests: duel.problem.test_cases.length,
                totalTime: opponentPlayerResult.time_taken_seconds,
                attempts: opponentPlayerResult.submission_count,
            },
            problem: {
                title: duel.problem.title,
                difficulty: duel.problem.difficulty,
            },
            xpGained: xpGained,
            ratingChange: ratingChange,
            achievements: [], // Placeholder for achievements
        };
    };

    const duelResultData = getStatsForAIDuelResults();

    useEffect(() => {
        if (duel?.status === 'completed') {
            console.log('PvEDuelPage - Duel completed, navigating to dashboard.');
            navigate('/dashboard', { replace: true });
        }
    }, [duel?.status, navigate]);

    return (
        <>
            {duel && <DuelSocketManager />}

            {isModalOpen && (
                <AIDuelSettingsModal
                    isOpen={isModalOpen}
                    onStartDuel={startCustomDuel}
                    onClose={() => navigate('/')} 
                />
            )}

            {isLoading && (duel?.status === 'pending' || duel?.status === 'generating_problem') && (
                <DuelLoading message="Forging a new challenge in the digital arena..." />
            )}

            {error && (
                <DuelError message={error} />
            )}

            {/* Debugging for EnhancedRealTimeDuel rendering */}
            {console.log('PvEDuelPage - EnhancedRealTimeDuel render check: duel=', duel, 'status=', duel?.status, 'problem=', duel?.problem, 'duelResultData=', duelResultData)}

            {duel && duel.status === 'in_progress' && duel.problem && (
                <EnhancedRealTimeDuel duel={duel} />
            )}

            {duel && duel.status === 'completed' && duel.problem && duelResultData && (
                <AIDuelResults 
                    duelResult={duelResultData} 
                    onRematch={handleRematch} 
                    onReviewCode={handleReviewCode} 
                    onBackToDashboard={handleBackToDashboard} 
                />
            )}

            {duel && duel.status === 'completed' && !duelResultData && (
                console.warn('PvEDuelPage - Duel completed but duelResultData is missing or incomplete.', { duel, duelResultData }),
                <DuelError message="Duel completed, but results data is missing. Please try refreshing." />
            )}
        </>
    );
};

export default PvEDuelPage; 