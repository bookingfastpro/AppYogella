import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrograms, useUniverses } from '../lib/hooks'
import { api } from '../lib/api'
import type { Course, ProgramSummary, Universe } from '../lib/api'
import { Loader } from '../components/Loader'
import { PageHeader, SectionTitle } from '../components/ui'
import { ProgramCard } from '../components/ProgramCard'

/**
 * Tuile d'univers en photo : l'image de l'univers, sinon la vignette d'une de
 * ses séances ; sans image, un aplat à sa couleur. Le titre est posé sur un
 * dégradé sombre pour rester lisible sur n'importe quelle photo.
 */
function UniverseTile({ universe, onSelect }: { universe: Universe; onSelect: () => void }) {
  const sources = [universe.imageUrl, universe.fallbackImageUrl].filter((s): s is string => !!s)
  const [failed, setFailed] = useState(0)
  const src = sources[failed]

  return (
    <button
      type="button"
      className={`univers-tile${src ? ' has-photo' : ''}`}
      style={src ? undefined : { backgroundColor: universe.bg, color: universe.fg }}
      onClick={onSelect}
    >
      {src && <img className="univers-img" src={src} alt="" loading="lazy" onError={() => setFailed((n) => n + 1)} />}
      <span className="label">{universe.label}</span>
    </button>
  )
}

export default function Explorer() {
  const navigate = useNavigate()
  const { data: universes, isPending } = useUniverses()
  const { data: programs } = usePrograms(false)

  async function onSelect(u: Universe) {
    if (u.dest === 'categorie') {
      navigate(`/categorie/${u.slug}`)
    } else if (u.dest === 'article') {
      const { courses } = await api.get<{ courses: Course[] }>(`/api/courses?kind=ARTICLE`)
      if (courses[0]) navigate(`/article/${courses[0].id}`)
    } else if (u.dest === 'programme') {
      const { programs } = await api.get<{ programs: ProgramSummary[] }>(`/api/programs`)
      if (programs[0]) navigate(`/programme/${programs[0].id}`)
    }
  }

  if (isPending) return <Loader />

  return (
    <div className="screen">
      <PageHeader title="Explorer" subtitle="Des programmes guidés et des univers à découvrir à ton rythme." />

      {(programs?.length ?? 0) > 0 && (
        <section>
          <SectionTitle title="Programmes" aside={<span className="ui-count">{programs!.length}</span>} />
          <div className="card-grid-2">
            {programs!.map((p) => (
              <ProgramCard key={p.id} program={p} variant="stacked" />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Nos univers" />
        <div className="card-grid">
          {(universes ?? []).map((u) => (
            <UniverseTile key={u.id} universe={u} onSelect={() => onSelect(u)} />
          ))}
        </div>
      </section>
    </div>
  )
}
