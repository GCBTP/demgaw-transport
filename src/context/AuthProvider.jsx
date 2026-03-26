import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase/client'
import { fetchUserProfile } from '../supabase/profiles'
import { AuthContext } from './auth-context'

function mapUser(u, profile = { role: 'client', driverOperator: null }) {
  if (!u) return null
  const meta = u.user_metadata ?? {}
  const name =
    meta.full_name ||
    meta.display_name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() ||
    null
  const role = profile.role
  const phone =
    typeof meta.phone === 'string' && meta.phone.trim().length > 0
      ? meta.phone.trim()
      : null
  return {
    id: u.id,
    uid: u.id,
    email: u.email ?? undefined,
    displayName: name || null,
    role,
    driverOperator: profile.driverOperator ?? null,
    phone,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoverySession, setRecoverySession] = useState(false)
  // Ref pour éviter les problèmes de closure dans onAuthStateChange
  const recoveryRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function applySession(session) {
      if (!session?.user) {
        if (!mounted) return
        setUser(null)
        setLoading(false)
        return
      }
      const profile = await fetchUserProfile(session.user.id)
      if (!mounted) return
      setUser(mapUser(session.user, profile))
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return
      if (error) {
        // Refresh token invalide — nettoyer la session corrompue
        supabase.auth.signOut().catch(() => {})
        setUser(null)
        setLoading(false)
        return
      }
      setLoading(true)
      applySession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        // Stocker la session de récupération sans connecter l'utilisateur normalement.
        // Le composant ResetPassword lira recoverySession depuis le contexte.
        recoveryRef.current = true
        setRecoverySession(true)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Si on est en mode récupération de mot de passe, ignorer le SIGNED_IN automatique
        // pour ne pas connecter l'utilisateur avant qu'il ait défini son nouveau mot de passe.
        if (recoveryRef.current) return
        setLoading(true)
        applySession(session)
      } else if (event === 'SIGNED_OUT') {
        recoveryRef.current = false
        setRecoverySession(false)
        setUser(null)
        setLoading(false)
      }
    })

    // Sur Android : quand l'app revient au premier plan après OAuth,
    // re-vérifier la session au cas où onAuthStateChange a manqué l'événement.
    let appListener = null
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive || !mounted) return
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && mounted) applySession(session)
          })
        }).then((l) => { appListener = l })
      })
    }

    return () => {
      mounted = false
      subscription.unsubscribe()
      appListener?.remove?.()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const register = useCallback(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName?.trim() ?? '' },
      },
    })
    if (error) throw error
    return data
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

    if (isCapacitor) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'sn.demgaw.transport://callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (data?.url) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url, windowName: '_self' })
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/compte` },
      })
      if (error) throw error
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Appelée par ResetPassword après avoir défini le nouveau mot de passe.
  // Charge la session normalement pour connecter l'utilisateur.
  const clearRecoverySession = useCallback(async () => {
    recoveryRef.current = false
    setRecoverySession(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const profile = await fetchUserProfile(session.user.id)
      setUser(mapUser(session.user, profile))
    }
  }, [])

  const isAdmin = user?.role === 'admin'
  const isDriver = user?.role === 'driver'

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      isAdmin,
      isDriver,
      recoverySession,
      clearRecoverySession,
    }),
    [user, loading, login, loginWithGoogle, register, logout, isAdmin, isDriver, recoverySession, clearRecoverySession],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
