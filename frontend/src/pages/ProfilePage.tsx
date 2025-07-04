import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Star,
  Crown,
  Settings
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { StreakCalendar } from '../components/profile/StreakCalendar';
import { getLucideIcon } from '../utils/iconMap';

const ProfilePage: React.FC = () => {
  const { data } = useDashboard();
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    // Получаем реальный rank пользователя по user.id
    const fetchRank = async () => {
      // try {
      //   if (user?.id) {
      //     const res = await duelsApiService.getMyRank(user.id);
      //     setRank(res.rank);
      //   }
      // } catch (e: any) {
      //   // rankError is not used, so we can ignore it
      // }
    };
    fetchRank();
  }, [user?.id]);

  // Calculate derived stats
  const totalXP = data?.stats ? (data.stats.tasks_completed * 25) : 0;
  const level = Math.floor(totalXP / 200) + 1;
  const xpInCurrentLevel = totalXP % 200;
  const xpPercentage = (xpInCurrentLevel / 200) * 100;
  
  const winRate = data?.stats && data.stats.total_duels > 0 
    ? Math.round((data.stats.successful_duels / data.stats.total_duels) * 100)
    : 0;

  const totalProblems = data?.stats?.tasks_completed || 0;
  const totalBattles = data?.stats?.total_duels || 0;
  const currentStreak = data?.stats?.current_streak || 0;
  const hoursPlayed = data?.stats?.hours_coded || 0;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-16"
        >
          <div className="relative inline-block mb-8">
            <motion.div 
              className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-4 mx-auto border border-gray-700"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <User size={48} className="text-gray-400" />
            </motion.div>
            <motion.button 
              className="absolute bottom-2 right-2 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={16} />
            </motion.button>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 tracking-wider">{user?.username?.toUpperCase() || t('common.user')}</h1>
          
          <div className="flex items-center justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <Crown size={20} />
              <span className="font-mono">{t('profilePage.level')} {level}</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Star size={20} />
              <span className="font-mono">{t('profilePage.codeWarrior')}</span>
            </div>
          </div>
        </motion.div>

        {/* Statistics Grid - TETR.IO Style */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16 text-center"
        >
          <div>
            <motion.div 
              className="text-5xl md:text-6xl font-bold mb-2 font-mono"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              {totalProblems.toLocaleString()}
            </motion.div>
            <div className="text-gray-400 text-sm tracking-wider">{t('profilePage.problemsSolved')}</div>
          </div>
          
          <div>
            <motion.div 
              className="text-5xl md:text-6xl font-bold mb-2 font-mono"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
            >
              {totalBattles.toLocaleString()}
            </motion.div>
            <div className="text-gray-400 text-sm tracking-wider">{t('profilePage.battlesFought')}</div>
          </div>
          
          <div>
            <motion.div 
              className="text-5xl md:text-6xl font-bold mb-2 font-mono"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.1, type: "spring" }}
            >
              {hoursPlayed.toLocaleString()}
            </motion.div>
            <div className="text-gray-400 text-sm tracking-wider">{t('profilePage.hoursCoded')}</div>
          </div>
        </motion.div>

        {/* XP Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="w-full max-w-md mb-12"
        >
          <div className="flex justify-between items-center mb-3 text-sm text-gray-400">
            <span>{t('profilePage.level')} {level} {t('profilePage.progress')}</span>
            <span>{xpInCurrentLevel} / 200 {t('profilePage.xp')}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <motion.div 
              className="bg-white rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercentage}%` }}
              transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{winRate}%</div>
            <div className="text-gray-400 text-xs tracking-wider">{t('profilePage.winRate')}</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{currentStreak}</div>
            <div className="text-gray-400 text-xs tracking-wider">{t('profilePage.currentStreak')}</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{totalXP.toLocaleString()}</div>
            <div className="text-gray-400 text-xs tracking-wider">{t('profilePage.totalXP')}</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{data?.userRank !== null ? `#${data.userRank}` : "-"}</div>
            <div className="text-gray-400 text-xs tracking-wider">{t('profilePage.rank')}</div>
          </div>
        </motion.div>

        {/* Streak Calendar */}
        <StreakCalendar currentStreak={currentStreak} />

        {/* Recent Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold mb-6 tracking-wider">{t('profilePage.recentAchievements')}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {data?.achievements?.slice(0, 5).map((ach, index) => {
              const IconComponent = getLucideIcon(ach.icon);
              return (
                <motion.div 
                  key={index}
                  className="bg-gray-800 rounded-lg p-4 w-56 text-left border border-gray-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 + index * 0.1 }}
                >
                  <div className="flex items-center mb-3">
                    {IconComponent && <IconComponent size={32} className="text-purple-400 mr-3" />}
                    <h3 className="text-lg font-bold text-white">{ach.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{ach.details}</p>
                  <span className="text-xs text-gray-500">{t('profilePage.earnedOn')} {new Date(ach.earned_at || '').toLocaleDateString()}</span>
                </motion.div>
              );
            })}
          </div>
          {data?.achievements && data.achievements.length > 5 && (
            <motion.button
              className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('profilePage.showAllAchievements')}
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="text-center py-8 text-gray-600 text-xs tracking-wider"
      >
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:text-gray-400 transition-colors">{t('common.termsOfUse')}</a>
          <a href="#" className="hover:text-gray-400 transition-colors">{t('common.privacyPolicy')}</a>
          <a href="#" className="hover:text-gray-400 transition-colors">{t('common.rules')}</a>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage; 