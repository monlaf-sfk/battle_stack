import {
  BookOpen,
  BrainCircuit,
  Gamepad2,
  LayoutDashboard,
  Settings,
  Swords,
  Trophy,
  User,
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

export const getMenuItems = (): MenuSection[] => {
  const baseItems: MenuSection[] = [
    {
      section: "MAIN",
      items: [
        {
          icon: <LayoutDashboard size={20} />,
          text: "Dashboard",
          path: "/dashboard",
        },
        { icon: <Swords size={20} />, text: "Quick Duel", path: "/quick-duel" },
      ],
    },
    {
      section: "COMPETITION",
      items: [
        {
          icon: <Trophy size={20} />,
          text: "Leaderboards",
          path: "/leaderboards",
        },
        {
          icon: <Gamepad2 size={20} />,
          text: "Tournaments",
          path: "/tournaments",
          locked: true,
        },
      ],
    },
    {
      section: "LEARNING",
      items: [
        { icon: <BookOpen size={20} />, text: "Practice", path: "/practice", locked: true },
        { icon: <BrainCircuit size={20} />, text: "AI Tutor", path: "/ai-tutor", locked: true },
      ],
    },
    {
      section: "PERSONAL",
      items: [
        { icon: <User size={20} />, text: "Profile", path: "/profile" },
        { icon: <Settings size={20} />, text: "Settings", path: "/settings", locked: true },
      ],
    },
  ];

  return baseItems;
};

// For backward compatibility
export const menuItems = getMenuItems(); 