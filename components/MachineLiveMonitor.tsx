'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import { useMachineStopTimes } from '@/hooks/useMachineStopTimes'
import { calculateEfficiency } from '@/lib/utils'
import apiClient from '@/services/api'
import type { ConnectionStatus } from '@/types/machineMonitor'
import { formatDistanceToNow } from 'date-fns'

interface MachineLiveMonitorProps {
  userId: number
}

/**
 * Connection status indicator component
 */
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', label: 'Live', pulse: true }
      case 'connecting':
        return { color: 'bg-yellow-500', label: 'Connecting', pulse: true }
      case 'reconnecting':
        return { color: 'bg-yellow-500', label: 'Reconnecting', pulse: true }
      case 'error':
        return { color: 'bg-red-500', label: 'Error', pulse: false }
      default:
        return { color: 'bg-gray-400', label: 'Offline', pulse: false }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}
        title={config.label}
      />
      <span className="text-xs font-medium text-gray-700">{config.label}</span>
    </div>
  )
}

/**
 * Machine Live Monitor Component
 *
 * Displays real-time machine status using WebSocket connection.
 * Shows latest readings per machine with visual indicators for stopped machines.
 */
export default function MachineLiveMonitor({ userId }: MachineLiveMonitorProps) {
  const { machines, isLoading, error, lastUpdateTime, connectionStatus } = useMachineMonitor({
    userId,
    enabled: true,
  })

  const [factoryId, setFactoryId] = useState<number | null>(null)

  const { stopTimes } = useMachineStopTimes({
    factoryId,
    enabled: !!factoryId,
  })

  const fetchFactoryId = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          data: Array<{
            factory: Array<{
              id: number
            }>
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
    if (!factoryId) {
      fetchFactoryId()
    }
  }, [factoryId, fetchFactoryId])

  if (isLoading) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Machine Live Status</h2>
          {lastUpdateTime && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatDistanceToNow(lastUpdateTime, { addSuffix: true })}
            </p>
          )}
        </div>
        <ConnectionStatusIndicator status={connectionStatus} />
      </div>

      {/* Machine Table */}
      <div className="overflow-x-auto">
        {machines.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No machine data available</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RPM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pik Counter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stop Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {machines.map((machine) => {
                const isStopped = machine.machineStatus === 0
                const hasStopEvents = machine.machineStopEvents > 0
                const isAlert = isStopped || hasStopEvents

                const stopTimeSeconds = stopTimes[machine.machineNumber]?.total
                const efficiency = stopTimeSeconds !== undefined ? calculateEfficiency(stopTimeSeconds) : null
                const efficiencyColor =
                  efficiency === null
                    ? 'text-gray-400'
                    : efficiency >= 90
                      ? 'text-green-600'
                      : efficiency >= 70
                        ? 'text-yellow-600'
                        : 'text-red-600'

                return (
                  <tr
                    key={machine.machineNumber}
                    className={`hover:bg-gray-50 transition-colors ${
                      isAlert ? '' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        Machine {machine.machineNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          machine.machineStatus === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {machine.statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{machine.fre_RPM}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{machine.pikCounter.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${
                          hasStopEvents ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {machine.machineStopEvents}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${efficiencyColor}`}>
                        {efficiency === null ? '—' : `${efficiency.toFixed(1)}%`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(machine.lastUpdated, { addSuffix: true })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      {machines.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500">Total Machines: </span>
                <span className="font-medium text-gray-900">{machines.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Running: </span>
                <span className="font-medium text-green-600">
                  {machines.filter((m) => m.machineStatus === 1).length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Stopped: </span>
                <span className="font-medium text-red-600">
                  {machines.filter((m) => m.machineStatus === 0).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

