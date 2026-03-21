import { supabase } from './client'

/** @typedef {'admin' | 'client' | 'driver'} AppRole */

/**
 * @param {string} userId
 * @returns {Promise<{ role: AppRole, driverOperator: string | null }>}
 */
export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, driver_operator')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.role) {
    return { role: 'client', driverOperator: null }
  }

  const r = data.role
  let role =
    r === 'admin' ? 'admin' : r === 'driver' ? 'driver' : 'client'
  const driverOperator =
    typeof data.driver_operator === 'string' && data.driver_operator.trim()
      ? data.driver_operator.trim()
      : null
  return { role, driverOperator }
}

/**
 * @param {string} userId
 * @returns {Promise<AppRole>}
 */
export async function fetchUserRole(userId) {
  const { role } = await fetchUserProfile(userId)
  return role
}

/**
 * MVP admin : liste les utilisateurs + rôle.
 * @returns {Promise<Array<{id: string, email: string | null, role: AppRole, driverOperator: string | null}>>}
 */
export async function adminListUsers() {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error(error.message)
  return (data ?? []).map((u) => {
    const r = u.profile_role
    const role =
      r === 'admin' ? 'admin' : r === 'driver' ? 'driver' : 'client'
    const op =
      typeof u.driver_operator === 'string' && u.driver_operator.trim()
        ? u.driver_operator.trim()
        : null
    return {
      id: u.id,
      email: u.email ?? null,
      role,
      driverOperator: op,
    }
  })
}

/**
 * @param {string} userId
 * @param {AppRole} role
 * @param {string | null} [driverOperator] — requis si role === 'driver'
 */
export async function adminSetUserRole(userId, role, driverOperator = null) {
  const payload =
    role === 'driver'
      ? {
          p_user_id: userId,
          p_role: role,
          p_driver_operator: driverOperator ?? '',
        }
      : {
          p_user_id: userId,
          p_role: role,
        }
  const { error } = await supabase.rpc('admin_set_user_role', payload)
  if (error) throw new Error(error.message)
}
