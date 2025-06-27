import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useLayout } from "@/contexts/LayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMenuItems } from "./menuItems.tsx";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = () => {
  const { isSidebarOpen, setSidebarOpen } = useLayout();
  const { permissions } = useAuth();

  const isDesktopCollapsed = !isSidebarOpen;
  const menuItems = getMenuItems(permissions);

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={clsx(
          "fixed top-0 left-0 z-40 h-screen glass-darker border-r border-arena-border backdrop-blur-xl transition-all duration-300 ease-in-out",
          {
            "translate-x-0": isSidebarOpen,
            "-translate-x-full": !isSidebarOpen,
          },
          "sm:translate-x-0",
          {
            "sm:w-64": isSidebarOpen,
            "sm:w-20": !isSidebarOpen,
          }
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <motion.div
            className={clsx(
              "flex h-[60px] items-center border-b border-arena-border relative overflow-hidden",
              {
                "px-6": isSidebarOpen,
                "justify-center px-2 sm:px-4": !isSidebarOpen,
              }
            )}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-arena-gradient-mesh opacity-20" />
            <a href="/" className="flex items-center gap-3 font-semibold relative z-10">
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <img src="/logo.svg" alt="BattleStack Logo" className="h-8 w-8" />
                <div className="absolute inset-0 bg-arena-accent/20 blur-xl" />
              </motion.div>
              <motion.span
                className={clsx("text-lg gradient-text font-bold", {
                  "sr-only": isDesktopCollapsed,
                })}
                initial={{ opacity: 0 }}
                animate={{ opacity: isSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                BattleStack
              </motion.span>
            </a>
          </motion.div>

          {/* Navigation */}
          <nav
            className={clsx("flex-1 overflow-y-auto py-4 text-sm font-medium", {
              "px-4": isSidebarOpen,
              "px-2": !isSidebarOpen,
            })}
          >
            {menuItems.map((section, sectionIndex) => (
              <motion.div 
                key={section.section} 
                className="mb-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
              >
                <h3
                  className={clsx(
                    "mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-arena-text-muted",
                    { "sr-only": !isSidebarOpen }
                  )}
                >
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <motion.li 
                      key={item.text}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                    >
                      <NavLink
                        to={item.path}
                        onClick={() => { if (window.innerWidth < 640) setSidebarOpen(false) }}
                        className={({ isActive }) =>
                          clsx(
                            "flex items-center gap-3 rounded-lg py-3 px-3 transition-all duration-200 relative group",
                            !isDesktopCollapsed
                              ? `${
                                  isActive
                                    ? "bg-arena-accent/10 text-arena-accent shadow-arena-glow border-l-4 border-arena-accent"
                                    : "text-arena-text hover:bg-arena-surface/50 hover:text-arena-accent"
                                }`
                              : `justify-center ${
                                  isActive 
                                    ? "bg-arena-accent/10 text-arena-accent shadow-arena-glow" 
                                    : "text-arena-text hover:bg-arena-surface/50 hover:text-arena-accent"
                                }`
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className={isActive ? "text-arena-accent" : ""}
                            >
                              {item.icon}
                            </motion.div>
                            <span className={clsx({ "sr-only": isDesktopCollapsed })}>
                              {item.text}
                            </span>
                            {isActive && !isDesktopCollapsed && (
                              <motion.div
                                layoutId="activeSidebarIndicator"
                                className="absolute right-3 w-2 h-2 bg-arena-accent rounded-full"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            {!isDesktopCollapsed && (
                              <div className="absolute inset-0 bg-arena-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </nav>

          {/* Footer */}
          <motion.div
            className={clsx("border-t border-arena-border p-4", {
              "text-center": isDesktopCollapsed,
            })}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className={clsx("text-xs text-arena-text-muted", {
              "sr-only": isDesktopCollapsed,
            })}>
              <div className="font-medium text-arena-accent mb-1">BattleStack v1.0</div>
              <div>Coding Battle Platform</div>
            </div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
