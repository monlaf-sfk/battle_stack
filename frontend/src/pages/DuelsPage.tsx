import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Users, Lock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import DuelSetupForm, { type DuelSettings } from '../components/duels/DuelSetupForm';
import PrivateRoomModal from '../components/duels/PrivateRoomModal';
import MatchmakingModal from '../components/duels/MatchmakingModal';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { duelsApiService } from '../services/api';

const DuelTypeCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}> = ({ icon, title, description, onClick, disabled, comingSoon }) => {
  const { t } = useTranslation();
  return (
    <Card variant="glass" hover="glow" className="flex flex-col items-center text-center p-6">
      <div className="text-arena-accent mb-4">{icon}</div>
      <CardHeader className="flex-col items-center text-center pb-2">
        <CardTitle className="text-xl font-bold mb-2">{t(title)}</CardTitle>
        <CardDescription className="text-sm text-arena-text-muted">{t(description)}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-end justify-center pt-4 w-full">
        <Button
          onClick={onClick}
          disabled={disabled || comingSoon}
          variant={comingSoon ? "secondary" : "gradient"}
          className="w-full"
        >
          {comingSoon ? t('common.comingSoon') : t('duels.startDuel')}
          {!comingSoon && <ChevronRight className="ml-2" size={18} />}
        </Button>
      </CardContent>
    </Card>
  );
};

const DuelsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isAIDuelModalOpen, setAIDuelModalOpen] = useState(false);
  const [isPrivateRoomModalOpen, setPrivateRoomModalOpen] = useState(false);
  const [isMatchmakingModalOpen, setMatchmakingModalOpen] = useState(false);
  
  useEffect(() => {
    const checkForActiveDuel = async () => {
      if (isAuthenticated && user?.id) {
        try {
          const activeDuel = await duelsApiService.getDuelForUser(user.id);
          if (activeDuel) {
            addToast({
              type: 'info',
              title: t('duels.duelInProgressTitle'),
              message: t('duels.duelInProgressMessage'),
              action: {
                label: t('duels.goToActiveDuel'),
                onClick: () => navigate(`/duel/${activeDuel.id}`)
              }
            });
            // No automatic navigation here, let the user decide.
          }
        } catch (error) {
          // No active duel found, which is fine.
          console.log('No active duel found for user.');
        }
      }
    };

    checkForActiveDuel();
  }, [isAuthenticated, user, navigate, addToast, t]);

  const handleStartAIDuel = async (settings: DuelSettings) => {
    if (!user?.id) {
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('common.loginToContinue'),
      });
      navigate('/login');
      return;
    }

    const { difficulty, category, theme, language } = settings;
    
    try {
      const newDuel = await duelsApiService.createAIDuel({
        user_id: user.id,
        theme,
        difficulty,
        language: language.id,
        category,
      });

      addToast({
        type: 'success',
        title: t('duels.duelStartedTitle'),
        message: t('duels.waitingForProblemGeneration'),
      });

      setAIDuelModalOpen(false);
      navigate(`/duel/${newDuel.id}`);
    } catch (error: any) {
      // The DuelSetupForm will show its own error toast.
      // We could add more specific handling here if needed.
      console.error('Failed to create AI duel:', error);
      throw error; // Re-throw to be caught by the form
    }
  };


  const handleStartPVP = () => {
    if (!isAuthenticated || !user) {
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
      return;
    }
    // No navigation here. The modal will handle starting the search.
    setMatchmakingModalOpen(true);
  };

  const handleOpenPrivateRoomModal = () => {
    if (!isAuthenticated) {
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
      return;
    }
    setPrivateRoomModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 lg:p-8"
    >
      <h1 className="text-3xl font-bold text-white mb-8 text-center">{t('duels.chooseYourBattle')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <DuelTypeCard
          icon={<Bot size={48} />}
          title="duels.playerVsAITitle"
          description="duels.playerVsAIDescription"
          onClick={() => setAIDuelModalOpen(true)}
        />
        <DuelTypeCard
          icon={<Users size={48} />}
          title="duels.playerVsPlayerTitle"
          description="duels.playerVsPlayerDescription"
          onClick={handleStartPVP}
          comingSoon={false}
        />
        <DuelTypeCard
          icon={<Lock size={48} />}
          title="duels.privateRoomTitle"
          description="duels.privateRoomDescription"
          onClick={handleOpenPrivateRoomModal}
        />
      </div>

      {isAIDuelModalOpen && (
        <DuelSetupForm
          isOpen={isAIDuelModalOpen}
          onClose={() => setAIDuelModalOpen(false)}
          onSubmit={handleStartAIDuel}
          title={t('duels.aiDuelSetupTitle')}
          description={t('duels.aiDuelSetupSubtitle')}
        />
      )}
      {isPrivateRoomModalOpen && (
        <PrivateRoomModal isOpen={isPrivateRoomModalOpen} onClose={() => setPrivateRoomModalOpen(false)} />
      )}
      {isMatchmakingModalOpen && (
        <MatchmakingModal 
          isOpen={isMatchmakingModalOpen} 
          onClose={() => setMatchmakingModalOpen(false)}
        />
      )}
    </motion.div>
  );
};

export default DuelsPage; 