import { useState } from 'react'
import { useAdminUsers, useUpdateUser, type AdminUser } from '../../lib/adminHooks'
import { EditSheet } from '../../components/AdminEdit'
import { AdminPageHeader, Badge, EmptyState, FilterChips, SearchField, StatCard, StatGrid, Switch, Toolbar, matches, type Tone } from '../../components/AdminUI'
import { useToast } from '../../lib/ToastContext'
import { useAuth } from '../../lib/AuthContext'
import { ApiError } from '../../lib/api'
import { IconPencil, IconSearch, IconUsers } from '../../components/icons'
import { Loader } from '../../components/Loader'

type PlanChoice = 'Aucun' | 'Essai' | 'Mensuel' | 'Annuel'
type Filter = 'all' | 'subscribed' | 'trial' | 'none' | 'suspended'

const PLAN_OPTIONS: { value: PlanChoice; label: string }[] = [
  { value: 'Aucun', label: 'Aucun abonnement' },
  { value: 'Essai', label: 'Essai gratuit' },
  { value: 'Mensuel', label: 'Mensuel' },
  { value: 'Annuel', label: 'Annuel' },
]

const PLAN_TONE: Record<AdminUser['plan'], Tone> = {
  Aucun: 'neutral',
  Essai: 'sand',
  Mensuel: 'sage',
  Annuel: 'sage',
  Actif: 'sage',
}

const isSubscribed = (u: AdminUser) => u.plan === 'Mensuel' || u.plan === 'Annuel' || u.plan === 'Actif'

export default function AdminUtilisateurs() {
  const { data, isPending } = useAdminUsers()
  const updateUser = useUpdateUser()
  const flash = useToast()
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<AdminUser | null>(null)

  async function changePlan(u: AdminUser, plan: PlanChoice) {
    try {
      await updateUser.mutateAsync({ id: u.id, plan })
      flash(`Abonnement de ${u.name} : ${PLAN_OPTIONS.find((o) => o.value === plan)?.label}`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Impossible de changer l'abonnement")
    }
  }

  async function toggleActive(u: AdminUser) {
    // Suspendre coupe l'accès à l'application : on demande confirmation.
    if (u.active && !window.confirm(`Suspendre le compte de ${u.name} ? Il ne pourra plus se connecter.`)) return
    try {
      await updateUser.mutateAsync({ id: u.id, active: !u.active })
      flash(u.active ? `Compte de ${u.name} suspendu` : `Compte de ${u.name} réactivé`)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Modification impossible')
    }
  }

  if (isPending) return <Loader />

  const users = data?.users ?? []
  const counts = {
    all: users.length,
    subscribed: users.filter(isSubscribed).length,
    trial: users.filter((u) => u.plan === 'Essai').length,
    none: users.filter((u) => u.plan === 'Aucun').length,
    suspended: users.filter((u) => !u.active).length,
  }
  const shown = users.filter(
    (u) =>
      (filter === 'all' ||
        (filter === 'subscribed' && isSubscribed(u)) ||
        (filter === 'trial' && u.plan === 'Essai') ||
        (filter === 'none' && u.plan === 'Aucun') ||
        (filter === 'suspended' && !u.active)) &&
      (!query || matches(`${u.name} ${u.email}`, query)),
  )

  return (
    <div className="adm-page">
      <AdminPageHeader title="Utilisateurs" description="Comptes, abonnements attribués à la main et accès à l'application." />

      <StatGrid>
        <StatCard label="Comptes" value={counts.all} />
        <StatCard label="Abonnées" value={counts.subscribed} tone="sage" />
        <StatCard label="En essai" value={counts.trial} tone="sand" />
        <StatCard label="Suspendus" value={counts.suspended} tone={counts.suspended ? 'danger' : 'neutral'} />
      </StatGrid>

      <Toolbar>
        <SearchField value={query} onChange={setQuery} label="Rechercher un compte" placeholder="Nom ou e-mail…" />
        <FilterChips
          label="Filtrer les comptes"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous', count: counts.all },
            { value: 'subscribed', label: 'Abonnées', count: counts.subscribed },
            { value: 'trial', label: 'Essai', count: counts.trial },
            { value: 'none', label: 'Sans abonnement', count: counts.none },
            { value: 'suspended', label: 'Suspendus', count: counts.suspended },
          ]}
        />
      </Toolbar>

      {users.length === 0 ? (
        <EmptyState icon={<IconUsers size={24} />} title="Aucun compte" text="Les inscriptions apparaîtront ici." />
      ) : shown.length === 0 ? (
        <EmptyState icon={<IconSearch size={22} />} title="Aucun compte ne correspond" text="Modifiez la recherche ou le filtre." />
      ) : (
        <ul className="adm-list" aria-label="Comptes">
          {shown.map((u) => {
            const isSelf = u.id === me?.id
            return (
              <li key={u.id} className={`adm-row adm-user${u.active ? '' : ' suspended'}`}>
                <span className="adm-avatar">{u.initial}</span>
                <div className="adm-row-body">
                  <div className="adm-row-title">
                    {u.name}
                    {u.isAdmin && <Badge tone="neutral">Admin</Badge>}
                    {isSelf && <span className="adm-you">vous</span>}
                  </div>
                  <div className="adm-row-meta adm-ellipsis">{u.email}</div>
                  <div className="adm-row-tags">
                    <Badge tone={PLAN_TONE[u.plan]}>{u.plan === 'Actif' ? 'Abonnement actif' : u.plan === 'Aucun' ? 'Sans abonnement' : u.plan}</Badge>
                    <Badge tone={u.active ? 'sage' : 'danger'}>{u.active ? 'Compte actif' : 'Suspendu'}</Badge>
                  </div>
                </div>
                <div className="adm-user-controls">
                  <select
                    className="adm-select compact"
                    aria-label={`Abonnement de ${u.name}`}
                    value={u.plan === 'Actif' ? '' : u.plan}
                    disabled={updateUser.isPending}
                    onChange={(e) => changePlan(u, e.target.value as PlanChoice)}
                  >
                    {u.plan === 'Actif' && <option value="">Abonnement actif</option>}
                    {PLAN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="adm-row-actions">
                    <button
                      type="button"
                      className={`adm-text-btn${u.active ? ' danger' : ''}`}
                      disabled={isSelf || updateUser.isPending}
                      title={isSelf ? 'Votre propre compte ne peut pas être suspendu' : undefined}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? 'Suspendre' : 'Réactiver'}
                    </button>
                    <button type="button" className="row-action" aria-label={`Éditer ${u.name}`} title="Éditer" onClick={() => setEditing(u)}>
                      <IconPencil size={17} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <UserEditSheet
          user={editing}
          isSelf={editing.id === me?.id}
          onClose={() => setEditing(null)}
          saving={updateUser.isPending}
          onSave={async (patch) => {
            try {
              await updateUser.mutateAsync({ id: editing.id, ...patch })
            } catch (err) {
              flash(err instanceof ApiError ? err.message : 'Enregistrement impossible')
              return
            }
            flash('Compte mis à jour')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function UserEditSheet({
  user,
  isSelf,
  onClose,
  onSave,
  saving,
}: {
  user: AdminUser
  isSelf: boolean
  onClose: () => void
  onSave: (patch: { name?: string; email?: string; isAdmin?: boolean }) => void
  saving: boolean
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)

  return (
    <EditSheet
      title="Éditer le compte"
      description="Changer l'e-mail modifie aussi l'adresse de connexion."
      onClose={onClose}
      saving={saving}
      onSave={() => onSave({ name: name.trim(), email: email.trim(), isAdmin })}
    >
      <div className="field">
        <label htmlFor="eu-name">Nom</label>
        <input id="eu-name" className="input" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="eu-email">E-mail</label>
        <input id="eu-email" className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Switch
        label="Administratrice"
        description={isSelf ? 'Vous ne pouvez pas retirer vos propres droits.' : "Accès à l'onglet Administration."}
        checked={isAdmin}
        disabled={isSelf}
        onChange={setIsAdmin}
      />
    </EditSheet>
  )
}
