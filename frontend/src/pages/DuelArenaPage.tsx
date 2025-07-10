import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { Swords, CheckCircle, Clock, User, Bot, Target, Eye, Play } from 'lucide-react';
import { useDuel } from '@/hooks/useDuelManager';
import { DuelStatus } from '@/services/duelService';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { Button } from '@/components/ui/Button';
import DuelLoadingScreen from '@/components/duels/DuelLoadingScreen';
import { codeExecutionService } from '@/services/codeExecutionService';
import type { SupportedLanguage } from '@/services/codeExecutionService';
import { useLayout } from '@/contexts/LayoutContext';
import { AnimatePresence, motion } from 'framer-motion';
import SubmissionResult from '@/components/coding/SubmissionResult';

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
  } = useDuel();

  const [userCode, setUserCode] = useState<string>('');
  const [showOpponentCode, setShowOpponentCode] = useState(true);
  const [showProblemPanel, setShowProblemPanel] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);

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
      connect(duelId); // Connect to WebSocket
    } else if (!isAuthenticated) {
      // If not authenticated, redirect to login
      addToast({
        type: 'info',
        title: t('duels.loginToStartDuelTitle'),
        message: t('duels.loginToStartDuel'),
      });
      navigate('/login');
    }

    return () => {
      disconnect(); // Disconnect WebSocket on unmount
    };
  }, [duelId, isAuthenticated, user?.id, navigate, addToast, t, connect, disconnect]);

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
      const initialCode = duel.problem.starter_code?.[currentLanguage.id] || '';
      setUserCode(initialCode);
    }
  }, [duel?.problem, currentLanguage, userCode]);

  // Navigate to completion screen when duel is completed
  useEffect(() => {
    if (duel?.status === DuelStatus.COMPLETED || duel?.status === DuelStatus.TIMED_OUT) {
      navigate(`/duel/${duelId}/complete`);
    }
  }, [duel?.status, duelId, navigate]);

  const handleUserCodeChange = useCallback((code: string | undefined) => {
    setUserCode(code || '');
    if (currentLanguage) {
      sendCodeUpdate(code || '', currentLanguage);
    }
  }, [sendCodeUpdate, currentLanguage]);

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

  if (isLoading || !duel || !duel.problem || !currentLanguage || duel.status === DuelStatus.PENDING || duel.status === DuelStatus.GENERATING_PROBLEM) {
    return (
      <DuelLoadingScreen
        statusText={getLoadingStatusText()}
        player1Name={user?.username}
        isAiDuel={duel ? !duel.player_two_id || duel.player_two_id === 'ai' : true}
      />
    );
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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gradient-to-br from-arena-dark via-arena-surface to-arena-dark text-white relative overflow-hidden">
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
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-4 p-4 h-full overflow-hidden">
        {/* Problem Description - Collapsible */}
        {showProblemPanel && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex-shrink-0 overflow-hidden max-h-72"
          >
            <div className="p-4 md:p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-arena-accent/20 rounded-xl blur-md"></div>
                    <div className="relative p-2 md:p-3 bg-gradient-to-br from-arena-accent/15 to-arena-accent/5 rounded-xl border border-arena-accent/30">
                      <Target size={20} className="md:w-6 md:h-6 text-arena-accent" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-bold text-xl md:text-2xl text-white">{duel.problem?.title || 'Loading...'}</h2>
                    <p className="text-sm text-arena-text-muted font-medium">Solve to win the duel</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowProblemPanel(false)}
                  className="hover:bg-arena-surface/50"
                >
                  <Eye className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
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
            </div>
          </motion.div>
        )}

        {/* Button to show problem if hidden */}
        {!showProblemPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <Button 
              variant="secondary" 
              onClick={() => setShowProblemPanel(true)}
              className="bg-arena-surface/50 hover:bg-arena-surface/70 border-arena-border"
            >
              <Target className="w-4 h-4 mr-2" />
              {t('duels.showProblem')}
            </Button>
          </motion.div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 h-full overflow-hidden">
          {/* Left: Code Editors */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* User Code Editor - Now takes more space */}
            <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col h-3/5">
              <div className="flex items-center justify-between p-3 bg-arena-surface rounded-t-2xl border-b border-arena-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-arena-text-primary text-lg">{user?.username || 'You'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <select
                      value={currentLanguage?.id || ''}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-arena-dark border border-arena-border text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 font-mono"
                      disabled={!supportedLanguages.length}
                    >
                      <option value="" disabled>Select Language</option>
                      {supportedLanguages.map(lang => (
                        <option key={lang.id} value={lang.id}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
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
                    minimap: { enabled: window.innerWidth > 1400 },
                    scrollBeyondLastLine: false,
                    fontSize: window.innerWidth < 768 ? 14 : 16,
                    lineHeight: 1.6,
                    padding: { top: 20, bottom: 20 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderLineHighlight: 'all',
                    bracketPairColorization: { enabled: true },
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>

            {/* Opponent Code Editor - Collapsible */}
            {showOpponentCode && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col h-2/5"
              >
                <div className="flex items-center justify-between p-3 bg-arena-surface rounded-t-2xl border-b border-arena-border/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${opponentTyping ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    {opponentIsAi ? <Bot className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-red-400" />}
                    <span className="font-semibold text-arena-text-primary text-lg">{isPVP ? 'Opponent' : 'AI Opponent'}</span>
                    {opponentTyping && <span className="text-sm text-green-400 italic ml-2 animate-pulse">typing...</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {opponentIsAi && (
                      <div className="bg-arena-dark/80 px-3 py-1 rounded-lg text-sm font-mono">
                        AI: {Math.round(aiProgress)}%
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowOpponentCode(false)}>
                      <Eye className="w-5 h-5" />
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
                      fontSize: window.innerWidth < 768 ? 14 : 16,
                      lineHeight: 1.6,
                      padding: { top: 20, bottom: 20 },
                      readOnly: true,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Button to show opponent if hidden */}
            {!showOpponentCode && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <Button 
                  variant="secondary" 
                  onClick={() => setShowOpponentCode(true)}
                  className="bg-arena-surface/50 hover:bg-arena-surface/70 border-arena-border"
                >
                  {opponentIsAi ? <Bot className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                  {t('duels.showOpponent')}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Right: Actions & Test Results */}
          <aside className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col p-6 gap-6">
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2">{t('duels.actions')}</h3>
              <Button 
                onClick={handleRunTests} 
                disabled={duel?.status !== DuelStatus.IN_PROGRESS}
                variant="secondary"
                className="h-12 text-base font-medium"
              >
                <Play className="mr-2 h-5 w-5" />
                {t('coding.runTests')}
              </Button>
              <Button 
                onClick={handleSubmitSolution} 
                disabled={duel?.status !== DuelStatus.IN_PROGRESS}
                variant="gradient"
                className="h-12 text-base font-medium"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                {t('coding.submitSolution')}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2 mb-4">{t('duels.testResults')}</h3>
              <AnimatePresence mode="wait">
                <motion.div
                  key={submissionResult ? 'result' : 'prompt'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SubmissionResult result={submissionResult} t={t} />
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default DuelArenaPage;
