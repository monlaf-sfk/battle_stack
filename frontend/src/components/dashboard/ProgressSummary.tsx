import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BookOpen, Zap, Award, Flame, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { motion } from 'framer-motion';
import { dashboardApi, type DashboardStats } from '../../services/api';
import { useToast } from '../ui/Toast';
import { SkeletonChart, SkeletonText } from '../ui/Skeleton';
import { useTranslation } from 'react-i18next';

const MetricCard = ({ icon, label, value, delay }: { icon: React.ReactNode, label: string, value: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay }}
        whileHover={{ scale: 1.05, y: -2 }}
        className="glass p-4 rounded-xl flex items-center group hover:shadow-lg transition-all duration-300"
    >
        <motion.div 
            className="mr-4 text-arena-accent"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: delay * 2 }}
        >
            {icon}
        </motion.div>
        <div>
            <div className="text-arena-text-muted text-sm">{label}</div>
            <div className="text-white font-bold text-lg group-hover:gradient-text transition-all duration-300">{value}</div>
        </div>
    </motion.div>
);

const CustomTooltip = ({ active, payload }: any) => {
    const { t } = useTranslation();
    if (active && payload && payload.length) {
        return (
            <div className="glass p-3 rounded-lg shadow-lg border border-arena-border">
                <p className="text-white font-semibold">{payload[0].name}</p>
                <p className="text-arena-accent">{t('dashboard.percentComplete', { percent: payload[0].value })}</p>
            </div>
        );
    }
    return null;
};

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

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central"
                className="text-sm font-semibold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (loading) {
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
                    {/* Loading skeleton for metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass p-4 rounded-xl">
                                <SkeletonText lines={2} />
                            </div>
                        ))}
                    </div>
                    {/* Loading skeleton for chart */}
                    <SkeletonChart />
                </CardContent>
            </Card>
        );
    }

    if (error || !dashboardData) {
        return (
            <Card variant="glass" hover="glow" className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-500/10 opacity-50" />
                <CardHeader className="relative z-10">
                    <CardTitle gradient>
                        <TrendingUp size={24} className="inline-block mr-2" />
                        {t('dashboard.briefProgressTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 text-center py-8">
                    <p className="text-arena-text-muted mb-4">
                        {error || t('dashboard.failedToLoadDashboardData')}
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-arena-accent hover:text-arena-accent-hover transition-colors"
                    >
                        {t('common.tryAgain')}
                    </button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" hover="glow" className="relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-arena-secondary/5 to-arena-tertiary/5 opacity-50" />
            
            <CardHeader className="relative z-10">
                <CardTitle gradient>
                    <TrendingUp size={24} className="inline-block mr-2" />
                    {t('dashboard.briefProgressTitle')}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <MetricCard 
                        icon={<BookOpen size={24} />} 
                        label={t('dashboard.tasksCompleted')} 
                        value={dashboardData.tasks_completed.toString()} 
                        delay={0.1}
                    />
                    <MetricCard 
                        icon={<Flame size={24} />} 
                        label={t('dashboard.currentStreak')} 
                        value={`🔥 ${dashboardData.current_streak} ${t('dashboard.days')}`} 
                        delay={0.2}
                    />
                    <MetricCard 
                        icon={<Zap size={24} />} 
                        label={t('dashboard.successfulDuels')} 
                        value={`${dashboardData.successful_duels}/${dashboardData.total_duels}`} 
                        delay={0.3}
                    />
                    <MetricCard 
                        icon={<Award size={24} />} 
                        label={t('dashboard.tournamentsWon')} 
                        value={dashboardData.tournaments_won.toString()} 
                        delay={0.4}
                    />
                </div>

                {/* Chart Container */}
                <motion.div 
                    style={{ width: '100%', height: 300 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <ResponsiveContainer>
                        <PieChart>
                            <defs>
                                {dashboardData.progress_data.map((entry, index) => (
                                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`}>
                                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.3}/>
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={dashboardData.progress_data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={90}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                animationBegin={0}
                                animationDuration={800}
                                label={renderCustomizedLabel}
                            >
                                {dashboardData.progress_data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={`url(#gradient-${index})`}
                                        stroke={entry.color}
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Legend */}
                <motion.div 
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    {dashboardData.progress_data.map((item) => (
                        <motion.div 
                            key={item.name}
                            className="flex items-center space-x-2"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-arena-text-muted">
                                {t(`dashboard.${item.name.toLowerCase().replace(/ /g, '')}`)}
                            </span>
                        </motion.div>
                    ))}
                </motion.div>
            </CardContent>
        </Card>
    );
};

export default ProgressSummary; 