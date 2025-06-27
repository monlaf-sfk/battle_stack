import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          <span className="text-arena-text-muted">{label || 'Progress'}</span>
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
                    {step.title}
                  </h4>
                  {step.description && (
                    <p className="text-sm text-arena-text-muted mt-1">
                      {step.description}
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
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-arena-text-muted mt-1">
                        {step.description}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <motion.div
                  className={cn(
                    'flex-1 h-0.5 mx-4 rounded-full',
                    isCompleted || (index < currentStep)
                      ? 'bg-green-500'
                      : 'bg-arena-surface'
                  )}
                  initial={animated ? { scaleX: 0 } : false}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  style={{ transformOrigin: 'left' }}
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
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: '#00ff88',
    gradient: 'url(#gradient)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#00ff88', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={animated ? { duration: 1, ease: 'easeOut' } : { duration: 0 }}
        />
      </svg>
      
      {showLabel && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={animated ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span className="text-xl font-bold text-arena-text-primary">
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className="text-xs text-arena-text-muted mt-1">
              {label}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Animated loading progress for specific tasks
export const TaskProgress: React.FC<{
  task: string;
  progress: number;
  total?: number;
  className?: string;
}> = ({ task, progress, total = 100, className }) => {
  const percentage = (progress / total) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass border rounded-xl p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-arena-text-primary">{task}</h3>
        <span className="text-sm text-arena-text-muted">
          {progress}/{total}
        </span>
      </div>
      
      <div className="space-y-3">
        <Progress value={percentage} animated />
        
        <div className="flex justify-between text-sm text-arena-text-muted">
          <span>In Progress...</span>
          <span>{Math.round(percentage)}% Complete</span>
        </div>
      </div>
      
      <motion.div
        className="mt-4 flex justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Circle size={16} className="text-arena-accent" />
      </motion.div>
    </motion.div>
  );
}; 