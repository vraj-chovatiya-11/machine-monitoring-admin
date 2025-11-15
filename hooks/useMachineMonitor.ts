import { useState, useEffect, useRef, useCallback } from 'react'
import { machineService } from '@/services/api'
import { MachineMonitorClient, getWebSocketUrl } from '@/services/machineMonitorClient'
import type { MachineLiveData, MonitorLog, WebSocketMessage, ConnectionStatus } from '@/types/machineMonitor'

interface UseMachineMonitorOptions {
  userId: number
  enabled?: boolean
}

interface UseMachineMonitorReturn {
  machines: MachineLiveData[]
  isLoading: boolean
  error: string | null
  lastUpdateTime: Date | null
  connectionStatus: ConnectionStatus
  refresh: () => Promise<void>
}

/**
 * Custom hook for real-time machine monitoring via WebSocket
 *
 * Features:
 * - Fetches initial latest data via REST API
 * - Opens WebSocket connection for live updates
 * - Automatically updates state when new logs arrive
 * - Handles reconnection with exponential backoff
 * - Cleans up WebSocket on unmount
 *
 * @param userId - The admin user ID to monitor machines for
 * @param enabled - Whether monitoring is enabled (default: true)
 * @returns Machine monitoring state and connection status
 */
export function useMachineMonitor(options: UseMachineMonitorOptions): UseMachineMonitorReturn {
  const { userId, enabled = true } = options

  const [machines, setMachines] = useState<MachineLiveData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')

  const clientRef = useRef<MachineMonitorClient | null>(null)
  const machinesMapRef = useRef<Map<number, MachineLiveData>>(new Map())

  /**
   * Convert MonitorLog to MachineLiveData array
   * Maps raw fields (machineStatus, fre_RPM, etc.) to UI-friendly format
   */
  const processMonitorLog = useCallback((log: MonitorLog): MachineLiveData[] => {
    const updateTime = new Date(log.timestamp)

    return log.machines.map((machine) => ({
      machineNumber: machine.machineNumber,
      machineName: `M${machine.machineNumber}`, // Default name, will be overridden by component if available
      pikCounter: machine.pikCounter,
      machineStatus: machine.machineStatus,
      fre_RPM: machine.fre_RPM,
      machineStopEvents: machine.machineStopEvents,
      lastUpdated: updateTime,
      statusLabel: machine.machineStatus === 1 ? 'Running' : 'Stopped',
    }))
  }, [])

  /**
   * Update machines state from a monitor log
   * Keeps only the latest data per machine
   */
  const updateMachinesFromLog = useCallback((log: MonitorLog) => {
    const newMachines = processMonitorLog(log)

    // Update map with latest data per machine
    newMachines.forEach((machine) => {
      machinesMapRef.current.set(machine.machineNumber, machine)
    })

    // Convert map to array and sort by machine number
    const updatedMachines = Array.from(machinesMapRef.current.values()).sort(
      (a, b) => a.machineNumber - b.machineNumber
    )

    setMachines(updatedMachines)
    setLastUpdateTime(new Date(log.timestamp))
    setError(null)
  }, [processMonitorLog])

  /**
   * Fetch initial latest monitor logs via REST API
   * Always fetches the most recent entry (sorted by timestamp_epoch descending)
   * This ensures the dashboard displays the latest data immediately on load
   */
  const fetchInitialData = useCallback(async () => {
    if (!enabled || !userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch the single most recent monitor_log entry for this user
      // Backend sorts by timestamp_epoch descending, so index 0 is always the latest
      const response = await machineService.getLatestMonitorLogs(userId, 1)

      if (response.data && response.data.length > 0) {
        // Get the most recent log (always index 0 due to backend sorting)
        const latestLog = response.data[0]
        updateMachinesFromLog(latestLog)
      } else {
        // No logs yet, initialize with empty state
        machinesMapRef.current.clear()
        setMachines([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial machine data'
      setError(errorMessage)
      console.error('Failed to fetch initial monitor logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, enabled, updateMachinesFromLog])

  /**
   * Handle WebSocket messages
   * Receives real-time updates when new monitor_log entries are created
   * Each new entry (created every minute) automatically updates the dashboard
   */
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'monitor_log' && message.data) {
      // New monitor_log entry received via WebSocket - update machines state immediately
      // This ensures the dashboard always shows the latest data in real-time
      updateMachinesFromLog(message.data)
    } else if (message.type === 'error') {
      setError(message.error || 'WebSocket error occurred')
    }
    // Ignore ping/pong messages
  }, [updateMachinesFromLog])

  /**
   * Handle WebSocket connection status changes
   */
  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status)
    // Don't set generic error here - let the WebSocket client provide detailed error messages
    // through the onMessage callback
    if (status === 'connected') {
      setError(null) // Clear error on successful connection
    }
  }, [])

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return
    }

    // Fetch initial data first
    fetchInitialData()

    // Then establish WebSocket connection
    const wsUrl = getWebSocketUrl()
    if (!wsUrl) {
      setError('WebSocket URL not configured')
      return
    }

    const client = new MachineMonitorClient({
      url: wsUrl,
      userId,
      onMessage: handleWebSocketMessage,
      onStatusChange: handleStatusChange,
      reconnectInterval: 5000,
      maxReconnectAttempts: Infinity,
    })

    clientRef.current = client
    client.connect()

    // Cleanup on unmount or when dependencies change
    return () => {
      client.disconnect()
      clientRef.current = null
      machinesMapRef.current.clear()
    }
  }, [userId, enabled, fetchInitialData, handleWebSocketMessage, handleStatusChange])

  return {
    machines,
    isLoading,
    error,
    lastUpdateTime,
    connectionStatus,
    refresh: fetchInitialData,
  }
}

