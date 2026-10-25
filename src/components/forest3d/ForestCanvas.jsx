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

// Camera Rig Helper to animate camera to specific presets (default, top-down, zone focus)
function CameraController({ cameraTarget, isTopDown }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (isTopDown) {
      camera.position.set(0, 85, 0.01)
      camera.lookAt(0, 0, 0)
    } else if (cameraTarget === 'zone-1') {
      camera.position.set(-25, 35, 10)
      camera.lookAt(-25, 0, -25)
    } else if (cameraTarget === 'zone-2') {
      camera.position.set(25, 35, 10)
      camera.lookAt(25, 0, -25)
    } else if (cameraTarget === 'zone-3') {
      camera.position.set(-25, 35, 55)
      camera.lookAt(-25, 0, 25)
    } else if (cameraTarget === 'zone-4') {
      camera.position.set(25, 35, 55)
      camera.lookAt(25, 0, 25)
    } else {
      // Default isometric overview
      camera.position.set(0, 52, 60)
      camera.lookAt(0, 0, 0)
    }
  }, [cameraTarget, isTopDown, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={16}
      maxDistance={125}
      maxPolarAngle={isTopDown ? 0.01 : Math.PI / 2.05}
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
      <div className="forest-3d-canvas-wrapper">
        <Canvas
          camera={{ position: [0, 52, 60], fov: 42, near: 0.5, far: 250 }}
          shadows
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color('#0B1114'))
            scene.fog = new THREE.FogExp2('#0B1114', 0.0075)
          }}
        >
          {/* Natural Atmospheric Lighting */}
          <ambientLight color="#1e3a2b" intensity={0.9} />
          <directionalLight
            position={[30, 48, 25]}
            intensity={1.35}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={10}
            shadow-camera-far={120}
            shadow-camera-left={-55}
            shadow-camera-right={55}
            shadow-camera-top={55}
            shadow-camera-bottom={-55}
            color="#fffbeb"
          />
          <hemisphereLight skyColor="#064e3b" groundColor="#06120b" intensity={0.5} />

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
                onSelectSensor={onSelectMarker}
              />
            ))}

            {/* 5. Threat Incidents (Pulsing Beacons) */}
            {threatEvents.map((evt) => (
              <ThreatMarker3D
                key={evt.id}
                event={evt}
                onSelectEvent={onSelectMarker}
              />
            ))}

            {/* 6. Wildlife 3D Models (Elephants, Tigers, Deer) */}
            {wildlifeEvents.map((evt) => (
              <WildlifeModel3D
                key={evt.id}
                event={evt}
                onSelectWildlife={onSelectMarker}
              />
            ))}
          </group>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  )
}
