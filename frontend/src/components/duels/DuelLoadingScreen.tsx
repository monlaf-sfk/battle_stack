import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Swords, User, Bot } from 'lucide-react';

interface DuelLoadingScreenProps {
  statusText: string;
  player1Name?: string;
  player2Name?: string;
  isAiDuel?: boolean;
  generationStatus?: string;
}

const DuelLoadingScreen: React.FC<DuelLoadingScreenProps> = ({ statusText, player1Name = "Player 1", player2Name = "Player 2", isAiDuel = false, generationStatus }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-arena-dark via-arena-surface to-arena-dark flex flex-col items-center justify-center text-white font-mono p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="flex justify-center items-center gap-8 md:gap-16 mb-12">
          {/* Player 1 */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="p-4 bg-blue-500/10 rounded-full border-2 border-blue-500/30">
              <User size={48} className="text-blue-400" />
            </div>
            <span className="font-bold text-lg">{player1Name}</span>
          </motion.div>

          {/* VS */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
            className="flex flex-col items-center gap-2"
          >
            <Swords size={64} className="text-arena-accent" />
            <span className="text-4xl font-black text-white tracking-widest">VS</span>
          </motion.div>

          {/* Player 2 */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className={`p-4 rounded-full border-2 ${isAiDuel ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {isAiDuel ? <Bot size={48} className="text-purple-400" /> : <User size={48} className="text-red-400" />}
            </div>
            <span className="font-bold text-lg">{isAiDuel ? 'AI Opponent' : player2Name}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-4 text-2xl font-semibold mb-4 text-arena-text-muted"
        >
          <div className="flex items-center gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p>{statusText}</p>
          </div>
          {generationStatus && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-arena-accent italic"
            >
              {generationStatus}
            </motion.p>
          )}
        </motion.div>
        <p className="text-sm text-arena-text-dim max-w-md mx-auto">
          {t('duels.loadingHint', 'The battle is about to begin. Prepare your mind, sharpen your code, and may the best algorithm win.')}
        </p>
      </motion.div>
    </div>
  );
};

export default DuelLoadingScreen; 