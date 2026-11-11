import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Mail, AlertTriangle } from 'lucide-react'

import TacticalCanvas from './TacticalCanvas.jsx'
import TacticalTopOverlay from './TacticalTopOverlay.jsx'
import TacticalBottomOverlay from './TacticalBottomOverlay.jsx'
import TacticalSidebar from './TacticalSidebar.jsx'
import TacticalSensorPopup from './TacticalSensorPopup.jsx'
import IncidentToolbox from '../forest3d/IncidentToolbox.jsx'
import { isLegitimateTacticalIncident } from '../../services/meshNetwork/incidentFiltering.js'
import { getSuppressedSensorLabelIds } from '../../services/meshNetwork/popupPositioning.js'

import {
  DEFAULT_COMMUNICATION_RANGE,
  DEFAULT_ACOUSTIC_RANGE,
  generateSensorTopology,
  getBaseStation
} from '../../services/meshNetwork/sensorTopology.js'
import { buildMeshGraph } from '../../services/meshNetwork/graphBuilder.js'
import { findShortestPath } from '../../services/meshNetwork/dijkstra.js'
import {
  createMeshPacket,
  stepMeshPacket,
  handleSensorFailureOnPackets,
  resumeQueuedPackets
} from '../../services/meshNetwork/packetSimulator.js'
import {
  getZoneFromGridCoords,
  gridToSimulatedLatLng
} from '../forest3d/terrainHelper.js'
import { isEmailConfigured, DEFAULT_EMAIL_NOTIFICATION_MODE } from '../../services/emailService.js'

import './tactical.css'

export default function TacticalRoutingView({
  sensors: externalSensors,
  setSensors: externalSetSensors,
  baseStation: externalBaseStation,
  setBaseStation: externalSetBaseStation,
  packets: externalPackets,
  setPackets: externalSetPackets,
  emailNotificationMode = DEFAULT_EMAIL_NOTIFICATION_MODE,
  onChangeEmailMode,
  events: sharedEvents = [],
  customToolboxItems = [],
  onAddCustomToolboxItem,
  onDeleteCustomToolboxItem,
  onAddIncident,
  onPacketDelivered,
  onSwitchToForestMap,
  onNavigateToOverview,
  currentRole = 'RANGER',
  onLogout
}) {
  // 1. Acoustic Sensors State (Deterministic default: 28 acoustic sensors)
  const [internalSensors, setInternalSensors] = useState(() => {
    return generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE, DEFAULT_ACOUSTIC_RANGE)
  })

  const sensors = externalSensors || internalSensors
  const setSensors = externalSetSensors || setInternalSensors

  // 2. Base Station State
  const [internalBaseStation, setInternalBaseStation] = useState(() => getBaseStation())
  const baseStation = externalBaseStation || internalBaseStation
  const setBaseStation = externalSetBaseStation || setInternalBaseStation
  const [isBaseReceiving, setIsBaseReceiving] = useState(false)

  // 3. Range Calibration Defaults
  const [defaultCommRange, setDefaultCommRange] = useState(DEFAULT_COMMUNICATION_RANGE)
  const [defaultAcousticRange, setDefaultAcousticRange] = useState(DEFAULT_ACOUSTIC_RANGE)

  // 4. Mesh Graph Data Structure
  const graph = useMemo(() => {
    return buildMeshGraph(sensors, baseStation)
  }, [sensors, baseStation])

  // 5. Active Fused Incident State & Overlay Visibility
  const [activeIncident, setActiveIncident] = useState(null)
  const [isIncidentOverlayVisible, setIsIncidentOverlayVisible] = useState(true)
  const [dismissedIncidentId, setDismissedIncidentId] = useState(null)

  const handleDismissIncidentOverlay = useCallback(() => {
    setIsIncidentOverlayVisible(false)
    if (activeIncident?.id) {
      setDismissedIncidentId(activeIncident.id)
    }
  }, [activeIncident?.id])

  const handleShowIncidentOverlay = useCallback(() => {
    setIsIncidentOverlayVisible(true)
    setDismissedIncidentId(null)
  }, [])

  // Auto-display: when a NEW incident is created or selected, show overlay automatically.
  // If the user has manually dismissed this specific incident, do not force it open repeatedly.
  useEffect(() => {
    if (activeIncident?.id) {
      if (activeIncident.id !== dismissedIncidentId) {
        setIsIncidentOverlayVisible(true)
      }
    }
  }, [activeIncident?.id, dismissedIncidentId])

  // Filter incidents for tactical map: strictly omit hardcoded demo incidents (EVT-2026-*)
  const tacticalIncidents = useMemo(() => {
    const list = []
    const seen = new Set()

    if (activeIncident && activeIncident.id) {
      list.push(activeIncident)
      seen.add(activeIncident.id)
    }

    if (Array.isArray(sharedEvents)) {
      for (const ev of sharedEvents) {
        if (ev && ev.id && !seen.has(ev.id) && isLegitimateTacticalIncident(ev)) {
          list.push(ev)
          seen.add(ev.id)
        }
      }
    }

    return list
  }, [sharedEvents, activeIncident])

  // 6. Packet Transmission State
  const [internalPackets, setInternalPackets] = useState([])
  const packets = externalPackets || internalPackets
  const setPackets = externalSetPackets || setInternalPackets
  const [currentPacket, setCurrentPacket] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)

  // 7. Selection & Inspection
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [notificationToast, setNotificationToast] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSensorPopupOpen, setIsSensorPopupOpen] = useState(false)
  const [sensorScreenPos, setSensorScreenPos] = useState(null)

  const handleSelectNode = useCallback((node) => {
    if (!node) return
    setSelectedNodeId(node.id)
    if (node.id !== 'BASE') {
      setIsSensorPopupOpen(true)
    }
  }, [])

  const handleDismissPopup = useCallback(() => {
    setIsSensorPopupOpen(false)
  }, [])

  const selectedSensor = useMemo(() => {
    return sensors.find((s) => s.id === selectedNodeId) || null
  }, [sensors, selectedNodeId])

  // Suppress underlying sensor labels that visually intersect the active popup area
  const suppressedLabelIds = useMemo(() => {
    if (!isSensorPopupOpen || !selectedSensor || !sensorScreenPos) return []
    return getSuppressedSensorLabelIds({
      screenPos: sensorScreenPos,
      popupWidth: 240,
      popupHeight: 200
    })
  }, [isSensorPopupOpen, selectedSensor, sensorScreenPos])

  // 8. Visual Layer Toggles
  const [showLinks, setShowLinks] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [commRangeMode, setCommRangeMode] = useState('none') // 'none' | 'selected' | 'all'
  const [acousticRangeMode, setAcousticRangeMode] = useState('none') // 'none' | 'selected' | 'incident' | 'all'
  const [showUncertainty, setShowUncertainty] = useState(true)

  // 9. Incident Toolbox & Strict Drag-and-Drop Placement State
  const [isToolboxOpen, setIsToolboxOpen] = useState(true)
  const [draggingItem, setDraggingItem] = useState(null)
  const [dragPointerPos, setDragPointerPos] = useState(null)
  const [dropToast, setDropToast] = useState(null)

  const terrainMeshRef = useRef(null)
  const terrainHitRef = useRef(null)
  const isTerrainHitValidRef = useRef(false)
  const dragStartPosRef = useRef(null)
  const hasDraggedRef = useRef(false)

  // Auto-dismiss notification toasts
  useEffect(() => {
    if (!notificationToast) return
    const t = setTimeout(() => setNotificationToast(null), 6000)
    return () => clearTimeout(t)
  }, [notificationToast])

  // Auto-dismiss drop confirmation toast
  useEffect(() => {
    if (!dropToast) return
    const t = setTimeout(() => setDropToast(null), 5000)
    return () => clearTimeout(t)
  }, [dropToast])

  // Selected Path derivation:
  const selectedPath = useMemo(() => {
    if (currentPacket && (currentPacket.status === 'in_transit' || currentPacket.status === 'rerouting')) {
      return currentPacket.path
    }
    if (selectedNodeId && selectedNodeId !== 'BASE' && graph?.adjacency) {
      const res = findShortestPath(graph.adjacency, selectedNodeId, 'BASE')
      return res.reachable ? res.path : []
    }
    if (activeIncident?.routeToBasestation) {
      return activeIncident.routeToBasestation
    }
    return []
  }, [currentPacket, selectedNodeId, graph, activeIncident])

  // 10. ANIMATION LOOP: Advance packets along edges
  const lastTimeRef = useRef(null)

  useEffect(() => {
    let animId
    lastTimeRef.current = performance.now()

    const loop = (currentTime) => {
      const last = lastTimeRef.current || currentTime
      const delta = (currentTime - last) / 1000
      lastTimeRef.current = currentTime

      if (!isPaused && delta > 0 && delta < 0.25) {
        setPackets((prevPackets) => {
          if (!prevPackets || prevPackets.length === 0) return prevPackets

          let hasChanges = false
          const nextPackets = prevPackets.map((pkt) => {
            if (pkt.status !== 'in_transit' && pkt.status !== 'rerouting') return pkt

            hasChanges = true
            const clone = { ...pkt }
            const stepResult = stepMeshPacket(clone, delta, speedMultiplier, (deliveredPkt) => {
              // Base station packet arrival reception effect
              setIsBaseReceiving(true)
              setTimeout(() => setIsBaseReceiving(false), 2200)

              setNotificationToast(`PACKET ${deliveredPkt.id} DELIVERED TO BASE STATION`)
              setBaseStation((prev) => ({
                ...prev,
                packetsDelivered: (prev.packetsDelivered || 0) + 1,
                packetsReceived: (prev.packetsReceived || 0) + 1
              }))

              onPacketDelivered?.(deliveredPkt)
            })

            return stepResult.packet
          })

          if (hasChanges) {
            const activePkt = nextPackets.find(
              (p) => p.status === 'in_transit' || p.status === 'rerouting'
            ) || nextPackets[0] || null
            setCurrentPacket(activePkt)
          }

          return nextPackets
        })
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isPaused, speedMultiplier, setPackets, setBaseStation, onPacketDelivered])

  // Real-time callback from DragPlacementController inside Three.js
  const handleTerrainHitChange = useCallback((hitPoint, isValid) => {
    terrainHitRef.current = hitPoint
    isTerrainHitValidRef.current = isValid
  }, [])

  // 11. STRICT DRAG-AND-DROP LIFECYCLE (NO CLICK-TO-PLACE)
  const handleStartDrag = useCallback((item, event) => {
    dragStartPosRef.current = { x: event.clientX, y: event.clientY }
    hasDraggedRef.current = false
    setDraggingItem(item)
    setDragPointerPos({ clientX: event.clientX, clientY: event.clientY })
    terrainHitRef.current = null
    isTerrainHitValidRef.current = false
  }, [])

  useEffect(() => {
    if (!draggingItem) return

    const handlePointerMove = (e) => {
      // Require actual pointer displacement before marking as an active drag
      if (dragStartPosRef.current) {
        const dx = e.clientX - dragStartPosRef.current.x
        const dy = e.clientY - dragStartPosRef.current.y
        if (Math.hypot(dx, dy) >= 6) {
          hasDraggedRef.current = true
        }
      }
      setDragPointerPos({ clientX: e.clientX, clientY: e.clientY })
    }

    const handlePointerUp = () => {
      // STRICT RULE: Only a genuine drag (with movement) dropped onto valid terrain creates an incident.
      // A simple click on an incident card without dragging does NOT create an incident.
      if (hasDraggedRef.current && terrainHitRef.current && isTerrainHitValidRef.current) {
        const hit = terrainHitRef.current
        const gridX = Math.max(0, Math.min(100, hit.x + 50))
        const gridY = Math.max(0, Math.min(100, hit.z + 50))
        const detectedZone = getZoneFromGridCoords(gridX, gridY)
        const latLng = gridToSimulatedLatLng(gridX, gridY)
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)

        const newIncident = {
          id: `EVT-TAC-${Date.now().toString().slice(-6)}`,
          type: draggingItem.type || 'manual_incident',
          category: draggingItem.category || 'threat',
          title: draggingItem.title || 'New Incident',
          description:
            draggingItem.defaultDescription ||
            `Field incident logged at ${detectedZone.name}.`,
          icon: draggingItem.icon || '📍',
          zoneId: detectedZone.id,
          zoneName: detectedZone.name,
          coordinates: {
            x: Number(gridX.toFixed(2)),
            y: Number(gridY.toFixed(2)),
            simulatedLat: latLng.simulatedLat,
            simulatedLng: latLng.simulatedLng
          },
          worldPosition: {
            x: Number(hit.x.toFixed(2)),
            y: Number(hit.y.toFixed(2)),
            z: Number(hit.z.toFixed(2))
          },
          timestamp: timestamp,
          timeAgo: 'Just now',
          confidence: 1.0,
          priority: draggingItem.defaultSeverity || 'high',
          status: 'active',
          source: 'Manual Field Report',
          isManual: true,
          disclaimer:
            'Manual incident logged via tactical 3D interactive placement.'
        }

        const emailPromise = onAddIncident?.(newIncident)
        setActiveIncident(newIncident)
        setIsIncidentOverlayVisible(true)
        setDismissedIncidentId(null)

        const hasEmailConfig = isEmailConfigured()
        let initialEmailStatus = null
        if (hasEmailConfig) {
          if (emailNotificationMode === 'IMMEDIATE') {
            initialEmailStatus = 'sending'
          } else if (emailNotificationMode === 'AFTER BASE STATION RECEIVES PACKET') {
            initialEmailStatus = 'pending_mesh'
          } else {
            initialEmailStatus = 'disabled'
          }
        }

        setDropToast({
          title: newIncident.title,
          zoneName: detectedZone.name,
          icon: newIncident.icon,
          message: `Logged at ${detectedZone.name} [${Number(gridX.toFixed(1))}, ${Number(gridY.toFixed(1))}]`,
          emailStatus: initialEmailStatus
        })

        if (emailPromise && typeof emailPromise.then === 'function') {
          emailPromise
            .then((res) => {
              if (res?.incident) {
                setActiveIncident(res.incident)
                if (res.incident.originatingSensorId) {
                  setSelectedNodeId(res.incident.originatingSensorId)
                }
              }
              if (res?.pending) {
                setDropToast((prev) => (prev ? { ...prev, emailStatus: 'pending_mesh' } : null))
              } else if (res?.success && emailNotificationMode === 'IMMEDIATE') {
                setDropToast((prev) => (prev ? { ...prev, emailStatus: 'sent' } : null))
              }
            })
            .catch(() => {
              setDropToast((prev) => (prev ? { ...prev, emailStatus: 'failed' } : null))
            })
        }
      }

      // Cleanup drag state
      setDraggingItem(null)
      setDragPointerPos(null)
      dragStartPosRef.current = null
      hasDraggedRef.current = false
      terrainHitRef.current = null
      isTerrainHitValidRef.current = false
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDraggingItem(null)
        setDragPointerPos(null)
        dragStartPosRef.current = null
        hasDraggedRef.current = false
        terrainHitRef.current = null
        isTerrainHitValidRef.current = false
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [draggingItem, onAddIncident, emailNotificationMode])

  // 12. SENSOR FAILURE & AUTOMATIC REROUTING SIMULATION
  const handleToggleSensorStatus = useCallback(
    (sensorId) => {
      const target = sensors.find((s) => s.id === sensorId)
      if (!target) return

      const willBeFailed = target.status === 'online'

      const updatedSensors = sensors.map((s) =>
        s.id === sensorId ? { ...s, status: willBeFailed ? 'failed' : 'online' } : s
      )
      setSensors(updatedSensors)

      const nextGraph = buildMeshGraph(updatedSensors, baseStation)

      if (willBeFailed) {
        const failoverResult = handleSensorFailureOnPackets(packets, nextGraph, sensorId, updatedSensors)
        setPackets(failoverResult.updatedPackets)
        if (failoverResult.updatedSensors) {
          setSensors(failoverResult.updatedSensors)
        }

        if (failoverResult.notifications.length > 0) {
          setNotificationToast(failoverResult.notifications[0])
        } else {
          setNotificationToast(`SENSOR ${sensorId} FAILED — MESH RECONFIGURED`)
        }
      } else {
        const recoveryResult = resumeQueuedPackets(packets, nextGraph, updatedSensors)
        setPackets(recoveryResult.updatedPackets)
        if (recoveryResult.updatedSensors) {
          setSensors(recoveryResult.updatedSensors)
        }

        if (recoveryResult.resumedCount > 0) {
          setNotificationToast(
            `SENSOR ${sensorId} RESTORED — ${recoveryResult.resumedCount} MESSAGE(S) FORWARDED TO BASE`
          )
        } else {
          setNotificationToast(`SENSOR ${sensorId} ONLINE — MESH EXPANDED`)
        }
      }
    },
    [sensors, baseStation, packets, setSensors, setPackets]
  )

  const handleFailRandomSensor = useCallback(() => {
    const operational = sensors.filter((s) => s.status === 'online')
    if (operational.length === 0) {
      setNotificationToast('ALL SENSORS ARE ALREADY OFFLINE')
      return
    }
    const victim = operational[Math.floor(Math.random() * operational.length)]
    handleToggleSensorStatus(victim.id)
  }, [sensors, handleToggleSensorStatus])

  const handleRestoreAllSensors = useCallback(() => {
    const restored = sensors.map((s) => ({ ...s, status: 'online' }))
    const restoredGraph = buildMeshGraph(restored, baseStation)
    const recoveryResult = resumeQueuedPackets(packets, restoredGraph, restored)
    setSensors(recoveryResult.updatedSensors || restored)
    setPackets(recoveryResult.updatedPackets)
    setNotificationToast(
      recoveryResult.resumedCount > 0
        ? `ALL SENSORS RESTORED — ${recoveryResult.resumedCount} STORED MESSAGE(S) FORWARDED TO BASE`
        : 'ALL 28 SENSORS ONLINE — FULL MESH TOPOLOGY RESTORED'
    )
  }, [sensors, baseStation, packets, setSensors, setPackets])

  const handleRegenerateTopology = useCallback(() => {
    const fresh = generateSensorTopology(28, defaultCommRange, defaultAcousticRange)
    setSensors(fresh)
    setPackets([])
    setCurrentPacket(null)
    setActiveIncident(null)
    setIsIncidentOverlayVisible(true)
    setDismissedIncidentId(null)
    setSelectedNodeId(null)
    setNotificationToast('SENSOR TOPOLOGY REGENERATED — 28 NODES BALANCED')
  }, [defaultCommRange, defaultAcousticRange, setSensors, setPackets])

  const handleChangeDefaultCommRange = useCallback(
    (newRange) => {
      setDefaultCommRange(newRange)
      setSensors((prev) => prev.map((s) => ({ ...s, communicationRange: newRange })))
      setBaseStation((prev) => ({ ...prev, communicationRange: newRange + 4 }))
    },
    [setSensors, setBaseStation]
  )

  const handleChangeDefaultAcousticRange = useCallback(
    (newRange) => {
      setDefaultAcousticRange(newRange)
      setSensors((prev) => prev.map((s) => ({ ...s, acousticDetectionRange: newRange })))
    },
    [setSensors]
  )

  const handleChangeSensorCommRange = useCallback((sensorId, newRange) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === sensorId ? { ...s, communicationRange: newRange } : s))
    )
  }, [setSensors])

  const handleChangeSensorAcousticRange = useCallback((sensorId, newRange) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === sensorId ? { ...s, acousticDetectionRange: newRange } : s))
    )
  }, [setSensors])

  return (
    <div className="tactical-routing-view-container">
      {/* 1. TOP HUD OVERLAY */}
      <TacticalTopOverlay
        stats={graph?.stats}
        activeIncident={activeIncident}
        isIncidentOverlayVisible={isIncidentOverlayVisible}
        onShowIncidentOverlay={handleShowIncidentOverlay}
        packetsInTransitCount={
          packets.filter((p) => p.status === 'in_transit' || p.status === 'rerouting').length
        }
        onSwitchToForestMap={onSwitchToForestMap}
        onNavigateToOverview={onNavigateToOverview}
        currentRole={currentRole}
        onLogout={onLogout}
      />

      {/* 2. MAIN WORKSPACE: SIDEBAR, 3D CANVAS & INCIDENT TOOLBOX */}
      <div className="tactical-workspace">
        {/* Left Telemetry & Controls Sidebar */}
        <TacticalSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          sensors={sensors}
          baseStation={baseStation}
          graph={graph}
          packets={packets}
          selectedNodeId={selectedNodeId}
          activeIncident={activeIncident}
          selectedPath={selectedPath}
          currentRole={currentRole}
          // Toggles
          showLinks={showLinks}
          setShowLinks={setShowLinks}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          commRangeMode={commRangeMode}
          setCommRangeMode={setCommRangeMode}
          acousticRangeMode={acousticRangeMode}
          setAcousticRangeMode={setAcousticRangeMode}
          showUncertainty={showUncertainty}
          setShowUncertainty={setShowUncertainty}
          // Sliders
          defaultCommRange={defaultCommRange}
          onChangeDefaultCommRange={handleChangeDefaultCommRange}
          defaultAcousticRange={defaultAcousticRange}
          onChangeDefaultAcousticRange={handleChangeDefaultAcousticRange}
          // Email Notification Mode Setting
          emailNotificationMode={emailNotificationMode}
          onChangeEmailMode={onChangeEmailMode}
          // Sensor Actions
          onSelectNode={handleSelectNode}
          onToggleSensorStatus={handleToggleSensorStatus}
          onChangeSensorCommRange={handleChangeSensorCommRange}
          onChangeSensorAcousticRange={handleChangeSensorAcousticRange}
          onFailRandomSensor={handleFailRandomSensor}
          onRestoreAllSensors={handleRestoreAllSensors}
          onRegenerateTopology={handleRegenerateTopology}
        />

        {/* 3D Interactive Tactical Canvas (No click-to-place terrain click handler) */}
        <main className="tactical-canvas-main">
          <TacticalCanvas
            sensors={sensors}
            baseStation={baseStation}
            graph={graph}
            incidents={tacticalIncidents}
            activeIncident={activeIncident}
            isIncidentOverlayVisible={isIncidentOverlayVisible}
            onDismissIncidentOverlay={handleDismissIncidentOverlay}
            packets={packets}
            selectedNodeId={selectedNodeId}
            selectedPath={selectedPath}
            showLinks={showLinks}
            showFailedLinks={true}
            showLabels={showLabels}
            commRangeMode={commRangeMode}
            acousticRangeMode={acousticRangeMode}
            showUncertainty={showUncertainty}
            isBaseReceiving={isBaseReceiving}
            terrainMeshRef={terrainMeshRef}
            draggingItem={draggingItem}
            dragPointerPos={dragPointerPos}
            onTerrainHitChange={handleTerrainHitChange}
            onSelectNode={handleSelectNode}
            onSelectIncident={(inc) => {
              setActiveIncident(inc)
              setIsIncidentOverlayVisible(true)
              setDismissedIncidentId(null)
              if (inc.originatingSensorId) {
                setSelectedNodeId(inc.originatingSensorId)
              }
            }}
            onSensorScreenPos={setSensorScreenPos}
            onDismissPopup={handleDismissPopup}
            suppressedLabelIds={suppressedLabelIds}
          />

          {/* Floating Show Incident Button (Appears when active incident overlay is dismissed) */}
          {activeIncident && !isIncidentOverlayVisible && (
            <button
              type="button"
              className="btn-canvas-show-incident"
              onClick={handleShowIncidentOverlay}
              title="Show Incident Information Card"
              aria-label="Show active incident information"
            >
              <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
              <span>SHOW INCIDENT</span>
              {activeIncident.title && (
                <span className="badge-show-incident-tag">{activeIncident.title}</span>
              )}
            </button>
          )}

          {/* Interactive 3D Sensor Status & Failure/Restore Popup */}
          {isSensorPopupOpen && selectedSensor && selectedSensor.id !== 'BASE' && (
            <TacticalSensorPopup
              sensor={selectedSensor}
              graph={graph}
              screenPos={sensorScreenPos}
              onToggleStatus={handleToggleSensorStatus}
              onClose={handleDismissPopup}
              activeIncident={activeIncident}
              isDragging={Boolean(draggingItem)}
            />
          )}

          {/* Floating Drag Cursor Follower */}
          {draggingItem && dragPointerPos && (
            <div
              className="tactical-floating-drag-preview"
              style={{
                left: `${dragPointerPos.clientX + 16}px`,
                top: `${dragPointerPos.clientY + 16}px`,
                borderColor:
                  (draggingItem.defaultSeverity || draggingItem.priority) === 'critical'
                    ? '#ef4444'
                    : (draggingItem.defaultSeverity || draggingItem.priority) === 'high'
                    ? '#f59e0b'
                    : (draggingItem.defaultSeverity || draggingItem.priority) === 'medium'
                    ? '#00f0ff'
                    : '#3b82f6'
              }}
            >
              <div className="preview-top-row">
                <span className="preview-icon-box">{draggingItem.icon || '⚠️'}</span>
                <div className="preview-title-col">
                  <span className="preview-title-text">{draggingItem.title}</span>
                  <span
                    className={`preview-severity-badge ${
                      draggingItem.defaultSeverity || draggingItem.priority || 'high'
                    }`}
                  >
                    {(draggingItem.defaultSeverity || draggingItem.priority || 'HIGH').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="preview-drop-indicator">
                <span className="indicator-pulse-dot" />
                <span className="indicator-text">DROP TO PLACE</span>
              </div>
            </div>
          )}

          {/* Incident Drop Notification Toast */}
          {dropToast && (
            <div className="incident-created-toast">
              <div className="toast-left">
                <span className="toast-emoji">{dropToast.icon}</span>
                <div className="toast-info">
                  <div className="toast-title-row">
                    <span className="toast-title">{dropToast.title} Placed</span>
                    {dropToast.emailStatus === 'pending_mesh' && (
                      <span className="toast-email-badge sending" style={{ backgroundColor: '#082f49', color: '#38bdf8', borderColor: '#0284c7' }} title="Email alert will send when packet reaches Base Station">
                        <Mail size={11} />
                        <span>Email pending Base confirmation</span>
                      </span>
                    )}
                    {dropToast.emailStatus === 'sending' && (
                      <span className="toast-email-badge sending" title="Sending email notification">
                        <Mail size={11} className="email-spin-icon" />
                        <span>Emailing dispatch...</span>
                      </span>
                    )}
                  </div>
                  <span className="toast-sub-msg">{dropToast.message}</span>
                </div>
              </div>
              <button
                className="toast-dismiss-btn"
                onClick={() => setDropToast(null)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
        </main>

        {/* Existing Incident Toolbox Reused on Tactical Routing Map */}
        <IncidentToolbox
          isOpen={isToolboxOpen}
          onToggle={() => setIsToolboxOpen((prev) => !prev)}
          onStartDrag={handleStartDrag}
          customItems={customToolboxItems}
          onAddCustomItem={onAddCustomToolboxItem}
          onDeleteCustomItem={onDeleteCustomToolboxItem}
        />
      </div>

      {/* 3. BOTTOM HUD OVERLAY */}
      <TacticalBottomOverlay
        currentPacket={currentPacket}
        stats={graph?.stats}
        isPaused={isPaused}
        speedMultiplier={speedMultiplier}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onChangeSpeed={(spd) => setSpeedMultiplier(spd)}
      />

      {/* 4. REAL-TIME TACTICAL NOTIFICATION TOAST */}
      {notificationToast && (
        <div className="tactical-notification-toast">
          <span className="toast-pulse" />
          <span className="toast-text">{notificationToast}</span>
        </div>
      )}
    </div>
  )
}
