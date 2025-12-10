/**
 * Draggable Window Component
 * Provides moveable, resizable window functionality
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { WindowConfig } from '@/types/window';

interface DraggableWindowProps {
  config: WindowConfig;
  onConfigChange: (updates: Partial<WindowConfig>) => void;
  onFocus: () => void;
  children: React.ReactNode;
  enableDrag?: boolean;
  enableResize?: boolean;
  showControls?: boolean;
  className?: string;
}

export default function DraggableWindow({
  config,
  onConfigChange,
  onFocus,
  children,
  enableDrag = true,
  enableResize = true,
  showControls = true,
  className = '',
}: DraggableWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startSize, setStartSize] = useState(config.size);
  const [startPosition, setStartPosition] = useState(config.position);

  // Handle drag
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newPosition = {
      x: config.position.x + info.delta.x,
      y: config.position.y + info.delta.y,
    };
    
    // Keep window within viewport
    const maxX = window.innerWidth - config.size.width;
    const maxY = window.innerHeight - config.size.height;
    
    onConfigChange({
      position: {
        x: Math.max(0, Math.min(newPosition.x, maxX)),
        y: Math.max(0, Math.min(newPosition.y, maxY)),
      },
    });
  }, [config.position, config.size, onConfigChange]);

  // Handle resize start
  const handleResizeStart = useCallback((handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setStartSize(config.size);
    setStartPosition(config.position);
    onFocus();
  }, [config.size, config.position, onFocus]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;

    const deltaX = e.clientX - (startPosition.x + startSize.width);
    const deltaY = e.clientY - (startPosition.y + startSize.height);

    const newSize = { ...startSize };
    const newPosition = { ...startPosition };

    switch (resizeHandle) {
      case 'se': // Bottom-right
        newSize.width = Math.max(config.minWidth || 200, startSize.width + deltaX);
        newSize.height = Math.max(config.minHeight || 200, startSize.height + deltaY);
        break;
      case 'sw': // Bottom-left
        newSize.width = Math.max(config.minWidth || 200, startSize.width - deltaX);
        newSize.height = Math.max(config.minHeight || 200, startSize.height + deltaY);
        newPosition.x = startPosition.x + (startSize.width - newSize.width);
        break;
      case 'ne': // Top-right
        newSize.width = Math.max(config.minWidth || 200, startSize.width + deltaX);
        newSize.height = Math.max(config.minHeight || 200, startSize.height - deltaY);
        newPosition.y = startPosition.y + (startSize.height - newSize.height);
        break;
      case 'nw': // Top-left
        newSize.width = Math.max(config.minWidth || 200, startSize.width - deltaX);
        newSize.height = Math.max(config.minHeight || 200, startSize.height - deltaY);
        newPosition.x = startPosition.x + (startSize.width - newSize.width);
        newPosition.y = startPosition.y + (startSize.height - newSize.height);
        break;
      case 'e': // Right
        newSize.width = Math.max(config.minWidth || 200, startSize.width + deltaX);
        break;
      case 'w': // Left
        newSize.width = Math.max(config.minWidth || 200, startSize.width - deltaX);
        newPosition.x = startPosition.x + (startSize.width - newSize.width);
        break;
      case 'n': // Top
        newSize.height = Math.max(config.minHeight || 200, startSize.height - deltaY);
        newPosition.y = startPosition.y + (startSize.height - newSize.height);
        break;
      case 's': // Bottom
        newSize.height = Math.max(config.minHeight || 200, startSize.height + deltaY);
        break;
    }

    // Apply max constraints
    if (config.maxWidth) {
      newSize.width = Math.min(newSize.width, config.maxWidth);
    }
    if (config.maxHeight) {
      newSize.height = Math.min(newSize.height, config.maxHeight);
    }

    onConfigChange({ size: newSize, position: newPosition });
  }, [isResizing, resizeHandle, startSize, startPosition, config, onConfigChange]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Attach resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    onConfigChange({ isMinimized: !config.isMinimized });
  }, [config.isMinimized, onConfigChange]);

  // Handle maximize
  const handleMaximize = useCallback(() => {
    onConfigChange({ isMaximized: !config.isMaximized });
  }, [config.isMaximized, onConfigChange]);

  // Calculate window style based on state
  const windowStyle = config.isMaximized
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
      }
    : {
        left: config.position.x,
        top: config.position.y,
        width: config.size.width,
        height: config.size.height,
      };

  if (config.isMinimized) {
    return (
      <motion.div
        className={`fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl cursor-pointer ${className}`}
        style={{
          left: config.position.x,
          top: config.position.y,
          zIndex: config.zIndex,
          width: 250,
          height: 40,
        }}
        onClick={handleMinimize}
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between p-2">
          <h3 className="text-sm font-semibold text-white truncate">{config.title}</h3>
          <div className="flex gap-1">
            <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={windowRef}
      className={`fixed bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden ${className}`}
      style={{
        ...windowStyle,
        zIndex: config.zIndex,
      }}
      drag={enableDrag && !config.isMaximized}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{
        left: 0,
        top: 0,
        right: window.innerWidth - config.size.width,
        bottom: window.innerHeight - config.size.height,
      }}
      onDrag={handleDrag}
      onClick={onFocus}
      whileHover={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
    >
      {/* Title Bar */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-move">
          <h3 className="text-sm font-semibold text-white truncate">{config.title}</h3>
          
          {/* Window Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
              title="Minimize"
            />
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
              title="Maximize"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="h-full overflow-auto p-4" style={{ 
        height: showControls ? 'calc(100% - 40px)' : '100%' 
      }}>
        {children}
      </div>

      {/* Resize Handles */}
      {enableResize && !config.isMaximized && (
        <>
          {/* Corner handles */}
          <div
            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
            onMouseDown={(e) => handleResizeStart('nw', e)}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
            onMouseDown={(e) => handleResizeStart('ne', e)}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
            onMouseDown={(e) => handleResizeStart('sw', e)}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            onMouseDown={(e) => handleResizeStart('se', e)}
          />

          {/* Edge handles */}
          <div
            className="absolute top-0 left-3 right-3 h-1 cursor-n-resize"
            onMouseDown={(e) => handleResizeStart('n', e)}
          />
          <div
            className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize"
            onMouseDown={(e) => handleResizeStart('s', e)}
          />
          <div
            className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize"
            onMouseDown={(e) => handleResizeStart('w', e)}
          />
          <div
            className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize"
            onMouseDown={(e) => handleResizeStart('e', e)}
          />
        </>
      )}
    </motion.div>
  );
}
