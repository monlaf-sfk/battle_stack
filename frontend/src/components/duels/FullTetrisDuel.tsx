import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FullTetrisDuelProps {
  problem: any;
  participants: any[];
  currentUser: any;
  timeRemaining: number;
  isCompleted: boolean;
}

export const FullTetrisDuel: React.FC<FullTetrisDuelProps> = ({
  problem,
  participants,
  currentUser,
  timeRemaining,
  isCompleted
}) => {
  const { t } = useTranslation();
  // State for panel visibility
  const [showProblemPanel, setShowProblemPanel] = useState(false); // Start hidden for Tetris mode

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get participant data
  const currentPlayer = participants.find(p => p.user_id === currentUser?.id);

  // Gaming stats like in Tetris
  const getPlayerStats = (participant: any, isPlayer: boolean = false) => ({
    pieces: participant?.tests_passed || 0,
    attack: Math.round((participant?.tests_passed || 0) * 0.65) + Math.floor(Math.random() * 10),
    kos: participant?.is_winner ? 1 : 0,
    speed: isPlayer 
      ? t('duels.playerSpeed', { speed: (0.55 + Math.random() * 0.20).toFixed(2) })
      : t('duels.aiSpeed', { speed: (0.45 + Math.random() * 0.15).toFixed(2) }),
    pps: isPlayer
      ? t('duels.playerPps', { pps: (11.10 + Math.random() * 3).toFixed(2) })
      : t('duels.aiPps', { pps: (8.30 + Math.random() * 2).toFixed(2) })
  });

  const playerStats = getPlayerStats(currentPlayer, true);

  // Tetris pieces for HOLD and NEXT areas
  const tetrisPieces = [
    { color: '#00FFFF', blocks: [[1,1,1,1]] }, // I-piece (cyan)
    { color: '#FFFF00', blocks: [[1,1],[1,1]] }, // O-piece (yellow)  
    { color: '#800080', blocks: [[0,1,0],[1,1,1]] }, // T-piece (purple)
    { color: '#00FF00', blocks: [[0,1,1],[1,1,0]] }, // S-piece (green)
    { color: '#FF0000', blocks: [[1,1,0],[0,1,1]] }, // Z-piece (red)
    { color: '#0000FF', blocks: [[1,0,0],[1,1,1]] }, // J-piece (blue)
    { color: '#FFA500', blocks: [[0,0,1],[1,1,1]] }, // L-piece (orange)
  ];

  const getRandomPiece = () => tetrisPieces[Math.floor(Math.random() * tetrisPieces.length)];

  // Create Tetris board representation based on code progress
  const createTetrisBoard = (testsPassed: number = 0) => {
    const board = Array(20).fill(null).map(() => Array(10).fill(null));
    
    // Fill bottom rows based on progress
    const filledRows = Math.floor(testsPassed * 2.5); // Convert test progress to visual progress
    
    for (let row = 19; row >= Math.max(0, 20 - filledRows); row--) {
      for (let col = 0; col < 10; col++) {
        if (Math.random() > 0.3) { // 70% chance to fill a block
          const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500', '#800080', '#00FFFF'];
          board[row][col] = colors[Math.floor(Math.random() * colors.length)];
        }
      }
    }
    
    return board;
  };

  const renderTetrisBoard = (board: any[][]) => {
    return (
      <div className="relative">
        {/* Tetris Grid */}
        <div className="grid grid-cols-10 gap-px bg-gray-800/50 p-1 rounded">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-6 h-6 border border-gray-600/30 ${
                  cell ? 'shadow-lg' : 'bg-black/20'
                }`}
                style={{
                  backgroundColor: cell || 'transparent',
                  boxShadow: cell ? `0 0 10px ${cell}40` : 'none'
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderMiniPiece = (piece: any, size: string = "w-4 h-4") => {
    return (
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${piece.blocks[0].length}, 1fr)` }}>
        {piece.blocks.map((row: any[], rowIndex: number) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`${size} border border-gray-600/30`}
              style={{
                backgroundColor: cell ? piece.color : 'transparent',
                boxShadow: cell ? `0 0 5px ${piece.color}40` : 'none'
              }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ocean Background - exactly like in the image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4A90A4;stop-opacity:1" />
                  <stop offset="30%" style="stop-color:#5A9DB8;stop-opacity:1" />
                  <stop offset="60%" style="stop-color:#6BAAC2;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#7BB7CC;stop-opacity:1" />
                </linearGradient>
                <filter id="wave">
                  <feTurbulence baseFrequency="0.02" numOctaves="3" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="20"/>
                </filter>
              </defs>
              <rect width="100%" height="100%" fill="url(#oceanGrad)"/>
              <ellipse cx="300" cy="400" rx="120" ry="80" fill="#2D5016" opacity="0.8" filter="url(#wave)"/>
              <ellipse cx="1200" cy="600" rx="150" ry="100" fill="#2D5016" opacity="0.8" filter="url(#wave)"/>
              <ellipse cx="600" cy="800" rx="100" ry="60" fill="#2D5016" opacity="0.8" filter="url(#wave)"/>
              <ellipse cx="1500" cy="300" rx="80" ry="50" fill="#2D5016" opacity="0.8" filter="url(#wave)"/>
              <path d="M0,850 Q480,800 960,850 T1920,850 L1920,1080 L0,1080 Z" fill="#1A5490" opacity="0.6"/>
              <path d="M0,950 Q480,900 960,950 T1920,950 L1920,1080 L0,1080 Z" fill="#0F3A70" opacity="0.4"/>
            </svg>
          )}`)}')`,
        }}
      />
      
      {/* Floating debris/rocks effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-orange-400 rounded"
            style={{
              top: `${Math.random() * 100}%`,
              right: `${Math.random() * 100}px`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main Tetris Arena */}
      <div className="relative z-10 h-screen flex flex-col justify-center items-center p-8">
        
        {/* Problem Panel Toggle */}
        <AnimatePresence>
          {showProblemPanel && (
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute top-4 left-4 w-96 bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl z-50"
            >
              {/* Problem Description */}
              <div className="w-1/3 border-r border-white/20">
                <div className="text-white font-mono text-sm font-bold mb-2 text-center">
                  {problem?.description}
                </div>
                <div className="text-center space-y-1">
                  <div className="text-4xl font-bold text-emerald-400 font-mono">
                    {problem?.title}
                  </div>
                  <div className="text-sm text-white/60 font-mono">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Controls - Top */}
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProblemPanel(!showProblemPanel)}
            className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
              showProblemPanel 
                ? 'bg-emerald-500/80 text-white border border-emerald-400' 
                : 'bg-black/60 text-gray-300 border border-gray-500'
            }`}
          >
            {t('duels.problemToggle').toUpperCase()}
          </motion.button>
        </div>

        {/* Timer - Top Center */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
            <div className="text-center">
              <div className="text-white/60 font-mono text-sm mb-1">{t('duels.timeRemaining')}</div>
              <div className="font-mono text-white text-3xl font-bold tracking-wider">
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Tetris Duel Layout */}
        <div className="flex gap-16 items-center">
          
          {/* Left Player (Current User) */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex gap-6"
          >
            {/* Left HOLD Box */}
            <div className="flex flex-col gap-4">
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-white font-mono text-sm font-bold mb-2 text-center">{t('duels.hold')}</div>
                <div className="w-16 h-16 bg-black/60 rounded border border-gray-600/30 flex items-center justify-center">
                  {renderMiniPiece(getRandomPiece())}
                </div>
              </div>
            </div>

            {/* Left Tetris Board */}
            <div className="flex flex-col items-center">
              {renderTetrisBoard(createTetrisBoard(playerStats.pieces))}
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-bold text-white font-mono mb-2 uppercase">
                  {currentUser?.username || t('common.you')}
                </h3>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-300 font-mono">
                  <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-yellow-400" />
                    {t('duels.pieces')}: <span className="font-bold text-white">{playerStats.pieces}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    ⚡ {t('duels.attack')}: <span className="font-bold text-white">{playerStats.attack}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    ⚔️ {t('duels.kos')}: <span className="font-bold text-white">{playerStats.kos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    🚀 {t('duels.speed')}: <span className="font-bold text-white">{playerStats.speed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    🎯 {t('duels.pps')}: <span className="font-bold text-white">{playerStats.pps}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Player (Opponent) */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex gap-6 flex-row-reverse"
          >
            {/* Right NEXT Box */}
            <div className="flex flex-col gap-4">
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-white font-mono text-sm font-bold mb-2 text-center">{t('duels.next')}</div>
                <div className="w-16 h-16 bg-black/60 rounded border border-gray-600/30 flex items-center justify-center">
                  {renderMiniPiece(getRandomPiece())}
                </div>
              </div>
            </div>

            {/* Right Tetris Board */}
            <div className="flex flex-col items-center">
              {renderTetrisBoard(createTetrisBoard(participants.find(p => p.user_id !== currentUser?.id)?.tests_passed))}
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-bold text-white font-mono mb-2 uppercase">
                  {participants.find(p => p.user_id !== currentUser?.id)?.username || t('common.opponent')}
                </h3>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-300 font-mono">
                  <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-yellow-400" />
                    {t('duels.pieces')}: <span className="font-bold text-white">{participants.find(p => p.user_id !== currentUser?.id)?.tests_passed || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    ⚡ {t('duels.attack')}: <span className="font-bold text-white">{getPlayerStats(participants.find(p => p.user_id !== currentUser?.id)).attack}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    ⚔️ {t('duels.kos')}: <span className="font-bold text-white">{getPlayerStats(participants.find(p => p.user_id !== currentUser?.id)).kos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    🚀 {t('duels.speed')}: <span className="font-bold text-white">{getPlayerStats(participants.find(p => p.user_id !== currentUser?.id)).speed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    🎯 {t('duels.pps')}: <span className="font-bold text-white">{getPlayerStats(participants.find(p => p.user_id !== currentUser?.id)).pps}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm z-20"
          >
            <div className="text-center">
              <Trophy size={80} className="text-yellow-400 mx-auto mb-4" />
              <h2 className="text-5xl font-bold text-white mb-4">
                {currentUser?.id === participants.find(p => p.is_winner)?.user_id 
                  ? t('duels.youWin') 
                  : t('duels.youLose')}
              </h2>
              <p className="text-xl text-gray-300">
                {t('duels.finalScore')}: <span className="font-bold">{currentPlayer?.tests_passed}</span>
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FullTetrisDuel; 