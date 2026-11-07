import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopNav from './components/TopNav'
import OverviewCards from './components/OverviewCards'
import ForestMapContainer from './components/forest3d/ForestMapContainer'
import ThreatAlertsPanel from './components/ThreatAlertsPanel'
import SensorHealthPanel from './components/SensorHealthPanel'
import WildlifeSummaryTable from './components/WildlifeSummaryTable'
import IncidentHistoryTable from './components/IncidentHistoryTable'
import SensorManagementView from './components/SensorManagementView'
import WildlifeDetectionsView from './components/WildlifeDetectionsView'
import AnalyticsView from './components/AnalyticsView'
import SettingsView from './components/SettingsView'
import MarkerDetailModal from './components/MarkerDetailModal'
import TacticalRoutingView from './components/tactical/TacticalRoutingView'

import {
  DEFAULT_COMMUNICATION_RANGE,
  DEFAULT_ACOUSTIC_RANGE,
  generateSensorTopology,
  getBaseStation
} from './services/meshNetwork/sensorTopology.js'
import { detectAcousticEvent, selectPacketOriginator } from './services/meshNetwork/acousticDetection.js'
import { estimateSourceLocation } from './services/meshNetwork/incidentFusion.js'
import { buildMeshGraph } from './services/meshNetwork/graphBuilder.js'
import { findShortestPath } from './services/meshNetwork/dijkstra.js'
import { createMeshPacket, stepMeshPacket } from './services/meshNetwork/packetSimulator.js'
import { enqueueMessageAtSensor } from './services/meshNetwork/storeAndForward.js'

import {
  INITIAL_SENSORS,
  INITIAL_EVENTS,
  SIMULATED_ZONES,
  ANIMAL_TRAILS
} from './data/mockData'
import {
  calculateDashboardStats,
  generateRandomDemoIncident
} from './services/dataService'
import {
  sendIncidentEmailNotification,
  EMAIL_NOTIFICATION_MODES,
  DEFAULT_EMAIL_NOTIFICATION_MODE
} from './services/emailService'

import './App.css'

export default function App() {
  // Centralized Application State
  const [sensors, setSensors] = useState(INITIAL_SENSORS)

  // Centralized Acoustic Mesh Sensors State (28 acoustic nodes)
  const [meshSensors, setMeshSensors] = useState(() =>
    generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE, DEFAULT_ACOUSTIC_RANGE)
  )

  // Primary Base Station State
  const [baseStation, setBaseStation] = useState(() => getBaseStation())

  // Active Mesh Telemetry Packets
  const [packets, setPackets] = useState([])

  // Persistent Email Notification Mode (Default: 'AFTER BASE STATION RECEIVES PACKET')
  const [emailNotificationMode, setEmailNotificationMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ecosentry_email_notification_mode')
      if (saved && Object.values(EMAIL_NOTIFICATION_MODES).includes(saved)) {
        return saved
      }
    } catch (e) {
      console.warn('Failed to parse saved email notification mode:', e)
    }
    return DEFAULT_EMAIL_NOTIFICATION_MODE
  })

  // Base Station Packet Arrival Toast Notification
  const [baseDeliveryToast, setBaseDeliveryToast] = useState(null)
  const deliveredMessageIdsRef = useRef(new Set())

  // Persist email notification mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecosentry_email_notification_mode', emailNotificationMode)
    } catch (e) {
      console.warn('Failed to save email notification mode:', e)
    }
  }, [emailNotificationMode])

  // Auto-dismiss base delivery toast after 6 seconds
  useEffect(() => {
    if (!baseDeliveryToast) return
    const timer = setTimeout(() => setBaseDeliveryToast(null), 6000)
    return () => clearTimeout(timer)
  }, [baseDeliveryToast])
  
  // Persisted Events State with localStorage
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('ecosentry_events')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed to parse saved events:', e)
    }
    return INITIAL_EVENTS
  })

  // Persisted Custom Toolbox Incident Types
  const [customToolboxItems, setCustomToolboxItems] = useState(() => {
    try {
      const saved = localStorage.getItem('ecosentry_custom_event_types')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.warn('Failed to parse custom event types:', e)
    }
    return []
  })

  const [activeNav, setActiveNav] = useState('overview') // 'overview', 'map', 'threats', 'history', 'sensors', 'wildlife', 'analytics', 'settings'
  const [selectedZone, setSelectedZone] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null) // Modal / inspector item
  const [repositionTarget, setRepositionTarget] = useState(null) // Incident being moved on map
  const [focusTarget, setFocusTarget] = useState(null) // 3D Camera target for "View in 3D"

  // Persist events to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecosentry_events', JSON.stringify(events))
    } catch (e) {
      console.warn('Failed to save events:', e)
    }
  }, [events])

  // Persist custom toolbox templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ecosentry_custom_event_types', JSON.stringify(customToolboxItems))
    } catch (e) {
      console.warn('Failed to save custom event types:', e)
    }
  }, [customToolboxItems])

  // Calculate dynamic statistics strictly from current state (no hardcoding)
  const stats = useMemo(() => {
    return calculateDashboardStats(sensors, events)
  }, [sensors, events])

  // Acknowledge Action: Updates event status from 'active' to 'acknowledged'
  const handleAcknowledge = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'acknowledged' } : e))
    )
  }

  // Resolve Action: Updates event status to 'resolved'
  const handleResolve = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'resolved' } : e))
    )
  }

  // Sensor Disconnect / Reconnect Simulation Control
  const handleToggleSensor = (sensorId) => {
    const target = sensors.find((s) => s.id === sensorId)
    if (!target) return

    const willBeOnline = target.status === 'offline'

    // Update sensor registry
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id !== sensorId) return s
        return {
          ...s,
          status: willBeOnline ? 'online' : 'offline',
          battery: willBeOnline ? 92 : 12,
          signalStrength: willBeOnline ? '94%' : '0%',
          solarCharging: willBeOnline,
          lastPing: willBeOnline ? 'Just now (Reconnected)' : 'Telemetry Timeout (Offline)'
        }
      })
    )

    // Synchronize system events
    if (!willBeOnline) {
      // Disconnecting: log isolated hardware telemetry failure (separate from poaching threats)
      const newFailure = {
        id: `EVT-FAIL-${Date.now().toString().slice(-4)}`,
        type: 'sensor_failure',
        category: 'system',
        title: `Sensor Telemetry Loss: ${sensorId}`,
        description: `Heartbeat watchdog triggered for ${sensorId} (${target.name}). Telemetry transmission interrupted.`,
        sensorId: sensorId,
        sensorType: target.type,
        zoneId: target.zoneId,
        zoneName: target.zoneName,
        coordinates: target.coordinates,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        timeAgo: 'Just now',
        confidence: null,
        priority: 'medium',
        status: 'active',
        isSimulated: true,
        disclaimer: 'Simulated hardware event: packet transmission timeout. Sensor failure does not signify a poaching incident.'
      }
      setEvents((prev) => [newFailure, ...prev])
    } else {
      // Reconnecting: resolve open failure events for this sensor
      setEvents((prev) =>
        prev.map((e) =>
          e.sensorId === sensorId && e.type === 'sensor_failure' && e.status !== 'resolved'
            ? { ...e, status: 'resolved', timeAgo: 'Resolved just now' }
            : e
        )
      )
    }
  }

  // Demonstration trigger: Simulate a new incident on demand
  const handleSimulateIncident = () => {
    const newInc = generateRandomDemoIncident(sensors)
    setEvents((prev) => [newInc, ...prev])
  }

  // Marker click from the 3D Forest Map
  const handleSelectMarker = (marker) => {
    setSelectedItem(marker)
  }

  // Inspect event from tables or alert list
  const handleInspectEvent = (evt) => {
    setSelectedItem({ itemType: 'event', data: evt })
  }

  // Inspect sensor specs from sensor view
  const handleInspectSensor = (sensor) => {
    setSelectedItem({ itemType: 'sensor', data: sensor })
  }

  // "View in 3D" action from Threat Alerts: focus the map on the alert's zone and open its details
  const handleViewOnMap = (alertItem) => {
    if (activeNav !== 'overview' && activeNav !== 'map') {
      setActiveNav('overview')
    }
    if (alertItem.zoneId) {
      setSelectedZone(alertItem.zoneId)
    }
    if (alertItem.coordinates) {
      setFocusTarget({
        x: alertItem.coordinates.x,
        y: alertItem.coordinates.y,
        id: alertItem.id,
        timestamp: Date.now()
      })
    }
    setSelectedItem({ itemType: 'event', data: alertItem })
  }

  // Handle Packet Arrival at Base Station
  const handlePacketDeliveredAtBase = useCallback(async (deliveredPkt) => {
    const pktId = deliveredPkt.messageId || deliveredPkt.id
    if (deliveredMessageIdsRef.current.has(pktId)) {
      return // Single delivery guarantee: never deliver or trigger emails twice
    }
    deliveredMessageIdsRef.current.add(pktId)

    // 1. Update Base Station telemetry
    setBaseStation((prev) => ({
      ...prev,
      packetsDelivered: (prev.packetsDelivered || 0) + 1,
      packetsReceived: (prev.packetsReceived || 0) + 1
    }))

    // 2. Remove delivered message from any sensor messageQueue
    setMeshSensors((prevSensors) =>
      prevSensors.map((s) => {
        if (!s.messageQueue || s.messageQueue.length === 0) return s
        const nextQ = s.messageQueue.filter(
          (m) => (m.messageId || m.id) !== pktId && m.incidentId !== deliveredPkt.incidentId
        )
        return nextQ.length !== s.messageQueue.length ? { ...s, messageQueue: nextQ } : s
      })
    )

    // 3. Mark incident as DELIVERED in state
    let targetIncident = null
    setEvents((prev) => {
      return prev.map((e) => {
        if (e.id === deliveredPkt.incidentId || e.packetId === deliveredPkt.id || e.id === pktId) {
          targetIncident = {
            ...e,
            deliveryStatus: 'DELIVERED',
            transmissionStatus: 'DELIVERED',
            deliveredAt: new Date().toISOString()
          }
          return targetIncident
        }
        return e
      })
    })

    // 4. Email Notification Workflow based on selected mode
    if (emailNotificationMode === EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION) {
      const incId = deliveredPkt.incidentId || 'INCIDENT'

      // Display required confirmation:
      // BASE STATION RECEIVED INCIDENT INC-XXXX
      // EMAIL NOTIFICATION SENT
      setBaseDeliveryToast({
        incidentId: incId,
        title: `BASE STATION RECEIVED INCIDENT ${incId}`,
        message: 'EMAIL NOTIFICATION SENT'
      })

      // Send the email notification
      const incToSend = targetIncident || {
        id: incId,
        title: 'Acoustic Incident Report',
        priority: 'high',
        deliveryStatus: 'DELIVERED'
      }

      try {
        const emailRes = await sendIncidentEmailNotification(incToSend)
        setEvents((prev) =>
          prev.map((e) =>
            e.id === incToSend.id
              ? {
                  ...e,
                  emailNotificationStatus: emailRes.success ? 'EMAIL SENT' : 'EMAIL FAILED'
                }
              : e
          )
        )
      } catch (err) {
        console.error('[EcoSentry] Base-station-confirmed email dispatch error:', err)
      }
    } else {
      // Immediate mode (already dispatched at creation) or Disabled
      setBaseDeliveryToast({
        incidentId: deliveredPkt.incidentId,
        title: `BASE STATION RECEIVED PACKET ${deliveredPkt.id}`,
        message:
          emailNotificationMode === EMAIL_NOTIFICATION_MODES.DISABLED
            ? 'NOTIFICATIONS DISABLED'
            : 'PACKET DELIVERY CONFIRMED'
      })
    }
  }, [emailNotificationMode])

  // Top-Level Mesh Packet Propagation Loop (Steps packets when not on tactical view)
  const lastPacketTimeRef = useRef(null)

  useEffect(() => {
    let animId
    lastPacketTimeRef.current = performance.now()

    const loop = (currentTime) => {
      const last = lastPacketTimeRef.current || currentTime
      const delta = (currentTime - last) / 1000
      lastPacketTimeRef.current = currentTime

      if (activeNav !== 'tactical' && delta > 0 && delta < 0.25) {
        setPackets((prevPackets) => {
          if (!prevPackets || prevPackets.length === 0) return prevPackets

          let hasChanges = false
          const nextPackets = prevPackets.map((pkt) => {
            if (pkt.status !== 'in_transit' && pkt.status !== 'rerouting') return pkt

            hasChanges = true
            const clone = { ...pkt }
            const stepResult = stepMeshPacket(clone, delta, 1.0, (deliveredPkt) => {
              handlePacketDeliveredAtBase(deliveredPkt)
            })

            return stepResult.packet
          })

          return hasChanges ? nextPackets : prevPackets
        })
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [activeNav, handlePacketDeliveredAtBase])

  // Incident Placement Handlers (Drag-and-Drop system & Acoustic Simulation)
  const handleAddIncident = async (incomingIncident) => {
    let incidentToSave = { ...incomingIncident }

    // If not already fused, evaluate acoustic hearing range across operational acoustic nodes
    if (!incidentToSave.isAcousticFused && (incidentToSave.worldPosition || (incidentToSave.coordinates?.x !== undefined && incidentToSave.coordinates?.y !== undefined))) {
      const detectionResult = detectAcousticEvent(
        meshSensors,
        incidentToSave.worldPosition || { gridX: incidentToSave.coordinates.x, gridY: incidentToSave.coordinates.y },
        incidentToSave.type || 'gunshot_sound'
      )

      if (detectionResult.heard && detectionResult.detectionCount > 0) {
        const localization = estimateSourceLocation(detectionResult.detections)
        const base = baseStation || getBaseStation()
        const currentGraph = buildMeshGraph(meshSensors, base)
        const selection = selectPacketOriginator(detectionResult.detections, currentGraph)
        const bestOriginator = selection.originatingSensorId
        const bestRoute = selection.route

        incidentToSave = {
          ...incidentToSave,
          isAcousticFused: true,
          detectionCount: detectionResult.detectionCount,
          detectingSensors: detectionResult.detectingSensorIds,
          uncertaintyRadius: localization.uncertaintyRadius,
          localizationMethod: localization.method,
          confidence: localization.confidence,
          estimatedPosition: localization.estimatedPosition,
          packetId: `PKT-${Date.now().toString().slice(-4)}`,
          nearestSensorId: selection.nearestSensorId,
          nearestSensorDistance: selection.nearestSensorDistance,
          originatingSensorId: bestOriginator,
          originSensorDistance: selection.originSensorDistance,
          bypassedNearestSensor: selection.bypassedNearestSensor,
          bypassReason: selection.bypassReason,
          otherDetectingSensors: selection.otherDetectingSensors,
          routeToBasestation: bestRoute.path,
          routeCost: bestRoute.totalCost !== Infinity ? bestRoute.totalCost : 0,
          transmissionStatus: bestRoute.reachable ? 'in_transit' : 'queued',
          deliveryStatus: bestRoute.reachable ? 'in_transit' : 'queued',
          emailNotificationStatus: emailNotificationMode === EMAIL_NOTIFICATION_MODES.IMMEDIATE ? 'SENDING' : 'PENDING_BASE_CONFIRMATION'
        }

        // Spawn packet / Store-and-Forward message into mesh network
        const newPacket = createMeshPacket(
          incidentToSave.packetId,
          incidentToSave.id,
          bestOriginator,
          bestRoute.reachable ? bestRoute.path : [],
          bestRoute.totalCost !== Infinity ? bestRoute.totalCost : 0,
          incidentToSave
        )

        if (bestRoute.reachable && bestRoute.path.length > 1) {
          setPackets((prev) => [newPacket, ...prev.slice(0, 15)])
        } else {
          // Store-and-Forward: Buffer message into originating sensor's local queue!
          newPacket.status = 'queued'
          newPacket.rerouteReason = selection.bypassReason || 'No route to BASE (buffered in local sensor queue)'

          setMeshSensors((prevSensors) =>
            prevSensors.map((s) => {
              if (s.id !== bestOriginator) return s
              const enq = enqueueMessageAtSensor(s, newPacket)
              return enq.sensor
            })
          )
          setPackets((prev) => [newPacket, ...prev.slice(0, 15)])
        }
      } else {
        incidentToSave = {
          ...incidentToSave,
          detectionCount: 0,
          detectingSensors: [],
          transmissionStatus: 'manual_unrouted',
          deliveryStatus: 'unrouted',
          disclaimer: 'Manual incident placement. Coordinates were outside the acoustic hearing range of all operational sensors.',
          emailNotificationStatus: emailNotificationMode === EMAIL_NOTIFICATION_MODES.IMMEDIATE ? 'SENDING' : 'UNROUTED'
        }
      }
    } else if (incidentToSave.isAcousticFused && incidentToSave.routeToBasestation?.length > 1) {
      // Spawn packet for incident generated from TacticalRoutingView
      const newPacket = createMeshPacket(
        incidentToSave.packetId,
        incidentToSave.id,
        incidentToSave.originatingSensorId,
        incidentToSave.routeToBasestation,
        incidentToSave.routeCost || 20
      )
      setPackets((prev) => [newPacket, ...prev.slice(0, 15)])
    }

    // 1. Immediately append to state to update UI, map markers, alerts, and trigger localStorage persistence
    setEvents((prev) => [incidentToSave, ...prev])

    // 2. IMMEDIATE MODE: Dispatch email now
    if (emailNotificationMode === EMAIL_NOTIFICATION_MODES.IMMEDIATE) {
      try {
        const emailResult = await sendIncidentEmailNotification(incidentToSave)
        setEvents((prev) =>
          prev.map((e) =>
            e.id === incidentToSave.id
              ? { ...e, emailNotificationStatus: emailResult.success ? 'EMAIL SENT' : 'EMAIL FAILED' }
              : e
          )
        )
        return { ...emailResult, incident: incidentToSave }
      } catch (err) {
        console.error('[EcoSentry] Unexpected error during immediate email dispatch:', err)
        return { success: false, reason: 'exception', error: err, incident: incidentToSave }
      }
    }

    // 3. AFTER BASE STATION RECEIVES PACKET or DISABLED:
    // Email is NOT sent at incident creation! It is sent ONLY after the packet reaches BASE.
    return {
      success: true,
      pending: emailNotificationMode === EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION,
      mode: emailNotificationMode,
      incident: incidentToSave
    }
  }

  const handleEditIncident = (updatedIncident) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedIncident.id ? { ...e, ...updatedIncident } : e))
    )
    if (selectedItem?.data?.id === updatedIncident.id) {
      setSelectedItem({
        itemType: 'event',
        data: { ...selectedItem.data, ...updatedIncident }
      })
    }
  }

  const handleRepositionIncident = (eventId, newCoords) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e
        return {
          ...e,
          zoneId: newCoords.zoneId,
          zoneName: newCoords.zoneName,
          coordinates: {
            ...e.coordinates,
            x: newCoords.x,
            y: newCoords.y,
            simulatedLat: newCoords.simulatedLat,
            simulatedLng: newCoords.simulatedLng
          }
        }
      })
    )
    if (selectedItem?.data?.id === eventId) {
      setSelectedItem((prev) => {
        if (!prev) return null
        return {
          ...prev,
          data: {
            ...prev.data,
            zoneId: newCoords.zoneId,
            zoneName: newCoords.zoneName,
            coordinates: {
              ...prev.data.coordinates,
              x: newCoords.x,
              y: newCoords.y,
              simulatedLat: newCoords.simulatedLat,
              simulatedLng: newCoords.simulatedLng
            }
          }
        }
      })
    }
  }

  const handleDeleteIncident = (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    if (selectedItem?.data?.id === eventId) {
      setSelectedItem(null)
    }
  }

  const handleAddCustomToolboxItem = (item) => {
    setCustomToolboxItems((prev) => [item, ...prev])
  }

  const handleDeleteCustomToolboxItem = (itemId) => {
    setCustomToolboxItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const handleStartRepositionFromModal = (eventData) => {
    if (activeNav !== 'overview' && activeNav !== 'map') {
      setActiveNav('overview')
    }
    setRepositionTarget(eventData)
  }

  // Export summary action (downloads reserve operations audit JSON)
  const handleExportSummary = () => {
    const summaryData = {
      platform: 'EcoSentry Wildlife Intelligence',
      exportTimestamp: new Date().toISOString(),
      operationalStats: stats,
      activeIncidents: events.filter((e) => e.status === 'active'),
      sensorsSummary: sensors.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        battery: s.battery,
        zone: s.zoneName
      }))
    }
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ecosentry-operations-summary-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`dashboard-container ${activeNav === 'tactical' ? 'tactical-mode-active' : ''}`}>
      {/* 1. ENTERPRISE SIDEBAR NAVIGATION (Hidden in Tactical Mode for full-screen immersion) */}
      {activeNav !== 'tactical' && (
        <Sidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          stats={stats}
        />
      )}

      <div className={`main-wrapper ${activeNav === 'tactical' ? 'tactical-wrapper-active' : ''}`}>
        {/* 2. MINIMAL TOP HEADER */}
        <TopNav
          activeNav={activeNav}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          zones={SIMULATED_ZONES}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSimulateIncident={handleSimulateIncident}
          stats={stats}
          onOpenNotifications={() => setActiveNav('threats')}
          onNavigateToOverview={() => setActiveNav('overview')}
        />

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className={`content-body ${activeNav === 'tactical' ? 'content-body-tactical' : ''}`}>
          {/* TAB: OVERVIEW (Default Security Command Center) */}
          {activeNav === 'overview' && (
            <>
              {/* 1. Page Introduction Header */}
              <div className="overview-page-intro">
                <div className="intro-text-column">
                  <span className="intro-eyebrow">CIVIC TERRAIN / RESERVE OPERATIONS</span>
                  <h1 className="intro-heading">A clearer view of the reserve.</h1>
                  <p className="intro-description">
                    Reserve-wide visibility. Prioritize, verify and coordinate a response across all 4 sectors.
                  </p>
                </div>
                <div className="intro-actions-column">
                  <button
                    className="btn-export-summary"
                    onClick={handleExportSummary}
                    title="Export reserve operations audit report as JSON"
                  >
                    <Download size={14} />
                    <span>Export Summary</span>
                  </button>
                </div>
              </div>

              {/* 2. Simulation & Verification Amber Notice Banner */}
              <div className="demo-alert-banner">
                <AlertTriangle size={15} className="demo-banner-icon" />
                <div className="demo-banner-text">
                  <strong>DEMO / SIMULATED DATA</strong> — Acoustic and optical matches are unverified, not proof of poaching. Ground-ranger verification is required before operational dispatch.
                </div>
              </div>

              {/* 3. Row of 5 Compact Overview KPI Cards */}
              <OverviewCards
                stats={stats}
                onSelectCardTab={(tab) => setActiveNav(tab)}
              />

              {/* 4. Upper Workspace: 3D Forest Surveillance (~2/3) & Incident Response (~1/3) */}
              <div className="overview-middle-layout">
                <ForestMapContainer
                  zones={SIMULATED_ZONES}
                  trails={ANIMAL_TRAILS}
                  sensors={sensors}
                  events={events}
                  selectedZone={selectedZone}
                  setSelectedZone={setSelectedZone}
                  selectedItem={selectedItem}
                  onSelectMarker={handleSelectMarker}
                  onAddIncident={handleAddIncident}
                  onRepositionIncident={handleRepositionIncident}
                  customToolboxItems={customToolboxItems}
                  onAddCustomToolboxItem={handleAddCustomToolboxItem}
                  onDeleteCustomToolboxItem={handleDeleteCustomToolboxItem}
                  focusTarget={focusTarget}
                  repositionTarget={repositionTarget}
                  onClearRepositionTarget={() => setRepositionTarget(null)}
                  onNavigateToTactical={() => setActiveNav('tactical')}
                  emailNotificationMode={emailNotificationMode}
                />

                <ThreatAlertsPanel
                  events={events}
                  zones={SIMULATED_ZONES}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onInspectEvent={handleInspectEvent}
                  onViewOnMap={handleViewOnMap}
                />
              </div>

              {/* 5. Lower Workspace: Sensor Network Health & Wildlife Sightings Table */}
              <div className="overview-lower-layout">
                <SensorHealthPanel
                  stats={stats}
                  sensors={sensors}
                  onNavigateToSensors={() => setActiveNav('sensors')}
                  onToggleSensor={handleToggleSensor}
                />

                <WildlifeSummaryTable
                  events={events}
                  zones={SIMULATED_ZONES}
                  onNavigateToWildlife={() => setActiveNav('wildlife')}
                  onInspectEvent={handleInspectEvent}
                />
              </div>

              {/* 6. Restrained Enterprise Footer Disclaimer */}
              <footer className="overview-footer-disclaimer">
                <span>EcoSentry Wildlife Intelligence Platform • Simulated telemetry & acoustic classifications for academic demonstration.</span>
                <span className="footer-coords">Simulated Datum: WGS84 • 12.450°N, 76.140°E</span>
              </footer>
            </>
          )}

          {/* TAB: 3D FOREST MAP (Expanded View) */}
          {activeNav === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
              <ForestMapContainer
                zones={SIMULATED_ZONES}
                trails={ANIMAL_TRAILS}
                sensors={sensors}
                events={events}
                selectedZone={selectedZone}
                setSelectedZone={setSelectedZone}
                selectedItem={selectedItem}
                onSelectMarker={handleSelectMarker}
                isDedicatedPage={true}
                onAddIncident={handleAddIncident}
                onRepositionIncident={handleRepositionIncident}
                customToolboxItems={customToolboxItems}
                onAddCustomToolboxItem={handleAddCustomToolboxItem}
                onDeleteCustomToolboxItem={handleDeleteCustomToolboxItem}
                focusTarget={focusTarget}
                repositionTarget={repositionTarget}
                onClearRepositionTarget={() => setRepositionTarget(null)}
                onNavigateToTactical={() => setActiveNav('tactical')}
                emailNotificationMode={emailNotificationMode}
              />
            </div>
          )}

          {/* TAB: TACTICAL ROUTING & MESH NETWORK MAP */}
          {activeNav === 'tactical' && (
            <div className="tactical-fullscreen-wrapper">
              <TacticalRoutingView
                sensors={meshSensors}
                setSensors={setMeshSensors}
                baseStation={baseStation}
                setBaseStation={setBaseStation}
                packets={packets}
                setPackets={setPackets}
                emailNotificationMode={emailNotificationMode}
                onChangeEmailMode={setEmailNotificationMode}
                events={events}
                customToolboxItems={customToolboxItems}
                onAddCustomToolboxItem={handleAddCustomToolboxItem}
                onDeleteCustomToolboxItem={handleDeleteCustomToolboxItem}
                onAddIncident={handleAddIncident}
                onPacketDelivered={handlePacketDeliveredAtBase}
                onSwitchToForestMap={() => setActiveNav('map')}
                onNavigateToOverview={() => setActiveNav('overview')}
              />
            </div>
          )}

          {/* TAB: THREAT ALERTS */}
          {activeNav === 'threats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <OverviewCards
                stats={stats}
                onSelectCardTab={(tab) => setActiveNav(tab)}
              />
              <ThreatAlertsPanel
                events={events}
                zones={SIMULATED_ZONES}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onInspectEvent={handleInspectEvent}
                onViewOnMap={handleViewOnMap}
              />
            </div>
          )}

          {/* TAB: INCIDENT HISTORY */}
          {activeNav === 'history' && (
            <IncidentHistoryTable
              events={events}
              zones={SIMULATED_ZONES}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              onInspectEvent={handleInspectEvent}
            />
          )}

          {/* TAB: SENSOR MANAGEMENT */}
          {activeNav === 'sensors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <OverviewCards
                stats={stats}
                onSelectCardTab={(tab) => setActiveNav(tab)}
              />
              <SensorManagementView
                sensors={sensors}
                zones={SIMULATED_ZONES}
                onToggleSensor={handleToggleSensor}
                onInspectSensor={handleInspectSensor}
              />
            </div>
          )}

          {/* TAB: WILDLIFE DETECTIONS */}
          {activeNav === 'wildlife' && (
            <WildlifeDetectionsView
              events={events}
              zones={SIMULATED_ZONES}
              onInspectEvent={handleInspectEvent}
              onViewOnMap={handleViewOnMap}
            />
          )}

          {/* TAB: OPERATIONS ANALYTICS */}
          {activeNav === 'analytics' && (
            <AnalyticsView
              stats={stats}
              events={events}
              sensors={sensors}
              zones={SIMULATED_ZONES}
            />
          )}

          {/* TAB: SETTINGS & CALIBRATION */}
          {activeNav === 'settings' && (
            <SettingsView
              emailNotificationMode={emailNotificationMode}
              setEmailNotificationMode={setEmailNotificationMode}
            />
          )}
        </main>
      </div>

      {/* CLICKED MARKER & SENSOR SPEC DETAIL MODAL */}
      <MarkerDetailModal
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onToggleSensor={handleToggleSensor}
        onRepositionEvent={handleStartRepositionFromModal}
        onEditEvent={handleEditIncident}
        onDeleteEvent={handleDeleteIncident}
      />

      {/* BASE STATION PACKET RECEIPT & EMAIL SENT NOTIFICATION TOAST */}
      {baseDeliveryToast && (
        <div className="base-delivery-alert-toast" role="alert">
          <div className="toast-pulse-cyan" />
          <div className="toast-content-col">
            <span className="toast-title-bold">{baseDeliveryToast.title}</span>
            <span className="toast-sub-msg">{baseDeliveryToast.message}</span>
          </div>
          <button
            className="toast-close-x"
            onClick={() => setBaseDeliveryToast(null)}
            aria-label="Dismiss toast"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
