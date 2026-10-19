import React, { useState } from 'react'
import {
  Compass,
  Layers,
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  RotateCcw,
  Eye,
  Info,
  Maximize2,
  Box,
  Map as MapIcon,
  Crosshair
} from 'lucide-react'

import ForestCanvas from './ForestCanvas'
import SimulatedForestMap from '../SimulatedForestMap' // Preserved 2D tactical view

export default function ForestMapContainer({
  zones,
  trails,
  sensors,
  events,
  selectedZone,
  setSelectedZone,
  onSelectMarker
}) {
  // View mode: '3d' (default) or '2d' (tactical fallback)
  const [viewMode, setViewMode] = useState('3d')
  // Active layer filter: 'all', 'cameras', 'acoustics', 'threats', 'wildlife'
  const [activeLayer, setActiveLayer] = useState('all')
  // Top-Down toggle for 3D camera
  const [isTopDown, setIsTopDown] = useState(false)
  // Legend expansion toggle
  const [showLegend, setShowLegend] = useState(true)

  // Camera reset trigger
  const handleResetCamera = () => {
    setIsTopDown(false)
    setSelectedZone('all')
  }

  return (
    <div className="forest-map-container upgraded-3d">
      {/* Map Header with Controls */}
      <div className="map-header">
        <div className="map-title-group">
          <h2>
            <Compass size={18} color="#10b981" />
            <span>3D Forest Reserve & Surveillance Grid</span>
          </h2>
          <span className="coords-tag">
            {selectedZone === 'all'
              ? 'All 4 Zones • Simulated Space: 100x100'
              : zones.find((z) => z.id === selectedZone)?.name || 'Simulated Forest'}
          </span>
        </div>

        {/* Top Controls: 3D/2D View Toggle & Layer Pills */}
        <div className="map-header-actions">
          {/* 3D vs 2D Mode Switcher */}
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
              title="Interactive 3D Forest Environment with elevation and vegetation"
            >
              <Box size={14} />
              <span>3D Environment</span>
            </button>
            <button
              className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
              title="2D Tactical GIS Grid Map"
            >
              <MapIcon size={14} />
              <span>2D Tactical</span>
            </button>
          </div>

          {/* Layer Filter Pills */}
          <div className="map-layer-pills">
            <button
              className={`layer-btn ${activeLayer === 'all' ? 'active' : ''}`}
              onClick={() => setActiveLayer('all')}
            >
              All Elements
            </button>
            <button
              className={`layer-btn ${activeLayer === 'cameras' ? 'active' : ''}`}
              onClick={() => setActiveLayer('cameras')}
            >
              Cameras ({sensors.filter((s) => s.type === 'camera').length})
            </button>
            <button
              className={`layer-btn ${activeLayer === 'acoustics' ? 'active' : ''}`}
              onClick={() => setActiveLayer('acoustics')}
            >
              Acoustics ({sensors.filter((s) => s.type === 'acoustic').length})
            </button>
            <button
              className={`layer-btn ${activeLayer === 'threats' ? 'active' : ''}`}
              onClick={() => setActiveLayer('threats')}
            >
              Threats ({events.filter((e) => e.category === 'threat').length})
            </button>
            <button
              className={`layer-btn ${activeLayer === 'wildlife' ? 'active' : ''}`}
              onClick={() => setActiveLayer('wildlife')}
            >
              Wildlife ({events.filter((e) => e.category === 'wildlife').length})
            </button>
          </div>
        </div>
      </div>

      {/* VIEWPORT: 3D Canvas or 2D Tactical View */}
      {viewMode === '3d' ? (
        <div className="forest-3d-viewport-wrapper">
          {/* Main 3D Three.js Forest Canvas */}
          <ForestCanvas
            zones={zones}
            trails={trails}
            sensors={sensors}
            events={events}
            selectedZone={selectedZone}
            activeLayer={activeLayer}
            isTopDown={isTopDown}
            onSelectMarker={onSelectMarker}
            onSwitchTo2D={() => setViewMode('2d')}
          />

          {/* Floating Zone Focus Chips (top-left over 3D canvas) */}
          <div className="zone-focus-chips">
            <span className="chips-title">Focus Zone:</span>
            <button
              className={`zone-chip ${selectedZone === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedZone('all')}
            >
              Entire Reserve
            </button>
            {zones.map((z) => (
              <button
                key={z.id}
                className={`zone-chip ${selectedZone === z.id ? 'active' : ''}`}
                onClick={() => setSelectedZone(z.id)}
              >
                {z.code}
              </button>
            ))}
          </div>

          {/* Floating 3D Navigation Controls (top-right over 3D canvas) */}
          <div className="floating-camera-controls">
            <button
              className={`cam-ctrl-btn ${isTopDown ? 'active' : ''}`}
              onClick={() => setIsTopDown(!isTopDown)}
              title={isTopDown ? 'Switch to Perspective 3D View' : 'Switch to Top-Down 2D Map View'}
            >
              <Crosshair size={14} />
              <span>{isTopDown ? '3D Angled' : 'Top-Down'}</span>
            </button>

            <button
              className="cam-ctrl-btn"
              onClick={handleResetCamera}
              title="Reset 3D camera to default overview"
            >
              <RotateCcw size={14} />
              <span>Reset Camera</span>
            </button>
          </div>

          {/* Interactive 3D Legend (bottom-left) */}
          {showLegend && (
            <div className="map-hud-legend upgrade">
              <div className="legend-header">
                <span>3D Reserve Legend</span>
                <button
                  className="btn-legend-close"
                  onClick={() => setShowLegend(false)}
                >
                  ✕
                </button>
              </div>
              <div className="legend-items-grid">
                <div className="legend-item">
                  <Camera size={13} color="#06b6d4" />
                  <span>Camera Trap (Optical)</span>
                </div>
                <div className="legend-item">
                  <Radio size={13} color="#10b981" />
                  <span>Acoustic Sensor Node</span>
                </div>
                <div className="legend-item">
                  <ShieldAlert size={13} color="#ef4444" />
                  <span>Threat / Anomaly Beacon</span>
                </div>
                <div className="legend-item">
                  <Activity size={13} color="#a855f7" />
                  <span>3D Wildlife Detection</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-dot" style={{ background: '#64746b' }}></span>
                  <span>Sensor Offline (Gray)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-trail-line"></span>
                  <span>Animal Migratory Trail</span>
                </div>
              </div>
            </div>
          )}

          {!showLegend && (
            <button
              className="btn-show-legend"
              onClick={() => setShowLegend(true)}
              title="Open map legend"
            >
              Show Legend
            </button>
          )}

          {/* Interaction Instruction Hint */}
          <div className="interaction-hint-overlay">
            <span>Left Click + Drag: Rotate • Right Click: Pan • Scroll: Zoom • Click pins for details</span>
          </div>
        </div>
      ) : (
        /* Preserved 2D Tactical View Fallback */
        <SimulatedForestMap
          zones={zones}
          trails={trails}
          sensors={sensors}
          events={events}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          onSelectMarker={onSelectMarker}
        />
      )}

      {/* Simulated Coordinates Disclaimer Strip */}
      <div className="simulated-coords-strip">
        <Info size={13} color="#06b6d4" />
        <span>
          <strong>Simulated Environmental Model:</strong> Terrain elevations, river paths, animal trails, and GPS coordinates are synthetic mathematical approximations designed for academic prototype testing and ranger training.
        </span>
      </div>
    </div>
  )
}
