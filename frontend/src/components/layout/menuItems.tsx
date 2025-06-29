import {
  BookOpen,
  BrainCircuit,
  Gamepad2,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  User,
} from "lucide-react";
// Локальное определение типа для избежания проблем с импортом
interface UserPermissions {
  canAccessAdmin: boolean;
  canManageProblems: boolean;
  canManageUsers: boolean;
  canModerate: boolean;
}

interface MenuItem {
  icon: JSX.Element;
  text: string;
  path: string;
  locked?: boolean;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

export const getMenuItems = (permissions?: UserPermissions): MenuSection[] => {
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
        {
          icon: <Target size={20} />,
          text: "Problems",
          path: "/problems",
        },
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
        { icon: <Settings size={20} />, text: "Settings", path: "/settings" },
      ],
    },
  ];

  // Add admin section if user has admin permissions
  if (permissions?.canAccessAdmin) {
    baseItems.push({
      section: "ADMIN",
      items: [
        { icon: <ShieldCheck size={20} />, text: "Admin Panel", path: "/admin" },
      ],
    });
  }



  return baseItems;
};

// For backward compatibility
export const menuItems = getMenuItems(); 