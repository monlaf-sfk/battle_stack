import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import ProgressSummary from '../components/dashboard/ProgressSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import LeaderboardMini from '../components/dashboard/LeaderboardMini';
import QuickActions from '../components/dashboard/QuickActions';
import Goals from '../components/dashboard/Goals';
import UserProfile from '../components/dashboard/UserProfile';
import { Card, CardContent } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';

const DashboardPage: React.FC = () => {
  const { loading, error } = useDashboard();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center">
        <p className="text-red-400">{t('common.error')}: {error}</p>
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
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="p-4 sm:p-6 lg:p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <ProgressSummary />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <RecentActivity />
          </motion.div>
        </div>
        
        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div variants={itemVariants}>
            <UserProfile />
          </motion.div>
          <motion.div variants={itemVariants}>
            <QuickActions />
          </motion.div>
          <motion.div variants={itemVariants}>
            <LeaderboardMini />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Goals />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
