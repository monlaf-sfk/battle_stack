import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UserPlus, ListChecks, Code, Trophy, Zap, Shield, Users, Brain, Sparkles, Swords, Target } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

const useOnScreen = (options: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return [ref, isIntersecting];
};

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

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="group relative"
    whileHover={{ y: -10 }}
  >
    <Card variant="glass" hover="glow" className="border-arena-accent/20 h-full">
      <CardContent className="p-8 text-center h-full">
        <motion.div 
          className="flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-to-br from-arena-accent to-arena-tertiary text-arena-dark mx-auto mb-6 shadow-arena-glow"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-arena-text mb-4">{title}</h3>
        <p className="text-arena-text-muted leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const Step = ({ icon, title, children, index }: { icon: React.ReactNode, title: string, children: React.ReactNode, index: number }) => (
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
          className="hidden lg:block absolute top-8 -right-16 w-32 h-0.5 bg-gradient-to-r from-arena-accent/50 to-transparent"
          initial={{ width: 0 }}
          whileInView={{ width: "8rem" }}
          transition={{ delay: (index + 1) * 0.2, duration: 0.8 }}
        />
      )}
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-arena-accent to-arena-tertiary text-arena-dark mx-auto mb-4 shadow-arena-glow group-hover:shadow-xl transition-all duration-300">
        {icon}
      </div>
    </motion.div>
    <h3 className="text-xl font-bold gradient-text mb-3">{title}</h3>
    <p className="text-arena-text-muted leading-relaxed">{children}</p>
  </motion.div>
);

const player1Code = `
def is_palindrome(s):
  # Clean the string
  s = ''.join(filter(str.isalnum, s)).lower()
  # Check if it reads the same forwards and backwards
  return s == s[::-1]

print(is_palindrome("A man, a plan, a canal: Panama"))
`;

const player2Code = `
def is_palindrome(s):
  s = ''.join(e for e in s if e.isalnum()).lower()
  left, right = 0, len(s) - 1
  while left < right:
    if s[left] != s[right]:
      return False
    left += 1
    right -= 1
  return True

print(is_palindrome("A man, a plan, a canal: Panama"))
`;

const CodePanel = ({ playerName, code, speed, isPlaying, onFinish, isWinner }: { 
  playerName: string, 
  code: string, 
  speed: number, 
  isPlaying: boolean,
  onFinish: () => void,
  isWinner: boolean | null
}) => {
  const { displayedText, isDone } = useTypingEffect(code, speed, isPlaying);

  useEffect(() => {
    if (isDone) {
      onFinish();
    }
  }, [isDone, onFinish]);

  const borderColor = isWinner === true ? 'border-arena-accent shadow-arena-glow' : isWinner === false ? 'border-red-400/50' : 'border-arena-border';
  const status = isDone ? (isWinner ? 'Winner! 🏆' : 'Finished') : 'Coding...';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      <Card variant="glass" className={`border ${borderColor} overflow-hidden transition-all duration-300 h-full`}>
        <div className="bg-arena-surface/50 px-6 py-4 border-b border-arena-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-arena-accent rounded-full animate-pulse"></div>
            <p className="text-sm font-bold text-arena-text">{playerName}</p>
          </div>
          <motion.div
            className="text-xs text-arena-text-muted bg-arena-dark/50 px-3 py-1 rounded-full border border-arena-border"
            animate={{ opacity: isPlaying && !isDone ? [1, 0.5, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {status}
          </motion.div>
        </div>
        <div className="p-6">
          <pre className="text-sm font-mono text-arena-text overflow-x-auto min-h-[280px] leading-relaxed">
            <code>{displayedText}</code>
            {!isDone && isPlaying && (
              <motion.span
                className="inline-block w-2 h-4 bg-arena-accent ml-1 rounded-sm"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </pre>
        </div>
      </Card>
    </motion.div>
  );
};

const LandingPage = () => {
  const [winner, setWinner] = useState<string | null>(null);
  const [ref, isVisible] = useOnScreen({ threshold: 0.5 });
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 300], [0, 100]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    if (!isVisible) {
      setWinner(null);
    }
  }, [isVisible]);

  const handleFinish = (playerName: string) => {
    if (!winner) {
      setWinner(playerName);
    }
  };

  return (
    <div className="min-h-screen bg-arena-dark font-sans relative">
      {/* Background mesh effect */}
      <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
      
      <Header />

      <main className="pt-20 relative z-10">
        {/* Hero Section */}
        <motion.section 
          className="text-center py-20 lg:py-32 px-6 relative"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-5xl lg:text-7xl font-bold text-arena-text mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Welcome to <span className="gradient-text">BattleStack</span>
              </motion.h1>
              <motion.p 
                className="text-xl lg:text-2xl text-arena-text-muted max-w-4xl mx-auto mb-10 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Где программисты сражаются в реальном времени, решая задачи и получая мгновенную обратную связь от ИИ. 
                Поднимайтесь по рейтингу и доказывайте свое мастерство!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Button variant="gradient" className="text-xl font-bold py-4 px-8 shadow-arena-glow">
                  <Swords size={24} className="mr-3" />
                  Войти в арену
                </Button>
                <Button variant="glass" className="text-xl font-bold py-4 px-8 border border-arena-border hover:border-arena-accent/40">
                  <Target size={24} className="mr-3" />
                  Смотреть демо
                </Button>
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
              <h2 className="text-4xl lg:text-5xl font-bold gradient-text mb-6 flex items-center justify-center gap-3">
                <Sparkles size={40} className="text-arena-accent" />
                Почему BattleStack?
              </h2>
              <p className="text-xl text-arena-text-muted max-w-2xl mx-auto">
                Превратите развитие навыков в захватывающую игру
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Zap size={32} />}
                title="Битвы в реальном времени"
                description="Соревнуйтесь с разработчиками со всего мира в захватывающих дуэлях программирования."
              />
              <FeatureCard
                icon={<Brain size={32} />}
                title="ИИ-обратная связь"
                description="Получайте мгновенную, интеллектуальную обратную связь о качестве и производительности вашего кода."
              />
              <FeatureCard
                icon={<Shield size={32} />}
                title="Валидация навыков"
                description="Докажите свою экспертизу с помощью верифицированных достижений и рейтингов."
              />
              <FeatureCard
                icon={<Users size={32} />}
                title="Сообщество"
                description="Присоединяйтесь к процветающему сообществу увлеченных разработчиков."
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
              <h2 className="text-4xl lg:text-5xl font-bold gradient-text mb-6">Как это работает</h2>
              <p className="text-xl text-arena-text-muted max-w-2xl mx-auto">
                Начните за несколько простых шагов
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Step icon={<UserPlus size={32} />} title="1. Регистрация" index={0}>
                Создайте свой профиль за секунды и выберите свой стек технологий.
              </Step>
              <Step icon={<ListChecks size={32} />} title="2. Выберите задачу" index={1}>
                Выбирайте из множества задач в вашем техническом стеке.
              </Step>
              <Step icon={<Code size={32} />} title="3. Соревнуйтесь" index={2}>
                Решайте реальные задачи в ограниченной по времени среде.
              </Step>
              <Step icon={<Trophy size={32} />} title="4. Получайте фидбек" index={3}>
                Получайте мгновенную обратную связь от ИИ и поднимайтесь в рейтинге.
              </Step>
            </div>
          </div>
        </section>

        {/* Live Coding Battle Section */}
        <section ref={ref as React.RefObject<HTMLDivElement>} id="live-battle" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold gradient-text mb-6">Поединок в арене</h2>
              <p className="text-xl text-arena-text-muted max-w-2xl mx-auto">
                Почувствуйте адреналин живого программистского дуэля
              </p>
            </motion.div>
            <div className="relative max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 items-start">
                <CodePanel 
                  playerName="Игрок 1" 
                  code={player1Code} 
                  speed={100} 
                  isPlaying={!!isVisible}
                  onFinish={() => handleFinish("Player 1")}
                  isWinner={winner ? winner === "Player 1" : null}
                />
                <CodePanel 
                  playerName="Игрок 2" 
                  code={player2Code} 
                  speed={85} 
                  isPlaying={!!isVisible}
                  onFinish={() => handleFinish("Player 2")}
                  isWinner={winner ? winner === "Player 2" : null}
                />
              </div>
              <motion.div 
                className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none"
                animate={{ scale: winner ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card variant="glass" className="border-arena-accent/30 shadow-arena-glow">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold gradient-text">VS</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 relative">
          <div className="max-w-4xl mx-auto text-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold gradient-text mb-6">
                Докажите свои навыки кодом, а не резюме
              </h2>
              <p className="text-xl text-arena-text-muted mb-10 leading-relaxed">
                Готовы войти в арену и показать, на что вы способны?
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="gradient" className="text-2xl font-bold py-6 px-12 shadow-arena-glow">
                  <Trophy size={28} className="mr-3" />
                  Присоединиться бесплатно
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-arena-surface/50 backdrop-blur-md border-t border-arena-border py-8 relative z-10">
        <div className="max-w-7xl mx-auto text-center text-arena-text-muted px-6">
                      <p>&copy; {new Date().getFullYear()} BattleStack. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
