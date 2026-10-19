import React, { useState } from 'react'
import {
  Compass,
  Layers,
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  Flame,
  Volume2,
  Footprints,
  RotateCcw,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'

export default function SimulatedForestMap({
  zones,
  trails,
  sensors,
  events,
  selectedZone,
  setSelectedZone,
  onSelectMarker
}) {
  const [activeLayer, setActiveLayer] = useState('all') // 'all', 'camera', 'acoustic', 'wildlife', 'threats', 'trails'

  // Filter sensors based on selected zone and layer
  const filteredSensors = sensors.filter((sensor) => {
    if (selectedZone !== 'all' && sensor.zoneId !== selectedZone) return false
    if (activeLayer === 'camera' && sensor.type !== 'camera') return false
    if (activeLayer === 'acoustic' && sensor.type !== 'acoustic') return false
    if (activeLayer === 'wildlife' || activeLayer === 'threats') return false
    return true
  })

  // Filter events based on selected zone and layer
  const filteredEvents = events.filter((evt) => {
    if (selectedZone !== 'all' && evt.zoneId !== selectedZone) return false
    if (activeLayer === 'camera' || activeLayer === 'acoustic') return false
    if (activeLayer === 'wildlife' && evt.category !== 'wildlife' && evt.type !== 'animal_boundary_crossing') return false
    if (activeLayer === 'threats' && evt.category !== 'threat') return false
    return true
  })

  // Separate threat and wildlife events for distinct map rendering
  const threatMarkers = filteredEvents.filter((e) => e.category === 'threat')
  const wildlifeMarkers = filteredEvents.filter((e) => e.category === 'wildlife')

  return (
    <div className="forest-map-container">
      {/* Map Header */}
      <div className="map-header">
        <div className="map-title-group">
          <h2>
            <Compass size={18} color="#10b981" />
            <span>Simulated Forest Reserve Map (4 Zones)</span>
          </h2>
          <span className="coords-tag">Simulated Grid: 100x100 • Datum: Eco-WGS84</span>
        </div>

        {/* Map Layers & Zone Selector */}
        <div className="map-layer-pills">
          <button
            className={`layer-btn ${activeLayer === 'all' ? 'active' : ''}`}
            onClick={() => setActiveLayer('all')}
          >
            All Elements
          </button>
          <button
            className={`layer-btn ${activeLayer === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveLayer('camera')}
          >
            Cameras ({sensors.filter((s) => s.type === 'camera').length})
          </button>
          <button
            className={`layer-btn ${activeLayer === 'acoustic' ? 'active' : ''}`}
            onClick={() => setActiveLayer('acoustic')}
          >
            Acoustics ({sensors.filter((s) => s.type === 'acoustic').length})
          </button>
          <button
            className={`layer-btn ${activeLayer === 'threats' ? 'active' : ''}`}
            onClick={() => setActiveLayer('threats')}
          >
            Threats ({events.filter((e) => e.category === 'threat').length})
          </button>
          <button
            className={`layer-btn ${activeLayer === 'wildlife' ? 'active' : ''}`}
            onClick={() => setActiveLayer('wildlife')}
          >
            Wildlife ({events.filter((e) => e.category === 'wildlife').length})
          </button>
        </div>
      </div>

      {/* Simulated Map Viewport */}
      <div className="tactical-map-viewport">
        {/* Radar Sweep Effect */}
        <div className="radar-sweep-beam"></div>

        {/* Tactical Grid Background */}
        <div className="map-grid-overlay"></div>

        {/* Concentric Range Rings */}
        <div className="map-concentric-circles">
          <div className="circle-ring circle-ring-1"></div>
          <div className="circle-ring circle-ring-2"></div>
          <div className="circle-ring circle-ring-3"></div>
        </div>

        {/* SVG Map Layer for 4 Forest Zones, Boundaries, and Animal Trails */}
        <svg className="topo-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* ZONE 1: North Canopy Reserve */}
          <rect
            x="4"
            y="4"
            width="44"
            height="44"
            rx="2"
            fill="rgba(16, 185, 129, 0.08)"
            stroke={selectedZone === 'zone-1' ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}
            strokeWidth={selectedZone === 'zone-1' ? '1.2' : '0.6'}
            strokeDasharray="2 1"
          />
          <text x="7" y="10" fill="#10b981" fontSize="3" fontWeight="bold" opacity="0.8">
            ZONE 1: NORTH CANOPY
          </text>
          <text x="7" y="14" fill="#64746b" fontSize="2.2" opacity="0.7">
            Old-Growth Canopy (34,200 ha)
          </text>

          {/* ZONE 2: East River Basin */}
          <rect
            x="52"
            y="4"
            width="44"
            height="44"
            rx="2"
            fill="rgba(6, 182, 212, 0.08)"
            stroke={selectedZone === 'zone-2' ? '#06b6d4' : 'rgba(6, 182, 212, 0.4)'}
            strokeWidth={selectedZone === 'zone-2' ? '1.2' : '0.6'}
            strokeDasharray="2 1"
          />
          <text x="55" y="10" fill="#06b6d4" fontSize="3" fontWeight="bold" opacity="0.8">
            ZONE 2: EAST RIVER BASIN
          </text>
          <text x="55" y="14" fill="#64746b" fontSize="2.2" opacity="0.7">
            Water Basin & Wetlands (28,500 ha)
          </text>

          {/* ZONE 3: South Wildlife Corridor */}
          <rect
            x="4"
            y="52"
            width="44"
            height="44"
            rx="2"
            fill="rgba(168, 85, 247, 0.08)"
            stroke={selectedZone === 'zone-3' ? '#a855f7' : 'rgba(168, 85, 247, 0.4)'}
            strokeWidth={selectedZone === 'zone-3' ? '1.2' : '0.6'}
            strokeDasharray="2 1"
          />
          <text x="7" y="58" fill="#a855f7" fontSize="3" fontWeight="bold" opacity="0.8">
            ZONE 3: SOUTH CORRIDOR
          </text>
          <text x="7" y="62" fill="#64746b" fontSize="2.2" opacity="0.7">
            Fauna Migratory Passage (41,000 ha)
          </text>

          {/* ZONE 4: West Buffer Zone */}
          <rect
            x="52"
            y="52"
            width="44"
            height="44"
            rx="2"
            fill="rgba(245, 158, 11, 0.08)"
            stroke={selectedZone === 'zone-4' ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)'}
            strokeWidth={selectedZone === 'zone-4' ? '1.2' : '0.6'}
            strokeDasharray="2 1"
          />
          <text x="55" y="58" fill="#f59e0b" fontSize="3" fontWeight="bold" opacity="0.8">
            ZONE 4: WEST BUFFER ZONE
          </text>
          <text x="55" y="62" fill="#64746b" fontSize="2.2" opacity="0.7">
            Perimeter Boundary (22,800 ha)
          </text>

          {/* Natural Water Basin River Path */}
          <path
            d="M 50,2 C 60,15 65,30 72,42 C 80,55 85,75 92,98"
            fill="none"
            stroke="rgba(6, 182, 212, 0.55)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* ANIMAL TRAILS */}
          {trails.map((trail) => {
            const pointsString = trail.points.map((p) => `${p.x},${p.y}`).join(' ')
            return (
              <g key={trail.id}>
                <polyline
                  points={pointsString}
                  fill="none"
                  stroke={trail.color}
                  strokeWidth="0.8"
                  strokeDasharray="2 1.5"
                  opacity="0.8"
                />
              </g>
            )
          })}
        </svg>

        {/* CLICKABLE SENSOR MARKERS */}
        {filteredSensors.map((sensor) => {
          const isOnline = sensor.status === 'online'
          const isCamera = sensor.type === 'camera'
          return (
            <div
              key={sensor.id}
              className={`sensor-pin ${isOnline ? 'online' : 'offline'}`}
              style={{
                top: `${sensor.coordinates.y}%`,
                left: `${sensor.coordinates.x}%`
              }}
              onClick={() => onSelectMarker({ itemType: 'sensor', data: sensor })}
              title={`Click to view ${sensor.id} details`}
            >
              <div
                className="pulse-ring"
                style={{
                  borderColor: isOnline ? (isCamera ? '#06b6d4' : '#10b981') : '#ef4444',
                  animationPlayState: isOnline ? 'running' : 'paused'
                }}
              ></div>
              <div
                className="sensor-dot"
                style={{
                  backgroundColor: isOnline ? (isCamera ? '#06b6d4' : '#10b981') : '#4b5563',
                  borderColor: isOnline ? '#fff' : '#ef4444'
                }}
              >
                {isCamera ? <Camera size={8} color="#fff" /> : <Radio size={8} color="#fff" />}
              </div>
              <div className="sensor-tooltip">
                <strong style={{ color: isOnline ? '#34d399' : '#ef4444' }}>
                  {sensor.id} ({sensor.type.toUpperCase()})
                </strong>
                <br />
                {sensor.name} • {isOnline ? `${sensor.battery}% Battery` : 'OFFLINE'}
                <br />
                <span style={{ fontSize: '10px', color: '#94a39b' }}>
                  Sim. GPS: {sensor.coordinates.simulatedLat}°N, {sensor.coordinates.simulatedLng}°E
                </span>
              </div>
            </div>
          )
        })}

        {/* CLICKABLE THREAT INCIDENT MARKERS */}
        {threatMarkers.map((evt) => {
          const isCritical = evt.priority === 'critical'
          const isResolved = evt.status === 'resolved'
          return (
            <div
              key={evt.id}
              className={`sensor-pin alert ${isResolved ? 'resolved' : ''}`}
              style={{
                top: `${evt.coordinates.y}%`,
                left: `${evt.coordinates.x}%`,
                opacity: isResolved ? 0.6 : 1
              }}
              onClick={() => onSelectMarker({ itemType: 'event', data: evt })}
              title={`Click to inspect threat ${evt.id}`}
            >
              {!isResolved && (
                <div
                  className="pulse-ring"
                  style={{
                    borderColor: isCritical ? '#ef4444' : '#f59e0b',
                    animationDuration: isCritical ? '1.2s' : '2s'
                  }}
                ></div>
              )}
              <div
                className="sensor-dot"
                style={{
                  backgroundColor: isResolved ? '#6b7280' : isCritical ? '#ef4444' : '#f59e0b',
                  borderColor: '#fff'
                }}
              >
                <ShieldAlert size={9} color="#fff" />
              </div>
              <div className="sensor-tooltip" style={{ borderColor: isCritical ? '#ef4444' : '#f59e0b' }}>
                <span style={{ color: isCritical ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>
                  ⚠️ {evt.title}
                </span>
                <br />
                ID: {evt.id} • Status: {evt.status.toUpperCase()}
                <br />
                Confidence: {Math.round((evt.confidence || 0) * 100)}% AI Pattern Match
                <br />
                <span style={{ fontSize: '10px', color: '#fca5a5' }}>Click marker to acknowledge</span>
              </div>
            </div>
          )
        })}

        {/* CLICKABLE WILDLIFE SIGHTING MARKERS */}
        {wildlifeMarkers.map((evt) => (
          <div
            key={evt.id}
            className="sensor-pin wildlife"
            style={{
              top: `${evt.coordinates.y}%`,
              left: `${evt.coordinates.x}%`
            }}
            onClick={() => onSelectMarker({ itemType: 'event', data: evt })}
            title={`Click to view wildlife sighting ${evt.id}`}
          >
            <div
              className="pulse-ring"
              style={{ borderColor: '#a855f7', animationDuration: '3s' }}
            ></div>
            <div
              className="sensor-dot"
              style={{ backgroundColor: '#a855f7', borderColor: '#fff' }}
            >
              <Activity size={8} color="#fff" />
            </div>
            <div className="sensor-tooltip" style={{ borderColor: '#a855f7' }}>
              <span style={{ color: '#c084fc', fontWeight: 800 }}>🐾 {evt.title}</span>
              <br />
              ID: {evt.id} • {evt.timeAgo}
              <br />
              Confidence: {Math.round((evt.confidence || 0) * 100)}% Fauna Classifier
            </div>
          </div>
        ))}

        {/* Map Legend */}
        <div className="map-hud-legend">
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: '#06b6d4' }}></span>
            <span>Camera Trap</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: '#10b981' }}></span>
            <span>Acoustic Node</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: '#ef4444' }}></span>
            <span>Threat Incident</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: '#a855f7' }}></span>
            <span>Wildlife Sighting</span>
          </div>
          <div className="legend-item">
            <span className="legend-color-dot" style={{ background: '#4b5563' }}></span>
            <span>Sensor Offline</span>
          </div>
        </div>

        {/* Map Control Shortcuts */}
        <div className="map-hud-controls">
          <button
            className="hud-btn"
            title="Reset View"
            onClick={() => setSelectedZone('all')}
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="hud-btn"
            title="Toggle All Layers"
            onClick={() => setActiveLayer('all')}
          >
            <Layers size={15} />
          </button>
        </div>
      </div>

      {/* Simulated Map Disclaimer Strip */}
      <div className="simulated-coords-strip">
        <Info size={13} color="#06b6d4" />
        <span>
          <strong>Academic Simulation Notice:</strong> Forest boundaries, zones (1 to 4), animal trails, and GPS coordinates are synthetic mathematical approximations designed for prototype testing and college project demonstration.
        </span>
      </div>
    </div>
  )
}
