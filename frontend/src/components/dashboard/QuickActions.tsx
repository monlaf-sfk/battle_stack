import React from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { 
  Zap, 
  Code, 
  Crown, 
  Sword,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { t } = useTranslation();


  const mainActions = [
    {
      id: 'quick-match',
      title: t('dashboard.quickMatch'),
      description: t('dashboard.jumpIntoDuel'),
      icon: <Sword size={24} />,
      variant: 'gradient' as const,
      onClick: () => navigate('/quick-duel'),
    },
    {
      id: 'problems',
      title: t('dashboard.practice'),
      description: t('dashboard.honeSkills'),
      icon: <Code size={24} />,
      variant: 'glass' as const,
      onClick: () => navigate('/problems'),
    },
  ];

  return (
    <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-yellow-400" />
            {t('dashboard.quickActionsTitle')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.quickActionsSubtitle')}
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
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-gray-800/60 group-hover:bg-gray-700/80 transition-colors">
                      {action.icon}
                    </div>
                    <div className="text-left flex-1">
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
                    className="text-gray-500 group-hover:text-white transition-colors flex-shrink-0" 
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
                        {t('dashboard.adminPanel')}
                      </div>
                       <div className="text-sm text-gray-400">
                        {t('dashboard.manageProblemsUsers')}
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
    </Card>
  );
};

export default QuickActions; 