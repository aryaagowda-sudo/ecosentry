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

// Camera Rig Helper to animate camera to specific presets (default isometric, top-down, zone focus)
function CameraController({ cameraTarget, isTopDown }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (isTopDown) {
      camera.position.set(0, 92, 0.01)
      camera.lookAt(0, 2, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 2, 0)
      }
    } else if (cameraTarget === 'zone-1') {
      camera.position.set(-20, 36, 12)
      camera.lookAt(-25, 6, -25)
      if (controlsRef.current) {
        controlsRef.current.target.set(-25, 6, -25)
      }
    } else if (cameraTarget === 'zone-2') {
      camera.position.set(24, 34, 12)
      camera.lookAt(25, 4, -25)
      if (controlsRef.current) {
        controlsRef.current.target.set(25, 4, -25)
      }
    } else if (cameraTarget === 'zone-3') {
      camera.position.set(-20, 34, 58)
      camera.lookAt(-25, 4, 25)
      if (controlsRef.current) {
        controlsRef.current.target.set(-25, 4, 25)
      }
    } else if (cameraTarget === 'zone-4') {
      camera.position.set(24, 34, 58)
      camera.lookAt(25, 3, 25)
      if (controlsRef.current) {
        controlsRef.current.target.set(25, 3, 25)
      }
    } else {
      // Default elevated, oblique isometric overview of the entire reserve
      camera.position.set(52, 48, 52)
      camera.lookAt(0, 2, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 2, 0)
      }
    }
  }, [cameraTarget, isTopDown, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 2, 0]}
      enableDamping
      dampingFactor={0.06}
      minDistance={18}
      maxDistance={135}
      maxPolarAngle={isTopDown ? 0.01 : Math.PI / 2.12}
      minPolarAngle={0}
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
  activeLayer,
  isTopDown,
  selectedMarkerId,
  onSelectMarker,
  onSwitchTo2D
}) {
  // Filter visible sensors according to active layer and selected zone
  const visibleSensors = sensors.filter((sensor) => {
    if (selectedZone !== 'all' && sensor.zoneId !== selectedZone) return false
    if (activeLayer === 'cameras' && sensor.type !== 'camera') return false
    if (activeLayer === 'acoustics' && sensor.type !== 'acoustic') return false
    if (activeLayer === 'threats' || activeLayer === 'wildlife') return false
    return true
  })

  // Filter visible events
  const visibleEvents = events.filter((evt) => {
    if (selectedZone !== 'all' && evt.zoneId !== selectedZone) return false
    if (activeLayer === 'cameras' || activeLayer === 'acoustics') return false
    if (activeLayer === 'wildlife' && evt.category !== 'wildlife' && evt.type !== 'animal_boundary_crossing') return false
    if (activeLayer === 'threats' && evt.category !== 'threat') return false
    return true
  })

  const threatEvents = visibleEvents.filter((e) => e.category === 'threat')
  const wildlifeEvents = visibleEvents.filter((e) => e.category === 'wildlife')

  const showTrails = activeLayer === 'all' || activeLayer === 'wildlife'
  const showTrees = activeLayer !== 'threats'

  return (
    <WebGLErrorBoundary onSwitchTo2D={onSwitchTo2D}>
      <div className="forest-3d-canvas-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas
          camera={{ position: [52, 48, 52], fov: 38, near: 0.5, far: 300 }}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color('#EBF0EA'))
            scene.fog = new THREE.FogExp2('#EBF0EA', 0.003)
          }}
        >
          {/* Natural Atmospheric Daylight Lighting */}
          <ambientLight color="#EBF3EC" intensity={1.05} />
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
          />

          {/* 3D Forest World */}
          <group>
            {/* 1. Procedural Undulating Terrain with River & Zone Borders */}
            <Terrain selectedZone={selectedZone} />

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

            {/* 5. Threat Incidents (Pulsing Beacons) */}
            {threatEvents.map((evt) => (
              <ThreatMarker3D
                key={evt.id}
                event={evt}
                isSelected={evt.id === selectedMarkerId}
                onSelectEvent={onSelectMarker}
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
          </group>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  )
}
