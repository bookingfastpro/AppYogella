import type { ReactNode } from 'react'
import { IconSearch, IconX } from './icons'

/**
 * Briques communes des écrans de l'application (côté utilisatrice) : en-tête
 * de page, champ de recherche, état vide. Styles dans app.css (préfixe « ui- »).
 */

export function PageHeader({ title, subtitle, aside }: { title: string; subtitle?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="ui-page-head">
      <div style={{ minWidth: 0 }}>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      {aside}
    </header>
  )
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="ui-search">
      <IconSearch size={18} strokeWidth={2.4} />
      <input type="search" enterKeyHint="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="ui-search-clear" aria-label="Effacer la recherche" onClick={() => onChange('')}>
          <IconX size={14} strokeWidth={2.6} />
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="ui-empty">
      <span className="ui-empty-icon">{icon}</span>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
      {action}
    </div>
  )
}

/** Titre de section avec lien ou compteur à droite. */
export function SectionTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="ui-section-title">
      <h2>{title}</h2>
      {aside}
    </div>
  )
}
