import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { usePlans } from '../lib/hooks'
import { useToast } from '../lib/ToastContext'
import { api, ApiError } from '../lib/api'
import { IconX, IconLock, IconCheck } from '../components/icons'
import { Loader } from '../components/Loader'

const PERKS = [
  'Plus de 300 cours vidéo',
  'Programmes guidés complets',
  'Téléchargement hors connexion',
  'Nouveaux cours chaque semaine',
]

export default function Paywall() {
  const navigate = useNavigate()
  const flash = useToast()
  const { data, isPending } = usePlans()
  const [plan, setPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL')

  const checkout = useMutation({
    mutationFn: () => api.post<{ url: string }>('/api/subscription/checkout', { plan }),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (err) => flash(err instanceof ApiError ? err.message : 'Une erreur est survenue'),
  })

  const plans = data?.plans ?? []
  const selected = plans.find((p) => p.key === plan)

  if (isPending) return <Loader />

  return (
    <div className="screen" style={{ padding: '6px 22px 30px', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => navigate(-1)}>
          <IconX size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            width: 64, height: 64, borderRadius: 999, background: 'var(--color-accent-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconLock size={28} />
        </span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>Accès illimité</h1>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>
          Tous les cours, programmes et auto-massages, sans limite et hors connexion.
        </p>
      </div>
      <div className="plan-options" role="radiogroup" aria-label="Formule d'abonnement">
        {plans.map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={plan === p.key}
            className={`plan-option${plan === p.key ? ' selected' : ''}`}
            onClick={() => setPlan(p.key)}
          >
            <span className="plan-radio" aria-hidden="true" />
            <span style={{ flex: 1 }}>
              <span className="plan-name">
                {p.title}
                {p.key === 'ANNUAL' && <span className="plan-save">2 mois offerts</span>}
              </span>
              <span className="plan-note">Sans engagement</span>
            </span>
            <span className="plan-price">{p.price}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 4px' }}>
        {PERKS.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <IconCheck size={18} style={{ color: 'var(--color-accent-2-600)' }} />
            <span>{k}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={checkout.isPending || !selected}
        onClick={() => checkout.mutate()}
      >
        {checkout.isPending
          ? 'Redirection vers le paiement…'
          : selected
          ? `Continuer — ${selected.price} / ${plan === 'ANNUAL' ? 'an' : 'mois'}`
          : 'Continuer'}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
        Sans engagement, résiliable à tout moment.
        <br />
        Renouvellement automatique.
      </div>
    </div>
  )
}
