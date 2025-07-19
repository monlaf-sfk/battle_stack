import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Loader2, Swords, ThermometerSnowflake, Thermometer, Flame, Sparkles, BrainCircuit, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { useTranslation } from 'react-i18next';
import { codeExecutionService, type SupportedLanguage } from '../../services/codeExecutionService';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DuelSetupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: DuelSettings) => Promise<void>;
  title: string;
  description: string;
}

export interface DuelSettings {
  difficulty: Difficulty;
  category: Category;
  theme: string;
  language: SupportedLanguage;
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Category = 'algorithms' | 'sql';

const DuelSetupForm: React.FC<DuelSetupFormProps> = ({ isOpen, onClose, onSubmit, title, description }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [category, setCategory] = useState<Category>('algorithms');
  const [theme, setTheme] = useState<string>('');
  const [language, setLanguage] = useState<SupportedLanguage | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadLanguages = async () => {
      const supportedLangs = await codeExecutionService.getSupportedLanguages();
      setLanguages(supportedLangs);
      const pythonLang = supportedLangs.find(lang => lang.id === 'python');
      if (pythonLang) setLanguage(pythonLang);
    };
    if (isOpen) {
      loadLanguages();
    }
  }, [isOpen]);

  const themes = {
    algorithms: [
      { value: 'dynamic_programming', label: t('duels.themeDynamicProgramming') },
      { value: 'graph_theory', label: t('duels.themeGraphTheory') },
      { value: 'string_manipulation', label: t('duels.themeStringManipulation') },
    ],
    sql: [{ value: 'basic_queries', label: t('duels.themeSQL') }],
  };

  useEffect(() => {
    if (category === 'algorithms') setTheme('dynamic_programming');
    else if (category === 'sql') setTheme('basic_queries');
  }, [category, isOpen, t]);

  const handleLanguageChange = (langId: string) => {
    const selectedLang = languages.find(l => l.id === langId);
    if (selectedLang) setLanguage(selectedLang);
  };

  const handleStartDuel = async () => {
    if (!user?.id || !language || !theme || !category) {
      addToast({ type: 'error', title: t('common.error'), message: t('duels.fillAllFields') });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        difficulty,
        category,
        theme,
        language,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('duels.failedToStartDuel'), // Generic error message
        message: error.response?.data?.detail || t('common.tryAgain'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-arena-dark/90 border-arena-border/50 text-white backdrop-blur-xl sm:max-w-2xl p-0 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '2rem 2rem'
        }} />
        
        <div className="relative z-10 p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Swords size={28} className="text-arena-accent" />
              </motion.div>
              {title}
            </DialogTitle>
            <DialogDescription className="text-arena-text-muted">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Difficulty */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-white">{t('duels.difficultyLevel')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DifficultyButton value="easy" label={t('duels.difficultyEasy')} icon={<ThermometerSnowflake />} current={difficulty} onSelect={setDifficulty} />
              <DifficultyButton value="medium" label={t('duels.difficultyMedium')} icon={<Thermometer />} current={difficulty} onSelect={setDifficulty} />
              <DifficultyButton value="hard" label={t('duels.difficultyHard')} icon={<Flame />} current={difficulty} onSelect={setDifficulty} />
              <DifficultyButton value="expert" label={t('duels.difficultyExpert')} icon={<Sparkles />} current={difficulty} onSelect={setDifficulty} disabled />
            </div>
          </div>
          
          {/* Category & Theme */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-white">{t('duels.chooseCategory')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <CategoryButton value="algorithms" label={t('duels.categoryAlgorithms')} icon={<BrainCircuit />} current={category} onSelect={setCategory} />
                <CategoryButton value="sql" label={t('duels.categorySQL')} icon={<Database />} current={category} onSelect={setCategory} />
              </div>
            </div>
            <div className="space-y-4">
              <Label htmlFor="theme" className="text-lg font-semibold text-white">{t('duels.problemTheme')}</Label>
              <Select onValueChange={setTheme} value={theme}>
                  <SelectTrigger id="theme" className="w-full bg-arena-surface border-arena-border focus:ring-arena-accent text-base py-6">
                    <SelectValue placeholder={t('duels.selectThemePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {themes[category].map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-base py-2">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>
          
          {/* Language */}
          <div className="space-y-4">
            <Label htmlFor="language" className="text-lg font-semibold text-white">{t('duels.programmingLanguage')}</Label>
            <Select onValueChange={handleLanguageChange} value={language?.id}>
              <SelectTrigger id="language" className="w-full bg-arena-surface border-arena-border focus:ring-arena-accent text-base py-6">
                <SelectValue placeholder={t('duels.selectLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id} className="text-base py-2">{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-4 pt-8 border-t border-arena-border/50">
            <Button variant="ghost" onClick={onClose} disabled={isLoading} className="text-base px-6 py-3">
              {t('common.cancel')}
            </Button>
            <Button variant="gradient" onClick={handleStartDuel} disabled={isLoading} className="text-base px-8 py-3">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Swords className="mr-2 h-5 w-5" />
              )}
              {t('duels.startDuel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DifficultyButton: React.FC<{ value: Difficulty, label: string, icon: React.ReactNode, current: Difficulty, onSelect: (d: Difficulty) => void, disabled?: boolean }> = 
({ value, label, icon, current, onSelect, disabled }) => {
  const isSelected = value === current;
  const styles = {
    easy: 'border-green-500/50 text-green-400',
    medium: 'border-yellow-500/50 text-yellow-400',
    hard: 'border-red-500/50 text-red-400',
    expert: 'border-purple-500/50 text-purple-400',
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
      {disabled && <span className="text-xs font-bold uppercase">({useTranslation().t('common.comingSoon')})</span>}
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

export default DuelSetupForm; 