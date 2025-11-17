'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

export default function StatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date())

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
      <span className="text-sm text-gray-600">
        {formatDate(currentTime)}
      </span>
    </div>
  )
}

