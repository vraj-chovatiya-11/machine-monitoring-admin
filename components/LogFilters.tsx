'use client'

import { cn } from '@/lib/utils'
import type { LogFilter } from '@/types'

interface LogFiltersProps {
  filters: LogFilter
  onFiltersChange: (filters: LogFilter) => void
}

export default function LogFilters({ filters, onFiltersChange }: LogFiltersProps) {
  const levels: Array<LogFilter['level']> = ['info', 'warning', 'error', 'debug']

  const updateFilter = <K extends keyof LogFilter>(key: K, value: LogFilter[K]) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Level:</label>
        <div className="flex gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() =>
                updateFilter('level', filters.level === level ? undefined : level)
              }
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                filters.level === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              )}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Search:</label>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search logs..."
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {(filters.level || filters.search) && (
        <button
          onClick={() => onFiltersChange({})}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs text-gray-700 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}

