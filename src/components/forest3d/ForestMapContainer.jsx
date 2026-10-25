import React, { useState } from 'react'
import {
  Compass,
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  RotateCcw,
  Info,
  Box,
  Map as MapIcon,
  Crosshair,
  Layers,
  X
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
  selectedItem,
  onSelectMarker,
  isDedicatedPage = false
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

  const selectedMarkerId = selectedItem?.data?.id

  return (
    <div className={`surveillance-map-card ${isDedicatedPage ? 'dedicated-map-mode' : ''}`}>
      {/* Map Header Toolbar with Controls */}
      <div className="map-card-toolbar">
        <div className="map-toolbar-left">
          <div className="map-card-title">
            <Compass size={15} style={{ color: 'var(--accent-green)' }} />
            <span>{viewMode === '3d' ? 'Reserve surveillance · 3D' : 'Reserve surveillance · 2D Tactical'}</span>
          </div>
          <span className="sim-spec-pill">
            {selectedZone === 'all'
              ? 'All 4 Sectors • 100x100 Grid'
              : zones.find((z) => z.id === selectedZone)?.name || 'Simulated Locus'}
          </span>
        </div>

        {/* Top Controls: 3D/2D View Toggle & Layer Selector */}
        <div className="map-toolbar-controls">
          {/* 3D vs 2D Mode Switcher */}
          <div className="btn-group-toggle">
            <button
              className={`btn-toggle-option ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
              title="Interactive 3D Forest Environment with elevation and vegetation"
            >
              <Box size={12} />
              <span>3D Model</span>
            </button>
            <button
              className={`btn-toggle-option ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
              title="2D Tactical GIS Grid Map"
            >
              <MapIcon size={12} />
              <span>2D Tactical</span>
            </button>
          </div>

          {/* Layer Filter Chips */}
          <div className="map-layer-selector">
            <button
              className={`layer-chip ${activeLayer === 'all' ? 'active' : ''}`}
              onClick={() => setActiveLayer('all')}
            >
              All
            </button>
            <button
              className={`layer-chip ${activeLayer === 'cameras' ? 'active' : ''}`}
              onClick={() => setActiveLayer('cameras')}
            >
              Cameras ({sensors.filter((s) => s.type === 'camera').length})
            </button>
            <button
              className={`layer-chip ${activeLayer === 'acoustics' ? 'active' : ''}`}
              onClick={() => setActiveLayer('acoustics')}
            >
              Acoustic ({sensors.filter((s) => s.type === 'acoustic').length})
            </button>
            <button
              className={`layer-chip ${activeLayer === 'threats' ? 'active' : ''}`}
              onClick={() => setActiveLayer('threats')}
            >
              Threats ({events.filter((e) => e.category === 'threat').length})
            </button>
            <button
              className={`layer-chip ${activeLayer === 'wildlife' ? 'active' : ''}`}
              onClick={() => setActiveLayer('wildlife')}
            >
              Fauna ({events.filter((e) => e.category === 'wildlife').length})
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Sector Selector Strip for the dedicated 3D Forest Map page */}
      {isDedicatedPage && (
        <div className="dedicated-sector-strip">
          <span className="strip-label">Sector Focus:</span>
          <button
            className={`sector-strip-btn ${selectedZone === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedZone('all')}
          >
            All Sectors (Overview)
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              className={`sector-strip-btn ${selectedZone === z.id ? 'active' : ''}`}
              onClick={() => setSelectedZone(z.id)}
            >
              <span
                className="sector-dot"
                style={{
                  backgroundColor:
                    z.id === 'zone-1'
                      ? 'var(--accent-green)'
                      : z.id === 'zone-2'
                      ? 'var(--accent-teal)'
                      : z.id === 'zone-3'
                      ? 'var(--accent-purple)'
                      : 'var(--accent-amber)'
                }}
              />
              <span>{z.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* VIEWPORT: 3D Canvas or 2D Tactical View */}
      {viewMode === '3d' ? (
        <div className="map-canvas-container">
          {/* Main 3D Three.js Forest Canvas */}
          <div className="canvas-viewport-three">
            <ForestCanvas
              zones={zones}
              trails={trails}
              sensors={sensors}
              events={events}
              selectedZone={selectedZone}
              activeLayer={activeLayer}
              isTopDown={isTopDown}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={onSelectMarker}
              onSwitchTo2D={() => setViewMode('2d')}
            />
          </div>

          {/* HUD Sector Selector (shown on overview mode when dedicated strip is absent) */}
          {!isDedicatedPage && (
            <div className="hud-zone-selector">
              <span className="hud-zone-label">Sector:</span>
              <button
                className={`hud-zone-btn ${selectedZone === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedZone('all')}
              >
                All
              </button>
              {zones.map((z) => (
                <button
                  key={z.id}
                  className={`hud-zone-btn ${selectedZone === z.id ? 'active' : ''}`}
                  onClick={() => setSelectedZone(z.id)}
                >
                  {z.code}
                </button>
              ))}
            </div>
          )}

          {/* HUD 3D Camera Controls (top-right over 3D canvas) */}
          <div className="hud-camera-actions">
            <button
              className={`hud-action-btn ${isTopDown ? 'active' : ''}`}
              onClick={() => setIsTopDown(!isTopDown)}
              title={isTopDown ? 'Switch to Angled 3D Perspective' : 'Switch to Orthographic Top-Down'}
            >
              <Crosshair size={12} />
              <span>{isTopDown ? 'Perspective' : 'Top-Down'}</span>
            </button>

            <button
              className="hud-action-btn"
              onClick={handleResetCamera}
              title="Reset 3D camera to default isometric view"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          {/* HUD Map Legend (bottom-left) */}
          {showLegend && (
            <div className="map-hud-legend">
              <div className="legend-header-row">
                <span>Symbology Legend</span>
                <button
                  onClick={() => setShowLegend(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0 2px'
                  }}
                  title="Hide legend"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="legend-grid-items">
                <div className="legend-entry">
                  <Camera size={11} style={{ color: 'var(--accent-teal)' }} />
                  <span>Optical Camera Trap</span>
                </div>
                <div className="legend-entry">
                  <Radio size={11} style={{ color: 'var(--accent-green)' }} />
                  <span>Bioacoustic Audio Node</span>
                </div>
                <div className="legend-entry">
                  <ShieldAlert size={11} style={{ color: 'var(--accent-red)' }} />
                  <span>Threat / Incident Beacon</span>
                </div>
                <div className="legend-entry">
                  <Activity size={11} style={{ color: 'var(--accent-purple)' }} />
                  <span>3D Wildlife Detection</span>
                </div>
                <div className="legend-entry">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-amber)',
                      display: 'inline-block'
                    }}
                  />
                  <span>Sensor Offline (Amber)</span>
                </div>
                <div className="legend-entry">
                  <span
                    style={{
                      width: 14,
                      height: 2,
                      backgroundColor: 'rgba(232, 170, 58, 0.7)',
                      display: 'inline-block'
                    }}
                  />
                  <span>Animal Trail Waypoint</span>
                </div>
              </div>
            </div>
          )}

          {!showLegend && (
            <button
              className="hud-action-btn"
              style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10 }}
              onClick={() => setShowLegend(true)}
            >
              <Layers size={11} />
              <span>Legend</span>
            </button>
          )}

          {/* Interaction Instruction Hint */}
          <div className="hud-interaction-hint">
            Drag to Rotate • Right-click to Pan • Scroll to Zoom • Click markers to inspect
          </div>
        </div>
      ) : (
        /* Replaced 2D Tactical View with Clean GIS Representation & Flowing River */
        <SimulatedForestMap
          zones={zones}
          trails={trails}
          sensors={sensors}
          events={events}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          selectedItem={selectedItem}
          onSelectMarker={onSelectMarker}
          activeLayer={activeLayer}
          onSwitchTo3D={() => setViewMode('3d')}
        />
      )}

      {/* Simulated Coordinates Disclaimer Strip */}
      <div className="map-disclaimer-strip">
        <Info size={12} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
        <span>
          <strong>Academic Simulation Notice:</strong> Elevations, canopy vegetation, animal trails, and GPS telemetry are synthetic mathematical models engineered for college project demonstration and anti-poaching operations research.
        </span>
      </div>
    </div>
  )
}
