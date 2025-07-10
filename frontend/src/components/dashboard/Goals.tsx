import React, { useMemo } from 'react';
import { Target, Trophy, Zap, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { motion } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { Progress } from '../ui/Progress';

interface Goal {
    id: string;
    text: string;
    target: number;
    current: number;
    icon: React.ReactNode;
}

const GoalItem: React.FC<{ goal: Goal; delay: number }> = ({ goal, delay }) => {
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    const isCompleted = progress === 100;
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            className="group"
        >
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-300'}`}>
                    {goal.icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white">{goal.text}</p>
                        <p className={`text-xs font-bold ${isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                            {goal.current} / {goal.target}
                        </p>
                    </div>
                    <Progress value={progress} variant={isCompleted ? 'success' : 'gradient'} size="sm" />
                </div>
            </div>
        </motion.div>
    );
};

const Goals: React.FC = () => {
  const { data } = useDashboard();
  
  const stats = data?.stats;

  const goals: Goal[] = useMemo(() => {
    if (!stats) return [];
    return [
      { id: 'daily-tasks', text: "Решить 3 задачи сегодня", target: 3, current: stats.tasks_completed, icon: <Zap size={16} /> },
      { id: 'weekly-duels', text: "Выиграть 10 дуэлей на этой неделе", target: 10, current: stats.successful_duels, icon: <Trophy size={16} /> },
      { id: 'weekly-streak', text: "Поддерживать серию из 5 побед", target: 5, current: stats.current_streak, icon: <Shield size={16} /> }
    ];
  }, [stats]);

  return (
    <Card variant="glass">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                    <Target className="text-green-400" />
                    <span>Боевые цели</span>
                </CardTitle>
            </div>
            <CardDescription>
                Отслеживайте свой прогресс в ежедневных и еженедельных задачах.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                {goals.map((goal, index) => (
                    <GoalItem key={goal.id} goal={goal} delay={index * 0.1} />
                ))}
            </div>
        </CardContent>
    </Card>
  );
};

export default Goals; 