/** Messages FR pour erreurs d’authentification (Supabase / compat.) */
export function getAuthErrorMessage(err) {
  const code = err?.code ?? err?.status
  const msg = typeof err?.message === 'string' ? err.message : ''

  const byCode = {
    'auth/email-already-in-use': 'Cette adresse e-mail est déjà utilisée.',
    'invalid_credentials': 'E-mail ou mot de passe incorrect.',
    weak_password: 'Mot de passe trop faible (respectez les exigences).',
    user_already_exists: 'Un compte existe déjà avec cet e-mail.',
  }
  if (code && byCode[code]) return byCode[code]

  const lower = msg.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid credentials'))
    return 'E-mail ou mot de passe incorrect.'
  if (lower.includes('email not confirmed'))
    return 'Confirmez votre adresse e-mail avant de vous connecter.'
  if (lower.includes('user already registered'))
    return 'Cette adresse e-mail est déjà utilisée.'
  if (lower.includes('password')) return 'Mot de passe invalide ou trop faible.'
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Problème de réseau. Vérifiez votre connexion.'

  return msg || 'Une erreur est survenue. Réessayez.'
}
