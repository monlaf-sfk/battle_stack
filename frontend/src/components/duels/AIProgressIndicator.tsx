import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, Brain, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIProgressIndicatorProps {
  progress: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

const AIProgressIndicator: React.FC<AIProgressIndicatorProps> = ({ 
  progress, 
  className,
  size = 'md',
  showPercentage = true
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const getProgressColor = () => {
    if (progress < 25) return 'from-red-500 to-orange-500';
    if (progress < 50) return 'from-orange-500 to-yellow-500';
    if (progress < 75) return 'from-yellow-500 to-blue-500';
    return 'from-blue-500 to-purple-500';
  };

  const getStatusText = () => {
    if (progress < 20) return 'Analyzing problem...';
    if (progress < 40) return 'Planning solution...';
    if (progress < 60) return 'Writing code...';
    if (progress < 80) return 'Testing solution...';
    if (progress < 95) return 'Optimizing...';
    return 'Finalizing...';
  };

  const getStatusIcon = () => {
    if (progress < 25) return <Brain size={iconSizes[size]} className="text-purple-400" />;
    if (progress < 50) return <Zap size={iconSizes[size]} className="text-yellow-400" />;
    if (progress < 75) return <Code2 size={iconSizes[size]} className="text-blue-400" />;
    return <Bot size={iconSizes[size]} className="text-purple-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-lg shadow-lg",
        sizeClasses[size],
        className
      )}
    >
      {/* AI Icon with animation */}
      <div className="relative">
        <motion.div
          className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/30"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bot size={iconSizes[size]} className="text-purple-400" />
        </motion.div>
        
        {/* Pulse effect */}
        <motion.div
          className="absolute inset-0 bg-purple-400/20 rounded-lg"
          animate={{
            scale: [1, 1.3],
            opacity: [0.3, 0],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Progress content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {getStatusIcon()}
            </motion.div>
            <span className="text-sm font-semibold text-purple-400">
              AI Progress
            </span>
          </div>
          
          {showPercentage && (
            <motion.span 
              className="text-xs font-mono font-bold text-arena-text-muted"
              key={progress}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {Math.round(progress)}%
            </motion.span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="w-full h-2.5 bg-arena-border/30 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className={cn(
                "h-full bg-gradient-to-r relative overflow-hidden",
                getProgressColor()
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ width: '50%' }}
              />
            </motion.div>
          </div>
        </div>

        {/* Status text */}
        <motion.p 
          className="text-xs text-arena-text-muted mt-1 truncate"
          key={getStatusText()}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {getStatusText()}
        </motion.p>
      </div>

      {/* Thinking animation dots */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-purple-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default AIProgressIndicator;