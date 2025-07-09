import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Users, Lock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import AIDuelSetupModal from '../components/duels/AIDuelSetupModal'; // Will create this
import PrivateRoomModal from '../components/ui/JoinPrivateRoomModal'; // Will create this
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { duelsApiService } from '../services/duelService';

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
            navigate(`/duel/${activeDuel.id}`);
          }
        } catch (error) {
          // No active duel found, which is fine.
          console.log('No active duel found for user.');
        }
      }
    };

    checkForActiveDuel();
  }, [isAuthenticated, user, navigate, addToast, t]);

  const handleStartAIDuel = () => {
    if (!isAuthenticated) {
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
      return;
    }
    setAIDuelModalOpen(true);
  };

  const handleStartPVP = () => {
    if (!isAuthenticated) {
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
      return;
    }
    addToast({
      type: 'info',
      title: t('duels.comingSoonTitle'),
      message: t('duels.pvpComingSoonMessage'),
    });
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
          onClick={handleStartAIDuel}
        />
        <DuelTypeCard
          icon={<Users size={48} />}
          title="duels.playerVsPlayerTitle"
          description="duels.playerVsPlayerDescription"
          onClick={handleStartPVP}
          comingSoon={true}
        />
        <DuelTypeCard
          icon={<Lock size={48} />}
          title="duels.privateRoomTitle"
          description="duels.privateRoomDescription"
          onClick={handleOpenPrivateRoomModal}
        />
      </div>

      {isAIDuelModalOpen && (
        <AIDuelSetupModal isOpen={isAIDuelModalOpen} onClose={() => setAIDuelModalOpen(false)} />
      )}
      {isPrivateRoomModalOpen && (
        <PrivateRoomModal isOpen={isPrivateRoomModalOpen} onClose={() => setPrivateRoomModalOpen(false)} />
      )}
    </motion.div>
  );
};

export default DuelsPage; 