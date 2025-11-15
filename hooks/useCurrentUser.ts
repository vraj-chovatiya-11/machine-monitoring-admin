import { useState, useEffect } from 'react'
import { machineService } from '@/services/api'

interface UserProfile {
  id?: number
  user_id?: number
  username?: string
  name?: string
  email?: string
  role?: string
  [key: string]: any
}

/**
 * Hook to get the current authenticated user's profile
 * Fetches user profile from /users/profile endpoint
 * Uses user_id (numeric field) instead of MongoDB _id
 */
export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const profile = await machineService.getProfile()
        setUser(profile)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user profile'))
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Prioritize user_id (numeric field) over id to avoid MongoDB _id issues
  // user_id is the actual numeric identifier, not the MongoDB ObjectId
  const userId = user?.user_id ?? user?.id ?? null

  return {
    user,
    userId,
    loading,
    error,
  }
}

