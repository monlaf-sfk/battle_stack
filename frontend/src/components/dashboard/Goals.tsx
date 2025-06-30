import React, { useState, useMemo } from 'react';
import { Target, Trophy, Zap, Plus } from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    CardDescription
} from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Input } from '../ui/Input';

interface Goal {
    id: string;
    text: string;
    target: number;
    current: number;
    type: 'daily' | 'weekly';
    category: 'tasks' | 'duels' | 'streak';
}

const GoalItem: React.FC<{ goal: Goal }> = ({ goal }) => {
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="group"
        >
            <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{goal.text}</p>
                <p className="text-xs text-gray-400">
                    {goal.current} / {goal.target}
                </p>
            </div>
            <Progress value={progress} variant={progress === 100 ? 'success' : 'gradient'} size="sm" />
        </motion.div>
    );
};

const AddGoalModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void,
    onAdd: (goal: Omit<Goal, 'id' | 'current'>) => void 
}> = ({ isOpen, onClose, onAdd }) => {
    const [text, setText] = useState('');
    const [target, setTarget] = useState(1);
    const [type] = useState<'daily' | 'weekly'>('daily');
    const [category] = useState<'tasks' | 'duels' | 'streak'>('tasks');

    const handleAdd = () => {
        if (text && target > 0) {
            onAdd({ text, target, type, category });
            onClose();
            setText('');
            setTarget(1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4"
            >
                <h3 className="text-lg font-semibold text-white">Добавить новую цель</h3>
                <Input
                    placeholder="Описание цели (например, 'Выиграть 5 дуэлей')"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <Input
                    type="number"
                    placeholder="Целевое значение"
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                    min="1"
                />
                <div className="flex gap-4">
                    <Button onClick={handleAdd} variant="primary">Добавить</Button>
                    <Button onClick={onClose} variant="ghost">Отмена</Button>
                </div>
            </motion.div>
        </div>
    );
};


const Goals: React.FC = () => {
  const { data } = useDashboard();
  const [isModalOpen, setModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  const stats = data.stats;

  const handleAddGoal = (newGoal: Omit<Goal, 'id' | 'current'>) => {
      const id = `custom-${Date.now()}`;
      setGoals(prev => [...prev, { ...newGoal, id, current: 0 }]);
  };
  
  const staticGoals: Goal[] = useMemo(() => {
    if (!stats) return [];
    return [
      { id: 'daily-tasks', text: 'Решить 3 задачи', target: 3, current: stats.tasks_completed, type: 'daily', category: 'tasks'},
      { id: 'weekly-duels', text: 'Выиграть 5 дуэлей', target: 5, current: stats.successful_duels, type: 'weekly', category: 'duels'},
      { id: 'weekly-streak', text: 'Поддержать стрик 7 дней', target: 7, current: stats.current_streak, type: 'weekly', category: 'streak'}
    ];
  }, [stats]);

  const allGoals = [...staticGoals, ...goals];
  const dailyGoals = allGoals.filter(g => g.type === 'daily');
  const weeklyGoals = allGoals.filter(g => g.type === 'weekly');

  return (
    <Card variant="glass">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                    <Target className="text-green-400" />
                    Боевые Цели
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                    <Plus size={16} className="mr-1" />
                    Добавить
                </Button>
            </div>
            <CardDescription>
                Отслеживайте ваши ежедневные и еженедельные задачи.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        Ежедневные
                    </h4>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {dailyGoals.map(goal => (
                                <GoalItem key={goal.id} goal={goal} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Trophy size={16} className="text-purple-400" />
                        Еженедельные
                    </h4>
                    <div className="space-y-4">
                         <AnimatePresence>
                            {weeklyGoals.map(goal => (
                                <GoalItem key={goal.id} goal={goal} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </CardContent>
        <AddGoalModal 
            isOpen={isModalOpen} 
            onClose={() => setModalOpen(false)}
            onAdd={handleAddGoal}
        />
    </Card>
  );
};

export default Goals; 