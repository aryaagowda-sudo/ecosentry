/**
 * EcoSentry Role-Based Access Control (RBAC) & Authentication Service
 * 
 * Defines system roles, secure database role verification, and session helpers.
 * Never stores or exposes hardcoded credentials or admin emails.
 */
import { supabase } from '../supabaseClient.js'

export const ROLES = {
  RANGER: 'RANGER',
  GUEST: 'GUEST'
}

/**
 * Validates and extracts the user role from a verified session or user object.
 * Secure logic:
 * 1. Checks server-side app_metadata.role (set exclusively by Supabase backend/triggers)
 * 2. Checks verified user_metadata.role
 * 3. Explicit guest markers resolve to GUEST
 * 4. Fail-closed: unverified or missing roles default to GUEST (never escalated)
 * 
 * @param {Object} session - The active Supabase or local session
 * @returns {'RANGER' | 'GUEST' | null}
 */
export function getRoleFromSession(session) {
  if (!session || !session.user) return null

  const user = session.user

  // 1. Explicit guest marker
  if (user.isGuest === true || (user.email && user.email.toLowerCase().startsWith('guest'))) {
    return ROLES.GUEST
  }

  // 2. Explicit app_metadata role (enforced server-side in Supabase Postgres)
  if (user.app_metadata?.role) {
    const r = String(user.app_metadata.role).toUpperCase().trim()
    if (r === ROLES.RANGER) return ROLES.RANGER
    if (r === ROLES.GUEST) return ROLES.GUEST
  }

  // 3. Explicit user_metadata role (verified from Supabase Auth)
  if (user.user_metadata?.role) {
    const r = String(user.user_metadata.role).toUpperCase().trim()
    if (r === ROLES.RANGER) return ROLES.RANGER
    if (r === ROLES.GUEST) return ROLES.GUEST
  }

  // Fail-closed security default: Unknown / unverified roles default to GUEST
  return ROLES.GUEST
}

/**
 * Secure Backend Authorization:
 * Verifies Ranger authorization directly against the Supabase backend.
 * Checks in order of priority:
 * 1. Supabase Auth real-time verified user token (supabase.auth.getUser())
 * 2. Database RPC get_current_user_role (SECURITY DEFINER in Postgres)
 * 3. Database public.profiles table (checking role for auth.uid())
 * 4. Server-verified app_metadata.role and user_metadata.role
 * 
 * Fails closed: Returns { role: ROLES.GUEST, isRanger: false } if unverified.
 * 
 * @returns {Promise<{ role: 'RANGER' | 'GUEST', isRanger: boolean }>}
 */
export async function verifyRoleWithBackend() {
  try {
    // 1. Query real-time verified user token from Supabase Auth server
    const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !serverUser) {
      return { role: ROLES.GUEST, isRanger: false }
    }

    const userId = serverUser.id

    // 2. Query secure PostgreSQL RPC get_current_user_role if available
    try {
      const { data: rpcRole, error: rpcError } = await supabase.rpc('get_current_user_role')
      if (!rpcError && rpcRole) {
        const normalized = String(rpcRole).toUpperCase().trim()
        if (normalized === ROLES.RANGER) {
          return { role: ROLES.RANGER, isRanger: true }
        }
      }
    } catch {}

    // 3. Query public.profiles database table if available
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (!profileError && profile?.role) {
        const normalized = String(profile.role).toUpperCase().trim()
        if (normalized === ROLES.RANGER) {
          return { role: ROLES.RANGER, isRanger: true }
        }
      }
    } catch {}

    // 4. Check server-verified app_metadata and user_metadata
    const appRole = serverUser.app_metadata?.role && String(serverUser.app_metadata.role).toUpperCase().trim()
    const userRole = serverUser.user_metadata?.role && String(serverUser.user_metadata.role).toUpperCase().trim()

    if (appRole === ROLES.RANGER || userRole === ROLES.RANGER) {
      return { role: ROLES.RANGER, isRanger: true }
    }

    // Fail-closed default: User authenticated successfully but lacks administrative role
    console.warn('[EcoSentry RBAC] User authenticated but lacks Ranger administrative role in database.')
    return { role: ROLES.GUEST, isRanger: false }
  } catch (err) {
    console.warn('[EcoSentry RBAC] Role verification failed:', err)
    return { role: ROLES.GUEST, isRanger: false }
  }
}

/**
 * Security Rule: Only RANGER role is permitted to configure or transmit email notifications.
 * 
 * @param {string} role - The current active role
 * @returns {boolean}
 */
export function canConfigureEmailNotifications(role) {
  return role === ROLES.RANGER
}

/**
 * Creates an isolated, restricted Guest session payload.
 * 
 * @returns {Object}
 */
export function createGuestSession() {
  return {
    user: {
      id: 'guest-' + Date.now(),
      email: 'guest@ecosentry.local',
      role: ROLES.GUEST,
      isGuest: true,
      user_metadata: {
        role: ROLES.GUEST,
        name: 'Guest Explorer'
      },
      app_metadata: {
        role: ROLES.GUEST
      }
    }
  }
}
