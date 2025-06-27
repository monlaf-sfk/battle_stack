import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Code, 
  Database, 
  Terminal,
  Hash,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Target,
  Star,
  Zap,
  Building2,
  Tag as TagIcon,
  Award,
  Calendar,
  Trophy,
  ChevronDown
} from 'lucide-react';
import { problemsApiService, type Problem } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { 
  type ProblemFilters,
  type ProblemDifficulty,
  type ProblemCategory,
  getDifficultyColor,
  getDifficultyBadgeColor,
  getCategoryIcon,
  getStatusColor,
  PROBLEM_DIFFICULTIES,
  PROBLEM_CATEGORIES,
  DIFFICULTY_LABELS,
  CATEGORY_LABELS
} from '../services/problemsService';

const ProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProblemFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border border-green-500/30',
    medium: 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30',
    hard: 'text-red-400 bg-red-500/20 border border-red-500/30'
  };

  const difficultyLabels = {
    easy: 'Легкий',
    medium: 'Средний', 
    hard: 'Сложный'
  };

  const typeIcons = {
    algorithm: <Code className="w-5 h-5" />,
    database: <Database className="w-5 h-5" />,
    shell: <Terminal className="w-5 h-5" />,
    concurrency: <Hash className="w-5 h-5" />
  };

  const typeLabels = {
    algorithm: 'Алгоритмы',
    database: 'База Данных',
    shell: 'Командная Строка',
    concurrency: 'Многопоточность'
  };

  const loadProblems = async () => {
    try {
      setLoading(true);
      const result = await problemsApiService.getProblems(
        { ...filters, search: searchQuery },
        currentPage,
        20
      );
      setProblems(result.problems || []);
      setTotalPages(result.total_pages || 1);
    } catch (error: any) {
      console.error('Error loading problems:', error);
      setError(error?.message || 'Unable to fetch problems');
      setProblems([]);
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

  useEffect(() => {
    loadProblems();
  }, [filters, searchQuery, currentPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: Partial<ProblemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleProblemClick = (problem: Problem) => {
    navigate(`/problems/${problem.id}`);
  };

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



  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-arena-surface/20 border-arena-border';
    }
  };

  const getStats = () => {
    // Safety check to ensure problems is an array
    const safeProblems = Array.isArray(problems) ? problems : [];
    
    const total = safeProblems.length;
    const solved = safeProblems.filter(p => p.submission_stats?.user_solved).length;
    const easy = safeProblems.filter(p => p.difficulty === 'easy').length;
    const medium = safeProblems.filter(p => p.difficulty === 'medium').length;
    const hard = safeProblems.filter(p => p.difficulty === 'hard').length;
    
    return { total, solved, easy, medium, hard };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-arena-accent border-t-transparent"></div>
          <p className="text-arena-text">Загрузка задач...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-arena-surface rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-arena-text-muted" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ошибка Загрузки Задач</h2>
          <p className="text-arena-text-muted mb-6">{error}</p>
          <Button 
            onClick={loadProblems}
            variant="gradient"
            className="mx-auto"
          >
            Попробовать Снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-dark">
      {/* Background mesh effect */}
      <div className="fixed inset-0 bg-arena-gradient-mesh opacity-30 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
                <BookOpen size={36} className="text-arena-accent" />
                Боевые Задачи
              </h1>
              <p className="text-arena-text-muted mt-2">Решайте задачи по программированию и совершенствуйте навыки в арене</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-arena-text-muted font-medium">Ваш Прогресс</div>
                <div className="text-2xl font-bold text-arena-accent mt-1">
                  {stats.solved}/{stats.total}
                </div>
                <div className="text-xs text-arena-text-muted">
                  {stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0}% завершено
                </div>
              </div>
              <div className="w-20 h-20 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    fill="transparent" 
                    className="text-arena-border" 
                  />
                  <motion.circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - stats.solved / Math.max(stats.total, 1))}`}
                    className="text-arena-accent transition-all duration-1000"
                    initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - stats.solved / Math.max(stats.total, 1)) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-arena-accent font-bold">
                    {Math.round((stats.solved / Math.max(stats.total, 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card variant="glass" hover="glow" className="border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm font-medium">Легкие</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{stats.easy}</p>
                    <p className="text-xs text-arena-text-muted mt-1">задач</p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-yellow-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Средние</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.medium}</p>
                    <p className="text-xs text-arena-text-muted mt-1">задач</p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-red-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-400 text-sm font-medium">Сложные</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{stats.hard}</p>
                    <p className="text-xs text-arena-text-muted mt-1">задач</p>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" hover="glow" className="border-arena-accent/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-arena-accent text-sm font-medium">Решено</p>
                    <p className="text-2xl font-bold text-arena-accent mt-1">{stats.solved}</p>
                    <p className="text-xs text-arena-text-muted mt-1">завершено</p>
                  </div>
                  <div className="p-3 bg-arena-accent/20 rounded-xl">
                    <Award className="h-6 w-6 text-arena-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <Card variant="glass" hover="glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} className="text-arena-accent" />
                Фильтры и Поиск
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-arena-text-muted" size={20} />
                  <input
                    type="text"
                    placeholder="Search problems..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-arena-surface border border-arena-border rounded-lg text-arena-text placeholder-arena-text-muted focus:outline-none focus:ring-2 focus:ring-arena-accent"
                  />
                </div>
                
                {/* Filter Toggle */}
                <Button
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter size={16} />
                  Filters
                  <ChevronDown 
                    size={16} 
                    className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} 
                  />
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-arena-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Difficulty Filter */}
                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Difficulty
                      </label>
                      <div className="space-y-2">
                        {PROBLEM_DIFFICULTIES.map((difficulty) => (
                          <label key={difficulty} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.difficulty?.includes(difficulty) || false}
                              onChange={(e) => {
                                const currentDifficulties = filters.difficulty || [];
                                const newDifficulties = e.target.checked
                                  ? [...currentDifficulties, difficulty]
                                  : currentDifficulties.filter(d => d !== difficulty);
                                handleFilterChange({ difficulty: newDifficulties });
                              }}
                              className="mr-2"
                            />
                            <span className={`text-sm ${getDifficultyColor(difficulty)}`}>
                              {DIFFICULTY_LABELS[difficulty]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Category
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {PROBLEM_CATEGORIES.map((category) => (
                          <label key={category} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.category?.includes(category) || false}
                              onChange={(e) => {
                                const currentCategories = filters.category || [];
                                const newCategories = e.target.checked
                                  ? [...currentCategories, category]
                                  : currentCategories.filter(c => c !== category);
                                handleFilterChange({ category: newCategories });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-arena-text">
                              {getCategoryIcon(category)} {CATEGORY_LABELS[category]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Status
                      </label>
                      <div className="space-y-2">
                        {['not_attempted', 'attempted', 'solved'].map((status) => (
                          <label key={status} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.status?.includes(status as any) || false}
                              onChange={(e) => {
                                const currentStatuses = filters.status || [];
                                const newStatuses = e.target.checked
                                  ? [...currentStatuses, status as any]
                                  : currentStatuses.filter(s => s !== status);
                                handleFilterChange({ status: newStatuses });
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-arena-text capitalize">
                              {status.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Problems List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card variant="glass" hover="glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code size={20} className="text-arena-accent" />
                Боевые Задачи ({Array.isArray(problems) ? problems.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(Array.isArray(problems) ? problems.length : 0) === 0 ? (
                                  <EmptyState
                    icon={<BookOpen className="w-10 h-10 text-arena-text-muted" />}
                    title="Нет доступных задач"
                    description="База данных задач пуста. Вернитесь позже за новыми вызовами!"
                    action={{
                      label: "Обновить",
                      onClick: loadProblems,
                      variant: "gradient"
                    }}
                  />
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(problems) ? problems : []).map((problem) => (
                    <Card 
                      key={problem.id} 
                      className="hover:bg-arena-surface/50 transition-colors cursor-pointer"
                      onClick={() => handleProblemClick(problem)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-arena-text hover:text-arena-accent transition-colors">
                                {problem.title}
                              </h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyBadgeColor(problem.difficulty)}`}>
                                {DIFFICULTY_LABELS[problem.difficulty]}
                              </span>
                              {problem.status && (
                                <span className={`text-sm ${getStatusColor(problem.status)}`}>
                                  {problem.status === 'not_attempted' ? '○' : 
                                   problem.status === 'attempted' ? '◐' : '●'}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-arena-text-muted text-sm mb-3 line-clamp-2">
                              {problem.description.substring(0, 200)}...
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-arena-text-muted">
                              <span className="flex items-center gap-1">
                                {getCategoryIcon(problem.category)}
                                {CATEGORY_LABELS[problem.category]}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {problem.time_limit}s
                              </span>
                              {problem.tags && problem.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {problem.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-2 py-1 bg-arena-surface rounded text-xs">
                                      {tag}
                                    </span>
                                  ))}
                                  {problem.tags.length > 3 && (
                                    <span className="text-arena-text-muted">+{problem.tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {problem.user_attempts !== undefined && (
                            <div className="text-right text-sm text-arena-text-muted">
                              <div>{problem.user_attempts} attempts</div>
                              {problem.best_submission && (
                                <div className="text-green-400">
                                  Best: {problem.best_submission.execution_time_ms}ms
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                variant="ghost"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsPage; 