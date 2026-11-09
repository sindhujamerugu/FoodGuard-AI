import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/lib/queryKeys'
import type { UpdateProfilePayload, User } from '@/types/user'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authApi.profile,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authApi.updateProfile(payload),
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(queryKeys.auth.profile, updatedUser)
    },
  })
}
