import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DuelErrorProps {
  message: string;
}

export const DuelError: React.FC<DuelErrorProps> = ({ message }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-arena-dark flex items-center justify-center font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full mx-4"
      >
        <div className="glass rounded-lg p-8 text-center border border-red-500/30 bg-red-500/5">
          {/* Error Icon */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative mx-auto mb-6"
          >
            <div className="w-16 h-16 rounded-full border-2 border-red-500/30 bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </motion.div>
          
          {/* Error Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-red-400 mb-4 uppercase tracking-wider">
              Duel Error
            </h2>
            
            <p className="text-arena-text-muted mb-8 leading-relaxed">
              {message}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-4 justify-center"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all glass border border-arena-border hover:border-arena-accent/50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/quick-duel')}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all bg-gradient-to-r from-arena-accent to-arena-secondary text-arena-dark hover:shadow-arena-glow"
            >
              <Swords className="w-4 h-4" />
              <span>New Duel</span>
            </motion.button>
          </motion.div>

          {/* Additional Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 pt-6 border-t border-arena-border/30"
          >
            <p className="text-xs text-arena-text-dim uppercase tracking-wider">
              If the problem persists, try refreshing or contact support
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}; 