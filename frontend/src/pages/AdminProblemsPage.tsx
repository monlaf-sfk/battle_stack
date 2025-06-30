import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AccessDenied } from '../components/ui/AccessDenied';
import { useAuth } from '../contexts/AuthContext';
import { ProblemCreator } from '../components/admin/ProblemCreator';
import { TagManager } from '../components/admin/TagManager';
import { CompanyManager } from '../components/admin/CompanyManager';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Search,
  FileText,
  Tag,
  Building,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Edit,
  Trash2
} from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'in_review' | 'beta' | 'published' | 'archived';
  problem_type: 'algorithm' | 'database' | 'shell' | 'concurrency';
  created_at: string;
  total_submissions: number;
  acceptance_rate: number | null;
  tags: Array<{ id: string; name: string; }>;
}

interface ProblemStats {
  total_problems: number;
  by_difficulty: Record<string, number>;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  recent_problems: number;
  top_tags: Array<{ name: string; count: number; }>;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
}

interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

const AdminProblemsPage: React.FC = () => {
  const { permissions, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<'problems' | 'tags' | 'companies'>('problems');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [filters, setFilters] = useState({
    title: '',
    difficulty: '',
    status: '',
    problem_type: ''
  });

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border border-green-500/30',
    medium: 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30',
    hard: 'text-red-400 bg-red-500/20 border border-red-500/30'
  };

  const statusColors = {
    draft: 'text-gray-400 bg-gray-500/20 border border-gray-500/30',
    in_review: 'text-blue-400 bg-blue-500/20 border border-blue-500/30',
    beta: 'text-purple-400 bg-purple-500/20 border border-purple-500/30',
    published: 'text-green-400 bg-green-500/20 border border-green-500/30',
    archived: 'text-red-400 bg-red-500/20 border border-red-500/30'
  };

  useEffect(() => {
    fetchProblems();
    fetchStats();
    fetchTags();
    fetchCompanies();
  }, [filters]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`http://localhost:8003/api/v1/admin/problems?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8003/api/v1/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('http://localhost:8003/api/v1/admin/tags', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8003/api/v1/admin/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedProblems.size === 0) return;

    try {
      const response = await fetch('http://localhost:8003/api/v1/admin/problems/bulk/status', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem_ids: Array.from(selectedProblems),
          status
        })
      });

      if (response.ok) {
        fetchProblems();
        setSelectedProblems(new Set());
      }
    } catch (error) {
      console.error('Error updating problems:', error);
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;

    try {
      const response = await fetch(`http://localhost:8003/api/v1/admin/problems/${problemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchProblems();
      }
    } catch (error) {
      console.error('Error deleting problem:', error);
    }
  };

  const toggleProblemSelection = (problemId: string) => {
    const newSelected = new Set(selectedProblems);
    if (newSelected.has(problemId)) {
      newSelected.delete(problemId);
    } else {
      newSelected.add(problemId);
    }
    setSelectedProblems(newSelected);
  };

  const handleCreateProblem = async (problemData: any) => {
    try {
      const response = await fetch('http://localhost:8003/api/v1/admin/problems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(problemData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        fetchProblems();
        fetchStats();
      } else {
        console.error('Failed to create problem');
      }
    } catch (error) {
      console.error('Error creating problem:', error);
    }
  };

  const handleEditProblem = async (problemData: any) => {
    if (!editingProblem) return;

    try {
      const response = await fetch(`http://localhost:8003/api/v1/admin/problems/${editingProblem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(problemData)
      });

      if (response.ok) {
        setEditingProblem(null);
        fetchProblems();
        fetchStats();
      } else {
        console.error('Failed to update problem');
      }
    } catch (error) {
      console.error('Error updating problem:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-arena-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!permissions?.canManageProblems) {
    return <AccessDenied />;
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-arena-accent via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Problems Admin
              </h1>
              <p className="text-gray-400 mt-2">Manage coding problems, tags, and companies</p>
            </div>
            <div className="flex items-center gap-4">
              {stats && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-arena-accent">{stats.total_problems}</div>
                    <div className="text-gray-400">Total Problems</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.recent_problems}</div>
                    <div className="text-gray-400">This Month</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg backdrop-blur-sm border border-gray-700/50">
            {[
              { id: 'problems' as const, label: 'Problems', icon: FileText },
              { id: 'tags' as const, label: 'Tags', icon: Tag },
              { id: 'companies' as const, label: 'Companies', icon: Building }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeSection === id
                    ? 'bg-arena-accent text-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats Cards */}
        {stats && activeSection === 'problems' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card variant="glass" className="group hover:scale-105 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Easy Problems</p>
                    <p className="text-2xl font-bold text-green-400">{stats.by_difficulty?.easy || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="group hover:scale-105 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Medium Problems</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.by_difficulty?.medium || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="group hover:scale-105 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Hard Problems</p>
                    <p className="text-2xl font-bold text-red-400">{stats.by_difficulty?.hard || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="group hover:scale-105 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Published</p>
                    <p className="text-2xl font-bold text-arena-accent">{stats.by_status?.published || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-arena-accent/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-arena-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Content based on active section */}
        <AnimatePresence mode="wait">
          {activeSection === 'problems' && (
            <motion.div
              key="problems"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Action Bar */}
              <Card variant="glass" className="mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={() => setShowCreateForm(true)}
                        className="bg-arena-accent text-black hover:bg-arena-accent/80 font-medium"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Problem
                      </Button>

                      {selectedProblems.size > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">
                            {selectedProblems.size} selected
                          </span>
                                                     <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleBulkStatusUpdate('published')}
                           >
                             Publish
                           </Button>
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleBulkStatusUpdate('archived')}
                           >
                             Archive
                           </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search problems..."
                          value={filters.title}
                          onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                          className="pl-10 bg-gray-900/50 border-gray-700 focus:border-arena-accent"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card variant="glass" className="mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                      <select
                        value={filters.difficulty}
                        onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-arena-accent"
                      >
                        <option value="">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-arena-accent"
                      >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="in_review">In Review</option>
                        <option value="beta">Beta</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                      <select
                        value={filters.problem_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, problem_type: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-arena-accent"
                      >
                        <option value="">All Types</option>
                        <option value="algorithm">Algorithm</option>
                        <option value="database">Database</option>
                        <option value="shell">Shell</option>
                        <option value="concurrency">Concurrency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">&nbsp;</label>
                                             <Button
                         variant="ghost"
                         onClick={() => setFilters({ title: '', difficulty: '', status: '', problem_type: '' })}
                         className="w-full"
                       >
                         Clear Filters
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Problems List */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Problems ({problems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-arena-accent border-t-transparent"></div>
                    </div>
                  ) : problems.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No problems found</p>
                      <Button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 bg-arena-accent text-black hover:bg-arena-accent/80"
                      >
                        Create Your First Problem
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {problems.map((problem, index) => (
                        <motion.div
                          key={problem.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border border-gray-700/50 rounded-lg p-4 hover:border-arena-accent/50 transition-all duration-300 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                checked={selectedProblems.has(problem.id)}
                                onChange={() => toggleProblemSelection(problem.id)}
                                className="w-4 h-4 text-arena-accent bg-gray-900 border-gray-600 rounded focus:ring-arena-accent focus:ring-2"
                              />
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-white group-hover:text-arena-accent transition-colors">
                                    {problem.title}
                                  </h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[problem.difficulty]}`}>
                                    {problem.difficulty}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[problem.status]}`}>
                                    {problem.status.replace('_', ' ')}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>#{problem.slug}</span>
                                  <span>{problem.problem_type}</span>
                                  <span>{problem.total_submissions} submissions</span>
                                  {problem.acceptance_rate && (
                                    <span>{Math.round(problem.acceptance_rate)}% acceptance</span>
                                  )}
                                  <span>{new Date(problem.created_at).toLocaleDateString()}</span>
                                </div>

                                {problem.tags && problem.tags.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {problem.tags.map(tag => (
                                      <span 
                                        key={tag.id}
                                        className="px-2 py-1 bg-gray-800/50 text-gray-300 rounded-md text-xs"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingProblem(problem)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteProblem(problem.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'tags' && (
            <motion.div
              key="tags"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
                             <TagManager
                 tags={availableTags}
                 onCreateTag={async (tagData) => {
                   try {
                     const response = await fetch('http://localhost:8003/api/v1/admin/tags', {
                       method: 'POST',
                       headers: {
                         'Authorization': `Bearer ${localStorage.getItem('token')}`,
                         'Content-Type': 'application/json'
                       },
                       body: JSON.stringify(tagData)
                     });

                     if (response.ok) {
                       fetchTags();
                     }
                   } catch (error) {
                     console.error('Error creating tag:', error);
                   }
                 }}
                 onDeleteTag={async (tagId) => {
                   try {
                     const response = await fetch(`http://localhost:8003/api/v1/admin/tags/${tagId}`, {
                       method: 'DELETE',
                       headers: {
                         'Authorization': `Bearer ${localStorage.getItem('token')}`
                       }
                     });

                     if (response.ok) {
                       fetchTags();
                     }
                   } catch (error) {
                     console.error('Error deleting tag:', error);
                   }
                 }}
                 onRefresh={fetchTags}
               />
            </motion.div>
          )}

          {activeSection === 'companies' && (
            <motion.div
              key="companies"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
                             <CompanyManager
                 companies={availableCompanies}
                 onCreateCompany={async (companyData) => {
                   try {
                     const response = await fetch('http://localhost:8003/api/v1/admin/companies', {
                       method: 'POST',
                       headers: {
                         'Authorization': `Bearer ${localStorage.getItem('token')}`,
                         'Content-Type': 'application/json'
                       },
                       body: JSON.stringify(companyData)
                     });

                     if (response.ok) {
                       fetchCompanies();
                     }
                   } catch (error) {
                     console.error('Error creating company:', error);
                   }
                 }}
                 onDeleteCompany={async (companyId) => {
                   try {
                     const response = await fetch(`http://localhost:8003/api/v1/admin/companies/${companyId}`, {
                       method: 'DELETE',
                       headers: {
                         'Authorization': `Bearer ${localStorage.getItem('token')}`
                       }
                     });

                     if (response.ok) {
                       fetchCompanies();
                     }
                   } catch (error) {
                     console.error('Error deleting company:', error);
                   }
                 }}
                 onRefresh={fetchCompanies}
               />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                                 <ProblemCreator
                   onSave={handleCreateProblem}
                   onCancel={() => setShowCreateForm(false)}
                   availableTags={availableTags}
                   availableCompanies={availableCompanies}
                 />
              </motion.div>
            </motion.div>
          )}

          {editingProblem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setEditingProblem(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                                 <ProblemCreator
                   initialData={editingProblem}
                   onSave={handleEditProblem}
                   onCancel={() => setEditingProblem(null)}
                   availableTags={availableTags}
                   availableCompanies={availableCompanies}
                 />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminProblemsPage; 