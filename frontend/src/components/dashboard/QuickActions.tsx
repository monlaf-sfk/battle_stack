import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    CardDescription 
} from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { createPrivateRoom, quickDuel, createAIDuel } from '../../services/duelService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Zap, 
  Code, 
  Crown, 
  Users, 
  Bot, 
  Lock,
  Sword,
  Key,
  ChevronRight
} from 'lucide-react';
import JoinPrivateRoomModal from '../ui/JoinPrivateRoomModal';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user, permissions } = useAuth();

  const handleQuickDuel = async (type: 'random' | 'ai' | 'private') => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to perform this action.',
      });
      return;
    }

    try {
      setLoadingAction(type);
      
      let response;
      switch (type) {
        case 'random':
          response = await quickDuel('medium');
          break;
        case 'ai':
          response = await createAIDuel({
            user_id: user.id,
            theme: 'algorithms',
            difficulty: 'medium',
            language: 'python'
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
      
      if (response?.id) {
        navigate(`/duels/${response.id}`);
      }
    } catch (error: any) {
      console.error(`Failed to start ${type} duel:`, error);
      addToast({
        type: 'error',
        title: 'Duel Creation Failed',
        message: error?.response?.data?.detail || 'Unable to start duel. Please try again.',
        duration: 5000,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const mainActions = [
    {
      id: 'quick-match',
      title: 'Quick Match',
      description: 'Jump into a duel',
      icon: <Sword size={24} />,
      variant: 'gradient' as const,
      onClick: () => navigate('/quick-duel'),
    },
    {
      id: 'problems',
      title: 'Practice',
      description: 'Hone your skills',
      icon: <Code size={24} />,
      variant: 'glass' as const,
      onClick: () => navigate('/problems'),
    },
    {
      id: 'join-room',
      title: 'Join Room',
      description: 'Enter a private room code',
      icon: <Key size={24} />,
      variant: 'glass' as const,
      onClick: () => setShowJoinModal(true),
    }
  ];

  return (
    <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-yellow-400" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Your command center for duels and practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <div className="space-y-3">
            {mainActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={action.onClick}
                  variant={action.variant}
                  className="w-full justify-between h-auto py-4 px-5 group"
                  disabled={!!loadingAction}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gray-800/60 group-hover:bg-gray-700/80 transition-colors">
                      {action.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base text-white">
                        {action.title}
                      </div>
                      <div className="text-sm text-gray-400">
                        {action.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight 
                    size={20} 
                    className="text-gray-500 group-hover:text-white transition-colors" 
                  />
                </Button>
              </motion.div>
            ))}
          </div>
          
          {permissions.canAccessAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-800">
               <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                    onClick={() => navigate('/admin')}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 group"
                  >
                  <div className="flex items-center gap-4">
                    <Crown className="text-yellow-500" />
                    <div className="text-left">
                      <div className="font-semibold text-base text-white">
                        Admin Panel
                      </div>
                       <div className="text-sm text-gray-400">
                        Manage problems & users
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
        <JoinPrivateRoomModal 
            isOpen={showJoinModal} 
            onClose={() => setShowJoinModal(false)} 
        />
    </Card>
  );
};

export default QuickActions; 