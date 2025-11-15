'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      if (!authService.isAuthenticated()) {
        router.replace('/login')
      } else {
        setIsChecking(false)
      }
    }

    // Check immediately
    checkAuth()

    // Also check after a short delay to handle race conditions
    const timeoutId = setTimeout(checkAuth, 100)

    return () => clearTimeout(timeoutId)
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

