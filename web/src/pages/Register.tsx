import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { ApiError } from '../lib/api'
import { AuthScreen } from '../components/AuthScreen'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(name, email, password)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen>
      <form className="auth-hero-form" onSubmit={onSubmit}>
        {error && <div className="auth-hero-error" role="alert">{error}</div>}
        <input
          className="auth-hero-input"
          placeholder="Prénom"
          aria-label="Prénom"
          autoComplete="given-name"
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="auth-hero-input"
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="auth-hero-input"
          type="password"
          placeholder="Mot de passe (8 caractères minimum)"
          aria-label="Mot de passe"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="auth-hero-cta" type="submit" disabled={busy}>
          {busy ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="auth-hero-switch">
        Déjà un compte ?{' '}
        <Link to="/login" state={{ showForm: true }}>
          Se connecter
        </Link>
      </p>
    </AuthScreen>
  )
}
