import { useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import TacticalWireframeTerrain from './TacticalWireframeTerrain.jsx'
import TacticalSensors3D from './TacticalSensors3D.jsx'
import TacticalMeshLinks3D from './TacticalMeshLinks3D.jsx'
import TacticalPackets3D from './TacticalPackets3D.jsx'
import TacticalRanges3D from './TacticalRanges3D.jsx'
import TacticalIncidents3D from './TacticalIncidents3D.jsx'
import TacticalDragPlacementController from './TacticalDragPlacementController.jsx'
import { gridCoordsToWorld } from '../../services/meshNetwork/distanceMath.js'

/**
 * Tracks 3D to 2D screen coordinates of the selected sensor node
 * and projects obstacles (Base Station, Incident, other sensors) to support
 * smart collision-free positioning of the inspector popup.
 */
function SensorScreenTracker({ selectedNodeId, sensors, baseStation, activeIncident, onScreenPosChange }) {
  const { camera, size } = useThree()
  const tempVec = useRef(new THREE.Vector3()).current

  useFrame(() => {
    if (!selectedNodeId || !onScreenPosChange) return
    const target = selectedNodeId === 'BASE'
      ? baseStation
      : sensors.find((s) => s.id === selectedNodeId)

    if (!target || !target.position) return

    tempVec.set(target.position.x, target.position.y + 1.6, target.position.z)
    tempVec.project(camera)

    const isVisible = tempVec.z < 1
    const x = (tempVec.x * 0.5 + 0.5) * size.width
    const y = (-tempVec.y * 0.5 + 0.5) * size.height

    // Project Base Station screen position
    let basePos = null
    if (baseStation && baseStation.position) {
      tempVec.set(baseStation.position.x, baseStation.position.y + 1.5, baseStation.position.z)
      tempVec.project(camera)
      if (tempVec.z < 1) {
        basePos = {
          x: (tempVec.x * 0.5 + 0.5) * size.width,
          y: (-tempVec.y * 0.5 + 0.5) * size.height
        }
      }
    }

    // Project Active Incident screen position
    let incidentPos = null
    if (activeIncident) {
      const ip = activeIncident.worldPosition || (activeIncident.coordinates ? gridCoordsToWorld(activeIncident.coordinates.x, activeIncident.coordinates.y) : null)
      if (ip) {
        tempVec.set(ip.x, (ip.y ?? 0) + 1.5, ip.z)
        tempVec.project(camera)
        if (tempVec.z < 1) {
          incidentPos = {
            x: (tempVec.x * 0.5 + 0.5) * size.width,
            y: (-tempVec.y * 0.5 + 0.5) * size.height
          }
        }
      }
    }

    // Project other sensors to avoid covering them
    const otherSensorsPos = []
    if (Array.isArray(sensors)) {
      sensors.forEach((s) => {
        if (s.id !== selectedNodeId && s.position) {
          tempVec.set(s.position.x, s.position.y + 1.2, s.position.z)
          tempVec.project(camera)
          if (tempVec.z < 1) {
            otherSensorsPos.push({
              id: s.id,
              x: (tempVec.x * 0.5 + 0.5) * size.width,
              y: (-tempVec.y * 0.5 + 0.5) * size.height
            })
          }
        }
      })
    }

    onScreenPosChange({
      id: selectedNodeId,
      x,
      y,
      isVisible,
      canvasWidth: size.width,
      canvasHeight: size.height,
      baseScreenPos: basePos,
      incidentScreenPos: incidentPos,
      otherSensorsPos
    })
  })

  return null
}

export default function TacticalCanvas({
  sensors = [],
  baseStation = null,
  graph = null,
  incidents = [],
  activeIncident = null,
  isIncidentOverlayVisible = true,
  onDismissIncidentOverlay,
  packets = [],
  selectedNodeId = null,
  selectedPath = [],
  showLinks = true,
  showFailedLinks = true,
  showLabels = true,
  commRangeMode = 'none',
  acousticRangeMode = 'none',
  showUncertainty = true,
  isBaseReceiving = false,
  terrainMeshRef,
  draggingItem = null,
  dragPointerPos = null,
  onTerrainHitChange,
  onSelectNode,
  onSelectIncident,
  onSensorScreenPos,
  onDismissPopup,
  suppressedLabelIds = []
}) {
  const controlsRef = useRef()

  const detectingSensorIds = activeIncident?.detectingSensors || []
  const nodesMap = graph?.nodesMap || new Map()

  return (
    <div className="tactical-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [-35, 75, 95], fov: 42, near: 0.5, far: 600 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => onDismissPopup?.()}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color('#03080c'))
          scene.fog = new THREE.FogExp2('#03080c', 0.0028)
        }}
      >
        {/* Real-time 3D to 2D Screen Tracker for Selected Node Popup */}
        <SensorScreenTracker
          selectedNodeId={selectedNodeId}
          sensors={sensors}
          baseStation={baseStation}
          activeIncident={activeIncident}
          onScreenPosChange={onSensorScreenPos}
        />

        {/* Futuristic Cybernetic Tactical Lighting */}
        <ambientLight color="#082f49" intensity={0.85} />
        <directionalLight
          position={[40, 80, 50]}
          intensity={1.2}
          color="#38bdf8"
        />
        <directionalLight
          position={[-40, 50, -40]}
          intensity={0.65}
          color="#06b6d4"
        />
        <pointLight
          position={[0, 35, 0]}
          intensity={1.5}
          distance={150}
          color="#00f0ff"
        />

        {/* Orbit Camera Controls with Smooth Damping */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2 - 0.05} // Do not dip below horizon platform
          minDistance={15}
          maxDistance={220}
        />

        {/* 1. Tactical Wireframe Diorama Terrain (No click-to-place terrain click handler) */}
        <TacticalWireframeTerrain
          terrainMeshRef={terrainMeshRef}
          onTerrainClick={onDismissPopup}
        />

        {/* 2. Drag & Drop Placement Raycaster & 3D Ghost Target Marker */}
        <TacticalDragPlacementController
          draggingItem={draggingItem}
          dragPointerPos={dragPointerPos}
          terrainMeshRef={terrainMeshRef}
          onTerrainHitChange={onTerrainHitChange}
        />

        {/* 3. Communication Links (Active & Failed) & Dijkstra Path */}
        <TacticalMeshLinks3D
          edges={graph?.edges || []}
          selectedPath={selectedPath}
          nodesMap={nodesMap}
          showLinks={showLinks}
          showFailedLinks={showFailedLinks}
        />

        {/* 4. Sensor Ranges (Bluetooth Comm & Acoustic Hearing) */}
        <TacticalRanges3D
          sensors={sensors}
          selectedSensorId={selectedNodeId}
          detectingSensorIds={detectingSensorIds}
          commRangeMode={commRangeMode}
          acousticRangeMode={acousticRangeMode}
        />

        {/* 5. Sensor Nodes & Base Station */}
        <TacticalSensors3D
          sensors={sensors}
          baseStation={baseStation}
          selectedNodeId={selectedNodeId}
          detectingSensorIds={detectingSensorIds}
          showLabels={showLabels}
          isBaseReceiving={isBaseReceiving}
          onSelectNode={onSelectNode}
          suppressedLabelIds={suppressedLabelIds}
        />

        {/* 6. Animated Packets */}
        <TacticalPackets3D
          packets={packets}
          nodesMap={nodesMap}
        />

        {/* 7. Active Incident & Acoustic Uncertainty Region (No stray background red dots) */}
        <TacticalIncidents3D
          incident={activeIncident}
          showCard={isIncidentOverlayVisible}
          onDismiss={onDismissIncidentOverlay}
          showUncertainty={showUncertainty}
          onClick={onSelectIncident}
        />
      </Canvas>
    </div>
  )
}
