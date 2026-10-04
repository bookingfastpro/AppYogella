import { useState } from 'react'
import { useAdminPlans, useUpdatePlan, useUpdateSettings, useAdminStats, type AdminPlan } from '../../lib/adminHooks'
import { AdminPageHeader, Badge, Section, StatCard, StatGrid, Switch } from '../../components/AdminUI'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import { Loader } from '../../components/Loader'

const TRIAL_OPTIONS = [
  { label: 'Aucun', days: 0 },
  { label: '7 jours', days: 7 },
  { label: '14 jours', days: 14 },
]

/** 1200 → « 12 », 1250 → « 12,50 ». */
const formatEuros = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, '').replace('.', ',')

export default function AdminAbonnements() {
  const { data, isPending: plansPending } = useAdminPlans()
  const { data: stats, isPending: statsPending } = useAdminStats()
  const updateSettings = useUpdateSettings()
  const flash = useToast()

  async function setTrial(days: number) {
    try {
      await updateSettings.mutateAsync({ trialDays: days })
      flash(days ? `Essai gratuit de ${days} jours pour les nouvelles abonnées` : 'Essai gratuit désactivé')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Modification impossible')
    }
  }

  if (plansPending || statsPending) return <Loader />

  return (
    <div className="adm-page">
      <AdminPageHeader title="Abonnements" description="Revenus, prix des formules et durée de l'essai gratuit." />

      <StatGrid>
        <StatCard label="Revenus mensuels" value={stats?.mrr ?? '—'} hint="estimation, annuels lissés" tone="sage" />
        <StatCard label="Abonnées actives" value={stats?.activeCount ?? 0} tone="terracotta" />
        <StatCard label="En essai" value={stats?.trialCount ?? 0} tone="sand" />
      </StatGrid>

      <Section title="Formules">
        <div className="adm-plan-grid">
          {(data?.plans ?? []).map((p) => (
            <PlanCard key={p.key} plan={p} />
          ))}
        </div>
      </Section>

      <Section title="Essai gratuit">
        <p className="adm-help" style={{ marginTop: 0 }}>
          Appliqué aux nouveaux abonnements souscrits par Stripe. Les abonnements en cours ne changent pas.
        </p>
        <div className="adm-segmented" role="radiogroup" aria-label="Durée de l'essai gratuit">
          {TRIAL_OPTIONS.map((t) => (
            <button
              key={t.label}
              type="button"
              role="radio"
              aria-checked={data?.trialDays === t.days}
              className={data?.trialDays === t.days ? 'active' : ''}
              disabled={updateSettings.isPending}
              onClick={() => setTrial(t.days)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function PlanCard({ plan }: { plan: AdminPlan }) {
  const updatePlan = useUpdatePlan()
  const flash = useToast()
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? formatEuros(plan.priceCents)

  async function savePrice() {
    if (draft === null) return
    const cents = Math.round(parseFloat(draft.replace(',', '.').replace(/[^\d.]/g, '')) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      flash('Prix invalide')
      setDraft(null)
      return
    }
    if (cents === plan.priceCents) {
      setDraft(null)
      return
    }
    try {
      await updatePlan.mutateAsync({ key: plan.key, price: draft })
      flash(`${plan.title} : ${formatEuros(cents)} €`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Prix non enregistré')
    }
    setDraft(null)
  }

  async function toggleActive(active: boolean) {
    try {
      await updatePlan.mutateAsync({ key: plan.key, active })
      flash(active ? `${plan.title} remise en vente` : `${plan.title} retirée de la vente`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Modification impossible')
    }
  }

  const id = `price-${plan.key}`
  return (
    <div className={`adm-plan${plan.active ? '' : ' off'}`}>
      <div className="adm-plan-head">
        <div>
          <div className="adm-plan-title">{plan.title}</div>
          <div className="adm-row-meta">
            {plan.subscriberCount} abonnée{plan.subscriberCount > 1 ? 's' : ''}
          </div>
        </div>
        <Badge tone={plan.active ? 'sage' : 'neutral'}>{plan.active ? 'En vente' : 'Retirée'}</Badge>
      </div>
      <div className="field">
        <label htmlFor={id}>Prix {plan.key === 'ANNUAL' ? 'par an' : 'par mois'}</label>
        <div className="adm-price">
          <input
            id={id}
            className="input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={savePrice}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
          <span aria-hidden="true">€</span>
        </div>
      </div>
      <Switch label="Proposée à la vente" checked={plan.active} disabled={updatePlan.isPending} onChange={toggleActive} />
    </div>
  )
}
