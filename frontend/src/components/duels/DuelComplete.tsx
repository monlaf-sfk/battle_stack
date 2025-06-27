import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sword, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Participant } from '../../types/duel.types';

interface DuelCompleteProps {
  isWinner: boolean;
  opponent?: Participant;
}

export const DuelComplete: React.FC<DuelCompleteProps> = ({ isWinner, opponent }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              i % 3 === 0 ? 'bg-cyan-400' : i % 3 === 1 ? 'bg-green-400' : 'bg-purple-400'
            }`}
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: [0, 1, 0] 
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Epic Victory/Defeat Animation */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center z-10"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <Card className="text-center py-16 px-12 bg-gray-900/95 border-2 border-arena-accent max-w-2xl">
          <motion.div 
            className={`text-8xl mb-6 ${isWinner ? 'text-yellow-400' : 'text-red-500'}`}
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 1, type: "spring" }}
          >
            {isWinner ? '👑' : '💀'}
          </motion.div>
          
          <motion.h1 
            className={`text-5xl font-bold mb-6 ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {isWinner ? '🎉 EPIC VICTORY! 🎉' : '💔 HONORABLE DEFEAT 💔'}
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            {isWinner ? 
              '🔥 You conquered the coding challenge! 🔥' : 
              `⚔️ ${opponent?.username || 'Your opponent'} claimed victory this time! ⚔️`
            }
          </motion.p>
          
          <motion.div 
            className="flex justify-center space-x-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="text-lg px-8 py-3"
              variant="secondary"
            >
              <Sword className="w-5 h-5 mr-2" />
              Return to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/quick-duel')} 
              className="text-lg px-8 py-3"
              variant="primary"
            >
              <Code className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          </motion.div>
          
          {isWinner && (
            <motion.div
              className="absolute -top-4 -left-4 text-yellow-400 text-4xl"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ✨
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}; 