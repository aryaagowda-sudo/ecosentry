import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import Terrain from './Terrain'
import Vegetation from './Vegetation'
import AnimalTrails3D from './AnimalTrails3D'
import SensorMarker3D from './SensorMarker3D'
import ThreatMarker3D from './ThreatMarker3D'
import WildlifeModel3D from './WildlifeModel3D'
import DragPlacementController from './DragPlacementController'

// Camera Rig Helper to animate camera to specific presets (elevated isometric, top-down, zone focus, and toolbar actions)
function CameraController({ cameraTarget, isTopDown, cameraAction, isDragging, focusTarget }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  // Enable/disable orbit controls during active drag placement
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isDragging
    }
  }, [isDragging])

  // Focus on specific coordinates when "Locate in 3D" is triggered
  useEffect(() => {
    if (!focusTarget || !controlsRef.current) return
    const [tx, ty, tz] = focusTarget
    camera.position.set(tx + 8, ty + 42, tz + 48)
    camera.lookAt(tx, ty, tz)
    controlsRef.current.target.set(tx, ty, tz)
    controlsRef.current.update()
  }, [focusTarget, camera])

  useEffect(() => {
    if (isTopDown) {
      camera.position.set(0, 115, 0.01)
      camera.lookAt(0, 1.5, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1.5, 0)
        controlsRef.current.update()
      }
    } else if (cameraTarget === 'zone-1') {
      camera.position.set(-20, 68, 54)
      camera.lookAt(-25, 4, -25)
      if (controlsRef.current) {
        controlsRef.current.target.set(-25, 4, -25)
        controlsRef.current.update()
      }
    } else if (cameraTarget === 'zone-2') {
      camera.position.set(24, 68, 54)
      camera.lookAt(25, 3, -25)
      if (controlsRef.current) {
        controlsRef.current.target.set(25, 3, -25)
        controlsRef.current.update()
      }
    } else if (cameraTarget === 'zone-3') {
      camera.position.set(-20, 68, 75)
      camera.lookAt(-25, 3, 25)
      if (controlsRef.current) {
        controlsRef.current.target.set(-25, 3, 25)
        controlsRef.current.update()
      }
    } else if (cameraTarget === 'zone-4') {
      camera.position.set(24, 68, 75)
      camera.lookAt(25, 2, 25)
      if (controlsRef.current) {
        controlsRef.current.target.set(25, 2, 25)
        controlsRef.current.update()
      }
    } else {
      // Default elevated 45° isometric viewpoint matching Reference Image 2
      // Camera at [-14, 118, 108] looking at [0, 1.5, -4] gives exact 45° downward pitch,
      // displaying Zone 1 at top-left, Zone 2 at top-right, Zone 3 at bottom-left, Zone 4 at bottom-right,
      // with both the front and side cutaway sedimentary rock strata layers fully showcased.
      camera.position.set(-14, 118, 108)
      camera.lookAt(0, 1.5, -4)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1.5, -4)
        controlsRef.current.update()
      }
    }
  }, [cameraTarget, isTopDown, camera])

  // Handle external toolbar camera actions (Zoom In, Zoom Out, Reset orientation)
  useEffect(() => {
    if (!cameraAction || !controlsRef.current) return
    const target = controlsRef.current.target || new THREE.Vector3(0, 1.5, -4)

    if (cameraAction.type === 'zoomIn') {
      camera.position.lerp(target, 0.22)
      controlsRef.current.update()
    } else if (cameraAction.type === 'zoomOut') {
      const offset = camera.position.clone().sub(target)
      camera.position.copy(target).add(offset.multiplyScalar(1.24))
      controlsRef.current.update()
    } else if (cameraAction.type === 'reset') {
      camera.position.set(-14, 118, 108)
      camera.lookAt(0, 1.5, -4)
      controlsRef.current.target.set(0, 1.5, -4)
      controlsRef.current.update()
    }
  }, [cameraAction, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 1.5, -4]}
      enableDamping
      dampingFactor={0.06}
      minDistance={20}
      maxDistance={180}
      maxPolarAngle={isTopDown ? 0.01 : Math.PI / 2.15}
      minPolarAngle={0.05}
    />
  )
}

// Error Boundary for WebGL safety
class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Canvas encountered an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="webgl-error-fallback">
          <h3>3D Hardware Acceleration Unavailable</h3>
          <p>
            Your browser or device was unable to initialize WebGL for the 3D Forest.
          </p>
          <button
            className="btn-emergency-action"
            onClick={this.props.onSwitchTo2D}
          >
            Switch to 2D Tactical Map
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ForestCanvas({
  zones,
  trails,
  sensors,
  events,
  selectedZone,
  activeLayer = 'all',
  visibleLayers = { cameras: true, acoustics: true, incidents: true },
  cameraAction,
  isTopDown,
  selectedMarkerId,
  onSelectMarker,
  onSwitchTo2D,
  draggingItem,
  dragPointerPos,
  onTerrainHitChange,
  onStartReposition,
  focusTarget
}) {
  const terrainMeshRef = useRef()

  // Filter threat events & manual incidents based on layers & zone
  const visibleIncidentEvents = events.filter((evt) => {
    if (selectedZone !== 'all' && evt.zoneId !== selectedZone) return false
    if (visibleLayers && visibleLayers.incidents === false) return false
    if (activeLayer === 'cameras' || activeLayer === 'acoustics') return false
    // Always render manually placed incidents unless specifically filtered
    if (evt.isManual) return true
    // Render automated active threats ("1 · MIC-01", "2 · MIC-04")
    if (evt.category === 'threat' && evt.status === 'active') return true
    return false
  })

  // Set of sensor IDs that currently have an active incident pin rendered.
  // We suppress the duplicate sensor marker at the exact same location so only the incident pin shows.
  const activeIncidentSensorIds = new Set(
    visibleIncidentEvents.filter((e) => e.sensorId).map((e) => e.sensorId)
  )

  // Filter visible sensors according to active layers, selected zone, and incident deduplication
  const visibleSensors = sensors.filter((sensor) => {
    if (selectedZone !== 'all' && sensor.zoneId !== selectedZone) return false
    if (visibleLayers) {
      if (sensor.type === 'camera' && !visibleLayers.cameras) return false
      if (sensor.type === 'acoustic' && !visibleLayers.acoustics) return false
    } else {
      if (activeLayer === 'cameras' && sensor.type !== 'camera') return false
      if (activeLayer === 'acoustics' && sensor.type !== 'acoustic') return false
      if (activeLayer === 'threats' || activeLayer === 'wildlife') return false
    }
    // Anti-collision: if this sensor already has an active threat pin, do not render a duplicate sensor pin
    if (activeIncidentSensorIds.has(sensor.id)) return false
    return true
  })

  // Filter visible wildlife events (Fauna models rendered in the forest)
  const wildlifeEvents = events.filter((evt) => {
    if (evt.category !== 'wildlife' && evt.type !== 'animal_boundary_crossing') return false
    if (selectedZone !== 'all' && evt.zoneId !== selectedZone) return false
    if (activeLayer === 'cameras' || activeLayer === 'acoustics' || activeLayer === 'threats') return false
    return true
  })

  const showTrails = activeLayer === 'all' || activeLayer === 'wildlife'
  const showTrees = activeLayer !== 'threats'

  return (
    <WebGLErrorBoundary onSwitchTo2D={onSwitchTo2D}>
      <div className="forest-3d-canvas-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas
          camera={{ position: [-14, 118, 108], fov: 38, near: 0.5, far: 500 }}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color('#CBD1CB'))
            scene.fog = new THREE.FogExp2('#CBD1CB', 0.0022)
          }}
        >
          {/* Natural Atmospheric Daylight Lighting */}
          <ambientLight color="#EBF3EC" intensity={1.1} />
          <directionalLight
            position={[45, 62, 38]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={10}
            shadow-camera-far={140}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            color="#FFFDF5"
          />
          <hemisphereLight skyColor="#E2EFE4" groundColor="#CADACA" intensity={0.65} />

          {/* Interactive Camera Controller */}
          <CameraController
            cameraTarget={selectedZone}
            isTopDown={isTopDown}
            cameraAction={cameraAction}
            isDragging={!!draggingItem}
            focusTarget={focusTarget}
          />

          {/* 3D Forest World */}
          <group>
            {/* 1. Procedural Undulating Terrain with River & Zone Borders */}
            <Terrain selectedZone={selectedZone} terrainMeshRef={terrainMeshRef} />

            {/* 2. Optimized Instanced Trees */}
            {showTrees && <Vegetation />}

            {/* 3. Curved Animal Trails */}
            {showTrails && <AnimalTrails3D trails={trails} />}

            {/* 4. Sensor Nodes (Camera Traps & Acoustic Masts) */}
            {visibleSensors.map((sensor) => (
              <SensorMarker3D
                key={sensor.id}
                sensor={sensor}
                isSelected={sensor.id === selectedMarkerId}
                onSelectSensor={onSelectMarker}
              />
            ))}

            {/* 5. Incident Markers (Automated & Manually Placed) */}
            {visibleIncidentEvents.map((evt) => (
              <ThreatMarker3D
                key={evt.id}
                event={evt}
                isSelected={evt.id === selectedMarkerId}
                onSelectEvent={onSelectMarker}
                onStartReposition={onStartReposition}
              />
            ))}

            {/* 6. Wildlife 3D Models (Elephants, Tigers, Deer) */}
            {wildlifeEvents.map((evt) => (
              <WildlifeModel3D
                key={evt.id}
                event={evt}
                isSelected={evt.id === selectedMarkerId}
                onSelectWildlife={onSelectMarker}
              />
            ))}

            {/* 7. Real-Time 3D Drag Placement Raycast Controller & Ghost Marker */}
            <DragPlacementController
              draggingItem={draggingItem}
              dragPointerPos={dragPointerPos}
              terrainMeshRef={terrainMeshRef}
              onTerrainHitChange={onTerrainHitChange}
            />
          </group>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  )
}
