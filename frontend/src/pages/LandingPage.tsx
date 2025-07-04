import { Header } from "@/components/layout/Header";
import { UserPlus, ListChecks, Code, Trophy, Timer, Shield, Users, Brain, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const useTypingEffect = (text: string, speed: number, isPlaying: boolean) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
        setDisplayedText("");
        setIsDone(false);
        return;
    };

    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        setIsDone(true);
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, isPlaying]);

  return { displayedText, isDone };
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative"
      whileHover={{ y: -10 }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-full text-center">
        <motion.div 
          className="flex items-center justify-center h-16 w-16 rounded-lg bg-white text-black mx-auto mb-6"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-white mb-4 font-mono">{t(title)}</h3>
        <p className="text-gray-400 leading-relaxed font-mono text-sm">{t(description)}</p>
      </div>
    </motion.div>
  );
};

const Step = ({ icon, title, children, index }: { icon: React.ReactNode, title: string, children: React.ReactNode, index: number }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="text-center relative group"
    >
      <motion.div
        className="relative"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {index < 3 && (
          <motion.div 
            className="hidden lg:block absolute top-8 -right-16 w-32 h-0.5 bg-gray-700"
            initial={{ width: 0 }}
            whileInView={{ width: "8rem" }}
            transition={{ delay: (index + 1) * 0.2, duration: 0.8 }}
          />
        )}
        <div className="flex items-center justify-center h-16 w-16 rounded-lg bg-white text-black mx-auto mb-4 group-hover:shadow-xl transition-all duration-300">
          {icon}
        </div>
      </motion.div>
      <h3 className="text-xl font-bold text-white mb-3 font-mono">{t(title)}</h3>
      <p className="text-gray-400 leading-relaxed font-mono text-sm">{t(children as string)}</p>
    </motion.div>
  );
};

const player1Code = `# CODE WARRIOR 1
def solve_problem(arr, target):
    # Two pointer approach
    left, right = 0, len(arr) - 1
    result = []
    
    while left < right:
        current_sum = arr[left] + arr[right]
        if current_sum == target:
            result.append([left, right])
            left += 1
            right -= 1
        elif current_sum < target:
            left += 1
        else:
            right -= 1
    
    return result

# PROBLEMS SOLVED: 83
# WPM: 120
`;

const player2Code = `# AI OPPONENT  
def optimal_solution(nums, k):
    # Dynamic programming approach
    dp = [float('inf')] * (k + 1)
    dp[0] = 0
    
    for num in nums:
        for i in range(k, num - 1, -1):
            if dp[i - num] != float('inf'):
                dp[i] = min(dp[i], dp[i - num] + 1)
    
    return dp[k] if dp[k] != float('inf') else -1

# Neural network optimized
# Time: O(n*k), Space: O(k)

# PROBLEMS SOLVED: 75
# WPM: 95
`;

const CodePanel = ({ playerName, code, speed, isPlaying, onFinish, isWinner, stats }: { 
  playerName: string, 
  code: string, 
  speed: number, 
  isPlaying: boolean,
  onFinish: () => void,
  isWinner: boolean | null,
  stats: { pieces: number, attack: string, speed: string }
}) => {
  const { displayedText, isDone } = useTypingEffect(code, speed, isPlaying);
  const { t } = useTranslation();

  useEffect(() => {
    if (isDone) {
      onFinish();
    }
  }, [isDone, onFinish]);

  const borderColor = isWinner === true ? 'border-white' : isWinner === false ? 'border-gray-600' : 'border-gray-800';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      <div className={`bg-gray-900 border ${borderColor} rounded-lg overflow-hidden transition-all duration-300 h-full`}>
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isWinner === true ? 'bg-white' : isWinner === false ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
            <p className="text-sm font-bold text-white font-mono">{t(playerName)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded border border-gray-700 font-mono">
              {isDone ? (isWinner ? t('landingPage.winnerStatus') : t('landingPage.doneStatus')) : t('landingPage.codingStatus')}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-gray-400 text-xs font-mono">{t('landingPage.pieces')}</div>
              <div className="text-white text-lg font-bold font-mono">{stats.pieces}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs font-mono">{t('landingPage.speed')}</div>
              <div className="text-white text-lg font-bold font-mono">{stats.speed}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs font-mono">{t('landingPage.attack')}</div>
              <div className="text-white text-lg font-bold font-mono">{stats.attack}</div>
            </div>
          </div>
        </div>

        {/* Code Area */}
        <div className="p-6">
          <pre className="text-sm font-mono text-white overflow-x-auto min-h-[280px] leading-relaxed">
            <code>{displayedText}</code>
            {!isDone && isPlaying && (
              <motion.span
                className="inline-block w-2 h-4 bg-white ml-1 rounded-sm"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </pre>
        </div>
      </div>
    </motion.div>
  );
};

const LandingPage = () => {
  const [winner, setWinner] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!winner) {
      setWinner(null);
    }
  }, [winner]);

  const handleFinish = (playerName: string) => {
    if (!winner) {
      setWinner(playerName);
    }
  };

  const player1Stats = { pieces: 83, attack: "120 WPM", speed: "0.55/S" };
  const player2Stats = { pieces: 75, attack: "95 WPM", speed: "0.50/S" };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="pt-20 relative">
        {/* Hero Section */}
        <motion.section 
          className="text-center py-20 lg:py-32 px-6 relative"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gray-900 border border-gray-800 rounded-lg p-12"
            >
              <motion.h1 
                className="text-5xl lg:text-7xl font-bold text-white mb-6 font-mono"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {t('header.title')}
              </motion.h1>
              <motion.p 
                className="text-xl lg:text-2xl text-gray-400 max-w-4xl mx-auto mb-10 leading-relaxed font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {t('landingPage.heroSubtitle1')}<br/>
                {t('landingPage.heroSubtitle2')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-black text-xl font-bold py-4 px-8 rounded-lg font-mono"
                  onClick={() => navigate('/quick-duel')}
                >
                  {t('landingPage.enterArena')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-800 text-white text-xl font-bold py-4 px-8 rounded-lg font-mono border border-gray-700 hover:border-gray-600 transition-colors"
                  onClick={() => navigate('/duel/pve/:duelId')}
                >
                  <Play size={24} className="mr-3 inline" />
                  {t('landingPage.watchDemo')}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <section id="features" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-mono">
                {t('landingPage.featuresTitle')}
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-mono">
                {t('landingPage.featuresSubtitle')}
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Timer size={32} />}
                title="landingPage.realTimeBattlesTitle"
                description="landingPage.realTimeBattlesDesc"
              />
              <FeatureCard
                icon={<Brain size={32} />}
                title="landingPage.aiCoachingTitle"
                description="landingPage.aiCoachingDesc"
              />
              <FeatureCard
                icon={<Shield size={32} />}
                title="landingPage.skillValidationTitle"
                description="landingPage.skillValidationDesc"
              />
              <FeatureCard
                icon={<Users size={32} />}
                title="landingPage.devCommunityTitle"
                description="landingPage.devCommunityDesc"
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-mono">
                {t('landingPage.howItWorksTitle')}
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-mono">
                {t('landingPage.howItWorksSubtitle')}
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Step icon={<UserPlus size={32} />} title="landingPage.signUpTitle" index={0}>
                landingPage.signUpDesc
              </Step>
              <Step icon={<ListChecks size={32} />} title="landingPage.chooseLevelTitle" index={1}>
                landingPage.chooseLevelDesc
              </Step>
              <Step icon={<Code size={32} />} title="landingPage.codeBattleTitle" index={2}>
                landingPage.codeBattleDesc
              </Step>
              <Step icon={<Trophy size={32} />} title="landingPage.winGrowTitle" index={3}>
                landingPage.winGrowDesc
              </Step>
            </div>
          </div>
        </section>

        {/* Live Coding Battle Section */}
        <section id="live-battle" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-mono">
                {t('landingPage.liveBattleTitle')}
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-mono">
                {t('landingPage.liveBattleSubtitle')}
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <CodePanel
                playerName="landingPage.codeWarrior1"
                code={player1Code}
                speed={80}
                isPlaying={winner === null}
                onFinish={() => handleFinish("Player 1")}
                isWinner={winner === "Player 1" ? true : winner ? false : null}
                stats={player1Stats}
              />
              <CodePanel
                playerName="landingPage.aiOpponent"
                code={player2Code}
                speed={100}
                isPlaying={winner === null}
                onFinish={() => handleFinish("Player 2")}
                isWinner={winner === "Player 2" ? true : winner ? false : null}
                stats={player2Stats}
              />
            </div>

            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="text-2xl font-bold text-white mb-2 font-mono">
                    {winner === "Player 1" ? t('landingPage.codeWarriorWins') : t('landingPage.aiWins')}
                  </h3>
                  <p className="text-gray-400 font-mono">
                    {t('landingPage.battleComplete')}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-gray-900 border border-gray-800 rounded-lg p-12"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-mono">
                {t('landingPage.readyToBattleTitle')}
              </h2>
              <p className="text-xl text-gray-400 mb-8 font-mono">
                {t('landingPage.readyToBattleSubtitle')}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black text-xl font-bold py-4 px-8 rounded-lg font-mono"
                onClick={() => navigate('/quick-duel')}
              >
                {t('landingPage.startCodingNow')}
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
