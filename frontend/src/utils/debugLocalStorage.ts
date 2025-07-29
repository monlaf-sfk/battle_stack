/**
 * Debug utility for localStorage inspection
 */

export const inspectDuelStorage = (duelId: string) => {
  const keys = {
    aiCode: `duel-${duelId}-ai-code`,
    aiProcess: `duel-${duelId}-ai-process`,
    aiProgress: `duel-${duelId}-ai-progress`,
  };

  console.group('🔍 Duel Storage Inspection');
  console.log('Duel ID:', duelId);
  console.log('Timestamp:', new Date().toISOString());
  
  Object.entries(keys).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    console.log(`${name} (${key}):`, value ? `${value.length} chars` : 'null');
    
    if (value && name === 'aiCode') {
      console.log('Code preview:', value.substring(0, 200));
      console.log('Code ends with:', value.substring(Math.max(0, value.length - 50)));
    }
    
    if (value && name === 'aiProgress') {
      try {
        const progress = JSON.parse(value);
        console.log('Progress value:', progress);
      } catch (e) {
        console.error('Invalid progress JSON:', value);
      }
    }
    
    if (value && name === 'aiProcess') {
      try {
        const process = JSON.parse(value);
        console.log('Process steps:', process.length);
        if (process.length > 0) {
          console.log('First step:', process[0]);
          console.log('Last step:', process[process.length - 1]);
        }
      } catch (e) {
        console.error('Invalid process JSON');
      }
    }
  });
  
  console.groupEnd();
  
  return {
    aiCode: localStorage.getItem(keys.aiCode),
    aiProcess: localStorage.getItem(keys.aiProcess),
    aiProgress: localStorage.getItem(keys.aiProgress),
  };
};

export const clearDuelStorageDebug = (duelId: string) => {
  const keys = {
    aiCode: `duel-${duelId}-ai-code`,
    aiProcess: `duel-${duelId}-ai-process`,
    aiProgress: `duel-${duelId}-ai-progress`,
  };
  
  console.group('🗑️ Clearing Duel Storage');
  Object.entries(keys).forEach(([name, key]) => {
    const existed = localStorage.getItem(key) !== null;
    localStorage.removeItem(key);
    console.log(`${name}: ${existed ? 'removed' : 'was already empty'}`);
  });
  console.groupEnd();
};

export const reconstructCodeFromStoredProcess = (duelId: string) => {
  const processKey = `duel-${duelId}-ai-process`;
  const progressKey = `duel-${duelId}-ai-progress`;
  
  const processJSON = localStorage.getItem(processKey);
  const progressJSON = localStorage.getItem(progressKey);
  
  if (!processJSON || !progressJSON) {
    console.warn('Missing process or progress data for reconstruction');
    return null;
  }
  
  try {
    const process = JSON.parse(processJSON);
    const progress = JSON.parse(progressJSON);
    
    console.group('🔄 Code Reconstruction');
    console.log('Process steps:', process.length);
    console.log('Progress:', progress + '%');
    
    let reconstructedCode = '';
    const endIndex = Math.floor((progress / 100) * process.length);
    
    console.log('Processing steps 0 to', endIndex);
    
    for (let i = 0; i < endIndex; i++) {
      const action = process[i]?.root;
      if (!action) {
        console.warn(`Missing action at step ${i}`);
        continue;
      }
      
      if (action.action === 'type') {
        reconstructedCode += action.content;
        console.log(`Step ${i}: type "${action.content}" (total: ${reconstructedCode.length} chars)`);
      } else if (action.action === 'delete' && reconstructedCode.length > 0) {
        const deleteCount = Math.min(action.char_count, reconstructedCode.length);
        reconstructedCode = reconstructedCode.slice(0, -deleteCount);
        console.log(`Step ${i}: delete ${deleteCount} chars (total: ${reconstructedCode.length} chars)`);
      } else if (action.action === 'pause') {
        console.log(`Step ${i}: pause ${action.duration}s`);
      }
    }
    
    console.log('Final reconstructed code:', reconstructedCode);
    console.groupEnd();
    
    return reconstructedCode;
  } catch (e) {
    console.error('Failed to reconstruct code:', e);
    return null;
  }
};