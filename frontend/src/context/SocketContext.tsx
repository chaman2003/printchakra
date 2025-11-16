import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_CONFIG, SOCKET_IO_ENABLED } from '../config';

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
  // Use a module-level singleton to avoid creating multiple socket instances
  // when React StrictMode remounts the tree during development.
  // This ensures only a single Socket.IO connection exists.
  const socketRef = useRef<Socket | null>(null);
  const globalSocketRef = (globalThis as any).__PRINTCHAKRA_SOCKET as Socket | null;
  const connectionAttemptRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    if (!SOCKET_IO_ENABLED) {
      console.log('Socket.IO disabled - using HTTP polling only');
      setConnected(true);
      return;
    }

    // Reuse module/global singleton if available
    if (globalSocketRef && (globalSocketRef as any).connected) {
      console.log('Reusing existing shared Socket.IO connection');
      socketRef.current = globalSocketRef;
      setConnected(true);
      return;
    }

    console.log('Initializing shared Socket.IO connection to:', API_BASE_URL);

    try {
      const newSocket = io(API_BASE_URL, {
        ...SOCKET_CONFIG,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxRetries,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        console.log('Transport:', newSocket.io.engine.transport.name);
        socketRef.current = newSocket;
        setConnected(true);
        connectionAttemptRef.current = 0;
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('Disconnected from server:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error: any) => {
        connectionAttemptRef.current++;
        console.error('Connection error:', error.message || error);
        if (connectionAttemptRef.current >= maxRetries) {
          console.error('Max connection attempts reached');
        }
      });

      newSocket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      socketRef.current = newSocket;
      // Store globally so remounted providers can reuse the same socket
      try {
        (globalThis as any).__PRINTCHAKRA_SOCKET = newSocket;
      } catch (e) {
        // ignore if unable to set global
      }
    } catch (err) {
      console.error('Failed to initialize Socket.IO:', err);
      setConnected(false);
    }

    // Cleanup on unmount. Do not disconnect the socket here — keep the shared
    // connection alive so navigation or StrictMode remounts do not close it.
    return () => {};
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
