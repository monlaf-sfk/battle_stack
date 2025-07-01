import { useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '../types/duel.types';

const getWebSocketBaseUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
};

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
        console.log(`WebSocket: Closing connection for ${duelId}/${userId} (disabled/no IDs)`);
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const DUELS_WS_BASE_URL = getWebSocketBaseUrl();
    console.log(`WebSocket: Attempting to connect to ${DUELS_WS_BASE_URL}/${duelId}/${userId}`);
    const ws = new WebSocket(`${DUELS_WS_BASE_URL}/${duelId}/${userId}`);
    wsRef.current = ws;

    const handleStatus = (newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      console.log(`WebSocket: Status changed to: ${newStatus} for ${duelId}/${userId}`);
      onStatusChangeRef.current(newStatus);
    };

    handleStatus('connecting');

    ws.onopen = () => {
      console.log(`WebSocket: Connected to ${duelId}/${userId}`);
      handleStatus('connected');
    };
    ws.onclose = (event) => {
      console.log(`WebSocket: Disconnected from ${duelId}/${userId}. Code: ${event.code}, Reason: ${event.reason}`);
      // Don't set to disconnected if we are unmounting
      if (wsRef.current) {
        handleStatus('disconnected');
      }
    };
    ws.onerror = (error) => {
      console.error(`WebSocket: Error for ${duelId}/${userId}:`, error);
      handleStatus('error');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        // console.log(`WebSocket: Parsed message type: ${message.type || 'undefined'}`, message);
        onMessageRef.current(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    return () => {
      console.log(`WebSocket: Running cleanup for ${duelId}/${userId}`);
      handleStatus('disconnected');
      ws.close();
      wsRef.current = null;
    };
  }, [duelId, userId, enabled]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { sendMessage };
};
