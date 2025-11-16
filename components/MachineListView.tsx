'use client'

import { useState, useEffect } from 'react'
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

/**
 * Machine List View Component
 * Displays machines in a table format similar to the screenshot
 * Only includes columns that are available in the data
 */
export default function MachineListView() {
  const { userId, loading: userLoading } = useCurrentUser()
  const { machines, isLoading, error } = useMachineMonitor({
    userId: userId || 0,
    enabled: !!userId && !userLoading,
  })

  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  // Update current time every second for live duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const avgSpeed = calculateAverageSpeed(machines)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
            {machines.map((machine) => {
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
            })}
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

