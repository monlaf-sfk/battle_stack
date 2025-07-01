import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as duelService from "../services/duelService";
import { useNotifications } from "../hooks/useNotifications";
import { useDuelState } from '../contexts/DuelContext';
import {
  AIDuelSettingsModal,
  type AIDuelSettings,
} from "../components/duels/AIDuelSettingsModal";
import { DuelLoading } from "../components/duels/DuelLoading";
import { EmptyState } from "../components/ui/EmptyState";
import { Trophy } from 'lucide-react';

const QuickDuelPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);

  const { duel } = useDuelState();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      if (duel && (duel.status === 'in_progress' || duel.status === 'pending' || duel.status === 'generating_problem')) {
          navigate(`/duel/pve/${duel.id}`);
          return;
      }

      setIsLoading(true);
      try {
        const activeOrWaitingDuel = await duelService.duelsApiService.getActiveOrWaitingDuel(user.id);
        if (activeOrWaitingDuel) {
          navigate(`/duel/pve/${activeOrWaitingDuel.id}`);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch active duel:", error);
        showNotification(
            "error",
            "Error",
            "Failed to check for active duels. Please try again."
        );
        setIsLoading(false);
      }
    };

    if (!loading) {
      fetchInitialData();
    } else {
        setIsLoading(true);
    }
  }, [user, loading, navigate, showNotification, duel]);

  const handleStartAIDuel = async (settings: Omit<AIDuelSettings, "user_id">) => {
    if (!user || !user.id) {
        showNotification(
            "error",
            "Error",
            "You must be logged in to start a duel."
        );
        return;
    }
    if (duel && (duel.status === 'in_progress' || duel.status === 'pending' || duel.status === 'generating_problem')) {
        showNotification(
            "info",
            "Duel in Progress",
            "You already have an active or pending duel. Please complete it first."
        );
        setShowAISettingsModal(false);
        navigate(`/duel/pve/${duel.id}`);
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
    if (duel && (duel.status === 'in_progress' || duel.status === 'pending' || duel.status === 'generating_problem')) {
        showNotification(
            "info",
            "Duel in Progress",
            "You already have an active or pending duel. Please complete it first."
        );
        navigate(`/duel/pve/${duel.id}`);
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

  const hasActiveDuel = duel && (duel.status === 'in_progress' || duel.status === 'pending' || duel.status === 'generating_problem');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Choose Your Battle</h1>
      {hasActiveDuel ? (
          <EmptyState
              icon={<Trophy className="w-16 h-16 text-yellow-500" />}
              title="Duel in Progress"
              description="You currently have an active or pending duel. Please finish it before starting a new one."
              action={{
                  label: "Go to Active Duel",
                  onClick: () => navigate(`/duel/pve/${duel!.id}`),
                  variant: "gradient",
              }}
          />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div
              className="bg-gray-800 p-8 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setShowAISettingsModal(true)}
            >
              <h2 className="text-2xl font-semibold mb-4">Player vs. AI</h2>
              <p>Hone your skills against our advanced AI opponent.</p>
            </div>
            <div
              className="bg-gray-800 p-8 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={handleJoinQueue}
            >
              <h2 className="text-2xl font-semibold mb-4">Player vs. Player</h2>
              <p>Challenge a random opponent and climb the leaderboard.</p>
            </div>
          </div>
      )}
      <AIDuelSettingsModal
        isOpen={showAISettingsModal && !hasActiveDuel}
        onClose={() => setShowAISettingsModal(false)}
        onStartDuel={handleStartAIDuel}
      />
    </div>
  );
};

export default QuickDuelPage; 