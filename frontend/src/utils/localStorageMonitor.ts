/**
 * Monitor localStorage changes for debugging
 */

let originalSetItem: typeof localStorage.setItem;
let originalRemoveItem: typeof localStorage.removeItem;

export const startLocalStorageMonitoring = (duelId: string) => {
  if (!import.meta.env.DEV) return;
  
  const aiCodeKey = `duel-${duelId}-ai-code`;
  
  // Store original methods
  originalSetItem = localStorage.setItem.bind(localStorage);
  originalRemoveItem = localStorage.removeItem.bind(localStorage);
  
  // Override setItem
  localStorage.setItem = function(key: string, value: string) {
    if (key === aiCodeKey) {
      console.log('🔍 localStorage.setItem called for AI code:', {
        key,
        valueLength: value.length,
        value: value,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    }
    return originalSetItem.call(this, key, value);
  };
  
  // Override removeItem
  localStorage.removeItem = function(key: string) {
    if (key === aiCodeKey) {
      console.log('🗑️ localStorage.removeItem called for AI code:', {
        key,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    }
    return originalRemoveItem.call(this, key);
  };
  
  console.log('🔍 Started localStorage monitoring for duel:', duelId);
};

export const stopLocalStorageMonitoring = () => {
  if (!import.meta.env.DEV) return;
  
  if (originalSetItem) {
    localStorage.setItem = originalSetItem;
  }
  if (originalRemoveItem) {
    localStorage.removeItem = originalRemoveItem;
  }
  
  console.log('🔍 Stopped localStorage monitoring');
};

export const getLocalStorageHistory = () => {
  // This would require more complex implementation to track history
  // For now, just return current state
  const keys = Object.keys(localStorage).filter(key => key.startsWith('duel-'));
  const history: Record<string, string | null> = {};
  
  keys.forEach(key => {
    history[key] = localStorage.getItem(key);
  });
  
  return history;
};