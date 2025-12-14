'use client';

import { toast } from 'sonner';

interface PopOutConfig {
  url: string;
  title: string;
  width: number;
  height: number;
  emoji: string;
}

const popOutConfigs: Record<string, PopOutConfig> = {
  scout: {
    url: '/scout',
    title: 'Crypto Scout',
    width: 1200,
    height: 800,
    emoji: '🔍',
  },
  analysis: {
    url: '/analysis',
    title: 'Pattern Analysis',
    width: 1400,
    height: 900,
    emoji: '📊',
  },
  orders: {
    url: '/orders',
    title: 'Enhanced Orders',
    width: 1000,
    height: 700,
    emoji: '⚡',
  },
  portfolio: {
    url: '/portfolio',
    title: 'Portfolio & Risk',
    width: 1200,
    height: 800,
    emoji: '💼',
  },
};

/**
 * Pop-Out Buttons Component
 * Provides buttons to open pages in separate windows
 * Only allows internal paths for security
 */

// Whitelist of allowed paths
const ALLOWED_PATHS = ['/scout', '/analysis', '/orders', '/portfolio'];

export default function PopOutButtons() {
  const openPopOut = (config: PopOutConfig) => {
    try {
      // Validate URL is in whitelist
      if (!ALLOWED_PATHS.includes(config.url)) {
        toast.error('Invalid page URL');
        return;
      }

      const left = (window.screen.width - config.width) / 2;
      const top = (window.screen.height - config.height) / 2;
      
      const features = [
        `width=${config.width}`,
        `height=${config.height}`,
        `left=${left}`,
        `top=${top}`,
        'resizable=yes',
        'scrollbars=yes',
        'status=yes',
      ].join(',');

      const newWindow = window.open(config.url, config.title, features);
      
      if (newWindow) {
        newWindow.focus();
        toast.success(`Opened ${config.title} in new window`);
      } else {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      }
    } catch (error) {
      console.error('Failed to open pop-out window:', error);
      toast.error('Failed to open window');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-sm mr-2">Pop-out:</span>
      {Object.entries(popOutConfigs).map(([key, config]) => (
        <button
          key={key}
          onClick={() => openPopOut(config)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
          title={`Open ${config.title} in new window`}
        >
          <span className="text-xl">{config.emoji}</span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {config.title}
          </div>
        </button>
      ))}
    </div>
  );
}
