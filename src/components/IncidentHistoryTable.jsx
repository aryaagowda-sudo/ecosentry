import React, { useState } from 'react'
import {
  FileText,
  Download,
  Search,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Flame,
  User,
  Footprints,
  Activity
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
      const matchId = evt.id?.toLowerCase().includes(q)
      const matchTitle = evt.title?.toLowerCase().includes(q)
      const matchDesc = evt.description?.toLowerCase().includes(q)
      const matchSensor = evt.sensorId?.toLowerCase().includes(q)
      const matchZone = evt.zoneName?.toLowerCase().includes(q)
      if (!matchId && !matchTitle && !matchDesc && !matchSensor && !matchZone) return false
    }

    return true
  })

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Event ID',
      'Timestamp',
      'Title',
      'Category',
      'Zone',
      'Sensor ID',
      'Confidence',
      'Priority',
      'Status'
    ]
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
    link.setAttribute('download', `ecosentry_incidents_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'chainsaw_sound':
        return <Volume2 size={13} style={{ color: 'var(--accent-red)' }} />
      case 'gunshot_sound':
        return <Flame size={13} style={{ color: 'var(--accent-red)' }} />
      case 'human_detection':
        return <User size={13} style={{ color: 'var(--accent-amber)' }} />
      case 'animal_boundary_crossing':
        return <Footprints size={13} style={{ color: 'var(--accent-purple)' }} />
      case 'wildlife_sighting':
        return <Activity size={13} style={{ color: 'var(--accent-green)' }} />
      default:
        return <AlertTriangle size={13} style={{ color: 'var(--text-muted)' }} />
    }
  }

  return (
    <div className="data-panel-card">
      {/* Top Toolbar */}
      <div className="data-panel-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 className="data-panel-title">
            <FileText size={16} style={{ color: 'var(--accent-teal)' }} />
            <span>Incident & Event Telemetry Log</span>
          </h3>
          <span className="kpi-badge neutral" style={{ fontFamily: 'var(--font-mono)' }}>
            {filteredEvents.length} / {events.length} Records
          </span>
        </div>

        <div className="table-controls-cluster">
          {/* Category Filter */}
          <select
            className="control-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            title="Filter by event category"
          >
            <option value="all">All Categories</option>
            <option value="threat">Threat Classifications</option>
            <option value="wildlife">Wildlife Sightings</option>
            <option value="system">Hardware Failures</option>
          </select>

          {/* Status Filter */}
          <select
            className="control-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Zone Filter */}
          <select
            className="control-select"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            title="Filter by zone"
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </select>

          {/* Inline Table Search */}
          <div className="table-search-box">
            <Search size={12} className="icon" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Export to CSV */}
          <button
            className="btn-export-csv"
            onClick={handleExportCSV}
            title="Export filtered records to standard CSV"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="table-wrapper-responsive">
        <table className="standard-data-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Timestamp</th>
              <th>Classification & Title</th>
              <th>Category</th>
              <th>Sector Zone</th>
              <th>Sensor Node</th>
              <th>AI Confidence</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    No events match the selected filter criteria.
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr key={evt.id}>
                  <td>
                    <span className="code-id-cell">{evt.id}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {evt.timestamp}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getEventIcon(evt.type)}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {evt.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontSize: '10px',
                        fontWeight: 700,
                        color:
                          evt.category === 'threat'
                            ? 'var(--accent-red)'
                            : evt.category === 'wildlife'
                            ? 'var(--accent-purple)'
                            : 'var(--text-muted)'
                      }}
                    >
                      {evt.category}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{evt.zoneName}</td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-teal)',
                        fontSize: '11px'
                      }}
                    >
                      {evt.sensorId}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {evt.confidence !== null ? `${Math.round(evt.confidence * 100)}%` : '—'}
                  </td>
                  <td>
                    <span className={`status-tag ${evt.priority}`}>{evt.priority}</span>
                  </td>
                  <td>
                    <span className={`status-tag ${evt.status}`}>{evt.status}</span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      {evt.status === 'active' && (
                        <button
                          className="btn-action-sm primary-ack"
                          onClick={() => onAcknowledge(evt.id)}
                          title="Acknowledge event"
                        >
                          <CheckCircle size={10} />
                          <span>Ack</span>
                        </button>
                      )}
                      {evt.status === 'acknowledged' && (
                        <button
                          className="btn-action-sm primary-resolve"
                          onClick={() => onResolve(evt.id)}
                          title="Resolve event"
                        >
                          <CheckCircle2 size={10} />
                          <span>Resolve</span>
                        </button>
                      )}
                      <button
                        className="btn-action-sm"
                        onClick={() => onInspectEvent(evt)}
                        title="Inspect full details"
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
    </div>
  )
}
