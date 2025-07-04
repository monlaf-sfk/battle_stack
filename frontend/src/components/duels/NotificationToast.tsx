import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from '../../types/duel.types';
import { useTranslation } from 'react-i18next';

interface NotificationToastProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ 
  notifications, 
  onRemove 
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, type: "spring" }}
            className={`max-w-sm p-4 rounded-lg shadow-lg border-2 ${
              notification.type === 'success' 
                ? 'bg-green-900/95 border-green-400 text-green-100' :
              notification.type === 'error'
                ? 'bg-red-900/95 border-red-400 text-red-100' :
                'bg-blue-900/95 border-blue-400 text-blue-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-1">
                {notification.type === 'success' ? '🏆' :
                 notification.type === 'error' ? '😔' : '⚔️'}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">{notification.title}</h4>
                <p className="text-sm opacity-90">{notification.message}</p>
              </div>
              <button
                onClick={() => onRemove(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 