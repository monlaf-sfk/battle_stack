import React, { useState, useEffect } from 'react';
import { Award, Lock, Puzzle, Trophy, Calendar, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { motion } from 'framer-motion';
import { dashboardApi, type Achievement } from '../../services/api';
import { useToast } from '../ui/Toast';
import { SkeletonText } from '../ui/Skeleton';

type AchievementStatus = 'Completed' | 'In Progress' | 'Not Started';

const getIconByName = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
        'award': <Award className="text-yellow-500" />,
        'trophy': <Trophy className="text-yellow-400" />,
        'puzzle': <Puzzle className="text-blue-400" />,
        'user-plus': <CheckCircle className="text-green-400" />,
        'play': <Award className="text-purple-400" />,
        'lock': <Lock className="text-gray-500" />,
        'calendar': <Calendar className="text-cyan-400" />,
    };
    return icons[iconName] || <Award className="text-yellow-500" />;
};

const getStatusChip = (status: AchievementStatus) => {
    switch (status) {
        case 'Completed':
            return <span className="text-xs font-semibold px-2 py-1 bg-green-500/20 text-green-400 rounded-full">{status}</span>;
        case 'In Progress':
            return <span className="text-xs font-semibold px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">{status}</span>;
        case 'Not Started':
            return <span className="text-xs font-semibold px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full">{status}</span>;
    }
}

const Achievements: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                setLoading(true);
                const response = await dashboardApi.getAchievements();
                setAchievements(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch achievements:', err);
                setError('Failed to load achievements');
                addToast({
                    type: 'error',
                    title: 'Data Loading Error',
                    message: 'Failed to load achievements. Please try again.',
                    duration: 5000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [addToast]);

    if (loading) {
        return (
            <Card className="glass p-6 rounded-lg shadow-lg relative overflow-hidden">
                {/* Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-50" />
                
                <div className="relative z-10">
                    <div className="flex items-center mb-4">
                        <Trophy className="mr-2 text-yellow-400" />
                        <SkeletonText lines={1} className="w-48" />
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center p-3 glass-light rounded-md">
                                <div className="w-6 h-6 bg-arena-surface rounded mr-4" />
                                <div className="flex-grow space-y-2">
                                    <SkeletonText lines={2} />
                                </div>
                                <div className="w-16 h-6 bg-arena-surface rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="glass p-6 rounded-lg shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-500/10 opacity-50" />
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <Trophy className="mr-2 text-yellow-400" />
                        Achievements & Rewards
                    </h3>
                    <div className="text-center py-8">
                        <p className="text-arena-text-muted mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-arena-accent hover:text-arena-accent-hover transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="glass p-6 rounded-lg shadow-lg relative overflow-hidden hover-glow">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-50" />
            
            <div className="relative z-10">
                <motion.h3 
                    className="text-xl font-bold mb-4 flex items-center gradient-text"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <Trophy className="mr-2 text-yellow-400" />
                    </motion.div>
                    Achievements & Rewards
                </motion.h3>
                
                <div className="space-y-4">
                    {achievements.map((ach, index) => (
                        <motion.div 
                            key={`${ach.name}-${index}`}
                            className="flex items-center p-3 glass-light rounded-md hover:bg-arena-surface/30 transition-all duration-300 group"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ x: 5, scale: 1.02 }}
                        >
                            <motion.div 
                                className="mr-4"
                                whileHover={{ scale: 1.2, rotate: 10 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                {getIconByName(ach.icon)}
                            </motion.div>
                            
                            <div className="flex-grow">
                                <motion.p 
                                    className="font-semibold text-white group-hover:gradient-text transition-all duration-300"
                                    layoutId={`title-${ach.name}`}
                                >
                                    {ach.name}
                                </motion.p>
                                <motion.p 
                                    className="text-sm text-arena-text-muted"
                                    layoutId={`details-${ach.name}`}
                                >
                                    {ach.details}
                                    {ach.earned_at && ach.status === 'Completed' && (
                                        <span className="text-green-400 ml-2">
                                            • {new Date(ach.earned_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </motion.p>
                            </div>
                            
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                {getStatusChip(ach.status as AchievementStatus)}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
                
                {achievements.length === 0 && (
                    <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Trophy className="mx-auto mb-4 text-arena-text-muted" size={48} />
                        <p className="text-arena-text-muted">No achievements yet</p>
                        <p className="text-sm text-arena-text-dim mt-2">Start solving problems to earn your first achievement!</p>
                    </motion.div>
                )}
            </div>
        </Card>
    );
};

export default Achievements; 