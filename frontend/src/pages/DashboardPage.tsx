import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import NewsBanner from '../components/dashboard/NewsBanner';
import ProgressSummary from '../components/dashboard/ProgressSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import LeaderboardMini from '../components/dashboard/LeaderboardMini';
import QuickActions from '../components/dashboard/QuickActions';
import Goals from '../components/dashboard/Goals';
import UserProfile from '../components/dashboard/UserProfile';
import AiRecommendation from '../components/dashboard/AiRecommendation';
import { Card, CardContent } from '../components/ui/Card';

const DashboardPage: React.FC = () => {
  const { loading, error } = useDashboard();

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
        <p className="text-red-400">{error}</p>
      </div>
    );
  }
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="p-4 sm:p-6 lg:p-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <NewsBanner />
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <ProgressSummary />
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants} className="space-y-6">
            <UserProfile />
            <QuickActions />
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <AiRecommendation />
        </motion.div>
        <motion.div variants={itemVariants}>
          <LeaderboardMini />
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <RecentActivity />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Goals />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
