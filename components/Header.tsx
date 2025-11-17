'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { authService } from '@/services/auth'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'grid', path: '/' },
  { label: 'Reports', icon: 'document', path: '/reports' },
  { label: 'Profile', icon: 'person', path: '/profile' },
  // { label: 'Admin', icon: 'gear', path: '/admin' },
]

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ name?: string; username?: string; email?: string } | null>(null)

  useEffect(() => {
    // Get user from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          setUser(JSON.parse(userStr))
        } catch (e) {
          console.error('Failed to parse user data:', e)
        }
      }
    }
  }, [])

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  const handleNavClick = (path: string) => {
    router.push(path)
  }

  const displayName = user?.name || user?.username || user?.email || 'User'

  return (
    <header className="bg-gray-800 text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">Machine Monitor</h1>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/' && pathname === '/')
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded transition-colors',
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                )}
              >
                <span className="text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{displayName}</span>
          <button
            onClick={handleLogout}
            className="text-gray-300 hover:text-white transition-colors"
            title="Logout"
          >
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

