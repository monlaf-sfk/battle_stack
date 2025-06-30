import { useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '../types/duel.types';

const DUELS_WS_URL = (import.meta.env.VITE_DUELS_WS_URL || 'ws://127.0.0.1:8004') + '/api/v1/duels/ws';

export interface UniversalDuelSocketProps {
  duelId: string;
  userId: string;
  onMessage: (message: WSMessage) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  enabled: boolean;
}

export const useUniversalDuelSocket = ({
  duelId,
  userId,
  onMessage,
  onStatusChange,
  enabled,
}: UniversalDuelSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  // Keep the refs updated with the latest callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!duelId || !userId || !enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(`${DUELS_WS_URL}/${duelId}/${userId}`);
    wsRef.current = ws;

    const handleStatus = (newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      onStatusChangeRef.current(newStatus);
    };

    handleStatus('connecting');

    ws.onopen = () => handleStatus('connected');
    ws.onclose = () => {
      // Don't set to disconnected if we are unmounting
      if (wsRef.current) {
        handleStatus('disconnected');
      }
    };
    ws.onerror = () => handleStatus('error');

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        onMessageRef.current(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    return () => {
      handleStatus('disconnected');
      ws.close();
      wsRef.current = null;
    };
  }, [duelId, userId, enabled]); // onMessage and onStatusChange are removed from dependencies

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { sendMessage };
}; 