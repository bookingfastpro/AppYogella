import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCourses } from '../lib/hooks'
import { TAGGABLE_MOODS } from '../lib/moods'
import { CourseRow } from '../components/CourseRow'
import { IconChevronLeft, IconVideo } from '../components/icons'
import { Loader } from '../components/Loader'

/** Tous les cours associés à une humeur de l'accueil (Stressée, Fatiguée…). */
export default function Humeur() {
  const { key } = useParams()
  const navigate = useNavigate()
  const mood = TAGGABLE_MOODS.find((m) => m.key === key)
  const { data: courses, isPending } = useCourses({ mood: mood?.key })

  if (!mood) return <Navigate to="/home" replace />
  if (isPending) return <Loader />

  return (
    <div className="screen-tight">
      <div className="screen-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        <span className="icon-circle" style={{ width: 34, height: 34, borderRadius: 999, background: mood.bg, color: mood.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d={mood.path} />
          </svg>
        </span>
        <h1>{mood.label}</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div className="text-muted" style={{ fontSize: 13.5, margin: '0 0 8px' }}>
          {courses?.length ? `${courses.length} séance${courses.length > 1 ? 's' : ''} pour toi` : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(courses ?? []).map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
          {courses?.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13.5, padding: '12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconVideo size={16} /> Aucune séance pour le moment.
            </div>
          )}
        </div>
        <button className="btn btn-block" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/explorer')}>
          Explorer tous les univers
        </button>
      </div>
    </div>
  )
}
