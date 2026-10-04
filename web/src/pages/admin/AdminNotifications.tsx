import { useState, type FormEvent } from 'react'
import { useAdminNotifications, useDeleteNotification, useSendNotification } from '../../lib/adminHooks'
import { AdminPageHeader, EmptyState, Section, StatCard, StatGrid } from '../../components/AdminUI'
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

  const sent = data?.notifications ?? []
  const accounts = data?.accounts ?? 0
  const last = sent[0]
  const readRate = last && accounts ? Math.round((last.readCount / accounts) * 100) : null

  return (
    <div className="adm-page">
      <AdminPageHeader title="Notifications" description="Annonces envoyées à toutes les utilisatrices, visibles sous la cloche de l'accueil." />

      <StatGrid>
        <StatCard label="Envoyées" value={sent.length} />
        <StatCard label="Destinataires" value={accounts} hint="comptes actifs" tone="sage" />
        <StatCard label="Dernière lue par" value={readRate === null ? '—' : `${readRate} %`} hint={last ? relativeTime(last.createdAt) : undefined} tone="terracotta" />
      </StatGrid>

      <div className="adm-compose">
        <form className="adm-section" onSubmit={onSubmit}>
          <div className="adm-section-head">
            <h3>Nouvelle notification</h3>
          </div>
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
            <span className="adm-help" style={{ alignSelf: 'flex-end' }}>
              {body.length}/{BODY_MAX}
            </span>
          </div>
          <button type="submit" className="btn adm-btn-primary" disabled={send.isPending}>
            {send.isPending ? 'Envoi…' : 'Envoyer à toutes les utilisatrices'}
          </button>
        </form>

        <div className="adm-preview" aria-label="Aperçu côté application">
          <span className="adm-eyebrow">Aperçu dans l'application</span>
          <div className="notif-item unread adm-preview-item">
            <span className="notif-dot" aria-hidden="true" />
            <div className="notif-item-head">
              <span className="notif-item-title">{title.trim() || 'Titre de la notification'}</span>
              <span className="notif-item-time">à l'instant</span>
            </div>
            <p className="notif-item-body">{body.trim() || 'Le message apparaîtra ici, tel que les utilisatrices le liront.'}</p>
          </div>
        </div>
      </div>

      <Section title="Historique" aside={<span className="adm-help">{sent.length}</span>}>
        {sent.length === 0 ? (
          <EmptyState icon={<IconBell size={22} />} title="Aucune notification envoyée" text="Votre première annonce apparaîtra ici avec son taux de lecture." />
        ) : (
          <ul className="adm-list" aria-label="Notifications envoyées">
            {sent.map((n) => {
              const rate = accounts ? Math.min(100, Math.round((n.readCount / accounts) * 100)) : 0
              return (
                <li key={n.id} className="adm-row adm-notif">
                  <div className="adm-row-body">
                    <div className="adm-row-title">{n.title}</div>
                    <div className="notif-admin-body">{n.body}</div>
                    <div className="adm-read">
                      <div className="adm-read-bar" aria-hidden="true">
                        <span style={{ width: `${rate}%` }} />
                      </div>
                      <span className="adm-row-meta">
                        {relativeTime(n.createdAt)} · lue par {n.readCount} / {accounts}
                      </span>
                    </div>
                  </div>
                  <button type="button" className="row-action danger" aria-label={`Supprimer ${n.title}`} title="Supprimer" onClick={() => onDelete(n.id, n.title)}>
                    <IconTrash size={17} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
    </div>
  )
}
