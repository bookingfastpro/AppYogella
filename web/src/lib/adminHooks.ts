import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export interface AdminCourse {
  id: string
  title: string
  kind: 'COURSE' | 'ARTICLE'
  universe: string
  category: string | null
  moods: string[]
  durationMin: number
  meta: string
  premium: boolean
  videoUrl: string | null
  youtubeId: string | null
  /** Ce qui s'affiche : image choisie, sinon miniature YouTube. */
  thumbnailUrl: string | null
  /** Image réellement téléversée — null si l'on s'appuie sur YouTube. */
  customThumbnailUrl: string | null
}

export interface AdminProgram {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  isRoutine: boolean
  videoIds: string[]
  meta: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  initial: string
  isAdmin: boolean
  active: boolean
  /** « Actif » : abonnement actif sans formule connue (saisi à la main). */
  plan: 'Aucun' | 'Essai' | 'Mensuel' | 'Annuel' | 'Actif'
}

export interface AdminPlan {
  key: 'MONTHLY' | 'ANNUAL'
  title: string
  price: string
  priceCents: number
  active: boolean
  subscriberCount: number
}

export function useAdminCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => api.get<{ courses: AdminCourse[] }>('/api/admin/courses').then((d) => d.courses),
  })
}

export function useAddCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/admin/courses', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => api.patch(`/api/admin/courses/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/courses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      qc.invalidateQueries({ queryKey: ['admin', 'programs'] })
    },
  })
}

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('image', file)
      return api.post<{ url: string }>('/api/admin/uploads/image', form)
    },
  })
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('video', file)
      return api.post<{ url: string }>('/api/admin/uploads/video', form)
    },
  })
}

export function useAdminPrograms() {
  return useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => api.get<{ programs: AdminProgram[] }>('/api/admin/programs').then((d) => d.programs),
  })
}

export function useAddProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post<{ program: { id: string } }>('/api/admin/programs', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'programs'] }),
  })
}

export function useUpdateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch(`/api/admin/programs/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'programs'] }),
  })
}

export function useToggleProgramVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ programId, courseId, linked }: { programId: string; courseId: string; linked: boolean }) =>
      linked ? api.delete(`/api/admin/programs/${programId}/videos/${courseId}`) : api.post(`/api/admin/programs/${programId}/videos/${courseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'programs'] }),
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: AdminUser[]; stats: { total: number; activeSubscriptions: number } }>('/api/admin/users'),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; email?: string; isAdmin?: boolean; active?: boolean; cyclePlan?: boolean }) =>
      api.patch(`/api/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => api.get<{ plans: AdminPlan[]; trialDays: number }>('/api/admin/plans'),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, ...body }: { key: string; price?: string; active?: boolean }) => api.patch(`/api/admin/plans/${key}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] }),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { trialDays: number }) => api.patch('/api/admin/settings', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] }),
  })
}

export interface AdminNotification {
  id: string
  title: string
  body: string
  createdAt: string
  readCount: number
}

export function useAdminNotifications() {
  return useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get<{ notifications: AdminNotification[]; accounts: number }>('/api/admin/notifications'),
  })
}

export function useSendNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; body: string }) => api.post('/api/admin/notifications', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<{ mrr: string; activeCount: number; trialCount: number }>('/api/admin/stats'),
  })
}
