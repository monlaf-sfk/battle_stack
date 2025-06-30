import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after duration
    if ((newToast.duration ?? 0) > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 150);
  };

  const variants = {
    success: {
      icon: CheckCircle,
      className: 'border-green-500/20 bg-green-500/10 text-green-400',
      iconColor: 'text-green-400',
    },
    error: {
      icon: AlertCircle,
      className: 'border-red-500/20 bg-red-500/10 text-red-400',
      iconColor: 'text-red-400',
    },
    warning: {
      icon: AlertTriangle,
      className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
      iconColor: 'text-yellow-400',
    },
    info: {
      icon: Info,
      className: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
      iconColor: 'text-blue-400',
    },
  };

  const variant = variants[toast.type];
  const Icon = variant.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: isVisible ? 1 : 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        'glass border rounded-xl p-4 shadow-lg backdrop-blur-xl',
        'transform-gpu will-change-transform',
        variant.className
      )}
    >
      <div className="flex items-start gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Icon size={20} className={variant.iconColor} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <motion.h4
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-semibold text-white text-sm mb-1"
            >
              {toast.title}
            </motion.h4>
          )}
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: toast.title ? 0.3 : 0.2 }}
            className="text-sm text-arena-text-muted"
          >
            {toast.message}
          </motion.p>
          
          {toast.action && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-medium text-arena-accent hover:text-arena-accent-hover transition-colors"
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>
        
        <motion.button
          onClick={handleClose}
          className="text-arena-text-muted hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-arena-accent/60 rounded-b-xl"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
};

// Helper functions for easy toast creation
export const toast = {
  success: (message: string, options?: Partial<Toast>) => ({
    type: 'success' as const,
    message,
    ...options,
  }),
  error: (message: string, options?: Partial<Toast>) => ({
    type: 'error' as const,
    message,
    ...options,
  }),
  warning: (message: string, options?: Partial<Toast>) => ({
    type: 'warning' as const,
    message,
    ...options,
  }),
  info: (message: string, options?: Partial<Toast>) => ({
    type: 'info' as const,
    message,
    ...options,
  }),
}; 