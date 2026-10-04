import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCourses, useUniverses } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { CourseRow } from '../components/CourseRow'
import { IconChevronLeft, IconVideo, IconLock, IconPlay } from '../components/icons'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

export default function Categorie() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: universes, isPending: universesPending } = useUniverses()
  const universe = universes?.find((u) => u.slug === slug)
  const { data: courses, isPending: coursesPending } = useCourses({ universe: universe?.label })
  const [filter, setFilter] = useState('Tous')

  const categories = useMemo(() => {
    const set = new Set((courses ?? []).map((c) => c.category).filter(Boolean) as string[])
    return ['Tous', ...set]
  }, [courses])

  const featured = courses?.[0]
  const rest = (courses ?? []).slice(1).filter((c) => filter === 'Tous' || c.category === filter)

  if (universesPending || coursesPending) return <Loader />

  return (
    <div className="screen-tight">
      <div className="screen-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        <h1>{universe?.label ?? '…'}</h1>
      </div>

      {categories.length > 1 && (
        <div className="pill-row" style={{ padding: '0 20px' }}>
          {categories.map((c) => (
            <button key={c} className={`pill${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {featured && (
        <div style={{ padding: '0 20px' }}>
          <button
            type="button"
            className="featured-card"
            onClick={() => open(featured)}
            aria-label={`À la une : ${featured.title}, ${featured.meta}`}
          >
            <img className="pcard-img" src={featured.thumbnailUrl ?? heroPhoto} alt="" />
            <span className="pcard-shade" aria-hidden="true" />
            <span className={`pcard-badge${featured.locked ? ' locked' : ''}`} aria-hidden="true">
              {featured.locked ? (
                <>
                  <IconLock size={11} /> Premium
                </>
              ) : (
                'À la une'
              )}
            </span>
            <span className="featured-body" aria-hidden="true">
              <span className="pcard-title">{featured.title}</span>
              <span className="pcard-meta">
                <span className="pcard-chip">{featured.meta}</span>
                {featured.authorName && <span className="pcard-chip">{featured.authorName}</span>}
              </span>
            </span>
            <span className="featured-play" aria-hidden="true">
              {featured.locked ? <IconLock size={18} /> : <IconPlay size={18} />}
            </span>
          </button>
        </div>
      )}

      <div style={{ padding: '0 20px' }}>
        <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Nouveautés</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rest.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
          {rest.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13.5, padding: '12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconVideo size={16} /> Aucun autre cours pour le moment.
            </div>
          )}
        </div>
        <button className="btn btn-block" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/recherche')}>
          Voir tout
        </button>
      </div>
    </div>
  )
}
