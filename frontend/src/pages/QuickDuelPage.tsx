import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as duelService from "../services/duelService";
import type { DuelResponse } from "../types/duel.types";
import { useNotifications } from "../hooks/useNotifications";
import {
  AIDuelSettingsModal,
  type AIDuelSettings,
} from "../components/duels/AIDuelSettingsModal";
import { DuelLoading } from "../components/duels/DuelLoading";

const QuickDuelPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showNotification } = useNotifications();
  const [activeDuel, setActiveDuel] = useState<DuelResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);

  useEffect(() => {
    // This page should be a menu, not automatically redirect.
    // The logic to rejoin an active duel should be initiated by the user,
    // for example, from a banner on the dashboard.
    //
    // const fetchInitialData = async () => {
    //   if (!user || !user.id) {
    //     return;
    //   }
    //
    //   setIsLoading(true);
    //   try {
    //     const duel = await duelService.duelsApiService.getActiveOrWaitingDuel(user.id);
    //     if (duel) {
    //         navigate(`/duel/pve/${duel.id}`);
    //     }
    //   } catch (error) {
    //     setActiveDuel(null);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    //
    // if (!loading) {
    //   fetchInitialData();
    // }

    // On this page, we just need to ensure auth state is loaded.
    if (!loading) {
      setIsLoading(false);
    }
  }, [user, loading, navigate]);

  const handleStartAIDuel = async (settings: Omit<AIDuelSettings, "userId">) => {
    if (!user || !user.id) {
        showNotification(
            "error",
            "Error",
            "You must be logged in to start a duel."
        );
        return;
    }

    setIsLoading(true);
    try {
        const newDuel = await duelService.createAIDuel({
            ...settings,
            user_id: user.id,
        });
        // Just navigate. The target page will fetch the full duel object.
        navigate(`/duel/pve/${newDuel.id}`);
    } catch (error) {
        console.error("Failed to start AI duel:", error);
        showNotification(
            "error",
            "Error",
            "Could not start a new AI duel. Please try again."
        );
        setIsLoading(false); // Stop loading on error
    }
  };

  const handleJoinQueue = () => {
    showNotification(
      "info",
      "Coming Soon!",
      "Player vs. Player matchmaking is under development."
    );
  };

  if (isLoading || loading) {
    return <DuelLoading />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Choose Your Battle</h1>
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
      <AIDuelSettingsModal
        isOpen={showAISettingsModal}
        onClose={() => setShowAISettingsModal(false)}
        onStartDuel={handleStartAIDuel}
      />
    </div>
  );
};

export default QuickDuelPage; 