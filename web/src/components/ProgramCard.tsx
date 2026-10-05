import { useNavigate } from 'react-router-dom'
import type { ProgramSummary } from '../lib/api'
import { IconArrowRight, IconLayers, IconLock } from './icons'

/**
 * Carte de programme mise en avant par son image.
 * - « overlay » (accueil) : couverture plein cadre, titre et repères posés sur un dégradé ;
 * - « stacked » (Explorer) : image en haut avec son badge, titre et repères sur fond clair.
 * La flèche ronde annonce l'ouverture du programme.
 */
export function ProgramCard({ program, variant = 'overlay' }: { program: ProgramSummary; variant?: 'overlay' | 'stacked' }) {
  const navigate = useNavigate()
  const sessions = `${program.sessionCount} séance${program.sessionCount > 1 ? 's' : ''}`
  const kind = program.isRoutine ? 'Routine' : 'Programme'
  const meta = [sessions, program.totalDurationMin > 0 && `${program.totalDurationMin} min`].filter(Boolean).join(' · ')

  const cover = program.coverUrl ? (
    <img className="pcard-img" src={program.coverUrl} alt="" loading="lazy" />
  ) : (
    <span className="pcard-fallback" aria-hidden="true">
      <IconLayers size={34} />
    </span>
  )
  const lock = program.locked && (
    <span className="pcard-badge locked" aria-hidden="true">
      <IconLock size={11} /> Premium
    </span>
  )

  return (
    <button
      type="button"
      className={`pcard pcard-${variant}`}
      onClick={() => navigate(`/programme/${program.id}`)}
      aria-label={`${kind} ${program.title}, ${sessions}, ${program.totalDurationMin} minutes${program.locked ? ', réservé aux abonnées' : ''}`}
    >
      {variant === 'stacked' ? (
        <>
          <span className="pcard-media" aria-hidden="true">
            {cover}
            {lock || <span className="pcard-badge">{kind}</span>}
          </span>
          <span className="pcard-info" aria-hidden="true">
            <span className="pcard-text">
              <span className="pcard-title">{program.title}</span>
              <span className="pcard-meta">{meta}</span>
            </span>
            <span className="pcard-go">
              <IconArrowRight size={16} />
            </span>
          </span>
        </>
      ) : (
        <>
          {cover}
          <span className="pcard-shade" aria-hidden="true" />
          {lock}
          <span className="pcard-body" aria-hidden="true">
            <span className="pcard-title">{program.title}</span>
            <span className="pcard-meta">{meta}</span>
          </span>
          <span className="pcard-go" aria-hidden="true">
            <IconArrowRight size={16} />
          </span>
        </>
      )}
    </button>
  )
}
