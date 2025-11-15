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
  fac_machine_number?: number
}

export interface LogFilter {
  level?: MachineLog['level']
  machineId?: string
  startDate?: string
  endDate?: string
  search?: string
}

// Export machine monitoring types
export type {
  MonitorLog,
  MachineLogData,
  MachineLiveData,
  WebSocketMessage,
  ConnectionStatus,
} from './machineMonitor'

