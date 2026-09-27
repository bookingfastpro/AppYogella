import { useState, type FormEvent } from 'react'
import { useAdminNotifications, useDeleteNotification, useSendNotification } from '../../lib/adminHooks'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import { relativeTime } from '../../lib/relativeTime'
import { IconBell, IconTrash } from '../../components/icons'
import { Loader } from '../../components/Loader'

const TITLE_MAX = 80
const BODY_MAX = 600

export default function AdminNotifications() {
  const { data, isPending } = useAdminNotifications()
  const send = useSendNotification()
  const remove = useDeleteNotification()
  const flash = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      flash('Renseignez un titre et un message')
      return
    }
    try {
      await send.mutateAsync({ title: title.trim(), body: body.trim() })
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Envoi impossible')
      return
    }
    flash('Notification envoyée à toutes les utilisatrices')
    setTitle('')
    setBody('')
  }

  async function onDelete(id: string, t: string) {
    if (!window.confirm(`Supprimer « ${t} » ? Elle disparaîtra pour toutes les utilisatrices.`)) return
    try {
      await remove.mutateAsync(id)
      flash('Notification supprimée')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Suppression impossible')
    }
  }

  if (isPending) return <Loader />

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form className="panel" onSubmit={onSubmit}>
        <div className="panel-title">Envoyer une notification</div>
        <div className="field">
          <label htmlFor="notif-title">Titre</label>
          <input
            id="notif-title"
            className="input"
            placeholder="Nouvelles séances de yoga du soir"
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="notif-body">Message</label>
          <textarea
            id="notif-body"
            className="input notif-textarea"
            placeholder="Trois nouvelles séances pour relâcher les tensions de la journée…"
            rows={4}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <span className="text-muted" style={{ fontSize: 11.5, alignSelf: 'flex-end' }}>
            {body.length}/{BODY_MAX}
          </span>
        </div>
        <button
          type="submit"
          className="btn"
          style={{ background: 'var(--color-accent-600)', color: '#fff', padding: 12, fontSize: 14 }}
          disabled={send.isPending}
        >
          {send.isPending ? 'Envoi…' : 'Envoyer à toutes les utilisatrices'}
        </button>
      </form>

      <div>
        <div className="section-title-row">
          <h2 style={{ fontSize: 17 }}>Envoyées</h2>
          <span className="text-muted" style={{ fontSize: 12.5 }}>{data?.notifications.length ?? 0}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(data?.notifications ?? []).map((n) => (
            <div key={n.id} className="catalog-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{n.title}</div>
                <div className="notif-admin-body">{n.body}</div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>
                  {relativeTime(n.createdAt)} · lue par {n.readCount} / {data?.accounts ?? 0}
                </div>
              </div>
              <button className="row-action" title="Supprimer" aria-label={`Supprimer ${n.title}`} onClick={() => onDelete(n.id, n.title)}>
                <IconTrash size={17} />
              </button>
            </div>
          ))}
          {data?.notifications.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13.5, padding: '12px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBell size={16} /> Aucune notification envoyée pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
