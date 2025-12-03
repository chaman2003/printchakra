import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_CONFIG, SOCKET_IO_ENABLED, ENVIRONMENT } from '../config';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptRef = useRef(0);
  const maxRetries = 5;
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!SOCKET_IO_ENABLED) {
      console.log('[Socket] Socket.IO disabled - using HTTP polling only');
      setConnected(true);
      return;
    }

    // Check if socket already exists globally (from previous mount)
    const existingSocket = (globalThis as any).__PRINTCHAKRA_SOCKET as Socket | null;
    
    // If socket exists and is still connected, reuse it
    if (existingSocket && existingSocket.connected) {
      console.log('[Socket] Reusing existing Socket.IO connection');
      socketRef.current = existingSocket;
      setConnected(true);
      return;
    }
    
    // Prevent multiple simultaneous initialization attempts (React StrictMode safety)
    if (initializingRef.current) {
      console.log('[Socket] Connection attempt already in progress');
      return;
    }
    
    initializingRef.current = true;
    console.log('[Socket] Initializing Socket.IO connection');
    console.log(`[Socket] Environment: ${ENVIRONMENT}`);
    console.log(`[Socket] Backend URL: ${API_BASE_URL}`);

    try {
      const newSocket = io(API_BASE_URL, {
        ...SOCKET_CONFIG,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxRetries,
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected to server');
        socketRef.current = newSocket;
        setConnected(true);
        connectionAttemptRef.current = 0;
        initializingRef.current = false;
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('[Socket] Disconnected:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error: any) => {
        connectionAttemptRef.current++;
        console.warn('[Socket] Connection error:', error.message || error);
        if (error.data) {
          console.warn('[Socket] Error details:', error.data);
        }
        if (connectionAttemptRef.current >= maxRetries) {
          console.error('[Socket] Max connection attempts reached');
          initializingRef.current = false;
        }
      });

      newSocket.on('error', (error: any) => {
        console.error('[Socket] Socket error:', error);
      });

      socketRef.current = newSocket;
      
      // Store globally so remounted providers can reuse the same socket
      try {
        (globalThis as any).__PRINTCHAKRA_SOCKET = newSocket;
      } catch (e) {
        console.warn('[Socket] Unable to store socket globally:', e);
      }
    } catch (err) {
      console.error('[Socket] Failed to initialize:', err);
      setConnected(false);
      initializingRef.current = false;
    }

    // Cleanup: Only disconnect on actual unmount, not on React StrictMode remount
    return () => {
      // Don't disconnect - keep the connection alive for reuse
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
