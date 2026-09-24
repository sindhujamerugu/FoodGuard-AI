/**
 * Decouples the axios interceptor (outside the React tree) from AuthContext.
 * AuthProvider registers a handler that clears state and redirects to /login
 * whenever a silent token refresh fails.
 */
type AuthFailureHandler = () => void

let handler: AuthFailureHandler | null = null

export const authBridge = {
  onAuthFailure(fn: AuthFailureHandler): void {
    handler = fn
  },
  notifyAuthFailure(): void {
    handler?.()
  },
}
