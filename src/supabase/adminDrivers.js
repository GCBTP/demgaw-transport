import { supabase } from './client'

/**
 * @returns {Promise<Array<{ id: string, email: string | null, full_name: string, phone: string, driver_operator: string | null }>>}
 */
export async function adminListDrivers() {
  const { data, error } = await supabase.rpc('admin_list_drivers')
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Crée un utilisateur Auth + profil chauffeur (Edge Function `admin-create-driver`).
 * @param {{ full_name: string, phone: string, email: string, password: string, driver_operator: string }} payload
 */
export async function adminCreateDriver(payload) {
  const { data, error } = await supabase.functions.invoke(
    'admin-create-driver',
    {
      body: payload,
    },
  )

  if (error) {
    let msg = error.message
    try {
      const body = error.context?.body
      if (typeof body === 'string' && body) {
        const parsed = JSON.parse(body)
        if (parsed?.error) msg = parsed.error
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  if (data?.error) throw new Error(data.error)
  return data
}
