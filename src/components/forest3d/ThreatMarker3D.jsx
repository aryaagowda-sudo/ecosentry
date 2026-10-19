import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ShieldAlert, Volume2, Flame, User, Footprints, AlertTriangle } from 'lucide-react'
import { gridToWorld } from './terrainHelper'

export default function ThreatMarker3D({ event, onSelectEvent }) {
  const ringRef = useRef()
  const [worldX, worldY, worldZ] = gridToWorld(
    event.coordinates.x,
    event.coordinates.y
  )

  const isCritical = event.priority === 'critical'
  const isResolved = event.status === 'resolved'
  const color = isResolved ? '#64746b' : isCritical ? '#ef4444' : '#f59e0b'

  // Animate pulse ring
  useFrame((state, delta) => {
    if (ringRef.current && !isResolved) {
      ringRef.current.rotation.z += delta * 1.5
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2
      ringRef.current.scale.set(s, s, s)
    }
  })

  // Select appropriate Lucide icon
  const getIcon = () => {
    switch (event.type) {
      case 'chainsaw_sound':
        return <Volume2 size={13} color={color} />
      case 'gunshot_sound':
        return <Flame size={13} color={color} />
      case 'human_detection':
        return <User size={13} color={color} />
      case 'animal_boundary_crossing':
        return <Footprints size={13} color={color} />
      default:
        return <ShieldAlert size={13} color={color} />
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
          <ringGeometry args={[1.2, 1.6, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.7}
            side={2}
          />
        </mesh>
      )}

      {/* 2. Vertical Light Pillar Beacon */}
      {!isResolved && (
        <mesh position={[0, 4.0, 0]}>
          <cylinderGeometry args={[0.08, 0.35, 8.0, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
          />
        </mesh>
      )}

      {/* 3. Floating 3D Interactive Tag */}
      <Html
        position={[0, 3.8, 0]}
        center
        distanceFactor={45}
        zIndexRange={[100, 0]}
      >
        <div
          className={`marker-3d-tag threat ${event.priority} ${event.status}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelectEvent({ itemType: 'event', data: event })
          }}
          title={`Click to inspect threat ${event.id}`}
        >
          <div className="tag-icon">{getIcon()}</div>
          <div className="tag-content">
            <span className="tag-title">{event.title}</span>
            <div className="tag-sub">
              <span>{event.id}</span>
              {event.confidence !== null && (
                <span className="tag-conf">
                  {Math.round(event.confidence * 100)}% match
                </span>
              )}
            </div>
          </div>
          <span className={`tag-status-pill ${event.status}`}>
            {event.status.toUpperCase()}
          </span>
        </div>
      </Html>
    </group>
  )
}
