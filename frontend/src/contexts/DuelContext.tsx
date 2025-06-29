import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import type { Duel, WSMessage } from '../types/duel.types';

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
      return { ...state, duel: action.payload };
    
    case 'SOCKET_MESSAGE_RECEIVED':
      const message = action.payload;
      if (!state.duel) return state;

      switch (message.type) {
        case 'duel_start':
          return { ...state, duel: message.data as Duel };
        case 'player_progress':
          return { 
            ...state,
            duel: {
              ...state.duel,
              player_one_code: message.data.player_id === state.duel.player_one_id ? message.data.code : state.duel.player_one_code,
              player_two_code: message.data.player_id === state.duel.player_two_id ? message.data.code : state.duel.player_two_code,
            }
          };
        case 'ai_progress':
             return {
                ...state,
                duel: {
                    ...state.duel,
                    player_two_code: message.data.code,
                }
             }
        case 'duel_end':
            return {
                ...state,
                duel: {
                    ...state.duel,
                    status: 'COMPLETED',
                    results: message.data,
                    finished_at: message.data.finished_at,
                }
            }
        default:
          return state;
      }

    case 'SET_SOCKET_STATUS':
      return { ...state, socketStatus: action.payload };
      
    case 'SET_ERROR':
        return { ...state, error: action.payload };

    case 'RESET_STATE':
        return initialState;

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