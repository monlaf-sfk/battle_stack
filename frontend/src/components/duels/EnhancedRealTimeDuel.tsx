import { useDuel } from '../../contexts/DuelContext';
import { ProblemDescription } from './ProblemDescription';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import SolverDispatcher from '../solvers/SolverDispatcher';
import { CodeEditor } from '../ui/CodeEditor';
import { AIOpponentStatus } from './AIOpponentStatus';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Book } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const EnhancedRealTimeDuel = () => {
    const { 
        duelState, 
        sendSolution, 
        updateCode, 
        testCode, 
        aiOpponentCode, 
        opponentIsTyping, 
        opponentTestResults, 
        aiProgressPercentage
    } = useDuel();

    const [showProblemModal, setShowProblemModal] = useState(false);
    const { t } = useTranslation();

    const handleCodeChange = (language: string, code: string) => {
        if (duelState.duel?.id) {
            updateCode(duelState.duel.id, language, code);
        }
    };

    const handleSubmit = () => {
        if (duelState.duel?.id && duelState.duel.player_one_code && duelState.duel.player_one_code_language) {
            sendSolution(duelState.duel.id, duelState.duel.player_one_code, duelState.duel.player_one_code_language);
        }
    };

    const handleTestCode = () => {
        if (duelState.duel?.id && duelState.duel.player_one_code && duelState.duel.player_one_code_language) {
            testCode(duelState.duel.id, duelState.duel.player_one_code, duelState.duel.player_one_code_language);
        }
    };

    if (!duelState.duel || !duelState.problem) {
        return <div className="text-center text-gray-400 py-20 text-lg">{t('duels.loadingDuelMessage')}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-grow h-full w-full p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-2xl border border-gray-700/50"
        >
            <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg overflow-hidden border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm glass-darker">
                <ResizablePanel defaultSize={50} minSize={30} className="p-6 flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex items-center justify-between mb-6"
                    >
                        <h2 className="text-3xl font-extrabold text-white gradient-text-safe animate-gradient">
                            {t('duels.problemDescriptionTitle')}
                        </h2>
                        <Button 
                            variant="glass" 
                            size="sm" 
                            onClick={() => setShowProblemModal(true)}
                            className="flex items-center gap-2 hover:shadow-lg transition-all duration-300"
                        >
                            <Book className="w-4 h-4 text-purple-300" /> {t('duels.fullProblemButton')}
                        </Button>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="flex-grow overflow-y-auto custom-scrollbar pr-4 text-gray-300"
                    >
                        {duelState.problem ? (
                            <ProblemDescription problem={duelState.problem} t={t} />
                        ) : (
                            <p className="text-gray-400 animate-pulse">{t('duels.generatingChallenge')}</p>
                        )}
                    </motion.div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-gray-700/50 hover:bg-purple-500 transition-colors duration-200" />
                <ResizablePanel defaultSize={50} minSize={30}>
                    <ResizablePanelGroup direction="vertical" className="h-full w-full rounded-lg overflow-hidden">
                        <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col bg-gray-800/30 backdrop-blur-sm p-4 pt-6">
                            <motion.h3
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="text-xl font-bold text-white mb-2 ml-2 gradient-text-secondary"
                            >
                                {t('duels.yourCodeTitle')}
                            </motion.h3>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="flex-grow relative border border-gray-700 rounded-lg overflow-hidden shadow-inner-dark"
                            >
                                <SolverDispatcher
                                    problem={duelState.problem}
                                    onCodeChange={handleCodeChange}
                                    onSubmit={handleSubmit}
                                    onRunTests={handleTestCode}
                                    isRunning={false}
                                    isSubmitting={false}
                                    testResults={[]}
                                />
                            </motion.div>
                        </ResizablePanel>
                        <ResizableHandle withHandle className="bg-gray-700/50 hover:bg-green-500 transition-colors duration-200" />
                        <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col bg-gray-800/30 backdrop-blur-sm p-4 pt-6">
                            <motion.h3
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.0, duration: 0.5 }}
                                className="text-xl font-bold text-white mb-2 ml-2 gradient-text-secondary"
                            >
                                {t('duels.aiOpponentCodeTitle')}
                            </motion.h3>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                                className="flex-grow relative p-2 border border-gray-700 rounded-lg overflow-hidden shadow-inner-dark"
                            >
                                <AIOpponentStatus
                                    isAIOpponent={!!duelState.duel?.player_two_id}
                                    opponentIsTyping={opponentIsTyping}
                                    opponentTestResults={opponentTestResults}
                                    getOpponentProgress={() => aiProgressPercentage}
                                    t={t}
                                />
                                <CodeEditor
                                    value={aiOpponentCode}
                                    language={duelState.duel?.player_one_code_language || 'python'}
                                    readOnly={true}
                                    height="100%"
                                    options={{
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        fontSize: 14,
                                        lineNumbers: 'off',
                                        glyphMargin: false,
                                        folding: false,
                                        lineDecorationsWidth: 0,
                                        lineNumbersMinChars: 0,
                                    }}
                                />
                            </motion.div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <Dialog open={showProblemModal} onOpenChange={setShowProblemModal}>
                    <DialogContent className="sm:max-w-[800px] w-full h-[90vh] flex flex-col bg-gray-900/90 border border-purple-500/50 rounded-xl shadow-2xl">
                        <DialogHeader className="pb-4 border-b border-gray-700/50">
                            <DialogTitle className="gradient-text text-3xl font-extrabold">
                                {duelState.problem?.title} ({t(`duel.${duelState.problem?.difficulty.toLowerCase()}`)})
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 text-gray-300">
                            {duelState.problem ? (
                                <ProblemDescription problem={duelState.problem} t={t} />
                            ) : (
                                <p className="text-gray-400">{t('duels.loadingProblemDescription')}</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </ResizablePanelGroup>
        </motion.div>
    );
};

export default EnhancedRealTimeDuel; 