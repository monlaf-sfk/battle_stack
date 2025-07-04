import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as duelService from "../services/duelService";
import { useNotifications } from "../hooks/useNotifications";
import { useDuel } from '../contexts/DuelContext';
import {
  AIDuelSettingsModal,
  type AIDuelSettings,
} from "../components/duels/AIDuelSettingsModal";
import { DuelLoading } from "../components/duels/DuelLoading";
import { EmptyState } from "../components/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Trophy, Zap, Swords, Bot, Users } from 'lucide-react';
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

const QuickDuelPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showNotification } = useNotifications();
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const { t } = useTranslation();

  const { duelState } = useDuel();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !user.id) {
        return;
      }

      if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
          navigate(`/duel/pve/${duelState.duel.id}`);
          return;
      }
    };

    if (!loading) {
      fetchInitialData();
    }
  }, [user, loading, navigate, showNotification, duelState.duel]);

  const handleStartAIDuel = async (settings: Omit<AIDuelSettings, "user_id">) => {
    if (!user || !user.id) {
        showNotification(
            "error",
            t('common.error'),
            t('duels.loginToStartDuel')
        );
        return;
    }
    if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
        showNotification(
            "info",
            t('duels.duelInProgressTitle'),
            t('duels.duelInProgressMessage')
        );
        setShowAISettingsModal(false);
        navigate(`/duel/pve/${duelState.duel.id}`);
        return;
    }

    try {
        const newDuel = await duelService.createAIDuel({
            ...settings,
            user_id: user.id,
        });
        navigate(`/duel/pve/${newDuel.id}`);
    } catch (error) {
        console.error("Failed to start AI duel:", error);
        showNotification(
            "error",
            t('common.error'),
            t('duels.failedToStartAIDuel')
        );
    }
  };

  const handleJoinQueue = () => {
    if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
        showNotification(
            "info",
            t('duels.duelInProgressTitle'),
            t('duels.duelInProgressMessage')
        );
        navigate(`/duel/pve/${duelState.duel.id}`);
        return;
    }
    showNotification(
      "info",
      t('duels.comingSoonTitle'),
      t('duels.pvpComingSoonMessage')
    );
  };

  if (loading) {
    return <DuelLoading t={t} />;
  }

  const hasActiveDuel = !!duelState.duel && (duelState.duel.status === 'pending' || duelState.duel.status === 'in_progress');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-white p-4 sm:p-8">
      <motion.h1 
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-10 text-center gradient-text-safe leading-tight"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {t('duels.chooseYourBattle')}
      </motion.h1>
      {hasActiveDuel ? (
          <EmptyState
              icon={<Trophy className="w-16 h-16 text-yellow-500" />}
              title={t('duels.duelInProgressTitle')}
              description={t('duels.duelInProgressMessage')}
              action={{
                  label: t('duels.goToActiveDuel'),
                  onClick: () => navigate(`/duel/pve/${duelState.duel!.id}`),
                  variant: "gradient",
              }}
          />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card variant="glass" hover="lift" className="p-6 flex flex-col items-center text-center h-full">
                <CardHeader icon={<Bot className="w-12 h-12 text-green-400 mb-4" />}>
                  <CardTitle gradient>{t('duels.playerVsAITitle')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <CardDescription className="mb-6">{t('duels.playerVsAIDescription')}</CardDescription>
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={() => setShowAISettingsModal(true)}
                    className="w-full"
                  >
                    <Zap className="mr-2 h-5 w-5" /> {t('duels.startAIDuel')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card variant="glass" hover="lift" className="p-6 flex flex-col items-center text-center h-full">
                <CardHeader icon={<Users className="w-12 h-12 text-blue-400 mb-4" />}>
                  <CardTitle gradient>{t('duels.playerVsPlayerTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <CardDescription className="mb-6">{t('duels.playerVsPlayerDescription')}</CardDescription>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleJoinQueue}
                    className="w-full"
                  >
                    <Swords className="mr-2 h-5 w-5" /> {t('duels.joinMatchmaking')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
      )}
      <AIDuelSettingsModal
        isOpen={showAISettingsModal && !hasActiveDuel}
        onClose={() => setShowAISettingsModal(false)}
        onStart={handleStartAIDuel}
      />
    </div>
  );
};

export default QuickDuelPage; 