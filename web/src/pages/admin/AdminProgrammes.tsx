import { useState } from 'react'
import {
  useAdminCourses,
  useAdminPrograms,
  useAddProgram,
  useDeleteProgram,
  useToggleProgramVideo,
  useUpdateProgram,
  type AdminCourse,
  type AdminProgram,
} from '../../lib/adminHooks'
import { EditSheet, ImagePicker } from '../../components/AdminEdit'
import { AdminPageHeader, Badge, EmptyState, SearchField, StatCard, StatGrid, Switch, Toolbar, matches } from '../../components/AdminUI'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/ToastContext'
import { IconCheck, IconChevronRight, IconLayers, IconPencil, IconPlus, IconSearch, IconTrash } from '../../components/icons'
import { Loader } from '../../components/Loader'

export default function AdminProgrammes() {
  const { data: programs, isPending: programsPending } = useAdminPrograms()
  const { data: courses, isPending: coursesPending } = useAdminCourses()
  const updateProgram = useUpdateProgram()
  const deleteProgram = useDeleteProgram()
  const flash = useToast()

  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminProgram | null>(null)

  if (programsPending || coursesPending) return <Loader />

  const all = programs ?? []
  const shown = all.filter((p) => !query || matches(`${p.title} ${p.description ?? ''}`, query))
  const routines = all.filter((p) => p.isRoutine).length
  const empty = all.filter((p) => p.videoIds.length === 0).length

  async function remove(p: AdminProgram) {
    if (!window.confirm(`Supprimer le programme « ${p.title} » ? Ses vidéos restent dans le catalogue.`)) return
    try {
      await deleteProgram.mutateAsync(p.id)
      flash('Programme supprimé')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Suppression impossible')
    }
  }

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Programmes"
        description="Parcours guidés et routines de « Ma pratique », composés à partir du catalogue."
        action={
          <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
            <IconPlus size={16} />
            Nouveau programme
          </button>
        }
      />

      <StatGrid>
        <StatCard label="Programmes" value={all.length - routines} tone="sage" />
        <StatCard label="Routines" value={routines} hint="dans « Ma pratique »" tone="terracotta" />
        <StatCard label="Sans vidéo" value={empty} hint="invisibles côté app" tone="sand" />
      </StatGrid>

      {all.length > 0 && (
        <Toolbar>
          <SearchField value={query} onChange={setQuery} label="Rechercher un programme" placeholder="Rechercher un programme…" />
        </Toolbar>
      )}

      {all.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={24} />}
          title="Aucun programme"
          text="Créez un programme, puis liez-lui des vidéos du catalogue."
          action={
            <button type="button" className="btn adm-btn-primary" onClick={() => setCreating(true)}>
              <IconPlus size={16} /> Nouveau programme
            </button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={<IconSearch size={22} />} title="Aucun programme ne correspond" text="Modifiez la recherche." />
      ) : (
        <ul className="adm-list" aria-label="Programmes">
          {shown.map((p) => {
            const open = openId === p.id
            return (
              <li key={p.id} className={`adm-card${open ? ' open' : ''}`}>
                <div className="adm-card-head">
                  <button
                    type="button"
                    className="adm-card-toggle"
                    aria-expanded={open}
                    aria-controls={`prog-${p.id}`}
                    onClick={() => setOpenId(open ? '' : p.id)}
                  >
                    <div className="adm-thumb square">
                      {p.coverUrl ? <img src={p.coverUrl} alt="" loading="lazy" /> : <IconLayers size={20} />}
                    </div>
                    <div className="adm-row-body">
                      <div className="adm-row-title">
                        {p.title} {p.isRoutine && <Badge tone="terracotta">Routine</Badge>}
                      </div>
                      <div className="adm-row-meta">
                        {p.videoIds.length} vidéo{p.videoIds.length > 1 ? 's' : ''} liée{p.videoIds.length > 1 ? 's' : ''}
                        {p.description ? ` · ${p.description}` : ''}
                      </div>
                    </div>
                    <IconChevronRight size={17} className="adm-chevron" />
                  </button>
                  <div className="adm-row-actions">
                    <button type="button" className="row-action" aria-label={`Éditer ${p.title}`} title="Éditer" onClick={() => setEditing(p)}>
                      <IconPencil size={17} />
                    </button>
                    <button type="button" className="row-action danger" aria-label={`Supprimer ${p.title}`} title="Supprimer" onClick={() => remove(p)}>
                      <IconTrash size={17} />
                    </button>
                  </div>
                </div>
                {open && <LinkedVideos id={`prog-${p.id}`} program={p} courses={courses ?? []} />}
              </li>
            )
          })}
        </ul>
      )}

      {creating && (
        <ProgramCreateSheet
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setOpenId(id)
          }}
        />
      )}

      {editing && (
        <ProgramEditSheet
          program={editing}
          onClose={() => setEditing(null)}
          saving={updateProgram.isPending}
          onSave={async (patch) => {
            try {
              await updateProgram.mutateAsync({ id: editing.id, ...patch })
            } catch (err) {
              flash(err instanceof ApiError ? err.message : 'Enregistrement impossible')
              return
            }
            flash('Programme mis à jour')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/** Vidéos du catalogue à cocher pour composer le programme. */
function LinkedVideos({ id, program, courses }: { id: string; program: AdminProgram; courses: AdminCourse[] }) {
  const toggleVideo = useToggleProgramVideo()
  const flash = useToast()
  const [query, setQuery] = useState('')
  const shown = courses.filter((c) => !query || matches(c.title, query))

  async function toggle(c: AdminCourse, linked: boolean) {
    try {
      await toggleVideo.mutateAsync({ programId: program.id, courseId: c.id, linked })
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Modification impossible')
    }
  }

  return (
    <div id={id} className="adm-card-body">
      <div className="adm-card-body-head">
        <span className="adm-eyebrow">Vidéos liées · {program.videoIds.length}</span>
        {courses.length > 6 && (
          <SearchField value={query} onChange={setQuery} label="Filtrer les vidéos" placeholder="Filtrer les vidéos…" />
        )}
      </div>
      {courses.length === 0 ? (
        <p className="adm-help">Le catalogue est vide : ajoutez d'abord des cours.</p>
      ) : (
        <ul className="adm-checklist">
          {shown.map((c) => {
            const linked = program.videoIds.includes(c.id)
            return (
              <li key={c.id}>
                <button type="button" role="checkbox" aria-checked={linked} className={`adm-check${linked ? ' on' : ''}`} onClick={() => toggle(c, linked)}>
                  <span className="adm-check-box">{linked && <IconCheck size={12} strokeWidth={3.4} />}</span>
                  <span className="adm-check-label">{c.title}</span>
                  <span className="adm-check-meta">{c.durationMin} min</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProgramCreateSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const addProgram = useAddProgram()
  const flash = useToast()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [isRoutine, setIsRoutine] = useState(false)

  async function create() {
    const t = title.trim()
    if (!t) {
      flash('Donnez un nom au programme')
      return
    }
    try {
      const res = await addProgram.mutateAsync({ title: t, description: desc.trim() || undefined, isRoutine })
      flash('Programme créé — cochez maintenant ses vidéos')
      onCreated(res.program.id)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Création impossible')
    }
  }

  return (
    <EditSheet
      title="Nouveau programme"
      description="Vous lierez ses vidéos juste après."
      onClose={onClose}
      onSave={create}
      saving={addProgram.isPending}
      submitLabel="Créer le programme"
    >
      <div className="field">
        <label htmlFor="np-title">Nom</label>
        <input id="np-title" className="input" autoFocus placeholder="Yoga prénatal" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="np-desc">Description courte</label>
        <input id="np-desc" className="input" placeholder="Un programme complet pour…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <Switch
        label="Routine de « Ma pratique »"
        description="Affichée dans l'onglet Ma pratique plutôt que dans les programmes."
        checked={isRoutine}
        onChange={setIsRoutine}
      />
    </EditSheet>
  )
}

function ProgramEditSheet({
  program,
  onClose,
  onSave,
  saving,
}: {
  program: AdminProgram
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => void
  saving: boolean
}) {
  const [title, setTitle] = useState(program.title)
  const [desc, setDesc] = useState(program.description ?? '')
  const [cover, setCover] = useState<string | null>(program.coverUrl)
  const [isRoutine, setIsRoutine] = useState(program.isRoutine)

  return (
    <EditSheet
      title="Éditer le programme"
      onClose={onClose}
      saving={saving}
      onSave={() => onSave({ title: title.trim(), description: desc.trim(), coverUrl: cover ?? '', isRoutine })}
    >
      <div className="field">
        <label htmlFor="ep-title">Nom</label>
        <input id="ep-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ep-desc">Description</label>
        <input id="ep-desc" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <Switch
        label="Routine de « Ma pratique »"
        description="Affichée dans l'onglet Ma pratique plutôt que dans les programmes."
        checked={isRoutine}
        onChange={setIsRoutine}
      />
      <ImagePicker value={cover} fallbackLabel="Utiliser la vignette de la première séance" onChange={setCover} />
    </EditSheet>
  )
}
