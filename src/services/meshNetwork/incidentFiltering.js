/**
 * EcoSentry Mesh Network - Incident Validation & Filtering
 * 
 * Differentiates legitimate tactical incidents (user-placed manual incidents or
 * acoustic-fused incidents) from unwanted hardcoded demo incidents and unverified
 * placeholder markers from mockData INITIAL_EVENTS.
 */

/**
 * Checks whether an incident record is a legitimate tactical incident
 * suitable for rendering on the tactical wireframe terrain.
 * 
 * @param {Object} inc Incident record to evaluate
 * @returns {boolean} True if legitimate tactical incident, false otherwise
 */
export function isLegitimateTacticalIncident(inc) {
  if (!inc || !inc.id) return false

  // 1. Strictly exclude hardcoded demo incidents from mockData INITIAL_EVENTS (e.g. EVT-2026-101, EVT-2026-102, etc.)
  if (typeof inc.id === 'string' && inc.id.startsWith('EVT-2026-')) return false

  // 2. Strictly exclude static unverified placeholder / simulated demo items that were not manually placed or fused
  if (inc.isSimulated && !inc.isManual && !inc.isAcousticFused) return false

  // 3. Preserve legitimate user-created or acoustic-fused incident records
  if (inc.isManual || inc.isAcousticFused) return true

  // 4. Accept incidents with known tactical or manual placement prefixes
  if (
    typeof inc.id === 'string' &&
    (inc.id.startsWith('EVT-TAC-') ||
      inc.id.startsWith('EVT-MAN-') ||
      inc.id.startsWith('EVT-FUSED-') ||
      inc.id.startsWith('EVT-ACT-'))
  ) {
    return true
  }

  return false
}
