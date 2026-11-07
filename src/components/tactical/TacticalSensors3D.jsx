import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

/**
 * 3D Sensor Node Marker
 */
function SensorNodeMarker({
  sensor,
  isSelected,
  isDetecting,
  showLabel,
  onClick
}) {
  const pulseRef = useRef()
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const { x, y, z } = sensor.position

  const isFailed = sensor.status === 'failed'
  const isOffline = sensor.status === 'offline'

  let primaryColor = '#06b6d4' // Cyan for online
  if (isFailed) primaryColor = '#ef4444' // Red for failed
  else if (isOffline) primaryColor = '#64748b' // Slate for offline
  else if (isDetecting) primaryColor = '#f59e0b' // Amber when detecting acoustic sound

  if (isSelected) {
    primaryColor = '#00f0ff' // Bright cyan when selected
  }

  useFrame((state) => {
    if (pulseRef.current && (sensor.status === 'online' || isDetecting)) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3.5 + x) * 0.22
      pulseRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={[x, y, z]}>
      {/* 1. Pulsing Ground Target Ring */}
      <mesh
        ref={pulseRef}
        position={[0, 0.12, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.5, 0.85, 24]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={isSelected ? 0.85 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 1b. Queued Messages Pending Ring */}
      {(sensor.messageQueue?.length || 0) > 0 && (
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.25, 24]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 1c. Selected Sensor Ground Highlight Ring */}
      {isSelected && (
        <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.38, 32]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 2. Interactive Click Collider with Drag-Threshold Filter */}
      <mesh
        position={[0, 0.8, 0]}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          e.stopPropagation()
          const dx = Math.abs(e.clientX - pointerDownPos.current.x)
          const dy = Math.abs(e.clientY - pointerDownPos.current.y)
          // Ignore if user was orbiting or panning camera
          if (dx > 5 || dy > 5) return
          onClick?.(sensor)
        }}
        cursor="pointer"
      >
        <cylinderGeometry args={[0.9, 0.9, 2.2, 12]} />
        <meshBasicMaterial transparent opacity={0.0} />
      </mesh>

      {/* 3. Tactical Node Beacon Mast */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.22, 1.2, 8]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* 4. Glowing Node Sensor Head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={isSelected ? 3.0 : 1.3}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* 4b. Selection Cyan Wireframe Halo */}
      {isSelected && (
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#00f0ff"
            wireframe
            transparent
            opacity={0.65}
          />
        </mesh>
      )}

      {/* 5. Monospaced HUD Badge Label */}
      {showLabel && (
        <Html
          position={[0, 2.4, 0]}
          center
          distanceFactor={45}
          zIndexRange={isSelected ? [500, 300] : [40, 10]}
        >
          <div
            onPointerDown={(e) => {
              pointerDownPos.current = { x: e.clientX, y: e.clientY }
            }}
            onClick={(e) => {
              e.stopPropagation()
              const dx = Math.abs(e.clientX - pointerDownPos.current.x)
              const dy = Math.abs(e.clientY - pointerDownPos.current.y)
              if (dx > 5 || dy > 5) return
              onClick?.(sensor)
            }}
            className={`tactical-sensor-badge ${isSelected ? 'selected' : ''} ${isFailed ? 'failed' : ''}`}
            style={{
              borderColor: (sensor.messageQueue?.length || 0) > 0 ? '#f59e0b' : primaryColor,
              color: primaryColor,
              backgroundColor: 'rgba(3, 10, 16, 0.88)'
            }}
          >
            <span className="badge-dot" style={{ backgroundColor: primaryColor }} />
            <span className="badge-id">{sensor.id}</span>
            {(sensor.messageQueue?.length || 0) > 0 && (
              <span
                className="sensor-queue-badge"
                title={`${sensor.messageQueue.length} pending message(s) buffered in queue`}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#03080c',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  marginLeft: '4px'
                }}
              >
                Q:{sensor.messageQueue.length}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * 3D Base Station Command Tower
 */
function BaseStationMarker({
  baseStation,
  isSelected,
  showLabel,
  isReceiving,
  onClick
}) {
  const radarRef = useRef()
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const { x, y, z } = baseStation.position

  const isFailed = baseStation.status === 'failed'
  const baseColor = isFailed ? '#ef4444' : isReceiving ? '#22d3ee' : '#38bdf8'

  useFrame((state, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.z += delta * 1.8
      const s = isReceiving
        ? 1.0 + Math.sin(state.clock.elapsedTime * 8) * 0.4
        : 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.15
      radarRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={[x, y, z]}>
      {/* 1. Base Station Radar Ground Disc */}
      <mesh
        ref={radarRef}
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.2, 2.4, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isReceiving ? 0.75 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Concentric Inner Ring */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.7, 24]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Base Mast Truss Structure */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.22, 0.65, 3.6, 6]} />
        <meshStandardMaterial
          color="#0f2638"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* 4. Tower Command Radar Dome */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.75, 20, 20]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isReceiving ? 2.8 : 1.4}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* 5. Antenna Spire Spike */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 1.8, 8]} />
        <meshBasicMaterial color={baseColor} />
      </mesh>

      {/* 6. Click Collider */}
      <mesh
        position={[0, 2.5, 0]}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          e.stopPropagation()
          const dx = Math.abs(e.clientX - pointerDownPos.current.x)
          const dy = Math.abs(e.clientY - pointerDownPos.current.y)
          if (dx > 5 || dy > 5) return
          onClick?.(baseStation)
        }}
        cursor="pointer"
      >
        <cylinderGeometry args={[1.5, 1.5, 5.5, 12]} />
        <meshBasicMaterial transparent opacity={0.0} />
      </mesh>

      {/* 7. Base Station Label */}
      {showLabel && (
        <Html
          position={[0, 6.2, 0]}
          center
          distanceFactor={48}
          zIndexRange={isSelected ? [500, 300] : [80, 20]}
        >
          <div
            onPointerDown={(e) => {
              pointerDownPos.current = { x: e.clientX, y: e.clientY }
            }}
            onClick={(e) => {
              e.stopPropagation()
              const dx = Math.abs(e.clientX - pointerDownPos.current.x)
              const dy = Math.abs(e.clientY - pointerDownPos.current.y)
              if (dx > 5 || dy > 5) return
              onClick?.(baseStation)
            }}
            className={`tactical-sensor-badge base-badge ${isSelected ? 'selected' : ''}`}
            style={{
              borderColor: baseColor,
              color: baseColor,
              backgroundColor: 'rgba(2, 12, 22, 0.92)'
            }}
          >
            <span className="badge-dot" style={{ backgroundColor: baseColor }} />
            <span className="badge-id">BASE STATION</span>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Collection of all Tactical Sensors and the Base Station
 */
export default function TacticalSensors3D({
  sensors,
  baseStation,
  selectedNodeId,
  detectingSensorIds = [],
  showLabels = true,
  isBaseReceiving = false,
  onSelectNode,
  suppressedLabelIds = []
}) {
  return (
    <group>
      {/* 1. All Acoustic Sensor Nodes */}
      {sensors.map((sensor) => (
        <SensorNodeMarker
          key={sensor.id}
          sensor={sensor}
          isSelected={selectedNodeId === sensor.id}
          isDetecting={detectingSensorIds.includes(sensor.id)}
          showLabel={showLabels && !suppressedLabelIds.includes(sensor.id)}
          onClick={onSelectNode}
        />
      ))}

      {/* 2. Primary Command Base Station */}
      {baseStation && (
        <BaseStationMarker
          baseStation={baseStation}
          isSelected={selectedNodeId === baseStation.id}
          showLabel={showLabels}
          isReceiving={isBaseReceiving}
          onClick={onSelectNode}
        />
      )}
    </group>
  )
}
