import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useMarkNotificationsRead, useNotifications } from '../lib/hooks'
import { relativeTime } from '../lib/relativeTime'
import { IconArrowRight, IconBell, IconCalendar, IconX } from './icons'

/** Durée de l'animation de fermeture (doit suivre .notif-backdrop.is-closing dans app.css). */
const CLOSE_MS = 260

/**
 * Cloche de l'accueil : pastille du nombre de notifications non lues, et
 * panneau de lecture (feuille en bas sur mobile, tiroir à droite au-delà).
 * Le panneau entre et sort en glissant ; il reste affiché le temps de son
 * animation de sortie avant d'être retiré.
 * Les non lues restent mises en avant tant que le panneau est ouvert et
 * passent en « lues » à sa fermeture.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const { data } = useNotifications(!!user)
  const markRead = useMarkNotificationsRead()
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const bellRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const unread = data?.unreadCount ?? 0

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function open() {
    clearTimeout(closeTimer.current)
    setPhase('open')
  }

  function close() {
    if (phase !== 'open') return
    setPhase('closing')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimer.current = setTimeout(() => {
      setPhase('closed')
      if (unread > 0) markRead.mutate()
      bellRef.current?.focus()
    }, still ? 0 : CLOSE_MS)
  }

  /** Notification qui mène à un écran : on la quitte tout de suite pour y aller. */
  function follow() {
    if (unread > 0) markRead.mutate()
  }

  const label = unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        className={`notif-bell${phase === 'open' ? ' is-open' : ''}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={phase === 'open'}
        onClick={open}
      >
        <IconBell size={21} filled />
        {unread > 0 && <span className="notif-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {phase !== 'closed' &&
        createPortal(<NotificationPanel data={data} closing={phase === 'closing'} onClose={close} onFollow={follow} />, document.body)}
    </>
  )
}

function NotificationPanel({
  data,
  closing,
  onClose,
  onFollow,
}: {
  data: ReturnType<typeof useNotifications>['data']
  closing: boolean
  onClose: () => void
  onFollow: () => void
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
  const unread = data?.unreadCount ?? 0

  return (
    <div className={`notif-backdrop${closing ? ' is-closing' : ''}`} onClick={onClose} role="presentation">
      <div
        className="notif-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-sheet-handle notif-handle" />
        <div className="notif-header">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId}>Notifications</h2>
            {data && (
              <p className="notif-subtitle">
                {unread > 0 ? `${unread} nouvelle${unread > 1 ? 's' : ''}` : notifications.length > 0 ? 'Tout est lu' : 'Rien de neuf pour le moment'}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" className="notif-close" aria-label="Fermer" onClick={onClose}>
            <IconX size={17} />
          </button>
        </div>

        {!data ? (
          <div className="notif-empty">Chargement…</div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <span className="notif-empty-icon">
              <IconBell size={24} filled />
            </span>
            <strong>Aucune notification</strong>
            <span>Les nouveautés et annonces de Yogella apparaîtront ici.</span>
          </div>
        ) : (
          <ul className="notif-list">
            {notifications.map((n, i) => {
              const content = (
                <>
                  <span className={`notif-kind ${n.kind === 'booking' ? 'booking' : 'announcement'}`} aria-hidden="true">
                    {n.kind === 'booking' ? <IconCalendar size={18} /> : <IconBell size={18} filled />}
                  </span>
                  <span className="notif-item-main">
                    <span className="notif-item-head">
                      <span className="notif-item-title">{n.title}</span>
                      {!n.read && <span className="notif-dot" aria-label="Non lue" />}
                    </span>
                    <span className="notif-item-body">{n.body}</span>
                    <span className="notif-item-foot">
                      <time className="notif-item-time" dateTime={n.createdAt}>
                        {relativeTime(n.createdAt)}
                      </time>
                      {n.link && (
                        <span className="notif-item-link">
                          Voir le planning <IconArrowRight size={14} />
                        </span>
                      )}
                    </span>
                  </span>
                </>
              )
              return (
                <li
                  key={n.id}
                  className={`notif-item${n.read ? '' : ' unread'}${n.link ? ' has-link' : ''}`}
                  style={{ '--i': Math.min(i, 8) } as CSSProperties}
                >
                  {n.link ? (
                    <button
                      type="button"
                      className="notif-item-btn"
                      onClick={() => {
                        onFollow()
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
