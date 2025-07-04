import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { DuelProblem, DuelResult, WSMessage, TestResultResponse, DuelResponse, AIProgressMessage, AIDeleteMessage } from '../types/duel.types';
import { useAuth } from './AuthContext';
import { duelsApiService } from '../services/duelService';
import { useToast } from '../components/ui/Toast';
// ... existing code ... 