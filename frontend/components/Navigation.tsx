'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '🏠 Trading', icon: '📈' },
  { href:  '/scout', label: '🔍 Scout', icon: '🎯' },
  { href: '/analysis', label: '📊 Analysis', icon: '🔬' },
  { href: '/advanced', label: '⚡ Advanced', icon: '⚙️' },
  { href: '/backtest', label: '📉 Backtest', icon: '🧪' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 border-b border-gray-700 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div className="text-white font-bold text-xl">
              AI Trading <span className="text-blue-400">v2</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg
                    transition-all duration-200 font-medium
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400 text-sm hidden lg:inline">
              Live
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
