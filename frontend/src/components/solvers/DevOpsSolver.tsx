import type { Problem } from '../../services/api';
import { useTranslation } from 'react-i18next';

export const DevOpsSolver: React.FC<{ problem: Problem }> = () => {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 rounded-lg border border-dashed border-gray-500/30 bg-gray-500/10 text-gray-300">
      <p className="font-semibold">{t('devopsSolver.title')}</p>
      <p className="text-sm">
        {t('devopsSolver.description')}
      </p>
    </div>
  );
}; 