import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code, 
  Hash,
  BookOpen,
  Target,
  Trophy,
  ArrowLeft,
  Star,
  Brain,
  Network,
  Binary,
  GitBranch,
  Layers,
  Shuffle
} from 'lucide-react';
import { problemsApiService, type Problem } from '../services/api';
import { useToast } from '../components/ui/Toast';

interface ProblemCategoryCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  count?: number;
}

const ProblemCategoryCard: React.FC<ProblemCategoryCardProps> = ({
  title,
  subtitle,
  description,
  icon,
  onClick,
  count
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-lg p-8 cursor-pointer transition-all duration-200 hover:border-gray-700"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="text-white">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-wider text-white">
            {title}
          </div>
          {count !== undefined && (
            <div className="text-sm text-gray-400 font-mono">
              {count} PROBLEMS
            </div>
          )}
        </div>
      </div>
      
      <div className="text-lg font-bold font-mono text-white mb-2 tracking-wide">
        {subtitle}
      </div>
      
      <div className="text-gray-400 font-mono text-sm">
        {description}
      </div>
    </motion.div>
  );
};

const ProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        setLoading(true);
        const result = await problemsApiService.getProblems({}, 1, 100);
        setProblems(result.problems || []);
      } catch (error: any) {
        console.error('Error loading problems:', error);
        addToast({
          type: 'error',
          title: 'Failed to load problems',
          message: error?.message || 'Unable to fetch problems',
          duration: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, [addToast]);

  const handleRandomProblem = async () => {
    try {
      const problem = await problemsApiService.getRandomProblem();
      navigate(`/problems/${problem.id}`);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to get random problem',
        message: error?.message || 'Unable to fetch random problem',
        duration: 5000,
      });
    }
  };

  const handleCategoryClick = (category: string) => {
    // Navigate to problems with category filter
    navigate(`/problems/list?category=${category}`);
  };

  const handleDifficultyClick = (difficulty: string) => {
    // Navigate to problems with difficulty filter
    navigate(`/problems/list?difficulty=${difficulty}`);
  };

  // Calculate stats from problems
  const stats = problems.reduce((acc, problem) => {
    acc.total++;
    if (problem.submission_stats?.user_solved) acc.solved++;
    
    // Count by difficulty
    if (problem.difficulty === 'easy') acc.easy++;
    else if (problem.difficulty === 'medium') acc.medium++;
    else if (problem.difficulty === 'hard') acc.hard++;
    
    // Count by category (simplified)
    const category = problem.type || 'algorithm';
    acc.categories[category] = (acc.categories[category] || 0) + 1;
    
    return acc;
  }, { 
    total: 0, 
    solved: 0, 
    easy: 0, 
    medium: 0, 
    hard: 0,
    categories: {} as Record<string, number>
  });

  const problemCategories = [
    {
      title: "ALG",
      subtitle: "ALGORITHMS",
      description: "CLASSIC ALGORITHMIC CHALLENGES",
      icon: <Brain size={32} />,
      onClick: () => handleCategoryClick('algorithm'),
      count: stats.categories['algorithm'] || 0
    },
    {
      title: "DS",
      subtitle: "DATA STRUCTURES",
      description: "ARRAYS, TREES, GRAPHS AND MORE",
      icon: <Layers size={32} />,
      onClick: () => handleCategoryClick('data_structure'),
      count: stats.categories['data_structure'] || 0
    },
    {
      title: "DP",
      subtitle: "DYNAMIC PROGRAMMING",
      description: "OPTIMIZATION AND MEMOIZATION",
      icon: <GitBranch size={32} />,
      onClick: () => handleCategoryClick('dynamic_programming'),
      count: stats.categories['dynamic_programming'] || 0
    },
    {
      title: "GR",
      subtitle: "GRAPH THEORY",
      description: "PATHS, CYCLES AND CONNECTIVITY",
      icon: <Network size={32} />,
      onClick: () => handleCategoryClick('graph'),
      count: stats.categories['graph'] || 0
    },
    {
      title: "STR",
      subtitle: "STRING PROBLEMS",
      description: "PATTERN MATCHING AND PARSING",
      icon: <Hash size={32} />,
      onClick: () => handleCategoryClick('string'),
      count: stats.categories['string'] || 0
    },
    {
      title: "BIT",
      subtitle: "BIT MANIPULATION",
      description: "BITWISE OPERATIONS AND TRICKS",
      icon: <Binary size={32} />,
      onClick: () => handleCategoryClick('bit_manipulation'),
      count: stats.categories['bit_manipulation'] || 0
    }
  ];

  const difficultyLevels = [
    {
      title: "EZ",
      subtitle: "EASY LEVEL",
      description: "BEGINNER FRIENDLY CHALLENGES",
      icon: <Star size={32} />,
      onClick: () => handleDifficultyClick('easy'),
      count: stats.easy
    },
    {
      title: "MD",
      subtitle: "MEDIUM LEVEL",
      description: "INTERMEDIATE PROGRAMMING SKILLS",
      icon: <Target size={32} />,
      onClick: () => handleDifficultyClick('medium'),
      count: stats.medium
    },
    {
      title: "HD",
      subtitle: "HARD LEVEL",
      description: "EXPERT LEVEL PROGRAMMING",
      icon: <Trophy size={32} />,
      onClick: () => handleDifficultyClick('hard'),
      count: stats.hard
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-8"
      >
        <motion.button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={20} />
          BACK TO DASHBOARD
        </motion.button>
        
        <motion.div 
          className="flex items-center gap-8 text-sm font-medium tracking-wider"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <a href="/dashboard" className="hover:text-gray-300 transition-colors">DASHBOARD</a>
          <a href="/quick-duel" className="hover:text-gray-300 transition-colors">BATTLE</a>
          <span className="text-gray-500">PROBLEMS</span>
          <a href="/profile" className="hover:text-gray-300 transition-colors">PROFILE</a>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-8 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 font-mono tracking-wider">
            PROBLEMS
          </h1>
          <p className="text-xl text-gray-400 font-mono">
            CHOOSE YOUR CODING CHALLENGE
          </p>
        </motion.div>

        {/* Progress Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-center"
        >
          <div>
            <div className="text-3xl font-bold mb-1 font-mono">{stats.total}</div>
            <div className="text-gray-400 text-sm font-mono tracking-wider">TOTAL</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1 font-mono">{stats.solved}</div>
            <div className="text-gray-400 text-sm font-mono tracking-wider">SOLVED</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1 font-mono">
              {Math.round((stats.solved / Math.max(stats.total, 1)) * 100)}%
            </div>
            <div className="text-gray-400 text-sm font-mono tracking-wider">COMPLETION</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1 font-mono">{stats.total - stats.solved}</div>
            <div className="text-gray-400 text-sm font-mono tracking-wider">REMAINING</div>
          </div>
        </motion.div>

        {/* Difficulty Levels */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-12 w-full max-w-6xl"
        >
          <h2 className="text-2xl font-bold mb-6 font-mono text-center">
            DIFFICULTY LEVELS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {difficultyLevels.map((level, index) => (
              <motion.div
                key={level.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <ProblemCategoryCard {...level} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Problem Categories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mb-12 w-full max-w-6xl"
        >
          <h2 className="text-2xl font-bold mb-6 font-mono text-center">
            PROBLEM CATEGORIES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problemCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <ProblemCategoryCard {...category} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Special Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full"
        >
          <ProblemCategoryCard
            title="RND"
            subtitle="RANDOM PROBLEM"
            description="SURPRISE CHALLENGE FOR BRAVE CODERS"
            icon={<Shuffle size={32} />}
            onClick={handleRandomProblem}
          />
          <ProblemCategoryCard
            title="ALL"
            subtitle="ALL PROBLEMS"
            description="BROWSE THE COMPLETE COLLECTION"
            icon={<BookOpen size={32} />}
            onClick={() => navigate('/problems/list')}
            count={stats.total}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-center py-8 text-gray-600 text-xs tracking-wider border-t border-gray-900"
      >
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:text-gray-400 transition-colors">TERMS OF USE</a>
          <a href="#" className="hover:text-gray-400 transition-colors">PRIVACY POLICY</a>
          <a href="#" className="hover:text-gray-400 transition-colors">RULES</a>
        </div>
      </motion.div>
    </div>
  );
};

export default ProblemsPage; 