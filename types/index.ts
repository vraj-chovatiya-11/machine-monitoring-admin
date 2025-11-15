export interface MachineLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  machineId?: string
  machineName?: string
}

export interface Machine {
  id: string
  name: string
  status: 'online' | 'offline' | 'maintenance'
  lastSeen?: string
  ipAddress?: string
}

export interface LogFilter {
  level?: MachineLog['level']
  machineId?: string
  startDate?: string
  endDate?: string
  search?: string
}

