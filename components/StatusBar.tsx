'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

export default function StatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    // Refresh logic will be implemented later
    window.location.reload()
  }

  return (
    <div className="px-6 py-3 flex items-center justify-end gap-4">
      <div className="flex items-center gap-2">
        <div className={isOnline ? 'w-2 h-2 bg-green-500 rounded-full' : 'w-2 h-2 bg-red-500 rounded-full'} />
        <span className="text-sm text-gray-700">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <button
        onClick={handleRefresh}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </button>

      <span className="text-sm text-gray-600">
        {formatDate(currentTime)}
      </span>
    </div>
  )
}

