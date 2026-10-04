import { useNavigate } from 'react-router-dom'
import type { ProgramSummary } from '../lib/api'
import { IconChevronRight, IconLayers, IconLock } from './icons'

/**
 * Carte de programme mise en avant par son image : couverture plein cadre,
 * titre et repères posés sur un dégradé, badge d'accès en haut.
 */
export function ProgramCard({ program }: { program: ProgramSummary }) {
  const navigate = useNavigate()
  const sessions = `${program.sessionCount} séance${program.sessionCount > 1 ? 's' : ''}`
  const kind = program.isRoutine ? 'Routine' : 'Programme'

  return (
    <button
      type="button"
      className="pcard"
      onClick={() => navigate(`/programme/${program.id}`)}
      aria-label={`${kind} ${program.title}, ${sessions}, ${program.totalDurationMin} minutes${program.locked ? ', réservé aux abonnées' : ''}`}
    >
      {program.coverUrl ? (
        <img className="pcard-img" src={program.coverUrl} alt="" loading="lazy" />
      ) : (
        <span className="pcard-fallback" aria-hidden="true">
          <IconLayers size={34} />
        </span>
      )}
      <span className="pcard-shade" aria-hidden="true" />
      <span className={`pcard-badge${program.locked ? ' locked' : ''}`} aria-hidden="true">
        {program.locked ? (
          <>
            <IconLock size={11} /> Premium
          </>
        ) : (
          kind
        )}
      </span>
      <span className="pcard-body" aria-hidden="true">
        <span className="pcard-title">{program.title}</span>
        <span className="pcard-meta">
          <span className="pcard-chip">{sessions}</span>
          {program.totalDurationMin > 0 && <span className="pcard-chip">{program.totalDurationMin} min</span>}
        </span>
      </span>
      <span className="pcard-go" aria-hidden="true">
        <IconChevronRight size={16} />
      </span>
    </button>
  )
}
