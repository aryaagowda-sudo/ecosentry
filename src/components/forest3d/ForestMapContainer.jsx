import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Compass,
  Camera,
  Radio,
  Plus,
  Minus,
  Maximize2,
  Box,
  Map as MapIcon,
  Check,
  PanelLeftOpen,
  PanelLeftClose,
  GripVertical,
  Move
} from 'lucide-react'

import ForestCanvas from './ForestCanvas'
import SimulatedForestMap from '../SimulatedForestMap' // Preserved 2D tactical view
import IncidentToolbox from './IncidentToolbox'
import PostDropIncidentModal from './PostDropIncidentModal'
import { getZoneFromGridCoords, gridToSimulatedLatLng } from './terrainHelper'

export default function ForestMapContainer({
  zones,
  trails,
  sensors,
  events,
  selectedZone,
  setSelectedZone,
  selectedItem,
  onSelectMarker,
  isDedicatedPage = false,
  onAddIncident,
  onRepositionIncident,
  customToolboxItems = [],
  onAddCustomToolboxItem,
  onDeleteCustomToolboxItem,
  focusTarget,
  repositionTarget,
  onClearRepositionTarget
}) {
  // View mode: '3d' (default) or '2d' (satellite fallback)
  const [viewMode, setViewMode] = useState('3d')
  // Top-Down toggle for 3D camera
  const [isTopDown, setIsTopDown] = useState(false)
  // Fullscreen expansion toggle
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Camera action trigger for vertical HUD controls
  const [cameraAction, setCameraAction] = useState(null)

  // Incident Toolbox Collapsible State (Default open so user immediately sees the draggable cards)
  const [isToolboxOpen, setIsToolboxOpen] = useState(true)

  // Drag and Drop Placement States
  const [draggingItem, setDraggingItem] = useState(null)
  const [dragPointerPos, setDragPointerPos] = useState(null)
  const [pendingDrop, setPendingDrop] = useState(null)

  // Real-time terrain intersection ref (reported from DragPlacementController inside Three.js)
  const terrainHitRef = useRef(null)
  const isTerrainHitValidRef = useRef(false)

  // Subtoolbar active layers: matching Image 2 ([✓] Cameras [✓] Acoustics [✓] Incidents)
  const [visibleLayers, setVisibleLayers] = useState({
    cameras: true,
    acoustics: true,
    incidents: true
  })

  const toggleLayer = (layerKey) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }))
  }

  // Camera reset trigger
  const handleResetCamera = () => {
    setIsTopDown(false)
    setSelectedZone('all')
    setCameraAction({ type: 'reset', id: Date.now() })
  }

  // Real-time callback from Three.js DragPlacementController
  const handleTerrainHitChange = useCallback((hitPoint, isValid) => {
    terrainHitRef.current = hitPoint
    isTerrainHitValidRef.current = isValid
  }, [])

  // Start dragging an event card from the toolbox
  const handleStartDrag = (item, event) => {
    // If not in 3D mode, switch to 3D mode so user can drop onto 3D terrain
    if (viewMode !== '3d') {
      setViewMode('3d')
    }
    setDraggingItem(item)
    setDragPointerPos({ clientX: event.clientX, clientY: event.clientY })
    terrainHitRef.current = null
    isTerrainHitValidRef.current = false
  }

  // Reposition an existing event on the map
  const handleStartReposition = (eventToMove) => {
    if (viewMode !== '3d') {
      setViewMode('3d')
    }
    setDraggingItem({
      ...eventToMove,
      isReposition: true,
      originalEventId: eventToMove.id,
      defaultSeverity: eventToMove.priority,
      defaultDescription: eventToMove.description
    })
    terrainHitRef.current = null
    isTerrainHitValidRef.current = false
  }

  // Trigger repositioning when requested from outside (e.g. Marker Detail modal)
  useEffect(() => {
    if (repositionTarget) {
      handleStartReposition(repositionTarget)
      onClearRepositionTarget?.()
    }
  }, [repositionTarget, onClearRepositionTarget])

  // Global pointer listeners during active drag operation
  useEffect(() => {
    if (!draggingItem) return

    const handlePointerMove = (e) => {
      setDragPointerPos({ clientX: e.clientX, clientY: e.clientY })
    }

    const handlePointerUp = () => {
      const hit = terrainHitRef.current
      const isValid = isTerrainHitValidRef.current

      if (hit && isValid) {
        // Convert Three.js world coordinates (-50 to +50) to grid coordinates (0 to 100)
        const gridX = hit.x + 50
        const gridY = hit.z + 50
        const detectedZone = getZoneFromGridCoords(gridX, gridY)
        const latLng = gridToSimulatedLatLng(gridX, gridY)
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)

        if (draggingItem.isReposition && draggingItem.originalEventId) {
          // Immediately update the repositioned incident
          onRepositionIncident?.(draggingItem.originalEventId, {
            x: Number(gridX.toFixed(1)),
            y: Number(gridY.toFixed(1)),
            zoneId: detectedZone.id,
            zoneName: detectedZone.name,
            simulatedLat: latLng.simulatedLat,
            simulatedLng: latLng.simulatedLng
          })
        } else {
          // Open the post-drop incident configuration dialog
          setPendingDrop({
            item: draggingItem,
            zone: detectedZone,
            gridCoords: { x: gridX, y: gridY },
            latLng,
            timestamp
          })
        }
      }

      // Cleanup drag state
      setDraggingItem(null)
      setDragPointerPos(null)
      terrainHitRef.current = null
      isTerrainHitValidRef.current = false
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDraggingItem(null)
        setDragPointerPos(null)
        terrainHitRef.current = null
        isTerrainHitValidRef.current = false
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [draggingItem, onRepositionIncident])

  // Confirming the new incident from PostDropIncidentModal
  const handleConfirmNewIncident = (incidentData) => {
    onAddIncident?.(incidentData)
    setPendingDrop(null)
  }

  const selectedMarkerId = selectedItem?.data?.id

  return (
    <div
      className={`surveillance-map-card ${isDedicatedPage ? 'dedicated-map-mode' : ''} ${
        isFullscreen ? 'fullscreen-map-mode' : ''
      }`}
    >
      {/* 1. Primary Map Header Toolbar */}
      <div className="map-card-toolbar">
        <div className="map-toolbar-left">
          <div className="map-card-title">
            <Compass size={15} style={{ color: 'var(--accent-green)' }} />
            <span>
              {viewMode === '3d'
                ? 'Reserve surveillance · 3D'
                : 'Reserve surveillance · Satellite'}
            </span>
          </div>
          <span className="sim-spec-pill">4 ZONES</span>

          {/* Active Drag Placement Indicator */}
          {draggingItem && (
            <span className="drag-active-pill">
              <GripVertical size={11} />
              <span>
                {draggingItem.isReposition
                  ? `Repositioning: ${draggingItem.title}`
                  : `Placing: ${draggingItem.title}`}
              </span>
              <span className="drag-hint">(Release on 3D terrain • ESC to cancel)</span>
            </span>
          )}
        </div>

        {/* 3D terrain vs Satellite Switcher */}
        <div className="map-toolbar-controls">
          <div className="btn-group-toggle">
            <button
              className={`btn-toggle-option ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
              title="Interactive 3D Forest Environment with elevation and vegetation"
            >
              <Box size={12} />
              <span>3D terrain</span>
            </button>
            <button
              className={`btn-toggle-option ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
              title="2D Top-Down Satellite Tactical Map"
            >
              <MapIcon size={12} />
              <span>Satellite</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Subtoolbar Strip: LAYERS + Zone Dropdown + Toolbox Toggle */}
      <div className="map-card-subtoolbar">
        <div className="subtoolbar-left">
          <span className="subtoolbar-label">LAYERS:</span>
          <button
            className={`layer-toggle-chip ${visibleLayers.cameras ? 'active' : ''}`}
            onClick={() => toggleLayer('cameras')}
            title="Toggle optical camera trap markers"
          >
            <span className={`layer-checkbox-square ${visibleLayers.cameras ? 'checked' : ''}`}>
              {visibleLayers.cameras && <Check size={10} strokeWidth={3} />}
            </span>
            <span>Cameras</span>
          </button>

          <button
            className={`layer-toggle-chip ${visibleLayers.acoustics ? 'active' : ''}`}
            onClick={() => toggleLayer('acoustics')}
            title="Toggle bioacoustic sensor markers"
          >
            <span className={`layer-checkbox-square ${visibleLayers.acoustics ? 'checked' : ''}`}>
              {visibleLayers.acoustics && <Check size={10} strokeWidth={3} />}
            </span>
            <span>Acoustics</span>
          </button>

          <button
            className={`layer-toggle-chip ${visibleLayers.incidents ? 'active' : ''}`}
            onClick={() => toggleLayer('incidents')}
            title="Toggle anti-poaching incident markers"
          >
            <span className={`layer-checkbox-square ${visibleLayers.incidents ? 'checked' : ''}`}>
              {visibleLayers.incidents && <Check size={10} strokeWidth={3} />}
            </span>
            <span>Incidents</span>
          </button>
        </div>

        <div className="subtoolbar-right">
          {/* Incident Toolbox Toggle Button */}
          <button
            className={`toolbox-header-toggle-btn ${isToolboxOpen ? 'active' : ''}`}
            onClick={() => setIsToolboxOpen(!isToolboxOpen)}
            title={isToolboxOpen ? 'Collapse Incident Toolbox' : 'Expand Incident Toolbox'}
          >
            {isToolboxOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
            <span>Incident Toolbox</span>
            <span className="toolbox-toggle-pill">14+</span>
          </button>

          <select
            className="zone-select-dropdown"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            aria-label="Filter by reserve sector"
          >
            <option value="all">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: Incident Toolbox (Left) + 3D Forest Canvas (Right) */}
      <div className="map-workspace-split">
        {/* Dedicated Incident Toolbox Sidebar immediately to the LEFT of the 3D map */}
        <IncidentToolbox
          isOpen={isToolboxOpen}
          onToggle={() => setIsToolboxOpen(!isToolboxOpen)}
          onStartDrag={handleStartDrag}
          customItems={customToolboxItems}
          onAddCustomItem={onAddCustomToolboxItem}
          onDeleteCustomItem={onDeleteCustomToolboxItem}
        />

        {/* VIEWPORT: 3D Canvas or 2D Satellite View */}
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
                visibleLayers={visibleLayers}
                cameraAction={cameraAction}
                isTopDown={isTopDown}
                selectedMarkerId={selectedMarkerId}
                onSelectMarker={onSelectMarker}
                onSwitchTo2D={() => setViewMode('2d')}
                draggingItem={draggingItem}
                dragPointerPos={dragPointerPos}
                onTerrainHitChange={handleTerrainHitChange}
                onStartReposition={handleStartReposition}
                focusTarget={focusTarget}
              />
            </div>

            {/* HUD Top-Left Metrics: Pitch 45° and Relief ×1.5 */}
            <div className="hud-top-left-metrics">
              <div className="hud-metric-pill">Pitch 45°</div>
              <div className="hud-metric-pill">Relief ×1.5</div>
            </div>

            {/* HUD Top-Right Compass Rose */}
            <button
              className="hud-compass-rose"
              onClick={handleResetCamera}
              title="Reset North orientation (Pitch 45° Isometric)"
            >
              <span className="compass-n-text">N</span>
              <div className="compass-arrow-glyph" />
            </button>

            {/* HUD Right-Edge Floating Vertical Toolbar (+, −, Compass, Fullscreen) */}
            <div className="hud-vertical-toolbar">
              <button
                className="hud-vert-btn"
                onClick={() => setCameraAction({ type: 'zoomIn', id: Date.now() })}
                title="Zoom In"
                aria-label="Zoom In"
              >
                <Plus size={14} />
              </button>
              <button
                className="hud-vert-btn"
                onClick={() => setCameraAction({ type: 'zoomOut', id: Date.now() })}
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <Minus size={14} />
              </button>
              <button
                className="hud-vert-btn"
                onClick={handleResetCamera}
                title="Reset View"
                aria-label="Reset View"
              >
                <Compass size={14} />
              </button>
              <button
                className="hud-vert-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                aria-label="Toggle Fullscreen"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            {/* HUD Bottom-Left Scale Bar: — 500 m */}
            <div className="hud-bottom-scale">
              <div className="scale-bar-row">
                <div className="scale-tick-mark start" />
                <div className="scale-line-segment" />
                <div className="scale-tick-mark end" />
                <span className="scale-distance-text">500 m</span>
              </div>
              <div className="scale-disclaimer-text">
                Illustrative terrain · Not for field navigation
              </div>
            </div>

            {/* HUD Bottom Footer Bar: Legend Pills + OBLIQUE RESERVE MODEL */}
            <div className="hud-bottom-legend-bar">
              <div className="legend-pills-row">
                <div className="legend-item-pill">
                  <Camera size={11} className="legend-icon camera" />
                  <span>Camera</span>
                </div>
                <div className="legend-item-pill">
                  <Radio size={11} className="legend-icon acoustic" />
                  <span>Acoustic</span>
                </div>
                <div className="legend-item-pill">
                  <span className="legend-color-dot incident" />
                  <span>Incident</span>
                </div>
                <div className="legend-item-pill">
                  <span className="legend-color-dot offline" />
                  <span>Offline</span>
                </div>
              </div>
              <div className="legend-oblique-label">OBLIQUE RESERVE MODEL</div>
            </div>
          </div>
        ) : (
          /* Preserved 2D Satellite / Tactical View with Clean GIS Representation & Flowing River */
          <div className="map-canvas-container">
            <SimulatedForestMap
              zones={zones}
              trails={trails}
              sensors={sensors}
              events={events}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              selectedItem={selectedItem}
              onSelectMarker={onSelectMarker}
              activeLayer={visibleLayers.incidents ? 'threats' : 'all'}
              onSwitchTo3D={() => setViewMode('3d')}
            />
          </div>
        )}
      </div>

      {/* 5. Floating Cursor Drag Preview (Follows mouse across UI during drag) */}
      {draggingItem && dragPointerPos && (
        <div
          className="floating-drag-preview"
          style={{
            left: `${dragPointerPos.clientX + 14}px`,
            top: `${dragPointerPos.clientY + 14}px`
          }}
        >
          <span className="preview-emoji">{draggingItem.icon}</span>
          <div className="preview-details">
            <span className="preview-title">{draggingItem.title}</span>
            <span className={`preview-severity-pill ${draggingItem.defaultSeverity}`}>
              {draggingItem.defaultSeverity}
            </span>
          </div>
        </div>
      )}

      {/* 6. Post-Drop Incident Configuration Modal */}
      {pendingDrop && (
        <PostDropIncidentModal
          pendingDrop={pendingDrop}
          onConfirm={handleConfirmNewIncident}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </div>
  )
}
