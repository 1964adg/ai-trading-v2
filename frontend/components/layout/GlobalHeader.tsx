'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BalanceDisplay from '@/components/shared/BalanceDisplay';
import NotificationsBell from '@/components/shared/NotificationsBell';
import { useMarketStore } from '@/stores/marketStore';

/**
 * Global Header Component
 * Sticky header with navigation and controls visible across all pages
 */
interface GlobalHeaderProps {
  tradingMode?: 'paper' | 'real';
}

export default function GlobalHeader({ tradingMode = 'paper' }: GlobalHeaderProps) {
  const pathname = usePathname();
  const { connectionStatus } = useMarketStore();

  const navItems = [
    { href: '/', label: '📈 Trading' },
    { href: '/scout', label: '🔍 Scout' },
    { href: '/analysis', label: '📊 Analysis' },
    { href: '/orders', label: '⚡ Orders' },
    { href: '/portfolio', label: '💼 Portfolio' },
    { href: '/backtest', label: '🧪 Backtest' },
  ];

  // Status styling
  const statusColor = {
    FULL: 'bg-green-500',
    PARTIAL: 'bg-yellow-500',
    OFFLINE: 'bg-red-500'
  }[connectionStatus];

  const statusDot = connectionStatus !== 'OFFLINE' ? 'animate-pulse' : '';

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      {/* Unified Navigation Row */}
      <nav className="flex items-center gap-6 px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="text-2xl">🚀</div>
          <div className="text-white font-bold text-lg hidden md:block">
            AI Trading <span className="text-blue-400">v2</span>
          </div>
        </div>

        {/* Navigation Links */}
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              pathname === item.href
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {/* Right side: Connection Status + Balance + Notifications */}
        <div className="ml-auto flex items-center gap-4">
          
          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg h-10">
            <span className="text-xs text-gray-400">Connection Status:</span>
            <div className={`w-2 h-2 rounded-full ${statusColor} ${statusDot}`} />
            <span className="text-xs font-medium text-white uppercase">
              {connectionStatus}
            </span>
          </div>

          <BalanceDisplay tradingMode={tradingMode} />
          <NotificationsBell />
        </div>
      </nav>
    </header>
  );
}
