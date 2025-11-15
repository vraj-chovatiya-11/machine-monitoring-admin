'use client'

import { useState } from 'react'
import Header from './Header'
import SecondaryNav from './SecondaryNav'
import MetricsBar from './MetricsBar'
import StatusBar from './StatusBar'
import MachineCards from './MachineCards'
import MachineList from './MachineList'
import LogViewer from './LogViewer'
import LogFilters from './LogFilters'
import type { LogFilter } from '@/types'

export default function Dashboard() {
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>()
  const [filters, setFilters] = useState<LogFilter>({})
  const [activeView, setActiveView] = useState<'Cards' | 'Lists' | 'Custom' | 'Summary' | 'Dashboard'>('Cards')

  const renderContent = () => {
    switch (activeView) {
      case 'Cards':
        return <MachineCards />
      case 'Lists':
        return (
          <div className="flex h-[calc(100vh-280px)]">
            <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <MachineList
                selectedMachineId={selectedMachineId}
                onSelectMachine={setSelectedMachineId}
              />
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <LogFilters filters={filters} onFiltersChange={setFilters} />
              </div>
              <div className="flex-1 overflow-hidden">
                <LogViewer machineId={selectedMachineId} filters={filters} />
              </div>
            </main>
          </div>
        )
      default:
        return <MachineCards />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SecondaryNav activeTab={activeView} onTabChange={setActiveView} />
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <MetricsBar />
          <StatusBar />
        </div>
      </div>
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  )
}

