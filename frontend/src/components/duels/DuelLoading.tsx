import React from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import type { TFunction } from 'i18next';

interface DuelLoadingProps {
  message?: string;
  t: TFunction;
}

export const DuelLoading: React.FC<DuelLoadingProps> = ({ message, t }) => {
  const displayMessage = message || t('duels.loadingDuel');

  return (
    <div className="min-h-screen bg-arena-dark flex items-center justify-center font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Animated Arena Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mx-auto mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-2 border-arena-accent/30 border-t-arena-accent rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Swords className="w-6 h-6 text-arena-accent" />
            </div>
          </div>
        </motion.div>
        
        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-arena-text mb-3 uppercase tracking-wider">
            {t('common.appName').toUpperCase()}
          </h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-arena-text-muted uppercase tracking-wider mb-6"
          >
            {displayMessage}
          </motion.p>

          {/* Progress Indicators */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2 h-2 bg-arena-accent rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Status Messages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-xs text-arena-text-dim uppercase tracking-wider"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {t('duels.initializingArena').toUpperCase()}...
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}; 