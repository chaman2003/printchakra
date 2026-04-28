import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type AIWorkspaceContextType = {
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
};

const AIWorkspaceContext = createContext<AIWorkspaceContextType | null>(null);

export const useAIWorkspace = (): AIWorkspaceContextType => {
  const ctx = useContext(AIWorkspaceContext);
  if (!ctx) throw new Error('useAIWorkspace must be used within AIWorkspaceProvider');
  return ctx;
};

export const AIWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('printchakra_chat_width');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const togglePanel = useCallback(() => setPanelOpen(prev => !prev), []);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
    },
    [panelWidth]
  );

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;
    const delta = resizeRef.current.startX - e.clientX;
    const next = Math.min(Math.max(resizeRef.current.startWidth + delta, 280), 600);
    setPanelWidth(next);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    resizeRef.current = null;
    localStorage.setItem('printchakra_chat_width', panelWidth.toString());
  }, [isResizing, panelWidth]);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleResizeEnd, handleResizeMove, isResizing]);

  const value = useMemo<AIWorkspaceContextType>(() => ({
    isPanelOpen,
    setPanelOpen,
    togglePanel,
    panelWidth,
    isResizing,
    startResize,
  }), [isPanelOpen, togglePanel, panelWidth, isResizing, startResize]);

  return <AIWorkspaceContext.Provider value={value}>{children}</AIWorkspaceContext.Provider>;
};

