import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'glow';
  hover?: 'lift' | 'glow' | 'scale' | 'none';
  padding?: 'default' | 'sm' | 'lg' | 'none';
  animate?: boolean;
}

export function Card({ 
  children, 
  className, 
  variant = 'default',
  hover = 'lift',
  padding = 'default',
  animate = true,
  ...props 
}: CardProps) {
  const variants = {
    default: 'bg-arena-surface border border-arena-border',
    glass: 'glass',
    gradient: 'card-gradient border border-arena-border',
    glow: 'bg-arena-surface border border-arena-accent/20 shadow-arena-glow',
  };

  const hoverEffects = {
    lift: 'hover:-translate-y-1 hover:shadow-xl',
    glow: 'hover:shadow-arena-glow hover:border-arena-accent/40',
    scale: 'hover:scale-[1.02]',
    none: '',
  };

  const paddings = {
    default: 'p-6',
    sm: 'p-4',
    lg: 'p-8',
    none: '',
  };

  const combinedClasses = cn(
    'rounded-xl transition-all duration-300',
    variants[variant],
    hoverEffects[hover],
    paddings[padding],
    className
  );

  if (animate) {
    return (
      <motion.div
        className={combinedClasses}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ children, className, icon, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      <div className="flex items-center gap-3">
        {icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="flex-shrink-0"
          >
            {icon}
          </motion.div>
        )}
        <div className="flex-grow">{children}</div>
      </div>
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

export function CardTitle({ children, className, gradient = false, ...props }: CardTitleProps) {
  return (
    <h3 
      className={cn(
        'text-xl font-bold',
        gradient ? 'gradient-text' : 'text-white',
        className
      )} 
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-arena-text-muted mt-1', className)} {...props}>
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div className={cn('mt-6 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
} 