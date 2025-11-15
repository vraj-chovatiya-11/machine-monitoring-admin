'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import { useMachines } from '@/hooks/useMachines'
import { machineService } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import type { MachineLiveData, MonitorLog } from '@/types/machineMonitor'
import type { Machine } from '@/types'

/**
 * Format time duration in MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate percentage based on stitches (assuming a target, or use a simple calculation)
 */
function calculatePercentage(stitches: number): number {
  // Simple calculation: assume target is around 350000, or use a dynamic calculation
  const target = 350000
  return Math.min(100, Math.round((stitches / target) * 100))
}

/**
 * Machine Card Component
 */
function MachineCard({ machine }: { machine: MachineLiveData }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const isRunning = machine.machineStatus === 1
  const percentage = calculatePercentage(machine.pikCounter)

  // Update current time every second for live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate elapsed time since last update (this represents time in current state)
  const elapsedSeconds = Math.max(0, Math.floor((currentTime.getTime() - machine.lastUpdated.getTime()) / 1000))
  const elapsedTime = formatDuration(elapsedSeconds)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          isRunning ? 'bg-green-500' : 'bg-gray-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-lg">{machine.machineName}</span>
          {isRunning ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="text-white text-sm font-medium">
          {isRunning ? '▷' : '||'} {elapsedTime}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Stitches */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm text-gray-600">Stitches</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{machine.pikCounter.toLocaleString()}</span>
        </div>

        {/* Percentage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Percentage</span>
            <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">Speed</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{machine.fre_RPM}</span>
        </div>

        {/* Run Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            <span className="text-sm text-gray-600">Run</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{elapsedTime}</span>
        </div>

        {/* Stops */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">Stops</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{machine.machineStopEvents}</span>
        </div>

        {/* Stop Time */}
        {!isRunning && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-600">Stop</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{elapsedTime}</span>
          </div>
        )}

        {/* Alter Stitches - Placeholder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
            <span className="text-sm text-gray-600">Alter Stitches</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">-</span>
        </div>

        {/* Thread Break (TB) - Placeholder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">Thread Break (TB)</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">-</span>
        </div>

        {/* TB Head - Placeholder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-sm text-gray-600">TB Head</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">0,0,0</span>
        </div>

        {/* Comment - Placeholder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-sm text-gray-600">Comment</span>
          </div>
          <span className="text-sm font-semibold text-gray-400">-</span>
        </div>

        {/* Employee Name - Placeholder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-sm text-gray-600">Employee Name</span>
          </div>
          <span className="text-sm font-semibold text-gray-400">-</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Machine Cards Component
 * Displays machines in a card grid layout with real-time WebSocket updates
 * Automatically receives updates when new monitor log entries are created
 */
export default function MachineCards() {
  const { userId, loading: userLoading } = useCurrentUser()
  const [machineNames, setMachineNames] = useState<Map<number, string>>(new Map())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch machines from REST API as fallback
  const { machines: apiMachines, loading: apiLoading, refetch: refetchMachines } = useMachines()

  // Use WebSocket hook for real-time monitoring
  const {
    machines: wsMachines,
    isLoading: wsLoading,
    error: wsError,
    lastUpdateTime,
    connectionStatus,
    refresh: refreshWebSocket,
  } = useMachineMonitor({
    userId: userId || 0,
    enabled: !!userId,
  })

  /**
   * Fetch machine names from REST API to preserve machine names
   * This is done once to get the initial machine names
   */
  const fetchMachineNames = useCallback(async () => {
    try {
      const machineList = await machineService.getMachines(1, 100) // Get more machines to ensure we have all names

      const namesMap = new Map<number, string>()
      machineList
        .filter((machine) => machine.fac_machine_number !== undefined)
        .forEach((machine) => {
          namesMap.set(machine.fac_machine_number || 0, machine.name || `M${machine.fac_machine_number || 0}`)
        })

      setMachineNames(namesMap)
    } catch (err) {
      console.error('Failed to fetch machine names:', err)
    }
  }, [])

  /**
   * Initial fetch of machine names
   */
  useEffect(() => {
    if (!userLoading && userId) {
      fetchMachineNames()
    }
  }, [userLoading, userId, fetchMachineNames])

  /**
   * Convert API machines to MachineLiveData format for display
   */
  const convertApiMachinesToLiveData = useCallback((machines: Machine[]): MachineLiveData[] => {
    return machines
      .filter((machine) => machine.fac_machine_number !== undefined)
      .map((machine) => ({
        machineNumber: machine.fac_machine_number || 0,
        machineName: machine.name || `M${machine.fac_machine_number || 0}`,
        pikCounter: 0, // Default values when no live data available
        machineStatus: machine.status === 'online' ? 1 : 0,
        fre_RPM: 0,
        machineStopEvents: 0,
        lastUpdated: new Date(),
        statusLabel: machine.status === 'online' ? 'Running' : 'Stopped',
      }))
  }, [])

  /**
   * Merge machine names with WebSocket data
   * This ensures machine names are preserved even when only log data is available
   */
  const wsMachinesWithNames: MachineLiveData[] = wsMachines.map((machine) => ({
    ...machine,
    machineName: machineNames.get(machine.machineNumber) || machine.machineName || `M${machine.machineNumber}`,
  }))

  /**
   * Use WebSocket machines if available, otherwise fallback to API machines
   * Merge live data with API machines to show all machines
   */
  const machines: MachineLiveData[] = (() => {
    if (wsMachinesWithNames.length > 0) {
      // If we have live data, use it and merge with API machines for any missing ones
      const wsMachineNumbers = new Set(wsMachinesWithNames.map((m) => m.machineNumber))
      const apiLiveData = convertApiMachinesToLiveData(apiMachines)
      const missingMachines = apiLiveData.filter((m) => !wsMachineNumbers.has(m.machineNumber))
      return [...wsMachinesWithNames, ...missingMachines].sort((a, b) => a.machineNumber - b.machineNumber)
    } else {
      // No live data, use API machines as fallback
      return convertApiMachinesToLiveData(apiMachines)
    }
  })()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchMachineNames(), refreshWebSocket(), refetchMachines()])
    } catch (err) {
      console.error('Failed to refresh machine data:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = userLoading || wsLoading || apiLoading
  const error = wsError

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading machines...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Unable to load user profile. Please log in.</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Machine Monitoring</h2>
          {lastUpdateTime && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatDistanceToNow(lastUpdateTime, { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500 animate-pulse'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : connectionStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : 'Disconnected'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
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
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Machine Cards Grid */}
      {machines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-2xl font-semibold text-gray-700 mb-2">No machines to display</div>
          <div className="text-sm text-gray-500">No machine data available at this time.</div>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {machines.map((machine) => (
            <MachineCard key={machine.machineNumber} machine={machine} />
        ))}
      </div>
      )}
    </div>
  )
}
