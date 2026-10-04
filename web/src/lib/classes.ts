import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

/** Séance de cours au studio, telle que renvoyée par l'API. */
export interface ClassSession {
  id: string
  seriesId: string | null
  isRecurring: boolean
  title: string
  description: string | null
  instructor: string | null
  location: string | null
  level: string | null
  startsAt: string
  endsAt: string
  /** Jour à Paris, « YYYY-MM-DD ». */
  day: string
  startTime: string
  endTime: string
  durationMin: number
  capacity: number
  booked: number
  remaining: number
  cancelled: boolean
  past: boolean
  myBooking: boolean
}

export interface AdminClassSession extends ClassSession {
  series: { weekdays: number[]; active: boolean; endDate: string | null } | null
  attendees: { id: string; name: string; email: string; bookedAt: string }[]
}

export const LEVELS = ['Tous niveaux', 'Débutant', 'Intermédiaire', 'Avancé']
export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const WEEKDAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// ── Dates du studio (heure de Paris), en chaînes « YYYY-MM-DD » ──
const TZ = 'Europe/Paris'
export const parisToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
/** 0 = lundi … 6 = dimanche. */
export function weekdayOf(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
const asDate = (day: string) => new Date(`${day}T12:00:00Z`)
/** « lundi 5 octobre » */
export const formatDayLong = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(day))
/** « 5 oct. » */
export const formatDayShort = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(asDate(day))
export const dayNumber = (day: string) => Number(day.slice(8, 10))
/** Majuscule au premier mot seulement : « Lundi 5 octobre ». */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** « Aujourd'hui », « Demain » ou « Lundi 5 octobre ». */
export function relativeDay(day: string) {
  const t = parisToday()
  if (day === t) return "Aujourd'hui"
  if (day === addDays(t, 1)) return 'Demain'
  return capitalize(formatDayLong(day))
}
/** « Chaque lundi et mercredi » */
export function weekdaysPhrase(days: number[]) {
  const names = [...days].sort().map((d) => WEEKDAYS_LONG[d])
  if (names.length === 7) return 'Tous les jours'
  if (names.length === 1) return `Chaque ${names[0]}`
  return `Chaque ${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

// ── Côté utilisatrice ──
export function useClasses(from: string, to: string) {
  return useQuery({
    queryKey: ['classes', from, to],
    queryFn: () => api.get<{ sessions: ClassSession[] }>(`/api/classes?from=${from}&to=${to}`).then((d) => d.sessions),
    staleTime: 20_000,
  })
}

export function useMyClasses() {
  return useQuery({
    queryKey: ['classes', 'mine'],
    queryFn: () => api.get<{ sessions: ClassSession[] }>('/api/classes/mine').then((d) => d.sessions),
  })
}

export function useBooking() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['classes'] })
  return {
    book: useMutation({ mutationFn: (id: string) => api.post(`/api/classes/${id}/book`), onSettled: refresh }),
    cancel: useMutation({ mutationFn: (id: string) => api.delete(`/api/classes/${id}/book`), onSettled: refresh }),
  }
}

// ── Côté administration ──
export function useAdminDay(date: string) {
  return useQuery({
    queryKey: ['admin', 'classes', date],
    queryFn: () => api.get<{ date: string; busyDays: string[]; sessions: AdminClassSession[] }>(`/api/admin/classes?date=${date}`),
    placeholderData: (prev) => prev,
  })
}

export function useAdminClassMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
    qc.invalidateQueries({ queryKey: ['classes'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: Record<string, unknown>) => api.post<{ id: string; count: number }>('/api/admin/classes', body),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => api.patch(`/api/admin/classes/${id}`, body),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/api/admin/classes/${id}`), onSuccess: refresh }),
    stopSeries: useMutation({ mutationFn: (id: string) => api.post(`/api/admin/class-series/${id}/stop`), onSuccess: refresh }),
    removeAttendee: useMutation({
      mutationFn: ({ sessionId, userId }: { sessionId: string; userId: string }) =>
        api.delete(`/api/admin/classes/${sessionId}/bookings/${userId}`),
      onSuccess: refresh,
    }),
  }
}
