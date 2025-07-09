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
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-4 p-4 h-full overflow-hidden">
        {/* Left Column: Problem & Editors */}
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          {/* Problem Description */}
          <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex-shrink-0 overflow-hidden h-1/3">
            <div className="p-4 md:p-6 h-full flex flex-col">
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
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
          </div>

          {/* Editors */}
          <div className="flex-1 grid grid-rows-2 gap-4 h-2/3">
            {/* User Code Editor */}
            <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between p-2 bg-arena-surface rounded-t-lg border-b border-arena-border">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-arena-text-primary">{user?.username || 'You'}</span>
                </div>
                <div className="w-40">
                  <select
                    value={currentLanguage?.id || ''}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-arena-light border border-arena-border text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
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
                    minimap: { enabled: window.innerWidth > 1024 },
                    scrollBeyondLastLine: false,
                    fontSize: window.innerWidth < 768 ? 12 : 14,
                    lineHeight: 1.6,
                    padding: { top: 16, bottom: 16 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderLineHighlight: 'all',
                    bracketPairColorization: { enabled: true },
                  }}
                />
              </div>
            </div>

            {/* Opponent Code Editor */}
            <div className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between p-2 bg-arena-surface rounded-t-lg border-b border-arena-border">
                <div className="flex items-center gap-2">
                  {opponentIsAi ? <Bot className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-red-400" />}
                  <span className="font-semibold text-arena-text-primary">{isPVP ? 'Opponent' : 'AI Opponent'}</span>
                  {opponentTyping && <span className="text-xs text-arena-text-muted italic ml-2">is typing...</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowOpponentCode(!showOpponentCode)}>
                  <Eye className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 relative">
                {showOpponentCode ? (
                  <CodeEditor
                    value={opponentCode}
                    language={currentLanguage.id}
                    readOnly
                    theme="vs-dark"
                    height="100%"
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: window.innerWidth < 768 ? 12 : 14,
                      lineHeight: 1.6,
                      padding: { top: 16, bottom: 16 },
                      readOnly: true,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-arena-text-muted">
                    <p>Opponent's code is hidden.</p>
                  </div>
                )}
                {opponentIsAi && (
                  <div className="absolute top-2 right-2 z-10 bg-arena-light/80 px-2 py-1 rounded-md text-xs">
                    AI Progress: {Math.round(aiProgress)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Test Results */}
        <aside className="bg-arena-surface/90 border border-arena-border/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col p-6 gap-6">
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2">Actions</h3>
            <Button 
              onClick={handleRunTests} 
              disabled={duel?.status !== DuelStatus.IN_PROGRESS}
              variant="secondary"
            >
              <Play className="mr-2 h-4 w-4" />
              {t('coding.runTests')}
            </Button>
            <Button 
              onClick={handleSubmitSolution} 
              disabled={duel?.status !== DuelStatus.IN_PROGRESS}
              variant="gradient"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('coding.submitSolution')}
            </Button>
          </div>

          {/* Test Results */}
          <div className="flex flex-col space-y-2 flex-1 overflow-hidden">
            <h3 className="text-lg font-bold text-arena-text-primary border-b border-arena-border pb-2">Test Results</h3>
            <div className="p-2 rounded-lg bg-arena-surface/50 flex-1 overflow-y-auto">
              {submissionResult ? (
                <div className="p-4">
                  <div className={`p-4 rounded-lg border ${
                    submissionResult.passed_tests === submissionResult.total_tests && submissionResult.total_tests > 0
                      ? 'bg-emerald-900/50 border-emerald-500/30'
                      : 'bg-red-900/50 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-bold text-lg ${
                        submissionResult.passed_tests === submissionResult.total_tests && submissionResult.total_tests > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {submissionResult.status}
                      </h4>
                      <span className="text-sm font-mono text-gray-400">
                        {submissionResult.passed_tests} / {submissionResult.total_tests} passed
                      </span>
                    </div>
                    {submissionResult.error_message && (
                      <pre className="text-sm text-red-300 font-mono mt-2 bg-red-900/50 p-3 rounded-lg border border-red-500/20 overflow-auto">
                        {submissionResult.error_message}
                      </pre>
                    )}
                     <div className="text-xs text-gray-500 mt-2">
                      <span>Time: {submissionResult.execution_time}</span> | <span>Memory: {submissionResult.memory_usage}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-arena-text-muted text-sm p-4 text-center">Run tests to see the results here.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default DuelArenaPage;console.log('DuelArenaPage.tsx loaded');
