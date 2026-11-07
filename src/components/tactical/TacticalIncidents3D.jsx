import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { X } from 'lucide-react'

import { getTerrainElevation } from '../forest3d/terrainHelper.js'
import { gridCoordsToWorld } from '../../services/meshNetwork/distanceMath.js'
import { isLegitimateTacticalIncident } from '../../services/meshNetwork/incidentFiltering.js'

export { isLegitimateTacticalIncident }

function getIncidentWorldPos(inc) {
  // 1. Direct 3D world position from terrain raycaster
  if (inc.worldPosition && typeof inc.worldPosition.x === 'number') {
    const x = inc.worldPosition.x
    const z = inc.worldPosition.z ?? 0
    const y = inc.worldPosition.y ?? getTerrainElevation(x, z)
    return { x, y, z }
  }
  // 2. Incident grid coordinates (0 to 100) converted to 3D world coordinates
  if (inc.coordinates && inc.coordinates.x !== undefined && inc.coordinates.y !== undefined) {
    return gridCoordsToWorld(inc.coordinates.x, inc.coordinates.y)
  }
  // 3. Fallback for purely acoustic simulated events without manual drop points
  if (inc.estimatedPosition && inc.estimatedPosition.x !== undefined) {
    const x = inc.estimatedPosition.x
    const z = inc.estimatedPosition.z || 0
    const y = inc.estimatedPosition.y ?? getTerrainElevation(x, z)
    return { x, y, z }
  }
  return { x: 0, y: 0, z: 0 }
}

function getIncidentColor(inc) {
  const p = String(inc.priority || inc.defaultSeverity || '').toLowerCase()
  if (p === 'critical') return '#ef4444'
  if (p === 'high') return '#f59e0b'
  if (p === 'medium') return '#00f0ff'
  if (p === 'low') return '#3b82f6'
  return '#fbbf24'
}

/**
 * 3D Tactical Incident & Uncertainty Region Visualization
 * 
 * Displays:
 * 1. Visualizes ONLY the active incident when placed or selected (no scattered background red dots)
 * 2. Active incident highlighting with light pillar, pulsing concentric rings, and HUD card
 * 3. Translucent Uncertainty Region (Radius R) derived from multi-sensor acoustic geometry
 */
export default function TacticalIncidents3D({
  incident = null,
  showCard = true,
  onDismiss,
  showUncertainty = true,
  onClick
}) {
  const ringRef = useRef()
  const beaconRef = useRef()

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.4
      const s = 1.0 + Math.sin(state.clock.elapsedTime * 3.6) * 0.14
      ringRef.current.scale.set(s, s, s)
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = 2.4 + Math.sin(state.clock.elapsedTime * 4.2) * 0.25
    }
  })

  // When no incident is actively placed or inspected, render nothing (no stray red dots on terrain)
  if (!incident) {
    return null
  }

  const pos = getIncidentWorldPos(incident)
  const color = getIncidentColor(incident)
  const uncertaintyR = incident.uncertaintyRadius || 12.0
  const detectionCount = incident.detectionCount || incident.detectingSensors?.length || 0
  const isAcoustic = incident.isAcousticFused || incident.type?.includes('sound') || incident.type?.includes('gunshot')

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* 1. Base Ring on Terrain */}
      <mesh
        position={[0, 0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(incident)
        }}
      >
        <ringGeometry args={[0.8, 1.4, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Pulsing Concentric Outer Ring */}
      <mesh ref={ringRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.3, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Vertical Light Pillar Beacon */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.06, 0.22, 6.4, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* 4. Floating Active Diamond Beacon */}
      <mesh
        ref={beaconRef}
        position={[0, 2.4, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(incident)
        }}
      >
        <octahedronGeometry args={[0.65]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3.0}
          roughness={0.1}
        />
      </mesh>

      {/* 5. Translucent Uncertainty Region Sphere & Disc */}
      {showUncertainty && isAcoustic && uncertaintyR > 0 && (
        <group>
          {/* 3D Sphere */}
          <mesh>
            <sphereGeometry args={[uncertaintyR, 24, 24]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.1}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Wireframe Outline */}
          <mesh>
            <sphereGeometry args={[uncertaintyR, 16, 16]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </mesh>

          {/* Ground Disc Area */}
          <mesh position={[0, -pos.y + 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[uncertaintyR, 40]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.14}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* 6. HUD Tactical Card Header */}
      {showCard && (
        <Html
          position={[0, 5.8, 0]}
          center
          distanceFactor={52}
          zIndexRange={[260, 140]}
        >
          <div
            onClick={(e) => {
              e.stopPropagation()
              onClick?.(incident)
            }}
            className="tactical-incident-hud-card"
            style={{ borderColor: color }}
          >
            <div className="incident-hud-header">
              <div className="incident-hud-header-left">
                <span className="incident-hud-icon">{incident.icon || '⚠️'}</span>
                <span className="incident-hud-title">{incident.title?.toUpperCase()}</span>
                <span className={`hud-priority-badge ${incident.priority || incident.defaultSeverity || 'high'}`}>
                  {(incident.priority || incident.defaultSeverity || 'HIGH').toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                className="btn-incident-hud-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss?.()
                }}
                title="Hide incident overlay (Press to dismiss)"
                aria-label="Hide incident overlay"
              >
                <X size={12} />
              </button>
            </div>

            <div className="incident-hud-row">
              <span className="hud-label">CLASSIFICATION:</span>
              <span className="hud-val highlight">
                {isAcoustic && detectionCount > 0
                  ? `${detectionCount} SENSOR${detectionCount > 1 ? 'S' : ''} DETECTED`
                  : 'MANUAL FIELD OBSERVATION'}
              </span>
            </div>

            <div className="incident-hud-row">
              <span className="hud-label">SOURCE LOCATION:</span>
              <span className="hud-val">
                [{pos.x.toFixed(1)}, {pos.z.toFixed(1)}]
                {incident.coordinates?.x !== undefined ? ` [G: ${incident.coordinates.x}, ${incident.coordinates.y}]` : ''}
                {` (${incident.zoneName || 'Reserve'})`}
              </span>
            </div>

            {/* Nearest Detecting Sensor */}
            {incident.nearestSensorId && (
              <div className="incident-hud-row">
                <span className="hud-label">NEAREST SENSOR:</span>
                <span className="hud-val cyan">
                  {incident.nearestSensorId}
                  {incident.nearestSensorDistance !== undefined && incident.nearestSensorDistance !== null
                    ? ` (${Number(incident.nearestSensorDistance).toFixed(1)}m)`
                    : ''}
                </span>
              </div>
            )}

            {/* Packet Originating Sensor */}
            <div className="incident-hud-row">
              <span className="hud-label">PACKET ORIGIN:</span>
              <span className="hud-val cyan">
                {incident.originatingSensorId ? (
                  <>
                    <span>
                      {incident.originatingSensorId}
                      {incident.originSensorDistance !== undefined && incident.originSensorDistance !== null
                        ? ` (${Number(incident.originSensorDistance).toFixed(1)}m)`
                        : ''}
                    </span>
                    {incident.bypassedNearestSensor && (
                      <span className="hud-bypass-badge" title={incident.bypassReason || 'Nearest sensor bypassed'}>
                        BYPASSED
                      </span>
                    )}
                  </>
                ) : (
                  'NONE'
                )}
              </span>
            </div>

            {/* Bypass Reason when nearest was bypassed */}
            {incident.bypassedNearestSensor && incident.bypassReason && (
              <div className="incident-hud-row bypass-row">
                <span className="hud-label">BYPASS REASON:</span>
                <span className="hud-val amber-warning">
                  {incident.bypassReason}
                </span>
              </div>
            )}

            {/* Other Detecting Sensors & Distances */}
            {incident.otherDetectingSensors && incident.otherDetectingSensors.length > 0 && (
              <div className="incident-hud-row detectors-row">
                <span className="hud-label">OTHER DETECTORS:</span>
                <div className="hud-val-detectors">
                  {incident.otherDetectingSensors.map((d, idx) => (
                    <span key={d.sensorId || idx} className="detector-pill">
                      {d.sensorId} ({Number(d.distance).toFixed(1)}m)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dijkstra Packet Route */}
            {incident.routeToBasestation && incident.routeToBasestation.length > 0 && (
              <div className="incident-hud-row route-row">
                <span className="hud-label">DIJKSTRA ROUTE:</span>
                <span className="hud-val cyan route-path">
                  {incident.routeToBasestation.join(' → ')}
                </span>
              </div>
            )}

            {isAcoustic && uncertaintyR > 0 && (
              <div className="incident-hud-row">
                <span className="hud-label">UNCERTAINTY:</span>
                <span className="hud-val amber">R = {uncertaintyR} SIMULATED UNITS</span>
              </div>
            )}

            <div className="incident-hud-row">
              <span className="hud-label">DELIVERY:</span>
              <span className={`hud-val ${incident.deliveryStatus === 'DELIVERED' ? 'delivered' : 'cyan'}`}>
                {incident.transmissionStatus?.toUpperCase() || incident.deliveryStatus?.toUpperCase() || 'IN TRANSIT'}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
