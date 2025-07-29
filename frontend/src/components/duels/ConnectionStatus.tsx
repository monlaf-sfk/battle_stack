import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
  showText?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  className,
  showText = true 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-lg shadow-lg transition-all duration-300",
        isConnected 
          ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-emerald-400" 
          : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30 text-red-400",
        className
      )}
    >
      {/* Status indicator with pulse animation */}
      <div className="relative">
        <motion.div
          className={cn(
            "w-4 h-4 rounded-full flex-shrink-0",
            isConnected ? "bg-emerald-500" : "bg-red-500"
          )}
          animate={isConnected ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Pulse rings for connected state */}
        {isConnected && (
          <>
            <motion.div
              className="absolute inset-0 bg-emerald-400 rounded-full opacity-40"
              animate={{
                scale: [1, 2],
                opacity: [0.4, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 bg-emerald-400 rounded-full opacity-20"
              animate={{
                scale: [1, 2.5],
                opacity: [0.2, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </div>

      {/* Icon */}
      <motion.div
        animate={isConnected ? {} : { rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5, repeat: isConnected ? 0 : Infinity, repeatDelay: 2 }}
      >
        {isConnected ? (
          <Wifi size={20} />
        ) : (
          <WifiOff size={20} />
        )}
      </motion.div>

      {/* Status text */}
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-xs opacity-70 leading-none mt-1">
            {isConnected ? 'Real-time sync active' : 'Attempting to reconnect...'}
          </span>
        </div>
      )}

      {/* Warning icon for disconnected state */}
      {!isConnected && (
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <AlertCircle size={16} className="text-red-400" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default ConnectionStatus;