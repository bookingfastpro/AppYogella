/**
 * Humeurs de l'accueil. Chacune a sa pastille (bg) et la couleur de son icône
 * (fg). `key` est ce que l'admin associe aux cours (mêmes clés que
 * server/src/lib/moods.ts) ; « Autre besoin » n'en a pas et mène à Explorer.
 */
export interface Mood {
  key?: string
  label: string
  path: string
  bg: string
  fg: string
  span?: number
}

export const MOODS: Mood[] = [
  { key: 'stressee', label: 'Stressée', path: 'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2', bg: '#f4e9db', fg: '#523d2d' },
  { key: 'fatiguee', label: 'Fatiguée', path: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9', bg: '#fae3d4', fg: '#5e402f' },
  { key: 'manque-energie', label: "Manque d'énergie", path: 'M13 2 3 14h9l-1 8 10-12h-9z', bg: '#fce5bf', fg: '#c67c00' },
  { key: 'mal-au-dos', label: 'Mal au dos', path: 'M22 12h-4l-3 9L9 3l-3 9H2', bg: '#fedbdb', fg: '#ce505a' },
  { key: 'envie-de-bouger', label: 'Envie de bouger', path: 'M12 3v18M3 12h18m4-5L7 7m10 10L7 17', bg: '#d5f2cf', fg: '#3b8b41' },
  { key: 'besoin-de-ralentir', label: 'Besoin de ralentir', path: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10ZM2 21c0-3 1.9-5.4 5.1-6', bg: '#e8dffc', fg: '#7f5bb6' },
  { key: 'mediter', label: 'Je veux méditer', path: 'M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0', bg: '#d0ecff', fg: '#357bbd' },
  { label: 'Autre besoin', path: 'M12 5v14M5 12h14', bg: 'transparent', fg: '#131714', span: 2 },
]

/** Humeurs qu'on peut associer à un cours (toutes sauf « Autre besoin »). */
export const TAGGABLE_MOODS = MOODS.filter((m): m is Mood & { key: string } => !!m.key)
