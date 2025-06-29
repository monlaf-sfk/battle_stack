import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import clsx from "clsx";
import { motion } from "framer-motion";

function MainLayoutContent() {
  const { isSidebarOpen } = useLayout();

  return (
    <motion.div
      className="flex h-screen relative overflow-hidden font-mono"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
          <svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
                <stop offset="25%" style="stop-color:#0a0a0a;stop-opacity:1" />
                <stop offset="75%" style="stop-color:#1a1a1a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
              </linearGradient>
              <pattern id="codePattern" x="0" y="0" width="100" height="60" patternUnits="userSpaceOnUse">
                <text x="10" y="20" font-family="monospace" font-size="8" fill="#22c55e" opacity="0.1">console.log()</text>
                <text x="10" y="40" font-family="monospace" font-size="8" fill="#15803d" opacity="0.08">function() {}</text>
              </pattern>
              <pattern id="binaryPattern" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse">
                <text x="5" y="15" font-family="monospace" font-size="10" fill="#22c55e" opacity="0.05">1010</text>
                <text x="40" y="30" font-family="monospace" font-size="10" fill="#15803d" opacity="0.03">0101</text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
            <rect width="100%" height="100%" fill="url(#codePattern)"/>
            <rect width="100%" height="100%" fill="url(#binaryPattern)"/>
            
            <!-- Floating code elements -->
            <text x="200" y="100" font-family="monospace" font-size="14" fill="#22c55e" opacity="0.15">class CodeDuel {</text>
            <text x="1400" y="200" font-family="monospace" font-size="12" fill="#15803d" opacity="0.12">return battle;</text>
            <text x="100" y="300" font-family="monospace" font-size="16" fill="#22c55e" opacity="0.08">&lt;/html&gt;</text>
            <text x="1500" y="400" font-family="monospace" font-size="10" fill="#15803d" opacity="0.1">async function</text>
            <text x="300" y="500" font-family="monospace" font-size="18" fill="#22c55e" opacity="0.06">const winner =</text>
            <text x="1200" y="600" font-family="monospace" font-size="11" fill="#15803d" opacity="0.09">while(true)</text>
            <text x="50" y="700" font-family="monospace" font-size="13" fill="#22c55e" opacity="0.11">let code = []</text>
            <text x="1600" y="800" font-family="monospace" font-size="9" fill="#15803d" opacity="0.08">git commit -m</text>
            <text x="400" y="900" font-family="monospace" font-size="15" fill="#22c55e" opacity="0.07">npm install</text>
            <text x="1100" y="950" font-family="monospace" font-size="12" fill="#15803d" opacity="0.1">console.error</text>
            
            <!-- Binary streams -->
            <text x="800" y="150" font-family="monospace" font-size="8" fill="#22c55e" opacity="0.05">110010110101</text>
            <text x="900" y="350" font-family="monospace" font-size="8" fill="#15803d" opacity="0.04">001101011010</text>
            <text x="600" y="550" font-family="monospace" font-size="8" fill="#22c55e" opacity="0.06">101100011101</text>
            <text x="700" y="750" font-family="monospace" font-size="8" fill="#15803d" opacity="0.03">010111000110</text>
            
            <!-- Matrix-style symbols -->
            <text x="1000" y="100" font-family="monospace" font-size="20" fill="#22c55e" opacity="0.04">{ } [ ]</text>
            <text x="500" y="400" font-family="monospace" font-size="16" fill="#15803d" opacity="0.05">( ) =&gt; &lt;/&gt;</text>
            <text x="1300" y="700" font-family="monospace" font-size="14" fill="#22c55e" opacity="0.06">&amp;&amp; || !</text>
          </svg>
        )}`)}')`,
      }}
    >
      <Sidebar />
      
      <div 
        className={clsx(
          "flex flex-1 flex-col transition-all duration-300",
          {
            "sm:ml-64": isSidebarOpen,
            "sm:ml-20": !isSidebarOpen,
          }
        )}
      >
        <DashboardHeader />
        
        <motion.main
          className="flex-1 overflow-y-auto bg-black/30 backdrop-blur-sm relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Additional programming overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-20 text-green-500/5 font-mono text-xs">
              <div>// Welcome to BattleStack</div>
              <div>// Where code meets combat</div>
            </div>
            <div className="absolute bottom-20 left-20 text-green-400/5 font-mono text-xs">
              <div>export default BattleArena;</div>
            </div>
            <div className="absolute top-1/2 right-10 text-green-300/5 font-mono text-sm transform -rotate-90">
              {"<Duel />"}
            </div>
            <div className="absolute bottom-40 right-1/3 text-green-500/5 font-mono text-xs">
              status: "ready_to_battle"
            </div>
          </div>
          
          <div className="relative z-10">
            <Outlet />
          </div>
        </motion.main>
      </div>
    </motion.div>
  );
}

export function MainLayout() {
  return <MainLayoutContent />;
} 