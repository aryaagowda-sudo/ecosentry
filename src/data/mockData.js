/**
 * EcoSentry Simulated Mock Data Module
 * 
 * IMPORTANT DEMONSTRATION & ETHICAL DISCLAIMER:
 * All events, coordinates, sensor telemetry, and sound classifications in this module
 * are simulated for academic/demonstration purposes.
 * Acoustic sound classifications (e.g. chainsaw-like, gunshot-like) represent statistical
 * model pattern similarities and do NOT constitute definitive proof of poaching or illegal activity.
 * Physical on-the-ground verification by forest rangers is mandatory.
 */

// Four Simulated Forest Zones (Simulated relative coordinates within a 100x100 grid)
export const SIMULATED_ZONES = [
  {
    id: 'zone-1',
    name: 'Zone 1: North Canopy Reserve',
    code: 'NCR-Z1',
    description: 'Dense primary old-growth rainforest canopy. Critical habitat for arboreal fauna and bird species.',
    bounds: { xMin: 5, xMax: 48, yMin: 5, yMax: 48 },
    simulatedCoords: '12.450°N - 12.478°N, 76.105°E - 76.138°E',
    areaHectares: 34200,
    riskLevel: 'Moderate',
    accentColor: '#10b981'
  },
  {
    id: 'zone-2',
    name: 'Zone 2: East River Basin',
    code: 'ERB-Z2',
    description: 'Perennial river tributaries and wetlands. Primary watering haven and high-biodiversity crossing area.',
    bounds: { xMin: 52, xMax: 95, yMin: 5, yMax: 48 },
    simulatedCoords: '12.450°N - 12.478°N, 76.139°E - 76.175°E',
    areaHectares: 28500,
    riskLevel: 'Low',
    accentColor: '#06b6d4'
  },
  {
    id: 'zone-3',
    name: 'Zone 3: South Wildlife Corridor',
    code: 'SWC-Z3',
    description: 'Vital elephant and carnivore migration corridor connecting northern reserve to southern sanctuary.',
    bounds: { xMin: 5, xMax: 48, yMin: 52, yMax: 95 },
    simulatedCoords: '12.420°N - 12.449°N, 76.105°E - 76.138°E',
    areaHectares: 41000,
    riskLevel: 'Elevated',
    accentColor: '#a855f7'
  },
  {
    id: 'zone-4',
    name: 'Zone 4: West Buffer Zone',
    code: 'WBZ-Z4',
    description: 'Border boundary adjacent to agricultural lands and secondary roads. Highest human proximity risk.',
    bounds: { xMin: 52, xMax: 95, yMin: 52, yMax: 95 },
    simulatedCoords: '12.420°N - 12.449°N, 76.139°E - 76.175°E',
    areaHectares: 22800,
    riskLevel: 'High',
    accentColor: '#f59e0b'
  }
]

// Animal Trails across the simulated zones
export const ANIMAL_TRAILS = [
  {
    id: 'trail-1',
    name: 'Elephant Migratory Corridor',
    description: 'Seasonal herd migration path between southern grasslands and river delta.',
    points: [
      { x: 18, y: 85 },
      { x: 26, y: 68 },
      { x: 38, y: 55 },
      { x: 58, y: 45 },
      { x: 74, y: 35 }
    ],
    color: '#a855f7',
    primarySpecies: 'Asian Elephant (Elephas maximus)'
  },
  {
    id: 'trail-2',
    name: 'Tiger / Carnivore Ridge Trail',
    description: 'High-elevation ridge trail frequented by large solitary cats.',
    points: [
      { x: 14, y: 16 },
      { x: 28, y: 26 },
      { x: 34, y: 42 },
      { x: 30, y: 62 },
      { x: 22, y: 78 }
    ],
    color: '#10b981',
    primarySpecies: 'Bengal Tiger (Panthera tigris)'
  },
  {
    id: 'trail-3',
    name: 'Riverbed Ungulate Trail',
    description: 'Daily watering route used by spotted deer, sambar, and wild boar.',
    points: [
      { x: 55, y: 15 },
      { x: 62, y: 28 },
      { x: 70, y: 44 },
      { x: 78, y: 64 },
      { x: 88, y: 82 }
    ],
    color: '#06b6d4',
    primarySpecies: 'Sambar Deer & Spotted Deer'
  }
]

// Initial Simulated Sensors (Camera Traps, Acoustic Audio Sensors, Seismic Sensors)
export const INITIAL_SENSORS = [
  {
    id: 'CAM-N01',
    name: 'Camera Trap Alpha-1',
    type: 'camera',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 22, y: 20, simulatedLat: 12.4710, simulatedLng: 76.1180 },
    status: 'online',
    battery: 94,
    signalStrength: '96%',
    solarCharging: true,
    lastPing: '2 mins ago',
    model: 'WildGuard Vision v3 (Optical + Thermal PIR)',
    resolution: '4K Infrared Night-Vision'
  },
  {
    id: 'CAM-N02',
    name: 'Camera Trap Alpha-2',
    type: 'camera',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 38, y: 32, simulatedLat: 12.4625, simulatedLng: 76.1310 },
    status: 'online',
    battery: 88,
    signalStrength: '91%',
    solarCharging: true,
    lastPing: '5 mins ago',
    model: 'WildGuard Vision v3 (Optical + Thermal PIR)',
    resolution: '4K Infrared Night-Vision'
  },
  {
    id: 'AC-N01',
    name: 'Acoustic Node North-1',
    type: 'acoustic',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 30, y: 16, simulatedLat: 12.4740, simulatedLng: 76.1240 },
    status: 'online',
    battery: 92,
    signalStrength: '98%',
    solarCharging: true,
    lastPing: '1 min ago',
    model: 'BioEcho Array v2.4 (Quad-Microphone Biomimetic)',
    frequencyRange: '20 Hz - 96 kHz'
  },
  {
    id: 'CAM-E01',
    name: 'Camera Trap River Delta',
    type: 'camera',
    zoneId: 'zone-2',
    zoneName: 'Zone 2: East River Basin',
    coordinates: { x: 68, y: 24, simulatedLat: 12.4680, simulatedLng: 76.1520 },
    status: 'online',
    battery: 82,
    signalStrength: '89%',
    solarCharging: true,
    lastPing: '4 mins ago',
    model: 'WildGuard Vision v3 (Optical + Thermal PIR)',
    resolution: '4K Infrared Night-Vision'
  },
  {
    id: 'AC-E01',
    name: 'Acoustic Node River-1',
    type: 'acoustic',
    zoneId: 'zone-2',
    zoneName: 'Zone 2: East River Basin',
    coordinates: { x: 78, y: 36, simulatedLat: 12.4590, simulatedLng: 76.1610 },
    status: 'online',
    battery: 90,
    signalStrength: '94%',
    solarCharging: true,
    lastPing: '3 mins ago',
    model: 'BioEcho Array v2.4 (Quad-Microphone Biomimetic)',
    frequencyRange: '20 Hz - 96 kHz'
  },
  {
    id: 'CAM-S01',
    name: 'Camera Trap Corridor-1',
    type: 'camera',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: South Wildlife Corridor',
    coordinates: { x: 26, y: 64, simulatedLat: 12.4380, simulatedLng: 76.1210 },
    status: 'online',
    battery: 76,
    signalStrength: '84%',
    solarCharging: true,
    lastPing: '7 mins ago',
    model: 'WildGuard Vision v3 (Optical + Thermal PIR)',
    resolution: '4K Infrared Night-Vision'
  },
  {
    id: 'AC-S01',
    name: 'Acoustic Node Corridor-1',
    type: 'acoustic',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: South Wildlife Corridor',
    coordinates: { x: 36, y: 78, simulatedLat: 12.4290, simulatedLng: 76.1290 },
    status: 'online',
    battery: 85,
    signalStrength: '90%',
    solarCharging: true,
    lastPing: '2 mins ago',
    model: 'BioEcho Array v2.4 (Quad-Microphone Biomimetic)',
    frequencyRange: '20 Hz - 96 kHz'
  },
  {
    id: 'CAM-W01',
    name: 'Camera Trap Buffer Perimeter',
    type: 'camera',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 62, y: 62, simulatedLat: 12.4410, simulatedLng: 76.1480 },
    status: 'online',
    battery: 79,
    signalStrength: '87%',
    solarCharging: true,
    lastPing: '6 mins ago',
    model: 'WildGuard Vision v3 (Optical + Thermal PIR)',
    resolution: '4K Infrared Night-Vision'
  },
  {
    id: 'AC-W01',
    name: 'Acoustic Node Buffer-1',
    type: 'acoustic',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 74, y: 72, simulatedLat: 12.4330, simulatedLng: 76.1580 },
    status: 'online',
    battery: 83,
    signalStrength: '88%',
    solarCharging: true,
    lastPing: '1 min ago',
    model: 'BioEcho Array v2.4 (Quad-Microphone Biomimetic)',
    frequencyRange: '20 Hz - 96 kHz'
  },
  {
    id: 'AC-W02',
    name: 'Acoustic Node Buffer-2 (Boundary)',
    type: 'acoustic',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 86, y: 84, simulatedLat: 12.4240, simulatedLng: 76.1680 },
    status: 'offline', // Demonstrating one initial offline sensor
    battery: 14,
    signalStrength: '0%',
    solarCharging: false,
    lastPing: '1 hr 45m ago (Telemetry Timeout)',
    model: 'BioEcho Array v2.4 (Quad-Microphone Biomimetic)',
    frequencyRange: '20 Hz - 96 kHz'
  }
]

// Initial Simulated Events (Threat Alerts, Wildlife Sightings, and Hardware Failures)
export const INITIAL_EVENTS = [
  {
    id: 'EVT-2026-101',
    type: 'chainsaw_sound',
    category: 'threat',
    title: 'Chainsaw-like Sound Classification',
    description: 'Continuous harmonic acoustic signature in the 1.6kHz - 2.4kHz band characteristic of small two-stroke combustion engines.',
    sensorId: 'AC-N01',
    sensorType: 'acoustic',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 31, y: 19, simulatedLat: 12.4735, simulatedLng: 76.1248 },
    timestamp: '2026-10-19 10:14:15',
    timeAgo: '10 mins ago',
    confidence: 0.89, // 89% AI Model Confidence
    priority: 'critical',
    status: 'active', // 'active' | 'acknowledged' | 'resolved'
    isSimulated: true,
    disclaimer: 'Simulated classification: acoustic pattern match indicates engine profile similarity only. Does not conclusively prove illegal logging/poaching. Field ranger verification required.'
  },
  {
    id: 'EVT-2026-102',
    type: 'gunshot_sound',
    category: 'threat',
    title: 'Gunshot-like Acoustic Impulse Classification',
    description: 'High-amplitude acoustic pressure transient with rapid rise time (<2ms) and acoustic shockwave profile matching firearm discharge simulation.',
    sensorId: 'AC-W01',
    sensorType: 'acoustic',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 73, y: 70, simulatedLat: 12.4338, simulatedLng: 76.1575 },
    timestamp: '2026-10-19 09:58:30',
    timeAgo: '26 mins ago',
    confidence: 0.93,
    priority: 'critical',
    status: 'active',
    isSimulated: true,
    disclaimer: 'Simulated classification: acoustic transient pulse detected. Could originate from dry tree limb crack, vehicle backfire, or firearm. Ranger investigation recommended.'
  },
  {
    id: 'EVT-2026-103',
    type: 'human_detection',
    category: 'threat',
    title: 'Human Presence Optical Detection',
    description: 'Thermal and visual bounding box classification identifying bipedal human profile carrying non-wildlife equipment during restricted hours.',
    sensorId: 'CAM-W01',
    sensorType: 'camera',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 63, y: 64, simulatedLat: 12.4402, simulatedLng: 76.1488 },
    timestamp: '2026-10-19 09:42:10',
    timeAgo: '42 mins ago',
    confidence: 0.86,
    priority: 'high',
    status: 'acknowledged',
    isSimulated: true,
    disclaimer: 'Simulated vision classifier output: indicates human-sized silhouette. May include local community foraging or authorized patrols. Verify credentials.'
  },
  {
    id: 'EVT-2026-104',
    type: 'animal_boundary_crossing',
    category: 'threat',
    title: 'Animal Boundary Crossing / Fence Pressure',
    description: 'Large herd movement detected moving westward past the designated forest boundary fence into buffer agricultural zone.',
    sensorId: 'CAM-S01',
    sensorType: 'camera',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: South Wildlife Corridor',
    coordinates: { x: 28, y: 66, simulatedLat: 12.4370, simulatedLng: 76.1225 },
    timestamp: '2026-10-19 09:20:00',
    timeAgo: '1 hr 4m ago',
    confidence: 0.95,
    priority: 'medium',
    status: 'acknowledged',
    isSimulated: true,
    disclaimer: 'Simulated movement alert: wildlife movement across reserve boundary creates human-wildlife conflict risk. Ranger notification recommended.'
  },
  {
    id: 'EVT-2026-105',
    type: 'sensor_failure',
    category: 'system',
    title: 'Sensor Telemetry & Heartbeat Failure',
    description: 'Sensor AC-W02 missed 6 consecutive telemetry heartbeats. Battery voltage dropped below 14% critical threshold.',
    sensorId: 'AC-W02',
    sensorType: 'acoustic',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: West Buffer Zone',
    coordinates: { x: 86, y: 84, simulatedLat: 12.4240, simulatedLng: 76.1680 },
    timestamp: '2026-10-19 08:39:10',
    timeAgo: '1 hr 45m ago',
    confidence: null, // N/A for hardware telemetry
    priority: 'medium',
    status: 'active',
    isSimulated: true,
    disclaimer: 'Simulated telemetry alert: hardware/connectivity event only. Sensor failure does not signify a poaching incident.'
  },
  {
    id: 'EVT-2026-106',
    type: 'wildlife_sighting',
    category: 'wildlife',
    title: 'Bengal Tiger (Panthera tigris) Sighted',
    description: 'Adult female tiger detected traversing Ridge Trail heading northeast toward water basin. Good body condition.',
    sensorId: 'CAM-N02',
    sensorType: 'camera',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 37, y: 31, simulatedLat: 12.4630, simulatedLng: 76.1305 },
    timestamp: '2026-10-19 08:15:22',
    timeAgo: '2 hrs 9m ago',
    confidence: 0.98,
    priority: 'low',
    status: 'resolved',
    isSimulated: true,
    disclaimer: 'Simulated fauna detection: camera trap AI visual classifier confirmed Bengal Tiger stripe pattern.'
  },
  {
    id: 'EVT-2026-107',
    type: 'wildlife_sighting',
    category: 'wildlife',
    title: 'Asian Elephant Herd (Elephas maximus)',
    description: 'Family group of 7 Asian Elephants including 2 calves documented at East River watering pool.',
    sensorId: 'CAM-E01',
    sensorType: 'camera',
    zoneId: 'zone-2',
    zoneName: 'Zone 2: East River Basin',
    coordinates: { x: 67, y: 25, simulatedLat: 12.4675, simulatedLng: 76.1528 },
    timestamp: '2026-10-19 07:45:00',
    timeAgo: '2 hrs 39m ago',
    confidence: 0.99,
    priority: 'low',
    status: 'resolved',
    isSimulated: true,
    disclaimer: 'Simulated fauna detection: optical motion detection confirmed elephant matriarch and calves.'
  },
  {
    id: 'EVT-2026-108',
    type: 'wildlife_sighting',
    category: 'wildlife',
    title: 'Indian Leopard (Panthera pardus fusca)',
    description: 'Nocturnal bio-acoustic low roar and camera trap infrared capture along rocky overhang.',
    sensorId: 'CAM-N01',
    sensorType: 'camera',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: North Canopy Reserve',
    coordinates: { x: 23, y: 22, simulatedLat: 12.4705, simulatedLng: 76.1185 },
    timestamp: '2026-10-19 05:22:18',
    timeAgo: '5 hrs ago',
    confidence: 0.94,
    priority: 'low',
    status: 'resolved',
    isSimulated: true,
    disclaimer: 'Simulated fauna detection: multi-modal optical and acoustic identification.'
  }
]
