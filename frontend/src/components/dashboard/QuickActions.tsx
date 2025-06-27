import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { aiDuel, createPrivateRoom, quickDuel } from '../../services/duelService';
import { 
  Zap, 
  Code, 
  Trophy, 
  Users, 
  Bot, 
  Lock,
  Sword,
  Target,
  Crown,
  ChevronRight,
  Key
} from 'lucide-react';
import JoinPrivateRoomModal from '../ui/JoinPrivateRoomModal';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleQuickDuel = async (type: 'random' | 'ai' | 'private') => {
    try {
      setLoadingAction(type);
      
      let response;
      switch (type) {
        case 'random':
          response = await quickDuel('medium');
          addToast({
            type: 'success',
            title: 'Searching for opponent...',
            message: 'Finding a player or creating new match',
            duration: 3000,
          });
          break;
        case 'ai':
          response = await aiDuel('medium');
          addToast({
            type: 'success',
            title: 'AI Duel Created!',
            message: 'Ready to code against AI?',
            duration: 3000,
          });
          break;
        case 'private':
          response = await createPrivateRoom('medium', 'algorithm');
          addToast({
            type: 'success',
            title: 'Private Room Created!',
            message: `Room code: ${response.room_code}`,
            duration: 5000,
          });
          break;
      }
      
      // Navigate to duel page
      if (response?.id) {
        navigate(`/duels/${response.id}`);
      }
    } catch (error: any) {
      console.error(`Failed to start ${type} duel:`, error);
      addToast({
        type: 'error',
        title: 'Duel Creation Failed',
        message: error?.message || 'Unable to start duel. Please try again.',
        duration: 5000,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const actionButtons = [
    {
      id: 'quick-match',
      title: 'Quick Match',
      description: 'Choose opponent & settings',
      icon: <Sword size={20} />,
      variant: 'gradient' as const,
      onClick: () => navigate('/quick-duel'),
      color: 'from-purple-600 to-blue-600'
    },
    {
      id: 'random',
      title: 'Random Player',
      description: 'Fight random opponent',
      icon: <Users size={20} />,
      variant: 'glass' as const,
      onClick: () => handleQuickDuel('random'),
      color: 'from-blue-600 to-cyan-600'
    },
    {
      id: 'ai',
      title: 'AI Battle',
      description: 'Fight AI opponent instantly',
      icon: <Bot size={20} />,
      variant: 'glass' as const,
      onClick: () => handleQuickDuel('ai'),
      color: 'from-green-600 to-teal-600'
    },
    {
      id: 'private',
      title: 'Create Room',
      description: 'Create private room',
      icon: <Lock size={20} />,
      variant: 'ghost' as const,
      onClick: () => handleQuickDuel('private'),
      color: 'from-orange-600 to-red-600'
    },
    {
      id: 'join-room',
      title: 'Join Room',
      description: 'Enter room code',
      icon: <Key size={20} />,
      variant: 'ghost' as const,
      onClick: () => setShowJoinModal(true),
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const navigationActions = [
    {
      title: 'Problems',
      description: 'Practice coding problems',
      icon: <Code size={18} />,
      path: '/problems',
      color: 'text-blue-400'
    },
    {
      title: 'Admin Panel',
      description: 'Manage problems & users',
      icon: <Crown size={18} />,
      path: '/admin',
      color: 'text-yellow-400'
    }
  ];

  return (
    <Card variant="glass" className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap size={20} className="text-arena-accent" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Duel Actions */}
        <div>
          <h4 className="text-sm font-medium text-arena-text-muted mb-3 flex items-center gap-2">
            <Target size={14} />
            Start Dueling
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {actionButtons.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={action.onClick}
                  variant={action.variant}
                  className="w-full justify-between h-auto p-4 group"
                  disabled={loadingAction === action.id && !['quick-match'].includes(action.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-arena-surface/30 group-hover:bg-arena-surface/50 transition-colors">
                      {loadingAction === action.id && !['quick-match'].includes(action.id) ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap size={20} />
                        </motion.div>
                      ) : (
                        action.icon
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">
                        {action.title}
                      </div>
                      <div className="text-xs text-arena-text-muted">
                        {action.description}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight 
                    size={16} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity" 
                  />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Navigation Actions */}
        <div>
          <h4 className="text-sm font-medium text-arena-text-muted mb-3 flex items-center gap-2">
            <Users size={14} />
            Explore
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {navigationActions.map((action, index) => (
              <motion.button
                key={action.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (actionButtons.length + index) * 0.1 }}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between p-3 rounded-lg border border-arena-border hover:border-arena-accent/40 transition-all duration-200 bg-arena-surface/10 hover:bg-arena-surface/20 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-white">
                      {action.title}
                    </div>
                    <div className="text-xs text-arena-text-muted">
                      {action.description}
                    </div>
                  </div>
                </div>
                
                <ChevronRight 
                  size={14} 
                  className="text-arena-text-muted group-hover:text-arena-accent transition-colors opacity-0 group-hover:opacity-100" 
                />
              </motion.button>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Join Private Room Modal */}
      <JoinPrivateRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
    </Card>
  );
};

export default QuickActions; 