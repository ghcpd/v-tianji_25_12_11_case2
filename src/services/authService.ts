import { User } from '../types'

class AuthService {
  private apiBase = '/api/auth'

  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${this.apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    localStorage.setItem('token', data.token)
    return data.user
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token')
    await fetch(`${this.apiBase}/logout`, { method: 'POST' })
  }

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.apiBase}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new Error('Failed to get current user')
    }

    return response.json()
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const token = localStorage.getItem('token')
    const response = await fetch(`${this.apiBase}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Failed to update user')
    }

    return response.json()
  }
}

export const authService = new AuthService()

