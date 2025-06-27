import React from 'react';
import { Shield, User, Wifi, Star, Trophy, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { motion } from 'framer-motion';

const UserProfile: React.FC = () => {
    const xpPercentage = (150 / 200) * 100;
    const level = 7;
    const rank = 'Gold League';

    return (
        <Card variant="glass" hover="glow" className="relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/10 to-arena-secondary/10 opacity-50" />
            
            <CardContent className="relative z-10">
                {/* User Avatar and Info */}
                <div className="flex items-center space-x-4 mb-6">
                    <motion.div 
                        className="relative group"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-arena-accent to-arena-secondary rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                        <img
                            className="relative w-24 h-24 rounded-full border-2 border-arena-accent/50"
                            src="/default-avatar.png"
                            alt="User Avatar"
                        />
                        <motion.button 
                            className="absolute bottom-0 right-0 bg-gradient-to-r from-arena-accent to-arena-tertiary hover:shadow-lg rounded-full p-1.5 shadow-md"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <User size={16} className="text-arena-dark" />
                        </motion.button>
                    </motion.div>
                    
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            ShadowDev 
                            <motion.span 
                                className="text-arena-text-muted ml-2 text-lg"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                • Lvl {level}
                            </motion.span>
                        </h2>
                        <motion.div 
                            className="flex items-center gap-2 mt-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-lg border border-yellow-500/30">
                                <Shield size={18} className="text-yellow-400 mr-1.5" />
                                <span className="font-semibold text-yellow-400">{rank}</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* XP Progress Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                >
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-semibold text-white flex items-center">
                            <Star size={16} className="text-arena-accent mr-1" />
                            Experience Points
                        </span>
                        <span className="text-arena-text-muted">150 / 200 XP</span>
                    </div>
                    <div className="relative">
                        <div className="w-full bg-arena-light rounded-full h-3 overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-arena-accent to-arena-tertiary rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${xpPercentage}%` }}
                                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                            </motion.div>
                        </div>
                        <motion.div
                            className="absolute -top-8 text-xs text-arena-accent font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ 
                                opacity: 1,
                                left: `${xpPercentage}%`
                            }}
                            transition={{ duration: 1, delay: 0.7 }}
                        >
                            {Math.floor(xpPercentage)}%
                        </motion.div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-3 gap-3 mb-6"
                >
                    <div className="text-center p-3 glass rounded-lg">
                        <Trophy size={20} className="text-arena-accent mx-auto mb-1" />
                        <div className="text-xl font-bold text-white">42</div>
                        <div className="text-xs text-arena-text-muted">Wins</div>
                    </div>
                    <div className="text-center p-3 glass rounded-lg">
                        <Zap size={20} className="text-arena-secondary mx-auto mb-1" />
                        <div className="text-xl font-bold text-white">89%</div>
                        <div className="text-xs text-arena-text-muted">Win Rate</div>
                    </div>
                    <div className="text-center p-3 glass rounded-lg">
                        <Star size={20} className="text-arena-tertiary mx-auto mb-1" />
                        <div className="text-xl font-bold text-white">15</div>
                        <div className="text-xs text-arena-text-muted">Streak</div>
                    </div>
                </motion.div>

                {/* Status */}
                <motion.div 
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <span className="text-sm font-semibold text-arena-text-muted">Status:</span>
                    <motion.div
                        className="flex items-center space-x-2"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span className="flex items-center bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/30">
                            <Wifi size={16} className="mr-1.5" />
                            Online
                        </span>
                    </motion.div>
                </motion.div>
            </CardContent>
        </Card>
    );
};

export default UserProfile; 