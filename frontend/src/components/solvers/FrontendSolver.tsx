import type { Problem } from '../../services/api';
import { useTranslation } from 'react-i18next';

export const FrontendSolver: React.FC<{ problem: Problem }> = () => {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 rounded-lg border border-dashed border-blue-500/30 bg-blue-500/10 text-blue-300">
      <p className="font-semibold">{t('frontendSolver.title')}</p>
      <p className="text-sm">
        {t('frontendSolver.description')}
      </p>
    </div>
  );
}; 