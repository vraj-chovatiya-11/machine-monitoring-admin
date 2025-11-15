/**
 * Type definitions for machine monitoring system
 * Based on the monitor_logs MongoDB document structure
 */

/**
 * Individual machine data within a monitor log entry
 */
export interface MachineLogData {
  machineNumber: number
  pikCounter: number
  machineStatus: 0 | 1 // 0 = Stopped, 1 = Running
  fre_RPM: number
  machineStopEvents: number
}

/**
 * Complete monitor log entry from the database
 */
export interface MonitorLog {
  _id?: string
  timestamp: string
  timestamp_epoch: number
  user_id: number // admin ID
  machines: MachineLogData[]
  created_at?: string
  updated_at?: string
}

/**
 * Live machine data with additional computed fields for UI
 */
export interface MachineLiveData {
  machineNumber: number
  machineName: string
  pikCounter: number
  machineStatus: 0 | 1
  fre_RPM: number
  machineStopEvents: number
  lastUpdated: Date
  statusLabel: 'Running' | 'Stopped'
}

/**
 * WebSocket message payload structure
 */
export interface WebSocketMessage {
  type: 'monitor_log' | 'error' | 'ping' | 'pong'
  data?: MonitorLog
  error?: string
  timestamp?: string
}

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

