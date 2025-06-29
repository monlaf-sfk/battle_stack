import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { duelsApiService } from '../services/duelService';
import { useDuelState, useDuelDispatch } from '../contexts/DuelContext';
import { useUniversalDuelSocket } from '../hooks/useUniversalDuelSocket';
import type { WSMessage } from '../types/duel.types';

import { AIDuelSettingsModal } from '../components/duels/AIDuelSettingsModal';
import { EnhancedRealTimeDuel } from '../components/duels/EnhancedRealTimeDuel';
import { DuelLoading } from '../components/duels/DuelLoading';
import { DuelError } from '../components/duels/DuelError';

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
        enabled: !!duel && (duel.status !== 'COMPLETED' && duel.status !== 'TIMED_OUT'),
    });

    return null; // This component does not render anything
};


const PvEDuelPage: React.FC = () => {
    const { user } = useAuth();
    const { duel, error, socketStatus } = useDuelState();
    const dispatch = useDuelDispatch();
    const navigate = useNavigate();
    
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
            const createdDuel = await duelsApiService.createCustomAIDuel({ ...settings, user_id: user.id });
            dispatch({ type: 'SET_DUEL', payload: createdDuel });
            navigate(`/pve-duel`, { replace: true });
        } catch (err) {
            console.error('❌ Error creating customized AI duel:', err);
            const errorMessage = err instanceof Error ? err.message : "Failed to start duel creation process.";
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
    };
    
    const isModalOpen = !duel && !error;
    const isLoading = socketStatus === 'connecting' || (duel?.status === 'PENDING' || duel?.status === 'GENERATING_PROBLEM');

    if (duel && duel.status === 'IN_PROGRESS') {
        return (
            <>
                <DuelSocketManager />
                <EnhancedRealTimeDuel duel={duel} />
            </>
        );
    }
    
    if (duel && duel.status === 'COMPLETED') {
         return (
            <>
                <DuelSocketManager />
                <EnhancedRealTimeDuel duel={duel} />
            </>
        );
    }

    if (isLoading) {
        return <DuelLoading message="Forging a new challenge in the digital arena..." />;
    }

    if (error) {
        return <DuelError message={error} onRetry={() => { dispatch({ type: 'RESET_STATE' }); navigate('/pve-duel', {replace: true}) }} />;
    }

    return (
        <AIDuelSettingsModal
            isOpen={isModalOpen}
            onStartDuel={startCustomDuel}
            onClose={() => navigate('/')} 
        />
    );
};

export default PvEDuelPage; 