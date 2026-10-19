import React from 'react'
import {
  MapPin,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Bell,
  Sparkles,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react'

export default function TopNav({
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

  return (
    <header className="top-navbar">
      <div className="top-nav-left">
        {/* Zone Selector and Live Beacon */}
        <div className="zone-badge-container">
          <div className="zone-selector-wrapper">
            <MapPin size={16} color="#10b981" />
            <select
              className="zone-select-dropdown"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
            >
              <option value="all">All 4 Simulated Forest Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="live-beacon">
            <div className="pulse-dot"></div>
            <span>SIMULATED DEMO • AI THREAT SENTINEL</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search event, sensor ID, species, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-shortcut">Filter</span>
        </div>
      </div>

      <div className="top-nav-right">
        {/* Environmental conditions */}
        <div className="weather-widget">
          <div className="weather-item" title="Simulated Ambient Temperature">
            <Thermometer size={14} color="#10b981" />
            <span className="val">26.8°C</span>
          </div>
          <div className="weather-item" title="Canopy Humidity">
            <Droplets size={14} color="#06b6d4" />
            <span className="val">81% Hum</span>
          </div>
          <div className="weather-item" title="Wind Velocity">
            <Wind size={14} color="#94a39b" />
            <span className="val">9 km/h</span>
          </div>
        </div>

        {/* Threat Alert Notification Bell */}
        <button
          className="btn-icon-nav"
          title={`Active Threats: ${activeThreats} | Sensor Failures: ${offlineSensors}`}
          onClick={onOpenNotifications}
        >
          <Bell size={18} />
          {activeThreats > 0 && <span className="nav-unread-dot"></span>}
        </button>

        {/* College Project Demo Action: Simulate New Incident */}
        <button
          className="btn-emergency-action"
          onClick={onSimulateIncident}
          title="Click to simulate an AI threat detection or boundary crossing during demonstration"
        >
          <Sparkles size={15} />
          <span>Simulate Incident</span>
        </button>
      </div>
    </header>
  )
}
