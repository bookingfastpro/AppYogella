import { useMemo, useState } from 'react'
import { EditSheet } from '../components/AdminEdit'
import { EmptyState, PageHeader, SectionTitle } from '../components/ui'
import { IconCalendar, IconCheck, IconClock, IconMapPin, IconUser } from '../components/icons'
import { Loader } from '../components/Loader'
import { useToast } from '../lib/ToastContext'
import { ApiError } from '../lib/api'
import {
  addDays,
  capitalize,
  dayNumber,
  formatDayLong,
  formatDayShort,
  parisToday,
  relativeDay,
  useBooking,
  useClasses,
  useMyClasses,
  weekdayOf,
  WEEKDAYS,
  type ClassSession,
} from '../lib/classes'

const DAYS_AHEAD = 14

/** Places restantes en mots, et ton de la jauge. */
function availability(s: ClassSession) {
  if (s.cancelled) return { label: 'Cours annulé', tone: 'off' }
  if (s.remaining === 0) return { label: 'Complet', tone: 'full' }
  if (s.remaining <= 3) return { label: `Plus que ${s.remaining} place${s.remaining > 1 ? 's' : ''}`, tone: 'low' }
  return { label: `${s.remaining} places disponibles`, tone: 'ok' }
}

export default function Reserver() {
  const today = parisToday()
  const lastDay = addDays(today, DAYS_AHEAD - 1)
  const [day, setDay] = useState(today)
  const [confirming, setConfirming] = useState<ClassSession | null>(null)
  const { data: sessions, isPending } = useClasses(today, lastDay)
  const { data: mine } = useMyClasses()
  const { book, cancel } = useBooking()
  const flash = useToast()

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today])
  const byDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>()
    for (const s of sessions ?? []) map.set(s.day, [...(map.get(s.day) ?? []), s])
    return map
  }, [sessions])
  const list = byDay.get(day) ?? []
  const nextDayWithClasses = days.find((d) => d > day && (byDay.get(d) ?? []).some((s) => !s.cancelled && !s.past))

  async function confirmBooking() {
    if (!confirming) return
    try {
      await book.mutateAsync(confirming.id)
      flash(`C'est réservé ! ${relativeDay(confirming.day)} à ${confirming.startTime}`)
      setConfirming(null)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Réservation impossible')
    }
  }

  async function cancelBooking(s: ClassSession) {
    if (!window.confirm(`Annuler ta réservation pour « ${s.title} » (${relativeDay(s.day)} à ${s.startTime}) ?`)) return
    try {
      await cancel.mutateAsync(s.id)
      flash('Réservation annulée')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Annulation impossible')
    }
  }

  if (isPending) return <Loader />

  return (
    <div className="screen">
      <PageHeader title="Cours au studio" subtitle="Réserve ta place pour un cours en présentiel." />

      <section>
        <div className="day-strip" role="tablist" aria-label="Choisir un jour">
          {days.map((d) => {
            const has = (byDay.get(d) ?? []).some((s) => !s.cancelled)
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === day}
                aria-label={`${formatDayLong(d)}${has ? ', cours disponibles' : ', aucun cours'}`}
                className={`day-chip${d === day ? ' active' : ''}${d === today ? ' today' : ''}`}
                onClick={() => setDay(d)}
              >
                <span className="day-chip-name">{WEEKDAYS[weekdayOf(d)]}</span>
                <span className="day-chip-num">{dayNumber(d)}</span>
                <span className={`day-chip-dot${has ? ' on' : ''}`} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>

      <section aria-live="polite">
        <SectionTitle title={day === today || day === addDays(today, 1) ? `${relativeDay(day)} · ${formatDayShort(day)}` : relativeDay(day)} />
        {list.length === 0 ? (
          <EmptyState
            icon={<IconCalendar size={22} />}
            title="Aucun cours ce jour-là"
            text="Les cours au studio apparaîtront ici dès qu'ils sont planifiés."
            action={
              nextDayWithClasses && (
                <button type="button" className="btn btn-secondary" onClick={() => setDay(nextDayWithClasses)}>
                  Voir le prochain cours · {formatDayShort(nextDayWithClasses)}
                </button>
              )
            }
          />
        ) : (
          <div className="ui-list">
            {list.map((s) => {
              const a = availability(s)
              const fill = s.capacity ? Math.min(100, Math.round((s.booked / s.capacity) * 100)) : 0
              return (
                <article key={s.id} className={`class-card${s.cancelled ? ' is-cancelled' : ''}${s.myBooking ? ' is-mine' : ''}${s.past ? ' is-past' : ''}`}>
                  <div className="class-time">
                    <span className="class-start">{s.startTime}</span>
                    <span className="class-end">{s.endTime}</span>
                  </div>
                  <div className="class-body">
                    <div className="class-title">
                      {s.title}
                      {s.myBooking && (
                        <span className="class-badge mine">
                          <IconCheck size={11} strokeWidth={3.2} /> Réservé
                        </span>
                      )}
                    </div>
                    <div className="class-meta">
                      {s.instructor && (
                        <span>
                          <IconUser size={13} /> {s.instructor}
                        </span>
                      )}
                      {s.location && (
                        <span>
                          <IconMapPin size={13} /> {s.location}
                        </span>
                      )}
                      <span>
                        <IconClock size={13} /> {s.durationMin} min
                      </span>
                      {s.level && <span className="class-level">{s.level}</span>}
                    </div>
                    <div className={`class-capacity ${a.tone}`}>
                      <span className="class-capacity-bar" aria-hidden="true">
                        <span style={{ width: `${fill}%` }} />
                      </span>
                      <span>{a.label}</span>
                    </div>
                  </div>
                  <div className="class-action">
                    {s.past ? (
                      <span className="class-badge off">Terminé</span>
                    ) : s.cancelled ? null : s.myBooking ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => cancelBooking(s)}>
                        Annuler
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={s.remaining === 0}
                        onClick={() => setConfirming(s)}
                      >
                        {s.remaining === 0 ? 'Complet' : 'Réserver'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {mine && mine.length > 0 && (
        <section>
          <SectionTitle title="Mes réservations" aside={<span className="ui-count">{mine.length}</span>} />
          <div className="booking-rail">
            {mine.map((s) => (
              <article key={s.id} className={`booking-card${s.cancelled ? ' cancelled' : ''}`}>
                <div className="booking-when">
                  <span className="booking-day">{relativeDay(s.day)}</span>
                  <span className="booking-time">{s.startTime}</span>
                </div>
                <div className="booking-title">{s.title}</div>
                {s.location && (
                  <div className="booking-meta">
                    <IconMapPin size={13} /> {s.location}
                  </div>
                )}
                {s.cancelled ? (
                  <span className="class-badge off">Annulé par le studio</span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm booking-cancel" onClick={() => cancelBooking(s)}>
                    Annuler
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {confirming && (
        <EditSheet
          title="Réserver ce cours"
          description="Ta place est garantie dès la confirmation."
          onClose={() => setConfirming(null)}
          onSave={confirmBooking}
          saving={book.isPending}
          submitLabel="Confirmer ma réservation"
        >
          <div className="confirm-class">
            <div className="confirm-class-title">{confirming.title}</div>
            <ul className="confirm-class-facts">
              <li>
                <IconCalendar size={16} /> {capitalize(formatDayLong(confirming.day))}
              </li>
              <li>
                <IconClock size={16} /> {confirming.startTime} – {confirming.endTime} ({confirming.durationMin} min)
              </li>
              {confirming.location && (
                <li>
                  <IconMapPin size={16} /> {confirming.location}
                </li>
              )}
              {confirming.instructor && (
                <li>
                  <IconUser size={16} /> avec {confirming.instructor}
                  {confirming.level ? ` · ${confirming.level}` : ''}
                </li>
              )}
            </ul>
            {confirming.description && <p className="confirm-class-desc">{confirming.description}</p>}
            <div className={`class-capacity ${availability(confirming).tone}`}>{availability(confirming).label}</div>
          </div>
        </EditSheet>
      )}
    </div>
  )
}
