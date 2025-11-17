import Header from '@/components/Header'
import ReportsPanel from '@/components/ReportsPanel'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="p-6">
          <ReportsPanel />
        </div>
      </div>
    </ProtectedRoute>
  )
}

