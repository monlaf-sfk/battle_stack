import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, subDays, isSameDay } from 'date-fns';

interface DailyActivity { // This interface will be replaced with actual backend data later
  date: string; // YYYY-MM-DD
  count: number; // Number of activities for the day
}

interface StreakCalendarProps {
  currentStreak: number;
  dailyActivities?: DailyActivity[]; // Optional, for future use with real data
}

const getHeatmapColor = (count: number): string => {
  if (count === 0) return 'bg-gray-800';
  if (count < 3) return 'bg-green-600/30';
  if (count < 7) return 'bg-green-600/60';
  if (count < 15) return 'bg-green-600/80';
  return 'bg-green-600';
};

export const StreakCalendar: React.FC<StreakCalendarProps> = ({ currentStreak, dailyActivities }) => {
  const { t } = useTranslation();

  // Generate the last 365 days
  const today = new Date();
  const last365Days: Date[] = Array.from({ length: 365 }).map((_, i) => subDays(today, 364 - i));

  // Mock daily activities for now. This will be replaced by actual data from backend.
  const mockDailyActivities: DailyActivity[] = last365Days.map(date => {
    const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const count = Math.random() < 0.7 && !isWeekend ? Math.floor(Math.random() * 20) : 0;
    return { date: format(date, 'yyyy-MM-dd'), count };
  });

  // Use provided dailyActivities or mock data
  const activities = dailyActivities || mockDailyActivities;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.1, duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-16"
    >
      <h2 className="text-2xl font-bold mb-6 tracking-wider text-center">{t('profilePage.codingActivity')}</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 relative overflow-hidden">
        <div className="flex justify-between text-gray-400 text-xs mb-3 px-1">
          {[...Array(12)].map((_, i) => (
            <span key={i} className="min-w-[40px] text-left">
              {format(new Date(today.getFullYear(), today.getMonth() - (11 - i), 1), 'MMM')}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 auto-cols-max"
             style={{ gridAutoColumns: 'minmax(0, 1fr)' }}>
          {last365Days.map((date, index) => {
            const activity = activities.find(a => isSameDay(new Date(a.date), date));
            const count = activity ? activity.count : 0;
            const isToday = isSameDay(date, today);
            return (
              <motion.div
                key={index}
                className={`w-4 h-4 rounded-sm transition-all duration-200 cursor-pointer 
                          ${getHeatmapColor(count)} ${isToday ? 'border border-white' : ''}
                `}
                data-tooltip-id="activity-tooltip"
                data-tooltip-content={`${format(date, 'MMM dd, yyyy')}: ${count} ${t('profilePage.activities')}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.003, duration: 0.2 }}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-gray-400 text-xs mt-4">
          <span>{t('profilePage.less')}</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-800"></div>
            <div className="w-4 h-4 rounded-sm bg-green-600/30"></div>
            <div className="w-4 h-4 rounded-sm bg-green-600/60"></div>
            <div className="w-4 h-4 rounded-sm bg-green-600/80"></div>
            <div className="w-4 h-4 rounded-sm bg-green-600"></div>
          </div>
          <span>{t('profilePage.more')}</span>
        </div>
      </div>
      <div className="text-center mt-6 text-gray-400 text-sm font-mono">
        {t('profilePage.currentStreak')}: <span className="text-green-400 font-bold">{currentStreak} {t('profilePage.days')}</span>
      </div>
    </motion.div>
  );
}; 