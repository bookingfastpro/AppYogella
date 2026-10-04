import { useId, type ReactNode } from 'react'
import { IconSearch, IconX } from './icons'

/**
 * Briques communes des pages d'administration : en-tête de page, cartes de
 * chiffres clés, barre de recherche et filtres, badges, interrupteur et état
 * vide. Les styles vivent dans app.css (préfixe « adm- »).
 */

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="adm-page-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="adm-page-title">{title}</h2>
        {description && <p className="adm-page-desc">{description}</p>}
      </div>
      {action}
    </header>
  )
}

export type Tone = 'neutral' | 'sage' | 'terracotta' | 'sand' | 'danger'

export function StatCard({ label, value, hint, tone = 'neutral' }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <div className={`adm-stat tone-${tone}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      {hint && <div className="adm-stat-hint">{hint}</div>}
    </div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="adm-stats">{children}</div>
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`adm-badge tone-${tone}`}>{children}</span>
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="adm-search">
      <IconSearch size={16} />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="adm-search-clear" aria-label="Effacer la recherche" onClick={() => onChange('')}>
          <IconX size={13} />
        </button>
      )}
    </div>
  )
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="adm-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`adm-chip${o.value === value ? ' active' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="adm-chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Barre d'outils au-dessus d'une liste : recherche puis filtres. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="adm-toolbar">{children}</div>
}

/** Interrupteur accessible (rôle switch), avec libellé cliquable. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="adm-switch-row">
      <div style={{ minWidth: 0 }}>
        <label htmlFor={id} className="adm-switch-label">{label}</label>
        {description && <div className="adm-switch-desc">{description}</div>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`adm-switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="adm-switch-knob" />
      </button>
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty-icon">{icon}</span>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
      {action}
    </div>
  )
}

/** Carte de section : titre, compteur facultatif, contenu. */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-section">
      <div className="adm-section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}
