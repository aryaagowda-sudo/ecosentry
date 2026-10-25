import React from 'react'
import {
  MapPin,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Bell,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'

const NAV_BREADCRUMBS = {
  overview: { section: 'Forest surveillance', label: 'Operations overview' },
  map: { section: 'Forest surveillance', label: '3D Forest Reserve' },
  threats: { section: 'Surveillance operations', label: 'Threat & anomaly alerts' },
  history: { section: 'Audit records', label: 'Incident history log' },
  sensors: { section: 'Hardware network', label: 'Sensor grid management' },
  wildlife: { section: 'Biodiversity monitoring', label: 'Wildlife sightings' },
  analytics: { section: 'Intelligence reporting', label: 'Operations analytics' },
  settings: { section: 'System parameters', label: 'Surveillance calibration' }
}

export default function TopNav({
  activeNav = 'overview',
  selectedZone,
  setSelectedZone,
  zones,
  searchQuery,
  setSearchQuery,
  onSimulateIncident,
  stats,
  onOpenNotifications
}) {
  const activeThreats = stats?.incidents?.active || 0
  const offlineSensors = stats?.connectivity?.offline || 0
  const breadcrumb = NAV_BREADCRUMBS[activeNav] || { section: 'Forest surveillance', label: 'Operations overview' }

  return (
    <header className="top-navbar">
      <div className="header-left">
        {/* Breadcrumb Trail */}
        <div className="breadcrumb-trail">
          <span className="breadcrumb-section">{breadcrumb.section}</span>
          <ChevronRight size={13} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{breadcrumb.label}</span>
        </div>

        {/* Demo Workspace Pill */}
        <div className="demo-workspace-badge">
          <span className="demo-dot" />
          <span>DEMO WORKSPACE</span>
        </div>

        {/* Sync Status Timestamp */}
        <div className="sync-status-indicator" title="Telemetry synchronization active">
          <span className="sync-pulse-dot" />
          <span>Synced just now</span>
        </div>
      </div>

      <div className="header-right">
        {/* Forest Zone Filter Pill */}
        <div className="zone-selector-pill">
          <MapPin size={12} style={{ color: 'var(--accent-green)' }} />
          <select
            className="zone-select-control"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            title="Filter operations by forest sector"
          >
            <option value="all">All 4 Sectors</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name.split(':')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Precision Search Field */}
        <div className="header-search">
          <Search size={13} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search sensors, IDs, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="header-search-kbd">⌘K</span>
        </div>

        {/* Environmental Telemetry Chip */}
        <div className="telemetry-chip" title="Simulated Atmospheric Telemetry">
          <div className="telemetry-metric">
            <Thermometer size={12} style={{ color: 'var(--accent-green)' }} />
            <span>26.8°C</span>
          </div>
          <span className="telemetry-sep">•</span>
          <div className="telemetry-metric">
            <Droplets size={12} style={{ color: 'var(--accent-teal)' }} />
            <span>81%</span>
          </div>
          <span className="telemetry-sep">•</span>
          <div className="telemetry-metric">
            <Wind size={12} style={{ color: 'var(--text-secondary)' }} />
            <span>9 km/h</span>
          </div>
        </div>

        {/* Threat Alert Notification Bell */}
        <button
          className="header-btn"
          title={`Active Incidents: ${activeThreats} | Offline Sensors: ${offlineSensors}`}
          onClick={onOpenNotifications}
        >
          <Bell size={15} />
          {activeThreats > 0 && <span className="notification-unread-dot" />}
        </button>

        {/* Simulate Incident Button */}
        <button
          className="btn-simulate-event"
          onClick={onSimulateIncident}
          title="Simulate AI detection / boundary anomaly for demonstration"
        >
          <Sparkles size={13} />
          <span>Simulate Event</span>
        </button>
      </div>
    </header>
  )
}
