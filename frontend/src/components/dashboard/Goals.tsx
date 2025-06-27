import React from 'react';
import { CheckCircle, Target, Trophy, Zap, Sword, Shield } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';

const GoalItem = ({ text, progress, icon }: { text: string; progress: number; icon: React.ReactNode }) => (
  <motion.div 
    className="space-y-3"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        progress === 100 
          ? 'bg-arena-accent text-arena-dark' 
          : 'bg-arena-surface border border-arena-border text-arena-text-muted'
      }`}>
        {progress === 100 ? (
          <CheckCircle size={14} />
        ) : (
          icon
        )}
      </div>
      <span className="text-arena-text text-sm">{text}</span>
    </div>
    <div className="relative w-full bg-arena-surface rounded-full h-2 overflow-hidden">
      <motion.div 
        className="h-full bg-gradient-to-r from-arena-accent to-arena-secondary rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
      >
        {progress > 0 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </motion.div>
    </div>
    <div className="text-right">
      <span className={`text-xs font-medium ${
        progress === 100 ? 'text-arena-accent' : 'text-arena-text-muted'
      }`}>
        {progress}%
      </span>
    </div>
  </motion.div>
);

const Goals: React.FC = () => {
  const { data } = useDashboard();
  
  // Calculate real progress based on user stats
  const stats = data.stats;
  
  // 🎯 КАСТОМИЗАЦИЯ ЦЕЛЕЙ - легко изменить здесь:
  
  // Daily goals calculated from real data
  const dailyTasksProgress = stats ? Math.min((stats.tasks_completed % 3) * 33.33, 100) : 0;
  const dailyDuelProgress = stats && stats.total_duels > 0 ? 100 : 0;
  const aiMentorProgress = 0; // TODO: Track AI mentor visits
  
  // Weekly goals calculated from real data  
  const weeklyTasksProgress = stats ? Math.min((stats.tasks_completed % 5) * 20, 100) : 0;
  const levelProgress = stats ? Math.min(((stats.tasks_completed * 25) % 1000) / 10, 100) : 0; // Level up every 1000 XP
  
  // 📝 ПРИМЕРЫ КАСТОМИЗАЦИИ:
  // Изменить на 5 задач в день: (stats.tasks_completed % 5) * 20
  // Изменить XP на уровень: каждые 500 XP = ((stats.tasks_completed * 25) % 500) / 5
  // Добавить streak цель: stats.current_streak >= 7 ? 100 : (stats.current_streak / 7) * 100
  
  const dailyGoals = [
    { text: "Решить 3 задачи за 30 минут", progress: Math.round(dailyTasksProgress), icon: <Zap size={14} /> },
    { text: "Завершить 1 дуэль", progress: dailyDuelProgress, icon: <Sword size={14} /> },
    { text: "Посетить ИИ-наставника", progress: aiMentorProgress, icon: <Shield size={14} /> },
    // 🔧 Легко добавить новую цель:
    // { text: "Поддержать streak 3 дня", progress: Math.min(stats.current_streak * 33.33, 100), icon: <Flame size={14} /> }
  ];

  const weeklyGoals = [
    { text: "Решить 5 задач средней сложности", progress: Math.round(weeklyTasksProgress), icon: <Target size={14} /> },
    { text: "Повысить уровень", progress: Math.round(levelProgress), icon: <Trophy size={14} /> },
    // 🔧 Легко добавить новую цель:
    // { text: "Выиграть 3 дуэли", progress: Math.min((stats.successful_duels % 3) * 33.33, 100), icon: <Crown size={14} /> }
  ];

  return (
    <Card variant="glass" hover="glow" className="border-arena-accent/20">
      <CardContent className="p-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <div className="p-2 bg-arena-accent/20 rounded-lg">
              <Target className="text-arena-accent" size={24} />
            </div>
            <span className="gradient-text">Боевые Цели</span>
          </h3>
          
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-arena-accent/20 rounded-full flex items-center justify-center">
                  <Zap className="text-arena-accent" size={16} />
                </div>
                <h4 className="font-semibold text-lg text-arena-text">Ежедневные</h4>
              </div>
              <div className="space-y-4 pl-11">
                <AnimatePresence>
                  {dailyGoals.map((goal, index) => (
                    <motion.div
                      key={goal.text}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <GoalItem 
                        text={goal.text} 
                        progress={goal.progress} 
                        icon={goal.icon}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
            
            <div className="border-t border-arena-border pt-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-arena-secondary/20 rounded-full flex items-center justify-center">
                    <Trophy className="text-arena-secondary" size={16} />
                  </div>
                  <h4 className="font-semibold text-lg text-arena-text">Еженедельные</h4>
                </div>
                <div className="space-y-4 pl-11">
                  <AnimatePresence>
                    {weeklyGoals.map((goal, index) => (
                      <motion.div
                        key={goal.text}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                      >
                        <GoalItem 
                          text={goal.text} 
                          progress={goal.progress} 
                          icon={goal.icon}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default Goals; 