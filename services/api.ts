import axios from 'axios'
import type { MachineLog, Machine, LogFilter } from '@/types'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const machineService = {
  /**
   * Fetch all machines
   */
  async getMachines(): Promise<Machine[]> {
    const response = await apiClient.get<Machine[]>('/api/machines')
    return response.data
  },

  /**
   * Fetch a single machine by ID
   */
  async getMachineById(id: string): Promise<Machine> {
    const response = await apiClient.get<Machine>(`/api/machines/${id}`)
    return response.data
  },

  /**
   * Fetch logs with optional filters
   */
  async getLogs(filters?: LogFilter): Promise<MachineLog[]> {
    const response = await apiClient.get<MachineLog[]>('/api/logs', {
      params: filters,
    })
    return response.data
  },

  /**
   * Fetch logs for a specific machine
   */
  async getMachineLogs(machineId: string, filters?: Omit<LogFilter, 'machineId'>): Promise<MachineLog[]> {
    const response = await apiClient.get<MachineLog[]>(`/api/machines/${machineId}/logs`, {
      params: filters,
    })
    return response.data
  },
}

export default apiClient

