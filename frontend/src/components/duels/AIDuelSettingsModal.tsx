import React, { useState } from 'react';
import { X, Zap, BookOpen, Code, Flame, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion } from "framer-motion";

export interface AIDuelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (settings: AIDuelSettings) => void;
}

export interface AIDuelSettings {
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  language: string;
  category: 'algorithms' | 'sql';
}

const DIFFICULTIES = [
    { value: 'easy', label: 'Easy', description: 'Beginner-friendly problems', color: 'text-green-500' },
    { value: 'medium', label: 'Medium', description: 'Challenging, requires some thought', color: 'text-yellow-500' },
    { value: 'hard', label: 'Hard', description: 'Complex, for experienced coders', color: 'text-red-500' },
    { value: 'expert', label: 'Expert', description: 'Very difficult, for pros', color: 'text-purple-500' },
];

const availableThemes = {
  algorithms: [
    { value: 'dynamic_programming', label: 'Dynamic Programming', icon: <Code className="w-4 h-4" />  },
    { value: 'graph_theory', label: 'Graph Theory', icon: <Zap className="w-4 h-4" /> },
    { value: 'string_manipulation', label: 'String Manipulation', icon: <BookOpen className="w-4 h-4" />  },
  ],
  sql: [
    { value: 'sql', label: 'SQL', icon: <Flame className="w-4 h-4" />  },
  ],
};

const languagesForCategory = {
  algorithms: [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
  ],
  sql: [
    { value: 'sql', label: 'SQL' },
  ]
};

const categoryOptions = [
  { value: 'algorithms', label: 'Algorithms', icon: <Code className="w-5 h-5" /> },
  { value: 'sql', label: 'SQL', icon: <Shield className="w-5 h-5" /> },
];

export const AIDuelSettingsModal: React.FC<AIDuelSettingsModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [settings, setSettings] = useState<AIDuelSettings>({
    theme: availableThemes.algorithms[0].value,
    difficulty: 'medium',
    language: languagesForCategory.algorithms[0].value,
    category: 'algorithms',
  });

  const handleStartDuel = () => {
    onStart(settings);
  };

  const updateSetting = <K extends keyof AIDuelSettings>(
    key: K,
    value: AIDuelSettings[K]
  ) => {
    setSettings(prev => {
      const newState = { ...prev, [key]: value };
      // If category changes, reset theme and language
      if (key === 'category') {
        const newCategory = value as 'algorithms' | 'sql';
        newState.theme = availableThemes[newCategory][0].value;
        newState.language = languagesForCategory[newCategory][0].value;
      }
      return newState;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-gray-700 text-white rounded-2xl shadow-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-3xl font-bold gradient-text-safe mb-2">AI Duel Setup</DialogTitle>
          <DialogDescription className="text-gray-400">Configure your AI opponent and problem settings.</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 space-y-4 flex-1">
          {/* Category Selection */}
          <div>
            <Label className="block text-lg font-semibold text-gray-200 mb-4">Choose Category</Label>
            <div className="grid grid-cols-2 gap-4">
              {categoryOptions.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(0,255,153,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-5 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                    settings.category === option.value
                      ? 'border-green-500 bg-green-900/20 shadow-lg'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                  onClick={() => updateSetting('category', option.value as 'algorithms' | 'sql')}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="text-green-400">{option.icon}</span>
                    <span className="font-medium text-lg text-white">{option.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Problem Theme Selection */}
          <div>
            <Label htmlFor="theme" className="block text-lg font-semibold text-gray-200 mb-4">Problem Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(value) => updateSetting('theme', value)}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white focus:ring-green-500 data-[state=open]:border-green-500">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {availableThemes[settings.category].map((theme) => (
                  <SelectItem key={theme.value} value={theme.value} className="flex items-center gap-2">
                    {theme.icon} {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
  
          {/* Difficulty Selection */}
          <div>
            <Label className="block text-lg font-semibold text-gray-200 mb-4">Difficulty Level</Label>
            <div className="grid grid-cols-1 gap-4">
              {DIFFICULTIES.map((difficulty) => (
                <motion.div
                  key={difficulty.value}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 10px rgba(0,255,153,0.2)" }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                    settings.difficulty === difficulty.value
                      ? `border-current ${difficulty.color} bg-opacity-20`
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                  onClick={() => updateSetting('difficulty', difficulty.value as AIDuelSettings['difficulty'])}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold text-lg ${difficulty.color}`}>{difficulty.label}</div>
                      <div className="text-sm text-gray-400">{difficulty.description}</div>
                    </div>
                    {settings.difficulty === difficulty.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
  
          {/* Language Selection */}
          <div>
            <Label htmlFor="language" className="block text-lg font-semibold text-gray-200 mb-4">Programming Language</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSetting('language', value)}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white focus:ring-green-500 data-[state=open]:border-green-500">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {languagesForCategory[settings.category].map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-end border-t border-gray-700 px-6 pb-6">
          <Button variant="ghost" onClick={onClose} className="mr-4">Cancel</Button>
          <Button
            onClick={handleStartDuel}
            variant="gradient"
            size="lg"
            className="text-white font-bold"
          >
            Start AI Duel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 