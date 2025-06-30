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
import { codeExecutionService } from '../services/codeExecutionService';
import CodeExecutionPanel from '../components/coding/CodeExecutionPanel';

const CodeExecutionDemoPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<any>(null);


  useEffect(() => {
    loadExampleData();
  }, []);

  const loadExampleData = async () => {
    try {
      setLoading(true);
      const data = await codeExecutionService.getExampleTemplates();
      if (data) {
        setProblem(data.problem);
      }
    } catch (error) {
      console.error('Failed to load example data:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: "13 Programming Languages",
      description: "Python, Java, C++, JavaScript, TypeScript, Go, Rust, and more"
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Professional Templates",
      description: "Automatic generation of LeetCode-style code templates"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Sandbox Environment",
      description: "Secure execution with time and memory limits"
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Detailed Statistics",
      description: "Execution time, memory usage, and solution evaluation"
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Real Test Cases",
      description: "56 test cases for 10 popular problems"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "LeetCode-like Statuses",
      description: "Accepted, Wrong Answer, TLE, MLE, and others"
    }
  ];

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
              A LeetCode-level code execution system with support for 13 programming languages,
              professional templates, and real test cases.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-green-600 text-white px-4 py-2 rounded-full">
                ✅ 56 Real Test Cases
              </span>
              <span className="bg-blue-600 text-white px-4 py-2 rounded-full">
                🎨 13 Programming Languages
              </span>
              <span className="bg-purple-600 text-white px-4 py-2 rounded-full">
                🏆 LeetCode-like Statuses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            🌟 Professional Features
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

      {/* Code Editor Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            🔥 Try It Yourself
          </h2>
          {problem && (
            <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-2">{problem.title}</h3>
                <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br />') }} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-700">
                {/* Code Editor */}
                <div className="bg-gray-800">
                  <CodeExecutionPanel duelId="demo">
                  </CodeExecutionPanel>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeExecutionDemoPage; 