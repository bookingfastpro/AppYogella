import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { usePrograms, usePractice } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { MOODS } from '../lib/moods'
import { IconBell, IconPlay, IconChevronRight, IconVideo, IconLock } from '../components/icons'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: programs, isPending: programsPending } = usePrograms(false)
  const { data: practice } = usePractice(!!user)

  const hasAccess = user?.hasAccess ?? false
  const resume = practice?.resume

  if (programsPending) return <Loader />

  return (
    <div className="screen home-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="brand">Yogella</div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: 'var(--color-neutral-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconBell size={19} />
        </div>
      </div>

      <div>
        <h1 style={{ fontSize: 27, margin: '0 0 4px' }}>Bonjour {user?.name.split(' ')[0] ?? ''}</h1>
        <div className="text-muted" style={{ fontSize: 14 }}>Comment te sens-tu aujourd'hui ?</div>
      </div>

      <div className="mood-grid">
        {MOODS.map((m) => (
          <button
            key={m.label}
            className="mood-btn"
            style={m.span ? { gridColumn: `span ${m.span}` } : undefined}
            onClick={() => navigate(m.label === 'Mal au dos' ? '/recherche' : '/explorer')}
          >
            <span className="icon-circle" style={{ background: m.bg, color: m.fg }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={m.path} />
              </svg>
            </span>
            <span className="label">{m.label}</span>
          </button>
        ))}
      </div>

      {user && resume && (
        <div>
          <h2 style={{ fontSize: 18, margin: '0 0 10px' }}>Reprends là où tu t'étais arrêtée</h2>
          <button className="resume-card" onClick={() => open(resume)}>
            <div className="thumb">
              <img src={heroPhoto} alt="" style={{ objectPosition: '60% 55%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{resume.title}</div>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>{resume.meta}</div>
            </div>
            <span className="play">
              <IconPlay size={17} />
            </span>
          </button>
        </div>
      )}

      <div>
        <div className="section-title-row">
          <h2>Nos programmes</h2>
          <Link to="/explorer" style={{ border: 0, background: 'none', fontSize: 13, textDecoration: 'none' }}>
            Voir tout
          </Link>
        </div>
        <div className="hscroll">
          {(programs ?? []).slice(0, 3).map((p) => (
            <button key={p.id} className="prog-card" onClick={() => navigate(`/programme/${p.id}`)}>
              <div className="cover">
                {p.coverUrl ? <img src={p.coverUrl} alt="" /> : <IconVideo size={26} />}
                {p.locked && (
                  <span className="lock-chip">
                    <IconLock size={14} />
                  </span>
                )}
              </div>
              <div className="info">
                <div className="title">{p.title}</div>
                <div className="meta">{p.meta}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {!hasAccess && (
        <Link to="/abonnement" className="promo-card">
          <span className="icon-circle">
            <IconLock size={18} strokeWidth={2.6} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-800)' }}>Débloque tous les cours</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-accent-800)', opacity: 0.85 }}>12 € / mois ou 99 € / an</div>
          </div>
          <IconChevronRight size={18} strokeWidth={2.6} style={{ color: 'var(--color-accent-800)' }} />
        </Link>
      )}
    </div>
  )
}
