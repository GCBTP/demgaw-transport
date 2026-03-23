import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../supabase/client'
import { getAuthErrorMessage } from '../utils/authErrors'

export function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Supabase échange automatiquement le code PKCE au chargement de la page
    // et déclenche PASSWORD_RECOVERY via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Vérifier si une session recovery est déjà active (rechargement de page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Réinitialisation" subtitle="Vérification du lien…">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout title="Mot de passe modifié" subtitle="Vous allez être redirigé vers la connexion.">
        <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Mot de passe mis à jour avec succès !
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe pour votre compte."
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
        <Input
          name="password"
          type="password"
          label="Nouveau mot de passe"
          placeholder="••••••••"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          name="confirm"
          type="password"
          label="Confirmer le mot de passe"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
        </Button>
      </form>
    </AuthLayout>
  )
}
