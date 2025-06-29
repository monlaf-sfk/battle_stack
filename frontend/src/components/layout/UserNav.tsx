import { LogOut, Settings, User, List, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/Button";

export function UserNav() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="relative" onBlur={handleBlur}>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full border border-green-500/30 hover:border-green-400 transition-all duration-300 bg-black/50 hover:bg-green-500/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 font-mono font-bold">
            U
          </div>
        </Button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg bg-black/90 backdrop-blur-sm border border-green-500/30 py-2 text-white shadow-xl shadow-green-500/10 z-50">
            <a
              href="/login"
              className="block px-3 py-2 text-sm font-mono text-white/70 hover:text-green-300 hover:bg-green-500/10"
              onClick={() => setIsOpen(false)}
            >
              LOG IN
            </a>
            <a
              href="/register"
              className="block px-3 py-2 text-sm font-mono text-white/70 hover:text-green-300 hover:bg-green-500/10"
              onClick={() => setIsOpen(false)}
            >
              SIGN UP
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full border border-green-500/30 hover:border-green-400 transition-all duration-300 bg-black/50 hover:bg-green-500/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 font-mono font-bold border border-green-500/40">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </Button>
      </motion.div>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-black/90 backdrop-blur-sm border border-green-500/30 text-white shadow-xl shadow-green-500/10 z-50 font-mono">
          {/* Header */}
          <div className="px-4 py-3 border-b border-green-500/20">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-bold leading-none text-green-300 tracking-wider">
                {user.username?.toUpperCase() || 'USER'}
              </p>
              <p className="text-xs leading-none text-green-400/70">
                {user.email}
              </p>
              {user.role && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/40 mt-1 w-fit">
                  {user.role.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-green-300 hover:bg-green-500/10 focus:bg-green-500/10 focus:text-green-300 transition-all duration-200 font-mono flex items-center">
              <List className="mr-2 h-4 w-4" />
              <span className="font-bold text-xs tracking-wide">LISTS</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-green-300 hover:bg-green-500/10 focus:bg-green-500/10 focus:text-green-300 transition-all duration-200 font-mono flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span className="font-bold text-xs tracking-wide">STATS</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-green-300 hover:bg-green-500/10 focus:bg-green-500/10 focus:text-green-300 transition-all duration-200 font-mono flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span className="font-bold text-xs tracking-wide">PROFILE</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-green-300 hover:bg-green-500/10 focus:bg-green-500/10 focus:text-green-300 transition-all duration-200 font-mono flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span className="font-bold text-xs tracking-wide">CONFIG</span>
            </button>
          </div>

          {/* Separator & Logout */}
          <div className="border-t border-green-500/20">
            <button 
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 transition-all duration-200 font-mono flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold text-xs tracking-wide">SIGN OUT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
