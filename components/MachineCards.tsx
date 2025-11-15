'use client'

import { useMachines } from '@/hooks/useMachines'

export default function MachineCards() {
  const { machines, loading, error } = useMachines()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading machines...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    )
  }

  if (machines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-2xl font-semibold text-gray-700 mb-2">
          No machines to display
        </div>
        <div className="text-sm text-gray-500">
          Machines found but could not be transformed. Check console for details.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{machine.name}</h3>
              <div
                className={`w-3 h-3 rounded-full ${
                  machine.status === 'online'
                    ? 'bg-green-500'
                    : machine.status === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
                title={machine.status}
              />
            </div>
            {machine.ipAddress && (
              <div className="text-sm text-gray-600 mb-2">{machine.ipAddress}</div>
            )}
            {machine.lastSeen && (
              <div className="text-xs text-gray-500">
                Last seen: {new Date(machine.lastSeen).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

