import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ShieldAlert, Volume2, Flame, User, Footprints, AlertTriangle } from 'lucide-react'
import { gridToWorld } from './terrainHelper'

export default function ThreatMarker3D({ event, onSelectEvent, isSelected }) {
  const ringRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [worldX, worldY, worldZ] = gridToWorld(
    event.coordinates.x,
    event.coordinates.y
  )

  const isCritical = event.priority === 'critical'
  const isHigh = event.priority === 'high'
  const isResolved = event.status === 'resolved'
  const isActive = event.status === 'active'
  const isPriorityEvent = (isCritical || isHigh) && isActive
  const activeHighlight = hovered || isSelected

  const color = isResolved
    ? '#71838D'
    : isCritical
    ? '#EF5350'
    : isHigh
    ? '#E8AA3A'
    : '#58A6D9'

  // Animate pulse ring
  useFrame((state, delta) => {
    if (ringRef.current && !isResolved) {
      ringRef.current.rotation.z += delta * 1.5
      const s = 1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.25
      ringRef.current.scale.set(s, s, s)
    }
  })

  // Select appropriate Lucide icon
  const getIcon = () => {
    const size = 12
    switch (event.type) {
      case 'chainsaw_sound':
        return <Volume2 size={size} style={{ color }} />
      case 'gunshot_sound':
        return <Flame size={size} style={{ color }} />
      case 'human_detection':
        return <User size={size} style={{ color }} />
      case 'animal_boundary_crossing':
        return <Footprints size={size} style={{ color: 'var(--accent-purple)' }} />
      default:
        return <ShieldAlert size={size} style={{ color }} />
    }
  }

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* 1. Ground Alert Ring */}
      {!isResolved && (
        <mesh
          ref={ringRef}
          position={[0, 0.15, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.2, 1.8, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isCritical ? 0.75 : 0.5}
            side={2}
          />
        </mesh>
      )}

      {/* 2. Vertical Light Pillar Beacon */}
      {!isResolved && (
        <mesh position={[0, 4.0, 0]}>
          <cylinderGeometry args={[0.06, 0.3, 8.0, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isCritical ? 0.4 : 0.25}
          />
        </mesh>
      )}

      {/* 3. Floating 3D Interactive Tag - Elevated to y=4.4 to sit above sensor markers */}
      <Html
        position={[0, 4.4, 0]}
        center
        distanceFactor={48}
        zIndexRange={[320, 180]}
      >
        <div
          className={`marker-3d-pin threat ${event.priority} ${event.status} ${activeHighlight ? 'expanded' : isPriorityEvent ? 'priority' : 'compact'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelectEvent({ itemType: 'event', data: event })
          }}
          title={`${event.title} (${event.id}) • Click to inspect`}
        >
          <div className="pin-icon-wrap">{getIcon()}</div>

          {activeHighlight ? (
            <div className="pin-expanded-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="pin-title">{event.title}</span>
                <span className={`status-tag ${event.priority}`} style={{ padding: '0 4px', fontSize: '9px' }}>
                  {event.priority}
                </span>
              </div>
              <span className="pin-meta">
                {event.id} • {event.confidence ? `${Math.round(event.confidence * 100)}% match` : 'Hardware'} • {event.status.toUpperCase()}
              </span>
            </div>
          ) : isPriorityEvent ? (
            <div className="pin-priority-content">
              <span className="pin-title">{event.title.split(' ')[0]} Alert</span>
              {event.confidence !== null && (
                <span className="pin-conf-badge">{Math.round(event.confidence * 100)}%</span>
              )}
            </div>
          ) : (
            <span className="pin-label-mini">!</span>
          )}
        </div>
      </Html>
    </group>
  )
}
