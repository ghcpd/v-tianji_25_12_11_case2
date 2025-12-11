import { AxiosError } from 'axios'
import { ErrorDetails } from '../types'

class ErrorHandler {
  private errorListeners: Set<(error: ErrorDetails) => void> = new Set()
  private errorQueue: ErrorDetails[] = []
  private maxQueueSize: number = 100

  handle(error: unknown): ErrorDetails {
    let errorDetails: ErrorDetails

    if (error instanceof AxiosError) {
      errorDetails = this.handleAxiosError(error)
    } else if (error instanceof Error) {
      errorDetails = this.handleGenericError(error)
    } else {
      errorDetails = this.handleUnknownError(error)
    }

    this.queueError(errorDetails)
    this.notifyListeners(errorDetails)

    return errorDetails
  }

  private handleAxiosError(error: AxiosError): ErrorDetails {
    const status = error.response?.status
    const data = error.response?.data as any

    let code = 'UNKNOWN_ERROR'
    let message = 'An unexpected error occurred'

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      code = 'TIMEOUT_ERROR'
      message = 'Request timed out. Please try again.'
    } else if (error.code === 'ERR_NETWORK') {
      code = 'NETWORK_ERROR'
      message = 'Network error. Please check your connection.'
    } else if (status) {
      switch (status) {
        case 400:
          code = 'VALIDATION_ERROR'
          message = data?.message || 'Invalid request'
          break
        case 401:
          code = 'UNAUTHORIZED'
          message = 'Authentication required'
          break
        case 403:
          code = 'FORBIDDEN'
          message = 'You do not have permission to perform this action'
          break
        case 404:
          code = 'NOT_FOUND'
          message = 'Resource not found'
          break
        case 409:
          code = 'CONFLICT'
          message = data?.message || 'Conflict occurred'
          break
        case 422:
          code = 'VALIDATION_ERROR'
          message = data?.message || 'Validation failed'
          break
        case 429:
          code = 'RATE_LIMIT'
          message = 'Too many requests. Please try again later.'
          break
        case 500:
          code = 'SERVER_ERROR'
          message = 'Internal server error'
          break
        case 502:
        case 503:
        case 504:
          code = 'SERVICE_UNAVAILABLE'
          message = 'Service temporarily unavailable'
          break
        default:
          code = `HTTP_${status}`
          message = data?.message || `HTTP error ${status}`
      }
    }

    return {
      code,
      message,
      field: data?.field,
      stack: error.stack,
      context: {
        url: error.config?.url,
        method: error.config?.method,
        status,
        responseData: data,
      },
      timestamp: new Date(),
      requestId: (error.config as any)?.metadata?.requestId,
    }
  }

  private handleGenericError(error: Error): ErrorDetails {
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    }
  }

  private handleUnknownError(error: unknown): ErrorDetails {
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      timestamp: new Date(),
      context: { originalError: error },
    }
  }

  private queueError(error: ErrorDetails): void {
    this.errorQueue.push(error)
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }
  }

  subscribe(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.add(listener)
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  private notifyListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (e) {
        console.error('Error in error listener:', e)
      }
    })
  }

  getErrorHistory(): ErrorDetails[] {
    return [...this.errorQueue]
  }

  clearErrorHistory(): void {
    this.errorQueue = []
  }
}

export const errorHandler = new ErrorHandler()

