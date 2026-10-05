import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { IconBell, IconCalendar, IconCard, IconCheck, IconChevronLeft, IconChevronRight, IconLayers, IconPlayCircle, IconUsers } from '../../components/icons'

const SECTIONS = [
  { to: '/admin', label: 'Cours', desc: 'Vidéos et articles du catalogue', icon: IconPlayCircle, end: true },
  { to: '/admin/programmes', label: 'Programmes', desc: 'Parcours guidés et routines', icon: IconLayers },
  { to: '/admin/planning', label: 'Planning', desc: 'Cours au studio et inscriptions', icon: IconCalendar },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', desc: 'Comptes et accès', icon: IconUsers },
  { to: '/admin/abonnements', label: 'Abonnements', desc: 'Formules, prix et essai gratuit', icon: IconCard },
  { to: '/admin/notifications', label: 'Notifications', desc: 'Annonces aux utilisatrices', icon: IconBell },
]

/** Durée de l'animation de fermeture du menu (suit .adm-menu-panel.is-closing dans app.css). */
const MENU_CLOSE_MS = 160

/**
 * Coquille de l'administration, dans le style de l'application : en-tête
 * collant (retour, marque, compte) et menu déroulant des sections, à toutes
 * les tailles d'écran. Le contenu est centré à largeur de lecture.
 */
export default function AdminLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="adm-layout">
      <header className="adm-header">
        <div className="adm-header-inner">
          <button type="button" className="adm-round-btn adm-back" aria-label="Retour à l'application" title="Retour à l'application" onClick={() => navigate('/profil')}>
            <IconChevronLeft size={18} />
          </button>
          <div className="adm-brand">
            <span className="brand">Yogella</span>
            <span className="adm-tag">Admin</span>
          </div>
          <SectionMenu />
          {user && (
            <div className="adm-user-chip" title={user.email}>
              <span className="adm-user-chip-text">
                <span className="adm-user-chip-name">{user.name}</span>
                <span className="adm-user-chip-mail">{user.email}</span>
              </span>
              <span className="adm-avatar">{user.initial}</span>
            </div>
          )}
        </div>
      </header>

      <main className="adm-content">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Menu déroulant des sections : le bouton affiche la section ouverte, la liste
 * s'ouvre en glissant sous lui. Fermeture au choix d'une section, au toucher
 * en dehors ou avec Échap ; flèches haut/bas pour parcourir au clavier.
 */
function SectionMenu() {
  const { pathname } = useLocation()
  const panelId = useId()
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const current =
    SECTIONS.find((s) => (s.end ? pathname === s.to || pathname === `${s.to}/` : pathname.startsWith(s.to))) ?? SECTIONS[0]
  const CurrentIcon = current.icon

  function open() {
    clearTimeout(timer.current)
    setPhase('open')
  }

  // Stable (setters et refs seulement) : l'effet ci-dessous ne se réabonne qu'à l'ouverture.
  const close = useCallback((focusTrigger = true) => {
    setPhase((p) => (p === 'open' ? 'closing' : p))
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase('closed'), still ? 0 : MENU_CLOSE_MS)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  // Ouvert : focus sur la section courante, Échap et clic extérieur pour fermer.
  useEffect(() => {
    if (phase !== 'open') return
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>('.adm-menu-item.active') ?? panel?.querySelector<HTMLElement>('.adm-menu-item'))?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = [...(panelRef.current?.querySelectorAll<HTMLElement>('.adm-menu-item') ?? [])]
      const i = items.indexOf(document.activeElement as HTMLElement)
      const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]
      next?.focus()
      e.preventDefault()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [phase, close])

  return (
    <div className="adm-menu">
      <button
        ref={triggerRef}
        type="button"
        className="adm-menu-trigger"
        aria-haspopup="true"
        aria-expanded={phase === 'open'}
        aria-controls={panelId}
        onClick={() => (phase === 'open' ? close() : open())}
      >
        <span className="adm-menu-icon" aria-hidden="true">
          <CurrentIcon size={19} />
        </span>
        <span className="adm-menu-text">
          <span className="adm-menu-eyebrow">Section</span>
          <span className="adm-menu-label">{current.label}</span>
        </span>
        <IconChevronRight size={18} className="adm-menu-chevron" />
      </button>

      {phase !== 'closed' && (
        <>
          {createPortal(<div className={`adm-menu-scrim${phase === 'closing' ? ' is-closing' : ''}`} aria-hidden="true" />, document.body)}
          <nav ref={panelRef} id={panelId} className={`adm-menu-panel${phase === 'closing' ? ' is-closing' : ''}`} aria-label="Sections de l'administration">
            {SECTIONS.map(({ to, label, desc, icon: Icon, end }, i) => {
              const active = to === current.to
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`adm-menu-item${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  style={{ '--i': i } as CSSProperties}
                  onClick={() => close()}
                >
                  <span className="adm-menu-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="adm-menu-text">
                    <span className="adm-menu-item-label">{label}</span>
                    <span className="adm-menu-item-desc">{desc}</span>
                  </span>
                  {active && <IconCheck size={17} strokeWidth={3} className="adm-menu-check" />}
                </NavLink>
              )
            })}
          </nav>
        </>
      )}
    </div>
  )
}
