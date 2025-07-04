import React from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { TFunction } from 'i18next';

interface DuelLoadingProps {
  message?: string;
  t: TFunction;
}

export const DuelLoading: React.FC<DuelLoadingProps> = ({
  message,
  t
}) => {
  const displayMessage = message || t('duel.loadingDuel');

  return (
// ... existing code ...
  );
} 