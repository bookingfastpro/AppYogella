import { useState } from 'react'
import { EditSheet } from '../../components/AdminEdit'
import { AdminPageHeader, Badge, EmptyState, StatCard, StatGrid, Switch } from '../../components/AdminUI'
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClock, IconMapPin, IconPencil, IconPlus, IconRepeat, IconTrash, IconUser, IconUsers } from '../../components/icons'
import { Loader } from '../../components/Loader'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import {
  LEVELS,
  WEEKDAYS,
  addDays,
  capitalize,
  dayNumber,
  formatDayLong,
  parisToday,
  relativeDay,
  useAdminClassMutations,
  useAdminDay,
  weekdayOf,
  weekdaysPhrase,
  type AdminClassSession,
} from '../../lib/classes'

export default function AdminPlanning() {
  const today = parisToday()
  const [date, setDate] = useState(today)
  const [openId, setOpenId] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminClassSession | null>(null)
  const { data, isPending } = useAdminDay(date)
  const { removeAttendee } = useAdminClassMutations()
  const flash = useToast()

  const weekStart = addDays(date, -weekdayOf(date))
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const busy = new Set(data?.busyDays ?? [])
  const sessions = data?.date === date ? data.sessions : []
  const active = sessions.filter((s) => !s.cancelled)
  const seats = active.reduce((n, s) => n + s.capacity, 0)
  const bookedTotal = active.reduce((n, s) => n + s.booked, 0)

  async function kick(s: AdminClassSession, a: AdminClassSession['attendees'][number]) {
    if (!window.confirm(`Retirer ${a.name} du cours « ${s.title} » ?`)) return
    try {
      await removeAttendee.mutateAsync({ sessionId: s.id, userId: a.id })
      flash(`${a.name} a été retirée du cours`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Action impossible')
    }
  }

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Planning"
        description="Cours au studio : séances ponctuelles ou récurrentes, places et inscriptions."
        action={
          <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
            <IconPlus size={16} />
            Nouveau cours
          </button>
        }
      />

      <section className="plan-picker" aria-label="Choisir une date">
        <div className="plan-picker-top">
          <button type="button" className="icon-btn" aria-label="Jour précédent" onClick={() => setDate(addDays(date, -1))}>
            <IconChevronLeft size={16} />
          </button>
          <label className="plan-date">
            <IconCalendar size={17} />
            <span className="plan-date-label">{capitalize(formatDayLong(date))}</span>
            <input type="date" value={date} aria-label="Date du planning" onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <button type="button" className="icon-btn" aria-label="Jour suivant" onClick={() => setDate(addDays(date, 1))}>
            <IconChevronRight size={16} />
          </button>
          {date !== today && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>
              Aujourd'hui
            </button>
          )}
        </div>
        <div className="plan-week">
          {week.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === date}
              className={`plan-week-day${d === date ? ' active' : ''}${d === today ? ' today' : ''}`}
              onClick={() => setDate(d)}
            >
              <span className="name">{WEEKDAYS[weekdayOf(d)]}</span>
              <span className="num">{dayNumber(d)}</span>
              <span className={`dot${busy.has(d) ? ' on' : ''}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <StatGrid>
        <StatCard label="Cours" value={active.length} hint={relativeDay(date)} />
        <StatCard label="Inscriptions" value={bookedTotal} hint={`sur ${seats} places`} tone="sage" />
        <StatCard label="Remplissage" value={seats ? `${Math.round((bookedTotal / seats) * 100)} %` : '—'} tone="terracotta" />
      </StatGrid>

      {isPending && !data ? (
        <Loader />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={24} />}
          title="Aucun cours ce jour-là"
          text="Ajoutez un cours ponctuel ou une série qui se répète chaque semaine."
          action={
            <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={16} /> Nouveau cours
            </button>
          }
        />
      ) : (
        <ul className="adm-list" aria-label={`Cours du ${formatDayLong(date)}`}>
          {sessions.map((s) => {
            const open = openId === s.id
            const fill = Math.min(100, Math.round((s.booked / s.capacity) * 100))
            return (
              <li key={s.id} className={`plan-row${s.cancelled ? ' cancelled' : ''}${s.past ? ' past' : ''}${open ? ' open' : ''}`}>
                <div className="plan-row-main">
                  <div className="plan-row-time">
                    <span className="start">{s.startTime}</span>
                    <span className="end">{s.endTime}</span>
                  </div>
                  <div className="plan-row-body">
                    <div className="adm-row-title">
                      {s.title}
                      {s.cancelled ? (
                        <Badge tone="danger">Annulé</Badge>
                      ) : s.isRecurring ? (
                        <Badge tone="sage">
                          <IconRepeat size={11} /> Récurrent
                        </Badge>
                      ) : (
                        <Badge tone="sand">Ponctuel</Badge>
                      )}
                    </div>
                    <div className="plan-row-meta">
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
                      {s.level && <span>{s.level}</span>}
                    </div>
                    <div className={`plan-fill${fill >= 100 ? ' full' : ''}`}>
                      <span className="plan-fill-bar" aria-hidden="true">
                        <span style={{ width: `${fill}%` }} />
                      </span>
                      <span className="plan-fill-text">
                        {s.booked}/{s.capacity}
                        {fill >= 100 ? ' · complet' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="adm-row-actions">
                    <button
                      type="button"
                      className={`adm-text-btn${open ? ' on' : ''}`}
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? '' : s.id)}
                    >
                      <IconUsers size={14} /> {s.booked}
                    </button>
                    <button type="button" className="row-action" aria-label={`Modifier ${s.title}`} title="Modifier" onClick={() => setEditing(s)}>
                      <IconPencil size={17} />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="plan-attendees">
                    {s.attendees.length === 0 ? (
                      <p className="adm-help">Personne n'est encore inscrit à ce cours.</p>
                    ) : (
                      <ol>
                        {s.attendees.map((a) => (
                          <li key={a.id}>
                            <span className="adm-avatar small">{a.name.slice(0, 1).toUpperCase()}</span>
                            <span className="plan-attendee">
                              <strong>{a.name}</strong>
                              <span>{a.email}</span>
                            </span>
                            <button type="button" className="row-action danger" aria-label={`Retirer ${a.name}`} title="Retirer" onClick={() => kick(s, a)}>
                              <IconTrash size={15} />
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {creating && (
        <ClassCreateSheet
          defaultDate={date < today ? today : date}
          onClose={() => setCreating(false)}
          onCreated={(firstDay) => {
            setCreating(false)
            if (firstDay) setDate(firstDay)
          }}
        />
      )}
      {editing && <ClassEditSheet session={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Champs communs aux formulaires de création et d'édition. */
function ClassFields({
  v,
  set,
}: {
  v: { title: string; instructor: string; location: string; level: string; capacity: string; durationMin: string; description: string }
  set: (patch: Partial<typeof v>) => void
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="cl-title">Titre du cours</label>
        <input id="cl-title" className="input" placeholder="Hatha yoga doux" value={v.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="adm-field-row">
        <div className="field">
          <label htmlFor="cl-teacher">Professeur</label>
          <input id="cl-teacher" className="input" placeholder="Estelle" value={v.instructor} onChange={(e) => set({ instructor: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cl-level">Niveau</label>
          <select id="cl-level" className="input" value={v.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="cl-place">Lieu</label>
        <input id="cl-place" className="input" placeholder="Studio Yogella, salle 1" value={v.location} onChange={(e) => set({ location: e.target.value })} />
      </div>
      <div className="adm-field-row">
        <div className="field">
          <label htmlFor="cl-cap">Nombre de places</label>
          <input id="cl-cap" className="input" inputMode="numeric" value={v.capacity} onChange={(e) => set({ capacity: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cl-dur">Durée (min)</label>
          <input id="cl-dur" className="input" inputMode="numeric" value={v.durationMin} onChange={(e) => set({ durationMin: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cl-desc">Description</label>
        <textarea
          id="cl-desc"
          className="input notif-textarea"
          rows={3}
          placeholder="Ce que l'on travaille, ce qu'il faut apporter…"
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>
    </>
  )
}

function ClassCreateSheet({ defaultDate, onClose, onCreated }: { defaultDate: string; onClose: () => void; onCreated: (firstDay?: string) => void }) {
  const { create } = useAdminClassMutations()
  const flash = useToast()
  const [mode, setMode] = useState<'once' | 'recurring'>('once')
  const [v, setV] = useState({ title: '', instructor: '', location: '', level: LEVELS[0], capacity: '12', durationMin: '60', description: '' })
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('18:30')
  const [weekdays, setWeekdays] = useState<number[]>([weekdayOf(defaultDate)])
  const [startDate, setStartDate] = useState(defaultDate)
  const [endDate, setEndDate] = useState('')

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()))

  async function submit() {
    if (!v.title.trim()) return flash('Donnez un titre au cours')
    if (mode === 'recurring' && weekdays.length === 0) return flash('Choisissez au moins un jour')
    try {
      const res = await create.mutateAsync({
        mode,
        ...v,
        time,
        ...(mode === 'once' ? { date } : { weekdays, startDate, endDate: endDate || null }),
      })
      flash(mode === 'once' ? 'Cours ajouté au planning' : `Série créée : ${res.count} séance${res.count > 1 ? 's' : ''} planifiée${res.count > 1 ? 's' : ''}`)
      onCreated(mode === 'once' ? date : undefined)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Création impossible')
    }
  }

  return (
    <EditSheet title="Nouveau cours" description="Il sera aussitôt réservable dans l'application." onClose={onClose} onSave={submit} saving={create.isPending} submitLabel="Ajouter au planning">
      <div className="adm-segmented" role="radiogroup" aria-label="Type de cours">
        <button type="button" role="radio" aria-checked={mode === 'once'} className={mode === 'once' ? 'active' : ''} onClick={() => setMode('once')}>
          Une date
        </button>
        <button type="button" role="radio" aria-checked={mode === 'recurring'} className={mode === 'recurring' ? 'active' : ''} onClick={() => setMode('recurring')}>
          <IconRepeat size={13} /> Récurrent
        </button>
      </div>

      {mode === 'once' ? (
        <div className="adm-field-row">
          <div className="field">
            <label htmlFor="cl-date">Date</label>
            <input id="cl-date" type="date" className="input" min={parisToday()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cl-time">Heure</label>
            <input id="cl-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
      ) : (
        <>
          <fieldset className="field adm-fieldset">
            <legend>Jours de la semaine</legend>
            <div className="weekday-picker">
              {WEEKDAYS.map((d, i) => (
                <button key={d} type="button" aria-pressed={weekdays.includes(i)} className={weekdays.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>
                  {d}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="adm-field-row">
            <div className="field">
              <label htmlFor="cl-rtime">Heure</label>
              <input id="cl-rtime" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cl-start">À partir du</label>
              <input id="cl-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cl-end">Jusqu'au (facultatif)</label>
            <input id="cl-end" type="date" className="input" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {weekdays.length > 0 && (
            <p className="recur-summary">
              <IconRepeat size={14} /> {weekdaysPhrase(weekdays)} à {time}, à partir du {formatDayLong(startDate)}
              {endDate ? ` jusqu'au ${formatDayLong(endDate)}` : ', sans date de fin'}
            </p>
          )}
        </>
      )}

      <ClassFields v={v} set={(p) => setV((cur) => ({ ...cur, ...p }))} />
    </EditSheet>
  )
}

function ClassEditSheet({ session, onClose }: { session: AdminClassSession; onClose: () => void }) {
  const { update, remove, stopSeries } = useAdminClassMutations()
  const flash = useToast()
  const [v, setV] = useState({
    title: session.title,
    instructor: session.instructor ?? '',
    location: session.location ?? '',
    level: session.level ?? LEVELS[0],
    capacity: String(session.capacity),
    durationMin: String(session.durationMin),
    description: session.description ?? '',
  })
  const [date, setDate] = useState(session.day)
  const [time, setTime] = useState(session.startTime)
  const [cancelled, setCancelled] = useState(session.cancelled)

  async function save() {
    try {
      await update.mutateAsync({ id: session.id, ...v, date, time, cancelled })
      flash(cancelled && !session.cancelled ? 'Cours annulé' : 'Cours mis à jour')
      onClose()
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Enregistrement impossible')
    }
  }

  async function del() {
    const who = session.booked ? ` ${session.booked} inscription${session.booked > 1 ? 's' : ''} seront supprimées.` : ''
    if (!window.confirm(`Supprimer définitivement cette séance ?${who}`)) return
    try {
      await remove.mutateAsync(session.id)
      flash('Séance supprimée')
      onClose()
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Suppression impossible')
    }
  }

  async function stop() {
    if (!session.seriesId) return
    if (!window.confirm('Arrêter la série ? Plus aucune séance ne sera créée et les séances à venir seront annulées.')) return
    try {
      await stopSeries.mutateAsync(session.seriesId)
      flash('Série arrêtée')
      onClose()
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Action impossible')
    }
  }

  return (
    <EditSheet
      title="Modifier la séance"
      description={session.isRecurring && session.series ? `Fait partie de la série « ${weekdaysPhrase(session.series.weekdays)} ». Seule cette séance est modifiée.` : undefined}
      onClose={onClose}
      onSave={save}
      saving={update.isPending}
    >
      <div className="adm-field-row">
        <div className="field">
          <label htmlFor="ce-date">Date</label>
          <input id="ce-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ce-time">Heure</label>
          <input id="ce-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <ClassFields v={v} set={(p) => setV((cur) => ({ ...cur, ...p }))} />
      <Switch
        label="Cours annulé"
        description={session.booked ? `Les ${session.booked} inscrites verront le cours comme annulé.` : 'Le cours reste visible, marqué comme annulé.'}
        checked={cancelled}
        onChange={setCancelled}
      />
      <div className="plan-danger">
        {session.seriesId && session.series?.active && (
          <button type="button" className="btn btn-danger btn-sm" onClick={stop}>
            <IconRepeat size={14} /> Arrêter la série
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#9a3220' }} onClick={del}>
          <IconTrash size={14} /> Supprimer cette séance
        </button>
      </div>
      <p className="adm-help" style={{ margin: 0 }}>
        <IconClock size={12} /> Horaires à l'heure de Paris.
      </p>
    </EditSheet>
  )
}
