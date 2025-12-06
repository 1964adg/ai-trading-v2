'use client';

/**
 * Layout Manager Component
 * Workspace management with predefined layouts and customization
 */

import { useState, useEffect } from 'react';

export type LayoutType = 'SCALPING' | 'ANALYSIS' | 'RISK_MONITORING' | 'CUSTOM';

export interface LayoutConfig {
  id: string;
  name: string;
  type: LayoutType;
  description: string;
  panels: {
    chart: { visible: boolean; size: 'small' | 'medium' | 'large' };
    orderbook: { visible: boolean; size: 'small' | 'medium' | 'large' };
    positions: { visible: boolean; size: 'small' | 'medium' | 'large' };
    orders: { visible: boolean; size: 'small' | 'medium' | 'large' };
    indicators: { visible: boolean; size: 'small' | 'medium' | 'large' };
    riskManager: { visible: boolean; size: 'small' | 'medium' | 'large' };
  };
}

const PREDEFINED_LAYOUTS: LayoutConfig[] = [
  {
    id: 'scalping',
    name: 'Scalping',
    type: 'SCALPING',
    description: 'Optimized for fast scalping with quick order entry',
    panels: {
      chart: { visible: true, size: 'large' },
      orderbook: { visible: true, size: 'medium' },
      positions: { visible: true, size: 'small' },
      orders: { visible: true, size: 'medium' },
      indicators: { visible: false, size: 'small' },
      riskManager: { visible: false, size: 'small' },
    },
  },
  {
    id: 'analysis',
    name: 'Analysis',
    type: 'ANALYSIS',
    description: 'Focus on technical analysis and indicators',
    panels: {
      chart: { visible: true, size: 'large' },
      orderbook: { visible: false, size: 'small' },
      positions: { visible: true, size: 'small' },
      orders: { visible: false, size: 'small' },
      indicators: { visible: true, size: 'large' },
      riskManager: { visible: false, size: 'small' },
    },
  },
  {
    id: 'risk',
    name: 'Risk Monitoring',
    type: 'RISK_MONITORING',
    description: 'Monitor positions and manage risk',
    panels: {
      chart: { visible: true, size: 'medium' },
      orderbook: { visible: false, size: 'small' },
      positions: { visible: true, size: 'large' },
      orders: { visible: true, size: 'medium' },
      indicators: { visible: false, size: 'small' },
      riskManager: { visible: true, size: 'large' },
    },
  },
];

interface LayoutManagerProps {
  currentLayout?: LayoutType;
  onLayoutChange?: (layout: LayoutConfig) => void;
  onClose?: () => void;
}

export default function LayoutManager({
  currentLayout = 'SCALPING',
  onLayoutChange,
  onClose,
}: LayoutManagerProps) {
  const [activeLayout, setActiveLayout] = useState<LayoutConfig>(
    PREDEFINED_LAYOUTS.find(l => l.type === currentLayout) || PREDEFINED_LAYOUTS[0]
  );
  const [customLayouts, setCustomLayouts] = useState<LayoutConfig[]>([]);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutConfig | null>(null);

  // Load custom layouts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom_layouts');
      if (saved) {
        setCustomLayouts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load custom layouts:', error);
    }
  }, []);

  // Save custom layouts to localStorage
  const saveCustomLayouts = (layouts: LayoutConfig[]) => {
    try {
      localStorage.setItem('custom_layouts', JSON.stringify(layouts));
      setCustomLayouts(layouts);
    } catch (error) {
      console.error('Failed to save custom layouts:', error);
    }
  };

  const handleSelectLayout = (layout: LayoutConfig) => {
    setActiveLayout(layout);
    onLayoutChange?.(layout);
  };

  const handleSaveCustomLayout = (layout: LayoutConfig) => {
    const existing = customLayouts.findIndex(l => l.id === layout.id);
    let updated: LayoutConfig[];

    if (existing >= 0) {
      updated = [...customLayouts];
      updated[existing] = layout;
    } else {
      updated = [...customLayouts, layout];
    }

    saveCustomLayouts(updated);
    setShowCustomEditor(false);
    setEditingLayout(null);
  };

  const handleDeleteCustomLayout = (id: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) {
      return;
    }

    const updated = customLayouts.filter(l => l.id !== id);
    saveCustomLayouts(updated);

    if (activeLayout.id === id) {
      handleSelectLayout(PREDEFINED_LAYOUTS[0]);
    }
  };

  const handleCreateCustomLayout = () => {
    const newLayout: LayoutConfig = {
      id: `custom_${Date.now()}`,
      name: 'New Layout',
      type: 'CUSTOM',
      description: 'Custom layout',
      panels: {
        chart: { visible: true, size: 'large' },
        orderbook: { visible: true, size: 'medium' },
        positions: { visible: true, size: 'medium' },
        orders: { visible: true, size: 'medium' },
        indicators: { visible: true, size: 'medium' },
        riskManager: { visible: true, size: 'medium' },
      },
    };
    setEditingLayout(newLayout);
    setShowCustomEditor(true);
  };

  // Custom layout editor
  if (showCustomEditor && editingLayout) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Edit Custom Layout</h2>
            <button
              onClick={() => {
                setShowCustomEditor(false);
                setEditingLayout(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Layout Name</label>
              <input
                type="text"
                value={editingLayout.name}
                onChange={(e) => setEditingLayout({ ...editingLayout, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <input
                type="text"
                value={editingLayout.description}
                onChange={(e) => setEditingLayout({ ...editingLayout, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-3">Panel Configuration</label>
              <div className="space-y-3">
                {Object.entries(editingLayout.panels).map(([key, config]) => (
                  <div key={key} className="bg-gray-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.visible}
                          onChange={(e) => {
                            setEditingLayout({
                              ...editingLayout,
                              panels: {
                                ...editingLayout.panels,
                                [key]: { ...config, visible: e.target.checked },
                              },
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                      
                      {config.visible && (
                        <select
                          value={config.size}
                          onChange={(e) => {
                            setEditingLayout({
                              ...editingLayout,
                              panels: {
                                ...editingLayout.panels,
                                [key]: { ...config, size: e.target.value as 'small' | 'medium' | 'large' },
                              },
                            });
                          }}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                onClick={() => handleSaveCustomLayout(editingLayout)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
              >
                Save Layout
              </button>
              <button
                onClick={() => {
                  setShowCustomEditor(false);
                  setEditingLayout(null);
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main layout manager screen
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">⚙️ Layout Manager</h2>
            <p className="text-sm text-gray-400 mt-1">
              Choose or customize your workspace layout
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Predefined Layouts */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Predefined Layouts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PREDEFINED_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => handleSelectLayout(layout)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeLayout.id === layout.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{layout.name}</h4>
                  {activeLayout.id === layout.id && (
                    <span className="text-blue-400">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">{layout.description}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(layout.panels)
                    .filter(([, config]) => config.visible)
                    .map(([key]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                      >
                        {key}
                      </span>
                    ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Layouts */}
        {customLayouts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3">Custom Layouts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`p-4 rounded-lg border-2 transition-all relative ${
                    activeLayout.id === layout.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <button
                    onClick={() => handleSelectLayout(layout)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{layout.name}</h4>
                      {activeLayout.id === layout.id && (
                        <span className="text-blue-400">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{layout.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(layout.panels)
                        .filter(([, config]) => config.visible)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                          >
                            {key}
                          </span>
                        ))}
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLayout(layout);
                        setShowCustomEditor(true);
                      }}
                      className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomLayout(layout.id);
                      }}
                      className="p-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Custom Layout Button */}
        <button
          onClick={handleCreateCustomLayout}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
        >
          + Create Custom Layout
        </button>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2 text-sm">⌨️ Keyboard Shortcuts</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• F1 - Switch to Scalping layout</li>
            <li>• F2 - Switch to Analysis layout</li>
            <li>• F3 - Switch to Risk Monitoring layout</li>
            <li>• F4 - Switch to last Custom layout</li>
          </ul>
        </div>

        {/* Current Layout Info */}
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2 text-sm">📊 Current Layout: {activeLayout.name}</h4>
          <p className="text-xs text-gray-400">{activeLayout.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(activeLayout.panels).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between text-gray-400">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className={config.visible ? 'text-green-400' : 'text-gray-600'}>
                  {config.visible ? `${config.size} ✓` : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
