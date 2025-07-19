import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/Button';
import { Label } from '../ui/label';
import { Loader2, Swords, ThermometerSnowflake, Thermometer, Flame, BrainCircuit, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
 
import { useTranslation } from 'react-i18next';
import { duelsApiService } from '../../services/api';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDuel } from '../../hooks/useDuelManager';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Category = 'algorithms' | 'sql';

const MatchmakingModal: React.FC<MatchmakingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
 
  const { t } = useTranslation();
  const { startPollingForDuel } = useDuel();

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [category, setCategory] = useState<Category>('algorithms');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSearching(false);
    }
  }, [isOpen]);

  const handleJoinQueue = async () => {
    if (!user?.id) {
      addToast({ type: 'error', title: t('common.error'), message: t('common.loginToContinue') });
      return;
    }

    setIsSearching(true);
    try {
      await duelsApiService.joinMatchmaking(difficulty, category);
      addToast({ type: 'success', title: t('duels.matchmakingJoinedTitle'), message: t('duels.matchmakingJoinedMessage') });
      startPollingForDuel(user.id);
      // The user will be redirected via polling mechanism when a match is found.
    } catch (error: any) {
      addToast({ type: 'error', title: t('duels.failedToJoinQueue'), message: error.response?.data?.detail || t('common.tryAgain') });
      setIsSearching(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user?.id) return;
    setIsSearching(false);
    try {
      await duelsApiService.leaveMatchmaking(difficulty, category);
      addToast({ type: 'info', title: t('duels.matchmakingLeftTitle'), message: t('duels.matchmakingLeftMessage') });
    } catch (error: any) {
      addToast({ type: 'error', title: t('duels.failedToLeaveQueue'), message: error.response?.data?.detail || t('common.tryAgain') });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={!isSearching ? onClose : () => {}}>
      <DialogContent className="bg-arena-dark/90 border-arena-border/50 text-white backdrop-blur-xl sm:max-w-2xl p-0 overflow-hidden">
        <div className="relative z-10 p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <Swords size={28} className="text-arena-accent" />
              {t('duels.pvpMatchmakingTitle')}
            </DialogTitle>
            <DialogDescription className="text-arena-text-muted">
              {t('duels.pvpMatchmakingSubtitle')}
            </DialogDescription>
          </DialogHeader>

          {!isSearching ? (
            <>
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white">{t('duels.difficultyLevel')}</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DifficultyButton value="easy" label={t('duels.difficultyEasy')} icon={<ThermometerSnowflake />} current={difficulty} onSelect={setDifficulty} />
                  <DifficultyButton value="medium" label={t('duels.difficultyMedium')} icon={<Thermometer />} current={difficulty} onSelect={setDifficulty} />
                  <DifficultyButton value="hard" label={t('duels.difficultyHard')} icon={<Flame />} current={difficulty} onSelect={setDifficulty} />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-semibold text-white">{t('duels.chooseCategory')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <CategoryButton value="algorithms" label={t('duels.categoryAlgorithms')} icon={<BrainCircuit />} current={category} onSelect={setCategory} />
                  <CategoryButton value="sql" label={t('duels.categorySQL')} icon={<Database />} current={category} onSelect={setCategory} />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-arena-border/50">
                <Button variant="ghost" onClick={onClose} className="text-base px-6 py-3">{t('common.cancel')}</Button>
                <Button variant="gradient" onClick={handleJoinQueue} className="text-base px-8 py-3">
                  <Swords className="mr-2 h-5 w-5" />
                  {t('duels.findMatch')}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 text-arena-accent animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">{t('duels.searchingForOpponent')}</h3>
              <p className="text-arena-text-muted">You are in the queue for a {difficulty} {category} duel.</p>
              <Button variant="ghost" onClick={handleLeaveQueue} className="mt-8">
                {t('duels.cancelSearch')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ... (re-use DifficultyButton and CategoryButton from AIDuelSetupModal)
const DifficultyButton: React.FC<{ value: Difficulty, label: string, icon: React.ReactNode, current: Difficulty, onSelect: (d: Difficulty) => void, disabled?: boolean }> = 
({ value, label, icon, current, onSelect, disabled }) => {
  const isSelected = value === current;
  const styles = {
    easy: 'border-green-500/50 text-green-400',
    medium: 'border-yellow-500/50 text-yellow-400',
    hard: 'border-red-500/50 text-red-400',
  };
  return (
    <motion.button
      onClick={() => !disabled && onSelect(value)}
      className={cn(
        "p-4 rounded-lg border-2 text-center transition-all duration-300 space-y-2",
        "bg-arena-surface/50 hover:bg-arena-light/20",
        isSelected ? `shadow-lg ${styles[value]}` : 'border-arena-border',
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={{ y: disabled ? 0 : -5 }}
    >
      <div className={cn("mx-auto w-fit", !isSelected && "text-arena-text-muted")}>{icon}</div>
      <h4 className={cn("font-bold", !isSelected && "text-white")}>{label}</h4>
    </motion.button>
  )
};

const CategoryButton: React.FC<{ value: Category, label: string, icon: React.ReactNode, current: Category, onSelect: (c: Category) => void, disabled?: boolean }> = 
({ value, label, icon, current, onSelect, disabled }) => {
  const isSelected = value === current;
  return (
    <motion.button
      onClick={() => !disabled && onSelect(value)}
      className={cn(
        "p-4 rounded-lg border-2 text-center transition-all duration-300 space-y-2",
        "bg-arena-surface/50 hover:bg-arena-light/20",
        isSelected ? 'border-arena-accent text-arena-accent shadow-lg' : 'border-arena-border text-white',
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={{ y: disabled ? 0 : -5 }}
    >
      <div className="mx-auto w-fit">{icon}</div>
      <h4 className="font-bold">{label}</h4>
    </motion.button>
  )
};

export default MatchmakingModal; 