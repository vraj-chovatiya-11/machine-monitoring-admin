import { useState, useEffect, useCallback } from 'react'
import { machineService } from '@/services/api'

interface StopTimes {
  day: number
  night: number
  total: number
}

interface UseMachineStopTimesOptions {
  factoryId: number | null
  enabled?: boolean
}

interface UseMachineStopTimesReturn {
  stopTimes: Record<number, StopTimes>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch stop times for all machines in a factory
 * Fetches today's stop times grouped by shift (day/night)
 * Times are returned in seconds
 *
 * @param factoryId - Factory ID to fetch stop times for
 * @param enabled - Whether to fetch stop times (default: true)
 * @returns Stop times data and loading state
 */
export function useMachineStopTimes(
  options: UseMachineStopTimesOptions
): UseMachineStopTimesReturn {
  const { factoryId, enabled = true } = options

  const [stopTimes, setStopTimes] = useState<Record<number, StopTimes>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStopTimes = useCallback(async () => {
    if (!enabled || !factoryId) {
      setStopTimes({})
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const times = await machineService.getFactoryMachinesStopTimes(factoryId)
      setStopTimes(times)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch stop times'
      setError(errorMessage)
      console.error('Failed to fetch stop times:', err)
      setStopTimes({})
    } finally {
      setIsLoading(false)
    }
  }, [factoryId, enabled])

  useEffect(() => {
    fetchStopTimes()

    // Refresh every 5 minutes to keep stop times updated
    const interval = setInterval(fetchStopTimes, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchStopTimes])

  return {
    stopTimes,
    isLoading,
    error,
    refetch: fetchStopTimes,
  }
}


