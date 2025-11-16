import { useState, useEffect, useCallback } from 'react'
import { machineService } from '@/services/api'

interface StopCounts {
  day: number
  night: number
  total: number
}

interface UseMachineStopCountsOptions {
  factoryId: number | null
  enabled?: boolean
}

interface UseMachineStopCountsReturn {
  stopCounts: Record<number, StopCounts>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch stop counts for all machines in a factory
 * Fetches today's stop counts grouped by shift (day/night)
 *
 * @param factoryId - Factory ID to fetch stop counts for
 * @param enabled - Whether to fetch stop counts (default: true)
 * @returns Stop counts data and loading state
 */
export function useMachineStopCounts(
  options: UseMachineStopCountsOptions
): UseMachineStopCountsReturn {
  const { factoryId, enabled = true } = options

  const [stopCounts, setStopCounts] = useState<Record<number, StopCounts>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStopCounts = useCallback(async () => {
    if (!enabled || !factoryId) {
      setStopCounts({})
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const counts = await machineService.getFactoryMachinesStopCounts(factoryId)
      setStopCounts(counts)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch stop counts'
      setError(errorMessage)
      console.error('Failed to fetch stop counts:', err)
      setStopCounts({})
    } finally {
      setIsLoading(false)
    }
  }, [factoryId, enabled])

  useEffect(() => {
    fetchStopCounts()

    // Refresh every 5 minutes to keep stop counts updated
    const interval = setInterval(fetchStopCounts, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchStopCounts])

  return {
    stopCounts,
    isLoading,
    error,
    refetch: fetchStopCounts,
  }
}

