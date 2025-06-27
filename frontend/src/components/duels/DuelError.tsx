import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Shield, Sword } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DuelErrorProps {
  error: string;
}

export const DuelError: React.FC<DuelErrorProps> = ({ error }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-900 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md"
      >
        <Card className="p-8 text-center bg-gray-800/90 border-red-500/50">
          <motion.div 
            className="text-red-500 text-6xl mb-4"
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            💀
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4">⚠️ Arena Compromised!</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()} variant="secondary">
              <Shield className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate('/quick-duel')} variant="primary">
              <Sword className="w-4 h-4 mr-2" />
              New Battle
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}; 