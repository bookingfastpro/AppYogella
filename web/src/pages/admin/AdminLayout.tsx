import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { IconBell, IconCalendar, IconCard, IconChevronLeft, IconLayers, IconLogOut, IconPlayCircle, IconUsers } from '../../components/icons'

const TABS = [
  { to: '/admin', label: 'Cours', icon: IconPlayCircle, end: true },
  { to: '/admin/programmes', label: 'Programmes', icon: IconLayers },
  { to: '/admin/planning', label: 'Planning', icon: IconCalendar },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: IconUsers },
  { to: '/admin/abonnements', label: 'Abonnements', icon: IconCard },
  { to: '/admin/notifications', label: 'Notifications', icon: IconBell },
]

/**
 * Coquille de l'administration. Mobile : en-tête et onglets défilants en haut.
 * Desktop : barre latérale fixe à gauche, contenu à largeur de lecture à droite.
 */
export default function AdminLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const tabsRef = useRef<HTMLElement>(null)

  // Sur mobile, les onglets défilent : on ramène l'onglet actif dans le champ.
  useEffect(() => {
    const nav = tabsRef.current
    const active = nav?.querySelector<HTMLElement>('.adm-tab.active')
    if (!nav || !active) return
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="adm-layout">
      <aside className="adm-sidebar" aria-label="Administration">
        <div className="adm-sidebar-brand">
          <span className="brand">Yogella</span>
          <span className="adm-sidebar-tag">Admin</span>
        </div>
        <nav className="adm-sidebar-nav">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `adm-nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          {user && (
            <div className="adm-sidebar-user">
              <span className="adm-avatar">{user.initial}</span>
              <div style={{ minWidth: 0 }}>
                <div className="adm-sidebar-user-name">{user.name}</div>
                <div className="adm-sidebar-user-mail">{user.email}</div>
              </div>
            </div>
          )}
          <button type="button" className="adm-nav-item" onClick={() => navigate('/profil')}>
            <IconLogOut size={18} />
            Retour à l'application
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="icon-btn" aria-label="Retour au profil" onClick={() => navigate('/profil')}>
            <IconChevronLeft size={17} />
          </button>
          <h1>Administration</h1>
          <span className="adm-sidebar-tag">Admin</span>
        </header>
        <nav ref={tabsRef} className="adm-tabs" aria-label="Sections de l'administration">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `adm-tab${isActive ? ' active' : ''}`}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
