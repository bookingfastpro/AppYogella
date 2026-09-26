import { useRef, useState } from 'react'
import { useAdminCourses, useAddCourse, useUpdateCourse, useDeleteCourse, useUploadVideo, type AdminCourse } from '../../lib/adminHooks'
import { useUniverses } from '../../lib/hooks'
import { TAGGABLE_MOODS } from '../../lib/moods'
import { EditSheet, ImagePicker } from '../../components/AdminEdit'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import { IconUpload, IconTrash, IconPencil } from '../../components/icons'
import { Loader } from '../../components/Loader'

/** Humeurs de l'accueil à associer au cours : plusieurs choix possibles. */
function MoodPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="field">
      <label>Humeurs (accueil)</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TAGGABLE_MOODS.map((m) => {
          const on = value.includes(m.key)
          return (
            <button
              key={m.key}
              type="button"
              className="tag"
              aria-pressed={on}
              style={{ border: 0, cursor: 'pointer', background: on ? m.bg : 'var(--color-neutral-200)', color: on ? m.fg : 'var(--color-neutral-700)', fontWeight: on ? 700 : 500 }}
              onClick={() => onChange(on ? value.filter((k) => k !== m.key) : [...value, m.key])}
            >
              {on ? '✓ ' : ''}{m.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Libellés des univers, dans l'ordre d'Explorer. */
function useUniverseLabels() {
  const { data } = useUniverses()
  return (data ?? []).map((u) => u.label)
}

export default function AdminCours() {
  const { data: courses, isPending } = useAdminCourses()
  const UNIVERSES = useUniverseLabels()
  const addCourse = useAddCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const uploadVideo = useUploadVideo()
  const flash = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [universeChoice, setUniverse] = useState('')
  // Les univers arrivent de l'API : on retombe sur le premier tant que rien n'est choisi.
  const universe = universeChoice || UNIVERSES[0] || ''
  const [premium, setPremium] = useState(true)
  const [moods, setMoods] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [youtube, setYoutube] = useState('')
  const [editing, setEditing] = useState<AdminCourse | null>(null)

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
    }
  }

  async function publish() {
    const t = title.trim()
    if (!t) {
      flash('Donnez un titre au cours')
      return
    }
    const durationMin = parseInt(duration.replace(/\D/g, ''), 10) || 20
    try {
      await addCourse.mutateAsync({
        title: t,
        durationMin,
        universe,
        premium,
        moods,
        videoUrl: videoUrl ?? undefined,
        youtubeId: youtube.trim() || undefined,
      })
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Publication impossible')
      return
    }
    flash('Cours publié')
    setTitle('')
    setDuration('')
    setVideoUrl(null)
    setMoods([])
    setYoutube('')
    setFileName('')
    if (fileInput.current) fileInput.current.value = ''
  }

  if (isPending) return <Loader />

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel">
        <div className="panel-title">Ajouter un cours vidéo</div>
        <input className="input" placeholder="Titre du cours" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 9 }}>
          <input className="input" placeholder="Durée (min)" style={{ flex: 1, minWidth: 0 }} value={duration} onChange={(e) => setDuration(e.target.value)} />
          <select className="input" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} value={universe} onChange={(e) => setUniverse(e.target.value)}>
            {UNIVERSES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 4px', cursor: 'pointer' }} onClick={() => setPremium((p) => !p)}>
          <span className="switch" style={{ background: premium ? 'var(--color-accent-600)' : 'var(--color-neutral-400)', justifyContent: premium ? 'flex-end' : 'flex-start' }}>
            <span className="knob" />
          </span>
          <span style={{ fontSize: 13.5 }}>Réservé aux abonnées</span>
        </div>
        <MoodPicker value={moods} onChange={setMoods} />
        <label className={`dropzone${fileName ? ' has-file' : ''}`}>
          <IconUpload size={18} />
          {fileName || 'Déposer le fichier vidéo'}
          <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={onFileChange} />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-neutral-600)', fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
          ou
          <span style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
        </div>
        <input
          className="input"
          placeholder="Coller un lien YouTube"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
        />
        <button className="btn" style={{ background: 'var(--color-accent-600)', color: '#fff', padding: 12, fontSize: 14 }} onClick={publish} disabled={addCourse.isPending}>
          Publier le cours
        </button>
      </div>

      <div>
        <div className="section-title-row">
          <h2 style={{ fontSize: 17 }}>Catalogue</h2>
          <span className="text-muted" style={{ fontSize: 12.5 }}>{courses?.length ?? 0} cours</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(courses ?? []).map((c) => (
            <div key={c.id} className="catalog-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.title}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{c.meta}</div>
              </div>
              <button
                className="tag"
                style={{
                  border: 0, cursor: 'pointer', flex: 'none',
                  background: c.premium ? 'var(--color-accent-200)' : 'var(--color-accent-2-200)',
                  color: c.premium ? 'var(--color-accent-800)' : 'var(--color-accent-2-800)',
                }}
                onClick={() => updateCourse.mutate({ id: c.id, premium: !c.premium })}
              >
                {c.premium ? 'Premium' : 'Gratuit'}
              </button>
              <button className="row-action" title="Éditer" onClick={() => setEditing(c)}>
                <IconPencil size={17} />
              </button>
              <button className="row-action" title="Supprimer" onClick={() => deleteCourse.mutate(c.id)}>
                <IconTrash size={17} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <CourseEditSheet
          course={editing}
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

function CourseEditSheet({
  course,
  onClose,
  onSave,
  saving,
}: {
  course: AdminCourse
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
  const UNIVERSES = useUniverseLabels()

  // Miniature YouTube du lien en cours de saisie, pour l'aperçu « image par défaut ».
  const ytFallback = /^[A-Za-z0-9_-]{11}$/.test(youtube.trim())
    ? `https://img.youtube.com/vi/${youtube.trim()}/mqdefault.jpg`
    : course.youtubeId
    ? `https://img.youtube.com/vi/${course.youtubeId}/mqdefault.jpg`
    : null

  return (
    <EditSheet title="Éditer le cours" onClose={onClose} saving={saving} onSave={() => onSave({
      title: title.trim(),
      durationMin: parseInt(duration.replace(/\D/g, ''), 10) || course.durationMin,
      universe,
      premium,
      moods,
      youtubeId: youtube,
      thumbnailUrl: thumb ?? '',
    })}>
      <div className="field">
        <label htmlFor="ec-title">Titre</label>
        <input id="ec-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="ec-dur">Durée (min)</label>
          <input id="ec-dur" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="ec-univ">Univers</label>
          <select id="ec-univ" className="input" style={{ cursor: 'pointer' }} value={universe} onChange={(e) => setUniverse(e.target.value)}>
            {[...new Set([course.universe, ...UNIVERSES])].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 4px', cursor: 'pointer' }}
        onClick={() => setPremium((p) => !p)}
      >
        <span
          className="switch"
          style={{
            background: premium ? 'var(--color-accent-600)' : 'var(--color-neutral-400)',
            justifyContent: premium ? 'flex-end' : 'flex-start',
          }}
        >
          <span className="knob" />
        </span>
        <span style={{ fontSize: 13.5 }}>{premium ? 'Réservé aux abonnées' : 'Accès gratuit'}</span>
      </div>
      <MoodPicker value={moods} onChange={setMoods} />
      <div className="field">
        <label htmlFor="ec-yt">Lien YouTube</label>
        <input
          id="ec-yt"
          className="input"
          placeholder={course.videoUrl ? 'Vidéo hébergée — laisser vide' : 'Coller un lien YouTube'}
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
        />
        {course.videoUrl && !youtube.trim() && (
          <span className="text-muted" style={{ fontSize: 12 }}>Fichier vidéo téléversé utilisé.</span>
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
