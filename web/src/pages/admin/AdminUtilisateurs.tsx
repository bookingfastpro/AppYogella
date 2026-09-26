import { useState } from 'react'
import { useAdminUsers, useUpdateUser, type AdminUser } from '../../lib/adminHooks'
import { EditSheet } from '../../components/AdminEdit'
import { useToast } from '../../lib/ToastContext'
import { useAuth } from '../../lib/AuthContext'
import { ApiError } from '../../lib/api'
import { IconCircleCheck, IconCirclePause, IconPencil } from '../../components/icons'
import { Loader } from '../../components/Loader'

const PLAN_COLORS: Record<string, { bg: string; fg: string }> = {
  Aucun: { bg: 'var(--color-neutral-300)', fg: 'var(--color-neutral-800)' },
  Essai: { bg: 'var(--color-accent-200)', fg: 'var(--color-accent-800)' },
  Mensuel: { bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-800)' },
  Annuel: { bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-800)' },
  Actif: { bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-800)' },
}

export default function AdminUtilisateurs() {
  const { data, isPending } = useAdminUsers()
  const updateUser = useUpdateUser()
  const flash = useToast()
  const { user: me } = useAuth()
  const [editing, setEditing] = useState<AdminUser | null>(null)

  async function cyclePlan(u: AdminUser) {
    try {
      const res = await updateUser.mutateAsync({ id: u.id, cyclePlan: true })
      flash(`Abonnement de ${u.name} : ${(res as { user: { plan: string } }).user.plan}`)
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

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 9 }}>
        <div className="stat-tile">
          <div className="value">{data?.stats.total ?? 0}</div>
          <div className="label">comptes</div>
        </div>
        <div className="stat-tile">
          <div className="value">{data?.stats.activeSubscriptions ?? 0}</div>
          <div className="label">abonnements actifs</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(data?.users ?? []).map((u) => {
          const colors = PLAN_COLORS[u.plan]
          const isSelf = u.id === me?.id
          return (
            <div key={u.id} className="catalog-row" style={u.active ? undefined : { opacity: 0.7 }}>
              <span className="expert-avatar" style={{ width: 38, height: 38, fontSize: 15 }}>{u.initial}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {u.name}
                  {!u.active && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-accent-700)' }}> · suspendu</span>}
                </div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
              </div>
              <button
                className="tag"
                style={{ border: 0, cursor: 'pointer', background: colors.bg, color: colors.fg }}
                title="Changer d'abonnement"
                disabled={updateUser.isPending}
                onClick={() => cyclePlan(u)}
              >
                {u.plan}
              </button>
              <button className="row-action" title="Éditer" onClick={() => setEditing(u)}>
                <IconPencil size={17} />
              </button>
              <button
                style={{
                  border: 0, background: 'none', display: 'flex', padding: 2,
                  cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.35 : 1,
                  color: u.active ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)',
                }}
                title={isSelf ? 'Votre propre compte ne peut pas être suspendu' : u.active ? 'Compte actif — suspendre' : 'Compte suspendu — réactiver'}
                aria-label={u.active ? `Suspendre le compte de ${u.name}` : `Réactiver le compte de ${u.name}`}
                disabled={isSelf || updateUser.isPending}
                onClick={() => toggleActive(u)}
              >
                {u.active ? <IconCircleCheck size={20} /> : <IconCirclePause size={20} />}
              </button>
            </div>
          )
        })}
      </div>
      <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Touchez l'étiquette pour changer d'abonnement (Aucun → Essai → Mensuel → Annuel), le crayon pour
        éditer le compte. La dernière icône ne concerne pas l'abonnement : elle suspend ou réactive
        l'accès au compte.
      </div>

      {editing && (
        <UserEditSheet
          user={editing}
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
  onClose,
  onSave,
  saving,
}: {
  user: AdminUser
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
      onClose={onClose}
      saving={saving}
      onSave={() => onSave({ name: name.trim(), email: email.trim(), isAdmin })}
    >
      <div className="field">
        <label htmlFor="eu-name">Nom</label>
        <input id="eu-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="eu-email">Email</label>
        <input id="eu-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 4px', cursor: 'pointer' }}
        onClick={() => setIsAdmin((v) => !v)}
      >
        <span
          className="switch"
          style={{
            background: isAdmin ? 'var(--color-accent-600)' : 'var(--color-neutral-400)',
            justifyContent: isAdmin ? 'flex-end' : 'flex-start',
          }}
        >
          <span className="knob" />
        </span>
        <span style={{ fontSize: 13.5 }}>Administratrice</span>
      </div>
    </EditSheet>
  )
}
