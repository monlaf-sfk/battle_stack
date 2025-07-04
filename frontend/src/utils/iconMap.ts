import {
    Award,
    Play,
    Puzzle,
    Sword,
    Zap,
    Moon,
    Flame,
    Trophy,
    ShieldCheck,
    Code,
    Gift,
    Megaphone,
} from 'lucide-react';
import React from 'react';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

export const iconMap: Record<string, IconComponent> = {
    award: Award,
    play: Play,
    puzzle: Puzzle,
    sword: Sword,
    zap: Zap,
    moon: Moon,
    flame: Flame,
    trophy: Trophy,
    'shield-check': ShieldCheck,
    code: Code,
    gift: Gift,
    megaphone: Megaphone,
    // Add other icons as needed based on your backend data
};

export function getLucideIcon(iconName: string): IconComponent | null {
    return iconMap[iconName] || null;
} 