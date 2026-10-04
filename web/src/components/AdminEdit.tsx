import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useUploadImage } from '../lib/adminHooks'
import { useToast } from '../lib/ToastContext'
import { ApiError } from '../lib/api'
import { IconUpload, IconTrash, IconX } from './icons'

/**
 * Feuille d'édition modale : remonte du bas sur mobile, boîte de dialogue
 * centrée sur desktop. C'est un formulaire : Entrée valide, Échap ferme.
 */
export function EditSheet({
  title,
  description,
  onClose,
  onSave,
  saving,
  submitLabel = 'Enregistrer',
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  onSave: () => void
  saving?: boolean
  submitLabel?: string
  children: ReactNode
}) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Échap pour fermer, et pas de défilement de la page derrière la feuille.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div className="edit-sheet-backdrop" onClick={onClose} role="presentation">
      <form
        className="edit-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!saving) onSave()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="edit-sheet-handle" />
        <div className="adm-sheet-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <IconX size={15} />
          </button>
        </div>
        {children}
        <div className="adm-sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn adm-btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Choix d'une image : téléversement, ou repli automatique sur une image
 * fournie par ailleurs (la miniature YouTube du cours, par exemple).
 */
export function ImagePicker({
  value,
  fallback,
  fallbackLabel,
  onChange,
}: {
  /** Image explicitement choisie, ou null si l'on s'appuie sur le repli. */
  value: string | null
  /** Image utilisée quand `value` est null (miniature YouTube, 1re séance…). */
  fallback?: string | null
  fallbackLabel?: string
  onChange: (url: string | null) => void
}) {
  const uploadImage = useUploadImage()
  const flash = useToast()
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const shown = value ?? fallback ?? null

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadImage.mutateAsync(file)
      onChange(res.url)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Échec de l'envoi de l'image")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="field">
      <label>Image</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* L'aperçu est lui-même cliquable : c'est là qu'on porte le doigt. */}
        <label htmlFor={inputId} className="thumb-preview" style={{ cursor: 'pointer' }}>
          {shown ? <img src={shown} alt="" /> : <span className="text-muted" style={{ fontSize: 11 }}>Choisir</span>}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <label htmlFor={inputId} className="dropzone" style={{ margin: 0 }}>
            <IconUpload size={16} />
            {busy ? 'Envoi…' : 'Choisir une image'}
          </label>
          {/* accept="image/*" plutôt qu'une liste de types : sinon les photos
              iPhone (HEIC) apparaissent grisées dans le sélecteur. iOS les
              convertit en JPEG à la sélection. */}
          <input
            id={inputId}
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
          {value ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
              onClick={() => onChange(null)}
            >
              <IconTrash size={14} />
              {fallbackLabel ?? "Revenir à l'image par défaut"}
            </button>
          ) : (
            fallback && (
              <span className="text-muted" style={{ fontSize: 12 }}>
                {fallbackLabel ?? 'Image par défaut utilisée'}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
