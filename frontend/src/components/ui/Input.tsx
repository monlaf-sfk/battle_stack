import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'glass';
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    label, 
    error, 
    success, 
    hint, 
    icon, 
    variant = 'default', 
    showPasswordToggle = false,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTouched, setIsTouched] = useState(false);
    const hasValue = props.value || props.defaultValue;
    const isPasswordType = type === 'password';
    const { t } = useTranslation('common');

    // Handle auto-fill detection
    useEffect(() => {
      const timer = setTimeout(() => {
        if (hasValue && !isTouched) {
          setIsTouched(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [hasValue, isTouched]);

    // Translate label, error, success, and hint messages
    const translatedLabel = label ? t(label) : label;
    const translatedError = error ? t(error) : error;
    const translatedSuccess = success ? t(success) : success;
    const translatedHint = hint ? t(hint) : hint;

    const getStatusColor = () => {
      if (translatedError) return 'border-red-500 focus:ring-red-500';
      if (translatedSuccess) return 'border-green-500 focus:ring-green-500';
      if (translatedError || translatedSuccess) return 'border-arena-accent focus:ring-arena-accent';
      return isFocused ? 'border-arena-accent focus:ring-arena-accent' : 'border-arena-border';
    };

    const getLabelColor = () => {
      if (translatedError) return 'text-red-400';
      if (translatedSuccess) return 'text-green-400';
      if (isFocused) return 'text-arena-accent';
      return 'text-arena-text-muted';
    };

    return (
      <div className="relative w-full">
        {/* Floating Label */}
        {label && (
          <motion.label
            className={cn(
              'absolute transition-all duration-300 pointer-events-none select-none text-smooth',
              'z-10 font-medium',
              getLabelColor(),
              isFocused || hasValue
                ? 'top-0 -translate-y-1/2 text-xs px-2 bg-arena-dark/90 rounded backdrop-blur-sm'
                : 'top-1/2 -translate-y-1/2 text-base',
              icon ? 'left-10' : 'left-3'
            )}
            animate={{
              scale: isFocused || hasValue ? 0.9 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {translatedLabel}
          </motion.label>
        )}
        
        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <motion.div 
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 w-5 h-5 flex items-center justify-center",
                translatedError ? 'text-red-400' : translatedSuccess ? 'text-green-400' : 'text-arena-text-muted'
              )}
              animate={{ scale: isFocused ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
          
          {/* Input Field */}
          <input
            ref={ref}
            type={isPasswordType && showPassword ? 'text' : type}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full py-3 rounded-md border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-arena-accent',
              'placeholder:text-arena-text-muted',
              variant === 'glass' 
                ? 'bg-arena-surface/50 border-arena-border backdrop-blur-sm' 
                : 'bg-arena-surface border-arena-border',
              getStatusColor(),
              icon ? 'pl-11 pr-4' : 'px-4',
              className
            )}
            {...props}
          />

          {/* Password Toggle */}
          {(isPasswordType || showPasswordToggle) && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-text-muted hover:text-white transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              tabIndex={-1}
              title={showPassword ? t('input.hidePassword') : t('input.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </motion.button>
          )}

          {/* Status Icons */}
          {(translatedError || translatedSuccess) && (
            <motion.div
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                (isPasswordType || showPasswordToggle) && 'right-10'
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {translatedError && <AlertCircle size={18} className="text-red-400" />}
              {translatedSuccess && !translatedError && <CheckCircle size={18} className="text-green-400" />}
            </motion.div>
          )}
        </div>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {(translatedError || translatedSuccess || translatedHint) && (
            <motion.div
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 space-y-1"
            >
              {translatedError && (
                <motion.p
                  className="text-sm text-red-400 flex items-center gap-1"
                  initial={{ x: -10 }}
                  animate={{ x: 0 }}
                >
                  <AlertCircle size={14} />
                  {translatedError}
                </motion.p>
              )}
              {translatedSuccess && !translatedError && (
                <motion.p
                  className="text-sm text-green-400 flex items-center gap-1"
                  initial={{ x: -10 }}
                  animate={{ x: 0 }}
                >
                  <CheckCircle size={14} />
                  {translatedSuccess}
                </motion.p>
              )}
              {translatedHint && !translatedError && !translatedSuccess && (
                <motion.p
                  className="text-xs text-arena-text-dim"
                  initial={{ x: -10 }}
                  animate={{ x: 0 }}
                >
                  {translatedHint}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus Ring Enhancement */}
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-arena-accent/30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 