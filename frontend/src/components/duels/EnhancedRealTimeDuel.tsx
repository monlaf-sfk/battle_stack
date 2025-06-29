import React from 'react';
import { TetrisDuelArena } from './TetrisDuelArena';
import type { Duel } from '../../types/duel.types';

interface EnhancedRealTimeDuelProps {
  duel: Duel;
}

export const EnhancedRealTimeDuel: React.FC<EnhancedRealTimeDuelProps> = ({ duel }) => {
  return <TetrisDuelArena duel={duel} />;
}; 