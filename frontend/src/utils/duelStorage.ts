/**
 * Utility functions for managing duel-related localStorage data
 */

export interface DuelStorageKeys {
  aiProcess: string;
  aiProgress: string;
  aiCode: string;
  userCode: string;
}

/**
 * Get all storage keys for a specific duel
 */
export const getDuelStorageKeys = (duelId: string, userId?: string): DuelStorageKeys => {
  return {
    aiProcess: `duel-${duelId}-ai-process`,
    aiProgress: `duel-${duelId}-ai-progress`,
    aiCode: `duel-${duelId}-ai-code`,
    userCode: userId ? `duel-${duelId}-user-${userId}-code` : '',
  };
};

/**
 * Clear all stored data for a specific duel
 */
export const clearDuelStorage = (duelId: string, userId?: string): void => {
  const keys = getDuelStorageKeys(duelId, userId);
  
  Object.values(keys).forEach(key => {
    if (key) {
      localStorage.removeItem(key);
    }
  });
  
  console.log(`Cleared storage for duel ${duelId}`);
};

/**
 * Get stored AI code for a duel
 */
export const getStoredAiCode = (duelId: string): string | null => {
  const keys = getDuelStorageKeys(duelId);
  return localStorage.getItem(keys.aiCode);
};

/**
 * Get stored user code for a duel
 */
export const getStoredUserCode = (duelId: string, userId: string): string | null => {
  const keys = getDuelStorageKeys(duelId, userId);
  return localStorage.getItem(keys.userCode);
};

/**
 * Check if there's any stored data for a duel
 */
export const hasDuelStorageData = (duelId: string, userId?: string): boolean => {
  const keys = getDuelStorageKeys(duelId, userId);
  
  return Object.values(keys).some(key => {
    if (!key) return false;
    return localStorage.getItem(key) !== null;
  });
};

/**
 * Clear all duel storage data (for debugging or cleanup)
 */
export const clearAllDuelStorage = (): void => {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('duel-')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keysToRemove.length} duel storage items`);
};