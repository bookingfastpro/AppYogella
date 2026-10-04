import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { usePlans, usePrograms, usePractice } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { MOODS } from '../lib/moods'
import { IconPlay, IconChevronRight, IconLock } from '../components/icons'
import { ProgramCard } from '../components/ProgramCard'
import { NotificationBell } from '../components/NotificationBell'
import { SectionTitle } from '../components/ui'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

/** « Bonjour » le jour, « Bonsoir » à partir de 18 h. */
function greeting() {
  return new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour'
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: programs, isPending: programsPending } = usePrograms(false)
  const { data: practice } = usePractice(!!user)
  const hasAccess = user?.hasAccess ?? false
  const { data: plans } = usePlans()

  const resume = practice?.resume
  const firstName = user?.name.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const prices = (plans?.plans ?? []).map((p) => `${p.price} / ${p.key === 'ANNUAL' ? 'an' : 'mois'}`).join(' ou ')

  if (programsPending) return <Loader />

  return (
    <div className="screen home-screen">
      <div className="home-top">
        <div className="brand">Yogella</div>
        <NotificationBell />
      </div>

      <div>
        <div className="home-date">{today}</div>
        <h1 className="home-hello">
          {greeting()} {firstName}{' '}
          <span className="home-wave" role="img" aria-label="coucou">
            👋
          </span>
        </h1>
        <p className="home-question">Comment te sens-tu aujourd'hui ?</p>
      </div>

      <div className="mood-grid">
        {MOODS.map((m) => (
          <button
            key={m.label}
            type="button"
            className="mood-btn"
            style={m.span ? { gridColumn: `span ${m.span}` } : undefined}
            onClick={() => navigate(m.key ? `/humeur/${m.key}` : '/explorer')}
          >
            <span className="icon-circle" style={{ background: m.bg, color: m.fg }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={m.path} />
              </svg>
            </span>
            <span className="label">{m.label}</span>
          </button>
        ))}
      </div>

      {user && resume && (
        <section>
          <SectionTitle title="Reprends là où tu t'étais arrêtée" />
          <button type="button" className="resume-card" onClick={() => open(resume)}>
            <div className="thumb">
              <img src={resume.thumbnailUrl ?? heroPhoto} alt="" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="resume-title">{resume.title}</div>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
                {resume.universe} · {resume.meta}
              </div>
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
        <SectionTitle
          title="Nos programmes"
          aside={
            <Link to="/explorer" className="ui-link">
              Tout explorer
            </Link>
          }
        />
        <div className="card-rail">
          {(programs ?? []).map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      </section>

      {!hasAccess && (
        <Link to="/abonnement" className="promo-card">
          <span className="icon-circle">
            <IconLock size={18} strokeWidth={2.6} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="promo-title">Débloque tous les cours</div>
            {prices && <div className="promo-sub">{prices}</div>}
          </div>
          <IconChevronRight size={18} strokeWidth={2.6} />
        </Link>
      )}
    </div>
  )
}
