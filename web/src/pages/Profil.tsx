import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { usePlans } from '../lib/hooks'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui'
import { IconChevronRight, IconHeart, IconLayers, IconLogOut, IconPulse, IconCard } from '../components/icons'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Profil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const flash = useToast()
  const { data: plans } = usePlans()

  const manageSubscription = useMutation({
    mutationFn: () => api.post<{ url: string }>('/api/subscription/portal'),
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (err) => flash(err instanceof ApiError ? err.message : 'Une erreur est survenue'),
  })

  if (!user) return null
  const sub = user.subscription
  const hasAccess = user.hasAccess
  const planPrice = plans?.plans.find((p) => p.key === sub.plan)?.price

  const subTitle = hasAccess
    ? sub.status === 'TRIALING'
      ? 'Essai gratuit'
      : sub.plan === 'ANNUAL'
      ? 'Formule annuelle'
      : sub.plan === 'MONTHLY'
      ? 'Formule mensuelle'
      : 'Abonnement actif'
    : 'Aucun abonnement'
  const subDetail = hasAccess
    ? sub.status === 'TRIALING'
      ? sub.trialEnd
        ? `Jusqu'au ${formatDate(sub.trialEnd)}`
        : 'Accès complet pendant l’essai'
      : [planPrice && `${planPrice} / ${sub.plan === 'ANNUAL' ? 'an' : 'mois'}`, sub.currentPeriodEnd && `renouvellement le ${formatDate(sub.currentPeriodEnd)}`]
          .filter(Boolean)
          .join(' · ') || 'Toutes les séances sont débloquées'
    : 'Les séances premium restent verrouillées.'

  const rows = [
    ...(user.isAdmin ? [{ label: 'Administration', icon: IconLayers, go: () => navigate('/admin') }] : []),
    { label: 'Mes favoris', icon: IconHeart, go: () => navigate('/favoris') },
    { label: 'Ma pratique', icon: IconPulse, go: () => navigate('/pratique') },
  ]

  return (
    <div className="screen">
      <PageHeader title="Profil" />

      <section className="profile-card">
        <span className="profile-avatar" aria-hidden="true">{user.initial}</span>
        <div style={{ minWidth: 0 }}>
          <div className="profile-name">
            {user.name}
            {user.isAdmin && <span className="profile-badge">Admin</span>}
          </div>
          <div className="profile-mail">{user.email}</div>
          <div className="profile-since">
            Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </section>

      <section className={`sub-card${hasAccess ? ' on' : ''}`} aria-label="Abonnement">
        <div className="sub-card-head">
          <span className="sub-card-icon" aria-hidden="true">
            <IconCard size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sub-card-title">{subTitle}</div>
            <div className="sub-card-detail">{subDetail}</div>
          </div>
          <span className="sub-card-status">{hasAccess ? 'Actif' : 'Inactif'}</span>
        </div>
        <button
          type="button"
          className={`btn ${hasAccess ? 'ui-btn-soft' : 'ui-btn-primary'}`}
          disabled={manageSubscription.isPending}
          onClick={() => (hasAccess ? manageSubscription.mutate() : navigate('/abonnement'))}
        >
          {hasAccess ? (manageSubscription.isPending ? 'Ouverture…' : 'Gérer mon abonnement') : 'Découvrir les formules'}
        </button>
      </section>

      <nav className="menu-list" aria-label="Raccourcis">
        {rows.map(({ label, icon: Icon, go }) => (
          <button key={label} type="button" className="menu-row" onClick={go}>
            <span className="menu-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="menu-label">{label}</span>
            <IconChevronRight size={17} className="chevron" />
          </button>
        ))}
      </nav>

      <button type="button" className="btn btn-danger btn-block" onClick={() => logout().then(() => navigate('/login'))}>
        <IconLogOut size={18} />
        Se déconnecter
      </button>
    </div>
  )
}
