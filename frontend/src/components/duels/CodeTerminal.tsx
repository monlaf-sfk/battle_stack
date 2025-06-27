import React from 'react';
import { Editor } from '@monaco-editor/react';
import { Card } from '../ui/Card';
import { Skull } from 'lucide-react';
import type { Language } from '../../services/duelService';
import type { TestResult } from '../../types/duel.types';

interface CodeTerminalProps {
  title: string;
  titleColor: string;
  borderColor: string;
  isPlayer: boolean;
  language: Language;
  code: string;
  onCodeChange?: (value: string) => void;
  isTyping?: boolean;
  isConnected?: boolean;
  testResults?: TestResult | null;
  progress?: number;
}

export const CodeTerminal: React.FC<CodeTerminalProps> = ({
  title,
  titleColor,
  borderColor,
  isPlayer,
  language,
  code,
  onCodeChange,
  isTyping,
  isConnected,
  testResults,
  progress = 0
}) => {
  return (
    <div className="relative h-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 ${isPlayer ? 'bg-blue-500' : isConnected === false ? 'bg-gray-500' : 'bg-red-500'} rounded-full`}></div>
          <h3 className={`font-bold ${titleColor} text-xl`}>{title}</h3>
          {isTyping && (
            <div className={`flex items-center gap-2 px-3 py-1 ${isPlayer ? 'bg-cyan-900/30 border-cyan-400/50' : 'bg-red-900/30 border-red-400/50'} rounded-full border`}>
              <span className={`${isPlayer ? 'text-cyan-400' : 'text-red-400'} text-sm font-bold`}>
                {isPlayer ? 'Coding...' : 'Attacking...'}
              </span>
            </div>
          )}
          {!isPlayer && isConnected === false && (
            <div className="px-3 py-1 bg-gray-900/50 rounded-full border border-gray-500/50">
              <span className="text-gray-500 text-sm font-bold">💀 DISCONNECTED</span>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          {testResults && (
            <div className="flex items-center gap-2">
              <span className={`${isPlayer ? 'text-cyan-400' : 'text-red-400'} text-sm font-bold`}>
                {testResults.passed}/{testResults.total_tests} tests
              </span>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isPlayer ? 'bg-cyan-400' : 'bg-red-400'} transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Card className={`h-full bg-gray-900 border ${borderColor} overflow-hidden`}>
        {/* Terminal Header */}
        <div className={`flex items-center gap-2 p-3 bg-gray-800 border-b ${borderColor}`}>
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className={`${isPlayer ? 'text-cyan-400' : 'text-red-400'} font-mono text-sm ml-4`}>
            {isPlayer ? `~/battle_arena/player_code.${language}` : `~/enemy_systems/ai_attack.${language}`}
          </span>
        </div>
        
        {isPlayer ? (
          <div className="h-96 overflow-hidden">
            <Editor
              height="384px"
              defaultLanguage={language}
              language={language}
              value={code}
              onChange={(value) => onCodeChange?.(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                cursorStyle: 'line',
                cursorBlinking: 'smooth',
                padding: { top: 16, bottom: 16 },
                bracketPairColorization: { enabled: true },
                smoothScrolling: false,
                contextmenu: true,
                selectOnLineNumbers: true,
                glyphMargin: false,
                folding: true,
                tabSize: 4,
                insertSpaces: true,
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: false,
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnCommitCharacter: false,
                acceptSuggestionOnEnter: 'off',
                quickSuggestions: false
              }}
            />
          </div>
        ) : (
          <div className="h-96 p-4 overflow-auto">
            {code ? (
              <div className="text-red-100 font-mono text-sm whitespace-pre-wrap">
                {code}
              </div>
            ) : (
              <div className="text-gray-500 italic flex items-center justify-center h-full text-center">
                <div>
                  <div className="text-4xl mb-4">🤖</div>
                  <div className="text-lg font-bold">ENEMY AI PREPARING</div>
                  <div className="text-sm mt-2">Attack protocols loading...</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {isPlayer && testResults?.error && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Skull className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-400">💥 ERROR DETECTED!</div>
                <div className="text-red-300 text-sm mt-1 font-mono">{testResults.error}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}; 