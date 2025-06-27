import React from 'react';
import { Button } from '../ui/Button';
import { Target, Clock, Settings, Wifi, WifiOff, Zap, Send } from 'lucide-react';
import type { Language } from '../../services/duelService';
import type { ConnectionStatus, DuelProblem } from '../../types/duel.types';
import { formatTime, getConnectionStatusText, getTimeColor } from '../../utils/duelHelpers';

interface DuelHeaderProps {
  problem: DuelProblem;
  elapsedTime: number;
  connectionStatus: ConnectionStatus;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onTestCode: () => void;
  onSubmitCode: () => void;
  isTestingCode: boolean;
  isSubmittingCode: boolean;
  isConnected: boolean;
}

export const DuelHeader: React.FC<DuelHeaderProps> = ({
  problem,
  elapsedTime,
  connectionStatus,
  language,
  onLanguageChange,
  onTestCode,
  onSubmitCode,
  isTestingCode,
  isSubmittingCode,
  isConnected
}) => {
  return (
    <div className="relative z-10 border-b border-cyan-500/30 bg-black/90 backdrop-blur-md">
      <div className="max-w-full mx-auto p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-4xl">⚔️</div>
            
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                {problem.title}
              </h1>
              
              <div className="flex items-center space-x-6 mt-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-cyan-600/20 rounded-full border border-cyan-400/30">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-bold capitalize">
                    {problem.difficulty}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getTimeColor(elapsedTime)}`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-bold font-mono">
                    {formatTime(elapsedTime, true)}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-600/20 border-green-400/30' 
                    : 'bg-red-600/20 border-red-400/30'
                }`}>
                  {connectionStatus === 'connected' ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                  <span className={`font-bold ${connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {getConnectionStatusText(connectionStatus)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-cyan-400/30">
              <Settings className="w-4 h-4 text-cyan-400" />
              <select 
                value={language} 
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="bg-transparent text-cyan-400 font-bold border-none outline-none"
              >
                <option value="python" className="bg-gray-800">🐍 PYTHON</option>
                <option value="javascript" className="bg-gray-800">⚡ JAVASCRIPT</option>
              </select>
            </div>
            
            <Button 
              onClick={onTestCode} 
              disabled={isTestingCode || !isConnected}
              className="bg-cyan-600 hover:bg-cyan-500 border-cyan-400/50 text-white font-bold px-6 py-2"
            >
              {isTestingCode ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Test Code
                </>
              )}
            </Button>
            
            <Button 
              onClick={onSubmitCode} 
              disabled={isSubmittingCode || !isConnected}
              className="bg-green-600 hover:bg-green-500 border-green-400/50 text-white font-bold px-6 py-2"
            >
              {isSubmittingCode ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 