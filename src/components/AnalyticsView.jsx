import React from 'react'
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Clock,
  Layers,
  Activity
} from 'lucide-react'

export default function AnalyticsView({ stats, events, sensors, zones }) {
  // Calculate distribution metrics
  const totalEvents = events.length || 1
  const threats = events.filter((e) => e.category === 'threat')
  const activeCount = events.filter((e) => e.status === 'active').length
  const ackCount = events.filter((e) => e.status === 'acknowledged').length
  const resolvedCount = events.filter((e) => e.status === 'resolved').length

  const criticalCount = events.filter((e) => e.priority === 'critical').length
  const highCount = events.filter((e) => e.priority === 'high').length
  const mediumCount = events.filter((e) => e.priority === 'medium').length
  const lowCount = events.filter((e) => e.priority === 'low').length

  // Zone distribution
  const zoneDistribution = zones.map((z) => {
    const count = events.filter((e) => e.zoneId === z.id).length
    const pct = Math.round((count / totalEvents) * 100)
    return { name: z.name, count, pct }
  })

  // Classification breakdown
  const classifications = [
    { label: 'Chainsaw Acoustic Audio', count: events.filter((e) => e.type === 'chainsaw_sound').length, color: 'var(--accent-red)' },
    { label: 'Gunshot Acoustic Audio', count: events.filter((e) => e.type === 'gunshot_sound').length, color: 'var(--accent-red)' },
    { label: 'Optical Human Intrusion', count: events.filter((e) => e.type === 'human_detection').length, color: 'var(--accent-amber)' },
    { label: 'Animal Boundary Crossings', count: events.filter((e) => e.type === 'animal_boundary_crossing').length, color: 'var(--accent-purple)' },
    { label: 'Wildlife Sightings', count: events.filter((e) => e.type === 'wildlife_sighting').length, color: 'var(--accent-green)' },
    { label: 'Hardware Telemetry Loss', count: events.filter((e) => e.type === 'sensor_failure').length, color: 'var(--text-muted)' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Analytics Metric Highlights */}
      <div className="analytics-metric-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Threat Incident Rate</span>
            <ShieldAlert size={14} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-value">{threats.length}</span>
            <span className="kpi-badge critical">{criticalCount} Critical</span>
          </div>
          <div className="kpi-footer">
            <span>Response Velocity: &lt; 90s</span>
            <span className="highlight">Simulated</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Resolution Ratio</span>
            <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-value">
              {Math.round((resolvedCount / totalEvents) * 100)}%
            </span>
            <span className="kpi-badge success">{resolvedCount} Closed</span>
          </div>
          <div className="kpi-footer">
            <span>{ackCount} Under Inspection</span>
            <span className="highlight">{activeCount} Active</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Sensor Availability</span>
            <Radio size={14} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-value">{stats?.connectivity?.uptimePct || 99}%</span>
            <span className="kpi-badge success">Optimal</span>
          </div>
          <div className="kpi-footer">
            <span>{sensors.length} Active Nodes</span>
            <span className="highlight">4 Sectors</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Mean AI Confidence</span>
            <TrendingUp size={14} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-value">91.4%</span>
            <span className="kpi-badge neutral">Dual-Modal</span>
          </div>
          <div className="kpi-footer">
            <span>Optical + Bioacoustic</span>
            <span className="highlight">Calibrated</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Distribution Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {/* Classification Distribution */}
        <div className="analytics-chart-panel">
          <div className="chart-header-row">
            <h4 className="chart-title">Event Classification Distribution</h4>
            <span className="kpi-badge neutral" style={{ fontFamily: 'var(--font-mono)' }}>
              Total: {totalEvents}
            </span>
          </div>

          <div className="bar-distribution-row">
            {classifications.map((item) => {
              const pct = Math.round((item.count / totalEvents) * 100)
              return (
                <div key={item.label} className="dist-bar-item">
                  <span className="dist-bar-label">{item.label}</span>
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                  <span className="dist-bar-val">{item.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sector Spatial Threat Density */}
        <div className="analytics-chart-panel">
          <div className="chart-header-row">
            <h4 className="chart-title">Sector Spatial Event Density</h4>
            <span className="kpi-badge neutral">4 Sectors</span>
          </div>

          <div className="bar-distribution-row">
            {zoneDistribution.map((z) => (
              <div key={z.name} className="dist-bar-item">
                <span className="dist-bar-label">{z.name}</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{
                      width: `${z.pct}%`,
                      backgroundColor: 'var(--accent-teal)'
                    }}
                  />
                </div>
                <span className="dist-bar-val">{z.pct}%</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Sector Intelligence:</strong> Zone 1 (North Canopy) and Zone 4 (West Buffer) exhibit the highest classification frequencies due to proximity to logging road corridors and peripheral agricultural boundaries.
          </div>
        </div>
      </div>
    </div>
  )
}
