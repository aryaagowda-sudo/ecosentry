import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ShieldAlert, Volume2, Flame, User, Footprints, AlertTriangle } from 'lucide-react'
import { gridToWorld, getSensorDisplayTag } from './terrainHelper'

export default function ThreatMarker3D({ event, onSelectEvent, isSelected, portal }) {
  const ringRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Calculate world coordinates grounded directly at the event/sensor point
  const [worldX, worldY, worldZ] = gridToWorld(
    event.coordinates.x,
    event.coordinates.y
  )

  const isCritical = event.priority === 'critical'
  const isHigh = event.priority === 'high'
  const isResolved = event.status === 'resolved'
  const activeHighlight = hovered || isSelected

  const accentColor = isResolved
    ? '#829286'
    : isCritical
    ? '#C94232'
    : isHigh
    ? '#B77A20'
    : '#2B6888'

  // Animate pulse ring
  useFrame((state, delta) => {
    if (ringRef.current && !isResolved) {
      ringRef.current.rotation.z += delta * 1.5
      const s = 1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.22
      ringRef.current.scale.set(s, s, s)
    }
  })

  // Select appropriate Lucide icon
  const getIcon = () => {
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
      default:
        return <ShieldAlert size={size} style={{ color: '#FFFFFF' }} />
    }
  }

  // Display label matching Reference Image 2: "1 · MIC-01" or "2 · MIC-04"
  const getIncidentLabel = () => {
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
            opacity={isCritical ? 0.75 : 0.55}
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
            opacity={isCritical ? 0.35 : 0.2}
          />
        </mesh>
      )}

      {/* 3. Solid Coral-Red Pill Tag Matching Image 2 ("1 · MIC-01", "2 · MIC-04") */}
      <Html
        portal={portal}
        position={[0, 4.2, 0]}
        center
        distanceFactor={55}
        zIndexRange={[260, 140]}
      >
        <div
          className={`compact-threat-tag ${event.priority} ${event.status} ${activeHighlight ? 'selected' : ''}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelectEvent({ itemType: 'event', data: event })
          }}
          title={`${event.title} (${event.id}) • Click to inspect incident`}
        >
          <div className="threat-tag-icon">{getIcon()}</div>
          <span className="threat-tag-text">{getIncidentLabel()}</span>

          {/* Expanded tooltip on hover/select */}
          {activeHighlight && (
            <div className="tag-hover-tooltip threat">
              <div className="tooltip-title">{event.title}</div>
              <div className="tooltip-meta">
                <span>ID: {event.id}</span>
                <span>•</span>
                <span>
                  {event.confidence ? `${Math.round(event.confidence * 100)}% match` : 'Hardware'}
                </span>
                <span>•</span>
                <span style={{ textTransform: 'uppercase' }}>{event.status}</span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
