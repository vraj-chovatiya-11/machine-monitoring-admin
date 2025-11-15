'use client'

import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: string
  active?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'grid', active: true },
  { label: 'Reports', icon: 'document' },
  { label: 'Profile', icon: 'person' },
  { label: 'Admin', icon: 'gear' },
]

export default function Header() {
  return (
    <header className="bg-gray-800 text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">Machine Monitor</h1>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded transition-colors',
                item.active
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              )}
            >
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">admin1</span>
          <button className="text-gray-300 hover:text-white transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

