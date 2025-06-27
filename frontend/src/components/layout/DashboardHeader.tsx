import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { UserNav } from "./UserNav";
import { useLayout } from "@/contexts/LayoutContext";
import { Button } from "../ui/Button";
import { Menu, X, Bell, Flame, Swords, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard } from "../../hooks/useDashboard";

const navLinks = [
  { name: "Панель", href: "/dashboard" },
  { name: "Задачи", href: "/problems" },
  { name: "Рейтинги", href: "/leaderboards" },
  { name: "Практика", href: "/practice" },
];

const Topbar = () => {
  const { isSidebarOpen, setSidebarOpen } = useLayout();
  const { data } = useDashboard();
  
  return (
    <motion.header 
      className="sticky top-0 z-30 glass-darker border-b border-arena-border backdrop-blur-xl"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-arena-text hover:text-arena-accent hover:bg-arena-accent/10 transition-all duration-200"
          >
            <motion.div
              animate={{ rotate: isSidebarOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
            <span className="sr-only">Переключить боковую панель</span>
          </Button>
        </div>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <NavLink
                to={link.href}
                className={({ isActive }) =>
                  clsx(
                    "relative px-4 py-2 rounded-lg transition-all duration-300 hover:bg-arena-surface/50",
                    isActive
                      ? "text-arena-accent bg-arena-accent/10 shadow-arena-glow"
                      : "text-arena-text hover:text-arena-accent"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-arena-accent rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-arena-text-muted hover:text-arena-accent hover:bg-arena-accent/10 relative"
            >
              <Bell size={20} />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-arena-accent rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="sr-only">Уведомления</span>
            </Button>
          </motion.div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-arena-surface/50 rounded-lg border border-arena-border">
            <Flame size={18} className="text-orange-400" />
            <span className="text-arena-text font-medium">{data.stats?.current_streak || 0}</span>
            <span className="text-arena-text-muted text-sm">стрик</span>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              variant="gradient" 
              className="hidden sm:flex items-center gap-2 shadow-arena-glow"
            >
              <Crown size={16} />
              Премиум
            </Button>
          </motion.div>
          
          <UserNav />
        </div>
      </div>
    </motion.header>
  );
};

export default Topbar; 