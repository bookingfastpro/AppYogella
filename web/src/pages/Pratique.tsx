import { useNavigate } from 'react-router-dom'
import { usePractice } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { EmptyState, PageHeader, SectionTitle } from '../components/ui'
import { IconLayers, IconLock, IconChevronRight, IconCheck, IconPlay, IconPulse } from '../components/icons'
import { Loader } from '../components/Loader'
import { CountUp } from '../components/CountUp'

const R = 34
const CIRC = 2 * Math.PI * R

const formatHours = (h: number) => `${h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`

/** Message d'encouragement selon l'avancement de l'objectif. */
function encouragement(fraction: number, sessions: number) {
  if (sessions === 0) return 'Une première séance pour lancer ta semaine ?'
  if (fraction >= 1) return 'Objectif atteint, bravo !'
  if (fraction >= 0.5) return 'Plus de la moitié du chemin, continue !'
  return 'Beau début, chaque séance compte.'
}

export default function Pratique() {
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data, isPending } = usePractice(true)

  if (isPending) return <Loader />

  const weekly = data?.weekly ?? { sessionCount: 0, totalMinutes: 0, goalHours: 5, progressHours: 0 }
  const fraction = Math.min(1, weekly.progressHours / (weekly.goalHours || 1))
  const week = data?.week ?? []
  const todayIndex = (new Date().getDay() + 6) % 7 // lundi = 0
  const activeDays = week.filter((d) => d.active).length
  const routines = data?.routines ?? []
  const resume = data?.resume

  return (
    <div className="screen">
      <PageHeader title="Ma pratique" subtitle="Ton activité des 7 derniers jours." />

      <section className="practice-card" aria-label="Objectif de la semaine">
        <div className="practice-ring">
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r={R} fill="none" stroke="var(--color-neutral-300)" strokeWidth="9" />
            <circle
              cx="44" cy="44" r={R} fill="none" stroke="var(--color-accent-2-600)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - fraction)} transform="rotate(-90 44 44)"
              className="practice-ring-arc"
            />
          </svg>
          <span className="practice-ring-value">
            <CountUp value={Math.round(fraction * 100)} duration={1100} delay={150} />%
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="practice-eyebrow">Objectif de la semaine</div>
          <div className="practice-goal">
            {formatHours(weekly.progressHours)} <span>sur {formatHours(weekly.goalHours)}</span>
          </div>
          <div className="practice-encourage">{encouragement(fraction, weekly.sessionCount)}</div>
        </div>
      </section>

      <div className="practice-stats">
        <div className="practice-stat">
          <span className="value"><CountUp value={weekly.sessionCount} delay={200} /></span>
          <span className="label">séance{weekly.sessionCount > 1 ? 's' : ''}</span>
        </div>
        <div className="practice-stat">
          <span className="value"><CountUp value={weekly.totalMinutes} delay={260} /></span>
          <span className="label">minutes</span>
        </div>
        <div className="practice-stat">
          <span className="value"><CountUp value={activeDays} delay={320} /></span>
          <span className="label">jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''}</span>
        </div>
      </div>

      <section>
        <SectionTitle title="Cette semaine" />
        <ol className="week-strip">
          {week.map((d, i) => (
            <li key={i} className={`${d.active ? 'on' : ''}${i === todayIndex ? ' today' : ''}`}>
              <span className="day">{d.label}</span>
              <span className="dot" aria-label={d.active ? 'pratiqué' : 'pas de séance'}>
                {d.active && <IconCheck size={13} strokeWidth={3.2} />}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {resume && (
        <section>
          <SectionTitle title="En cours" />
          <button type="button" className="resume-card" onClick={() => open(resume)}>
            <div className="thumb">{resume.thumbnailUrl && <img src={resume.thumbnailUrl} alt="" />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="resume-title">{resume.title}</div>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>{resume.universe} · {resume.meta}</div>
              <div className="resume-progress" aria-label={`Progression ${Math.round(resume.progressPct * 100)} %`}>
                <span style={{ width: `${Math.max(4, Math.round(resume.progressPct * 100))}%` }} />
              </div>
            </div>
            <span className="play" aria-hidden="true">
              <IconPlay size={17} />
            </span>
          </button>
        </section>
      )}

      <section>
        <SectionTitle title="Mes routines" />
        {routines.length === 0 ? (
          <EmptyState
            icon={<IconPulse size={22} />}
            title="Pas encore de routine"
            text="Les routines proposées par Yogella apparaîtront ici."
            action={
              <button type="button" className="btn ui-btn-soft" onClick={() => navigate('/explorer')}>
                Explorer les séances
              </button>
            }
          />
        ) : (
          <div className="ui-list">
            {routines.map((r) => (
              <button key={r.id} type="button" className="list-row" onClick={() => navigate(`/programme/${r.id}`)}>
                <div className="thumb routine-thumb">{r.locked ? <IconLock size={16} /> : <IconLayers size={20} />}</div>
                <div className="body">
                  <div className="title">{r.title}</div>
                  <div className="meta">{r.meta}</div>
                </div>
                <IconChevronRight size={17} className="chevron" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
