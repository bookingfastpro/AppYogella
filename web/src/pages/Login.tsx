import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { ApiError } from '../lib/api'
import { AuthScreen } from '../components/AuthScreen'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: Location; showForm?: boolean } | null
  // L'écran s'ouvre sur l'accueil (Commencer / Se connecter) ; le formulaire
  // s'affiche directement quand on vient du lien « Se connecter » de l'inscription.
  const [showForm, setShowForm] = useState(!!state?.showForm)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate(state?.from?.pathname ?? '/home', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue')
    } finally {
      setBusy(false)
    }
  }

  if (!showForm) {
    return (
      <AuthScreen>
        <Link to="/register" className="auth-hero-cta">
          Commencer
        </Link>
        <p className="auth-hero-switch">
          Déjà un compte ?{' '}
          <button type="button" onClick={() => setShowForm(true)}>
            Se connecter
          </button>
        </p>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <form className="auth-hero-form" onSubmit={onSubmit}>
        {error && <div className="auth-hero-error" role="alert">{error}</div>}
        <input
          className="auth-hero-input"
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="auth-hero-input"
          type="password"
          placeholder="Mot de passe"
          aria-label="Mot de passe"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="auth-hero-cta" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="auth-hero-switch">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </AuthScreen>
  )
}
