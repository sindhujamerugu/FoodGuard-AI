import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { authBridge } from './authBridge'
import { tokenStorage } from './tokenStorage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const http = axios.create({
  baseURL: `${API_URL}/api/v1`,
})

/** Bare instance with no interceptors — used for the refresh call itself to avoid recursion. */
const refreshClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
})

http.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) {
    throw new Error('No refresh token available.')
  }
  const response = await refreshClient.post<{ access: string; refresh?: string }>(
    '/auth/token/refresh/',
    { refresh },
  )
  const { access, refresh: rotatedRefresh } = response.data
  if (rotatedRefresh) {
    tokenStorage.setTokens(access, rotatedRefresh)
  } else {
    tokenStorage.setAccess(access)
  }
  return access
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/token/refresh')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      originalRequest._retried = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const access = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${access}`
        return http(originalRequest)
      } catch (refreshError) {
        tokenStorage.clear()
        authBridge.notifyAuthFailure()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
