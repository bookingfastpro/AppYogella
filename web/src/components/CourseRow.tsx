import type { Course } from '../lib/api'
import { IconLock, IconChevronRight, IconPlay, IconPlayCircle, IconList, IconCheck } from './icons'
import { useGatedOpen } from '../lib/useGatedOpen'

/**
 * Ligne de séance en carte : miniature avec durée, titre sur deux lignes,
 * repères (univers, type, premium) et un bouton rond qui annonce l'action —
 * lire, débloquer ou ouvrir l'article. En mode étape (programme), la
 * miniature porte le numéro et le bouton devient une coche une fois terminée.
 */
export function CourseRow({
  course,
  showUniverse = true,
  step,
  done = false,
}: {
  course: Course
  showUniverse?: boolean
  /** Numéro de la séance dans un programme. */
  step?: number
  /** Séance déjà terminée (programmes). */
  done?: boolean
}) {
  const open = useGatedOpen()
  const isArticle = course.kind === 'ARTICLE'
  // Le serveur préfixe les séances de programme par « 1. » : le numéro est affiché à part.
  const title = step !== undefined ? course.title.replace(/^\d+\.\s*/, '') : course.title
  const kind = isArticle ? 'Lecture' : 'Vidéo'

  const state = course.locked ? 'locked' : done ? 'done' : isArticle ? 'read' : 'play'
  const action = { locked: 'réservé aux abonnées', done: 'terminée', read: 'lire', play: 'lancer' }[state]

  return (
    <button
      type="button"
      className={`srow${done ? ' is-done' : ''}${course.locked ? ' is-locked' : ''}`}
      onClick={() => open(course)}
      aria-label={`${step !== undefined ? `Séance ${step} : ` : ''}${title}, ${course.durationMin} minutes, ${action}`}
    >
      <span className={`srow-thumb${course.thumbnailUrl ? '' : isArticle ? ' placeholder article' : ' placeholder'}`} aria-hidden="true">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" loading="lazy" />
        ) : isArticle ? (
          <IconList size={22} />
        ) : (
          <IconPlayCircle size={24} />
        )}
        {step !== undefined && <span className="srow-step">{step}</span>}
        <span className="srow-dur">{course.durationMin} min</span>
      </span>

      <span className="srow-body" aria-hidden="true">
        <span className="srow-title">{title}</span>
        <span className="srow-meta">
          {course.locked && <span className="srow-tag premium">Premium</span>}
          {isArticle && <span className="srow-tag article">Article</span>}
          <span className="srow-meta-text">{showUniverse ? `${course.universe} · ${kind}` : kind}</span>
        </span>
      </span>

      <span className={`srow-cta ${state}`} aria-hidden="true">
        {state === 'locked' ? (
          <IconLock size={15} />
        ) : state === 'done' ? (
          <IconCheck size={16} strokeWidth={3} />
        ) : state === 'read' ? (
          <IconChevronRight size={17} />
        ) : (
          <IconPlay size={15} />
        )}
      </span>
    </button>
  )
}
