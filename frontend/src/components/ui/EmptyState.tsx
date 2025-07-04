import { Button } from './Button';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'gradient' | 'primary' | 'secondary' | 'ghost' | 'glass';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'gradient' | 'primary' | 'secondary' | 'ghost' | 'glass';
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction
}) => {
  const { t } = useTranslation('common');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 bg-arena-surface rounded-full flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-arena-text mb-2">{t(title)}</h3>
      <p className="text-arena-text-muted mb-6 max-w-md mx-auto">
        {t(description)}
      </p>
      {(action || secondaryAction) && (
        <div className="flex gap-3 justify-center">
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || 'gradient'}
            >
              {t(action.label)}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'ghost'}
            >
              {t(secondaryAction.label)}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}; 