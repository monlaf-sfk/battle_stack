import {
  BookOpen,
  BrainCircuit,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Trophy,
  User,
  Swords,
} from "lucide-react";
// Локальное определение типа для избежания проблем с импортом
interface MenuItem {
  icon: React.JSX.Element;
  text: string;
  path: string;
  locked?: boolean;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

export const getMenuItems = (t: any): MenuSection[] => {
  const baseItems: MenuSection[] = [
    {
      section: t('sidebar.mainSection'),
      items: [
        {
          icon: <LayoutDashboard size={20} />,
          text: t('sidebar.dashboard'),
          path: "/dashboard",
        },
        // { icon: <Swords size={20} />, text: t('sidebar.quickDuel'), path: "/quick-duel" },
        // { icon: <Swords size={20} />, text: t('sidebar.pveDuel'), path: "/pve-duel", locked: true }, // Add if PvE was a separate menu item
      ],
    },
    {
      section: t('sidebar.competitionSection'),
      items: [
        {
          icon: <Swords size={20} />,
          text: t('sidebar.duels'),
          path: "/duels",
        },
        {
          icon: <Trophy size={20} />,
          text: t('sidebar.leaderboards'),
          path: "/leaderboards",
        },
        {
          icon: <Gamepad2 size={20} />,
          text: t('sidebar.tournaments'),
          path: "/tournaments",
          locked: true,
        },
      ],
    },
    {
      section: t('sidebar.learningSection'),
      items: [
        { icon: <BookOpen size={20} />, text: t('sidebar.practice'), path: "/practice", locked: true },
        { icon: <BrainCircuit size={20} />, text: t('sidebar.aiTutor'), path: "/ai-tutor", locked: true },
      ],
    },
    {
      section: t('sidebar.personalSection'),
      items: [
        { icon: <User size={20} />, text: t('sidebar.profile'), path: "/profile" },
        { icon: <Settings size={20} />, text: t('sidebar.settings'), path: "/settings", locked: true },
      ],
    },
  ];

  return baseItems;
};

// For backward compatibility
export const menuItems = getMenuItems(() => ""); 