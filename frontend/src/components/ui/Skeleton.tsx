import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
  speed?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  animation = 'wave',
  speed = 1.5,
}) => {
  const baseClasses = 'bg-gradient-to-r from-arena-card-bg via-arena-surface to-arena-card-bg bg-[length:200%_100%]';
  
  const variantClasses = {
    text: 'h-4 w-full rounded',
    rectangular: 'w-full h-32 rounded-lg',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const skeletonStyle: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
    animationDuration: `${speed}s`,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              baseClasses,
              variantClasses.text,
              animationClasses[animation]
            )}
            style={{
              ...skeletonStyle,
              width: i === lines - 1 ? '75%' : '100%', // Last line is shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={skeletonStyle}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => (
  <Skeleton variant="text" lines={lines} className={className} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn('space-y-4 p-6 glass border rounded-xl', className)}
  >
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>
    </div>
    <Skeleton variant="rectangular" height={120} />
    <div className="space-y-2">
      <Skeleton variant="text" lines={2} />
      <Skeleton variant="text" width="80%" />
    </div>
  </motion.div>
);

export const SkeletonButton: React.FC<{ className?: string }> = ({ className }) => (
  <Skeleton
    variant="rounded"
    width={120}
    height={40}
    className={className}
  />
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className 
}) => (
  <Skeleton
    variant="circular"
    width={size}
    height={size}
    className={className}
  />
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ 
  rows = 5, 
  columns = 4,
  className 
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn('space-y-3', className)}
  >
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={`header-${i}`} variant="text" height={20} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <motion.div
        key={`row-${rowIndex}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rowIndex * 0.1 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
        ))}
      </motion.div>
    ))}
  </motion.div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn('space-y-4', className)}
  >
    <div className="flex justify-between items-center">
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="rounded" width={80} height={28} />
    </div>
    
    <div className="relative h-64 glass border rounded-xl p-4">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} variant="text" width={24} height={12} />
        ))}
      </div>
      
      {/* Chart bars */}
      <div className="ml-8 h-full flex items-end justify-between px-4">
        {Array.from({ length: 8 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${Math.random() * 80 + 20}%` }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
            className="w-8 bg-gradient-to-t from-arena-accent/20 to-arena-accent/40 rounded-t"
          />
        ))}
      </div>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-8 right-4 flex justify-between pt-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} variant="text" width={20} height={12} />
        ))}
      </div>
    </div>
  </motion.div>
);

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn('space-y-6', className)}
  >
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="text" width={320} height={16} />
      </div>
      <Skeleton variant="rounded" width={120} height={40} />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass border rounded-xl p-6 space-y-4"
        >
          <div className="flex justify-between items-start">
            <Skeleton variant="text" width="70%" height={14} />
            <Skeleton variant="circular" width={32} height={32} />
          </div>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="60%" height={12} />
        </motion.div>
      ))}
    </div>
    
    {/* Chart Section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart />
      <SkeletonCard />
    </div>
  </motion.div>
);

// Loading states for specific components
export const SkeletonLoader: React.FC<{
  type: 'card' | 'text' | 'button' | 'avatar' | 'table' | 'chart' | 'dashboard';
  count?: number;
  className?: string;
  [key: string]: any;
}> = ({ type, count = 1, className, ...props }) => {
  const components = {
    card: SkeletonCard,
    text: SkeletonText,
    button: SkeletonButton,
    avatar: SkeletonAvatar,
    table: SkeletonTable,
    chart: SkeletonChart,
    dashboard: SkeletonDashboard,
  };

  const Component = components[type];

  if (count === 1) {
    return <Component className={className} {...props} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} {...props} />
      ))}
    </div>
  );
}; 