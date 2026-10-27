import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ShieldAlert, Volume2, Flame, User, Footprints, AlertTriangle, Move, Activity } from 'lucide-react'
import { gridToWorld, getSensorDisplayTag } from './terrainHelper'
import { SEVERITY_LEVELS } from '../../data/toolboxEvents'

export default function ThreatMarker3D({ event, onSelectEvent, isSelected, onStartReposition }) {
  const ringRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Calculate world coordinates grounded directly at the event point
  const [worldX, worldY, worldZ] = gridToWorld(
    event.coordinates.x,
    event.coordinates.y
  )

  const isResolved = event.status === 'resolved'
  const isAcknowledged = event.status === 'acknowledged'
  const activeHighlight = hovered || isSelected

  // Dynamic accent color based on priority/severity
  const severityObj = SEVERITY_LEVELS.find((s) => s.id === event.priority)
  const baseColor = severityObj?.color || '#C94232'
  const accentColor = isResolved ? '#829286' : baseColor

  // Animate pulse ring
  useFrame((state, delta) => {
    if (ringRef.current && !isResolved) {
      ringRef.current.rotation.z += delta * 1.5
      const s = 1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.22
      ringRef.current.scale.set(s, s, s)
    }
  })

  // Select appropriate icon / emoji
  const renderIcon = () => {
    if (event.icon) {
      // If emoji or custom icon string
      return <span className="marker-emoji-icon">{event.icon}</span>
    }
    const size = 11
    switch (event.type) {
      case 'chainsaw_sound':
        return <Volume2 size={size} style={{ color: '#FFFFFF' }} />
      case 'gunshot_sound':
        return <Flame size={size} style={{ color: '#FFFFFF' }} />
      case 'human_detection':
        return <User size={size} style={{ color: '#FFFFFF' }} />
      case 'animal_boundary_crossing':
        return <Footprints size={size} style={{ color: '#FFFFFF' }} />
      case 'injured_animal':
      case 'animal_distress':
        return <Activity size={size} style={{ color: '#FFFFFF' }} />
      default:
        return <ShieldAlert size={size} style={{ color: '#FFFFFF' }} />
    }
  }

  // Display label: Manual title vs automated sensor incident ("1 · MIC-01")
  const getIncidentLabel = () => {
    if (event.isManual) {
      return event.title
    }
    let num = '1'
    if (event.id === 'EVT-2026-102' || event.sensorId === 'AC-W01') num = '2'
    else if (event.id === 'EVT-2026-103') num = '3'
    else if (String(event.id).includes('102')) num = '2'
    else if (String(event.id).includes('103')) num = '3'
    
    const tag = event.sensorId ? getSensorDisplayTag(event.sensorId) : (event.title?.split(' ')[0] || 'Incident')
    return `${num} · ${tag}`
  }

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* 1. Pulsing Ground Alert Ring */}
      {!isResolved && (
        <mesh
          ref={ringRef}
          position={[0, 0.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.0, 1.6, 24]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={event.priority === 'critical' ? 0.75 : 0.55}
            side={2}
          />
        </mesh>
      )}

      {/* 2. Vertical Light Pillar Beacon */}
      {!isResolved && (
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.04, 0.22, 6.4, 8]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={event.priority === 'critical' ? 0.35 : 0.2}
          />
        </mesh>
      )}

      {/* 3. Solid Pill Tag (Severity themed, matching Image 2 for automated, custom-styled for manual) */}
      <Html
        position={[0, 4.2, 0]}
        center
        distanceFactor={55}
        zIndexRange={[260, 140]}
      >
        <div
          className={`compact-threat-tag ${event.priority} ${event.status} ${
            event.isManual ? 'manual-incident' : ''
          } ${activeHighlight ? 'selected' : ''}`}
          style={
            event.isManual && !isResolved
              ? { backgroundColor: accentColor, borderColor: `${accentColor}DD` }
              : undefined
          }
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelectEvent({ itemType: 'event', data: event })
          }}
          title={`${event.title} (${event.id}) • Click to inspect incident`}
        >
          <div className="threat-tag-icon">{renderIcon()}</div>
          <span className="threat-tag-text">{getIncidentLabel()}</span>

          {/* Expanded tooltip on hover/select */}
          {activeHighlight && (
            <div className="tag-hover-tooltip threat">
              <div className="tooltip-title">
                {event.icon && <span style={{ marginRight: 4 }}>{event.icon}</span>}
                {event.title}
              </div>
              <div className="tooltip-meta">
                <span>ID: {event.id}</span>
                <span>•</span>
                <span style={{ textTransform: 'uppercase' }}>{event.priority}</span>
                <span>•</span>
                <span style={{ textTransform: 'uppercase' }}>{event.status}</span>
              </div>
              <div className="tooltip-location-hint">
                Sector: {event.zoneName}
              </div>
              {event.isManual && onStartReposition && (
                <button
                  className="btn-tooltip-reposition"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartReposition(event)
                  }}
                  title="Move marker to new position on map"
                >
                  <Move size={10} />
                  <span>Reposition on terrain</span>
                </button>
              )}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

