'use client'

import { cn } from '@/lib/utils'

const tabs = ['Cards', 'Lists', 'Custom', 'Summary', 'Dashboard'] as const

interface SecondaryNavProps {
  activeTab: typeof tabs[number]
  onTabChange: (tab: typeof tabs[number]) => void
}

export default function SecondaryNav({ activeTab, onTabChange }: SecondaryNavProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 px-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === tab
                ? 'text-gray-900 border-gray-800 bg-gray-50'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}

