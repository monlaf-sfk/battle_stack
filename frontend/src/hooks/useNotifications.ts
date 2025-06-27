import { useState, useCallback } from 'react';
import type { Notification } from '../types/duel.types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((
    type: 'success' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message, timestamp: id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    showNotification,
    removeNotification
  };
}; 