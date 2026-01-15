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

  const statusColor = {
    FULL: 'bg-green-500',
    PARTIAL: 'bg-yellow-500',
    OFFLINE: 'bg-red-500',
  }[connectionStatus];

  const statusDot = connectionStatus !== 'OFFLINE' ? 'animate-pulse' : '';

  const modePillClasses =
    tradingMode === 'paper'
      ? 'bg-blue-900/30 text-blue-300 border-blue-700/40'
      : 'bg-red-900/30 text-red-300 border-red-700/40';

  const modeLabel = tradingMode === 'paper' ? 'PAPER' : 'REAL';

  const handlePanic = () => {
    const ok = window.confirm(
      'PANIC: vuoi chiudere TUTTE le posizioni e annullare tutti gli ordini?\n\n(Placeholder: implementazione completa in seguito)'
    );
    if (!ok) return;

    // TODO: implementare chiusura posizioni/ordini reali+paper
    alert('PANIC trigger (TODO): qui implementeremo Close All / Cancel All.');
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      <nav className="flex items-center gap-4 px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="text-xl">🚀</div>
          <div className="text-white font-bold text-base hidden md:block">
            AI Trading <span className="text-blue-400">v2</span>
          </div>
        </div>

        {/* Navigation Links */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-sm ${
              pathname === item.href
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Connection Status + Mode pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg h-9">
            <span className="text-xs text-gray-400">Conn:</span>
            <div className={`w-2 h-2 rounded-full ${statusColor} ${statusDot}`} />
            <span className="text-xs font-medium text-white uppercase">{connectionStatus}</span>

            {/* ✅ Separate PAPER/REAL pill */}
            <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded border ${modePillClasses}`}>
              {modeLabel}
            </span>
          </div>

          {/* ✅ PANIC */}
          <button
            onClick={handlePanic}
            className="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold border border-red-700/50"
            title="Chiudi tutto (posizioni + ordini) - richiede conferma"
          >
            PANIC
          </button>

          <BalanceDisplay />

          <NotificationsBell />
        </div>
      </nav>
    </header>
  );
}
