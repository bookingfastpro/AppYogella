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
          <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>À la une</h2>
          <button
            type="button"
            className="featured-card"
            onClick={() => open(featured)}
            aria-label={`À la une : ${featured.title}, ${featured.meta}`}
          >
            <img src={featured.thumbnailUrl ?? heroPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(32,30,29,0) 35%,rgba(32,30,29,.72) 100%)' }} />
            <div style={{ position: 'absolute', left: 16, bottom: 14, color: '#fff', textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{featured.title}</div>
              <div style={{ fontSize: 13, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{featured.meta}</div>
            </div>
            <span
              style={{
                position: 'absolute', right: 14, bottom: 14, width: 40, height: 40, borderRadius: 999,
                background: '#fff', color: 'var(--color-accent-2-800)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {featured.locked ? <IconLock size={16} /> : <IconPlay size={16} />}
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
