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
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptRef = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    if (!SOCKET_IO_ENABLED) {
      console.log('⚠️ Socket.IO disabled - using HTTP polling only');
      setConnected(true);
      return;
    }

    // Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log('🔌 Socket already connected, skipping new connection');
      return;
    }

    console.log('🔌 Global: Initializing shared Socket.IO connection to:', API_BASE_URL);

    try {
      const newSocket = io(API_BASE_URL, {
        ...SOCKET_CONFIG,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxRetries,
      });

      newSocket.on('connect', () => {
        console.log('✅ Global: Connected to server');
        console.log('📡 Transport:', newSocket.io.engine.transport.name);
        socketRef.current = newSocket;
        setConnected(true);
        connectionAttemptRef.current = 0;
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('❌ Global: Disconnected from server:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error: any) => {
        connectionAttemptRef.current++;
        console.error('⚠️ Global: Connection error:', error.message || error);
        if (connectionAttemptRef.current >= maxRetries) {
          console.error('⚠️ Max connection attempts reached');
        }
      });

      newSocket.on('error', (error: any) => {
        console.error('⚠️ Global: Socket error:', error);
      });

      socketRef.current = newSocket;
    } catch (err) {
      console.error('Failed to initialize Socket.IO:', err);
      setConnected(false);
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - keep connection alive for page transitions
      // Only disconnect if absolutely necessary
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
