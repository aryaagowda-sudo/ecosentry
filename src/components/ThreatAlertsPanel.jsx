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
  Compass,
  SlidersHorizontal
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
    // Keep the response queue focused on incidents; hardware telemetry is surfaced in Sensor Health.
    if (evt.category !== 'threat' && !evt.isManual) return false

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

  // Render category icon
  const getEventIcon = (type, priority) => {
    const iconColor =
      priority === 'critical'
        ? 'var(--accent-red)'
        : priority === 'high'
        ? 'var(--accent-amber)'
        : priority === 'medium'
        ? 'var(--accent-blue)'
        : 'var(--accent-green)'

    switch (type) {
      case 'chainsaw_sound':
        return <Volume2 size={14} style={{ color: iconColor }} />
      case 'gunshot_sound':
        return <Flame size={14} style={{ color: iconColor }} />
      case 'human_detection':
        return <User size={14} style={{ color: iconColor }} />
      case 'animal_boundary_crossing':
        return <Footprints size={14} style={{ color: 'var(--accent-purple)' }} />
      case 'sensor_failure':
        return <AlertTriangle size={14} style={{ color: 'var(--text-muted)' }} />
      default:
        return <ShieldAlert size={14} style={{ color: iconColor }} />
    }
  }

  return (
    <div className="threat-panel-card">
      {/* Header */}
      <div className="threat-panel-header">
        <div>
          <div className="threat-title-group">
            <ShieldAlert size={16} style={{ color: 'var(--accent-red)' }} />
            <h3 className="threat-panel-title">Incident response</h3>
          </div>
          <p className="threat-panel-subtitle">Prioritized for officer review</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="kpi-badge critical"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {filteredAlerts.filter(a => a.status === 'active').length} Active
          </span>
          <span
            className="kpi-badge neutral"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {filteredAlerts.length} Total
          </span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="threat-filter-controls">
        <select
          className="control-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          title="Filter by threat event classification"
        >
          <option value="all">All Classifications</option>
          <option value="chainsaw_sound">Chainsaw Audio</option>
          <option value="gunshot_sound">Gunshot Audio</option>
          <option value="human_detection">Human Detection</option>
          <option value="animal_boundary_crossing">Boundary Breach</option>
          <option value="sensor_failure">Sensor Telemetry Fail</option>
        </select>

        <select
          className="control-select"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          title="Filter by forest sector"
        >
          <option value="all">All Sectors</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>

        <select
          className="control-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          title="Filter by priority tier"
        >
          <option value="all">All Tiers</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="control-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          title="Filter by investigation status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alert Stream */}
      <div className="threat-items-stream">
        {filteredAlerts.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={24} style={{ color: 'var(--accent-green)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>No threat events matching filter criteria</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>All sensor sectors operating nominally</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-item-card ${alert.priority} ${alert.status}`}
            >
              <div className="alert-top-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {alert.icon ? (
                    <span style={{ fontSize: '13px', lineHeight: 1 }}>{alert.icon}</span>
                  ) : (
                    getEventIcon(alert.type, alert.priority)
                  )}
                  <span className="code-id-cell">{alert.id}</span>
                  <span className={`status-tag ${alert.priority}`}>
                    {alert.priority}
                  </span>
                  <span className={`status-tag ${alert.status}`}>
                    {alert.status}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10.5px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <Clock size={11} />
                  <span>{alert.timeAgo}</span>
                </div>
              </div>

              <div className="alert-classification-title">{alert.title}</div>
              <div className="alert-description-copy">{alert.description}</div>

              <div className="alert-details-row">
                <div className="alert-location-tag">
                  <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
                  <span>
                    {alert.zoneName} • {alert.sensorId || alert.source || 'Manual Report'}
                  </span>
                </div>
                {alert.confidence !== null ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10.5px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {Math.round(alert.confidence * 100)}% Match
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    Hardware Telemetry
                  </span>
                )}
              </div>

              {/* Actions Toolbar */}
              <div className="alert-actions-toolbar">
                {alert.status === 'active' && (
                  <button
                    className="btn-action-sm primary-ack"
                    onClick={() => onAcknowledge(alert.id)}
                    title="Acknowledge alert and take ownership"
                  >
                    <CheckCircle size={11} />
                    <span>Acknowledge</span>
                  </button>
                )}

                {alert.status === 'acknowledged' && (
                  <button
                    className="btn-action-sm primary-resolve"
                    onClick={() => onResolve(alert.id)}
                    title="Mark event investigated and resolved"
                  >
                    <CheckCircle2 size={11} />
                    <span>Resolve</span>
                  </button>
                )}

                {alert.status === 'resolved' && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    <CheckCircle2 size={11} /> Resolved
                  </span>
                )}

                {/* View Location in 3D */}
                <button
                  className="btn-action-sm"
                  onClick={() => (onViewOnMap ? onViewOnMap(alert) : onInspectEvent(alert))}
                  title="Center and highlight in 3D Forest Reserve"
                >
                  <Compass size={11} style={{ color: 'var(--accent-teal)' }} />
                  <span>Locate in 3D</span>
                </button>

                <button
                  className="btn-action-sm"
                  onClick={() => onInspectEvent(alert)}
                  title="View full event parameters"
                >
                  Inspect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="threat-panel-footer-advisory">
        <Info size={12} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
        <span>Ground-ranger verification required prior to tactical unit dispatch.</span>
      </div>
    </div>
  )
}
