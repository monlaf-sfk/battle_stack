import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check } from 'lucide-react';

interface CodeSaveIndicatorProps {
  code: string;
  duelId: string;
  userId: string;
}

const CodeSaveIndicator: React.FC<CodeSaveIndicatorProps> = ({ code, duelId, userId }) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!code || !duelId || !userId) return;

    setSaveStatus('saving');
    
    const saveTimeout = setTimeout(() => {
      setSaveStatus('saved');
      setLastSaveTime(new Date());
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [code, duelId, userId]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-arena-text-muted">
      <AnimatePresence mode="wait">
        {saveStatus === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <Save size={12} className="animate-pulse text-yellow-400" />
            <span>Saving...</span>
          </motion.div>
        )}
        
        {saveStatus === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <Check size={12} className="text-green-400" />
            <span>Saved</span>
          </motion.div>
        )}
        
        {saveStatus === 'idle' && lastSaveTime && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Last saved: {formatTime(lastSaveTime)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeSaveIndicator;