import { NavLink } from 'react-router-dom'
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
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {/* Visible uniquement quand la barre devient un rail latéral. */}
      <div className="tabbar-brand">Yogella</div>
      <div className="tabs">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
            <span className="tab-icon">
              <Icon size={21} strokeWidth={2.4} />
            </span>
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
