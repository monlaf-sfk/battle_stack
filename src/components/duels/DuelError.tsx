import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TFunction } from 'i18next';

interface DuelErrorProps {
  message: string;
  t: TFunction;
}

export const DuelError: React.FC<DuelErrorProps> = ({
  message,
  t
}) => {
  const navigate = useNavigate();
  
  return (
// ... existing code ...
  );
} 