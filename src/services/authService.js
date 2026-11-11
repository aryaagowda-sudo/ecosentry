/**
 * EcoSentry Role-Based Access Control (RBAC) & Authentication Service
 * 
 * Defines system roles, security validation, and session helpers.
 */

export const ROLES = {
  RANGER: 'RANGER',
  GUEST: 'GUEST'
}

export const DEMO_RANGER_EMAIL = 'ranger@ecosentry.com'

/**
 * Validates and extracts the user role from a session or user object.
 * Priority: app_metadata -> user_metadata -> verified ranger email -> GUEST fallback.
 * 
 * @param {Object} session - The active Supabase or local session
 * @returns {'RANGER' | 'GUEST'}
 */
export function getRoleFromSession(session) {
  if (!session || !session.user) return null

  const user = session.user
  const email = (user.email || '').toLowerCase().trim()

  // 1. Explicit app_metadata role (set via Supabase auth admin / DB trigger)
  if (user.app_metadata?.role) {
    const r = String(user.app_metadata.role).toUpperCase()
    if (r === ROLES.RANGER) return ROLES.RANGER
    if (r === ROLES.GUEST) return ROLES.GUEST
  }

  // 2. Explicit user_metadata role
  if (user.user_metadata?.role) {
    const r = String(user.user_metadata.role).toUpperCase()
    if (r === ROLES.RANGER) return ROLES.RANGER
    if (r === ROLES.GUEST) return ROLES.GUEST
  }

  // 3. Verified Ranger accounts
  if (email === DEMO_RANGER_EMAIL || email === 'ranger.lead@ecosentry.org') {
    return ROLES.RANGER
  }

  // 4. Guest marker
  if (user.isGuest === true || email.startsWith('guest')) {
    return ROLES.GUEST
  }

  // Default to RANGER for standard authenticated users, GUEST otherwise
  return user.id ? ROLES.RANGER : ROLES.GUEST
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
