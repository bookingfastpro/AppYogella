import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../lib/hooks'
import { CourseRow } from '../components/CourseRow'
import { EmptyState, PageHeader } from '../components/ui'
import { IconHeart } from '../components/icons'
import { Loader } from '../components/Loader'

export default function Favoris() {
  const navigate = useNavigate()
  const { data: favorites, isPending } = useFavorites(true)

  if (isPending) return <Loader />
  const count = favorites?.length ?? 0

  return (
    <div className="screen">
      <PageHeader
        title="Favoris"
        subtitle={count ? `${count} séance${count > 1 ? 's' : ''} gardée${count > 1 ? 's' : ''} pour plus tard` : undefined}
      />
      {count === 0 ? (
        <EmptyState
          icon={<IconHeart size={22} />}
          title="Aucun favori pour le moment"
          text="Touche le cœur pendant une séance pour la retrouver ici."
          action={
            <button type="button" className="btn ui-btn-soft" onClick={() => navigate('/explorer')}>
              Découvrir des séances
            </button>
          }
        />
      ) : (
        <div className="ui-list">
          {favorites!.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}
