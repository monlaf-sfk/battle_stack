/**
 * 🎨 LANGUAGE SELECTOR COMPONENT
 * Component for selecting the programming language, inspired by TETR.IO style.
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { codeExecutionService, type SupportedLanguage } from '../../services/codeExecutionService';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage; // Change from string to SupportedLanguage
  onLanguageChange: (language: SupportedLanguage) => void; // Change to pass full object
  className?: string;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  className = '',
  disabled = false,
}) => {
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const supportedLanguages = await codeExecutionService.getSupportedLanguages();
      setLanguages(supportedLanguages);
      
      // Ensure selectedLanguage is valid or set a default if initially empty/invalid
      if (!selectedLanguage || !supportedLanguages.some(lang => lang.id === selectedLanguage.id)) {
        const defaultLang = supportedLanguages.find(lang => lang.id === 'python') || supportedLanguages[0];
        if (defaultLang) {
          onLanguageChange(defaultLang);
        }
      }
    } catch (error) {
      console.error(t('coding.failedToLoadLanguages'), error);
    } finally {
      setLoading(false);
    }
  };

  // selectedLang is no longer needed as selectedLanguage is already the object
  // const selectedLang = languages.find(lang => lang.id === selectedLanguage);

  const getLanguageIcon = (languageId: string): string => {
    const icons: Record<string, string> = {
      'python': '🐍',
      'python3': '🐍',
      'java': '☕',
      'cpp': '⚡',
      'c': '🔧',
      'javascript': '🟨',
      'typescript': '🔷',
      'go': '🐹',
      'rust': '🦀',
      'php': '🐘',
      'csharp': '🔷',
      'kotlin': '🎯',
      'swift': '🍎',
    };
    return icons[languageId] || '📄';
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-600 rounded animate-pulse"></div>
            <div className="w-20 h-4 bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className={`
          w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
          flex items-center justify-between text-left transition-all duration-200
          hover:border-gray-600 hover:bg-gray-750 focus:outline-none focus:border-blue-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-blue-500 bg-gray-750' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center space-x-3">
          <span className="text-xl">{getLanguageIcon(selectedLanguage.id)}</span>
          <div className="flex flex-col">
            <span className="text-white font-medium">
              {selectedLanguage?.name || t('coding.selectLanguage')}
            </span>
            <span className="text-gray-400 text-sm">
              {selectedLanguage?.extension || ''}
              {selectedLanguage?.supports_classes && (
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                  {t('coding.oop')}
                </span>
              )}
            </span>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                className={`
                  w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors duration-150
                  hover:bg-gray-700 focus:outline-none focus:bg-gray-700
                  ${selectedLanguage.id === language.id ? 'bg-blue-600 text-white' : 'text-gray-300'}
                `}
                onClick={() => {
                  onLanguageChange(language);
                  setIsOpen(false);
                }}
              >
                <span className="text-xl">{getLanguageIcon(language.id)}</span>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{language.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm opacity-75">{language.extension}</span>
                    {language.supports_classes && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                        {t('coding.oop')}
                      </span>
                    )}
                  </div>
                </div>
                {selectedLanguage.id === language.id && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector; 