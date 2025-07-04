import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDuel } from '../contexts/DuelContext';
import EnhancedRealTimeDuel from '../components/duels/EnhancedRealTimeDuel';
import { DuelLoading } from '../components/duels/DuelLoading';
import { DuelError } from '../components/duels/DuelError';
import { DuelComplete } from '../components/duels/DuelComplete';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const PvEDuelPage = () => {
    const { duelId } = useParams<{ duelId: string }>();
    const { duelState, connect, disconnect } = useDuel();
    const { user } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        if (duelId) {
            connect(duelId);
        }
        return () => {
            disconnect();
        };
    }, [duelId, connect, disconnect]);

    if (duelState.isCompleted && duelState.duelResult && user) {
        return <DuelComplete 
            results={{
                playerScore: duelState.duelResult.player_one_result?.score,
                opponentScore: duelState.duelResult.player_two_result?.score,
                userTestResults: duelState.userTestResults,
                opponentTestResults: duelState.opponentTestResults
            }} 
            onRematch={() => {}}
            t={t} 
        />;
    }

    if (duelState.isConnecting) {
        return <DuelLoading t={t} />;
    }

    if (duelState.error) {
        return <DuelError message={duelState.error} t={t} />;
    }

    if (!duelState.duel) {
        return <DuelLoading message="Waiting for duel details..." t={t} />;
    }

    return (
        <div className="h-screen">
            <EnhancedRealTimeDuel />
        </div>
    );
};

export default PvEDuelPage; 