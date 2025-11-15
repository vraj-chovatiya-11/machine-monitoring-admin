import apiClient from './api'

export interface LoginCredentials {
  identifier: string // username, email, or phone
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    username?: string
    name?: string
    email?: string
    role?: string
    [key: string]: any
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: Record<string, unknown>
}

/**
 * Authentication service
 * Handles user login and token management
 */
export const authService = {
  /**
   * Login with identifier (username, email, or phone) and password
   * Returns token and user data
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/users/login', credentials)
    // Backend wraps response in { success: true, data: { token, user }, meta: {} }
    return response.data.data
  },

  /**
   * Logout - clears stored token
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  },

  /**
   * Get stored access token
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token')
    }
    return null
  },

  /**
   * Store access token and user data
   */
  setAuth(token: string, user: LoginResponse['user']): void {
    if (typeof window !== 'undefined') {
      // Ensure token is trimmed and valid before storing
      const trimmedToken = token?.trim()
      if (!trimmedToken) {
        throw new Error('Token is required but was not provided')
      }
      if (!user) {
        throw new Error('User data is required but was not provided')
      }
      localStorage.setItem('access_token', trimmedToken)
      localStorage.setItem('user', JSON.stringify(user))
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null
  },
}

