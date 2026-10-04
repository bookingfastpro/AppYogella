import { useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { IconChevronLeft, IconPlay } from '../components/icons'
import { CourseRow } from '../components/CourseRow'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

export default function Programme() {
  const { id } = useParams()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: program } = useProgram(id)

  if (!program) return <Loader />

  const nextSession = program.sessions.find((s) => !s.done) ?? program.sessions[0]

  return (
    // Colonne pleine hauteur : la carte blanche doit descendre jusqu'en bas,
    // sinon une bande de fond apparaît sous un programme court.
    <div className="app-sheet-page" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="hero-media" style={{ marginTop: -46, flex: 'none' }}>
        <img src={program.coverUrl ?? heroPhoto} alt="" style={{ objectPosition: '50% 45%' }} />
        <button type="button" className="icon-btn floating" aria-label="Retour" style={{ position: 'absolute', left: 18, top: 62 }} onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
      </div>
      <div className="sheet">
        <div>
          <div className="text-muted" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
            Programme
          </div>
          <h1 style={{ fontSize: 26, margin: '6px 0 8px' }}>{program.title}</h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>{program.description}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="tag" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-800)' }}>
            {program.sessions.length} séance{program.sessions.length > 1 ? 's' : ''}
          </span>
          <span className="tag" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-800)' }}>
            {program.sessions.reduce((n, s) => n + s.durationMin, 0)} min au total
          </span>
          {program.sessions.length > 0 && (
            <span className="tag" style={{ background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-800)' }}>
              {program.sessions.filter((s) => s.done).length}/{program.sessions.length} terminée{program.sessions.filter((s) => s.done).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {nextSession && (
          <button type="button" className="btn btn-sage btn-lg btn-block" onClick={() => open(nextSession)}>
            <IconPlay size={17} />
            {program.sessions.some((s) => s.done) ? `Reprendre la séance ${nextSession.order}` : 'Commencer le programme'}
          </button>
        )}
        <div>
          <h2 style={{ fontSize: 18, margin: '6px 0 8px' }}>Séances</h2>
          <div className="ui-list">
            {program.sessions.map((s) => (
              <CourseRow key={s.id} course={s} step={s.order} done={s.done} showUniverse={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
