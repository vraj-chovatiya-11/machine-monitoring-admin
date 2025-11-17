import axios from 'axios'
import type {
  MachineLog,
  Machine,
  LogFilter,
  ReportGenerationPayload,
  ReportListResult,
  ReportQueryFilters,
  ReportRecord,
} from '@/types'
import type { MonitorLog } from '@/types/machineMonitor'

// Get API URL from environment, defaulting to localhost:3001/api
// If NEXT_PUBLIC_API_URL doesn't include /api, it will be appended
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  // Ensure /api is included in the base URL
  if (envUrl.endsWith('/api')) {
    return envUrl
  }
  if (envUrl.endsWith('/')) {
    return `${envUrl}api`
  }
  return `${envUrl}/api`
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token interceptor if token is available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      // Trim whitespace and ensure token is valid before adding to header
      const trimmedToken = token.trim()
      if (trimmedToken) {
        config.headers.Authorization = `Bearer ${trimmedToken}`
      }
    }
  }
  return config
})

const extractFileNameFromDisposition = (header?: string | null): string | null => {
  if (!header) {
    return null
  }
  const utfEncoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfEncoded?.[1]) {
    try {
      return decodeURIComponent(utfEncoded[1].replace(/\+/g, '%20'))
    } catch (_error) {
      return utfEncoded[1]
    }
  }
  const plain = header.match(/filename="?([^\";]+)"?/i)
  return plain?.[1] ?? null
}

// Add response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear invalid token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const machineService = {
  /**
   * Fetch all machines with pagination
   * Backend returns: { success: true, data: { data: adminGroups[], pagination: {...} }, meta: {} }
   * adminGroups structure: [{ admin: {...}, factory: [{ ...factoryDetails, machine: [...machines] }] }]
   */
  async getMachines(page: number = 1, limit: number = 10): Promise<Machine[]> {
    const response = await apiClient.get<{
      success: boolean
      data: {
        data: Array<{
          admin: any
          factory: Array<{
            machine: Array<{
              id: number
              machine_name: string
              status: 'active' | 'inactive'
              fac_machine_number: number
              [key: string]: any
            }>
            [key: string]: any
          }>
        }>
        pagination?: any
      }
      meta?: any
    }>('/machine', {
      params: {
        page,
        limit,
      },
    })

    // Extract the nested data structure
    const responseData = response.data.data?.data || []

    // Flatten machines from the nested admin/factory structure
    const machines: Machine[] = []

    for (const adminGroup of responseData) {
      if (adminGroup.factory && Array.isArray(adminGroup.factory)) {
        for (const factory of adminGroup.factory) {
          if (factory.machine && Array.isArray(factory.machine)) {
            for (const machine of factory.machine) {
              machines.push({
                id: String(machine.id),
                name: machine.machine_name || `Machine ${machine.id}`,
                status: machine.status === 'active' ? 'online' : machine.status === 'inactive' ? 'offline' : 'maintenance',
                // Optional fields - add if available in backend response
                lastSeen: machine.lastSeen || machine.updated_at || undefined,
                ipAddress: machine.ipAddress || machine.ip_address || undefined,
                fac_machine_number: machine.fac_machine_number, // Store for matching with logs
              })
            }
          }
        }
      }
    }

    return machines
  },

  /**
   * Fetch a single machine by ID
   * Backend returns: { success: true, data: machine, meta: {} }
   */
  async getMachineById(id: string): Promise<Machine> {
    const response = await apiClient.get<{
      success: boolean
      data: {
        id: number
        machine_name: string
        status: 'active' | 'inactive'
        fac_machine_number: number
        [key: string]: any
      }
      meta?: any
    }>(`/machine/${id}`)

    const machine = response.data.data

    return {
      id: String(machine.id),
      name: machine.machine_name || `Machine ${machine.id}`,
      status: machine.status === 'active' ? 'online' : machine.status === 'inactive' ? 'offline' : 'maintenance',
      lastSeen: machine.lastSeen || machine.updated_at || undefined,
      ipAddress: machine.ipAddress || machine.ip_address || undefined,
    }
  },

  /**
   * Fetch logs with optional filters
   * Backend returns: { success: true, data: { data: MonitorLog[], pagination: {...} }, meta: {} }
   */
  async getLogs(filters?: LogFilter & { user_id?: number; limit?: number; page?: number }): Promise<MonitorLog[]> {
    const response = await apiClient.get<{
      success: boolean
      data: {
        data: MonitorLog[]
        pagination?: any
      }
      meta?: any
    }>('/machine/logs', {
      params: filters,
    })
    // Extract the actual array from the nested data structure
    return Array.isArray(response.data.data?.data) ? response.data.data.data : []
  },

  /**
   * Fetch logs for a specific machine
   * Backend returns: { success: true, data: { data: MachineLog[], pagination: {...} }, meta: {} }
   */
  async getMachineLogs(machineId: string, filters?: Omit<LogFilter, 'machineId'> & { user_id?: number }): Promise<MachineLog[]> {
    const response = await apiClient.get<{
      success: boolean
      data: {
        data: MachineLog[]
        pagination?: any
      }
      meta?: any
    }>('/machine/logs', {
      params: {
        ...filters,
        machineId,
      },
    })
    // Extract the actual array from the nested data structure
    return Array.isArray(response.data.data?.data) ? response.data.data.data : []
  },

  /**
   * Fetch latest monitor logs for a specific user
   * Returns the most recent monitor_logs entry for the given user_id
   * Backend returns: { success: true, data: { data: MonitorLog[], pagination: {...} }, meta: {} }
   */
  async getLatestMonitorLogs(userId: number, limit: number = 1): Promise<{ data: MonitorLog[]; pagination?: any }> {
    const response = await apiClient.get<{
      success: boolean
      data: {
        data: MonitorLog[]
        pagination?: any
      }
      meta?: any
    }>('/machine/logs', {
      params: {
        user_id: userId,
        limit,
        page: 1,
      },
    })
    // Extract the nested data structure
    return {
      data: Array.isArray(response.data.data?.data) ? response.data.data.data : [],
      pagination: response.data.data?.pagination,
    }
  },

  /**
   * Get current user profile
   * Returns the authenticated user's profile including user ID
   * Backend wraps response in { success: true, data: { id, user_id, ... }, meta: {} }
   * Note: user_id is the numeric identifier, not MongoDB _id
   */
  async getProfile(): Promise<{ id?: number; user_id?: number; [key: string]: any }> {
    const response = await apiClient.get<{ success: boolean; data: { id?: number; user_id?: number; [key: string]: any }; meta?: Record<string, unknown> }>('/users/profile')
    return response.data.data
  },

  /**
   * Update current user profile
   * Updates profile data (name, status)
   * Backend wraps response in { success: true, data: { id, user_id, ... }, meta: {} }
   * Note: Only name and status can be updated via profile endpoint
   */
  async updateProfile(updates: { name?: string; status?: string }): Promise<{ id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; [key: string]: any }> {
    const response = await apiClient.patch<{ success: boolean; data: { id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; [key: string]: any }; meta?: Record<string, unknown> }>('/users/profile', updates)
    return response.data.data
  },

  /**
   * Get admin by ID
   * Returns admin data including user_id, username, name, email, phone, status, role, etc.
   * Backend wraps response in { success: true, data: { id, user_id, ... }, meta: {} }
   * Note: user_id is the numeric identifier, not MongoDB _id
   */
  async getAdminById(adminId: string | number): Promise<{ id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; ownerId?: number; [key: string]: any }> {
    const response = await apiClient.get<{ success: boolean; data: { id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; ownerId?: number; [key: string]: any }; meta?: Record<string, unknown> }>(`/users/admins/${adminId}`)
    return response.data.data
  },

  /**
   * Update admin by ID
   * Updates admin data (name, email, phone, status)
   * Backend wraps response in { success: true, data: { id, user_id, ... }, meta: {} }
   * Note: Only name, email, phone, and status can be updated
   */
  async updateAdmin(
    adminId: string | number,
    updates: {
      name?: string
      email?: string
      phone?: string
      status?: string
    }
  ): Promise<{ id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; ownerId?: number; [key: string]: any }> {
    const response = await apiClient.patch<{ success: boolean; data: { id?: number; user_id?: number; username?: string; name?: string; email?: string; phone?: string; status?: string; role?: string; ownerId?: number; [key: string]: any }; meta?: Record<string, unknown> }>(`/users/admins/${adminId}`, updates)
    return response.data.data
  },

  /**
   * Get stop counts for machines
   * Returns stop counts grouped by shift (day/night) for today
   * Backend returns: { success: true, data: { [machineNumber]: { day: number, night: number, total: number } }, meta: {} }
   */
  async getFactoryMachinesStopCounts(factoryId: number): Promise<Record<number, { day: number; night: number; total: number }>> {
    const response = await apiClient.get<{
      success: boolean
      data: Record<number, { day: number; night: number; total: number }>
      meta?: any
    }>('/machine/stop-counts/factory', {
      params: {
        factory_id: factoryId,
      },
    })
    return response.data.data || {}
  },

  /**
   * Get stop counts for a specific machine
   * Returns stop counts for today grouped by shift
   * Backend returns: { success: true, data: { day: number, night: number, total: number }, meta: {} }
   */
  async getMachineStopCounts(factoryId: number, machineNumber: number): Promise<{ day: number; night: number; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: { day: number; night: number; total: number }
      meta?: any
    }>('/machine/stop-counts/machine', {
      params: {
        factory_id: factoryId,
        machine_number: machineNumber,
      },
    })
    return response.data.data || { day: 0, night: 0, total: 0 }
  },

  /**
   * Get stop times for machines
   * Returns stop times grouped by shift (day/night) for today
   * Backend returns: { success: true, data: { [machineNumber]: { day: number, night: number, total: number } }, meta: {} }
   * Note: Times are in seconds
   */
  async getFactoryMachinesStopTimes(factoryId: number): Promise<Record<number, { day: number; night: number; total: number }>> {
    const response = await apiClient.get<{
      success: boolean
      data: Record<number, { day: number; night: number; total: number }>
      meta?: any
    }>('/machine/stop-times/factory', {
      params: {
        factory_id: factoryId,
      },
    })
    return response.data.data || {}
  },

  /**
   * Get stop times for a specific machine
   * Returns stop times for today grouped by shift
   * Backend returns: { success: true, data: { day: number, night: number, total: number }, meta: {} }
   * Note: Times are in seconds
   */
  async getMachineStopTimes(factoryId: number, machineNumber: number): Promise<{ day: number; night: number; total: number }> {
    const response = await apiClient.get<{
      success: boolean
      data: { day: number; night: number; total: number }
      meta?: any
    }>('/machine/stop-times/machine', {
      params: {
        factory_id: factoryId,
        machine_number: machineNumber,
      },
    })
    return response.data.data || { day: 0, night: 0, total: 0 }
  },
}

export const reportService = {
  async generateReport(payload: ReportGenerationPayload): Promise<ReportRecord> {
    const response = await apiClient.post<{ success: boolean; data: ReportRecord }>(
      '/reports/machine-performance',
      payload
    )
    return response.data.data
  },

  async listReports(
    params?: (ReportQueryFilters & { page?: number; limit?: number | 'all' }) | undefined
  ): Promise<ReportListResult> {
    const queryParams: Record<string, string | number> = {}
    if (params?.page) {
      queryParams.page = params.page
    }
    if (params?.limit !== undefined) {
      queryParams.limit = params.limit === 'all' ? 'all' : params.limit
    }
    if (params?.machine_number) {
      queryParams.machine_number = params.machine_number
    }
    if (params?.range_type) {
      queryParams.range_type = params.range_type
    }
    if (params?.file_format) {
      queryParams.file_format = params.file_format
    }
    if (params?.status) {
      queryParams.status = params.status
    }
    if (params?.admin_id) {
      queryParams.admin_id = params.admin_id
    }

    const response = await apiClient.get<{ success: boolean; data: ReportListResult }>('/reports', {
      params: queryParams,
    })

    return response.data.data ?? { data: [], pagination: undefined }
  },

  async downloadReport(reportId: number): Promise<{ blob: Blob; fileName: string }> {
    const response = await apiClient.get<Blob>(`/reports/${reportId}/download`, {
      responseType: 'blob',
    })
    const fileName =
      extractFileNameFromDisposition(response.headers['content-disposition']) ??
      `report-${reportId}`

    return {
      blob: response.data,
      fileName,
    }
  },
}

export default apiClient

