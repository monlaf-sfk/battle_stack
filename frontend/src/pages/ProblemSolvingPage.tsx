import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CodeEditor, LanguageSelector, ThemeToggle } from '../components/ui/CodeEditor';
import { 
  Play, 
  Send, 
  TestTube, 
  ChevronLeft,
  Clock,
  MemoryStick,
  CheckCircle,
  XCircle,
  AlertCircle,
  Code,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { problemsApiService, type Problem, type TestResult } from '../services/api';

const ProblemSolvingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');
  const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'submissions'>('description');
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20 border border-green-500/30',
    medium: 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30',
    hard: 'text-red-400 bg-red-500/20 border border-red-500/30'
  };

  useEffect(() => {
    if (slug) {
      fetchProblem();
    }
  }, [slug]);

  useEffect(() => {
    if (problem?.code_templates) {
      const template = problem.code_templates.find(t => t.language === selectedLanguage);
      if (template) {
        setCode(template.template_code);
      }
    }
  }, [selectedLanguage, problem]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!slug) {
        setError('Problem slug is missing');
        return;
      }

      const response = await problemsApiService.getProblem(slug);
      setProblem(response.data);
      
    } catch (error: any) {
      console.error('Error fetching problem:', error);
      setError(error.response?.data?.detail || 'Failed to load problem. Please check if the problems service is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async () => {
    if (!slug || !problem) return;
    
    setIsRunning(true);
    setTestResults([]);

    try {
      const response = await problemsApiService.runTests(slug, selectedLanguage, code);
      setTestResults(response.data.results || []);
      
    } catch (error: any) {
      console.error('Error running tests:', error);
      setTestResults([{
        input_data: '',
        expected_output: '',
        actual_output: '',
        passed: false,
        error: error.response?.data?.detail || 'Failed to run tests. Please check if the problems service is running.'
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!slug || !problem) return;
    
    setIsSubmitting(true);

    try {
      const response = await problemsApiService.submitSolution(slug, selectedLanguage, code);
      
      if (response.data.all_passed) {
        alert('🎉 Congratulations! All tests passed!\n\nYour solution has been submitted successfully.');
        navigate('/problems');
      } else {
        setTestResults(response.data.results || []);
      }
      
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      setTestResults([{
        input_data: '',
        expected_output: '',
        actual_output: '',
        passed: false,
        error: error.response?.data?.detail || 'Failed to submit solution. Please check if the problems service is running.'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-arena-text-muted';
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-arena-accent mx-auto mb-4"></div>
          <p className="text-arena-text-muted">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 text-center glass border-red-500/20 max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Problem</h2>
          <p className="text-arena-text-muted mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={fetchProblem}
              variant="gradient"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/problems')}
              variant="outline"
            >
              Back to Problems
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <FileText className="mx-auto mb-4 text-arena-text-muted" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Problem Not Found</h2>
          <p className="text-arena-text-muted mb-6">The problem you're looking for doesn't exist or has been moved.</p>
          <Button 
            onClick={() => navigate('/problems')}
            variant="gradient"
          >
            Back to Problems
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-arena-border bg-arena-surface/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/problems')}
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-arena-text">{problem.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyBg(problem.difficulty)} ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                {problem.tags.slice(0, 3).map(tag => (
                  <span key={tag.id} className="px-2 py-1 bg-arena-accent/10 text-arena-accent rounded-md text-xs">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {problem.time_limit_ms && (
              <div className="flex items-center gap-1 text-arena-text-muted">
                <Clock size={16} />
                <span className="text-sm">{problem.time_limit_ms}ms</span>
              </div>
            )}
            {problem.memory_limit_mb && (
              <div className="flex items-center gap-1 text-arena-text-muted">
                <MemoryStick size={16} />
                <span className="text-sm">{problem.memory_limit_mb}MB</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r border-arena-border flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-arena-text leading-relaxed">
                {problem.description}
              </div>
            </div>
            
            {/* Example Test Cases */}
            {problem.test_cases && problem.test_cases.filter(tc => tc.is_example).length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-arena-text mb-4">Examples</h3>
                <div className="space-y-4">
                  {problem.test_cases.filter(tc => tc.is_example).map((testCase, index) => (
                    <Card key={index} className="bg-arena-surface/50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-arena-text-muted">Input:</span>
                            <pre className="bg-arena-dark p-2 rounded mt-1 text-sm text-arena-text font-mono overflow-x-auto">
                              {testCase.input_data}
                            </pre>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-arena-text-muted">Output:</span>
                            <pre className="bg-arena-dark p-2 rounded mt-1 text-sm text-arena-text font-mono overflow-x-auto">
                              {testCase.expected_output}
                            </pre>
                          </div>
                          {testCase.explanation && (
                            <div>
                              <span className="text-sm font-medium text-arena-text-muted">Explanation:</span>
                              <p className="text-sm text-arena-text mt-1">{testCase.explanation}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Hints */}
            {problem.hints && problem.hints.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="text-yellow-400" size={20} />
                  <h3 className="text-lg font-semibold text-arena-text">Hints</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHints(!showHints)}
                  >
                    {showHints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {showHints && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      {problem.hints.slice(0, currentHint + 1).map((hint, index) => (
                        <Card key={index} className="bg-yellow-500/5 border-yellow-500/20">
                          <CardContent className="p-3">
                            <p className="text-sm text-arena-text">
                              <span className="font-medium text-yellow-400">Hint {index + 1}:</span> {hint}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {currentHint < problem.hints.length - 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentHint(prev => prev + 1)}
                          className="w-full"
                        >
                          Show Next Hint
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Language Selector */}
          <div className="border-b border-arena-border p-4 bg-arena-surface/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code size={20} className="text-arena-accent" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-arena-dark border border-arena-border rounded-lg px-3 py-2 text-arena-text"
                >
                  {problem.code_templates?.map(template => (
                    <option key={template.language} value={template.language}>
                      {template.language.charAt(0).toUpperCase() + template.language.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRunTests}
                  disabled={isRunning || isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Play size={16} />
                  {isRunning ? 'Running...' : 'Run Tests'}
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleSubmit}
                  disabled={isRunning || isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Send size={16} />
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 bg-arena-dark">
            <CodeEditor
              language={selectedLanguage}
              value={code}
              onChange={setCode}
              height="100%"
            />
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="border-t border-arena-border bg-arena-surface/30 p-4 max-h-64 overflow-y-auto">
              <h3 className="text-lg font-semibold text-arena-text mb-3">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <Card 
                    key={index} 
                    className={`${result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                          Test Case {index + 1}: {result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        {result.runtime_ms && (
                          <span className="text-xs text-arena-text-muted">
                            {result.runtime_ms}ms
                          </span>
                        )}
                      </div>
                      
                      {!result.passed && (
                        <div className="space-y-2 text-xs">
                          {result.error ? (
                            <div>
                              <span className="text-red-400 font-medium">Error:</span>
                              <div className="text-arena-text-muted mt-1">{result.error}</div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-arena-text-muted">Input:</span>
                                <div className="text-arena-text font-mono">{result.input_data}</div>
                              </div>
                              <div>
                                <span className="text-arena-text-muted">Expected:</span>
                                <div className="text-arena-text font-mono">{result.expected_output}</div>
                              </div>
                              <div>
                                <span className="text-arena-text-muted">Got:</span>
                                <div className="text-arena-text font-mono">{result.actual_output}</div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemSolvingPage; 