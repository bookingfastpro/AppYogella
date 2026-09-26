import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { Course, Universe, ProgramSummary, ProgramDetail, Expert } from './api'

export function useCourses(params: { universe?: string; category?: string; search?: string; kind?: string; mood?: string } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => api.get<{ courses: Course[] }>(`/api/courses${qs ? `?${qs}` : ''}`).then((d) => d.courses),
    // La recherche relance la requête à chaque frappe : on garde les résultats
    // précédents à l'écran plutôt que de repasser par l'état de chargement.
    placeholderData: keepPreviousData,
  })
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get<{ course: Course }>(`/api/courses/${id}`).then((d) => d.course),
    enabled: !!id,
  })
}

export function useUniverses() {
  return useQuery({
    queryKey: ['universes'],
    queryFn: () => api.get<{ universes: Universe[] }>('/api/universes').then((d) => d.universes),
  })
}

export function usePrograms(routine?: boolean) {
  return useQuery({
    queryKey: ['programs', routine],
    queryFn: () =>
      api
        .get<{ programs: ProgramSummary[] }>(`/api/programs${routine !== undefined ? `?routine=${routine}` : ''}`)
        .then((d) => d.programs),
  })
}

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: () => api.get<{ program: ProgramDetail }>(`/api/programs/${id}`).then((d) => d.program),
    enabled: !!id,
  })
}

export interface PlanOption {
  key: 'MONTHLY' | 'ANNUAL'
  title: string
  price: string
  priceCents: number
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ plans: PlanOption[]; trialDays: number }>('/api/plans'),
  })
}

export function useExperts() {
  return useQuery({
    queryKey: ['experts'],
    queryFn: () => api.get<{ experts: Expert[] }>('/api/experts').then((d) => d.experts),
  })
}

export interface PracticeData {
  weekly: { sessionCount: number; totalMinutes: number; goalHours: number; progressHours: number }
  week: { label: string; active: boolean }[]
  resume: (Course & { progressPct: number }) | null
  routines: { id: string; title: string; meta: string; locked: boolean }[]
}

export function usePractice(enabled: boolean) {
  return useQuery({
    queryKey: ['practice'],
    queryFn: () => api.get<PracticeData>('/api/practice'),
    enabled,
  })
}

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<{ favorites: Course[] }>('/api/favorites').then((d) => d.favorites),
    enabled,
  })
}
