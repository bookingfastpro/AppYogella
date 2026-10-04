const BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Erreur (${res.status})`)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export interface Subscription {
  plan: 'MONTHLY' | 'ANNUAL' | null
  status: 'NONE' | 'TRIALING' | 'ACTIVE' | 'CANCELED'
  currentPeriodEnd: string | null
  trialEnd: string | null
}

export interface Me {
  id: string
  name: string
  email: string
  initial: string
  isAdmin: boolean
  createdAt: string
  hasAccess: boolean
  subscription: Subscription
}

export interface Course {
  id: string
  title: string
  kind: 'COURSE' | 'ARTICLE'
  universe: string
  category: string | null
  moods: string[]
  durationMin: number
  meta: string
  premium: boolean
  locked: boolean
  thumbnailUrl: string | null
  authorName: string | null
  authorRole: string | null
  videoUrl?: string | null
  youtubeId?: string | null
  youtubeEmbedUrl?: string | null
  body?: string | null
}

export interface Universe {
  id: string
  slug: string
  label: string
  bg: string
  fg: string
  dest: 'categorie' | 'article' | 'programme'
  order: number
}

export interface ProgramSummary {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  isRoutine: boolean
  sessionCount: number
  totalDurationMin: number
  meta: string
  locked: boolean
}

export interface ProgramSession extends Course {
  order: number
  done: boolean
}

export interface ProgramDetail {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  isRoutine: boolean
  sessions: ProgramSession[]
}

export interface Expert {
  id: string
  name: string
  role: string
  initial: string
}
