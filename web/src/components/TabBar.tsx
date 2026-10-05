import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useNotifications } from '../lib/hooks'
import { IconHome, IconSearch, IconPulse, IconCalendar, IconUser } from './icons'

// Cinq onglets au plus sur mobile : les favoris restent accessibles depuis le
// Profil et depuis chaque séance. « Explorer » ouvre la recherche et reste
// actif dans tout le catalogue (univers, catégories, humeurs).
const TABS = [
  { to: '/home', label: 'Accueil', Icon: IconHome },
  { to: '/recherche', label: 'Explorer', Icon: IconSearch, also: ['/explorer', '/categorie', '/humeur', '/experts'] },
  { to: '/reserver', label: 'Studio', Icon: IconCalendar },
  { to: '/pratique', label: 'Ma pratique', Icon: IconPulse },
  { to: '/profil', label: 'Profil', Icon: IconUser, also: ['/favoris'] },
]

export function TabBar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Même requête que la cloche (cache partagé) : le badge de l'onglet Accueil
  // signale les notifications non lues depuis n'importe quel écran.
  const { data } = useNotifications(!!user)
  const unread = data?.unreadCount ?? 0

  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {/* Visible uniquement quand la barre devient un rail latéral. */}
      <div className="tabbar-brand">Yogella</div>
      <div className="tabs">
        {TABS.map(({ to, label, Icon, also }) => {
          const badge = to === '/home' && unread > 0
          const active = [to, ...(also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
          return (
            <NavLink
              key={to}
              to={to}
              className={`tab-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={badge ? `${label}, ${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : undefined}
            >
              <span className="tab-icon">
                <Icon size={21} strokeWidth={active ? 2.5 : 2.1} />
                {badge && (
                  <span className="tab-badge" aria-hidden="true">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className="tab-label">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
