import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useLayout } from "@/contexts/LayoutContext";
import { getMenuItems } from "./menuItems.tsx";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "../../hooks/useDashboard";
import { Flame, Zap, Crown, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
  const { isSidebarOpen, setSidebarOpen } = useLayout();
  const { data } = useDashboard();
  const { t } = useTranslation();

  const isDesktopCollapsed = !isSidebarOpen;
  const menuItems = getMenuItems(t);

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
          "fixed top-0 left-0 z-40 h-screen bg-gray-950 border-r border-gray-800 transition-all duration-300 ease-in-out",
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
              "flex h-[64px] items-center border-b border-gray-800",
              {
                "px-6": isSidebarOpen,
                "justify-center px-2 sm:px-4": !isSidebarOpen,
              }
            )}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <NavLink to="/" className="flex items-center gap-3 font-semibold">
              <motion.div
                className="w-10 h-10 bg-white rounded-lg flex items-center justify-center relative overflow-hidden"
                animate={{ 
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  scale: { duration: 2, repeat: Infinity }
                }}
              >
                {/* BattleStack Logo adapted for TETR.IO style */}
                                 <svg 
                   width="24" 
                   height="24" 
                   viewBox="0 0 1024 1024" 
                   fill="none" 
                   className="text-black"
                 >
                   <g clipPath="url(#clip0_10_2)">
                     <path d="M512 0L1024 256V768L512 1024L0 768V256L512 0Z" fill="currentColor"/>
                     <path d="M512 448L768 320V640L512 768V448Z" fill="currentColor"/>
                     <path d="M512 448L256 320V640L512 768V448Z" fill="#1a1a1a"/>
                     <path d="M512 0L256 128V320L512 448L768 320V128L512 0Z" fill="#ffffff"/>
                     <path d="M512 0L256 128V320L512 448V0Z" fill="#e5e5e5"/>
                   </g>
                   <defs>
                     <clipPath id="clip0_10_2">
                       <rect width="1024" height="1024" fill="white"/>
                     </clipPath>
                   </defs>
                 </svg>
              </motion.div>
              <motion.span
                className={clsx("text-lg text-white font-mono font-bold tracking-wider", {
                  "sr-only": isDesktopCollapsed,
                })}
                initial={{ opacity: 0 }}
                animate={{ opacity: isSidebarOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {t('sidebar.title')}
              </motion.span>
            </NavLink>
          </motion.div>

          {/* Stats Section - показываем только когда сайдбар открыт */}
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 border-b border-gray-800"
            >
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame size={16} className="text-orange-400" />
                    <span className="text-white font-mono text-sm font-bold">
                      {data?.stats?.current_streak || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">{t('sidebar.streak')}</div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap size={16} className="text-yellow-400" />
                    <span className="text-white font-mono text-sm font-bold">
                      {data?.stats ? (data.stats.tasks_completed * 25) : 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">{t('sidebar.xp')}</div>
                </div>
              </div>
              
              {/* Rank Badge */}
              <div className="mt-3 bg-gray-900 rounded-lg p-2 border border-gray-800">
                <div className="flex items-center justify-center gap-2">
                  <Crown size={16} className="text-white" />
                  <span className="text-white font-mono text-sm font-bold">
                    {t('sidebar.rank')} #{data?.userRank !== null ? data.userRank : t('common.notApplicable')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <nav
            className={clsx("flex-1 overflow-y-auto py-4 text-sm font-mono", {
              "px-4": isSidebarOpen,
              "px-2": !isSidebarOpen,
            })}
          >
            {menuItems.map((section, sectionIndex) => (
              <motion.div 
                key={section.section} 
                className="mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
              >
                <h3
                  className={clsx(
                    "mb-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-400",
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
                      {item.locked ? (
                        <div
                          className={clsx(
                            "flex items-center gap-3 rounded-lg py-3 px-3 transition-all duration-200 relative group font-mono text-sm cursor-not-allowed opacity-60",
                            { "justify-center": isDesktopCollapsed }
                          )}
                          title={t('common.comingSoon')}
                        >
                          {item.icon}
                          <span className={clsx("font-medium tracking-wide", { "sr-only": isDesktopCollapsed })}>
                            {item.text.toUpperCase()}
                          </span>
                          <Lock size={16} className="ml-2 text-gray-400" />
                          <span className="absolute right-3 text-xs text-gray-400 hidden group-hover:block bg-gray-900 px-2 py-1 rounded shadow-lg z-10">
                            {t('common.comingSoon')}
                          </span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            clsx(
                              "flex items-center gap-3 rounded-lg py-3 px-3 transition-all duration-200 relative group font-mono text-sm",
                              {
                                "bg-green-500/10 text-white hover:bg-green-500/20": isActive,
                                "text-gray-400 hover:text-white hover:bg-gray-800": !isActive,
                                "justify-center": isDesktopCollapsed,
                              }
                            )
                          }
                        >
                          {item.icon}
                          <span className={clsx("font-medium tracking-wide", { "sr-only": isDesktopCollapsed })}>
                            {item.text.toUpperCase()}
                          </span>
                          {!isDesktopCollapsed && (
                            <span className="absolute left-full ml-4 hidden group-hover:block bg-gray-900 px-2 py-1 text-xs rounded-md shadow-lg z-20 whitespace-nowrap">
                              {item.text}
                            </span>
                          )}
                        </NavLink>
                      )}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </nav>

          {/* Footer */}
          <motion.div
            className={clsx("border-t border-gray-800 p-4", {
              "text-center": isDesktopCollapsed,
            })}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className={clsx("text-xs text-gray-500 font-mono", {
              "sr-only": isDesktopCollapsed,
            })}>
              <div className="font-bold text-gray-400 mb-1">
                BATTLESTACK v1.0
              </div>
              <div>CODING ARENA</div>
            </div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
