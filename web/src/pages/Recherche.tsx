import { useMemo, useState } from 'react'
import { useCourses } from '../lib/hooks'
import { matches } from '../lib/search'
import { CourseRow } from '../components/CourseRow'
import { EmptyState, PageHeader, SearchInput, SectionTitle } from '../components/ui'
import { IconSearch } from '../components/icons'
import { Loader } from '../components/Loader'

const ALL = 'Tout'

export default function Recherche() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState(ALL)
  // Le catalogue est chargé une fois et filtré sur place : la recherche répond
  // à chaque frappe, sans aller-retour serveur, et ignore les accents.
  const { data: courses, isPending } = useCourses()
  const all = useMemo(() => courses ?? [], [courses])

  // Filtres : seulement les univers qui ont des cours, avec leur nombre.
  const universes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of all) counts.set(c.universe, (counts.get(c.universe) ?? 0) + 1)
    return [...counts.entries()]
  }, [all])

  const results = all.filter((c) => (tab === ALL || c.universe === tab) && (!query || matches(`${c.title} ${c.universe}`, query)))

  const groups = useMemo(() => {
    if (tab !== ALL) return [{ title: tab, items: results }]
    const byUniverse = new Map<string, typeof results>()
    for (const c of results) {
      if (!byUniverse.has(c.universe)) byUniverse.set(c.universe, [])
      byUniverse.get(c.universe)!.push(c)
    }
    return [...byUniverse.entries()].map(([title, items]) => ({ title, items }))
  }, [results, tab])

  if (isPending) return <Loader />

  return (
    <div className="screen">
      <PageHeader title="Recherche" subtitle="Trouve une séance par son nom ou son univers." />

      <div className="ui-sticky-search">
        <SearchInput value={query} onChange={setQuery} label="Rechercher une séance" placeholder="Yoga du soir, respiration…" />
        <div className="pill-row" role="group" aria-label="Filtrer par univers">
          {[[ALL, all.length] as const, ...universes].map(([name, count]) => (
            <button key={name} type="button" aria-pressed={tab === name} className={`pill${tab === name ? ' active' : ''}`} onClick={() => setTab(name)}>
              {name}
              <span className="pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {(query || tab !== ALL) && results.length > 0 && (
        <div className="ui-result-count" aria-live="polite">
          {results.length} séance{results.length > 1 ? 's' : ''}
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={22} />}
          title="Aucune séance trouvée"
          text={query ? `Rien ne correspond à « ${query} »${tab !== ALL ? ` dans ${tab}` : ''}.` : 'Aucune séance dans cet univers pour le moment.'}
          action={
            <button
              type="button"
              className="btn ui-btn-soft"
              onClick={() => {
                setQuery('')
                setTab(ALL)
              }}
            >
              Tout afficher
            </button>
          }
        />
      ) : (
        groups.map((g) => (
          <section key={g.title}>
            <SectionTitle title={g.title} aside={<span className="ui-count">{g.items.length}</span>} />
            <div className="ui-list">
              {g.items.map((c) => (
                <CourseRow key={c.id} course={c} showUniverse={false} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
