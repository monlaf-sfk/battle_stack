import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AntiCopyBlurOverlayProps {
  isBlurred: boolean;
  duration?: number; // in seconds
  onTimeoutComplete?: () => void;
  message?: string; // Add message prop to replace hardcoded message in TetrisDuelArena.tsx
  t: any; // Changed TFunction to any
}

export const AntiCopyBlurOverlay: React.FC<AntiCopyBlurOverlayProps> = ({
  isBlurred,
  duration = 30,
  onTimeoutComplete,
  message,
  t
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isBlurred) {
      setIsVisible(true);
      setTimeLeft(duration);
      
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsVisible(false);
            onTimeoutComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setIsVisible(false);
    }
  }, [isBlurred, duration, onTimeoutComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600 bg-opacity-90 backdrop-blur-lg">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            🛡️ {t('duels.suspiciousActivityTitle')}
          </h2>
          <p className="text-gray-700 mb-4">
            {message || t('duels.suspiciousActivityMessage')}
          </p>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {timeLeft}
          </div>
          <div className="text-sm text-red-500">
            {t('duels.secondsUntilUnlock', { count: timeLeft })}
          </div>
          <div className="w-full bg-red-200 rounded-full h-2 mt-3">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / duration) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>{t('duels.antiCopyProtectionActive')}</p>
          <p>{t('duels.doNotBypassProtection')}</p>
          <p>{t('duels.fairPlayIsFoundation')}</p>
        </div>
      </div>
    </div>
  );
};

// Hook for using anti-copy protection
export const useAntiCopyProtection = () => {
  const [isBlurred, setIsBlurred] = useState(false);
  const { t } = useTranslation();

  const triggerBlur = () => {
    setIsBlurred(true);
    console.log(t('duels.antiCopyProtectionTriggered'));
  };

  const clearBlur = () => {
    setIsBlurred(false);
    console.log(t('duels.antiCopyProtectionCleared'));
  };

  return {
    isBlurred,
    triggerBlur,
    clearBlur
  };
}; 