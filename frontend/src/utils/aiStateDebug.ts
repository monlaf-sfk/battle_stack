/**
 * Debug utilities for AI state management
 */

export const logAiState = (context: string, data: any) => {
  if (import.meta.env.DEV) {
    console.group(`🤖 AI State - ${context}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Data:', data);
    console.groupEnd();
  }
};

export const checkAiCodeConsistency = (duelId: string) => {
  if (!import.meta.env.DEV) return null;
  
  const keys = {
    process: `duel-${duelId}-ai-process`,
    progress: `duel-${duelId}-ai-progress`,
    code: `duel-${duelId}-ai-code`
  };
  
  const saved = {
    process: localStorage.getItem(keys.process),
    progress: localStorage.getItem(keys.progress),
    code: localStorage.getItem(keys.code)
  };
  
  const analysis = {
    hasProcess: !!saved.process,
    hasProgress: !!saved.progress,
    hasCode: !!saved.code,
    codeLength: saved.code ? saved.code.length : 0,
    progress: saved.progress ? JSON.parse(saved.progress) : 0,
    processSteps: saved.process ? JSON.parse(saved.process).length : 0,
    timestamp: new Date().toISOString()
  };
  
  console.group('🔍 AI Code Consistency Check');
  console.table(analysis);
  
  if (saved.code) {
    console.log('Code preview:', saved.code.substring(0, 200) + '...');
  }
  
  // Check for inconsistencies
  const warnings = [];
  if (analysis.hasProgress && analysis.progress > 0 && !analysis.hasCode) {
    warnings.push('Progress exists but no code saved');
  }
  if (analysis.hasCode && analysis.codeLength > 0 && analysis.progress === 0) {
    warnings.push('Code exists but progress is 0');
  }
  if (analysis.hasProcess && analysis.processSteps === 0) {
    warnings.push('Process exists but has no steps');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Inconsistencies found:', warnings);
  } else {
    console.log('✅ AI state appears consistent');
  }
  
  console.groupEnd();
  
  return analysis;
};

export const reconstructCodeFromProcess = (process: any[], progress: number) => {
  if (!process || process.length === 0) return '';
  
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
  
  return reconstructedCode;
};

export const validateAiRestore = (duelId: string, currentCode: string) => {
  if (!import.meta.env.DEV) return;
  
  const keys = {
    process: `duel-${duelId}-ai-process`,
    progress: `duel-${duelId}-ai-progress`,
    code: `duel-${duelId}-ai-code`
  };
  
  const savedCode = localStorage.getItem(keys.code);
  const savedProgress = localStorage.getItem(keys.progress);
  const savedProcess = localStorage.getItem(keys.process);
  
  console.group('🔄 AI Restore Validation');
  console.log('Current code length:', currentCode.length);
  console.log('Saved code length:', savedCode ? savedCode.length : 0);
  console.log('Saved progress:', savedProgress ? JSON.parse(savedProgress) : 0);
  
  if (savedCode && savedCode !== currentCode) {
    console.warn('⚠️ Code mismatch detected!');
    console.log('Saved code preview:', savedCode.substring(0, 100) + '...');
    console.log('Current code preview:', currentCode.substring(0, 100) + '...');
  }
  
  if (savedProcess && savedProgress) {
    try {
      const process = JSON.parse(savedProcess);
      const progress = JSON.parse(savedProgress);
      const reconstructed = reconstructCodeFromProcess(process, progress);
      
      if (reconstructed !== currentCode && reconstructed !== savedCode) {
        console.warn('⚠️ Reconstructed code differs from both saved and current!');
        console.log('Reconstructed preview:', reconstructed.substring(0, 100) + '...');
      }
    } catch (e) {
      console.error('Error validating reconstruction:', e);
    }
  }
  
  console.groupEnd();
};