/**
 * Utility for manually restoring AI code from localStorage
 */

export const forceRestoreAiCode = (duelId: string): string | null => {
  const codeKey = `duel-${duelId}-ai-code`;
  const savedCode = localStorage.getItem(codeKey);
  
  if (savedCode) {
    console.log('Force restoring AI code:', savedCode.length, 'characters');
    return savedCode;
  }
  
  // Try to reconstruct from process if no direct code
  const processKey = `duel-${duelId}-ai-process`;
  const progressKey = `duel-${duelId}-ai-progress`;
  
  const savedProcess = localStorage.getItem(processKey);
  const savedProgress = localStorage.getItem(progressKey);
  
  if (savedProcess && savedProgress) {
    try {
      const process = JSON.parse(savedProcess);
      const progress = JSON.parse(savedProgress);
      
      let reconstructedCode = '';
      const endIndex = Math.floor((progress / 100) * process.length);
      
      for (let i = 0; i < endIndex; i++) {
        const action = process[i]?.root;
        if (!action) continue;
        
        if (action.action === 'type') {
          reconstructedCode += action.content;
        } else if (action.action === 'delete' && reconstructedCode.length > 0) {
          const deleteCount = Math.min(action.char_count, reconstructedCode.length);
          reconstructedCode = reconstructedCode.slice(0, -deleteCount);
        }
      }
      
      if (reconstructedCode) {
        console.log('Reconstructed AI code from process:', reconstructedCode.length, 'characters');
        // Save the reconstructed code for future use
        localStorage.setItem(codeKey, reconstructedCode);
        return reconstructedCode;
      }
    } catch (e) {
      console.error('Failed to reconstruct AI code:', e);
    }
  }
  
  return null;
};

export const getAiCodeInfo = (duelId: string) => {
  const keys = {
    code: `duel-${duelId}-ai-code`,
    process: `duel-${duelId}-ai-process`,
    progress: `duel-${duelId}-ai-progress`
  };
  
  const saved = {
    code: localStorage.getItem(keys.code),
    process: localStorage.getItem(keys.process),
    progress: localStorage.getItem(keys.progress)
  };
  
  return {
    hasCode: !!saved.code,
    codeLength: saved.code ? saved.code.length : 0,
    hasProcess: !!saved.process,
    processSteps: saved.process ? JSON.parse(saved.process).length : 0,
    hasProgress: !!saved.progress,
    progress: saved.progress ? JSON.parse(saved.progress) : 0,
    codePreview: saved.code ? saved.code.substring(0, 100) + '...' : null
  };
};