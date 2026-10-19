import React, { useState } from 'react'
import {
  ShieldAlert,
  Volume2,
  Flame,
  User,
  Footprints,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle,
  CheckCircle2,
  Info,
  Compass
} from 'lucide-react'

export default function ThreatAlertsPanel({
  events,
  zones,
  onAcknowledge,
  onResolve,
  onInspectEvent,
  onViewOnMap
}) {
  // Filter States
  const [typeFilter, setTypeFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Apply Multi-Criteria Filters
  const filteredAlerts = events.filter((evt) => {
    // Exclude purely benign wildlife sightings from the threat panel
    if (evt.category === 'wildlife') return false

    // Filter by Event Type
    if (typeFilter !== 'all' && evt.type !== typeFilter) return false

    // Filter by Zone
    if (zoneFilter !== 'all' && evt.zoneId !== zoneFilter) return false

    // Filter by Priority
    if (priorityFilter !== 'all' && evt.priority !== priorityFilter) return false

    // Filter by Status
    if (statusFilter !== 'all' && evt.status !== statusFilter) return false

    return true
  })

  // Render appropriate category icon
  const getEventIcon = (type) => {
    switch (type) {
      case 'chainsaw_sound':
        return <Volume2 size={16} color="#ef4444" />
      case 'gunshot_sound':
        return <Flame size={16} color="#ef4444" />
      case 'human_detection':
        return <User size={16} color="#f59e0b" />
      case 'animal_boundary_crossing':
        return <Footprints size={16} color="#a855f7" />
      case 'sensor_failure':
        return <AlertTriangle size={16} color="#94a39b" />
      default:
        return <ShieldAlert size={16} color="#ef4444" />
    }
  }

  return (
    <div className="threat-panel-container">
      {/* Header */}
      <div className="threat-panel-header">
        <div className="threat-header-title">
          <ShieldAlert size={18} color="#ef4444" />
          <h2>Threat & Anomaly Alerts</h2>
        </div>
        <span className="threat-count-pill">{filteredAlerts.length} Matching</span>
      </div>

      {/* Demonstration & Scientific Disclaimer Banner */}
      <div className="panel-disclaimer-banner">
        <Info size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
        <span>
          <strong>Simulated Event Notice:</strong> Classifications indicate acoustic/optical model pattern similarities. A sound classification does not prove poaching. Ground ranger verification is required.
        </span>
      </div>

      {/* Comprehensive Multi-Filter Bar */}
      <div className="threat-filters-bar">
        {/* Type Filter */}
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Threat Types</option>
          <option value="chainsaw_sound">Chainsaw-like Sounds</option>
          <option value="gunshot_sound">Gunshot-like Sounds</option>
          <option value="human_detection">Human Detections</option>
          <option value="animal_boundary_crossing">Animal Boundary Crossings</option>
          <option value="sensor_failure">Sensor Failures</option>
        </select>

        {/* Zone Filter */}
        <select
          className="filter-select"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="all">All Zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alert List */}
      <div className="threat-list-scroll">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state-card">
            <CheckCircle2 size={32} color="#10b981" />
            <p>No threat alerts matching selected filters.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`threat-card ${alert.priority} ${alert.status}`}
            >
              <div className="threat-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getEventIcon(alert.type)}
                  <span className={`threat-severity-badge ${alert.priority}`}>
                    {alert.priority}
                  </span>
                  <span className={`status-pill ${alert.status}`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <span className="threat-time">
                  <Clock size={12} />
                  {alert.timeAgo}
                </span>
              </div>

              <div className="threat-title">{alert.title}</div>
              <div className="threat-description-text">{alert.description}</div>

              {/* Source & Coordinates Row */}
              <div className="threat-meta-row">
                <div className="threat-location">
                  <MapPin size={12} />
                  <span>
                    {alert.zoneName} ({alert.sensorId})
                  </span>
                </div>
                {alert.confidence !== null && (
                  <span className="threat-confidence">
                    {Math.round(alert.confidence * 100)}% Confidence
                  </span>
                )}
                {alert.confidence === null && (
                  <span className="threat-confidence" style={{ color: '#94a39b' }}>
                    Hardware Telemetry
                  </span>
                )}
              </div>

              {/* Source Sensor Spec */}
              {alert.source && (
                <div style={{ fontSize: '11px', color: '#64746b', fontFamily: 'var(--font-mono)' }}>
                  Source: {alert.source}
                </div>
              )}

              {/* Alert Actions: Acknowledge, Resolve, View in 3D Forest */}
              <div className="threat-actions-row">
                {alert.status === 'active' && (
                  <button
                    className="threat-btn primary"
                    onClick={() => onAcknowledge(alert.id)}
                    title="Acknowledge alert and update state"
                  >
                    <CheckCircle size={13} />
                    <span>Acknowledge</span>
                  </button>
                )}

                {alert.status === 'acknowledged' && (
                  <button
                    className="threat-btn success"
                    onClick={() => onResolve(alert.id)}
                    title="Mark event investigated and resolved"
                  >
                    <CheckCircle2 size={13} />
                    <span>Mark Resolved</span>
                  </button>
                )}

                {alert.status === 'resolved' && (
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Resolved
                  </span>
                )}

                {/* View Location in 3D Forest Map */}
                <button
                  className="threat-btn secondary"
                  onClick={() => onViewOnMap ? onViewOnMap(alert) : onInspectEvent(alert)}
                  title="View this event location in the 3D Forest Reserve"
                >
                  <Compass size={12} color="#10b981" />
                  <span>View in 3D</span>
                </button>

                <button
                  className="threat-btn secondary"
                  onClick={() => onInspectEvent(alert)}
                >
                  Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
