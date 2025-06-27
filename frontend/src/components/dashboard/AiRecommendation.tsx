import React, { useState, useEffect } from 'react';
import { Lightbulb, Brain, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardApi, type AIRecommendation } from '../../services/api';
import { useToast } from '../ui/Toast';
import { SkeletonText } from '../ui/Skeleton';

const AiRecommendation: React.FC = () => {
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    
    const currentRecommendation = recommendations[currentIndex];

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                const response = await dashboardApi.getRecommendations();
                setRecommendations(response.data);
                setCurrentIndex(0);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch recommendations:', err);
                setError('Failed to load recommendations');
                addToast({
                    type: 'error',
                    title: 'Data Loading Error',
                    message: 'Failed to load AI recommendations. Please try again.',
                    duration: 5000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [addToast]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const response = await dashboardApi.getRecommendations();
            setRecommendations(response.data);
            setCurrentIndex((prev) => (prev + 1) % response.data.length);
            
            addToast({
                type: 'info',
                title: 'Recommendations Updated',
                message: 'Fresh AI recommendations loaded!',
                duration: 3000
            });
        } catch (err) {
            console.error('Failed to refresh recommendations:', err);
            // Fallback to cycling through existing recommendations
            setCurrentIndex((prev) => (prev + 1) % recommendations.length);
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 500);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-green-400 bg-green-400/20 border-green-400/30';
            case 'Medium': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
            case 'Hard': return 'text-red-400 bg-red-400/20 border-red-400/30';
            default: return 'text-arena-text-muted';
        }
    };

    if (loading) {
        return (
            <Card variant="glass" hover="glow" className="relative overflow-hidden">
                {/* AI Background Effect */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-arena-secondary rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-arena-tertiary rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                
                <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Brain size={24} className="text-arena-secondary mr-2" />
                            <SkeletonText lines={1} className="w-40" />
                        </div>
                        <div className="w-8 h-8 bg-arena-surface rounded-lg" />
                    </div>
                </CardHeader>
                
                <CardContent className="relative z-10">
                    <div className="space-y-4">
                        <div className="glass-light p-5 rounded-xl border border-arena-border">
                            <SkeletonText lines={3} />
                            <div className="flex items-center gap-3 mt-4">
                                <div className="w-16 h-6 bg-arena-surface rounded-md" />
                                <div className="w-20 h-4 bg-arena-surface rounded" />
                                <div className="w-24 h-4 bg-arena-surface rounded" />
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="flex-1 h-10 bg-arena-surface rounded-lg" />
                            <div className="w-10 h-10 bg-arena-surface rounded-lg" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !recommendations.length) {
        return (
            <Card variant="glass" hover="glow" className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-500/10 opacity-50" />
                
                <CardHeader className="relative z-10">
                    <CardTitle gradient className="flex items-center">
                        <Brain size={24} className="text-arena-secondary mr-2" />
                        AI Recommendations
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="relative z-10 text-center py-8">
                    <Brain size={48} className="mx-auto mb-4 text-arena-text-muted" />
                    <p className="text-arena-text-muted mb-4">
                        {error || 'No recommendations available'}
                    </p>
                    <Button 
                        onClick={() => window.location.reload()}
                        variant="glass"
                    >
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" hover="glow" className="relative overflow-hidden">
            {/* AI Background Effect */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-arena-secondary rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-arena-tertiary rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            
            <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                    <CardTitle gradient className="flex items-center">
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="mr-2"
                        >
                            <Brain size={24} className="text-arena-secondary" />
                        </motion.div>
                        AI Recommendations
                    </CardTitle>
                    <motion.button
                        onClick={handleRefresh}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        animate={isRefreshing ? { rotate: 360 } : {}}
                        transition={{ duration: 0.5 }}
                        className="p-2 rounded-lg glass hover:bg-arena-light/20 transition-colors"
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={18} className="text-arena-text-muted" />
                    </motion.button>
                </div>
            </CardHeader>
            
            <CardContent className="relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        {/* Recommendation Card */}
                        <div className="glass-light p-5 rounded-xl border border-arena-border relative overflow-hidden">
                            {/* Sparkle Effect */}
                            <motion.div
                                className="absolute top-2 right-2"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Sparkles size={20} className="text-arena-accent" />
                            </motion.div>
                            
                            <h4 className="font-semibold text-lg text-white mb-2">
                                {currentRecommendation.title}
                            </h4>
                            
                            <p className="text-arena-text-muted text-sm mb-4 italic">
                                "{currentRecommendation.description}"
                            </p>
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className={`px-2 py-1 rounded-md border ${getDifficultyColor(currentRecommendation.difficulty)}`}>
                                    {currentRecommendation.difficulty}
                                </span>
                                <span className="text-arena-text-dim">⏱ {currentRecommendation.estimated_time}</span>
                                <span className="text-green-400">📈 {currentRecommendation.improvement}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button 
                                variant="gradient" 
                                className="flex-1 group"
                                onClick={() => {
                                    addToast({
                                        type: 'info',
                                        title: 'Problem Started!',
                                        message: `Starting "${currentRecommendation.title}" problem.`,
                                        duration: 3000
                                    });
                                }}
                            >
                                Start Problem
                                <motion.div
                                    className="ml-2 inline-block"
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <ArrowRight size={18} />
                                </motion.div>
                            </Button>
                            <Button 
                                variant="glass" 
                                size="icon"
                                onClick={() => {
                                    addToast({
                                        type: 'info',
                                        title: 'Hint',
                                        message: 'Focus on understanding the problem before coding!',
                                        duration: 4000
                                    });
                                }}
                            >
                                <Lightbulb size={18} />
                            </Button>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex justify-center gap-1 mt-4">
                            {recommendations.map((_, index) => (
                                <motion.button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        index === currentIndex 
                                            ? 'w-8 bg-arena-accent' 
                                            : 'w-2 bg-arena-light hover:bg-arena-accent/60'
                                    }`}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                />
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Additional Info */}
                {recommendations.length > 1 && (
                    <motion.div 
                        className="mt-4 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-xs text-arena-text-dim">
                            {recommendations.length} personalized recommendations available
                        </p>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
};

export default AiRecommendation; 