/**
 * Debug utilities for duel troubleshooting
 */

export const logDuelState = (context: string, data: any) => {
  if (import.meta.env.DEV) {
    console.group(`🔍 Duel Debug - ${context}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Data:', data);
    console.groupEnd();
  }
};

export const logWebSocketMessage = (message: any) => {
  if (import.meta.env.DEV) {
    console.log(`📡 WebSocket Message [${message.type}]:`, message.data || message);
  }
};

export const logLanguageSetup = (context: string, data: any) => {
  if (import.meta.env.DEV) {
    console.group(`🔧 Language Setup - ${context}`);
    console.log('Current Language:', data.currentLanguage);
    console.log('Supported Languages:', data.supportedLanguages);
    console.log('Problem Languages:', data.problemLanguages);
    console.log('Duel Problem:', data.duelProblem);
    console.groupEnd();
  }
};

export const checkDuelHealth = (duel: any, currentLanguage: any, isConnected: boolean) => {
  if (import.meta.env.DEV) {
    const health = {
      duelExists: !!duel,
      duelId: duel?.id,
      duelStatus: duel?.status,
      problemExists: !!duel?.problem,
      languageSet: !!currentLanguage,
      languageId: currentLanguage?.id,
      wsConnected: isConnected,
      timestamp: new Date().toISOString()
    };
    
    console.group('🏥 Duel Health Check');
    console.table(health);
    
    if (!duel) console.warn('❌ No duel data');
    if (!duel?.problem) console.warn('❌ No problem data');
    if (!currentLanguage) console.warn('❌ No language set');
    if (!isConnected) console.warn('❌ WebSocket not connected');
    
    console.groupEnd();
    
    return health;
  }
  
  return null;
};