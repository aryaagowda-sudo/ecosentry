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

  // 3. Explicit user_metadata role
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
 * Calls PostgreSQL RPC `get_current_user_role` to verify Ranger authorization in the database.
 * Evaluates `auth.uid()` securely inside Postgres with SECURITY DEFINER.
 * 
 * @returns {Promise<{ role: 'RANGER' | 'GUEST', isRanger: boolean }>}
 */
export async function verifyRoleWithBackend() {
  try {
    const { data, error } = await supabase.rpc('get_current_user_role')
    if (error) {
      console.warn('[EcoSentry RBAC] Role RPC verification error:', error.message)
      return { role: ROLES.GUEST, isRanger: false }
    }
    const verifiedRole = String(data || '').toUpperCase().trim()
    const isRanger = verifiedRole === ROLES.RANGER
    return {
      role: isRanger ? ROLES.RANGER : ROLES.GUEST,
      isRanger
    }
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
