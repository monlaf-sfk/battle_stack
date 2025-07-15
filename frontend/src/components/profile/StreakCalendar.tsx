import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, getYear, startOfYear, endOfYear, eachDayOfInterval, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number; // Number of activities for the day
}

interface StreakCalendarProps {
  currentStreak: number;
  dailyActivities?: DailyActivity[];
  onYearChange: (year: number) => void;
  isLoading: boolean;
}

const getHeatmapColor = (count: number): string => {
  if (count === 0) return 'bg-gray-800';
  if (count <= 2) return 'bg-green-600/30';
  if (count <= 5) return 'bg-green-600/60';
  if (count <= 10) return 'bg-green-600/80';
  return 'bg-green-600';
};

export const StreakCalendar: React.FC<StreakCalendarProps> = ({ currentStreak, dailyActivities, onYearChange, isLoading }) => {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const calendarDays = useMemo(() => {
    const year = selectedYear;
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 11, 31));
    return eachDayOfInterval({ start, end });
  }, [selectedYear]);

  const activitiesMap = useMemo(() => {
    const map = new Map<string, number>();
    (dailyActivities || []).forEach(activity => {
      map.set(activity.date, activity.count);
    });
    return map;
  }, [dailyActivities]);
  
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    onYearChange(year);
  };
  
  const monthLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 12; i++) {
      labels.push(format(new Date(selectedYear, i, 1), 'MMM'));
    }
    return labels;
  }, [selectedYear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.1, duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-16"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-wider">{t('profilePage.codingActivity')}</h2>
        <div className="flex items-center gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      <TooltipProvider>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 relative overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            </div>
          )}
          <div className="flex justify-between text-gray-400 text-xs mb-3 px-1" style={{ paddingLeft: '30px' }}>
            {monthLabels.map((month, i) => (
              <span key={i} className="flex-1 text-center min-w-0">
                {month}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}>
            {calendarDays.map((date, index) => {
              const dateString = format(date, 'yyyy-MM-dd');
              const count = activitiesMap.get(dateString) || 0;
              const isToday = isSameDay(date, new Date());
              const tooltipContent = count > 0 
                ? `${count} ${t('profilePage.battles')} on ${format(date, 'MMM dd, yyyy')}`
                : `No battles on ${format(date, 'MMM dd, yyyy')}`;

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className={`w-4 h-4 rounded-sm transition-all duration-200 cursor-pointer 
                                ${getHeatmapColor(count)} ${isToday ? 'border border-white' : ''}
                      `}
                      whileHover={{ scale: 1.2, zIndex: 1, position: 'relative' }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.002, duration: 0.2 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
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
      </TooltipProvider>
      <div className="text-center mt-6 text-gray-400 text-sm font-mono">
        {t('profilePage.currentStreak')}: <span className="text-green-400 font-bold">{currentStreak} {t('profilePage.days')}</span>
      </div>
    </motion.div>
  );
}; 