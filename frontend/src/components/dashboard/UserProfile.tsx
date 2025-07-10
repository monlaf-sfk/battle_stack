import React from 'react';
import { Shield, User, Crown } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from 'react-i18next';

const UserProfile: React.FC = () => {

    const { user, loading: authLoading } = useAuth();
    const { data, loading: dashboardLoading } = useDashboard();
    const { t } = useTranslation();

    const loading = authLoading || dashboardLoading;

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <Skeleton variant="circular" width={64} height={64} />
                        <div className="flex-1 space-y-2">
                            <Skeleton variant="text" width="70%" height={24} />
                            <Skeleton variant="text" width="50%" height={20} />
                        </div>
                    </div>
                    <Skeleton variant="text" width="90%" height={20} className="mb-2" />
                    <Skeleton variant="rectangular" width="100%" height={8} className="rounded-full" />
                </CardContent>
            </Card>
        );
    }
    
    const totalXP = data?.stats?.tasks_completed ? (data.stats.tasks_completed * 25) : 0;
    const level = Math.floor(totalXP / 200) + 1;
    const xpInCurrentLevel = totalXP % 200;
    const xpPercentage = (xpInCurrentLevel / 200) * 100;
    
    const getRoleInfo = (role: string) => {
        switch(role) {
            case 'admin':
            case 'super_admin':
                return { name: t('profilePage.admin'), icon: <Crown size={14} />, color: 'text-yellow-400' };
            case 'moderator':
                return { name: t('profilePage.moderator'), icon: <Shield size={14} />, color: 'text-blue-400' };
            default:
                return { name: t('profilePage.codeWarrior'), icon: <User size={14} />, color: 'text-green-400' };
        }
    };
    
    const roleInfo = getRoleInfo(user?.role || 'user');

    return (
        <Card 
            className="bg-gray-900 border-2 border-transparent hover:border-gray-700 transition-all duration-300 overflow-hidden"
        >
            <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500" />
            <CardContent className="p-6">
                {/* User Avatar and Info */}
                <div className="flex items-center space-x-4 mb-6">
                    <motion.div 
                        className="relative group"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <div className="relative w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                            {user?.google_picture ? (
                                <img src={user.google_picture} alt={user.username} className="w-full h-full rounded-full object-cover"/>
                            ) : (
                                <User size={32} className="text-gray-400" />
                            )}
                        </div>
                    </motion.div>
                    
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white flex items-center font-mono truncate">
                            {user?.username || t('common.guest')}
                        </h2>
                        <motion.div 
                            className="flex items-center gap-2 mt-1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className={`flex items-center ${roleInfo.color} gap-1`}>
                                {roleInfo.icon}
                                <span className="font-semibold text-sm font-mono">{roleInfo.name}</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Level and XP Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                >
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-semibold text-white flex items-center font-mono text-sm gap-1.5">
                            {t('profilePage.level', { level: level })}
                        </span>
                        <span className="text-gray-400 font-mono text-xs">
                            {xpInCurrentLevel} / 200 {t('profilePage.xp')}
                        </span>
                    </div>
                    <div className="relative">
                        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${xpPercentage}%` }}
                                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, staggerChildren: 0.1 }}
                    className="grid grid-cols-3 gap-4"
                >
                    <StatItem value={data?.stats?.tasks_completed || 0} label={t('dashboard.tasksStat')} highlightColor="text-blue-400" />
                    <StatItem value={totalXP || 0} label={t('dashboard.totalXpStat')} highlightColor="text-yellow-400" />
                    <StatItem value={data?.stats?.hours_coded || 0} label={t('dashboard.hoursStat')} highlightColor="text-green-400" />
                </motion.div>
            </CardContent>
            <CardFooter className="p-4 bg-gray-900/50 border-t border-gray-800">
                 <motion.div 
                    className="text-center w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <Link to="/profile" className="text-gray-400 text-sm font-mono hover:text-white transition-colors">
                        {t('dashboard.viewFullProfileLink')}
                    </Link>
                </motion.div>
            </CardFooter>
        </Card>
    );
};

const StatItem = ({ value, label, highlightColor = 'text-white' }: { value: number, label: string, highlightColor?: string }) => (
    <motion.div
        className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/80"
        variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(31, 41, 55, 0.7)'}}
    >
        <div className={`text-2xl font-bold ${highlightColor} font-mono`}>{value}</div>
        <div className="text-xs text-gray-400 font-mono tracking-wider uppercase">{label}</div>
    </motion.div>
);

export default UserProfile; 