import React, { useState } from 'react'
import { Html } from '@react-three/drei'
import { Activity } from 'lucide-react'
import { gridToWorld } from './terrainHelper'

export default function WildlifeModel3D({ event, onSelectWildlife, isSelected, portal }) {
  const [hovered, setHovered] = useState(false)
  const activeHighlight = hovered || isSelected
  const [worldX, worldY, worldZ] = gridToWorld(
    event.coordinates.x,
    event.coordinates.y
  )

  const isTiger = event.title.includes('Tiger') || event.title.includes('Leopard')
  const isElephant = event.title.includes('Elephant')

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* ==================================================================
          1. ELEPHANT 3D MODEL
          ================================================================== */}
      {isElephant && (
        <group scale={[0.8, 0.8, 0.8]}>
          {/* Main Torso */}
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[2.2, 1.8, 3.2]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} />
          </mesh>

          {/* Head & Forehead Dome */}
          <mesh position={[0, 3.0, 1.8]} castShadow>
            <boxGeometry args={[1.4, 1.4, 1.4]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} />
          </mesh>

          {/* Large Ears (Left & Right) */}
          <mesh position={[-0.95, 3.0, 1.6]} rotation={[0, -0.2, -0.1]}>
            <boxGeometry args={[0.1, 1.3, 1.1]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>
          <mesh position={[0.95, 3.0, 1.6]} rotation={[0, 0.2, 0.1]}>
            <boxGeometry args={[0.1, 1.3, 1.1]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>

          {/* Curved Trunk */}
          <mesh position={[0, 2.1, 2.5]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.15, 1.8, 6]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} />
          </mesh>

          {/* Ivory Tusks (Left & Right) */}
          <mesh position={[-0.45, 2.3, 2.2]} rotation={[0.6, -0.2, 0]}>
            <coneGeometry args={[0.08, 0.9, 5]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0.45, 2.3, 2.2]} rotation={[0.6, 0.2, 0]}>
            <coneGeometry args={[0.08, 0.9, 5]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Four Sturdy Legs */}
          <mesh position={[-0.75, 1.0, 1.0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 2.0, 6]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          <mesh position={[0.75, 1.0, 1.0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 2.0, 6]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          <mesh position={[-0.75, 1.0, -1.0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 2.0, 6]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
          <mesh position={[0.75, 1.0, -1.0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 2.0, 6]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* ==================================================================
          2. BENGAL TIGER / LEOPARD 3D MODEL
          ================================================================== */}
      {isTiger && (
        <group scale={[0.75, 0.75, 0.75]}>
          {/* Sleek Feline Body */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[0.9, 0.95, 2.2]} />
            <meshStandardMaterial color="#d97706" roughness={0.7} />
          </mesh>

          {/* Feline Head */}
          <mesh position={[0, 1.55, 1.25]} castShadow>
            <boxGeometry args={[0.75, 0.7, 0.8]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.7} />
          </mesh>

          {/* Muzzle */}
          <mesh position={[0, 1.38, 1.7]}>
            <boxGeometry args={[0.42, 0.35, 0.35]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.6} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.3, 1.95, 1.15]}>
            <coneGeometry args={[0.15, 0.3, 4]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.3, 1.95, 1.15]}>
            <coneGeometry args={[0.15, 0.3, 4]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Tail */}
          <mesh position={[0, 1.5, -1.4]} rotation={[-0.7, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 1.4, 5]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>

          {/* Four Legs */}
          <mesh position={[-0.35, 0.55, 0.7]} castShadow>
            <cylinderGeometry args={[0.14, 0.12, 1.1, 5]} />
            <meshStandardMaterial color="#b45309" />
          </mesh>
          <mesh position={[0.35, 0.55, 0.7]} castShadow>
            <cylinderGeometry args={[0.14, 0.12, 1.1, 5]} />
            <meshStandardMaterial color="#b45309" />
          </mesh>
          <mesh position={[-0.35, 0.55, -0.7]} castShadow>
            <cylinderGeometry args={[0.14, 0.12, 1.1, 5]} />
            <meshStandardMaterial color="#b45309" />
          </mesh>
          <mesh position={[0.35, 0.55, -0.7]} castShadow>
            <cylinderGeometry args={[0.14, 0.12, 1.1, 5]} />
            <meshStandardMaterial color="#b45309" />
          </mesh>
        </group>
      )}

      {/* ==================================================================
          3. DEER / GENERIC FAUNA 3D MODEL
          ================================================================== */}
      {!isElephant && !isTiger && (
        <group scale={[0.7, 0.7, 0.7]}>
          {/* Slender Torso */}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.85, 1.8]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} />
          </mesh>
          {/* Graceful Neck & Head */}
          <mesh position={[0, 1.9, 0.8]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.28, 1.1, 5]} />
            <meshStandardMaterial color="#854d0e" />
          </mesh>
          <mesh position={[0, 2.3, 1.1]}>
            <boxGeometry args={[0.45, 0.45, 0.7]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          {/* Antlers */}
          <mesh position={[-0.2, 2.7, 0.95]} rotation={[0.2, -0.3, -0.3]}>
            <cylinderGeometry args={[0.04, 0.05, 0.7, 4]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          <mesh position={[0.2, 2.7, 0.95]} rotation={[0.2, 0.3, 0.3]}>
            <cylinderGeometry args={[0.04, 0.05, 0.7, 4]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          {/* Slender Legs */}
          <mesh position={[-0.3, 0.6, 0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 1.2, 4]} />
            <meshStandardMaterial color="#713f12" />
          </mesh>
          <mesh position={[0.3, 0.6, 0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 1.2, 4]} />
            <meshStandardMaterial color="#713f12" />
          </mesh>
          <mesh position={[-0.3, 0.6, -0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 1.2, 4]} />
            <meshStandardMaterial color="#713f12" />
          </mesh>
          <mesh position={[0.3, 0.6, -0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 1.2, 4]} />
            <meshStandardMaterial color="#713f12" />
          </mesh>
        </group>
      )}

      {/* Floating 3D Interactive Wildlife Tag — Compact & Anti-Collision */}
      {/* 4. Compact Wildlife Detection Tag — Only rendered when hovered or selected to prevent permanent canopy clutter */}
      {activeHighlight && (
        <Html
        portal={portal}
          position={[0, 3.8, 0]}
          center
          distanceFactor={55}
          zIndexRange={[200, 100]}
        >
          <div
            className={`compact-wildlife-tag selected`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation()
              onSelectWildlife({ itemType: 'event', data: event })
            }}
            title={`${event.title} • Click to inspect fauna detection`}
          >
            <div className="wildlife-tag-icon">
              <Activity size={11} style={{ color: 'var(--accent-purple)' }} />
            </div>

            <span className="wildlife-tag-text">
              {event.title.includes('Elephant') ? 'Elephant' : event.title.includes('Tiger') ? 'Tiger' : event.title.includes('Leopard') ? 'Leopard' : 'Fauna'}
            </span>

            {/* Rich Tooltip on hover or selection */}
            <div className="tag-hover-tooltip wildlife">
              <div className="tooltip-title">{event.title}</div>
              <div className="tooltip-meta">
                <span>{event.id}</span>
                <span>•</span>
                <span>{Math.round((event.confidence || 0) * 100)}% match</span>
                <span>•</span>
                <span>{event.timeAgo}</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
