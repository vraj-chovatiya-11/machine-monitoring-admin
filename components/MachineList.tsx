'use client'

import { useMachines } from '@/hooks/useMachines'
import { cn } from '@/lib/utils'

interface MachineListProps {
  selectedMachineId?: string
  onSelectMachine: (machineId: string | undefined) => void
}

export default function MachineList({ selectedMachineId, onSelectMachine }: MachineListProps) {
  const { machines, loading, error } = useMachines()

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-500">Loading machines...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-600">Error: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Machines</h2>
        <button
          onClick={() => onSelectMachine(undefined)}
          className={cn(
            'text-xs px-2 py-1 rounded',
            !selectedMachineId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          )}
        >
          All
        </button>
      </div>

      <div className="space-y-2">
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => onSelectMachine(machine.id)}
            className={cn(
              'w-full text-left p-3 rounded-lg transition-colors',
              'border border-gray-200 hover:border-gray-300',
              selectedMachineId === machine.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-900'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{machine.name}</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  machine.status === 'online'
                    ? 'bg-green-500'
                    : machine.status === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                )}
                title={machine.status}
              />
            </div>
            {machine.ipAddress && (
              <div className={cn(
                'text-xs',
                selectedMachineId === machine.id ? 'text-gray-200' : 'text-gray-500'
              )}>
                {machine.ipAddress}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

