import React from 'react';
import { motion } from 'framer-motion';
import ProgressSummary from '../components/dashboard/ProgressSummary';
import AiRecommendation from '../components/dashboard/AiRecommendation';
import Achievements from '../components/dashboard/Achievements';
import Goals from '../components/dashboard/Goals';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import LeaderboardMini from '../components/dashboard/LeaderboardMini';
import { useDashboard } from '../hooks/useDashboard';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import { 
  RefreshCw, 
  AlertCircle, 
  Activity, 
  TrendingUp, 
  Award, 
  Target,
  Zap,
  Code,
  Clock,
  Users,
  Star,
  Trophy
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const DashboardPage: React.FC = () => {
  const { data, loading, error, refetch } = useDashboard();

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-arena-dark">
        {/* Background mesh effect */}
        <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto p-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
                <Activity size={36} className="text-arena-accent" />
                Dashboard
              </h1>
              <p className="text-arena-text-muted mt-2">Loading your coding arena...</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="text-arena-accent" size={24} />
              </motion.div>
              <span className="text-arena-text-muted font-medium">Loading...</span>
            </div>
          </motion.div>
          
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  // Show error state if data failed to load
  if (error) {
    return (
      <div className="min-h-screen bg-arena-dark">
        {/* Background mesh effect */}
        <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto p-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
                <Activity size={36} className="text-arena-accent" />
                Dashboard
              </h1>
              <p className="text-arena-text-muted mt-2">Welcome back to your coding arena</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="glass" className="border-red-500/20 shadow-lg">
              <CardContent className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                <p className="text-arena-text-muted mb-6 max-w-md mx-auto">{error}</p>
                <Button 
                  onClick={refetch}
                  variant="gradient"
                  className="shadow-arena-glow"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Reconnect to Arena
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-arena-dark">
      {/* Background mesh effect */}
      <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
      
      <motion.div
        className="relative max-w-7xl mx-auto p-6 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
              <Activity size={36} className="text-arena-accent" />
              Dashboard
            </h1>
            <p className="text-arena-text-muted mt-2">
              Your coding arena - track progress, compete, and dominate
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.div
              className="text-sm text-arena-text-muted bg-arena-surface/50 px-4 py-2 rounded-lg border border-arena-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-arena-accent rounded-full animate-pulse"></div>
                Last sync: {new Date().toLocaleTimeString()}
              </div>
            </motion.div>
            <Button 
              onClick={refetch}
              variant="glass"
              className="border border-arena-border hover:border-arena-accent/40"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats Overview */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="glass" hover="glow" className="border-arena-accent/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-arena-text-muted text-sm font-medium">Total XP</p>
                    <p className="text-2xl font-bold text-arena-accent">
                      {data.stats ? (data.stats.tasks_completed * 25) : 0}
                    </p>
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <TrendingUp size={12} />
                      Earned from solving problems
                    </p>
                  </div>
                  <div className="p-3 bg-arena-accent/10 rounded-lg">
                    <Star className="w-6 h-6 text-arena-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-arena-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-arena-text-muted text-sm font-medium">Problems Solved</p>
                    <p className="text-2xl font-bold text-arena-secondary">
                      {data.stats?.tasks_completed || 0}
                    </p>
                    <p className="text-xs text-arena-text-muted flex items-center gap-1 mt-1">
                      <TrendingUp size={12} />
                      Keep solving to increase!
                    </p>
                  </div>
                  <div className="p-3 bg-arena-secondary/10 rounded-lg">
                    <Code className="w-6 h-6 text-arena-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-arena-tertiary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-arena-text-muted text-sm font-medium">Win Rate</p>
                    <p className="text-2xl font-bold text-arena-tertiary">
                      {data.stats && data.stats.total_duels > 0 
                        ? `${Math.round((data.stats.successful_duels / data.stats.total_duels) * 100)}%`
                        : "N/A"
                      }
                    </p>
                    <p className="text-xs text-arena-text-muted flex items-center gap-1 mt-1">
                      <Trophy size={12} />
                      Start dueling to rank!
                    </p>
                  </div>
                  <div className="p-3 bg-arena-tertiary/10 rounded-lg">
                    <Target className="w-6 h-6 text-arena-tertiary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-yellow-400/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-arena-text-muted text-sm font-medium">Current Streak</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {data.stats?.current_streak || 0}
                    </p>
                    <p className="text-xs text-arena-text-muted flex items-center gap-1 mt-1">
                      <Zap size={12} />
                      {(data.stats?.current_streak || 0) > 0 ? "Keep it up!" : "Start your streak!"}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-400/10 rounded-lg">
                    <Users className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Summary */}
            <motion.div variants={itemVariants}>
              <ProgressSummary />
            </motion.div>

            {/* Performance Chart */}
            <motion.div variants={itemVariants}>
              <PerformanceChart />
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
              <RecentActivity />
            </motion.div>
          </div>

          {/* Right Column - Sidebar Content */}
          <div className="space-y-8">
            {/* AI Recommendations */}
            <motion.div variants={itemVariants}>
              <AiRecommendation />
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <QuickActions />
            </motion.div>

            {/* Goals */}
            <motion.div variants={itemVariants}>
              <Goals />
            </motion.div>

            {/* Mini Leaderboard */}
            <motion.div variants={itemVariants}>
              <LeaderboardMini />
            </motion.div>
          </div>
        </div>

        {/* Bottom Section - Achievements */}
        <motion.div variants={itemVariants}>
          <Achievements />
        </motion.div>

        {/* Success Message for Real Data */}
        {data.stats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1, type: "spring" }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card variant="glass" className="border-arena-accent/30 shadow-arena-glow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-arena-accent">
                  <motion.div
                    className="w-3 h-3 bg-arena-accent rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium">Arena Data Synchronized</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardPage;
