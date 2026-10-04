import { useNavigate } from 'react-router-dom'
import { usePrograms, useUniverses } from '../lib/hooks'
import { api } from '../lib/api'
import type { Course, ProgramSummary } from '../lib/api'
import { Loader } from '../components/Loader'
import { PageHeader, SectionTitle } from '../components/ui'
import { ProgramCard } from '../components/ProgramCard'

export default function Explorer() {
  const navigate = useNavigate()
  const { data: universes, isPending } = useUniverses()
  const { data: programs } = usePrograms(false)

  async function onSelect(u: NonNullable<typeof universes>[number]) {
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
          <div className="card-rail">
            {programs!.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Nos univers" />
        <div className="card-grid">
          {(universes ?? []).map((u) => (
            <button key={u.id} type="button" className="univers-tile" style={{ background: u.bg, color: u.fg }} onClick={() => onSelect(u)}>
              <span className="label">{u.label}</span>
              <span className="blob" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
