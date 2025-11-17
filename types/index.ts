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

export type ReportRangeType = 'daily' | 'last_month'
export type ReportFormat = 'pdf' | 'xlsx'
export type ReportStatus = 'processing' | 'ready' | 'failed'

export interface PaginationMeta {
  page: number
  limit: number | 'all'
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ReportShiftBreakdownEntry {
  date: string
  shift: 'day' | 'night'
  stop_time: number
}

export interface ReportRollupSummary {
  machine_id: number
  machine_name: string
  machine_number: number
  factory_id: number
  admin_id: number
  report_type: string
  range_type: ReportRangeType
  range_label: string
  start_date: string
  end_date: string
  total_duration_seconds: number
  total_samples: number
  average_rpm: number
  min_rpm: number
  max_rpm: number
  total_stop_events: number
  downtime_seconds: number
  uptime_seconds: number
  availability_percentage: number
  day_stop_seconds: number
  night_stop_seconds: number
  shift_breakdown?: ReportShiftBreakdownEntry[]
  file_format: ReportFormat
}

export interface ReportRecord {
  id: number
  admin_id: number
  factory_id: number
  machine_number: number
  report_type: string
  range_type: ReportRangeType
  start_date: string
  end_date: string
  file_format: ReportFormat
  file_name?: string | null
  file_size?: number | null
  status: ReportStatus
  requested_by: number
  created_at: string
  updated_at: string
  rollup_summary?: ReportRollupSummary | null
}

export interface ReportGenerationPayload {
  machine_number: number
  range_type: ReportRangeType
  date?: string
  format: ReportFormat
  admin_id?: number
}

export interface ReportQueryFilters {
  machine_number?: number
  range_type?: ReportRangeType
  file_format?: ReportFormat
  status?: ReportStatus
  admin_id?: number
}

export interface ReportListResult {
  data: ReportRecord[]
  pagination?: PaginationMeta
}

