import { http } from '@/lib/http'
import type { LoginPayload, LoginResponse, RegisterPayload, RegisterResponse, User } from '@/types/user'

export const authApi = {
  register: (payload: RegisterPayload) =>
    http.post<RegisterResponse>('/auth/register/', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    http.post<LoginResponse>('/auth/login/', payload).then((r) => r.data),

  profile: () => http.get<User>('/auth/profile/').then((r) => r.data),

  logout: (refresh: string) => http.post('/auth/logout/', { refresh }).then((r) => r.data),
}
