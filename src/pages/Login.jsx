import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { fetchUserRole } from '../supabase/profiles'
import { supabase } from '../supabase/client'
import { getAuthErrorMessage } from '../utils/authErrors'

export function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/compte'
  const registeredHint = location.state?.registered

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Entrez votre e-mail pour réinitialiser le mot de passe.')
      return
    }
    setResetBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/compte`,
      })
      if (err) throw err
      setResetSent(true)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setResetBusy(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        if (role === 'driver') {
          navigate('/chauffeur', { replace: true })
          return
        }
      }
      navigate(from, { replace: true })
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
      title="Connexion"
      subtitle="Accédez à vos réservations et billets."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-800 hover:underline"
          >
            S&apos;inscrire
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {registeredHint ? (
          <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            Compte créé. Si la confirmation e-mail est activée sur le projet,
            ouvrez le lien reçu puis connectez-vous.
          </p>
        ) : null}
        {resetSent ? (
          <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            Un e-mail de réinitialisation a été envoyé. Vérifiez votre boîte mail.
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
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
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              name="remember"
              className="rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            Se souvenir de moi
          </label>
          <a
            href="#"
            className="font-medium text-brand-800 hover:underline"
            onClick={handleForgotPassword}
          >
            {resetBusy ? 'Envoi…' : 'Mot de passe oublié ?'}
          </a>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
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
