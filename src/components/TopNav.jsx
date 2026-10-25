import React from 'react'
import {
  MapPin,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Bell,
  Sparkles,
  ChevronRight
} from 'lucide-react'

const NAV_BREADCRUMBS = {
  overview: { section: 'Operations', label: 'Surveillance Overview' },
  map: { section: 'Operations', label: '3D Forest Surveillance' },
  threats: { section: 'Operations', label: 'Threat & Anomaly Alerts' },
  history: { section: 'Operations', label: 'Incident History Log' },
  sensors: { section: 'Monitoring', label: 'Sensor Grid Management' },
  wildlife: { section: 'Monitoring', label: 'Wildlife Sightings & Tracking' },
  analytics: { section: 'Monitoring', label: 'Operations Analytics' },
  settings: { section: 'System', label: 'Surveillance Calibration' }
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
  const breadcrumb = NAV_BREADCRUMBS[activeNav] || { section: 'Operations', label: 'Overview' }

  return (
    <header className="top-navbar">
      <div className="header-left">
        {/* Breadcrumb Trail */}
        <div className="breadcrumb-trail">
          <span className="breadcrumb-section">{breadcrumb.section}</span>
          <ChevronRight size={12} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{breadcrumb.label}</span>
        </div>

        {/* Forest Zone Filter Pill */}
        <div className="zone-selector-pill">
          <MapPin size={12} style={{ color: 'var(--accent-green)' }} />
          <select
            className="zone-select-control"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            title="Filter operations by forest sector"
          >
            <option value="all">All 4 Forest Sectors</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="header-right">
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
          <span className="header-search-kbd">Ctrl+K</span>
        </div>

        {/* Environmental Telemetry Chip */}
        <div className="telemetry-chip" title="Simulated Atmospheric Telemetry">
          <div className="telemetry-metric">
            <Thermometer size={12} style={{ color: 'var(--accent-green)' }} />
            <span>26.8°C</span>
          </div>
          <span style={{ color: 'var(--border-standard)' }}>•</span>
          <div className="telemetry-metric">
            <Droplets size={12} style={{ color: 'var(--accent-teal)' }} />
            <span>81%</span>
          </div>
          <span style={{ color: 'var(--border-standard)' }}>•</span>
          <div className="telemetry-metric">
            <Wind size={12} style={{ color: 'var(--text-muted)' }} />
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
          {activeThreats > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-red)'
              }}
            />
          )}
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
