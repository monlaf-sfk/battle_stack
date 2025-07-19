import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { 
  Swords, 
  CheckCircle, 
  Clock, 
  User, 
  Bot, 
  Target, 
  Eye, 
  EyeOff,
  Play, 
  Code2,
  TestTube,
  FileText,
  Maximize2,
  Minimize2,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { useDuel } from '@/hooks/useDuelManager';
import { DuelStatus, type TestCase } from '@/services/duelService';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { Button } from '@/components/ui/Button';
import DuelLoadingScreen from '@/components/duels/DuelLoadingScreen';
import Lobby from '@/components/duels/Lobby'; // Import the new Lobby component
import { codeExecutionService } from '@/services/codeExecutionService';
import type { SupportedLanguage } from '@/services/codeExecutionService';
import { useLayout } from '@/contexts/LayoutContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import './DuelArenaPage.css';

// Custom resize handle component
const CustomResizeHandle = ({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) => (
  <PanelResizeHandle 
    className={`resize-handle ${direction === 'horizontal' ? 'resize-handle-horizontal' : 'resize-handle-vertical'}`}
  >
    <div className="resize-handle-inner" />
  </PanelResizeHandle>
);

const WaitingLobby: React.FC<{ roomCode?: string | null }> = ({ roomCode }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      addToast({
        type: 'success',
        title: t('joinPrivateRoom.roomCodeCopiedMessage'),
        message: t('joinPrivateRoom.roomCodeCopiedToClipboard'),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-arena-dark via-arena-surface to-arena-dark flex items-center justify-center text-white">
      <div className="text-center p-8 bg-arena-surface/80 rounded-2xl shadow-2xl backdrop-blur-xl border border-arena-border/50 max-w-lg mx-auto">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-arena-accent to-blue-400 bg-clip-text text-transparent">
          {t('duels.privateLobbyTitle')}
        </h1>
        <p className="text-arena-text-muted mb-8 text-lg">
          {t('duels.waitingForOpponentToJoin')}
        </p>
        
        {roomCode && (
          <div className="mb-8">
            <p className="text-sm uppercase text-arena-text-muted mb-2 tracking-widest">{t('duels.roomCode')}</p>
            <div 
              className="text-4xl font-mono font-bold tracking-widest bg-arena-dark/50 border-2 border-dashed border-arena-border rounded-lg p-4 cursor-pointer hover:bg-arena-dark/70 transition-colors"
              onClick={handleCopyCode}
            >
              {roomCode}
            </div>
          </div>
        )}
        
        <div className="animate-pulse flex items-center justify-center gap-4">
          <Clock className="w-6 h-6 text-arena-accent" />
          <span className="font-medium text-lg">{t('duels.waitingStatus')}...</span>
        </div>
      </div>
    </div>
  );
};


const DuelArenaPage: React.FC = () => {
  const { duelId } = useParams<{ duelId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const { setSidebarOpen } = useLayout();

  const { 
    duel, 
    isLoading, 
    error, 
    opponent,
    connect, 
    disconnect, 
    sendCodeUpdate, 
    submitSolution, 
    runTests, 
    isConnected, 
    opponentCode, 
    opponentTyping, 
    elapsedTime, 
    aiProgress,
    currentLanguage,
    setCurrentLanguage,
    submissionResult,
    sendReadyState, // Add this from useDuel
    sendStartDuel,  // Add this from useDuel
  } = useDuel();

  const [userCode, setUserCode] = useState<string>('');
  const [showOpponentCode, setShowOpponentCode] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'testcases'>('description');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Function to get the localStorage key for user code
  const getUserCodeStorageKey = useCallback(() => {
    if (!duelId || !user?.id) return null;
    return `duel-${duelId}-user-${user.id}-code`;
  }, [duelId, user?.id]);

  // Collapse sidebar on enter, expand on leave
  useEffect(() => {
    setSidebarOpen(false);
    return () => {
      setSidebarOpen(true);
    };
  }, [setSidebarOpen]);

  // Handle initial connection and disconnection on component unmount
  useEffect(() => {
    if (duelId && isAuthenticated && user?.id) {
      connect(duelId);
    } else if (!isAuthenticated) {
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
    }

    return () => {
      disconnect();
    };
  }, [duelId, isAuthenticated, user?.id, navigate, addToast, t, connect, disconnect]);

  // Load user code from localStorage on initial component mount
  useEffect(() => {
    const storageKey = getUserCodeStorageKey();
    if (storageKey) {
      const savedCode = localStorage.getItem(storageKey);
      if (savedCode) {
        setUserCode(savedCode);
      }
    }
  }, [getUserCodeStorageKey]);

  // Fetch supported languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languages = await codeExecutionService.getSupportedLanguages();
        setSupportedLanguages(languages);
      } catch (error) {
        addToast({ type: 'error', title: 'Error', message: 'Failed to load supported languages.' });
      }
    };
    fetchLanguages();
  }, [addToast]);

  // Set initial code once duel problem is loaded and language is set
  useEffect(() => {
    if (duel?.problem && currentLanguage && !userCode) {
      const storageKey = getUserCodeStorageKey();
      const savedCode = storageKey ? localStorage.getItem(storageKey) : null;
      
      if (savedCode) {
        setUserCode(savedCode);
      } else {
        const initialCode = duel.problem.starter_code?.[currentLanguage.id] || '';
        setUserCode(initialCode);
      }
    }
  }, [duel?.problem, currentLanguage, userCode, getUserCodeStorageKey]);

  // Navigate to completion screen when duel is completed and clear storage
  useEffect(() => {
    if (duel?.status === DuelStatus.COMPLETED || duel?.status === DuelStatus.TIMED_OUT) {
      const userCodeKey = getUserCodeStorageKey();
      if (userCodeKey) {
        localStorage.removeItem(userCodeKey);
      }
      // Opponent code key is handled in useDuelManager
      navigate(`/duel/${duelId}/complete`);
    }
  }, [duel?.status, duelId, navigate, getUserCodeStorageKey]);

  const handleUserCodeChange = useCallback((code: string | undefined) => {
    const newCode = code || '';
    setUserCode(newCode);
    if (currentLanguage) {
      sendCodeUpdate(newCode, currentLanguage);
    }
    const storageKey = getUserCodeStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, newCode);
    }
  }, [sendCodeUpdate, currentLanguage, getUserCodeStorageKey]);

  const handleReady = () => {
    sendReadyState(true);
  };

  const handleStart = () => {
    sendStartDuel();
  };

  const handleRunTests = async () => {
    if (!userCode.trim() || !currentLanguage || !duel?.id) {
      addToast({ type: 'error', title: t('common.error'), message: 'Code or language missing.' });
      return;
    }
    try {
      await runTests(userCode, currentLanguage);
    } catch (err) {
      addToast({ type: 'error', title: t('common.error'), message: 'Tests failed to run.' });
    }
  };

  const handleSubmitSolution = async () => {
    if (!userCode.trim() || !currentLanguage || !duel?.id) {
      addToast({ type: 'error', title: t('common.error'), message: 'Code or language missing.' });
      return;
    }
    try {
      await submitSolution(userCode, currentLanguage);
    } catch (err) {
      addToast({ type: 'error', title: t('common.error'), message: 'Failed to submit solution.' });
    }
  };

  const handleLanguageChange = (langId: string) => {
    const selectedLang = supportedLanguages.find(l => l.id === langId);
    if (selectedLang) {
      setCurrentLanguage(selectedLang);
      const newCode = duel?.problem?.starter_code?.[selectedLang.id] || '';
      setUserCode(newCode);
    }
  };

  const getLoadingStatusText = () => {
    if (!duel) return t('duels.connectingToDuel');
    if (!currentLanguage) return t('duels.initializingEnvironment', 'Initializing environment...');

    switch (duel.status) {
      case DuelStatus.PENDING:
        return t('duels.waitingForOpponent');
      case DuelStatus.GENERATING_PROBLEM:
        return t('duels.waitingForProblemGeneration');
      default:
        return t('duels.loadingDuel');
    }
  };

  if (isLoading || !duel || duel.status === DuelStatus.GENERATING_PROBLEM) {
    return (
      <DuelLoadingScreen
        statusText={getLoadingStatusText()}
        player1Name={user?.username}
        player2Name={opponent?.username}
        isAiDuel={duel ? !duel.player_two_id || duel.player_two_id === 'ai' : true}
      />
    );
  }

  if (duel.status === DuelStatus.WAITING) {
    const isCurrentUserReady = (user?.id === duel.player_one_id && duel.player_one_ready) || 
                               (user?.id === duel.player_two_id && duel.player_two_ready);
    return <Lobby duel={duel} onReady={handleReady} onStart={handleStart} isPlayerReady={isCurrentUserReady} />;
  }

  if (duel.status === DuelStatus.PENDING) {
    return <WaitingLobby roomCode={duel.room_code} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="text-center text-red-400">
          <h1 className="text-2xl font-bold mb-4">{t('common.error')}</h1>
          <p>{error}</p>
          <Button onClick={() => navigate('/duels')} className="mt-4">
            {t('duels.backToDuels')}
          </Button>
        </div>
      </div>
    );
  }

  if (!currentLanguage) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <p className="text-arena-text">{t('duels.duelNotFound')}</p>
      </div>
    );
  }

  const isPVP = duel.player_two_id !== null && duel.player_two_id !== undefined && duel.player_two_id !== "ai";
  const opponentIsAi = !isPVP;

  // Parse test cases from problem
  const testCases = duel.problem?.test_cases?.filter(tc => tc.is_public) || [];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)]'} flex flex-col bg-gradient-to-br from-arena-dark via-arena-surface to-arena-dark text-white relative overflow-hidden`}>
      {/* Animated background mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/5 via-transparent to-purple-500/5 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(0,255,136,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.1)_0%,transparent_50%),radial-gradient(circle_at_0%_50%,rgba(6,182,212,0.1)_0%,transparent_50%)]"></div>
      
      {/* Top Status Bar */}
      <div className="relative z-10 h-16 md:h-20 bg-gradient-to-r from-arena-surface/95 via-arena-surface/90 to-arena-surface/95 border-b border-arena-border/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shadow-2xl">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-arena-accent/20 rounded-xl blur-lg animate-pulse"></div>
              <div className="relative p-2 md:p-3 bg-gradient-to-br from-arena-accent/20 to-arena-accent/10 rounded-xl border border-arena-accent/30">
                <Swords size={20} className="md:w-7 md:h-7 text-arena-accent drop-shadow-lg" />
              </div>
              <div className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
            </div>
            <div>
              <div className="font-bold text-lg md:text-2xl bg-gradient-to-r from-arena-accent via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                DUEL ARENA
              </div>
              <div className="text-xs md:text-sm text-arena-text-muted font-medium hidden sm:block">Live Coding Battle</div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-arena-accent/10 rounded-lg border border-arena-accent/20">
                <Target size={18} className="text-arena-accent" />
              </div>
              <span className="text-arena-text-muted font-medium">Difficulty:</span>
              <span className={`px-4 py-2 rounded-xl text-sm font-bold border backdrop-blur-sm ${
                duel.problem?.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10' :
                duel.problem?.difficulty === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/10' :
                'bg-red-500/15 text-red-400 border-red-500/30 shadow-lg shadow-red-500/10'
              }`}>
                {duel.problem?.difficulty?.toUpperCase() || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
          {/* Enhanced Timer */}
          <div className="flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 bg-gradient-to-br from-arena-dark/60 to-arena-surface/60 rounded-xl md:rounded-2xl border border-arena-border/50 backdrop-blur-lg shadow-2xl">
            <div className="p-1 md:p-2 bg-arena-accent/15 rounded-lg">
              <Clock size={16} className="md:w-5 md:h-5 text-arena-accent" />
            </div>
            <div className="text-center">
              <div className="font-mono text-lg md:text-3xl font-bold text-arena-accent leading-none tracking-wide drop-shadow-lg">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-arena-text-muted font-medium uppercase tracking-wider hidden md:block">Elapsed</div>
            </div>
          </div>
          
          {/* Enhanced Connection Status */}
          <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-arena-dark/60 to-arena-surface/60 rounded-2xl border border-arena-border/50 backdrop-blur-lg shadow-lg">
            <div className={`relative w-4 h-4 rounded-full flex-shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isConnected && (
                <>
                  <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-40"></div>
                  <div className="absolute inset-0 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></div>
                </>
              )}
              {!isConnected && <div className="absolute inset-0 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>}
            </div>
            <span className="text-sm font-semibold">
              {isConnected ? (
                <span className="text-emerald-400">Connected</span>
              ) : (
                <span className="text-red-400">Disconnected</span>
              )}
            </span>
          </div>

          {/* Enhanced AI Progress */}
          {!isPVP && (
            <div className="flex items-center gap-4 px-6 py-3 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-lg shadow-lg">
              <div className="p-2 bg-purple-500/15 rounded-lg">
                <Bot size={20} className="text-purple-400" />
              </div>
              <div className="min-w-[120px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-400">AI Progress</span>
                  <span className="text-xs text-arena-text-muted font-mono font-bold">{Math.round(aiProgress)}%</span>
                </div>
                <div className="w-28 h-2.5 bg-arena-border/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${Math.round(aiProgress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hover:bg-arena-surface/50"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <main className="flex-1 p-4 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Problem Description & Tests */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full pr-2">
              <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl h-full flex flex-col">
                {/* Tabs */}
                <div className="flex items-center border-b border-arena-border/50 bg-arena-surface rounded-t-2xl">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                      activeTab === 'description'
                        ? 'text-arena-accent'
                        : 'text-arena-text-muted hover:text-arena-text'
                    }`}
                  >
                    <FileText size={18} />
                    <span>Problem Description</span>
                    {activeTab === 'description' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-arena-accent"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('testcases')}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                      activeTab === 'testcases'
                        ? 'text-arena-accent'
                        : 'text-arena-text-muted hover:text-arena-text'
                    }`}
                  >
                    <TestTube size={18} />
                    <span>Test Cases</span>
                    {activeTab === 'testcases' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-arena-accent"></div>
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {activeTab === 'description' ? (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-4">{duel.problem?.title || 'Loading...'}</h2>
                      <div className="prose prose-invert prose-sm max-w-none">
                        {duel.problem?.description ? (
                          <div 
                            className="text-arena-text leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: duel.problem.description
                                .replace(/\n/g, '<br>')
                                .replace(/`([^`]+)`/g, '<code class="bg-arena-dark/50 px-2 py-1 rounded text-arena-accent font-mono text-sm border border-arena-accent/20">$1</code>')
                            }} 
                          />
                        ) : (
                          <div className="animate-pulse space-y-4">
                            <div className="h-5 bg-arena-dark/50 rounded w-2/3"></div>
                            <div className="h-5 bg-arena-dark/50 rounded w-full"></div>
                            <div className="h-5 bg-arena-dark/50 rounded w-1/2"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Public Test Cases</h3>
                      {testCases.length > 0 ? (
                        <div className="space-y-4">
                          {testCases.map((testCase: TestCase, index: number) => (
                            <div key={index} className="bg-arena-dark/30 rounded-xl p-4 border border-arena-border/30">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-arena-accent/20 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-bold text-arena-accent">#{index + 1}</span>
                                </div>
                                <span className="text-sm font-medium text-arena-text-muted">Test Case</span>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-arena-text-muted uppercase tracking-wider">Input:</label>
                                  <div className="mt-1 bg-arena-dark/50 rounded-lg p-3 font-mono text-sm text-white border border-arena-border/20">
                                    {testCase.input_data}
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-xs font-medium text-arena-text-muted uppercase tracking-wider">Expected Output:</label>
                                  <div className="mt-1 bg-arena-dark/50 rounded-lg p-3 font-mono text-sm text-emerald-400 border border-arena-border/20">
                                    {testCase.expected_output}
                                  </div>
                                </div>
                                
                                {testCase.explanation && (
                                  <div>
                                    <label className="text-xs font-medium text-arena-text-muted uppercase tracking-wider">Explanation:</label>
                                    <div className="mt-1 text-sm text-arena-text">
                                      {testCase.explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-arena-text-muted py-8">
                          <TestTube size={48} className="mx-auto mb-4 opacity-50" />
                          <p>No public test cases available</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <CustomResizeHandle direction="horizontal" />

          {/* Middle Panel: Code Editors */}
          <Panel defaultSize={45} minSize={30}>
            <div className="h-full px-2">
              <PanelGroup direction="vertical" className="h-full">
                {/* User Code Editor */}
                <Panel defaultSize={showOpponentCode ? 60 : 100} minSize={40}>
                  <div className="h-full pb-2">
                    <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col h-full">
                      <div className="flex items-center justify-between px-4 py-3 bg-arena-surface rounded-t-2xl border-b border-arena-border/50">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                          </div>
                          <Code2 className="w-5 h-5 text-blue-400" />
                          <span className="font-semibold text-arena-text-primary text-lg">{user?.username || 'You'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={currentLanguage?.id || ''}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="bg-arena-dark border border-arena-border text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 font-mono"
                            disabled={!supportedLanguages.length}
                          >
                            <option value="" disabled>Select Language</option>
                            {supportedLanguages.map(lang => (
                              <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <CodeEditor
                          value={userCode}
                          language={currentLanguage.id}
                          onChange={handleUserCodeChange}
                          theme="vs-dark"
                          height="100%"
                          options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 16,
                            lineHeight: 1.6,
                            padding: { top: 20, bottom: 20 },
                            smoothScrolling: true,
                            cursorBlinking: 'smooth',
                            renderLineHighlight: 'all',
                            bracketPairColorization: { enabled: true },
                            wordWrap: 'on',
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Panel>

                {showOpponentCode && (
                  <>
                    <CustomResizeHandle direction="vertical" />
                    
                    {/* Opponent Code Editor */}
                    <Panel defaultSize={40} minSize={20}>
                      <div className="h-full pt-2">
                        <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col h-full">
                          <div className="flex items-center justify-between px-4 py-3 bg-arena-surface rounded-t-2xl border-b border-arena-border/50">
                            <div className="flex items-center gap-3">
                              <div className={`relative`}>
                                <div className={`w-3 h-3 rounded-full ${opponentTyping ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                              </div>
                              {opponentIsAi ? <Bot className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-red-400" />}
                              <span className="font-semibold text-arena-text-primary text-lg">{isPVP ? opponent?.username : 'AI Opponent'}</span>
                              {opponentTyping && <span className="text-sm text-green-400 italic ml-2 animate-pulse">typing...</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {opponentIsAi && (
                                <div className="bg-arena-dark/80 px-3 py-1 rounded-lg text-sm font-mono">
                                  AI: {Math.round(aiProgress)}%
                                </div>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowOpponentCode(false)}
                                className="hover:bg-arena-surface/50"
                              >
                                <EyeOff className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 relative">
                            <CodeEditor
                              value={opponentCode}
                              language={currentLanguage.id}
                              readOnly
                              theme="vs-dark"
                              height="100%"
                              options={{
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 16,
                                lineHeight: 1.6,
                                padding: { top: 20, bottom: 20 },
                                readOnly: true,
                                wordWrap: 'on',
                                automaticLayout: true,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>

              {/* Show Opponent Button */}
              {!showOpponentCode && (
                <div className="mt-4 flex justify-center">
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowOpponentCode(true)}
                    className="bg-arena-surface/50 hover:bg-arena-surface/70 border-arena-border"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Show Opponent Code
                  </Button>
                </div>
              )}
            </div>
          </Panel>

          <CustomResizeHandle direction="horizontal" />

          {/* Right Panel: Actions & Results */}
          <Panel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full pl-2">
              <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl h-full flex flex-col p-6">
                {/* Actions */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2">Actions</h3>
                  <Button 
                    onClick={handleRunTests} 
                    disabled={duel?.status !== DuelStatus.IN_PROGRESS}
                    variant="secondary"
                    className="w-full h-12 text-base font-medium"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Run Tests
                  </Button>
                  <Button 
                    onClick={handleSubmitSolution} 
                    disabled={duel?.status !== DuelStatus.IN_PROGRESS}
                    variant="gradient"
                    className="w-full h-12 text-base font-medium"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Submit Solution
                  </Button>
                </div>

                {/* Test Results */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2 mb-4">Test Results</h3>
                  <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {submissionResult ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Enhanced Test Results Display */}
                          <div className="space-y-4">
                            {/* Overall Status */}
                            <div className={`p-4 rounded-xl border ${
                              submissionResult.is_correct 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              <div className="flex items-center gap-3">
                                {submissionResult.is_correct ? (
                                  <CheckCheck className="w-6 h-6" />
                                ) : (
                                  <XCircle className="w-6 h-6" />
                                )}
                                <span className="font-semibold text-lg">
                                  {submissionResult.is_correct ? 'All Tests Passed!' : 'Tests Failed'}
                                </span>
                              </div>
                            </div>

                            {/* Test Summary */}
                            <div className="bg-arena-dark/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-arena-text-muted uppercase tracking-wider">Test Results</h4>
                                <span className="text-sm font-mono text-arena-text">
                                  {submissionResult.passed} / {submissionResult.total} Passed
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-arena-border/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                  style={{ width: `${(submissionResult.passed / submissionResult.total) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Individual Test Details */}
                            {submissionResult.details && submissionResult.details.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-arena-text-muted uppercase tracking-wider">Test Details</h4>
                                {submissionResult.details.map((detail: string, index: number) => {
                                  const isPassed = detail.toLowerCase().includes('passed');
                                  return (
                                    <div key={index} className="bg-arena-dark/30 rounded-lg p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Test {index + 1}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          isPassed 
                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                          {isPassed ? 'PASSED' : 'FAILED'}
                                        </span>
                                      </div>
                                      {!isPassed && (
                                        <div className="text-xs text-red-400 font-mono bg-red-500/10 p-2 rounded whitespace-pre-wrap">
                                          {detail}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Compilation Error */}
                            {submissionResult.error && (
                              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
                                <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
                                  {submissionResult.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-8"
                        >
                          <TestTube size={48} className="mx-auto mb-4 text-arena-text-muted opacity-50" />
                          <p className="text-arena-text-muted">Run tests to see results here</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
};

export default DuelArenaPage;
