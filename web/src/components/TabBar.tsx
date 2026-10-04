import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useNotifications } from '../lib/hooks'
import { IconHome, IconSearch, IconPulse, IconCalendar, IconUser } from './icons'

// Cinq onglets au plus sur mobile : les favoris restent accessibles depuis le
// Profil et depuis chaque séance.
const TABS = [
  { to: '/home', label: 'Accueil', Icon: IconHome, end: true },
  { to: '/recherche', label: 'Recherche', Icon: IconSearch },
  { to: '/reserver', label: 'Studio', Icon: IconCalendar },
  { to: '/pratique', label: 'Ma pratique', Icon: IconPulse },
  { to: '/profil', label: 'Profil', Icon: IconUser },
]

export function TabBar() {
  const { user } = useAuth()
  // Même requête que la cloche (cache partagé) : le badge de l'onglet Accueil
  // signale les notifications non lues depuis n'importe quel écran.
  const { data } = useNotifications(!!user)
  const unread = data?.unreadCount ?? 0

  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {/* Visible uniquement quand la barre devient un rail latéral. */}
      <div className="tabbar-brand">Yogella</div>
      <div className="tabs">
        {TABS.map(({ to, label, Icon, end }) => {
          const badge = to === '/home' && unread > 0
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
              aria-label={badge ? `${label}, ${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : undefined}
            >
              <span className="tab-icon">
                <Icon size={21} strokeWidth={2.4} />
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
