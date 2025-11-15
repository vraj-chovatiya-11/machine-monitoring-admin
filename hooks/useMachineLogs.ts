import { useState, useEffect, useCallback } from 'react'
import { machineService } from '@/services/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { MachineLog, LogFilter, MonitorLog } from '@/types'

interface UseMachineLogsOptions {
  machineId?: string
  filters?: LogFilter
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useMachineLogs(options: UseMachineLogsOptions = {}) {
  const { machineId, filters, autoRefresh = false, refreshInterval = 5000 } = options
  const { userId, loading: userLoading } = useCurrentUser()

  const [logs, setLogs] = useState<(MachineLog | MonitorLog)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    // Wait for user to be loaded before fetching logs
    if (userLoading || !userId) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch logs with logged-in user's ID (user_id)
      const data = machineId
        ? await machineService.getMachineLogs(machineId, { ...filters, user_id: userId })
        : await machineService.getLogs({ ...filters, machineId, user_id: userId })
      // Ensure data is always an array
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'))
      // Reset logs to empty array on error
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [machineId, filters, userId, userLoading])

  useEffect(() => {
    // Only fetch logs when user is loaded and userId is available
    if (!userLoading && userId) {
      fetchLogs()

      if (autoRefresh) {
        const interval = setInterval(fetchLogs, refreshInterval)
        return () => clearInterval(interval)
      }
    }
  }, [fetchLogs, autoRefresh, refreshInterval, userId, userLoading])

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  }
}

