import { loader } from '@monaco-editor/react';

// Comprehensive offline configuration that completely disables workers
export const configureMonacoOffline = () => {
  console.log('🔧 Configuring Monaco Editor for offline use...');
  
  try {
    // Completely disable web workers to prevent loading issues
    if (typeof window !== 'undefined') {
      (window as any).MonacoEnvironment = {
        getWorker: () => {
          // Return a mock worker that does nothing but is compatible
          return {
            postMessage: () => {},
            terminate: () => {},
            onmessage: null,
            onerror: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          } as any;
        },
        // Also disable getWorkerUrl to prevent any worker loading attempts
        getWorkerUrl: () => {
          return 'data:text/javascript;charset=utf-8,';
        }
      };
    }
    
    // Configure the Monaco loader to prevent CDN usage
    loader.config({
      monaco: undefined,
      'vs/nls': undefined,
    });
    
    console.log('✅ Monaco Editor configured for offline use (no workers)');
  } catch (error) {
    console.warn('⚠️ Failed to configure Monaco Editor:', error);
  }
};

// Fallback configuration that completely disables workers
export const configureMonacoNoWorkers = () => {
  console.log('🔧 Configuring Monaco Editor without web workers...');
  
  try {
    // Set up environment to completely avoid workers
    if (typeof window !== 'undefined') {
      (window as any).MonacoEnvironment = {
        getWorker: () => {
          // Return a mock worker that does nothing
          return {
            postMessage: () => {},
            terminate: () => {},
            onmessage: null,
            onerror: null,
          } as any;
        }
      };
    }
    
    console.log('✅ Monaco Editor configured without workers');
  } catch (error) {
    console.warn('⚠️ Failed to configure Monaco Editor:', error);
  }
}; 