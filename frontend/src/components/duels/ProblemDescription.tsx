import type { DuelProblem } from '../../types/duel.types';

export interface ProblemDescriptionProps {
  problem: DuelProblem | null;
}

export const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem }) => {
  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <div className="animate-pulse mb-2">Loading...</div>
          <p className="text-sm">Fetching problem details</p>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'hard': return 'text-red-400 bg-red-900/30';
      default: return 'text-blue-400 bg-blue-900/30';
    }
  };
  
  const visibleTestCases = problem.test_cases?.filter(tc => !tc.is_hidden) || [];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white">{problem.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-gray-300 leading-relaxed">{problem.description}</p>
        </div>

        {/* Constraints */}
        {problem.constraints && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-yellow-400 mb-2">Constraints</h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">{problem.constraints}</pre>
          </div>
        )}

        {/* Examples */}
        {visibleTestCases.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-green-400 mb-3">Examples</h3>
            <div className="space-y-3">
              {visibleTestCases.map((tc, idx) => (
                <div key={idx} className="bg-gray-900 rounded-md p-3">
                  <div className="text-sm font-medium text-gray-400 mb-2">Example {idx + 1}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-blue-400 mb-1 uppercase">Input</div>
                      <code className="text-sm text-gray-300 bg-black/50 p-2 rounded block">
                        {tc.input_data}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-green-400 mb-1 uppercase">Output</div>
                      <code className="text-sm text-gray-300 bg-black/50 p-2 rounded block">
                        {tc.expected_output}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-medium text-blue-400 mb-2">💡 Tips</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Read examples carefully to understand the problem</li>
            <li>• Check constraints for edge cases</li>
            <li>• Test your code before submitting</li>
            <li>• Use Ctrl+Enter to submit quickly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 