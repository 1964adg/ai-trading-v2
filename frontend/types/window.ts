/**
 * Window Configuration Types
 * Defines interfaces for draggable/resizable window system
 */

import { ReactNode } from 'react';

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowConfig {
  id: string;
  title: string;
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DraggableWindowProps {
  config: WindowConfig;
  onConfigChange: (config: Partial<WindowConfig>) => void;
  children: ReactNode;
  enableDrag?: boolean;
  enableResize?: boolean;
  showControls?: boolean;
  className?: string;
}

export interface WindowManagerState {
  windows: Record<string, WindowConfig>;
  activeWindowId: string | null;
  gridSnap: boolean;
  gridSize: number;
}

export type LayoutPreset = 'default' | 'trading' | 'analysis' | 'custom';

export interface LayoutState extends WindowManagerState {
  layoutPreset: LayoutPreset;
  theme: 'light' | 'dark';
}
