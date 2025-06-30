import { useLayout } from "@/contexts/LayoutContext";
import { Button } from "../ui/Button";
import { Menu, X, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { UserNav } from "./UserNav";

const DashboardHeader = () => {
  const { isSidebarOpen, setSidebarOpen } = useLayout();
  
  return (
    <motion.header 
      className="sticky top-0 z-30 bg-black border-b border-gray-800"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side - Sidebar toggle */}
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-gray-300 hover:bg-gray-800 transition-all duration-200 w-10 h-10 rounded-full"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            <motion.div
              animate={{ rotate: isSidebarOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.div>
            <span className="sr-only">Переключить навигацию</span>
          </Button>
          
          {/* Simple title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:block"
          >
            <h1 className="text-xl font-bold text-white font-mono tracking-wider">
              BATTLESTACK
            </h1>
          </motion.div>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="sm"
              variant="ghost" 
              className="text-white hover:text-gray-300 hover:bg-gray-800 relative w-10 h-10 rounded-full"
            >
              <Bell size={18} />
              <motion.div
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="sr-only">Уведомления</span>
            </Button>
          </motion.div>
          
          {/* User Navigation */}
          <UserNav />
        </div>
      </div>
    </motion.header>
  );
};

export default DashboardHeader; 