import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconChevronLeft } from '../../components/icons'

const TABS = [
  { to: '/admin', label: 'Cours', end: true },
  { to: '/admin/programmes', label: 'Programmes' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs' },
  { to: '/admin/abonnements', label: 'Abonnements' },
  { to: '/admin/notifications', label: 'Notifications' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div className="screen-tight">
      <div className="screen-header">
        <button className="icon-btn" onClick={() => navigate('/profil')}>
          <IconChevronLeft size={17} />
        </button>
        <h1>Administration</h1>
        <span className="tag" style={{ background: 'var(--color-neutral-700)', color: '#fff', marginLeft: 'auto' }}>
          Admin
        </span>
      </div>
      <div className="admin-tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `admin-pill${isActive ? ' active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
