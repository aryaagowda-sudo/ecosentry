import React, { useState } from 'react'
import {
  Activity,
  Download,
  Search,
  Filter,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Flame,
  User,
  Footprints,
  Eye,
  Sliders
} from 'lucide-react'

export default function IncidentHistoryTable({
  events,
  zones,
  searchQuery,
  setSearchQuery,
  onAcknowledge,
  onResolve,
  onInspectEvent
}) {
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all', 'threat', 'wildlife', 'system'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'acknowledged', 'resolved'
  const [zoneFilter, setZoneFilter] = useState('all')

  // Multi-field search and filter logic
  const filteredEvents = events.filter((evt) => {
    // Category filter
    if (categoryFilter !== 'all' && evt.category !== categoryFilter) return false

    // Status filter
    if (statusFilter !== 'all' && evt.status !== statusFilter) return false

    // Zone filter
    if (zoneFilter !== 'all' && evt.zoneId !== zoneFilter) return false

    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchId = evt.id.toLowerCase().includes(q)
      const matchTitle = evt.title.toLowerCase().includes(q)
      const matchDesc = evt.description.toLowerCase().includes(q)
      const matchSensor = evt.sensorId.toLowerCase().includes(q)
      const matchZone = evt.zoneName.toLowerCase().includes(q)
      if (!matchId && !matchTitle && !matchDesc && !matchSensor && !matchZone) return false
    }

    return true
  })

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Event ID', 'Timestamp', 'Type', 'Category', 'Zone', 'Sensor ID', 'Confidence', 'Priority', 'Status']
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      `"${e.title}"`,
      e.category,
      `"${e.zoneName}"`,
      e.sensorId,
      e.confidence !== null ? `${Math.round(e.confidence * 100)}%` : 'N/A',
      e.priority,
      e.status
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ecosentry_incident_history_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'chainsaw_sound':
        return <Volume2 size={14} color="#ef4444" />
      case 'gunshot_sound':
        return <Flame size={14} color="#ef4444" />
      case 'human_detection':
        return <User size={14} color="#f59e0b" />
      case 'animal_boundary_crossing':
        return <Footprints size={14} color="#a855f7" />
      case 'wildlife_sighting':
        return <Activity size={14} color="#10b981" />
      default:
        return <AlertTriangle size={14} color="#94a39b" />
    }
  }

  return (
    <section className="recent-events-container">
      {/* Table Top Controls Bar */}
      <div className="events-table-header">
        <div className="events-header-left">
          <h2>
            <Activity size={18} color="#10b981" />
            <span>Recorded Incident & Event History</span>
          </h2>
          <span className="events-count-badge">
            {filteredEvents.length} of {events.length} Events
          </span>
        </div>

        <div className="events-table-controls">
          {/* Category Filter */}
          <select
            className="filter-select compact"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="threat">Threats Only</option>
            <option value="wildlife">Wildlife Detections</option>
            <option value="system">Hardware Failures</option>
          </select>

          {/* Status Filter */}
          <select
            className="filter-select compact"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Zone Filter */}
          <select
            className="filter-select compact"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="table-search-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search history..."
              className="events-filter-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Export CSV */}
          <button className="btn-table-action" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive">
        <table className="events-table">
          <thead>
            <tr>
              <th>Event ID & Time</th>
              <th>Classification & Type</th>
              <th>Zone / Sector</th>
              <th>Sensor Node</th>
              <th>Confidence</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a39b' }}>
                  No incident records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id}>
                  <td>
                    <span className="event-id-cell">{evt.id}</span>
                    <span className="event-time-sub">{evt.timestamp}</span>
                  </td>
                  <td>
                    <div className="event-type-badge">
                      {getEventIcon(evt.type)}
                      <span>{evt.title}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', color: '#e2e8f0' }}>{evt.zoneName}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#38bdf8' }}>
                      {evt.sensorId}
                    </span>
                  </td>
                  <td>
                    {evt.confidence !== null ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#10b981' }}>
                        {Math.round(evt.confidence * 100)}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a39b' }}>Telemetry</span>
                    )}
                  </td>
                  <td>
                    <span className={`threat-severity-badge ${evt.priority}`}>
                      {evt.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${evt.status}`}>
                      {evt.status === 'active' && <AlertTriangle size={12} />}
                      {evt.status === 'acknowledged' && <CheckCircle size={12} />}
                      {evt.status === 'resolved' && <CheckCircle2 size={12} />}
                      {evt.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {evt.status === 'active' && (
                        <button
                          className="btn-status-action ack"
                          onClick={() => onAcknowledge(evt.id)}
                          title="Acknowledge alert"
                        >
                          Acknowledge
                        </button>
                      )}
                      {evt.status === 'acknowledged' && (
                        <button
                          className="btn-status-action resolve"
                          onClick={() => onResolve(evt.id)}
                          title="Mark resolved"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        className="btn-inspect"
                        onClick={() => onInspectEvent(evt)}
                        title="View complete event metadata"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
