import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { api, ApiError } from '../lib/api'
import { IconChevronRight } from '../components/icons'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Profil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const flash = useToast()

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

  const renewal = sub.currentPeriodEnd ? ` — prochaine échéance le ${formatDate(sub.currentPeriodEnd)}` : ''
  const subLine = hasAccess
    ? sub.status === 'TRIALING'
      ? `Essai gratuit${sub.trialEnd ? ` jusqu'au ${formatDate(sub.trialEnd)}` : ''}`
      : sub.plan === 'ANNUAL'
      ? `Annuel · 99 €${renewal}`
      : sub.plan === 'MONTHLY'
      ? `Mensuel · 12 €${renewal}`
      : `Abonnement actif${renewal}`
    : 'Aucun abonnement. Les cours premium restent verrouillés.'

  const rows = [
    ...(user.isAdmin ? [{ label: 'Administration', go: () => navigate('/admin') }] : []),
    { label: 'Nos experts', go: () => navigate('/experts') },
    { label: 'Mes téléchargements', go: () => flash('Écran non maquetté') },
    { label: 'Rappels de pratique', go: () => flash('Écran non maquetté') },
    { label: 'Aide & contact', go: () => flash('Écran non maquetté') },
    { label: 'Se déconnecter', go: () => logout().then(() => navigate('/login')) },
  ]

  return (
    <div className="screen">
      <h1 style={{ fontSize: 25, margin: 0 }}>Profil</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 62, height: 62, borderRadius: 999, background: 'var(--color-accent-200)', color: 'var(--color-accent-800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 22,
          }}
        >
          {user.initial}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{user.name}</span>
            {user.isAdmin && (
              <span className="tag" style={{ background: 'var(--color-neutral-800)', color: '#fff' }}>
                Admin
              </span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 28, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          background: hasAccess ? 'var(--color-accent-2-100)' : 'var(--color-accent-100)',
          border: `1px solid ${hasAccess ? 'var(--color-accent-2-300)' : 'var(--color-accent-300)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: hasAccess ? 'var(--color-accent-2-800)' : 'var(--color-accent-800)',
            }}
          >
            Abonnement
          </span>
          <span className="tag" style={{ background: hasAccess ? 'var(--color-accent-2-700)' : 'var(--color-neutral-600)', color: '#fff' }}>
            {hasAccess ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div style={{ fontSize: 14.5, color: hasAccess ? 'var(--color-accent-2-800)' : 'var(--color-accent-800)' }}>{subLine}</div>
        <button
          className="btn"
          style={{ background: hasAccess ? 'var(--color-neutral-700)' : 'var(--color-accent-600)', color: '#fff', padding: 12, fontSize: 14 }}
          disabled={manageSubscription.isPending}
          onClick={() => (hasAccess ? manageSubscription.mutate() : navigate('/abonnement'))}
        >
          {hasAccess ? 'Gérer mon abonnement' : "S'abonner"}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.go}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 4px',
              borderBottom: '1px solid var(--color-divider)', cursor: 'pointer', fontSize: 14.5,
              background: 'none', border: 0, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--color-divider)',
              width: '100%', textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
            }}
          >
            <span>{r.label}</span>
            <IconChevronRight size={17} className="chevron" />
          </button>
        ))}
      </div>
    </div>
  )
}
