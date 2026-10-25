import React from 'react'
import {
  Eye,
  Camera,
  Activity,
  Compass,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

const SPECIES_PROFILES = [
  {
    commonName: 'Bengal Tiger',
    scientificName: 'Panthera tigris tigris',
    status: 'Endangered',
    statusColor: 'var(--accent-red)',
    totalSightings: 2,
    lastZone: 'Zone 1: North Canopy',
    lastSensor: 'CAM-01',
    avgConfidence: 94,
    notes: 'Solitary adult male tracked moving along the northern ridge crest.'
  },
  {
    commonName: 'Asian Elephant',
    scientificName: 'Elephas maximus',
    status: 'Endangered',
    statusColor: 'var(--accent-amber)',
    totalSightings: 3,
    lastZone: 'Zone 2: East River Basin',
    lastSensor: 'CAM-02',
    avgConfidence: 96,
    notes: 'Matriarch herd watering in the eastern river basin tributary.'
  },
  {
    commonName: 'Indian Leopard',
    scientificName: 'Panthera pardus fusca',
    status: 'Vulnerable',
    statusColor: 'var(--accent-amber)',
    totalSightings: 1,
    lastZone: 'Zone 4: West Buffer Zone',
    lastSensor: 'CAM-04',
    avgConfidence: 89,
    notes: 'Nocturnal foraging detected at western buffer periphery.'
  },
  {
    commonName: 'Spotted Deer (Chital)',
    scientificName: 'Axis axis',
    status: 'Least Concern',
    statusColor: 'var(--accent-green)',
    totalSightings: 8,
    lastZone: 'Zone 3: South Wildlife Corridor',
    lastSensor: 'CAM-03',
    avgConfidence: 98,
    notes: 'Healthy grazing herd utilizing primary southern migration trail.'
  }
]

export default function WildlifeDetectionsView({
  events,
  zones,
  onInspectEvent,
  onViewOnMap
}) {
  const wildlifeEvents = events.filter((e) => e.category === 'wildlife')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div className="data-panel-card">
        <div className="data-panel-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="data-panel-title">
              <Eye size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>Bio-Acoustic & Optical Wildlife Detections</span>
            </h3>
            <span className="kpi-badge neutral" style={{ fontFamily: 'var(--font-mono)' }}>
              {wildlifeEvents.length} Sightings Logged
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <ShieldCheck size={13} />
              Corridor Migration Active
            </span>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <div className="view-grid-gallery">
            {SPECIES_PROFILES.map((sp) => (
              <div key={sp.commonName} className="species-card">
                <div className="species-card-header">
                  <div>
                    <div className="species-name">{sp.commonName}</div>
                    <div className="species-taxonomy">{sp.scientificName}</div>
                  </div>
                  <span
                    className="status-tag"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: `1px solid ${sp.statusColor}`,
                      color: sp.statusColor
                    }}
                  >
                    {sp.status}
                  </span>
                </div>

                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '2px 0' }}>
                  {sp.notes}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Sightings: </span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {sp.totalSightings}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Confidence: </span>
                    <strong style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                      {sp.avgConfidence}%
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Sector: </span>
                    <span style={{ color: 'var(--accent-teal)' }}>{sp.lastZone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wildlife Sighting Feed */}
      <div className="data-panel-card">
        <div className="data-panel-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={15} style={{ color: 'var(--accent-green)' }} />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Species Observations & Telemetry Events
            </h4>
          </div>
        </div>

        <div className="table-wrapper-responsive">
          <table className="standard-data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Detection ID</th>
                <th style={{ width: '150px' }}>Timestamp</th>
                <th style={{ minWidth: '180px' }}>Observed Species</th>
                <th style={{ width: '150px' }}>Monitoring Sector</th>
                <th style={{ width: '100px' }}>Sensor Unit</th>
                <th style={{ width: '100px' }}>Model Match</th>
                <th style={{ width: '110px' }}>Classification</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wildlifeEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No wildlife detection records logged yet.
                  </td>
                </tr>
              ) : (
                wildlifeEvents.map((w) => (
                  <tr key={w.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="code-id-cell">{w.id}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>{w.timestamp}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.title}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{w.zoneName}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                        {w.sensorId}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {w.confidence ? `${Math.round(w.confidence * 100)}%` : '95%'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className="status-tag"
                        style={{
                          backgroundColor: 'var(--accent-purple-bg)',
                          borderColor: 'var(--accent-purple-border)',
                          color: 'var(--accent-purple)'
                        }}
                      >
                        WILDLIFE
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          className="btn-action-sm"
                          onClick={() => (onViewOnMap ? onViewOnMap(w) : onInspectEvent(w))}
                          title="Locate sighting in 3D"
                        >
                          <Compass size={11} style={{ color: 'var(--accent-teal)' }} />
                          <span>3D View</span>
                        </button>
                        <button className="btn-action-sm" onClick={() => onInspectEvent(w)}>
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
    </div>
  )
}
