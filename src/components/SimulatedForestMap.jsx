import React, { useState, useMemo } from 'react'
import {
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Layers,
  X,
  Compass,
  MapPin,
  Waves,
  Eye,
  Info
} from 'lucide-react'

import {
  getSensorDisplayTag,
  getRiver2DPolygonPath,
  getRiver2DCenterlinePath,
  getRiver2DOffsetLinePath,
  generateTacticalTreeCanopies
} from './forest3d/terrainHelper'

export default function SimulatedForestMap({
  zones = [],
  trails = [],
  sensors = [],
  events = [],
  selectedZone = 'all',
  setSelectedZone,
  selectedItem = null,
  onSelectMarker,
  activeLayer = 'all'
}) {
  const [hoveredItem, setHoveredItem] = useState(null)
  const [showLegend, setShowLegend] = useState(true)

  // 1. Filter sensors based on active sector and layer
  const filteredSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      if (selectedZone !== 'all' && sensor.zoneId !== selectedZone) return false
      if (activeLayer === 'cameras' && sensor.type !== 'camera') return false
      if (activeLayer === 'acoustics' && sensor.type !== 'acoustic') return false
      if (activeLayer === 'threats' || activeLayer === 'wildlife') return false
      return true
    })
  }, [sensors, selectedZone, activeLayer])

  // 2. Filter events based on active sector and layer
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (selectedZone !== 'all' && evt.zoneId !== selectedZone) return false
      if (activeLayer === 'cameras' || activeLayer === 'acoustics') return false
      if (activeLayer === 'threats' && evt.category !== 'threat') return false
      if (activeLayer === 'wildlife' && evt.category !== 'wildlife' && evt.type !== 'animal_boundary_crossing') return false
      return true
    })
  }, [events, selectedZone, activeLayer])

  const threatMarkers = useMemo(() => filteredEvents.filter((e) => e.category === 'threat'), [filteredEvents])
  const wildlifeMarkers = useMemo(() => filteredEvents.filter((e) => e.category === 'wildlife'), [filteredEvents])

  // 3. Mathematical Shared River SVG Paths (Identical to 3D Geography)
  const riverBankPath = useMemo(() => getRiver2DPolygonPath(70, 3.4), [])
  const riverWaterPath = useMemo(() => getRiver2DPolygonPath(70, 0), [])
  const riverCenterlinePath = useMemo(() => getRiver2DCenterlinePath(70), [])
  const riverLeftFlowPath = useMemo(() => getRiver2DOffsetLinePath(70, -1.2), [])
  const riverRightFlowPath = useMemo(() => getRiver2DOffsetLinePath(70, 1.2), [])

  // 4. Stylized Top-Down Tree Canopies matching 3D density
  const tacticalTreeCanopies = useMemo(() => {
    return generateTacticalTreeCanopies(sensors, events)
  }, [sensors, events])

  // Helper for concise threat badge labels
  const getThreatShortTag = (evt) => {
    if (evt.type === 'chainsaw_sound') return 'Chainsaw'
    if (evt.type === 'gunshot_sound') return 'Gunshot'
    if (evt.type === 'human_detection') return 'Human'
    if (evt.type === 'animal_boundary_crossing') return 'Boundary'
    return 'Threat'
  }

  // Helper for concise wildlife badge labels
  const getWildlifeShortTag = (evt) => {
    if (evt.title.includes('Tiger')) return 'Tiger'
    if (evt.title.includes('Elephant')) return 'Elephant'
    if (evt.title.includes('Leopard')) return 'Leopard'
    if (evt.title.includes('Deer')) return 'Deer'
    return 'Fauna'
  }

  // Active item for the floating tooltip
  const activeTooltip = hoveredItem || (selectedItem ? { itemType: selectedItem.itemType, data: selectedItem.data } : null)
  const selectedMarkerId = selectedItem?.data?.id

  return (
    <div className="tactical-map-viewport">
      {/* 1. Tactical Coordinate Grid Overlay */}
      <div className="tactical-grid-overlay" />

      {/* 2. Central SVG Topographic Map Layer */}
      <svg
        className="tactical-svg-layer"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* River Water Gradient */}
          <linearGradient id="riverWaterGradient2D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a6e84" />
            <stop offset="35%" stopColor="#228ea8" />
            <stop offset="65%" stopColor="#2597b4" />
            <stop offset="100%" stopColor="#1a687e" />
          </linearGradient>

          {/* Riparian Wetland Bank Gradient */}
          <linearGradient id="riverBankGradient2D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#183626" />
            <stop offset="50%" stopColor="#1b412e" />
            <stop offset="100%" stopColor="#163223" />
          </linearGradient>

          {/* Soft Drop Shadow for Tree Canopies */}
          <filter id="canopyDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0.15" dy="0.25" stdDeviation="0.2" floodColor="#0a170f" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Base Reserve Ground Fill */}
        <rect x="0" y="0" width="100" height="100" fill="#14281c" />

        {/* Sector Tint Overlays */}
        {/* Zone 1: North Canopy (NW) */}
        <rect
          x="2"
          y="2"
          width="47"
          height="47"
          rx="1"
          fill="rgba(36, 94, 69, 0.12)"
          stroke={selectedZone === 'zone-1' ? '#2dd4bf' : 'rgba(36, 94, 69, 0.3)'}
          strokeWidth={selectedZone === 'zone-1' ? '0.7' : '0.35'}
          strokeDasharray={selectedZone === 'zone-1' ? 'none' : '1.5 1'}
        />

        {/* Zone 2: East River Basin (NE) */}
        <rect
          x="51"
          y="2"
          width="47"
          height="47"
          rx="1"
          fill="rgba(31, 122, 120, 0.12)"
          stroke={selectedZone === 'zone-2' ? '#22d3ee' : 'rgba(31, 122, 120, 0.3)'}
          strokeWidth={selectedZone === 'zone-2' ? '0.7' : '0.35'}
          strokeDasharray={selectedZone === 'zone-2' ? 'none' : '1.5 1'}
        />

        {/* Zone 3: South Wildlife Corridor (SW) */}
        <rect
          x="2"
          y="51"
          width="47"
          height="47"
          rx="1"
          fill="rgba(117, 78, 180, 0.12)"
          stroke={selectedZone === 'zone-3' ? '#c084fc' : 'rgba(117, 78, 180, 0.3)'}
          strokeWidth={selectedZone === 'zone-3' ? '0.7' : '0.35'}
          strokeDasharray={selectedZone === 'zone-3' ? 'none' : '1.5 1'}
        />

        {/* Zone 4: West Buffer Zone (SE) */}
        <rect
          x="51"
          y="51"
          width="47"
          height="47"
          rx="1"
          fill="rgba(183, 122, 32, 0.12)"
          stroke={selectedZone === 'zone-4' ? '#fbbf24' : 'rgba(183, 122, 32, 0.3)'}
          strokeWidth={selectedZone === 'zone-4' ? '0.7' : '0.35'}
          strokeDasharray={selectedZone === 'zone-4' ? 'none' : '1.5 1'}
        />

        {/* Sector Boundary Crosshairs */}
        <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.3" strokeDasharray="2 1.5" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.3" strokeDasharray="2 1.5" />

        {/* CONTINUOUS SHARED RIVER (Visibly Flowing Downstream) */}
        {/* Riparian Outer Shoreline Bank */}
        <path d={riverBankPath} fill="url(#riverBankGradient2D)" />

        {/* Main Blue River Surface */}
        <path d={riverWaterPath} fill="url(#riverWaterGradient2D)" stroke="#1a5e72" strokeWidth="0.25" />

        {/* Animated Downstream Flow Lines (North to South downstream current) */}
        <path d={riverCenterlinePath} className="river-flow-line-main" fill="none" />
        <path d={riverLeftFlowPath} className="river-flow-line-accent" fill="none" />
        <path d={riverRightFlowPath} className="river-flow-line-secondary" fill="none" />

        {/* ANIMAL TRAILS */}
        {trails.map((trail) => {
          const pointsString = trail.points.map((p) => `${p.x},${p.y}`).join(' ')
          return (
            <g key={trail.id} className="tactical-trail-group">
              {/* Soft glow stroke */}
              <polyline
                points={pointsString}
                fill="none"
                stroke={trail.color}
                strokeWidth="1.6"
                strokeOpacity="0.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dashed trail line */}
              <polyline
                points={pointsString}
                fill="none"
                stroke={trail.color}
                strokeWidth="0.75"
                strokeDasharray="2.2 1.4"
                strokeOpacity="0.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Waypoints */}
              {trail.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="0.75"
                  fill={trail.color}
                  opacity="0.9"
                />
              ))}
            </g>
          )
        })}

        {/* DENSE TOP-DOWN TREE CANOPIES (Matching 3D Distribution) */}
        <g className="tactical-canopy-layer" filter="url(#canopyDropShadow)">
          {tacticalTreeCanopies.map((c) => (
            <g key={c.id}>
              {/* Main canopy dome */}
              <circle cx={c.x} cy={c.y} r={c.r} fill={c.color} />
              {/* Subtle top-down specular highlight giving 3D spherical feel */}
              <circle
                cx={c.x - c.r * 0.22}
                cy={c.y - c.r * 0.22}
                r={c.r * 0.55}
                fill="rgba(255, 255, 255, 0.12)"
              />
            </g>
          ))}
        </g>

        {/* Clean, Non-Obtrusive Sector Labels (Placed in corners, away from pins & river) */}
        <g className="tactical-zone-labels" pointerEvents="none">
          {/* Zone 1 Label */}
          <rect x="5" y="4.5" width="23" height="4.5" rx="1" fill="rgba(15, 28, 20, 0.85)" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="0.3" />
          <circle cx="7" cy="6.8" r="0.8" fill="#10b981" />
          <text x="9" y="7.5" fill="#e2e8f0" fontSize="2.2" fontWeight="700" fontFamily="sans-serif">
            Zone 1 · North Canopy
          </text>

          {/* Zone 2 Label */}
          <rect x="72" y="4.5" width="23" height="4.5" rx="1" fill="rgba(15, 28, 20, 0.85)" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="0.3" />
          <circle cx="74" cy="6.8" r="0.8" fill="#06b6d4" />
          <text x="76" y="7.5" fill="#e2e8f0" fontSize="2.2" fontWeight="700" fontFamily="sans-serif">
            Zone 2 · River Basin
          </text>

          {/* Zone 3 Label */}
          <rect x="5" y="91" width="23" height="4.5" rx="1" fill="rgba(15, 28, 20, 0.85)" stroke="rgba(192, 132, 252, 0.4)" strokeWidth="0.3" />
          <circle cx="7" cy="93.3" r="0.8" fill="#a855f7" />
          <text x="9" y="94.0" fill="#e2e8f0" fontSize="2.2" fontWeight="700" fontFamily="sans-serif">
            Zone 3 · South Corridor
          </text>

          {/* Zone 4 Label */}
          <rect x="72" y="91" width="23" height="4.5" rx="1" fill="rgba(15, 28, 20, 0.85)" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.3" />
          <circle cx="74" cy="93.3" r="0.8" fill="#f59e0b" />
          <text x="76" y="94.0" fill="#e2e8f0" fontSize="2.2" fontWeight="700" fontFamily="sans-serif">
            Zone 4 · West Buffer
          </text>
        </g>
      </svg>

      {/* 3. HTML INTERACTIVE MARKER LAYER (Compact, Zero Overlap, High-Contrast) */}
      <div className="tactical-markers-layer">
        {/* SENSORS (Cameras & Microphones) */}
        {filteredSensors.map((sensor) => {
          const isOnline = sensor.status === 'online'
          const isCamera = sensor.type === 'camera'
          const tag = getSensorDisplayTag(sensor.id)
          const isSelected = selectedMarkerId === sensor.id

          return (
            <div
              key={sensor.id}
              className={`tactical-pin ${isCamera ? 'pin-camera' : 'pin-acoustic'} ${isOnline ? 'online' : 'offline'} ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${sensor.coordinates.x}%`,
                top: `${sensor.coordinates.y}%`
              }}
              onClick={() => onSelectMarker({ itemType: 'sensor', data: sensor })}
              onMouseEnter={() => setHoveredItem({ itemType: 'sensor', data: sensor })}
              onMouseLeave={() => setHoveredItem(null)}
              title={`${sensor.id} - ${sensor.name}`}
            >
              <div className="pin-pulse" />
              <div className="pin-badge">
                {isCamera ? <Camera size={10} /> : <Radio size={10} />}
                <span className="pin-tag-text">{tag}</span>
              </div>
            </div>
          )
        })}

        {/* THREAT INCIDENTS */}
        {threatMarkers.map((evt) => {
          const isCritical = evt.priority === 'critical'
          const isResolved = evt.status === 'resolved'
          const isSelected = selectedMarkerId === evt.id
          const tag = getThreatShortTag(evt)

          return (
            <div
              key={evt.id}
              className={`tactical-pin pin-threat ${isCritical ? 'critical' : 'warning'} ${isResolved ? 'resolved' : ''} ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${evt.coordinates.x}%`,
                top: `${evt.coordinates.y}%`
              }}
              onClick={() => onSelectMarker({ itemType: 'event', data: evt })}
              onMouseEnter={() => setHoveredItem({ itemType: 'event', data: evt })}
              onMouseLeave={() => setHoveredItem(null)}
              title={`${evt.title} (${evt.id})`}
            >
              {!isResolved && <div className="pin-pulse threat-pulse" />}
              <div className="pin-badge">
                <ShieldAlert size={10} />
                <span className="pin-tag-text">{tag}</span>
              </div>
            </div>
          )
        })}

        {/* WILDLIFE SIGHTINGS */}
        {wildlifeMarkers.map((evt) => {
          const isSelected = selectedMarkerId === evt.id
          const tag = getWildlifeShortTag(evt)

          return (
            <div
              key={evt.id}
              className={`tactical-pin pin-wildlife ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${evt.coordinates.x}%`,
                top: `${evt.coordinates.y}%`
              }}
              onClick={() => onSelectMarker({ itemType: 'event', data: evt })}
              onMouseEnter={() => setHoveredItem({ itemType: 'event', data: evt })}
              onMouseLeave={() => setHoveredItem(null)}
              title={`${evt.title} (${evt.id})`}
            >
              <div className="pin-pulse wildlife-pulse" />
              <div className="pin-badge">
                <Activity size={10} />
                <span className="pin-tag-text">{tag}</span>
              </div>
            </div>
          )
        })}

        {/* 4. SLEEK FLOATING TOOLTIP (Appears on Hover or Selection Only — Zero Permanent Clutter) */}
        {activeTooltip && (
          <div
            className="tactical-floating-card"
            style={{
              left: `${Math.min(78, Math.max(16, activeTooltip.data?.coordinates?.x || 50))}%`,
              top: `${(activeTooltip.data?.coordinates?.y || 50) < 28 ? (activeTooltip.data?.coordinates?.y || 50) + 7 : (activeTooltip.data?.coordinates?.y || 50) - 5}%`,
              transform: (activeTooltip.data?.coordinates?.y || 50) < 28 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
            }}
          >
            {activeTooltip.itemType === 'sensor' ? (
              <>
                <div className="card-top-row">
                  <div className="card-tag">
                    {getSensorDisplayTag(activeTooltip.data.id)} · {activeTooltip.data.id}
                  </div>
                  <span className={`status-chip ${activeTooltip.data.status}`}>
                    {activeTooltip.data.status.toUpperCase()}
                  </span>
                </div>
                <div className="card-title">{activeTooltip.data.name}</div>
                <div className="card-meta-grid">
                  <div className="meta-item">
                    <span className="meta-lbl">Zone</span>
                    <span className="meta-val">{activeTooltip.data.zoneName?.split(':')[1]?.trim() || activeTooltip.data.zoneId}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Power</span>
                    <span className="meta-val">{activeTooltip.data.battery}% Battery</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">GPS</span>
                    <span className="meta-val">{activeTooltip.data.coordinates.simulatedLat}°N, {activeTooltip.data.coordinates.simulatedLng}°E</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Signal</span>
                    <span className="meta-val">{activeTooltip.data.signalStrength}</span>
                  </div>
                </div>
                <div className="card-hint">Click marker to inspect in hardware panel</div>
              </>
            ) : (
              <>
                <div className="card-top-row">
                  <div className="card-tag">
                    {activeTooltip.data.category === 'threat' ? 'THREAT INCIDENT' : 'WILDLIFE SIGHTING'} · {activeTooltip.data.id}
                  </div>
                  <span className={`status-chip priority-${activeTooltip.data.priority || 'medium'}`}>
                    {(activeTooltip.data.priority || activeTooltip.data.status || 'ACTIVE').toUpperCase()}
                  </span>
                </div>
                <div className="card-title">{activeTooltip.data.title}</div>
                <div className="card-meta-grid">
                  <div className="meta-item">
                    <span className="meta-lbl">Time</span>
                    <span className="meta-val">{activeTooltip.data.timeAgo}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">AI Confidence</span>
                    <span className="meta-val">
                      {activeTooltip.data.confidence ? `${Math.round(activeTooltip.data.confidence * 100)}% Match` : 'Telemetry'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Location</span>
                    <span className="meta-val">{activeTooltip.data.zoneName?.split(':')[1]?.trim() || activeTooltip.data.zoneId}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Coordinates</span>
                    <span className="meta-val">{activeTooltip.data.coordinates.simulatedLat}°N, {activeTooltip.data.coordinates.simulatedLng}°E</span>
                  </div>
                </div>
                <div className="card-hint">Click marker to open full incident response</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 5. HUD OVERLAYS WITHIN 2D VIEWPORT */}
      {/* Top-Left Sector Switcher */}
      <div className="hud-zone-selector">
        <span className="hud-zone-label">Sector:</span>
        <button
          className={`hud-zone-btn ${selectedZone === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedZone('all')}
        >
          All
        </button>
        {zones.map((z) => (
          <button
            key={z.id}
            className={`hud-zone-btn ${selectedZone === z.id ? 'active' : ''}`}
            onClick={() => setSelectedZone(z.id)}
          >
            {z.code}
          </button>
        ))}
      </div>

      {/* Top-Right Reset Button */}
      <div className="hud-camera-actions">
        <button
          className="hud-action-btn"
          onClick={() => setSelectedZone('all')}
          title="Reset Sector Filter"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Bottom-Left Symbology Legend */}
      {showLegend ? (
        <div className="map-hud-legend">
          <div className="legend-header-row">
            <span>Tactical GIS Symbology</span>
            <button
              onClick={() => setShowLegend(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 2px'
              }}
              title="Hide legend"
            >
              <X size={10} />
            </button>
          </div>
          <div className="legend-grid-items">
            <div className="legend-entry">
              <Camera size={11} style={{ color: 'var(--accent-teal)' }} />
              <span>Camera (CAM-01)</span>
            </div>
            <div className="legend-entry">
              <Radio size={11} style={{ color: 'var(--accent-green)' }} />
              <span>Acoustic (MIC-01)</span>
            </div>
            <div className="legend-entry">
              <ShieldAlert size={11} style={{ color: 'var(--accent-red)' }} />
              <span>Threat Beacon</span>
            </div>
            <div className="legend-entry">
              <Activity size={11} style={{ color: 'var(--accent-purple)' }} />
              <span>Wildlife Detection</span>
            </div>
            <div className="legend-entry">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-amber)',
                  display: 'inline-block'
                }}
              />
              <span>Sensor Offline (MIC-05)</span>
            </div>
            <div className="legend-entry">
              <span
                style={{
                  width: 14,
                  height: 2,
                  backgroundColor: '#2597b4',
                  display: 'inline-block'
                }}
              />
              <span>Flowing River (N→S)</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="hud-action-btn"
          style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10 }}
          onClick={() => setShowLegend(true)}
        >
          <Layers size={11} />
          <span>Legend</span>
        </button>
      )}

      {/* Bottom-Right Scale and Coordinate Datum Pill */}
      <div className="tactical-scale-pill">
        <span>500m</span>
        <span className="scale-bar-line" />
        <span>Eco-WGS84 • Grid 100x100</span>
      </div>
    </div>
  )
}
