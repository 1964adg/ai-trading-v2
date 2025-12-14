'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SymbolSelectorGlobal from '@/components/shared/SymbolSelectorGlobal';
import BalanceDisplay from '@/components/shared/BalanceDisplay';
import NotificationsBell from '@/components/shared/NotificationsBell';
import PopOutButtons from '@/components/layout/PopOutButtons';

/**
 * Global Header Component
 * Sticky header with navigation and controls visible across all pages
 */
export default function GlobalHeader() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: '📈 Trading' },
    { href: '/scout', label: '🔍 Scout' },
    { href: '/analysis', label: '📊 Analysis' },
    { href: '/orders', label: '⚡ Orders' },
    { href: '/portfolio', label: '💼 Portfolio' },
    { href: '/backtest', label: '🧪 Backtest' },
  ];
  
  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      {/* Navigation Row */}
      <nav className="flex items-center gap-6 px-6 py-3 border-b border-gray-800">
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
        
        {/* Pop-out buttons (right side) */}
        <div className="ml-auto">
          <PopOutButtons />
        </div>
      </nav>
      
      {/* Controls Row */}
      <div className="flex items-center gap-6 px-6 py-3">
        <SymbolSelectorGlobal />
        <div className="flex-1" />
        <BalanceDisplay />
        <NotificationsBell />
      </div>
    </header>
  );
}
