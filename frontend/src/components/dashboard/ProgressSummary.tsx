import React, { useState, useEffect } from 'react';
import { TrendingUp, Percent, Swords, Star, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { motion } from 'framer-motion';
import { dashboardApi, type DashboardStats } from '../../services/api';
import { useToast } from '../ui/Toast';
import { SkeletonText } from '../ui/Skeleton';
import { useTranslation } from 'react-i18next';

const MetricCard = ({ icon, label, value, delay, subtext }: { icon: React.ReactNode, label: string, value: string | number, delay: number, subtext?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ scale: 1.05, y: -5 }}
        className="glass p-5 rounded-2xl flex flex-col justify-between items-start group hover:shadow-xl transition-all duration-300 h-full"
    >
        <div className="flex items-center text-arena-accent mb-3">
            {icon}
            <span className="text-white ml-2 text-lg font-semibold">{label}</span>
        </div>
        <div>
            <div className="text-3xl font-bold gradient-text-light group-hover:gradient-text transition-all duration-300">{value}</div>
            {subtext && <div className="text-arena-text-muted text-sm mt-1">{subtext}</div>}
        </div>
    </motion.div>
);


const ProgressSummary: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const { t } = useTranslation();

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                setLoading(true);
                const response = await dashboardApi.getStats();
                setDashboardData(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch dashboard stats:', err);
                setError(t('dashboard.failedToLoadDashboardData'));
                addToast({
                    type: 'error',
                    title: t('dashboard.dataLoadingError'),
                    message: t('dashboard.failedToLoadDashboardData'),
                    duration: 5000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, [addToast, t]);

    if (loading) {
        return (
            <Card variant="glass" hover="glow" className="relative overflow-hidden">
                <CardHeader className="relative z-10">
                    <CardTitle gradient>
                        <TrendingUp size={24} className="inline-block mr-2" />
                        {t('dashboard.briefProgressTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass p-5 rounded-2xl h-32">
                                <SkeletonText lines={3} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !dashboardData) {
        return (
            <Card variant="glass" hover="glow" className="relative overflow-hidden bg-red-900/10">
                <CardHeader className="relative z-10">
                    <CardTitle gradient>
                        <TrendingUp size={24} className="inline-block mr-2" />
                        {t('dashboard.briefProgressTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 text-center py-12">
                    <p className="text-arena-text-muted mb-4">
                        {error || t('dashboard.failedToLoadDashboardData')}
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-arena-accent/20 text-arena-accent hover:bg-arena-accent/30 transition-colors"
                    >
                        {t('common.tryAgain')}
                    </button>
                </CardContent>
            </Card>
        );
    }
    
    const winRate = dashboardData.total_duels > 0 
        ? ((dashboardData.successful_duels / dashboardData.total_duels) * 100).toFixed(1)
        : "0.0";

    return (
        <Card variant="glass" hover="glow" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-arena-secondary/5 to-arena-tertiary/5 opacity-50" />
            
            <CardHeader className="relative z-10">
                <CardTitle gradient>
                    <TrendingUp size={24} className="inline-block mr-2" />
                    {t('dashboard.briefProgressTitle')}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard 
                        icon={<Percent size={20} />} 
                        label={t('leaderboardsPage.winRate')}
                        value={`${winRate}%`}
                        delay={0.1}
                        subtext={`${dashboardData.successful_duels} / ${dashboardData.total_duels} ${t('dashboard.wins')}`}
                    />
                    <MetricCard 
                        icon={<Swords size={20} />} 
                        label={t('dashboard.totalDuels')} 
                        value={dashboardData.total_duels} 
                        delay={0.2}
                    />
                    <MetricCard 
                        icon={<Star size={20} />} 
                        label={t('dashboard.streak')} 
                        value={dashboardData.current_streak}
                        delay={0.3}
                        subtext={t('dashboard.wins')}
                    />
                    <MetricCard 
                        icon={<Award size={20} />} 
                        label={t('leaderboardsPage.elo')} 
                        value={dashboardData.elo_rating}
                        delay={0.4}
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default ProgressSummary; 