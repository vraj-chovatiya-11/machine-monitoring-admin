'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { machineService } from '@/services/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface AdminData {
  id?: number
  user_id?: number
  username?: string
  name?: string
  email?: string
  phone?: string
  status?: string
  role?: string
  ownerId?: number
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

export default function ProfilePage() {
  const router = useRouter()
  const { user: currentUser, userId, loading: userLoading } = useCurrentUser()
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    status: '',
  })

  useEffect(() => {
    const fetchAdminData = async () => {
      // Wait for user loading to complete
      if (userLoading) return

      try {
        setLoading(true)
        setError(null)
        const data = await machineService.getProfile()
        setAdminData(data)
        setFormData({
          name: data.name || '',
          status: data.status || '',
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin data'
        setError(errorMessage)
        console.error('Error fetching admin data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [userLoading])

  const handleEdit = () => {
    setIsEditing(true)
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSaveError(null)
    setSaveSuccess(false)
    if (adminData) {
      setFormData({
        name: adminData.name || '',
        status: adminData.status || '',
      })
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!adminData) return

    // Validate form data - only name and status can be updated
    const updates: { name?: string; status?: string } = {}

    if (formData.name !== adminData.name) {
      if (formData.name.trim()) {
        updates.name = formData.name.trim()
      }
    }

    if (formData.status !== adminData.status) {
      updates.status = formData.status
    }

    if (Object.keys(updates).length === 0) {
      setSaveError('No changes to save')
      return
    }

    try {
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      const updatedData = await machineService.updateProfile(updates)
      setAdminData(updatedData)
      setIsEditing(false)
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update admin data'
      setSaveError(errorMessage)
      console.error('Error updating admin data:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 mt-2">View and manage your admin account information</p>
              </div>
              {!loading && !error && adminData && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600">Loading profile data...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-red-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-red-800 font-semibold">Error</h3>
                  <p className="text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-600 text-sm">{saveError}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-green-600 text-sm font-medium">Profile updated successfully!</p>
              </div>
            </div>
          )}

          {!loading && !error && adminData && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {adminData.name || adminData.username || 'Admin Profile'}
                    </h2>
                    <p className="text-blue-100 mt-1">
                      {adminData.email || 'No email provided'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {adminData.status && (
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(adminData.status)}`}
                      >
                        {adminData.status}
                      </span>
                    )}
                    {adminData.role && (
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getRoleBadgeColor(adminData.role)}`}
                      >
                        {adminData.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User ID
                      </label>
                      <div className="text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded border">
                        {adminData.user_id ?? adminData.id ?? 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                        {adminData.username || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter full name"
                        />
                      ) : (
                        <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                          {adminData.name || 'N/A'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                        {adminData.email || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                        {adminData.phone || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Status
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <div className="bg-gray-50 px-4 py-2 rounded border">
                          {adminData.status ? (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(adminData.status)}`}
                            >
                              {adminData.status}
                            </span>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <div className="bg-gray-50 px-4 py-2 rounded border">
                        {adminData.role ? (
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeColor(adminData.role)}`}
                          >
                            {adminData.role}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </div>
                    </div>

                    {adminData.ownerId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Owner ID
                        </label>
                        <div className="text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded border">
                          {adminData.ownerId}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created At
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                        {formatDate(adminData.createdAt || adminData.created_at)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Updated
                      </label>
                      <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded border">
                        {formatDate(adminData.updatedAt || adminData.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-end gap-4">
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

