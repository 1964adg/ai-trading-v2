/**
 * Draggable Window Component
 * Provides moveable, resizable window functionality
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { WindowConfig, WindowPosition, WindowSize } from '@/types/window';

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
  const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Update viewport size on mount and resize
  useEffect(() => {
    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Handle drag start - calculate initial offset between cursor and window
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0;
      const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0;
      
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, []);

  // Handle drag - use offset to maintain cursor position relative to window
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (viewportSize.width === 0 || viewportSize.height === 0) return;
    
    // Calculate new position based on cursor position and offset
    const newPosition = {
      x: info.point.x - dragOffset.x,
      y: info.point.y - dragOffset.y,
    };
    
    // Keep window within viewport
    const maxX = viewportSize.width - config.size.width;
    const maxY = viewportSize.height - config.size.height;
    
    onConfigChange({
      position: {
        x: Math.max(0, Math.min(newPosition.x, maxX)),
        y: Math.max(0, Math.min(newPosition.y, maxY)),
      },
    });
  }, [dragOffset, config.size, viewportSize, onConfigChange]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle resize start - improved isolation
  const handleResizeStart = useCallback((handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    setStartSize(config.size);
    setStartPosition(config.position);
    setStartMousePos({ x: e.clientX, y: e.clientY });
    onFocus();
  }, [config.size, config.position, onFocus]);

  // Handle resize move - improved event isolation
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.clientX - startMousePos.x;
    const deltaY = e.clientY - startMousePos.y;

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
  }, [isResizing, resizeHandle, startSize, startPosition, startMousePos, config, onConfigChange]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Attach resize event listeners with proper event handling
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove, { passive: false });
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

  // Handle maximize - with proper viewport constraints
  const handleMaximize = useCallback(() => {
    if (config.isMaximized) {
      // Restore to previous position within viewport
      const ensureWithinViewport = (pos: WindowPosition, size: WindowSize) => {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        return {
          x: Math.max(0, Math.min(pos.x, viewport.width - size.width)),
          y: Math.max(0, Math.min(pos.y, viewport.height - size.height)),
        };
      };
      
      onConfigChange({ 
        isMaximized: false,
        position: ensureWithinViewport(config.position, config.size),
      });
    } else {
      // Store current state and maximize within viewport
      const titleBarHeight = showControls ? 40 : 0;
      
      onConfigChange({
        isMaximized: true,
        position: { x: 0, y: 0 },
        size: { 
          width: window.innerWidth, 
          height: window.innerHeight - titleBarHeight 
        },
      });
    }
  }, [config, onConfigChange, showControls]);

  // Calculate window style based on state
  const windowStyle = config.isMaximized
    ? {
        position: 'fixed' as const,
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
      }
    : {
        position: 'absolute' as const,
        left: config.position.x,
        top: config.position.y,
        width: config.size.width,
        height: config.size.height,
        zIndex: config.zIndex,
      };

  if (config.isMinimized) {
    return (
      <motion.div
        className={`absolute bg-gray-900 border border-gray-700 rounded-lg shadow-xl cursor-pointer ${className}`}
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
      className={`bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden ${className} ${
        isDragging ? 'border-blue-400' : ''
      } ${isResizing ? 'border-purple-400' : ''}`}
      style={{
        ...windowStyle,
        position: windowStyle.position,
      }}
      drag={enableDrag && !config.isMaximized}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={viewportSize.width > 0 ? {
        left: 0,
        top: 0,
        right: viewportSize.width - config.size.width,
        bottom: viewportSize.height - config.size.height,
      } : undefined}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={onFocus}
      whileHover={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
    >
      {/* Drag/Resize Visual Feedback */}
      {(isDragging || isResizing) && (
        <div className="absolute inset-0 border-2 border-current pointer-events-none opacity-50 rounded-lg" />
      )}

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
