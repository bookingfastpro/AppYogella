import type { ReactNode } from 'react'
// Photos de fond : portrait sur mobile, paysage à partir de 1024px (même
// seuil que la mise en page desktop dans app.css).
import backgroundMobile from '../assets/auth-bg-mobile.webp'
import backgroundDesktop from '../assets/auth-bg-desktop.webp'

/**
 * Écran plein cadre des pages publiques : photo bord à bord, marque et
 * accroche en haut, actions en bas (panneau à droite sur desktop, au-dessus
 * de la mer pour ne pas couvrir la personne).
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="auth-hero">
      <picture>
        <source media="(min-width: 1024px)" srcSet={backgroundDesktop} />
        <img className="auth-hero-bg" src={backgroundMobile} alt="" />
      </picture>
      <div className="auth-hero-shade" />
      <div className="auth-hero-content">
        <header className="auth-hero-brand">
          <h1 className="auth-hero-logo">Yogella</h1>
          <p className="auth-hero-tagline">
            Un corps plus libre
            <br />
            Un esprit plus doux
          </p>
        </header>
        <div className="auth-hero-panel">{children}</div>
      </div>
    </div>
  )
}
