'use client'

import { useState } from 'react'
import Header from './Header'
import SecondaryNav from './SecondaryNav'
import MetricsBar from './MetricsBar'
import StatusBar from './StatusBar'
import MachineCards from './MachineCards'
import MachineList from './MachineList'
import MachineListView from './MachineListView'
import CustomView from './CustomView'
import LogViewer from './LogViewer'
import LogFilters from './LogFilters'
import MachineLiveMonitor from './MachineLiveMonitor'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMachineMonitor } from '@/hooks/useMachineMonitor'
import type { LogFilter } from '@/types'

export default function Dashboard() {
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>()
  const [filters, setFilters] = useState<LogFilter>({})
  const [activeView, setActiveView] = useState<'Cards' | 'Lists' | 'Custom' | 'Dashboard'>('Dashboard')
  const { userId, loading: userLoading } = useCurrentUser()

  // Fetch machine data for metrics bar
  const { machines: metricsMachines } = useMachineMonitor({
    userId: userId || 0,
    enabled: !!userId,
  })

  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        // Show live machine monitoring dashboard
        if (userLoading) {
          return (
            <div className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading user profile...</div>
              </div>
            </div>
          )
        }
        if (!userId) {
          return (
            <div className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Unable to load user profile. Please log in.</div>
              </div>
            </div>
          )
        }
        return (
          <div className="p-6">
            <MachineLiveMonitor userId={userId} />
          </div>
        )
      case 'Cards':
        return <MachineCards />
      case 'Lists':
        return (
          <div className="p-6">
            <MachineListView />
          </div>
        )
      case 'Custom':
        return (
          <div className="p-6">
            <CustomView />
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
          <MetricsBar machines={metricsMachines} />
          <StatusBar />
        </div>
      </div>
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  )
}

