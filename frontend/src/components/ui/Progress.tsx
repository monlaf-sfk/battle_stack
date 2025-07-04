import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
}) => {
  const { t } = useTranslation('common');
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-arena-accent',
    gradient: 'bg-gradient-to-r from-arena-accent to-arena-accent-hover',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-arena-text-muted">{t(label || 'progress.title')}</span>
          <span className="text-arena-text-primary font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-arena-surface rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <motion.div
          className={cn('h-full rounded-full', variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
};

export interface StepProgressProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    completed?: boolean;
    error?: boolean;
  }>;
  currentStep: number;
  className?: string;
  variant?: 'default' | 'compact' | 'vertical';
  showLabels?: boolean;
  animated?: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  className,
  variant = 'default',
  showLabels = true,
  animated = true,
}) => {
  const { t } = useTranslation('common');

  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.completed || index < currentStep;
          const isError = step.error;
          
          return (
            <motion.div
              key={step.id}
              initial={animated ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center',
                    isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : isError
                      ? 'border-red-500 bg-red-500 text-white'
                      : isActive
                      ? 'border-arena-accent bg-arena-accent text-white'
                      : 'border-arena-surface bg-arena-card-bg text-arena-text-muted'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCompleted ? (
                    <Check size={16} />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </motion.div>
                
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-12 bg-arena-surface mt-2" />
                )}
              </div>
              
              {showLabels && (
                <div className="flex-1 pt-2">
                  <h4 className={cn(
                    'font-medium',
                    isActive ? 'text-arena-text-primary' : 'text-arena-text-muted'
                  )}>
                    {t(step.title)}
                  </h4>
                  {step.description && (
                    <p className="text-sm text-arena-text-muted mt-1">
                      {t(step.description)}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.completed || index < currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <motion.div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-arena-accent text-white'
                    : 'bg-arena-surface text-arena-text-muted'
                )}
                whileHover={{ scale: 1.1 }}
                initial={animated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {isCompleted ? <Check size={12} /> : index + 1}
              </motion.div>
              
              {index < steps.length - 1 && (
                <ChevronRight size={16} className="text-arena-text-muted" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.completed || index < currentStep;
          const isError = step.error;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    'w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2',
                    isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : isError
                      ? 'border-red-500 bg-red-500 text-white'
                      : isActive
                      ? 'border-arena-accent bg-arena-accent text-white'
                      : 'border-arena-surface bg-arena-card-bg text-arena-text-muted'
                  )}
                  whileHover={{ scale: 1.05 }}
                  initial={animated ? { scale: 0, rotate: -180 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                >
                  {isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <span className="font-medium">{index + 1}</span>
                  )}
                </motion.div>
                
                {showLabels && (
                  <motion.div
                    className="text-center max-w-24"
                    initial={animated ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <p className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-arena-text-primary' : 'text-arena-text-muted'
                    )}>
                      {t(step.title)}
                    </p>
                    {step.description && (
                      <p className="text-xs text-arena-text-muted mt-1">
                        {t(step.description)}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <motion.div
                  className={cn(
                    'flex-1 h-0.5 mx-4 rounded-full',
                    isCompleted ? 'bg-green-500' : 'bg-arena-surface'
                  )}
                  initial={animated ? { width: 0 } : false}
                  animate={{ width: '100%' }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  className,
  variant = 'default',
  showLabel = true,
  label,
  animated = true,
}) => {
  const { t } = useTranslation('common');
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth / 2);
  const offset = circumference - (value / max) * circumference;

  const variantColors = {
    default: 'stroke-arena-accent',
    gradient: 'stroke-url(#gradient-progress)',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#00ccff" />
          </linearGradient>
        </defs>
        <circle
          className="text-arena-surface"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={size / 2 - strokeWidth / 2}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={cn(variantColors[variant])}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={size / 2 - strokeWidth / 2}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: animated ? offset : circumference - (value / max) * circumference,
          }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      </svg>
      {(showLabel || label) && (
        <div className="absolute flex flex-col items-center">
          <span className="text-arena-text-primary text-xl font-bold">
            {Math.round((value / max) * 100)}%
          </span>
          {label && <span className="text-arena-text-muted text-xs mt-1">{t(label)}</span>}
        </div>
      )}
    </div>
  );
};

export const TaskProgress: React.FC<{
  task: string;
  progress: number;
  total?: number;
  className?: string;
}> = ({ task, progress, total = 100, className }) => {
  const { t } = useTranslation('common');
  const percentage = (progress / total) * 100;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative w-16 h-16">
        <CircularProgress value={progress} max={total} size={64} strokeWidth={6} showLabel={false} />
        <div className="absolute inset-0 flex items-center justify-center text-arena-text-primary text-sm font-semibold">
          {Math.round(percentage)}%
        </div>
      </div>
      <div className="flex-1">
        <p className="text-arena-text-primary font-medium text-lg">{t(task)}</p>
        <p className="text-arena-text-muted text-sm">
          {t('taskProgress.completed', { completed: progress, total: total })}
        </p>
      </div>
    </div>
  );
}; 