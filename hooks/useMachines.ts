import { useState, useEffect } from 'react'
import { machineService } from '@/services/api'
import type { Machine } from '@/types'

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMachines = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await machineService.getMachines()
      setMachines(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch machines'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [])

  return {
    machines,
    loading,
    error,
    refetch: fetchMachines,
  }
}

