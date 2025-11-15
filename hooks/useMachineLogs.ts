import { useState, useEffect } from 'react'
import { machineService } from '@/services/api'
import type { MachineLog, LogFilter } from '@/types'

interface UseMachineLogsOptions {
  machineId?: string
  filters?: LogFilter
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useMachineLogs(options: UseMachineLogsOptions = {}) {
  const { machineId, filters, autoRefresh = false, refreshInterval = 5000 } = options

  const [logs, setLogs] = useState<MachineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = machineId
        ? await machineService.getMachineLogs(machineId, filters)
        : await machineService.getLogs({ ...filters, machineId })
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [machineId, JSON.stringify(filters)])

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  }
}

