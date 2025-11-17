'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import { useMachines } from '@/hooks/useMachines'
import { useMachineStopCounts } from '@/hooks/useMachineStopCounts'
import { useMachineStopTimes } from '@/hooks/useMachineStopTimes'
import { machineService, default as apiClient } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { calculateEfficiency } from '@/lib/utils'
import type { MachineLiveData, MonitorLog } from '@/types/machineMonitor'
import type { Machine } from '@/types'
import MachineDetailModal from './MachineDetailModal'

type EfficiencyBand = '0-60' | '60-70' | '70-90' | '90-100' | ''
type SpeedBand = '0-500' | '500-700' | '700-800' | '800-900' | '900+' | ''
type StopFrequencyBand = '0-10' | '10-20' | '20+' | ''

/**
 * Format time duration in HH:MM:SS format (or MM:SS if less than an hour)
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}


/**
 * Machine Card Component - Simplified to show only essential info
 */
function MachineCard({
  machine,
  stopCounts,
  stopTimes,
  onClick,
}: {
  machine: MachineLiveData
  stopCounts?: { day: number; night: number; total: number }
  stopTimes?: { day: number; night: number; total: number }
  onClick: () => void
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const isRunning = machine.machineStatus === 1

  // Calculate efficiency based on runtime and stop time
  const totalStopTime = stopTimes?.total || 0
  const efficiency = calculateEfficiency(totalStopTime)

  // Determine card color based on status and efficiency
  // Green: RUN & eff ≥ 90, Yellow: RUN & 70-90, Red: STOP or eff < 70
  const getCardColor = (): string => {
    if (!isRunning || efficiency < 70) {
      return 'bg-red-500' // Red: STOP or eff < 70
    }
    if (efficiency >= 90) {
      return 'bg-green-500' // Green: RUN & eff ≥ 90
    }
    return 'bg-yellow-500' // Yellow: RUN & 70-90
  }

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

  const totalStops = stopCounts?.total || 0

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden"
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${getCardColor()}`}
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

      {/* Content - Only Essential Info */}
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

        {/* Efficiency */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Efficiency</span>
            <span className="text-sm font-semibold text-gray-900">{efficiency}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${efficiency}%` }}
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

        {/* Total Stops */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Stops</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{totalStops}</span>
        </div>

        {/* Total Stop Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Stop Time</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{formatDuration(stopTimes?.total || 0)}</span>
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
  const [factoryId, setFactoryId] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<MachineLiveData | null>(null)
  const [efficiencyBand, setEfficiencyBand] = useState<EfficiencyBand>('')
  const [speedBand, setSpeedBand] = useState<SpeedBand>('')
  const [stopFrequencyBand, setStopFrequencyBand] = useState<StopFrequencyBand>('')

  // Fetch machines from REST API as fallback
  const { machines: apiMachines, loading: apiLoading, refetch: refetchMachines } = useMachines()

  // Fetch stop counts for the factory
  const { stopCounts, isLoading: stopCountsLoading, refetch: refetchStopCounts } = useMachineStopCounts({
    factoryId,
    enabled: !!factoryId,
  })

  // Fetch stop times for the factory
  const { stopTimes, isLoading: stopTimesLoading, refetch: refetchStopTimes } = useMachineStopTimes({
    factoryId,
    enabled: !!factoryId,
  })

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

  const lastUpdateEpoch = lastUpdateTime?.getTime() ?? null

  /**
   * Fetch machine names from REST API to preserve machine names
   * This is done once to get the initial machine names
   * Also extracts factory_id from the API response
   */
  const fetchMachineNames = useCallback(async () => {
    try {
      // Fetch machines with full response to get factory_id
      const response = await apiClient.get<{
        success: boolean
        data: {
          data: Array<{
            admin: any
            factory: Array<{
              id: number
              machine: Array<{
                id: number
                machine_name: string
                fac_machine_number: number
                factory_id: number
                [key: string]: any
              }>
              [key: string]: any
            }>
          }>
        }
      }>('/machine', {
        params: { page: 1, limit: 100 },
      })

      const namesMap = new Map<number, string>()
      let firstFactoryId: number | null = null

      // Extract machine names and factory_id from nested structure
      const responseData = response.data.data?.data || []
      for (const adminGroup of responseData) {
        if (adminGroup.factory && Array.isArray(adminGroup.factory)) {
          for (const factory of adminGroup.factory) {
            // Get factory_id from first factory
            if (firstFactoryId === null && factory.id) {
              firstFactoryId = factory.id
            }

            if (factory.machine && Array.isArray(factory.machine)) {
              for (const machine of factory.machine) {
                if (machine.fac_machine_number !== undefined) {
                  namesMap.set(
                    machine.fac_machine_number,
                    machine.machine_name || `M${machine.fac_machine_number}`
                  )
                }
              }
            }
          }
        }
      }

      setMachineNames(namesMap)
      if (firstFactoryId !== null) {
        setFactoryId(firstFactoryId)
      }
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
  const allMachines: MachineLiveData[] = (() => {
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

  /**
   * Calculate efficiency bands from thresholds
   * Thresholds [60, 70, 90] create bands: 0-60, 60-70, 70-90, 90-100
   */
  const getEfficiencyBand = (efficiency: number): EfficiencyBand => {
    if (efficiency < 60) return '0-60'
    if (efficiency < 70) return '60-70'
    if (efficiency < 90) return '70-90'
    return '90-100'
  }

  /**
   * Calculate speed bands from thresholds
   * Thresholds [0, 500, 700, 800, 900] create bands: 0-500, 500-700, 700-800, 800-900, 900+
   */
  const getSpeedBand = (speed: number): SpeedBand => {
    if (speed < 500) return '0-500'
    if (speed < 700) return '500-700'
    if (speed < 800) return '700-800'
    if (speed < 900) return '800-900'
    return '900+'
  }

  /**
   * Calculate stop frequency bands from thresholds
   * Thresholds [10, 20] create bands: 0-10, 10-20, 20+ (based on stop events over last 30 min)
   */
  const getStopFrequencyBand = (stopEvents: number): StopFrequencyBand => {
    if (stopEvents < 10) return '0-10'
    if (stopEvents < 20) return '10-20'
    return '20+'
  }

  /**
   * Filter machines based on efficiency, speed, and stop frequency bands
   */
  const machines = useMemo(() => {
    let filtered = allMachines

    // Filter by efficiency band
    if (efficiencyBand) {
      filtered = filtered.filter((machine) => {
        const totalStopTime = stopTimes[machine.machineNumber]?.total || 0
        const efficiency = calculateEfficiency(totalStopTime)
        const machineBand = getEfficiencyBand(efficiency)
        return machineBand === efficiencyBand
      })
    }

    // Filter by speed band
    if (speedBand) {
      filtered = filtered.filter((machine) => {
        const machineSpeedBand = getSpeedBand(machine.fre_RPM)
        return machineSpeedBand === speedBand
      })
    }

    // Filter by stop frequency band (based on stop events over last 30 min)
    if (stopFrequencyBand) {
      filtered = filtered.filter((machine) => {
        const machineStopFrequencyBand = getStopFrequencyBand(machine.machineStopEvents)
        return machineStopFrequencyBand === stopFrequencyBand
      })
    }

    return filtered
  }, [allMachines, efficiencyBand, speedBand, stopFrequencyBand, stopTimes])

  /**
   * Sync stop counts/times whenever live data arrives over WebSocket
   */
  useEffect(() => {
    if (!factoryId || !lastUpdateEpoch) {
      return
    }

    refetchStopCounts()
    refetchStopTimes()
  }, [factoryId, lastUpdateEpoch, refetchStopCounts, refetchStopTimes])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchMachineNames(),
        refreshWebSocket(),
        refetchMachines(),
        refetchStopCounts(),
        refetchStopTimes(),
      ])
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
          {/* Efficiency Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Efficiency:</label>
            <select
              value={efficiencyBand}
              onChange={(e) => setEfficiencyBand(e.target.value as EfficiencyBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-60">0-60</option>
              <option value="60-70">60-70</option>
              <option value="70-90">70-90</option>
              <option value="90-100">90-100</option>
            </select>
          </div>

          {/* Speed Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Speed (RPM):</label>
            <select
              value={speedBand}
              onChange={(e) => setSpeedBand(e.target.value as SpeedBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-500">0-500</option>
              <option value="500-700">500-700</option>
              <option value="700-800">700-800</option>
              <option value="800-900">800-900</option>
              <option value="900+">900+</option>
            </select>
          </div>

          {/* Stop Frequency Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Stop Frequency:</label>
            <select
              value={stopFrequencyBand}
              onChange={(e) => setStopFrequencyBand(e.target.value as StopFrequencyBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-10">0-10 events</option>
              <option value="10-20">10-20 events</option>
              <option value="20+">20+ events</option>
            </select>
          </div>

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
          <div className="text-2xl font-semibold text-gray-700 mb-2">
            {(efficiencyBand || speedBand || stopFrequencyBand) ? 'No machines match the selected filters' : 'No machines to display'}
          </div>
          <div className="text-sm text-gray-500">
            {(efficiencyBand || speedBand || stopFrequencyBand) ? 'Try selecting different filter options.' : 'No machine data available at this time.'}
          </div>
          {(efficiencyBand || speedBand || stopFrequencyBand) && (
            <button
              onClick={() => {
                setEfficiencyBand('')
                setSpeedBand('')
                setStopFrequencyBand('')
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {(efficiencyBand || speedBand || stopFrequencyBand) && (
            <div className="mb-4 flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                Showing {machines.length} of {allMachines.length} machines
                {efficiencyBand && ` (Efficiency: ${efficiencyBand})`}
                {speedBand && ` (Speed: ${speedBand} RPM)`}
                {stopFrequencyBand && ` (Stop Frequency: ${stopFrequencyBand} events)`}
              </span>
              <button
                onClick={() => {
                  setEfficiencyBand('')
                  setSpeedBand('')
                  setStopFrequencyBand('')
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filters
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {machines.map((machine) => (
          <MachineCard
            key={machine.machineNumber}
            machine={machine}
            stopCounts={stopCounts[machine.machineNumber]}
            stopTimes={stopTimes[machine.machineNumber]}
            onClick={() => setSelectedMachine(machine)}
          />
        ))}
          </div>
        </>
      )}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          stopCounts={stopCounts[selectedMachine.machineNumber]}
          stopTimes={stopTimes[selectedMachine.machineNumber]}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  )
}
