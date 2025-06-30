import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Clock,
  MemoryStick,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { SolverDispatcher } from '../components/solvers/SolverDispatcher';
import { problemsApiService, type Problem, type SubmissionResult, type ProblemSubmission } from '../services/problemsService';
import { type TestResult as DuelTestResult } from '../types/duel.types';

// Type for test results from testSolution API
type TestSolutionResult = {
  test_case: number;
  status: 'passed' | 'failed';
  execution_time_ms: number;
  input: string;
  expected: string;
  actual: string;
  error?: string;
};

// Convert Problem to DuelProblem format
const convertToDuelProblem = (problem: Problem) => ({
  id: problem.id,
  title: problem.title,
  description: problem.description,
  difficulty: problem.difficulty,
  test_cases: problem.test_cases?.map(tc => ({
    input_data: tc.input || '',
    expected_output: tc.expected_output,
    is_hidden: tc.is_hidden
  })) || [],
  starter_code: problem.starter_code || {},
  code_templates: Object.entries(problem.starter_code || {}).map(([language, code]) => ({
    language,
    template_code: code
  }))
});

// Convert test results to DuelTestResult format
const convertTestResults = (results: TestSolutionResult[]): DuelTestResult[] => {
  return results.map((result, index) => ({
    type: 'test_result' as const,
    user_id: 'current_user',
    passed: result.status === 'passed' ? 1 : 0,
    failed: result.status === 'failed' ? 1 : 0,
    total_tests: results.length,
    execution_time_ms: result.execution_time_ms,
    error: result.error,
    is_solution_correct: result.status === 'passed',
    progress_percentage: ((index + 1) / results.length) * 100,
    timestamp: Date.now()
  }));
};

// Convert submission test results to DuelTestResult format
const convertSubmissionResults = (results: SubmissionResult['test_results']): DuelTestResult[] => {
  return results.map((result, index) => ({
    type: 'test_result' as const,
    user_id: 'current_user',
    passed: result.status === 'passed' ? 1 : 0,
    failed: result.status === 'failed' ? 1 : 0,
    total_tests: results.length,
    execution_time_ms: result.execution_time_ms,
    error: result.error_message,
    is_solution_correct: result.status === 'passed',
    progress_percentage: ((index + 1) / results.length) * 100,
    timestamp: Date.now()
  }));
};

const ProblemSolvingPage: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<DuelTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solution, setSolution] = useState<{ code: string; language: string }>({
    code: '',
    language: 'python'
  });

  const handleCodeChange = (language: string, code: string) => {
    setSolution({ code, language });
  };

  const fetchProblem = async () => {
    if (!problemId) return;
    
    try {
      setLoading(true);
      const response = await problemsApiService.getProblem(problemId);
      setProblem(response);
      
      // Set initial code from starter code
      if (response.starter_code && response.starter_code[solution.language]) {
        setSolution(prev => ({
          ...prev,
          code: response.starter_code![prev.language] || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch problem:', err);
      setError('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async () => {
    if (!problemId || !solution.code.trim()) return;
    
    try {
    setIsRunning(true);
      const submission: ProblemSubmission = {
        code: solution.code,
        language: solution.language
      };

      const response = await problemsApiService.testSolution(problemId, submission);
      const convertedResults = convertTestResults(response.test_results);
      setTestResults(convertedResults);
    } catch (err) {
      console.error('Failed to run tests:', err);
      setError('Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problemId || !solution.code.trim()) return;
    
    try {
    setIsSubmitting(true);
      const submission: ProblemSubmission = {
        code: solution.code,
        language: solution.language
      };
      
      const result = await problemsApiService.submitSolution(problemId, submission);
      
      if (result.status === 'accepted') {
        // Show success message
        alert('Solution accepted!');
        navigate('/problems');
      } else {
        // Convert submission test results to display format
        const convertedResults = convertSubmissionResults(result.test_results);
        setTestResults(convertedResults);
      }
    } catch (err) {
      console.error('Failed to submit solution:', err);
      setError('Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [problemId]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-arena-accent border-t-transparent"></div>
          <p className="text-arena-text">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-arena-dark flex items-center justify-center">
        <Card variant="glass" className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-arena-text mb-2">Problem Not Found</h2>
            <p className="text-arena-text-muted mb-6">
              {error || 'The requested problem could not be found.'}
            </p>
            <Button onClick={() => navigate('/problems')} variant="gradient">
              Back to Problems
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arena-dark">
      <div className="container mx-auto px-4 py-6">
      {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/problems')}
              className="text-arena-text-muted hover:text-arena-text"
            >
              ← Back to Problems
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold gradient-text">
              {problem.title}
            </h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getDifficultyBg(problem.difficulty)} ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
            </span>
      </div>

          {/* Problem Stats */}
          <div className="flex items-center gap-6 text-sm text-arena-text-muted">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{problem.time_limit}ms</span>
              </div>
            <div className="flex items-center gap-2">
              <MemoryStick size={16} />
              <span>{problem.memory_limit}MB</span>
            </div>
            {problem.tags && problem.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <span>Tags:</span>
                <div className="flex gap-1">
                  {problem.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-arena-accent/20 text-arena-accent rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {problem.tags.length > 3 && (
                    <span className="px-2 py-1 bg-arena-surface text-arena-text-muted rounded text-xs">
                      +{problem.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem Description */}
          <div className="space-y-6">
            <Card variant="glass" hover="glow">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={20} className="text-arena-accent" />
                  <h2 className="text-xl font-semibold text-arena-text">Problem Description</h2>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-arena-text leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: problem.description }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Constraints */}
            {problem.constraints && (
              <Card variant="glass">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-arena-text mb-3">Constraints</h3>
                  <div className="text-arena-text-muted whitespace-pre-wrap">
                    {problem.constraints}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hints */}
            {problem.hints && problem.hints.length > 0 && (
              <Card variant="glass">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-arena-text mb-3">Hints</h3>
                  <div className="space-y-2">
                    {problem.hints.map((hint, index) => (
                      <div key={index} className="p-3 bg-arena-accent/10 border border-arena-accent/20 rounded-lg">
                        <p className="text-arena-text text-sm">{hint}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Code Editor and Results */}
          <div className="space-y-6">
          <SolverDispatcher
              problem={convertToDuelProblem(problem)}
            onCodeChange={handleCodeChange}
            onSubmit={handleSubmit}
            onRunTests={handleRunTests}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            testResults={testResults}
          />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSolvingPage; 