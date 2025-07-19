import React, { useState, useEffect } from 'react';
import { Megaphone, Trophy, Zap, X, ChevronRight, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonText } from '../ui/Skeleton';
import { useDashboard } from '../../hooks/useDashboard';
import { useTranslation } from 'react-i18next';

const iconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy size={28} className="text-white" />,
    zap: <Zap size={28} className="text-white" />,
    gift: <Gift size={28} className="text-white" />,
};

const NewsBanner: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const { data, loading } = useDashboard();
    const newsItems = data?.newsItems || [];
    const { t } = useTranslation();
    
    useEffect(() => {
        if (newsItems && newsItems.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % newsItems.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [newsItems]);

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'tournament':
                return 'from-purple-600 to-pink-600';
            case 'event':
                return 'from-arena-accent to-arena-tertiary';
            case 'update':
                return 'from-arena-secondary to-blue-600';
            default:
                return 'from-gray-600 to-gray-700';
        }
    };

    if (loading) return <div className="mb-8"><SkeletonText lines={1} /></div>;
    if (!newsItems || newsItems.length === 0 || !isVisible) return null;

    const currentNews = newsItems[currentIndex];
    
    // This check is important in case of faulty data or if the index is out of bounds briefly
    if (!currentNews) return null; 

    const IconNode = iconMap[currentNews.icon] || <Megaphone size={28} className="text-white" />;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden"
            >
                {/* Main Banner */}
                <div className={`relative glass rounded-2xl p-1`}>
                    <div className={`relative bg-gradient-to-r ${getTypeStyles(currentNews.type)} rounded-xl p-4 overflow-hidden`}>
                        {/* Animated Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent 10px,
                                        rgba(255,255,255,0.1) 10px,
                                        rgba(255,255,255,0.1) 20px
                                    )`
                                }}
                                animate={{ x: [0, 28] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center flex-1">
                                {/* Animated Icon */}
                                <motion.div
                                    className="mr-4 p-3 bg-white/20 rounded-xl backdrop-blur-sm"
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    {IconNode}
                                </motion.div>

                                {/* Content */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1"
                                    >
                                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                            {currentNews.title}
                                            <motion.span
                                                className="text-xs px-2 py-0.5 bg-white/20 rounded-full"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                {t('common.new')}
                                            </motion.span>
                                        </h4>
                                        <p className="text-white/90 text-sm mt-1">
                                            {currentNews.description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>

                                {/* CTA Button */}
                                <motion.button
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all ml-4"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="text-white font-medium text-sm">{t('common.readMore')}</span>
                                    <ChevronRight size={16} className="text-white" />
                                </motion.button>
                            </div>

                            {/* Close Button */}
                            <motion.button
                                onClick={() => setIsVisible(false)}
                                className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X size={20} className="text-white" />
                            </motion.button>
                        </div>

                        {/* Progress Dots */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {newsItems.map((_, index) => (
                                <motion.div
                                    key={index}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        index === currentIndex 
                                            ? 'w-6 bg-white' 
                                            : 'w-1 bg-white/40'
                                    }`}
                                    whileHover={{ scale: 1.5 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NewsBanner; 