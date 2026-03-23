import { useCallback, useEffect, useMemo, useState } from 'react'
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
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setLoading(true)
        applySession(session)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
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
    }),
    [user, loading, login, loginWithGoogle, register, logout, isAdmin, isDriver],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
