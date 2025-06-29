import { useEffect, useRef, useState, useCallback } from 'react';

// Base URL for the duels WebSocket service
const DUELS_WS_URL = (import.meta.env.VITE_DUELS_WS_URL || 'ws://127.0.0.1:8004') + '/api/v1/duels/ws';

export interface DuelWebSocketProps {
  duelId?: string;
  userId?: string;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onOpponentJoin?: (userId: string) => void;
  onOpponentLeave?: (userId: string) => void;
}

export const useDuelWebSocket = ({
  duelId,
  userId,
  onStatusChange,
  onOpponentJoin,
  onOpponentLeave,
}: DuelWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [opponentCode, setOpponentCode] = useState<string>('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // AI typing simulation state
  const aiTypingQueue = useRef<any[]>([]);
  const isProcessingAiQueue = useRef<boolean>(false);

  const processAiQueue = useCallback(async () => {
    if (isProcessingAiQueue.current || aiTypingQueue.current.length === 0) {
      return;
    }
    isProcessingAiQueue.current = true;

    const action = aiTypingQueue.current.shift();

    if (action.action === 'type') {
      // Simulate typing character by character
      for (const char of action.content) {
        setOpponentCode(prev => prev + char);
        await new Promise(resolve => setTimeout(resolve, 50 / (action.speed || 1)));
      }
    } else if (action.action === 'delete') {
      // Simulate backspace
      for (let i = 0; i < action.char_count; i++) {
        setOpponentCode(prev => prev.slice(0, -1));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } else if (action.action === 'pause') {
      await new Promise(resolve => setTimeout(resolve, action.duration * 1000));
    }

    isProcessingAiQueue.current = false;
    processAiQueue();
  }, []);
  
  useEffect(() => {
    if (!duelId || !userId) {
      return;
    }

    const ws = new WebSocket(`${DUELS_WS_URL}/${duelId}/${userId}`);
    wsRef.current = ws;

    const handleStatus = (newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    handleStatus('connecting');

    ws.onopen = () => handleStatus('connected');
    ws.onclose = () => handleStatus('disconnected');
    ws.onerror = () => handleStatus('error');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'user_join') {
        onOpponentJoin?.(message.user_id);
      } else if (message.type === 'user_leave') {
        onOpponentLeave?.(message.user_id);
      } else if (message.type === 'code_update') {
        // If it's the AI, queue the actions for simulated typing
        if (message.user_id === 'ai_opponent') {
          aiTypingQueue.current.push(message.data);
          processAiQueue();
        } else {
          // If it's a real user, just update the code
          setOpponentCode(message.data.code);
        }
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [duelId, userId, onStatusChange, onOpponentJoin, onOpponentLeave, processAiQueue]);

  const sendCodeUpdate = useCallback((code: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "code_update",
        user_id: userId,
        data: { code }
      }));
    }
  }, [userId]);

  return { opponentCode, status, sendCodeUpdate };
}; 