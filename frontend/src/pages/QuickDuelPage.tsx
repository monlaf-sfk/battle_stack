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

const QuickDuelPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);

  const { duelState } = useDuel();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
          navigate(`/duel/pve/${duelState.duel.id}`);
          return;
      }

      setIsLoading(false); 
    };

    if (!loading) {
      fetchInitialData();
    } else {
        setIsLoading(true);
    }
  }, [user, loading, navigate, showNotification, duelState.duel]);

  const handleStartAIDuel = async (settings: Omit<AIDuelSettings, "user_id">) => {
    if (!user || !user.id) {
        showNotification(
            "error",
            "Error",
            "You must be logged in to start a duel."
        );
        return;
    }
    if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
        showNotification(
            "info",
            "Duel in Progress",
            "You already have an active or pending duel. Please complete it first."
        );
        setShowAISettingsModal(false);
        navigate(`/duel/pve/${duelState.duel.id}`);
        return;
    }

    setIsLoading(true);
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
            "Error",
            "Could not start a new AI duel. Please try again."
        );
        setIsLoading(false);
    }
  };

  const handleJoinQueue = () => {
    if (duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem')) {
        showNotification(
            "info",
            "Duel in Progress",
            "You already have an active or pending duel. Please complete it first."
        );
        navigate(`/duel/pve/${duelState.duel.id}`);
        return;
    }
    showNotification(
      "info",
      "Coming Soon!",
      "Player vs. Player matchmaking is under development."
    );
  };

  if (isLoading || loading) {
    return <DuelLoading />;
  }

  const hasActiveDuel = duelState.duel && (duelState.duel.status === 'in_progress' || duelState.duel.status === 'pending' || duelState.duel.status === 'generating_problem');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-white p-4 sm:p-8">
      <motion.h1 
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-10 text-center gradient-text-safe leading-tight"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        Choose Your Battle
      </motion.h1>
      {hasActiveDuel ? (
          <EmptyState
              icon={<Trophy className="w-16 h-16 text-yellow-500" />}
              title="Duel in Progress"
              description="You currently have an active or pending duel. Please finish it before starting a new one."
              action={{
                  label: "Go to Active Duel",
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
                  <CardTitle gradient>Player vs. AI</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <CardDescription className="mb-6">Hone your skills against our advanced AI opponent. Practice, learn, and improve at your own pace.</CardDescription>
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={() => setShowAISettingsModal(true)}
                    className="w-full"
                  >
                    <Zap className="mr-2 h-5 w-5" /> Start AI Duel
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
                  <CardTitle gradient>Player vs. Player</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <CardDescription className="mb-6">Challenge a random opponent and climb the global leaderboard. Test your real-time coding prowess!</CardDescription>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleJoinQueue}
                    className="w-full"
                  >
                    <Swords className="mr-2 h-5 w-5" /> Join Matchmaking (Coming Soon)
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