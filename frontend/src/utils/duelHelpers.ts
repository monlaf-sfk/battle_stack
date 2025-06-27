export const formatTime = (seconds: number, isCountdown: boolean = false): string => {
  if (isCountdown) {
    // Countdown from 10 minutes (600 seconds)
    const DUEL_DURATION = 10 * 60; // 10 minutes in seconds
    const remaining = Math.max(0, DUEL_DURATION - seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  } else {
    // Normal elapsed time
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};

export const getTimeColor = (elapsedSeconds: number): string => {
  const DUEL_DURATION = 10 * 60; // 10 minutes
  const remaining = DUEL_DURATION - elapsedSeconds;
  
  if (remaining <= 60) {
    return 'text-red-400 border-red-400/30 bg-red-600/20'; // Last minute - red
  } else if (remaining <= 180) {
    return 'text-orange-400 border-orange-400/30 bg-orange-600/20'; // Last 3 minutes - orange
  } else {
    return 'text-yellow-400 border-yellow-400/30 bg-yellow-600/20'; // Normal - yellow
  }
};

export const createCodeUpdateMessage = (userId: string, code: string, language: string) => ({
  type: 'code_update',
  user_id: userId,
  code,
  language,
  timestamp: Date.now()
});

export const createTypingStatusMessage = (userId: string, isTyping: boolean) => ({
  type: 'typing_status',
  user_id: userId,
  is_typing: isTyping,
  timestamp: Date.now()
});

export const createPingMessage = (userId: string) => ({
  type: 'ping',
  user_id: userId,
  timestamp: Date.now()
});

export const clearDuelCodeFromStorage = (duelId: string) => {
  const languages = ['python', 'javascript', 'java', 'cpp'];
  languages.forEach(lang => {
    const savedCodeKey = `duel_${duelId}_${lang}_code`;
    localStorage.removeItem(savedCodeKey);
  });
  
  // Also clear opponent code
  localStorage.removeItem(`duel_${duelId}_opponent_code`);
  
  console.log(`🗑️ Cleared all saved code for duel ${duelId}`);
};

export const getConnectionStatusText = (status: 'connecting' | 'connected' | 'disconnected' | 'error'): string => {
  switch (status) {
    case 'connected': return '● Connected';
    case 'connecting': return '⏳ Connecting...';
    case 'disconnected': return '⚠ Disconnected';
    case 'error': return '❌ Connection Error';
    default: return '● Unknown';
  }
}; 