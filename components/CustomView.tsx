'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMachineStopTimes } from '@/hooks/useMachineStopTimes'
import { calculateEfficiency } from '@/lib/utils'
import { default as apiClient } from '@/services/api'
import type { MachineLiveData } from '@/types/machineMonitor'

/**
 * Format time duration in MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate average speed across all machines
 */
function calculateAverageSpeed(machines: MachineLiveData[]): number {
  if (machines.length === 0) return 0
  const totalSpeed = machines.reduce((sum, machine) => sum + machine.fre_RPM, 0)
  return Math.round(totalSpeed / machines.length)
}

type EfficiencyBand = '0-60' | '60-70' | '70-90' | '90-100' | ''
type SpeedBand = '0-500' | '500-700' | '700-800' | '800-900' | '900+' | ''
type StopFrequencyBand = '0-10' | '10-20' | '20+' | ''

interface MachineFilters {
  machineName: string
  minSpeed: string
  maxSpeed: string
  efficiencyBand: EfficiencyBand
  speedBand: SpeedBand
  stopFrequencyBand: StopFrequencyBand
}

/**
 * Custom View Component
 * Displays machines in a table format with filtering capabilities
 */
export default function CustomView() {
  const { userId, loading: userLoading } = useCurrentUser()
  const { machines, isLoading, error } = useMachineMonitor({
    userId: userId || 0,
    enabled: !!userId && !userLoading,
  })

  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [factoryId, setFactoryId] = useState<number | null>(null)
  const [filters, setFilters] = useState<MachineFilters>({
    machineName: '',
    minSpeed: '',
    maxSpeed: '',
    efficiencyBand: '',
    speedBand: '',
    stopFrequencyBand: '',
  })

  // Fetch stop times for efficiency calculation
  const { stopTimes } = useMachineStopTimes({
    factoryId,
    enabled: !!factoryId,
  })

  // Fetch factory ID from machine API
  const fetchFactoryId = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          data: Array<{
            factory: Array<{
              id: number
              machine: Array<{
                fac_machine_number: number
                [key: string]: any
              }>
              [key: string]: any
            }>
            [key: string]: any
          }>
        }
      }>('/machine', {
        params: { page: 1, limit: 100 },
      })

      const responseData = response.data.data?.data || []
      for (const adminGroup of responseData) {
        if (adminGroup.factory && Array.isArray(adminGroup.factory)) {
          for (const factory of adminGroup.factory) {
            if (factory.id) {
              setFactoryId(factory.id)
              return
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch factory ID:', err)
    }
  }, [])

  useEffect(() => {
    if (userId && !userLoading) {
      fetchFactoryId()
    }
  }, [userId, userLoading, fetchFactoryId])

  // Update current time every second for live duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
   * Filter machines based on current filter criteria
   */
  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      // Filter by machine name
      if (filters.machineName) {
        const searchTerm = filters.machineName.toLowerCase()
        if (!machine.machineName.toLowerCase().includes(searchTerm)) {
          return false
        }
      }

      // Filter by spindle speed range
      if (filters.minSpeed) {
        const minSpeed = parseFloat(filters.minSpeed)
        if (!isNaN(minSpeed) && machine.fre_RPM < minSpeed) {
          return false
        }
      }

      if (filters.maxSpeed) {
        const maxSpeed = parseFloat(filters.maxSpeed)
        if (!isNaN(maxSpeed) && machine.fre_RPM > maxSpeed) {
          return false
        }
      }

      // Filter by efficiency band
      if (filters.efficiencyBand) {
        const totalStopTime = stopTimes[machine.machineNumber]?.total || 0
        const efficiency = calculateEfficiency(totalStopTime)
        const machineBand = getEfficiencyBand(efficiency)
        if (machineBand !== filters.efficiencyBand) {
          return false
        }
      }

      // Filter by speed band
      if (filters.speedBand) {
        const machineSpeedBand = getSpeedBand(machine.fre_RPM)
        if (machineSpeedBand !== filters.speedBand) {
          return false
        }
      }

      // Filter by stop frequency band (based on stop events over last 30 min)
      if (filters.stopFrequencyBand) {
        const machineStopFrequencyBand = getStopFrequencyBand(machine.machineStopEvents)
        if (machineStopFrequencyBand !== filters.stopFrequencyBand) {
          return false
        }
      }

      return true
    })
  }, [machines, filters, stopTimes])

  /**
   * Update filter value
   */
  const updateFilter = <K extends keyof MachineFilters>(key: K, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      machineName: '',
      minSpeed: '',
      maxSpeed: '',
      efficiencyBand: '',
      speedBand: '',
      stopFrequencyBand: '',
    })
  }

  const hasActiveFilters = filters.machineName || filters.minSpeed || filters.maxSpeed || filters.efficiencyBand || filters.speedBand || filters.stopFrequencyBand

  if (userLoading || isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading machine data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  if (machines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No machine data available</div>
        </div>
      </div>
    )
  }

  const avgSpeed = calculateAverageSpeed(filteredMachines)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Filters Section */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Machine Name:</label>
            <input
              type="text"
              value={filters.machineName}
              onChange={(e) => updateFilter('machineName', e.target.value)}
              placeholder="Search machine name..."
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Spindle Speed:</label>
            <input
              type="number"
              value={filters.minSpeed}
              onChange={(e) => updateFilter('minSpeed', e.target.value)}
              placeholder="Min"
              min="0"
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={filters.maxSpeed}
              onChange={(e) => updateFilter('maxSpeed', e.target.value)}
              placeholder="Max"
              min="0"
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Efficiency:</label>
            <select
              value={filters.efficiencyBand}
              onChange={(e) => updateFilter('efficiencyBand', e.target.value as EfficiencyBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-60">0-60%</option>
              <option value="60-70">60-70%</option>
              <option value="70-90">70-90%</option>
              <option value="90-100">90-100%</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Speed:</label>
            <select
              value={filters.speedBand}
              onChange={(e) => updateFilter('speedBand', e.target.value as SpeedBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-500">0-500 RPM</option>
              <option value="500-700">500-700 RPM</option>
              <option value="700-800">700-800 RPM</option>
              <option value="800-900">800-900 RPM</option>
              <option value="900+">900+ RPM</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Stop Frequency:</label>
            <select
              value={filters.stopFrequencyBand}
              onChange={(e) => updateFilter('stopFrequencyBand', e.target.value as StopFrequencyBand)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="">All</option>
              <option value="0-10">0-10 events</option>
              <option value="10-20">10-20 events</option>
              <option value="20+">20+ events</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}

          {hasActiveFilters && (
            <div className="text-xs text-gray-500 ml-auto">
              Showing {filteredMachines.length} of {machines.length} machines
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b-2 border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Machine
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Production
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Speed
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Avg.
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Stopage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMachines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No machines match the current filters
                </td>
              </tr>
            ) : (
              filteredMachines.map((machine) => {
                const isStopped = machine.machineStatus === 0
                const hasStopEvents = machine.machineStopEvents > 0
                const isSelected = selectedRow === machine.machineNumber

                // Calculate duration (time since last update)
                const elapsedSeconds = Math.max(
                  0,
                  Math.floor((currentTime.getTime() - machine.lastUpdated.getTime()) / 1000)
                )
                const duration = formatDuration(elapsedSeconds)
                const isLongDuration = elapsedSeconds > 120 // More than 2 minutes in red

                return (
                  <tr
                    key={machine.machineNumber}
                    onClick={() => setSelectedRow(isSelected ? null : machine.machineNumber)}
                    className={`hover:bg-gray-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-100' : ''
                    } ${isStopped && !isSelected ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{machine.machineName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{machine.pikCounter.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{machine.fre_RPM}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{avgSpeed}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${isLongDuration ? 'text-red-600' : 'text-green-600'}`}>
                        {duration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600 underline cursor-pointer hover:text-blue-800">
                        {machine.machineStopEvents}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t-2 border-gray-300">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            <span>For Support +919737369993</span>
          </div>
          <div>
            <span>Company Id: 000 User Id: 000</span>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-red-500 h-1 rounded-full" style={{ width: '30%' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

