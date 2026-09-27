const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const dateYearFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** « à l'instant », « il y a 5 minutes », « hier », puis la date au-delà d'une semaine. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso)
  const seconds = Math.round((then.getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return "à l'instant"
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return then.getFullYear() === new Date(now).getFullYear() ? dateFmt.format(then) : dateYearFmt.format(then)
}
