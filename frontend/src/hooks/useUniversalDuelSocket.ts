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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);
  const isMounted = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  // Keep the refs updated with the latest callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const handleStatus = useCallback((newStatus: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    console.log(`WebSocket: Status changed to: ${newStatus} for ${duelId}/${userId}`);
    onStatusChangeRef.current(newStatus);
  }, [duelId, userId]);

  const connectWs = useCallback(() => {
    if (!duelId || !userId || !enabled) {
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log(`WebSocket: Already connected or connecting to ${duelId}/${userId}. Aborting new connection attempt.`);
        return;
    }

    const DUELS_WS_BASE_URL = getWebSocketBaseUrl();
    console.log(`WebSocket: Attempting to connect to ${DUELS_WS_BASE_URL}/${duelId}/${userId}`);
    const ws = new WebSocket(`${DUELS_WS_BASE_URL}/${duelId}/${userId}`);

    handleStatus('connecting');

    ws.onopen = () => {
      console.log('WebSocket connected.');
      handleStatus('connected');
      reconnectAttemptsRef.current = 0;
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        ws.send(JSON.stringify(message));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        onMessageRef.current(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      handleStatus('disconnected');
      wsRef.current = null;
      if (isMounted.current && !event.wasClean && event.code !== 1000) {
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          console.log(`Attempting to reconnect WebSocket (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000 * reconnectAttemptsRef.current);
        } else {
          console.error(`Max reconnection attempts reached for duel ${duelId}. Stopping auto-reconnect.`);
          handleStatus('error');
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      handleStatus('error');
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };

    wsRef.current = ws;

    return () => {
        if (wsRef.current === ws) {
            console.log(`WebSocket: Running cleanup for ${duelId}/${userId} (from connectWs)`);
            handleStatus('disconnected');
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, "Cleanup from connectWs");
            }
            wsRef.current = null;
        }
    };
  }, [duelId, userId, enabled, handleStatus]);

  useEffect(() => {
    isMounted.current = true;
    connectWs();

    return () => {
      isMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        console.log(`WebSocket: Running main useEffect cleanup for ${duelId}/${userId}`);
        wsRef.current.close(1000, "Component unmounted or enabled changed to false");
        wsRef.current = null;
      }
    };
  }, [connectWs]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
      console.warn("WebSocket not open. Message queued.", message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, "Component unmounted or duel ended");
      }
      wsRef.current = null;
      handleStatus('disconnected');
      console.log("WebSocket explicitly disconnected.");
    }
  }, [handleStatus]);

  return { sendMessage, disconnect };
};
