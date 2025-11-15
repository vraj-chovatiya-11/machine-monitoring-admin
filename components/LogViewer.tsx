'use client'

import { useMachineLogs } from '@/hooks/useMachineLogs'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LogFilter } from '@/types'

interface LogViewerProps {
  machineId?: string
  filters?: LogFilter
}

export default function LogViewer({ machineId, filters }: LogViewerProps) {
  const { logs, loading, error } = useMachineLogs({
    machineId,
    filters,
    autoRefresh: true,
    refreshInterval: 5000,
  })

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-700 bg-red-50 border-red-300'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-300'
      case 'debug':
        return 'text-blue-700 bg-blue-50 border-blue-300'
      default:
        return 'text-green-700 bg-green-50 border-green-300'
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading logs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-4 font-mono text-sm">
      {logs.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">No logs found</div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                'p-3 rounded border-l-4 bg-white',
                getLevelColor(log.level),
                'hover:bg-opacity-70 transition-colors'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="font-semibold uppercase text-xs min-w-[60px]">
                  {log.level}
                </span>
                <span className="text-gray-600 text-xs min-w-[180px]">
                  {formatDate(log.timestamp)}
                </span>
                {log.machineName && (
                  <span className="text-gray-700 text-xs font-medium">
                    [{log.machineName}]
                  </span>
                )}
                <span className="flex-1 text-gray-900">{log.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

