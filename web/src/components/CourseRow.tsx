import type { Course } from '../lib/api'
import { IconLock, IconChevronRight, IconPlay, IconPlayCircle, IconList } from './icons'
import { useGatedOpen } from '../lib/useGatedOpen'

export function CourseRow({ course, showChevron = false, showUniverse = true }: { course: Course; showChevron?: boolean; showUniverse?: boolean }) {
  const open = useGatedOpen()
  const isArticle = course.kind === 'ARTICLE'

  return (
    <button
      type="button"
      className="list-row"
      onClick={() => open(course)}
      aria-label={`${course.title}, ${course.meta}${course.locked ? ', réservé aux abonnées' : ''}`}
    >
      <div className={`thumb${course.thumbnailUrl ? '' : isArticle ? ' placeholder article' : ' placeholder'}`}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" loading="lazy" />
        ) : isArticle ? (
          <IconList size={20} />
        ) : (
          <IconPlayCircle size={22} />
        )}
        {course.locked ? (
          <span className="lock-chip" aria-hidden="true">
            <IconLock size={12} />
          </span>
        ) : (
          course.thumbnailUrl &&
          !isArticle && (
            <span className="play-chip" aria-hidden="true">
              <IconPlay size={11} />
            </span>
          )
        )}
      </div>
      <div className="body">
        <div className="title">{course.title}</div>
        <div className="meta">
          {isArticle && <span className="kind-tag">Article</span>}
          {showUniverse ? `${course.universe} · ${course.meta}` : course.meta}
        </div>
      </div>
      {showChevron && <IconChevronRight size={17} className="chevron" />}
    </button>
  )
}
