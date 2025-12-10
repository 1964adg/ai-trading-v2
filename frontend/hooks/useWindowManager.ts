/**
 * Window Manager Hook
 * Manages draggable/resizable window state and persistence
 */

import { useCallback, useState, useEffect } from 'react';
import { WindowConfig, WindowPosition, WindowSize, LayoutState, LayoutPreset } from '@/types/window';

const STORAGE_KEY = 'ai-trading-layout';

// Default window configurations
const getDefaultWindows = (): Record<string, WindowConfig> => ({
  pnlTracker: {
    id: 'pnlTracker',
    title: 'P&L Summary',
    position: { x: 20, y: 20 },
    size: { width: 350, height: 400 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    minWidth: 300,
    minHeight: 300,
  },
  realPositions: {
    id: 'realPositions',
    title: 'Active Positions',
    position: { x: 390, y: 20 },
    size: { width: 400, height: 500 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    minWidth: 350,
    minHeight: 400,
  },
  realBalance: {
    id: 'realBalance',
    title: 'Account Balance',
    position: { x: 810, y: 20 },
    size: { width: 350, height: 300 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    minWidth: 300,
    minHeight: 250,
  },
  patternDashboard: {
    id: 'patternDashboard',
    title: 'Pattern Analysis',
    position: { x: 20, y: 440 },
    size: { width: 400, height: 350 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    minWidth: 350,
    minHeight: 300,
  },
  liveOrderbook: {
    id: 'liveOrderbook',
    title: 'Live Orderbook',
    position: { x: 810, y: 340 },
    size: { width: 350, height: 450 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1,
    minWidth: 300,
    minHeight: 400,
  },
});

export function useWindowManager() {
  const [state, setState] = useState<LayoutState>({
    windows: getDefaultWindows(),
    activeWindowId: null,
    gridSnap: false,
    gridSize: 10,
    layoutPreset: 'default',
    theme: 'dark',
  });

  // Load layout from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem(STORAGE_KEY);
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setState(parsed);
      } catch (error) {
        console.error('Failed to load layout from localStorage:', error);
      }
    }
  }, []);

  // Save layout to localStorage whenever it changes
  const saveLayout = useCallback((newState: LayoutState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Update window configuration
  const updateWindow = useCallback((id: string, updates: Partial<WindowConfig>) => {
    setState((prev) => {
      const updatedWindows = {
        ...prev.windows,
        [id]: {
          ...prev.windows[id],
          ...updates,
        },
      };
      const newState = { ...prev, windows: updatedWindows };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  // Move window to new position
  const moveWindow = useCallback((id: string, position: WindowPosition) => {
    setState((prev) => {
      let finalPosition = position;
      
      // Apply grid snap if enabled (read from current state)
      if (prev.gridSnap) {
        finalPosition = {
          x: Math.round(position.x / prev.gridSize) * prev.gridSize,
          y: Math.round(position.y / prev.gridSize) * prev.gridSize,
        };
      }
      
      const updatedWindows = {
        ...prev.windows,
        [id]: {
          ...prev.windows[id],
          position: finalPosition,
        },
      };
      
      const newState = { ...prev, windows: updatedWindows };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  // Resize window
  const resizeWindow = useCallback((id: string, size: WindowSize) => {
    const window = state.windows[id];
    if (!window) return;

    // Apply constraints
    const finalSize = {
      width: Math.max(
        window.minWidth || 200,
        Math.min(size.width, window.maxWidth || Infinity)
      ),
      height: Math.max(
        window.minHeight || 200,
        Math.min(size.height, window.maxHeight || Infinity)
      ),
    };

    updateWindow(id, { size: finalSize });
  }, [state.windows, updateWindow]);

  // Focus window (bring to front)
  const focusWindow = useCallback((id: string) => {
    setState((prev) => {
      // Find highest z-index
      const maxZ = Math.max(...Object.values(prev.windows).map(w => w.zIndex), 0);
      
      // Update focused window's z-index
      const updatedWindows = {
        ...prev.windows,
        [id]: {
          ...prev.windows[id],
          zIndex: maxZ + 1,
        },
      };
      
      const newState = {
        ...prev,
        windows: updatedWindows,
        activeWindowId: id,
      };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  // Minimize/maximize window
  const toggleMinimize = useCallback((id: string) => {
    setState((prev) => {
      const window = prev.windows[id];
      const updatedWindows = {
        ...prev.windows,
        [id]: {
          ...window,
          isMinimized: !window.isMinimized,
          isMaximized: false,
        },
      };
      const newState = { ...prev, windows: updatedWindows };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  const toggleMaximize = useCallback((id: string) => {
    setState((prev) => {
      const window = prev.windows[id];
      const updatedWindows = {
        ...prev.windows,
        [id]: {
          ...window,
          isMaximized: !window.isMaximized,
          isMinimized: false,
        },
      };
      const newState = { ...prev, windows: updatedWindows };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    const newState = {
      windows: getDefaultWindows(),
      activeWindowId: null,
      gridSnap: false,
      gridSize: 10,
      layoutPreset: 'default' as LayoutPreset,
      theme: 'dark' as const,
    };
    setState(newState);
    saveLayout(newState);
  }, [saveLayout]);

  // Apply layout preset
  const applyPreset = useCallback((preset: LayoutPreset) => {
    let windows: Record<string, WindowConfig>;
    
    switch (preset) {
      case 'trading':
        // Trading-focused layout
        windows = {
          ...getDefaultWindows(),
          realPositions: {
            ...getDefaultWindows().realPositions,
            position: { x: 20, y: 20 },
            size: { width: 500, height: 600 },
          },
          pnlTracker: {
            ...getDefaultWindows().pnlTracker,
            position: { x: 540, y: 20 },
            size: { width: 400, height: 300 },
          },
        };
        break;
        
      case 'analysis':
        // Analysis-focused layout
        windows = {
          ...getDefaultWindows(),
          patternDashboard: {
            ...getDefaultWindows().patternDashboard,
            position: { x: 20, y: 20 },
            size: { width: 600, height: 500 },
          },
        };
        break;
        
      default:
        windows = getDefaultWindows();
    }
    
    const newState = {
      ...state,
      windows,
      layoutPreset: preset,
    };
    setState(newState);
    saveLayout(newState);
  }, [state, saveLayout]);

  // Toggle grid snap
  const toggleGridSnap = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, gridSnap: !prev.gridSnap };
      saveLayout(newState);
      return newState;
    });
  }, [saveLayout]);

  return {
    windows: state.windows,
    activeWindowId: state.activeWindowId,
    gridSnap: state.gridSnap,
    gridSize: state.gridSize,
    layoutPreset: state.layoutPreset,
    moveWindow,
    resizeWindow,
    focusWindow,
    toggleMinimize,
    toggleMaximize,
    updateWindow,
    resetLayout,
    applyPreset,
    toggleGridSnap,
  };
}
