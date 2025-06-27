import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { duelsApiService, type PlayerStats, aiDuel } from "../services/duelService";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Award, 
  Bot, 
  History, 
  Swords, 
  Users, 
  Loader, 
  Zap,
  Trophy,
  Target,
  Sparkles,
  Crown,
  Medal,
  TrendingUp,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DuelResponse } from "@/services/duelService";
import JoinPrivateRoomModal from "../components/ui/JoinPrivateRoomModal";

const QuickDuelPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [isSearching, setIsSearching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [searchStatus, setSearchStatus] = useState("");
  const [selectedMode, setSelectedMode] = useState("random");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [selectedType, setSelectedType] = useState("algorithm");
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Check for active duel and load player stats
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Check for active or waiting duel first
        if (user) {
          try {
            const activeOrWaitingDuel = await duelsApiService.getActiveOrWaitingDuel();
            if (activeOrWaitingDuel && activeOrWaitingDuel.id) {
              console.log('🎯 Found active/waiting duel, recovering state:', activeOrWaitingDuel);
              
              // Restore state based on duel status
              if (activeOrWaitingDuel.status === 'waiting') {
                // Restore search state
                setIsSearching(true);
                setActiveDuelId(activeOrWaitingDuel.id);
                setSearchStatus("Waiting for opponent...");
                setSelectedDifficulty(activeOrWaitingDuel.difficulty);
                
                // Show notification
                addToast({
                  title: '🔄 Recovered Search',
                  message: 'Your duel search has been restored',
                  type: 'info'
                });
              } else if (activeOrWaitingDuel.status === 'in_progress') {
                // Navigate to duel page
                console.log('🎯 Duel in progress, navigating to duel page');
                navigate(`/duels/${activeOrWaitingDuel.id}`);
                return;
              }
            }
          } catch (error: any) {
            console.log('Error checking active/waiting duel:', error);
          }
          
          // Load player stats
          try {
            const response = await duelsApiService.getPlayerStats();
            setPlayerStats(response.data);
          } catch (statsError: any) {
            // Only log stats error, don't show to user
            console.log('Could not load player stats:', statsError.response?.status);
          }
        }
        
      } catch (error: unknown) {
        // Only show error if it's a serious problem
        console.error('Failed to load initial data:', error);
        addToast({
          title: "Warning",
          message: "Some features may not work properly. Please try refreshing.",
          type: "warning"
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [addToast, user, navigate]);

  // WebSocket connection for waiting duels
  useEffect(() => {
    if (isSearching && activeDuelId && user) {
      console.log('🔌 Setting up WebSocket for waiting duel:', activeDuelId);
      
      const connectWebSocket = () => {
        try {
          const ws = duelsApiService.createWebSocketConnection(activeDuelId);
          wsRef.current = ws;
          
          ws.onopen = () => {
            console.log('✅ WebSocket connected for waiting duel');
          };
          
          ws.onmessage = (event) => {
            if (!mountedRef.current) return;
            
            try {
              const message = JSON.parse(event.data);
              console.log('📨 WebSocket message received:', message);
              
              if (message.type === 'duel_started') {
                console.log('🎊 Duel started! Redirecting to duel page...');
                // Duel started, navigate to duel page
                setIsSearching(false);
                setSearchStatus("Duel started! Loading...");
                
                // Add brief delay for better UX
                setTimeout(() => {
                  if (mountedRef.current) {
                    navigate(`/duels/${activeDuelId}`);
                  }
                }, 1000);
                
                // Show notification
                                  addToast({
                    title: '⚔️ Duel Started!',
                    message: 'Your opponent has been found!',
                    type: 'success'
                  });
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
          };
          
          ws.onclose = () => {
            console.log('❌ WebSocket disconnected for waiting duel');
          };
          
        } catch (error) {
          console.error('Failed to create WebSocket connection:', error);
        }
      };
      
      connectWebSocket();
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    }
  }, [isSearching, activeDuelId, user, navigate, addToast]);

  // Countdown timer for AI fallback - REMOVED! Now search continues indefinitely
  useEffect(() => {
    // No more automatic AI fallback timer - user controls the search duration
    if (isSearching && selectedMode === 'random') {
      setSearchStatus("Looking for opponent... (you can cancel anytime or switch to AI)");
      setCountdown(0); // No countdown
    }
  }, [isSearching, selectedMode]);

  // Helper function to create AI duel as fallback - now user-triggered
  const createAIDuelFallback = async () => {
    try {
      console.log('🤖 Creating AI duel as fallback...');
      setSearchStatus("Switching to AI opponent...");
      const duelResponse = await aiDuel(selectedDifficulty as 'easy' | 'medium' | 'hard' | 'expert');
      
      if (duelResponse?.id) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate(`/duels/${duelResponse.id}`);
      }
    } catch (error) {
      console.error('Failed to create AI duel fallback:', error);
      setIsSearching(false);
              addToast({
          title: 'Failed to create AI duel',
          message: 'Please try again',
          type: 'error'
        });
    }
  };

  // New function to handle search cancellation
  const handleCancelSearch = async () => {
    try {
      // Cancel duel on server if we have activeDuelId
      if (activeDuelId) {
        await duelsApiService.cancelDuel(activeDuelId);
        console.log('✅ Duel cancelled on server');
      }
    } catch (error) {
      console.error('Failed to cancel duel on server:', error);
      // Continue with client-side cleanup even if server cancel fails
    } finally {
      // Always cleanup client state
      setIsSearching(false);
      setActiveDuelId(null);
      setSearchStatus("");
      setCountdown(0);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      addToast({
        title: 'Search cancelled',
        message: 'You can start a new search anytime',
        type: 'info'
      });
    }
  };

  const handleStartDuel = async () => {
    try {
      // First check if there's already an active duel
      const activeOrWaitingDuel = await duelsApiService.getActiveOrWaitingDuel();
      if (activeOrWaitingDuel && activeOrWaitingDuel.id) {
        if (activeOrWaitingDuel.status === 'waiting') {
          // Resume existing search
          console.log('🔄 Resuming existing duel search:', activeOrWaitingDuel.id);
          setIsSearching(true);
          setActiveDuelId(activeOrWaitingDuel.id);
          setSearchStatus("Waiting for opponent...");
          setSelectedDifficulty(activeOrWaitingDuel.difficulty);
          
          addToast({
            title: 'Search Resumed',
            message: 'Your previous duel search has been resumed',
            type: 'info'
          });
          return;
        } else if (activeOrWaitingDuel.status === 'in_progress') {
          // Navigate to active duel
          addToast({
            title: 'Active Duel',
            message: 'You already have an active duel!',
            type: 'warning'
          });
          navigate(`/duels/${activeOrWaitingDuel.id}`);
          return;
        }
      }
      
      setIsSearching(true);
      setSearchStatus("Looking for opponent...");
      
      let duelResponse;
      
      if (selectedMode === 'ai') {
        // Create AI duel using the correct endpoint
        setSearchStatus("Creating duel with AI bot...");
        duelResponse = await aiDuel(selectedDifficulty as 'easy' | 'medium' | 'hard' | 'expert');
      } else if (selectedMode === 'private') {
        // Create private room
        setSearchStatus("Creating private room...");
        duelResponse = await duelsApiService.createDuel({
          mode: 'private_room',
          difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard' | 'expert',
          problem_type: selectedType as 'algorithm' | 'data_structure' | 'dynamic_programming' | 'graph' | 'string' | 'array' | 'tree' | 'math'
        });
      } else {
        // Try to join existing duel or create new one
        try {
          duelResponse = await duelsApiService.joinDuel({ 
            difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard' | 'expert'
          });
          setSearchStatus("Opponent found! Starting duel...");
        } catch {
          // No existing duel found, create new one
          duelResponse = await duelsApiService.createDuel({
            mode: 'random_player',
            difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard' | 'expert',
            problem_type: selectedType as 'algorithm' | 'data_structure' | 'dynamic_programming' | 'graph' | 'string' | 'array' | 'tree' | 'math'
          });
          
          // Store duel ID for WebSocket connection  
          setActiveDuelId(duelResponse.id);
          setSearchStatus("Duel created! Waiting for opponent...");
          
          // Don't navigate immediately for waiting duels - let WebSocket handle it
          return;
        }
      }
      
      // For AI and immediate match duels, navigate to duel page
      if (duelResponse?.id) {
        // For AI or found opponent, navigate after a brief delay
        if (selectedMode === 'ai' || duelResponse.status === 'in_progress') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          navigate(`/duels/${duelResponse.id}`);
        } else if (selectedMode === 'private') {
          // For private rooms, show room code
          addToast({
            title: 'Private Room Created',
            message: `Room code: ${duelResponse.room_code}`,
            type: 'success'
          });
          setActiveDuelId(duelResponse.id);
          setSearchStatus(`Room code: ${duelResponse.room_code} - Waiting for opponent...`);
        }
      }
    } catch (error: any) {
      console.error('Failed to start duel:', error);
      setIsSearching(false);
      
      if (error.response?.data?.detail) {
        addToast({
          title: 'Failed to start duel',
          message: error.response.data.detail,
          type: 'error'
        });
      } else {
        addToast({
          title: 'Failed to start duel',
          message: 'Please try again',
          type: 'error'
        });
      }
    }
  };

  // Helper functions to format data
  const formatTime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRankDisplayName = (rank: string) => {
    // Convert rank enum to display name
    const rankMap: Record<string, string> = {
      'bronze_i': 'Bronze I',
      'bronze_ii': 'Bronze II', 
      'bronze_iii': 'Bronze III',
      'silver_i': 'Silver I',
      'silver_ii': 'Silver II',
      'silver_iii': 'Silver III',
      'gold_i': 'Gold I',
      'gold_ii': 'Gold II',
      'gold_iii': 'Gold III',
      'platinum_i': 'Platinum I',
      'platinum_ii': 'Platinum II',
      'platinum_iii': 'Platinum III',
      'diamond': 'Diamond',
      'master': 'Master',
      'grandmaster': 'Grandmaster'
    };
    return rankMap[rank.toLowerCase()] || rank;
  };

  // Calculate derived stats from real data
  const duelStats = playerStats ? {
    gamesPlayed: playerStats.rating.total_duels,
    wins: playerStats.rating.wins,
    winRate: Math.round(playerStats.rating.win_rate),
    avgTime: formatTime(playerStats.rating.average_solve_time),
    currentStreak: playerStats.rating.current_streak,
    bestStreak: playerStats.rating.best_streak,
    rank: getRankDisplayName(playerStats.rating.rank),
    elo: playerStats.rating.elo_rating
  } : {
    gamesPlayed: 0,
    wins: 0,
    winRate: 0,
    avgTime: "N/A",
    currentStreak: 0,
    bestStreak: 0,
    rank: "Bronze I",
    elo: 1200
  };

  const recentMatches = playerStats?.recent_matches.map(match => ({
    opponent: match.opponent_name,
    result: match.is_victory ? "win" : "loss",
    time: match.solve_time || "N/A",
    problem: match.problem_title
  })) || [];

  // Achievement types mapping
  const achievementIconMap: Record<string, any> = {
    'first_victory': Trophy,
    'speed_demon': Zap,
    'comeback_kid': Target,
    'perfect_week': Crown,
    'streak_master': Medal,
    'night_owl': Crown,
    'speed_coder': Zap
  };

  const achievements = playerStats?.achievements.map(achievement => ({
    name: achievement.achievement_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: achievementIconMap[achievement.achievement_type] || Trophy,
    earned: true
  })) || [];

  return (
    <div className="min-h-screen bg-arena-dark">
      {/* Background mesh effect */}
      <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header and Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
                    <Swords size={36} className="text-arena-accent" />
                    Quick Duel
                  </h1>
                  <p className="text-arena-text-muted mt-2">
                    Сразись в реальном времени. 1 задача. 1 соперник. 10 минут.
                  </p>
                </div>
                
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-arena-text-muted font-medium">Win Rate</div>
                    <div className="text-2xl font-bold text-arena-accent mt-1">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader className="animate-spin h-5 w-5" />
                          <span>Loading...</span>
                        </div>
                      ) : playerStats ? (
                        `${duelStats.wins}/${duelStats.gamesPlayed}`
                      ) : (
                        "Guest"
                      )}
                    </div>
                    <div className="text-xs text-arena-text-muted">
                      {loading ? "Loading..." : playerStats ? `${duelStats.winRate}% victories` : "Login to track stats"}
                    </div>
                  </div>
                  <div className="w-20 h-20 relative">
                    {loading ? (
                      <div className="w-20 h-20 flex items-center justify-center">
                        <Loader className="animate-spin h-8 w-8 text-arena-accent" />
                      </div>
                    ) : playerStats ? (
                      <>
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-arena-border" />
                          <motion.circle 
                            cx="40" 
                            cy="40" 
                            r="32" 
                            stroke="currentColor" 
                            strokeWidth="6" 
                            fill="transparent" 
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - duelStats.winRate / 100)}`}
                            className="text-arena-accent transition-all duration-1000"
                            initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - duelStats.winRate / 100) }}
                            transition={{ duration: 2, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm text-arena-accent font-bold">
                            {duelStats.winRate}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-20 h-20 flex items-center justify-center">
                        <Users className="h-8 w-8 text-arena-text-muted" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Card variant="glass" className="border-arena-accent/20">
                <CardContent className="p-6">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-arena-text">
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-arena-accent rounded-full animate-pulse"></div>
                      <span className="font-medium">Один раунд, задача одинаковая</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-arena-accent rounded-full animate-pulse"></div>
                      <span className="font-medium">Побеждает тот, кто быстрее и точнее решит</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-arena-accent rounded-full animate-pulse"></div>
                      <span className="font-medium">Тесты запускаются автоматически</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-arena-accent rounded-full animate-pulse"></div>
                      <span className="font-medium">Очки, рейтинг, XP</span>
                    </motion.li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Mode Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card variant="glass" hover="glow" className="border-arena-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} className="text-arena-accent" />
                    Выбор режима дуэли
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedMode}
                    onValueChange={setSelectedMode}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <RadioGroupItem
                        value="random"
                        id="random"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="random"
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-arena-border bg-arena-surface/50 p-6 hover:bg-arena-light/30 hover:border-arena-accent/40 peer-data-[state=checked]:border-arena-accent peer-data-[state=checked]:bg-arena-accent/10 peer-data-[state=checked]:shadow-arena-glow transition-all duration-300 cursor-pointer group"
                      >
                        <Users className="mb-4 h-10 w-10 text-arena-accent group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-arena-text text-lg mb-1">Random Player</span>
                        <span className="text-sm text-arena-text-muted text-center">Find any opponent worldwide</span>
                      </Label>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <RadioGroupItem value="ai" id="ai" className="peer sr-only" />
                      <Label
                        htmlFor="ai"
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-arena-border bg-arena-surface/50 p-6 hover:bg-arena-light/30 hover:border-arena-secondary/40 peer-data-[state=checked]:border-arena-secondary peer-data-[state=checked]:bg-arena-secondary/10 peer-data-[state=checked]:shadow-lg transition-all duration-300 cursor-pointer group"
                      >
                        <Bot className="mb-4 h-10 w-10 text-arena-secondary group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-arena-text text-lg mb-1">AI Opponent</span>
                        <span className="text-sm text-arena-text-muted text-center">Practice with intelligent bot</span>
                      </Label>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <RadioGroupItem
                        value="private"
                        id="private"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="private"
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-arena-border bg-arena-surface/50 p-6 hover:bg-arena-light/30 hover:border-arena-tertiary/40 peer-data-[state=checked]:border-arena-tertiary peer-data-[state=checked]:bg-arena-tertiary/10 peer-data-[state=checked]:shadow-lg transition-all duration-300 cursor-pointer group"
                      >
                        <Crown className="mb-4 h-10 w-10 text-arena-tertiary group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-arena-text text-lg mb-1">Private Room</span>
                        <span className="text-sm text-arena-text-muted text-center">Challenge friends directly</span>
                      </Label>
                    </motion.div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>

            {/* Advanced Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card variant="glass" hover="glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles size={20} className="text-arena-accent" />
                    Настройки дуэли
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-arena-text font-medium">Сложность</Label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="bg-arena-surface/50 border-arena-border hover:border-arena-accent/40 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy - Легкие задачи</SelectItem>
                          <SelectItem value="medium">Medium - Средние задачи</SelectItem>
                          <SelectItem value="hard">Hard - Сложные задачи</SelectItem>
                          <SelectItem value="expert">Expert - Экспертные задачи</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-arena-text font-medium">Тип задач</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="bg-arena-surface/50 border-arena-border hover:border-arena-accent/40 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="algorithm">Algorithm - Алгоритмы</SelectItem>
                          <SelectItem value="data_structure">Data Structure - Структуры данных</SelectItem>
                          <SelectItem value="dynamic_programming">Dynamic Programming - Динамическое программирование</SelectItem>
                          <SelectItem value="graph">Graph - Графы</SelectItem>
                          <SelectItem value="string">String - Строки</SelectItem>
                          <SelectItem value="array">Array - Массивы</SelectItem>
                          <SelectItem value="tree">Tree - Деревья</SelectItem>
                          <SelectItem value="math">Math - Математика</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Start Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center"
            >
              <AnimatePresence mode="wait">
                {!isSearching ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col sm:flex-row gap-4 items-center"
                  >
                    <Button
                      onClick={handleStartDuel}
                      variant="gradient"
                      className="text-xl font-bold py-4 px-12 shadow-arena-glow hover:shadow-xl"
                    >
                      <Swords size={24} className="mr-3" />
                      Начать дуэль
                    </Button>
                    
                    <Button
                      onClick={() => setShowJoinModal(true)}
                      variant="ghost"
                      className="text-lg font-semibold py-4 px-8 border border-blue-500/30 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
                    >
                      <Lock size={20} className="mr-2" />
                      Join Private Room
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="searching"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center"
                  >
                    <Card variant="glass" className="border-arena-accent/30 shadow-arena-glow">
                      <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-4">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader className="w-12 h-12 text-arena-accent" />
                          </motion.div>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-arena-text mb-2">{searchStatus}</h3>
                            <p className="text-sm text-arena-text-muted mt-2">
                              Searching will continue until you cancel or an opponent is found
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={handleCancelSearch}
                              variant="ghost"
                              className="border border-arena-border hover:border-arena-accent/40"
                            >
                              Cancel Search
                            </Button>
                            {selectedMode === 'random' && (
                              <Button
                                onClick={createAIDuelFallback}
                                variant="secondary"
                                className="border border-arena-secondary/40 hover:border-arena-secondary bg-arena-secondary/10 hover:bg-arena-secondary/20"
                              >
                                <Bot className="w-4 h-4 mr-2" />
                                Switch to AI Bot
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card variant="glass" hover="glow" className="border-arena-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} className="text-arena-accent" />
                    Ваша статистика
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="bg-arena-surface/50 animate-pulse h-4 w-20 rounded"></div>
                          <div className="bg-arena-surface/50 animate-pulse h-4 w-16 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : playerStats ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-arena-text-muted">Рейтинг</span>
                        <div className="flex items-center gap-2">
                          <Medal className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-arena-text">{duelStats.rank}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-arena-text-muted">ELO</span>
                        <span className="font-bold text-arena-accent">{duelStats.elo}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-arena-text-muted">Среднее время</span>
                        <span className="font-bold text-arena-text">{duelStats.avgTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-arena-text-muted">Текущая серия</span>
                        <span className="font-bold text-green-400">{duelStats.currentStreak}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-arena-text-muted">Лучшая серия</span>
                        <span className="font-bold text-yellow-400">{duelStats.bestStreak}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="mx-auto h-12 w-12 mb-4 text-arena-text-muted opacity-50" />
                      <p className="text-arena-text-muted mb-2">Guest Mode</p>
                      <p className="text-sm text-arena-text-muted mb-4">Login to track your statistics</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border border-arena-border hover:border-arena-accent/40"
                        onClick={() => window.location.href = '/login'}
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Matches */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card variant="glass" hover="glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History size={20} className="text-arena-accent" />
                    Последние матчи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-arena-surface/30 rounded-lg border border-arena-border">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-arena-surface/50 animate-pulse" />
                            <div>
                              <div className="bg-arena-surface/50 animate-pulse h-4 w-20 rounded mb-1"></div>
                              <div className="bg-arena-surface/50 animate-pulse h-3 w-12 rounded"></div>
                            </div>
                          </div>
                          <div className="bg-arena-surface/50 animate-pulse h-3 w-16 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentMatches.length > 0 ? (
                    <div className="space-y-3">
                      {recentMatches.map((match, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 bg-arena-surface/30 rounded-lg border border-arena-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${match.result === 'win' ? 'bg-green-400' : 'bg-red-400'}`} />
                            <div>
                              <div className="font-medium text-arena-text text-sm">{match.opponent}</div>
                              <div className="text-xs text-arena-text-muted">{match.time}</div>
                            </div>
                          </div>
                          <div className="text-xs text-arena-text-muted text-right">
                            {match.problem}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-arena-text-muted">
                      <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Нет истории матчей</p>
                      <p className="text-sm">Начните свой первый дуэль!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card variant="glass" hover="glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award size={20} className="text-arena-accent" />
                    Достижения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center p-3 rounded-lg border bg-arena-surface/30 border-arena-border">
                          <div className="w-6 h-6 mb-2 bg-arena-surface/50 animate-pulse rounded" />
                          <div className="bg-arena-surface/50 animate-pulse h-3 w-16 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : achievements.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {achievements.map((achievement, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                            achievement.earned
                              ? 'bg-arena-accent/10 border-arena-accent/30 text-arena-accent'
                              : 'bg-arena-surface/30 border-arena-border text-arena-text-muted'
                          }`}
                        >
                          <achievement.icon className="w-6 h-6 mb-2" />
                          <span className="text-xs text-center font-medium">{achievement.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-arena-text-muted">
                      <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Нет достижений</p>
                      <p className="text-sm">Выиграйте дуэли для получения наград!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Join Private Room Modal */}
      <JoinPrivateRoomModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
    </div>
  );
};

export default QuickDuelPage; 