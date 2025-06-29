import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AIDuelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDuel: (settings: AIDuelSettings) => void;
  isLoading?: boolean;
}

export interface AIDuelSettings {
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  language: string;
}

const THEMES = [
  { value: 'algorithms', label: 'Algorithms', description: 'Array operations, sorting, searching' },
  { value: 'data_structures', label: 'Data Structures', description: 'Trees, graphs, hash maps, stacks' },
  { value: 'sql', label: 'SQL', description: 'Database queries and optimization' },
  { value: 'math', label: 'Mathematics', description: 'Number theory, geometry, statistics' }
];

const DIFFICULTIES = [
  { 
    value: 'easy', 
    label: 'Easy', 
    description: '3-8 minutes • Basic algorithms',
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    description: '8-15 minutes • Data structures',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  { 
    value: 'hard', 
    label: 'Hard', 
    description: '15-25 minutes • Advanced algorithms',
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  { 
    value: 'expert', 
    label: 'Expert', 
    description: '25+ minutes • Complex optimization',
    color: 'text-red-600 bg-red-50 border-red-200'
  }
];

const LANGUAGES = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'sql', label: 'SQL', icon: '🗄️' }
];

export const AIDuelSettingsModal: React.FC<AIDuelSettingsModalProps> = ({
  isOpen,
  onClose,
  onStartDuel,
  isLoading = false
}) => {
  const [settings, setSettings] = useState<AIDuelSettings>({
    theme: 'algorithms',
    difficulty: 'medium',
    language: 'python'
  });

  // Load saved preferences
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai_duel_preferences');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (error) {
        console.warn('Failed to parse saved AI duel preferences');
      }
    }
  }, []);

  // Save preferences when settings change
  useEffect(() => {
    localStorage.setItem('ai_duel_preferences', JSON.stringify(settings));
  }, [settings]);

  const handleStartDuel = () => {
    onStartDuel(settings);
  };

  const updateSetting = <K extends keyof AIDuelSettings>(
    key: K, 
    value: AIDuelSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Opponent Settings</h2>
            <p className="text-gray-600 mt-1">Customize your duel against AI</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Theme Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Problem Theme</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEMES.map((theme) => (
                <div
                  key={theme.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.theme === theme.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateSetting('theme', theme.value)}
                >
                  <div className="font-medium text-gray-900">{theme.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{theme.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Difficulty Level</h3>
            <div className="space-y-3">
              {DIFFICULTIES.map((difficulty) => (
                <div
                  key={difficulty.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.difficulty === difficulty.value
                      ? `border-current ${difficulty.color}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateSetting('difficulty', difficulty.value as AIDuelSettings['difficulty'])}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{difficulty.label}</div>
                      <div className="text-sm text-gray-600">{difficulty.description}</div>
                    </div>
                    {settings.difficulty === difficulty.value && (
                      <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-current"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💻 Programming Language</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {LANGUAGES.map((language) => (
                <div
                  key={language.value}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    settings.language === language.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateSetting('language', language.value)}
                >
                  <div className="text-2xl mb-1">{language.icon}</div>
                  <div className="font-medium text-gray-900 text-sm">{language.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Opponent Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">🎯 About Your AI Opponent</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• AI adapts to your chosen difficulty level</li>
              <li>• Realistic coding speed and thinking time</li>
              <li>• Simulates human-like problem-solving approach</li>
              <li>• Provides immediate feedback and learning opportunities</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Your preferences will be saved for future duels
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleStartDuel}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Starting Duel...</span>
                </>
              ) : (
                <>
                  <span>🚀 Start AI Duel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 