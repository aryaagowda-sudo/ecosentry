/**
 * Incident Toolbox Standard Event Catalog
 * 
 * Provides predefined incident types with icons, categories, default severities,
 * and realistic descriptions for anti-poaching surveillance and reserve operations.
 */

export const INCIDENT_CATEGORIES = [
  { id: 'all', label: 'All Events' },
  { id: 'threat', label: 'Poaching & Threats' },
  { id: 'wildlife', label: 'Wildlife & Welfare' },
  { id: 'operations', label: 'Operations & Hardware' },
  { id: 'general', label: 'General & Patrol' }
]

export const SEVERITY_LEVELS = [
  { id: 'critical', label: 'Critical', color: '#C94232', bg: 'rgba(201, 66, 50, 0.12)' },
  { id: 'high', label: 'High', color: '#E88C30', bg: 'rgba(232, 140, 48, 0.12)' },
  { id: 'medium', label: 'Medium', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  { id: 'low', label: 'Low', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' },
  { id: 'informational', label: 'Informational', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' }
]

export const STANDARD_TOOLBOX_EVENTS = [
  {
    id: 'gunshot',
    type: 'gunshot_sound',
    title: 'Gunshot Detected',
    icon: '🔫',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'critical',
    defaultDescription: 'Sharp high-amplitude acoustic transient signature detected, indicating possible firearm discharge. Immediate ranger dispatch recommended.',
    color: '#C94232'
  },
  {
    id: 'poaching_suspected',
    type: 'poaching_suspected',
    title: 'Suspected Poaching',
    icon: '🐾',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'high',
    defaultDescription: 'Wire snares, animal tracking signs, or recent campsite debris discovered. Area search and trap sweep required.',
    color: '#C94232'
  },
  {
    id: 'human_trespass',
    type: 'human_detection',
    title: 'Suspicious Human Movement',
    icon: '👤',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'high',
    defaultDescription: 'Thermal silhouette or visual detection of bipedal individual traversing off-trail terrain during restricted surveillance hours.',
    color: '#E88C30'
  },
  {
    id: 'unauthorized_entry',
    type: 'unauthorized_entry',
    title: 'Unauthorized Forest Entry',
    icon: '🚪',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'medium',
    defaultDescription: 'Perimeter fence wire cut or illegal entry waypoint identified along reserve boundary line.',
    color: '#E88C30'
  },
  {
    id: 'injured_animal',
    type: 'injured_animal',
    title: 'Injured Animal',
    icon: '🐘',
    category: 'wildlife',
    categoryLabel: 'Wildlife & Welfare',
    defaultSeverity: 'critical',
    defaultDescription: 'Large animal observed with snare wound, fracture, or severe distress. Emergency wildlife veterinary team dispatch required.',
    color: '#C94232'
  },
  {
    id: 'animal_distress',
    type: 'animal_distress',
    title: 'Animal Distress Call',
    icon: '🐦',
    category: 'wildlife',
    categoryLabel: 'Wildlife & Welfare',
    defaultSeverity: 'medium',
    defaultDescription: 'Persistent alarm calls or acoustic vocalization patterns indicating predator confrontation or snare trap struggle.',
    color: '#D97706'
  },
  {
    id: 'illegal_logging',
    type: 'chainsaw_sound',
    title: 'Illegal Logging',
    icon: '🪓',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'critical',
    defaultDescription: 'Mechanical chainsaw acoustic profile or fallen timber identified in protected core canopy reserve.',
    color: '#C94232'
  },
  {
    id: 'forest_fire',
    type: 'forest_fire',
    title: 'Forest Fire',
    icon: '🔥',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'critical',
    defaultDescription: 'Thermal sensor hotspot surge and visual smoke plume observed. Immediate suppression containment protocol active.',
    color: '#C94232'
  },
  {
    id: 'suspicious_vehicle',
    type: 'suspicious_vehicle',
    title: 'Suspicious Vehicle',
    icon: '🚗',
    category: 'threat',
    categoryLabel: 'Poaching & Threats',
    defaultSeverity: 'high',
    defaultDescription: 'Unregistered motorized vehicle or motorcycle spotted on reserve patrol road during curfew hours.',
    color: '#E88C30'
  },
  {
    id: 'camera_failure',
    type: 'camera_malfunction',
    title: 'Camera Malfunction',
    icon: '📷',
    category: 'operations',
    categoryLabel: 'Operations & Hardware',
    defaultSeverity: 'medium',
    defaultDescription: 'Optical sensor feed disrupted, lens obstructed by vegetation, or PIR motion detection module failure.',
    color: '#D97706'
  },
  {
    id: 'acoustic_failure',
    type: 'sensor_failure',
    title: 'Acoustic Sensor Failure',
    icon: '📡',
    category: 'operations',
    categoryLabel: 'Operations & Hardware',
    defaultSeverity: 'medium',
    defaultDescription: 'Bioacoustic array missed consecutive heartbeats. Battery voltage dropped below operational threshold.',
    color: '#D97706'
  },
  {
    id: 'wildlife_sighting',
    type: 'wildlife_sighting',
    title: 'Wildlife Sighting',
    icon: '🦌',
    category: 'wildlife',
    categoryLabel: 'Wildlife & Welfare',
    defaultSeverity: 'low',
    defaultDescription: 'Healthy wildlife observed traversing designated game trail corridors. Normal migratory movement logged.',
    color: '#0284C7'
  },
  {
    id: 'ranger_patrol',
    type: 'ranger_patrol',
    title: 'Ranger Patrol',
    icon: '👮',
    category: 'operations',
    categoryLabel: 'Operations & Hardware',
    defaultSeverity: 'informational',
    defaultDescription: 'Scheduled anti-poaching foot patrol unit checkpoint logged. Sector status normal.',
    color: '#16A34A'
  },
  {
    id: 'general_observation',
    type: 'general_observation',
    title: 'General Observation',
    icon: '📍',
    category: 'general',
    categoryLabel: 'General & Patrol',
    defaultSeverity: 'low',
    defaultDescription: 'Field observation or environmental survey note recorded during routine monitoring.',
    color: '#64748B'
  }
]

export const RECOMMENDED_CUSTOM_EMOJIS = [
  '⚠️', '🪤', '🚁', '⚡', '🔍', '⛺', '🔦', '🐺', '🐗', '🐍', '🌲', '🚨', '🛑', '🎯'
]
