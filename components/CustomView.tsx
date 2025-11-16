'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import { useCurrentUser } from '@/hooks/useCurrentUser'
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

interface MachineFilters {
  machineName: string
  minSpeed: string
  maxSpeed: string
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
  const [filters, setFilters] = useState<MachineFilters>({
    machineName: '',
    minSpeed: '',
    maxSpeed: '',
  })

  // Update current time every second for live duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

      return true
    })
  }, [machines, filters])

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
    })
  }

  const hasActiveFilters = filters.machineName || filters.minSpeed || filters.maxSpeed

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

