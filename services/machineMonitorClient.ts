/**
 * WebSocket client for machine monitoring
 * Handles connection, reconnection, and message parsing
 */

import type { WebSocketMessage, ConnectionStatus } from '@/types/machineMonitor'

export interface MachineMonitorClientOptions {
  url: string
  userId: number
  onMessage: (data: WebSocketMessage) => void
  onStatusChange?: (status: ConnectionStatus) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class MachineMonitorClient {
  private ws: WebSocket | null = null
  private url: string
  private userId: number
  private onMessage: (data: WebSocketMessage) => void
  private onStatusChange?: (status: ConnectionStatus) => void
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts: number = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private isIntentionallyClosed: boolean = false
  private status: ConnectionStatus = 'disconnected'

  constructor(options: MachineMonitorClientOptions) {
    this.url = options.url
    this.userId = options.userId
    this.onMessage = options.onMessage
    this.onStatusChange = options.onStatusChange
    this.reconnectInterval = options.reconnectInterval ?? 5000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isIntentionallyClosed = false
    this.setStatus('connecting')

    // Validate URL before attempting connection
    if (!this.url || this.url.trim() === '') {
      const errorMsg = 'WebSocket URL is not configured'
      console.error(errorMsg)
      this.setStatus('error')
      this.onMessage({
        type: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Get JWT token from localStorage
    let token: string | null = null
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('access_token')
    }

    if (!token) {
      const errorMsg = 'Authentication token is required for WebSocket connection'
      console.error(errorMsg)
      this.setStatus('error')
      this.onMessage({
        type: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Construct WebSocket URL with token as query parameter
    // The backend will extract user_id from the token
    const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`

    // Validate WebSocket URL format
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      const errorMsg = `Invalid WebSocket URL format: ${wsUrl}. Must start with ws:// or wss://`
      console.error(errorMsg)
      this.setStatus('error')
      this.onMessage({
        type: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
      return
    }

    try {
      console.log('Attempting WebSocket connection to:', wsUrl)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('connected')
        console.log('WebSocket connected for user:', this.userId)
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.onMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          this.onMessage({
            type: 'error',
            error: 'Failed to parse message',
            timestamp: new Date().toISOString(),
          })
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error)
        console.error('WebSocket URL:', wsUrl)
        console.error('User ID:', this.userId)
        this.setStatus('error')
        // Provide more detailed error information
        this.onMessage({
          type: 'error',
          error: `WebSocket connection failed. Please check if the WebSocket server is running at ${wsUrl}`,
          timestamp: new Date().toISOString(),
        })
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        console.log('WebSocket disconnected for user:', this.userId)

        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to create WebSocket connection:', errorMessage)
      console.error('WebSocket URL:', wsUrl)
      console.error('User ID:', this.userId)
      this.setStatus('error')
      // Provide error feedback
      this.onMessage({
        type: 'error',
        error: `Failed to create WebSocket connection: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      })
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) {
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000) // Max 30s

    this.setStatus('reconnecting')
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Update connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status
      this.onStatusChange?.(status)
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

/**
 * Get WebSocket URL from environment or default
 *
 * WebSocket endpoint should be configured based on your backend implementation.
 * Uses the same base URL as the API client for consistency.
 */
export function getWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  // Use the same base URL logic as api.ts for consistency
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Extract host and port from API URL
  let baseUrl = envUrl

  // Remove /api suffix if present (we'll add it back if needed)
  const hasApiSuffix = baseUrl.endsWith('/api')
  if (hasApiSuffix) {
    baseUrl = baseUrl.replace(/\/api$/, '')
  }

  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/$/, '')

  // Convert HTTP URL to WebSocket URL
  let wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')

  // Append WebSocket path - adjust this to match your backend WebSocket route
  // Common patterns:
  // - /ws/machine/logs
  // - /api/machine/logs/ws
  // - /machine/logs/ws
  const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/ws/machine/logs'

  return `${wsUrl}${wsPath}`
}

