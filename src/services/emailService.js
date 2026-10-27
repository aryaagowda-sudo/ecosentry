import emailjs from '@emailjs/browser'

/**
 * Retrieves EmailJS configuration parameters from Vite environment variables.
 * Safe for client-side execution (uses public key only).
 */
export const getEmailConfig = () => {
  const env =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : typeof process !== 'undefined' && process.env
      ? process.env
      : {}

  const serviceId = env.VITE_EMAILJS_SERVICE_ID || ''
  const templateId = env.VITE_EMAILJS_TEMPLATE_ID || ''
  const publicKey = env.VITE_EMAILJS_PUBLIC_KEY || ''
  const toEmail = env.VITE_EMAILJS_TO_EMAIL || ''

  return {
    serviceId: String(serviceId).trim(),
    templateId: String(templateId).trim(),
    publicKey: String(publicKey).trim(),
    toEmail: String(toEmail).trim()
  }
}

/**
 * Checks whether all required EmailJS credentials are configured.
 * @returns {boolean}
 */
export const isEmailConfigured = () => {
  const { serviceId, templateId, publicKey } = getEmailConfig()
  return Boolean(serviceId && templateId && publicKey)
}

/**
 * Builds a comprehensive, standard parameter dictionary for EmailJS templates.
 * Matches standard EmailJS variables (incident_id, title, priority, zone_name, coordinates, etc.)
 * as well as generic variables (message, subject, to_email).
 *
 * @param {Object} incident - The freshly created incident object
 * @returns {Object} Template parameters
 */
export const formatIncidentEmailParams = (incident) => {
  const { toEmail } = getEmailConfig()
  const priorityUpper = (incident.priority || 'HIGH').toUpperCase()
  
  const latLngStr =
    incident.coordinates?.simulatedLat && incident.coordinates?.simulatedLng
      ? `${Number(incident.coordinates.simulatedLat).toFixed(4)}°N, ${Number(incident.coordinates.simulatedLng).toFixed(4)}°E`
      : 'Simulated reserve datum'

  const gridCoordsStr =
    incident.coordinates?.x !== undefined && incident.coordinates?.y !== undefined
      ? `X: ${incident.coordinates.x}, Y: ${incident.coordinates.y}`
      : 'N/A'

  // Preformatted plaintext summary for templates using single {{message}} tag
  const messageBody = [
    `==================================================`,
    `[ECOSENTRY RESERVE INCIDENT ALERT]`,
    `==================================================`,
    `Incident ID:      ${incident.id || 'N/A'}`,
    `Event Title:      ${incident.icon || '⚠️'} ${incident.title || 'Untitled Incident'}`,
    `Severity Tier:    ${priorityUpper}`,
    `Category:         ${incident.category || 'Threat'}`,
    `Forest Sector:    ${incident.zoneName || incident.zoneId || 'Reserve Grid'}`,
    `GPS Coordinates:  ${latLngStr}`,
    `Grid Coordinates: ${gridCoordsStr}`,
    `Timestamp:        ${incident.timestamp || new Date().toISOString()}`,
    `Current Status:   ${incident.status || 'active'}`,
    `Detection Source: ${incident.source || 'Manual 3D Terrain Placement'}`,
    `--------------------------------------------------`,
    `Operational Description:`,
    incident.description || 'No description provided.',
    `--------------------------------------------------`,
    `Field Verification: Manual incident logged on reserve terrain via 3D interactive placement. Ranger dispatch protocol initiated.`
  ].join('\n')

  return {
    // Primary identifiers
    incident_id: incident.id || '',
    incident_title: incident.title || 'New Incident',
    title: incident.title || 'New Incident',
    incident_type: incident.type || 'manual_incident',
    incident_icon: incident.icon || '📍',

    // Severity & Priority
    severity: incident.priority || 'high',
    priority: incident.priority || 'high',
    priority_upper: priorityUpper,
    category: incident.category || 'threat',
    status: incident.status || 'active',

    // Sector & Spatial Location
    zone_name: incident.zoneName || 'Reserve Zone',
    zone_id: incident.zoneId || '',
    coordinates: `${latLngStr} (Grid: ${incident.coordinates?.x}, ${incident.coordinates?.y})`,
    gps_coordinates: latLngStr,
    grid_coordinates: gridCoordsStr,
    latitude: incident.coordinates?.simulatedLat ?? '',
    longitude: incident.coordinates?.simulatedLng ?? '',
    grid_x: incident.coordinates?.x ?? '',
    grid_y: incident.coordinates?.y ?? '',

    // Telemetry & Details
    timestamp: incident.timestamp || new Date().toISOString(),
    time_ago: incident.timeAgo || 'Just now',
    description: incident.description || '',
    source: incident.source || 'Manual Field Report',
    disclaimer: incident.disclaimer || '',

    // Standard Email Envelope Fields
    subject: `[EcoSentry ALERT] ${priorityUpper}: ${incident.title} in ${incident.zoneName || 'Reserve'}`,
    message: messageBody,
    to_email: toEmail || undefined,
    to_name: 'Reserve Operations Command',
    from_name: 'EcoSentry Wildlife Intelligence'
  }
}

/**
 * Dispatches an automated incident email notification via EmailJS.
 * Only sends when valid configuration is present. Gracefully handles unconfigured
 * environments and network errors without throwing or blocking UI execution.
 *
 * @param {Object} incident - The created incident report
 * @returns {Promise<{ success: boolean, status?: number, text?: string, reason?: string, error?: any }>}
 */
export const sendIncidentEmailNotification = async (incident) => {
  if (!incident) {
    console.warn('[EcoSentry EmailJS] No incident provided for email dispatch.')
    return { success: false, reason: 'empty_payload' }
  }

  const config = getEmailConfig()

  // Graceful fallback if environment variables are not yet configured in Vercel or locally
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.info(
      '[EcoSentry EmailJS] Automated email notification skipped: EmailJS environment variables are not set.\n' +
      'To enable automated incident emails, set the following environment variables:\n' +
      '  - VITE_EMAILJS_SERVICE_ID\n' +
      '  - VITE_EMAILJS_TEMPLATE_ID\n' +
      '  - VITE_EMAILJS_PUBLIC_KEY'
    )
    return {
      success: false,
      reason: 'unconfigured',
      message: 'EmailJS environment variables not configured'
    }
  }

  const templateParams = formatIncidentEmailParams(incident)

  try {
    console.log(
      `[EcoSentry EmailJS] Sending incident alert email for ${incident.id} ("${incident.title}") via service "${config.serviceId}"...`
    )

    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    )

    console.log(
      `[EcoSentry EmailJS] Incident alert email sent successfully! Status: ${response.status} (${response.text})`
    )

    return {
      success: true,
      status: response.status,
      text: response.text
    }
  } catch (error) {
    console.error(
      `[EcoSentry EmailJS] Failed to send incident alert email for ${incident.id}:`,
      error
    )
    return {
      success: false,
      reason: 'error',
      error: error?.text || error?.message || error
    }
  }
}
