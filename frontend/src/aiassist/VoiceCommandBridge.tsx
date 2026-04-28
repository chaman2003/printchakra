import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAIWorkspace } from '../context/AIWorkspaceContext';
import { routeVoiceCommand } from './voiceCommandRouter';

/**
 * Subscribes once to backend Socket.IO voice events and routes them
 * to navigation + a small command bus.
 */
const VoiceCommandBridge: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { setPanelOpen } = useAIWorkspace();

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: any) => {
      // Keep AI panel open for voice-driven navigation/workflows
      setPanelOpen(true);
      routeVoiceCommand(payload, (to) => navigate(to));
    };

    socket.on('voice_command_detected', handler);
    return () => {
      socket.off('voice_command_detected', handler);
    };
  }, [navigate, setPanelOpen, socket]);

  return null;
};

export default VoiceCommandBridge;

