import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCourse, useCourses, useFavorites } from '../lib/hooks'
import { useAuth } from '../lib/AuthContext'
import { api } from '../lib/api'
import { CourseRow } from '../components/CourseRow'
import { SectionTitle } from '../components/ui'
import { IconChevronLeft, IconHeart, IconLock } from '../components/icons'
import { Loader } from '../components/Loader'

export default function Article() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: article } = useCourse(id)
  const { data: sameUniverse } = useCourses({ universe: article?.universe })
  const { data: favorites } = useFavorites(!!user)

  const isFav = favorites?.some((f) => f.id === id) ?? false
  const toggleFavorite = useMutation({
    mutationFn: () => (isFav ? api.delete(`/api/favorites/${id}`) : api.post(`/api/favorites/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  if (!article) return <Loader />
  const related = (sameUniverse ?? []).filter((c) => c.id !== article.id)

  return (
    <div className="screen article">
      <div className="article-top">
        <button type="button" className="icon-btn" aria-label="Retour" onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        {user && (
          <button
            type="button"
            className={`icon-btn${isFav ? ' fav-on' : ''}`}
            aria-pressed={isFav}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={() => toggleFavorite.mutate()}
          >
            <IconHeart size={18} filled={isFav} />
          </button>
        )}
      </div>

      <header>
        <div className="article-eyebrow">{article.universe} · {article.meta} de lecture</div>
        <h1 className="article-title">{article.title}</h1>
        {article.authorName && (
          <div className="article-author">
            <span className="article-author-avatar" aria-hidden="true">{article.authorName.slice(0, 1)}</span>
            <span>
              {article.authorName}
              {article.authorRole ? <span className="text-muted">, {article.authorRole}</span> : ''}
            </span>
          </div>
        )}
      </header>

      {article.locked ? (
        <div className="article-locked">
          <span className="article-locked-icon" aria-hidden="true">
            <IconLock size={20} />
          </span>
          <strong>Article réservé aux abonnées</strong>
          <span>Abonne-toi pour lire la suite et accéder à toutes les séances.</span>
          <Link to="/abonnement" className="btn ui-btn-primary">
            Voir les formules
          </Link>
        </div>
      ) : (
        <div className="article-body">{article.body ?? 'Le contenu de cet article sera bientôt disponible.'}</div>
      )}

      {related.length > 0 && (
        <section>
          <SectionTitle title="Dans le même univers" />
          <div className="ui-list">
            {related.map((r) => (
              <CourseRow key={r.id} course={r} showUniverse={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
