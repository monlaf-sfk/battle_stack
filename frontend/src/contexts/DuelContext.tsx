import { createContext, useReducer, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Duel, WSMessage, DuelResult } from '../types/duel.types';

// 1. Define State and Action Types
interface DuelState {
  duel: Duel | null;
  error: string | null;
  socketStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

type DuelAction =
  | { type: 'SET_DUEL'; payload: Duel }
  | { type: 'SOCKET_MESSAGE_RECEIVED'; payload: WSMessage }
  | { type: 'SET_SOCKET_STATUS'; payload: 'connecting' | 'connected' | 'disconnected' | 'error' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET_STATE' };

// 2. Initial State
const initialState: DuelState = {
  duel: null,
  error: null,
  socketStatus: 'disconnected',
};

// 3. Reducer Function
const duelReducer = (state: DuelState, action: DuelAction): DuelState => {
  switch (action.type) {
    case 'SET_DUEL':
      return { ...state, duel: action.payload, error: null };
    
    case 'SOCKET_MESSAGE_RECEIVED':
      const message: any = action.payload;
      console.log('DuelContext - SOCKET_MESSAGE_RECEIVED:', message['type'], message);
      
      if (!state.duel) {
          console.warn('DuelContext - Received message but duel is null:', message['type']);
          return state;
      }
      
      switch (message['type']) {
        case 'duel_start':
          return {
            ...state,
            duel: message.data,
            socketStatus: 'connected',
            error: null,
          };
        case 'duel_end':
          try {
            const parsedResult: DuelResult = message.data;
            console.log('DuelContext - Processing duel_end message. Final results:', parsedResult);
            if (parsedResult.player_one_result && parsedResult.player_two_result) {
                console.log('DuelContext - Both player results present in duel_end message.');
            } else {
                console.warn('DuelContext - Missing player results in duel_end message:', parsedResult);
            }
            return {
              ...state,
              duel: {
                ...state.duel,
                status: 'completed',
                finished_at: parsedResult.finished_at,
                results: parsedResult
              } as Duel
            };
          } catch (e) {
            console.error('DuelContext - Failed to process duel_end data:', e);
            return state;
          }
        case 'code_update':
          return {
            ...state,
            duel: {
              ...state.duel,
              player_one_code: message.user_id === state.duel.player_one_id ? message.code : state.duel.player_one_code,
              player_two_code: message.user_id === state.duel.player_two_id ? message.code : state.duel.player_two_code,
            }
          };
        case 'ai_progress':
          console.log('DuelContext - AI Progress Update:', message.data.code_chunk.substring(0, 50) + '...');
          return state;
        case 'ai_delete':
          console.log('DuelContext - AI Delete Update:', message.data.char_count);
          return state;
        case 'test_result':
          console.log('DuelContext - Test Result Update for user:', message.user_id, 'is_correct:', message.data.is_correct);
          return state;
        default:
          console.log('DuelContext - Unhandled WebSocket message type:', message['type']);
          return state;
      }

    case 'SET_SOCKET_STATUS':
      return { ...state, socketStatus: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET_STATE':
      return { duel: null, error: null, socketStatus: 'disconnected' };

    default:
      return state;
  }
};

// 4. Create Context
const DuelStateContext = createContext<DuelState | undefined>(undefined);
const DuelDispatchContext = createContext<React.Dispatch<DuelAction> | undefined>(undefined);

// 5. Provider Component
export const DuelProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(duelReducer, initialState);

  return (
    <DuelStateContext.Provider value={state}>
      <DuelDispatchContext.Provider value={dispatch}>
        {children}
      </DuelDispatchContext.Provider>
    </DuelStateContext.Provider>
  );
};

// 6. Custom Hooks for easy access
export const useDuelState = () => {
  const context = useContext(DuelStateContext);
  if (context === undefined) {
    throw new Error('useDuelState must be used within a DuelProvider');
  }
  return context;
};

export const useDuelDispatch = () => {
  const context = useContext(DuelDispatchContext);
  if (context === undefined) {
    throw new Error('useDuelDispatch must be used within a DuelProvider');
  }
  return context;
}; 