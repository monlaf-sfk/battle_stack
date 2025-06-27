import { useEffect, useRef, useCallback, useMemo } from 'react';
import { duelsApiService } from '../services/duelService';
import type { WSMessage, ConnectionStatus } from '../types/duel.types';
import { createPingMessage } from '../utils/duelHelpers';

// Simplified WebSocket connection management

interface UseDuelWebSocketProps {
  duelId: string;
  userId: string;
  onMessage: (message: WSMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onConnect: () => void;
  enabled?: boolean;
}

export const useDuelWebSocket = ({
  duelId,
  userId,
  onMessage,
  onStatusChange,
  onConnect,
  enabled = true
}: UseDuelWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isCleaningUpRef = useRef(false);
  const connectionKeyRef = useRef<string>('');
  
  // Stabilize callbacks using refs to prevent dependency issues
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onConnectRef = useRef(onConnect);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  
  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Memoize the connection key to prevent unnecessary reconnections
  const connectionKey = useMemo(() => `${duelId}:${userId}`, [duelId, userId]);

  useEffect(() => {
    // Skip if basic requirements not met
    if (!duelId || !userId || !enabled) {
      return;
    }

    // Skip if already connected to the same duel
    if (connectionKeyRef.current === connectionKey && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔗 Already connected to this duel, skipping');
      return;
    }

    // Update connection key
    connectionKeyRef.current = connectionKey;
    isCleaningUpRef.current = false;
    
    const connectWebSocket = () => {
      if (isCleaningUpRef.current) {
        console.log('⚠️ Skipping connection - cleanup in progress');
        return;
      }

      // Close existing connection if any
      if (wsRef.current) {
        console.log('🔄 Closing existing connection');
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log('🔌 Creating WebSocket connection to:', `ws://127.0.0.1:8004/api/v1/duels/ws/${duelId}`);
      
      try {
        onStatusChangeRef.current('connecting');
        const ws = duelsApiService.createWebSocketConnection(duelId);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCleaningUpRef.current) {
            console.log('⚠️ Cleanup in progress during connection, closing WebSocket');
            ws.close();
            return;
          }
          
          console.log('✅ WebSocket connected successfully');
          onConnectRef.current();
          onStatusChangeRef.current('connected');
          reconnectAttemptsRef.current = 0;
          
          // Set up ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && !isCleaningUpRef.current) {
              try {
                ws.send(JSON.stringify(createPingMessage(userId)));
              } catch (error) {
                console.log('Ping failed:', error);
              }
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          if (isCleaningUpRef.current) return;
          
          try {
            const message: WSMessage = JSON.parse(event.data);
            onMessageRef.current(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('❌ WebSocket disconnected:', event.code, event.reason);
          onStatusChangeRef.current('disconnected');
          
          // Clear ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          // Don't reconnect if cleanup is in progress, duel completed, or manual close
          if (isCleaningUpRef.current || event.code === 4000 || event.code === 1000) {
            console.log('🚫 Not reconnecting - cleanup, duel completed, or manual close');
            return;
          }
          
          // Reconnection logic with exponential backoff
          if (event.code !== 1001 && reconnectAttemptsRef.current < 3) {
            const delay = Math.min(Math.pow(2, reconnectAttemptsRef.current) * 1000, 10000);
            reconnectAttemptsRef.current++;
            
            console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/3)`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isCleaningUpRef.current && connectionKeyRef.current === connectionKey) {
                connectWebSocket();
              }
            }, delay);
          } else if (reconnectAttemptsRef.current >= 3) {
            console.log('❌ Max reconnection attempts reached');
            onStatusChangeRef.current('error');
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          onStatusChangeRef.current('error');
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        onStatusChangeRef.current('error');
      }
    };

    // Start connection
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      isCleaningUpRef.current = true;
      
      // Clear timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close(1000, 'Component unmounted');
          }
        } catch (error) {
          console.log('Error closing WebSocket:', error);
        }
        wsRef.current = null;
      }
      
      // Clear connection key
      connectionKeyRef.current = '';
    };
  }, [connectionKey, enabled]); // Only depend on stable values

  return { sendMessage };
}; 