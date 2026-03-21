import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/authErrors'

export function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const displayName = [firstName, lastName].filter(Boolean).join(' ')
      const data = await register(email, password, displayName)
      if (data?.session) {
        navigate('/compte', { replace: true })
      } else {
        navigate('/login', { replace: true, state: { registered: true } })
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleAuth() {
    setError('')
    setSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(getAuthErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez DemGaw en quelques secondes."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-800 hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="firstName"
            label="Prénom"
            placeholder="Aïssatou"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            name="lastName"
            label="Nom"
            placeholder="Diop"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <Input
          name="email"
          type="email"
          label="E-mail"
          placeholder="vous@exemple.sn"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          name="password"
          type="password"
          label="Mot de passe"
          placeholder="6 caractères minimum"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
          />
          <span>
            J&apos;accepte les{' '}
            <a
              href="#"
              className="font-medium text-brand-800 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              conditions d&apos;utilisation
            </a>{' '}
            et la politique de confidentialité.
          </span>
        </label>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? 'Création du compte…' : "S'inscrire"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          size="lg"
          onClick={() => void handleGoogleAuth()}
          disabled={submitting}
        >
          Continuer avec Google
        </Button>
      </form>
    </AuthLayout>
  )
}
