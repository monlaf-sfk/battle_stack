/**
 * 🎯 CODE EXECUTION DEMO PAGE
 * Демо-страница для профессиональной системы выполнения кода
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Code, 
  Sparkles, 
  Trophy,
  BarChart,
  CheckCircle
} from 'lucide-react';
import { codeExecutionService, type ExampleTemplatesResponse } from '../services/codeExecutionService';
import CodeExecutionPanel from '../components/coding/CodeExecutionPanel';

const CodeExecutionDemoPage: React.FC = () => {
  const [exampleData, setExampleData] = useState<ExampleTemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExample, setSelectedExample] = useState<string>('python');

  useEffect(() => {
    loadExampleData();
  }, []);

  const loadExampleData = async () => {
    try {
      setLoading(true);
      const data = await codeExecutionService.getExampleTemplates();
      setExampleData(data);
    } catch (error) {
      console.error('Failed to load example data:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: "13 языков программирования",
      description: "Python, Java, C++, JavaScript, TypeScript, Go, Rust и другие"
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Профессиональные шаблоны",
      description: "Автоматическая генерация шаблонов кода в стиле LeetCode"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Песочная среда выполнения",
      description: "Безопасное выполнение с лимитами времени и памяти"
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Детальная статистика",
      description: "Время выполнения, использование памяти и оценка решения"
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Реальные тест-кейсы",
      description: "56 тест-кейсов для 10 популярных задач"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Статусы как на LeetCode",
      description: "Accepted, Wrong Answer, TLE, MLE и другие"
    }
  ];

  const languageExamples = {
    python: `def longestSubsequenceRepeatedK(s: str, k: int) -> str:
    """
    🎯 Find the longest subsequence that repeats k times
    
    Args:
        s: Input string
        k: Number of times subsequence should repeat
        
    Returns:
        Longest valid subsequence string
        
    Example:
        >>> longestSubsequenceRepeatedK("letsleetcode", 2)
        "let"
    """
    # Your solution here
    pass`,
    
    java: `class Solution {
    /**
     * 🎯 Find the longest subsequence that repeats k times
     * 
     * @param s Input string
     * @param k Number of times subsequence should repeat
     * @return Longest valid subsequence string
     * 
     * Example:
     *     longestSubsequenceRepeatedK("letsleetcode", 2) => "let"
     */
    public String longestSubsequenceRepeatedK(String s, int k) {
        // Your solution here
        return "";
    }
}`,
    
    cpp: `class Solution {
public:
    /**
     * 🎯 Find the longest subsequence that repeats k times
     * 
     * @param s Input string
     * @param k Number of times subsequence should repeat
     * @return Longest valid subsequence string
     * 
     * Example:
     *     longestSubsequenceRepeatedK("letsleetcode", 2) => "let"
     */
    string longestSubsequenceRepeatedK(string s, int k) {
        // Your solution here
        return "";
    }
};`,
    
    javascript: `/**
 * 🎯 Find the longest subsequence that repeats k times
 * 
 * @param {string} s - Input string
 * @param {number} k - Number of times subsequence should repeat
 * @return {string} Longest valid subsequence string
 * 
 * Example:
 *     longestSubsequenceRepeatedK("letsleetcode", 2) => "let"
 */
function longestSubsequenceRepeatedK(s, k) {
    // Your solution here
    return "";
}`
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Professional Code Execution System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              🚀 Professional Code Execution
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
              Система выполнения кода уровня LeetCode с поддержкой 13 языков программирования,
              профессиональными шаблонами и реальными тест-кейсами
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-green-600 text-white px-4 py-2 rounded-full">
                ✅ 56 реальных тест-кейсов
              </span>
              <span className="bg-blue-600 text-white px-4 py-2 rounded-full">
                🎨 13 языков программирования
              </span>
              <span className="bg-purple-600 text-white px-4 py-2 rounded-full">
                🏆 Статусы как на LeetCode
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            🌟 Профессиональные возможности
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors duration-200"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Language Examples */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            🎨 Автоматические шаблоны кода
          </h2>
          
          {/* Language Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.keys(languageExamples).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedExample(lang)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  selectedExample === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>

          {/* Code Example */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
              <h3 className="text-white font-medium">
                {selectedExample.charAt(0).toUpperCase() + selectedExample.slice(1)} Template
              </h3>
            </div>
            <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
              <code>{languageExamples[selectedExample as keyof typeof languageExamples]}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Live Demo */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            🧪 Живая демонстрация
          </h2>
          <p className="text-center text-gray-300 mb-8">
            Попробуйте нашу систему выполнения кода в действии!
          </p>
          
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
            <CodeExecutionPanel
              problemSlug="longest-subsequence-repeated-k"
              className="min-h-[600px]"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="py-16 bg-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            📊 Статистика системы
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">13</div>
              <div className="text-gray-300">Языков программирования</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">56</div>
              <div className="text-gray-300">Реальных тест-кейсов</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">10</div>
              <div className="text-gray-300">Популярных задач</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">7</div>
              <div className="text-gray-300">Статусов выполнения</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            🎯 Professional Code Execution System by BattleStack
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Создано с использованием FastAPI, Docker, Monaco Editor и любви к качественному коду
          </p>
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionDemoPage; 