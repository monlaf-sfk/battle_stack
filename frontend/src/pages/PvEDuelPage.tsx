import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDuel } from '../contexts/DuelContext';
import EnhancedRealTimeDuel from '../components/duels/EnhancedRealTimeDuel';
import { DuelLoading } from '../components/duels/DuelLoading';
import { DuelError } from '../components/duels/DuelError';
import { DuelComplete } from '../components/duels/DuelComplete';
import { useAuth } from '../contexts/AuthContext';

const PvEDuelPage = () => {
    const { duelId } = useParams<{ duelId: string }>();
    const { duelState, connect, disconnect } = useDuel();
    const { user } = useAuth();

    useEffect(() => {
        if (duelId) {
            connect(duelId);
        }
        return () => {
            disconnect();
        };
    }, [duelId, connect, disconnect]);

    if (duelState.isCompleted && duelState.duelResult && user?.id) {
        return <DuelComplete result={duelState.duelResult} currentUserId={user.id} />;
    }

    if (duelState.isConnecting) {
        return <DuelLoading />;
    }

    if (duelState.error) {
        return <DuelError message={duelState.error} />;
    }

    if (!duelState.duel) {
        return <DuelLoading message="Waiting for duel details..." />;
    }

    return (
        <div className="h-screen">
            <EnhancedRealTimeDuel />
        </div>
    );
};

export default PvEDuelPage; 