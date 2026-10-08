import { useMemo, useRef, useState } from 'react'
import { useAdminCourses, useAddCourse, useUpdateCourse, useDeleteCourse, useUploadVideo, type AdminCourse } from '../../lib/adminHooks'
import { useUniverses } from '../../lib/hooks'
import { TAGGABLE_MOODS } from '../../lib/moods'
import { EditSheet, ImagePicker } from '../../components/AdminEdit'
import { AdminPageHeader, Badge, EmptyState, FilterChips, SearchField, StatCard, StatGrid, Switch, Toolbar } from '../../components/AdminUI'
import { matches } from '../../lib/search'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import { IconUpload, IconTrash, IconPencil, IconPlus, IconPlayCircle, IconSearch } from '../../components/icons'
import { Loader } from '../../components/Loader'

type Access = 'all' | 'premium' | 'free'

/** Libellés des univers, dans l'ordre d'Explorer. */
function useUniverseLabels() {
  const { data } = useUniverses()
  return (data ?? []).map((u) => u.label)
}

/** Humeurs de l'accueil à associer au cours : plusieurs choix possibles. */
function MoodPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="field adm-fieldset">
      <legend>Humeurs de l'accueil</legend>
      <div className="adm-mood-picker">
        {TAGGABLE_MOODS.map((m) => {
          const on = value.includes(m.key)
          return (
            <button
              key={m.key}
              type="button"
              className={`adm-mood${on ? ' on' : ''}`}
              aria-pressed={on}
              style={on ? { background: m.bg, color: m.fg, borderColor: m.fg } : undefined}
              onClick={() => onChange(on ? value.filter((k) => k !== m.key) : [...value, m.key])}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={m.path} />
              </svg>
              {m.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Univers d'Explorer (« Nos univers ») où le cours apparaît : un seul choix. */
function UniversePicker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <fieldset className="field adm-fieldset">
      <legend>Univers (Explorer · Nos univers)</legend>
      <div className="adm-mood-picker" role="radiogroup" aria-label="Univers du cours">
        {options.map((u) => (
          <button key={u} type="button" role="radio" aria-checked={u === value} className={`adm-mood${u === value ? ' picked' : ''}`} onClick={() => onChange(u)}>
            {u}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function AdminCours() {
  const { data: courses, isPending } = useAdminCourses()
  const universes = useUniverseLabels()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const flash = useToast()

  const [query, setQuery] = useState('')
  const [access, setAccess] = useState<Access>('all')
  const [universe, setUniverse] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminCourse | null>(null)

  const all = useMemo(() => courses ?? [], [courses])
  const premiumCount = all.filter((c) => c.premium).length
  const untagged = all.filter((c) => c.moods.length === 0).length

  const shown = all.filter(
    (c) =>
      (access === 'all' || (access === 'premium') === c.premium) &&
      (!universe || c.universe === universe) &&
      (!query || matches(c.title, query)),
  )

  async function togglePremium(c: AdminCourse) {
    try {
      await updateCourse.mutateAsync({ id: c.id, premium: !c.premium })
      flash(c.premium ? `« ${c.title} » est maintenant gratuit` : `« ${c.title} » est réservé aux abonnées`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Modification impossible')
    }
  }

  async function remove(c: AdminCourse) {
    if (!window.confirm(`Supprimer « ${c.title} » ? Il sera retiré des programmes et des favoris.`)) return
    try {
      await deleteCourse.mutateAsync(c.id)
      flash('Cours supprimé')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Suppression impossible')
    }
  }

  if (isPending) return <Loader />

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Cours"
        description="Vidéos et articles du catalogue, leur accès et les humeurs de l'accueil."
        action={
          <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
            <IconPlus size={16} />
            Nouveau cours
          </button>
        }
      />

      <StatGrid>
        <StatCard label="Cours publiés" value={all.length} />
        <StatCard label="Premium" value={premiumCount} hint="réservés aux abonnées" tone="terracotta" />
        <StatCard label="Gratuits" value={all.length - premiumCount} hint="accessibles à toutes" tone="sage" />
        <StatCard label="Sans humeur" value={untagged} hint="absents de l'accueil" tone="sand" />
      </StatGrid>

      <Toolbar>
        <SearchField value={query} onChange={setQuery} label="Rechercher un cours" placeholder="Rechercher un cours…" />
        <div className="adm-toolbar-row">
          <FilterChips
            label="Filtrer par accès"
            value={access}
            onChange={setAccess}
            options={[
              { value: 'all', label: 'Tous', count: all.length },
              { value: 'premium', label: 'Premium', count: premiumCount },
              { value: 'free', label: 'Gratuits', count: all.length - premiumCount },
            ]}
          />
          <select className="adm-select" aria-label="Filtrer par univers" value={universe} onChange={(e) => setUniverse(e.target.value)}>
            <option value="">Tous les univers</option>
            {universes.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </Toolbar>

      {all.length === 0 ? (
        <EmptyState
          icon={<IconPlayCircle size={24} />}
          title="Aucun cours pour le moment"
          text="Ajoutez une première vidéo YouTube ou un fichier vidéo."
          action={
            <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={16} /> Nouveau cours
            </button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={<IconSearch size={22} />} title="Aucun cours ne correspond" text="Modifiez la recherche ou les filtres." />
      ) : (
        <ul className="adm-list" aria-label="Catalogue">
          {shown.map((c) => {
            const moods = TAGGABLE_MOODS.filter((m) => c.moods.includes(m.key))
            return (
              <li key={c.id} className="adm-row">
                <div className="adm-thumb">
                  {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" loading="lazy" /> : <IconPlayCircle size={20} />}
                </div>
                <div className="adm-row-body">
                  <div className="adm-row-title">{c.title}</div>
                  <div className="adm-row-meta">
                    {c.universe} · {c.durationMin} min{c.kind === 'ARTICLE' ? ' · article' : ''}
                  </div>
                  {moods.length > 0 && (
                    <div className="adm-row-tags">
                      {moods.map((m) => (
                        <span key={m.key} className="adm-mood-dot" style={{ background: m.bg, color: m.fg }}>{m.label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="adm-row-actions">
                  <button
                    type="button"
                    className="adm-badge-btn"
                    title={c.premium ? 'Rendre gratuit' : 'Réserver aux abonnées'}
                    onClick={() => togglePremium(c)}
                  >
                    <Badge tone={c.premium ? 'terracotta' : 'sage'}>{c.premium ? 'Premium' : 'Gratuit'}</Badge>
                  </button>
                  <button type="button" className="row-action" aria-label={`Éditer ${c.title}`} title="Éditer" onClick={() => setEditing(c)}>
                    <IconPencil size={17} />
                  </button>
                  <button type="button" className="row-action danger" aria-label={`Supprimer ${c.title}`} title="Supprimer" onClick={() => remove(c)}>
                    <IconTrash size={17} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {creating && <CourseCreateSheet universes={universes} onClose={() => setCreating(false)} />}

      {editing && (
        <CourseEditSheet
          course={editing}
          universes={universes}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              await updateCourse.mutateAsync({ id: editing.id, ...patch })
            } catch (err) {
              flash(err instanceof ApiError ? err.message : 'Enregistrement impossible')
              return
            }
            flash('Cours mis à jour')
            setEditing(null)
          }}
          saving={updateCourse.isPending}
        />
      )}
    </div>
  )
}

function CourseCreateSheet({ universes, onClose }: { universes: string[]; onClose: () => void }) {
  const addCourse = useAddCourse()
  const uploadVideo = useUploadVideo()
  const flash = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [universeChoice, setUniverse] = useState('')
  // Les univers arrivent de l'API : on retombe sur le premier tant que rien n'est choisi.
  const universe = universeChoice || universes[0] || ''
  const [premium, setPremium] = useState(true)
  const [moods, setMoods] = useState<string[]>([])
  const [source, setSource] = useState<'youtube' | 'file'>('youtube')
  const [youtube, setYoutube] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    try {
      const res = await uploadVideo.mutateAsync(file)
      setVideoUrl(res.url)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Échec de l'envoi du fichier")
      setFileName('')
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function publish() {
    const t = title.trim()
    if (!t) {
      flash('Donnez un titre au cours')
      return
    }
    if (uploadVideo.isPending) {
      flash("Patientez jusqu'à la fin de l'envoi de la vidéo")
      return
    }
    try {
      await addCourse.mutateAsync({
        title: t,
        durationMin: parseInt(duration.replace(/\D/g, ''), 10) || 20,
        universe,
        premium,
        moods,
        videoUrl: source === 'file' ? videoUrl ?? undefined : undefined,
        youtubeId: source === 'youtube' ? youtube.trim() || undefined : undefined,
      })
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Publication impossible')
      return
    }
    flash('Cours publié')
    onClose()
  }

  return (
    <EditSheet
      title="Nouveau cours"
      description="Il sera visible immédiatement dans l'application."
      onClose={onClose}
      onSave={publish}
      saving={addCourse.isPending}
      submitLabel="Publier le cours"
    >
      <div className="field">
        <label htmlFor="nc-title">Titre</label>
        <input id="nc-title" className="input" autoFocus placeholder="Yoga doux du soir" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <UniversePicker value={universe} options={universes} onChange={setUniverse} />
      <div className="adm-field-row">
        <div className="field">
          <label htmlFor="nc-dur">Durée (min)</label>
          <input id="nc-dur" className="input" inputMode="numeric" placeholder="20" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>
      <Switch
        label="Réservé aux abonnées"
        description={premium ? 'Cadenas affiché pour les non-abonnées' : 'Accessible à toutes'}
        checked={premium}
        onChange={setPremium}
      />
      <MoodPicker value={moods} onChange={setMoods} />

      <fieldset className="field adm-fieldset">
        <legend>Vidéo</legend>
        <div className="adm-segmented" role="group" aria-label="Source de la vidéo">
          <button type="button" aria-pressed={source === 'youtube'} className={source === 'youtube' ? 'active' : ''} onClick={() => setSource('youtube')}>
            Lien YouTube
          </button>
          <button type="button" aria-pressed={source === 'file'} className={source === 'file' ? 'active' : ''} onClick={() => setSource('file')}>
            Fichier vidéo
          </button>
        </div>
        {source === 'youtube' ? (
          <input
            className="input"
            aria-label="Lien YouTube"
            placeholder="https://youtu.be/…"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
          />
        ) : (
          <label className={`dropzone${fileName ? ' has-file' : ''}`}>
            <IconUpload size={18} />
            {uploadVideo.isPending ? `Envoi de ${fileName}…` : fileName || 'Choisir un fichier (mp4, webm, mov)'}
            <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={onFileChange} />
          </label>
        )}
      </fieldset>
    </EditSheet>
  )
}

function CourseEditSheet({
  course,
  universes,
  onClose,
  onSave,
  saving,
}: {
  course: AdminCourse
  universes: string[]
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => void
  saving: boolean
}) {
  const [title, setTitle] = useState(course.title)
  const [duration, setDuration] = useState(String(course.durationMin))
  const [universe, setUniverse] = useState(course.universe)
  const [youtube, setYoutube] = useState(course.youtubeId ?? '')
  const [thumb, setThumb] = useState<string | null>(course.customThumbnailUrl)
  const [premium, setPremium] = useState(course.premium)
  const [moods, setMoods] = useState<string[]>(course.moods)

  // Miniature YouTube du lien en cours de saisie, pour l'aperçu « image par défaut ».
  const ytFallback = /^[A-Za-z0-9_-]{11}$/.test(youtube.trim())
    ? `https://img.youtube.com/vi/${youtube.trim()}/mqdefault.jpg`
    : course.youtubeId
    ? `https://img.youtube.com/vi/${course.youtubeId}/mqdefault.jpg`
    : null

  return (
    <EditSheet
      title="Éditer le cours"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        onSave({
          title: title.trim(),
          durationMin: parseInt(duration.replace(/\D/g, ''), 10) || course.durationMin,
          universe,
          premium,
          moods,
          youtubeId: youtube,
          thumbnailUrl: thumb ?? '',
        })
      }
    >
      <div className="field">
        <label htmlFor="ec-title">Titre</label>
        <input id="ec-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <UniversePicker value={universe} options={[...new Set([course.universe, ...universes])]} onChange={setUniverse} />
      <div className="adm-field-row">
        <div className="field">
          <label htmlFor="ec-dur">Durée (min)</label>
          <input id="ec-dur" className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>
      <Switch
        label="Réservé aux abonnées"
        description={premium ? 'Cadenas affiché pour les non-abonnées' : 'Accessible à toutes'}
        checked={premium}
        onChange={setPremium}
      />
      <MoodPicker value={moods} onChange={setMoods} />
      <div className="field">
        <label htmlFor="ec-yt">Lien YouTube</label>
        <input
          id="ec-yt"
          className="input"
          placeholder={course.videoUrl ? 'Vidéo hébergée — laisser vide' : 'https://youtu.be/…'}
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
        />
        {course.videoUrl && !youtube.trim() && (
          <span className="adm-help">Le fichier vidéo téléversé est utilisé.</span>
        )}
      </div>
      <ImagePicker
        value={thumb}
        fallback={ytFallback}
        fallbackLabel={ytFallback ? 'Utiliser la miniature YouTube' : 'Aucune image par défaut'}
        onChange={setThumb}
      />
    </EditSheet>
  )
}
