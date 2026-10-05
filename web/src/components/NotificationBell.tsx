import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useMarkNotificationsRead, useNotifications } from '../lib/hooks'
import { relativeTime } from '../lib/relativeTime'
import { IconBell, IconCalendar, IconX } from './icons'

/**
 * Cloche de l'accueil : pastille du nombre de notifications non lues, et
 * panneau de lecture (feuille en bas sur mobile, tiroir à droite au-delà).
 * Les non lues restent mises en avant tant que le panneau est ouvert et
 * passent en « lues » à sa fermeture.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const { data } = useNotifications(!!user)
  const markRead = useMarkNotificationsRead()
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const unread = data?.unreadCount ?? 0

  function close() {
    setOpen(false)
    if (unread > 0) markRead.mutate()
    bellRef.current?.focus()
  }

  const label = unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        className="notif-bell"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <IconBell size={21} filled />
        {unread > 0 && <span className="notif-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && createPortal(<NotificationPanel data={data} onClose={close} />, document.body)}
    </>
  )
}

function NotificationPanel({
  data,
  onClose,
}: {
  data: ReturnType<typeof useNotifications>['data']
  onClose: () => void
}) {
  const titleId = useId()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)
  // Référence stable : l'effet ci-dessous ne doit tourner qu'à l'ouverture,
  // pas à chaque rafraîchissement des données.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Focus dans le panneau, Échap pour fermer, et pas de défilement de la page
  // derrière la feuille.
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [])

  const notifications = data?.notifications ?? []

  return (
    <div className="notif-backdrop" onClick={onClose} role="presentation">
      <div
        className="notif-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-sheet-handle notif-handle" />
        <div className="notif-header">
          <h2 id={titleId}>Notifications</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        {!data ? (
          <div className="notif-empty">Chargement…</div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <span className="notif-empty-icon">
              <IconBell size={22} />
            </span>
            <strong>Aucune notification</strong>
            <span>Les nouveautés et annonces de Yogella apparaîtront ici.</span>
          </div>
        ) : (
          <ul className="notif-list">
            {notifications.map((n) => {
              const content = (
                <>
                  <span className={`notif-kind ${n.kind === 'booking' ? 'booking' : 'announcement'}`} aria-hidden="true">
                    {n.kind === 'booking' ? <IconCalendar size={16} /> : <IconBell size={16} />}
                  </span>
                  <span className="notif-item-main">
                    <span className="notif-item-head">
                      <span className="notif-item-title">{n.title}</span>
                      <time className="notif-item-time" dateTime={n.createdAt}>
                        {relativeTime(n.createdAt)}
                      </time>
                    </span>
                    <span className="notif-item-body">{n.body}</span>
                    {n.link && <span className="notif-item-link">Voir le planning →</span>}
                  </span>
                  {!n.read && <span className="notif-dot" aria-label="Non lue" />}
                </>
              )
              return (
                <li key={n.id} className={`notif-item${n.read ? '' : ' unread'}${n.link ? ' has-link' : ''}`}>
                  {n.link ? (
                    <button
                      type="button"
                      className="notif-item-btn"
                      onClick={() => {
                        onClose()
                        navigate(n.link!)
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="notif-item-btn">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
