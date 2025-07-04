import { useEffect } from 'react';
import { useDuel } from '../contexts/DuelContext';
import { DuelComplete } from '../components/duels/DuelComplete';
import { DuelError } from '../components/duels/DuelError';
import { DuelLoading } from '../components/duels/DuelLoading';
import { EnhancedRealTimeDuel } from '../components/duels/EnhancedRealTimeDuel';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const PvEDuelPage: React.FC = () => {
  const { duelState, disconnect } = useDuel();
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  if (duelState.isCompleted && duelState.duelResult) {
    // @ts-ignore
    return <DuelComplete results={duelState.duelResult} currentUserId={user.id} onRematch={() => {}} t={t} />;
  }

  if (duelState.isConnecting && !duelState.duel) {
    return <DuelLoading t={t} />;
  }

  if (duelState.error) {
    return <DuelError message={duelState.error} t={t} />;
  }

  if (!duelState.duel) {
    return <DuelLoading message="Waiting for duel details..." t={t} />;
  }

  return <EnhancedRealTimeDuel />;
};

export default PvEDuelPage; 