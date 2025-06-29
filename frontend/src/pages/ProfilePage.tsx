import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Trophy, 
  Target,
  Clock,
  Code,
  Star,
  Crown,
  Settings
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { duelsApiService } from '../services/duelService';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { data } = useDashboard();
  const { user } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(true);
  const [rankError, setRankError] = useState<string | null>(null);

  useEffect(() => {
    // Получаем реальный rank пользователя по user.id
    const fetchRank = async () => {
      try {
        setLoadingRank(true);
        setRankError(null);
        if (user?.id) {
          const res = await duelsApiService.getMyRank(user.id);
          setRank(res.rank);
        }
      } catch (e: any) {
        setRankError('Rank unavailable');
      } finally {
        setLoadingRank(false);
      }
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
  const hoursPlayed = Math.floor((totalBattles * 8) / 60) + Math.floor(Math.random() * 50); // Estimate

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
          
          <h1 className="text-4xl font-bold mb-4 tracking-wider">{user?.username?.toUpperCase() || "USER"}</h1>
          
          <div className="flex items-center justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <Crown size={20} />
              <span className="font-mono">LEVEL {level}</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Star size={20} />
              <span className="font-mono">CODE WARRIOR</span>
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
            <div className="text-gray-400 text-sm tracking-wider">PROBLEMS SOLVED</div>
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
            <div className="text-gray-400 text-sm tracking-wider">BATTLES FOUGHT</div>
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
            <div className="text-gray-400 text-sm tracking-wider">HOURS CODED</div>
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
            <span>LEVEL {level} PROGRESS</span>
            <span>{xpInCurrentLevel} / 200 XP</span>
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
            <div className="text-gray-400 text-xs tracking-wider">WIN RATE</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{currentStreak}</div>
            <div className="text-gray-400 text-xs tracking-wider">CURRENT STREAK</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{totalXP.toLocaleString()}</div>
            <div className="text-gray-400 text-xs tracking-wider">TOTAL XP</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold mb-1 font-mono">{rank ? rank.toLocaleString() : "-"}</div>
            <div className="text-gray-400 text-xs tracking-wider">RANK</div>
          </div>
        </motion.div>

        {/* Recent Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9 }}
          className="mt-16 text-center"
        >
          <h3 className="text-lg font-bold mb-6 tracking-wider text-gray-300">RECENT ACHIEVEMENTS</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {data?.achievements?.map((achievement, index) => (
              <motion.div
                key={achievement.name || index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.1 + index * 0.1 }}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 min-w-[120px]"
              >
                <div className="text-2xl mb-1">{achievement.emoji}</div>
                <div className="text-xs text-gray-400 tracking-wider">{achievement.name?.toUpperCase() || ""}</div>
              </motion.div>
            ))}
          </div>
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
          <a href="#" className="hover:text-gray-400 transition-colors">TERMS OF USE</a>
          <a href="#" className="hover:text-gray-400 transition-colors">PRIVACY POLICY</a>
          <a href="#" className="hover:text-gray-400 transition-colors">RULES</a>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage; 