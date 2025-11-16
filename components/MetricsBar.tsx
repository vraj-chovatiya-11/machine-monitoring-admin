'use client'

import type { MachineLiveData } from '@/types/machineMonitor'

interface MetricsBarProps {
  machines: MachineLiveData[]
}

/**
 * Calculate metrics from machine data
 */
function calculateMetrics(machines: MachineLiveData[]) {
  if (machines.length === 0) {
    return {
      totalStitches: 0,
      avgSpeed: 0,
      running: 0,
      stopped: 0,
      totalStopEvents: 0,
      allMachines: 0,
    }
  }

  const totalStitches = machines.reduce((sum, machine) => sum + machine.pikCounter, 0)
  const totalSpeed = machines.reduce((sum, machine) => sum + machine.fre_RPM, 0)
  const avgSpeed = Math.round(totalSpeed / machines.length)
  const running = machines.filter((machine) => machine.machineStatus === 1).length
  const stopped = machines.filter((machine) => machine.machineStatus === 0).length
  const totalStopEvents = machines.reduce((sum, machine) => sum + machine.machineStopEvents, 0)
  const allMachines = machines.length

  return {
    totalStitches,
    avgSpeed,
    running,
    stopped,
    totalStopEvents,
    allMachines,
  }
}

export default function MetricsBar({ machines }: MetricsBarProps) {
  const metrics = calculateMetrics(machines)

  const metricItems = [
    { label: 'Total Stitches', value: metrics.totalStitches.toLocaleString() },
    { label: 'Avg Speed (RPM)', value: metrics.avgSpeed },
    { label: 'Running', value: metrics.running },
    { label: 'Stopped', value: metrics.stopped },
    // { label: 'Total Stop Events', value: metrics.totalStopEvents },
    { label: 'All Machines', value: metrics.allMachines },
  ]

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-8 flex-wrap">
        {metricItems.map((metric) => (
          <div key={metric.label} className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{metric.label}</span>
            <span className="text-lg font-semibold text-gray-900">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

