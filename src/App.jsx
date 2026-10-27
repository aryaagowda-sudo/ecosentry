import React, { useState, useMemo, useEffect } from 'react'
import { Download, AlertTriangle, ShieldCheck } from 'lucide-react'
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
import { sendIncidentEmailNotification } from './services/emailService'

import './App.css'

export default function App() {
  // Centralized Application State
  const [sensors, setSensors] = useState(INITIAL_SENSORS)
  
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

  // Incident Placement Handlers (Drag-and-Drop system)
  const handleAddIncident = async (newIncident) => {
    // 1. Immediately append to state to update UI, map markers, alerts, and trigger localStorage persistence
    setEvents((prev) => [newIncident, ...prev])

    // 2. Dispatch automated EmailJS notification alert to configured operations address
    try {
      const emailResult = await sendIncidentEmailNotification(newIncident)
      return emailResult
    } catch (err) {
      console.error('[EcoSentry] Unexpected error during incident email dispatch:', err)
      return { success: false, reason: 'exception', error: err }
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
    <div className="dashboard-container">
      {/* 1. ENTERPRISE SIDEBAR NAVIGATION */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        stats={stats}
      />

      <div className="main-wrapper">
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
        />

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className="content-body">
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
            <SettingsView />
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
    </div>
  )
}
