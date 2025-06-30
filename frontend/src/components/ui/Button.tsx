import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  loading = false,
  disabled,
  onClick,
  type,
}: ButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples([...ripples, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);

    if (onClick) onClick(e);
  };

  const baseClasses = 'relative font-bold rounded-xl transition-all duration-300 inline-flex items-center justify-center overflow-hidden';
  
  const variants = {
    primary: 'bg-arena-accent text-arena-dark hover:bg-arena-accent-hover hover:shadow-arena-glow transform hover:scale-105',
    secondary: 'bg-arena-secondary text-white hover:bg-arena-secondary-hover hover:shadow-lg',
    ghost: 'bg-transparent hover:bg-arena-light/20 text-arena-text hover:text-white',
    glass: 'glass text-arena-text hover:bg-white/10 hover:shadow-md',
    gradient: 'bg-gradient-to-r from-arena-accent to-arena-tertiary text-arena-dark hover:shadow-arena-glow hover:scale-105 animate-gradient',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-8 py-4 text-lg',
  };

  const isDisabled = disabled || loading;
  const combinedClasses = `${baseClasses} ${variants[variant]} ${sizeClasses[size]} ${
    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
  } ${className || ''}`;

  return (
    <motion.button
      className={combinedClasses}
      onClick={handleClick}
      disabled={isDisabled}
      type={type}
      whileHover={!isDisabled ? { y: -2 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ripple Effects */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
          animate={{ 
            width: 300, 
            height: 300, 
            x: -150, 
            y: -150, 
            opacity: 0 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}

      {/* Loading Spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* Button Content */}
      <span className={`relative z-10 flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {children}
      </span>

      {/* Hover Glow Effect */}
      {(variant === 'primary' || variant === 'gradient') && (
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-arena-accent/20 blur-xl" />
        </div>
      )}
    </motion.button>
  );
} 