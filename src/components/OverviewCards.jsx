import React from 'react'
import {
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  AlertCircle
} from 'lucide-react'

export default function OverviewCards({ stats, onSelectCardTab }) {
  const { camera, acoustic, wildlife, incidents, connectivity } = stats
  const offlineCount = connectivity?.offline || 0

  return (
    <section className="kpi-grid-5">
      {/* 1. Camera Network */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View camera trap telemetry"
      >
        <div className="kpi-header">
          <span className="kpi-label">Camera Traps</span>
          <div className="kpi-icon-wrapper">
            <Camera size={15} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">{camera?.online} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {camera?.total}</span></span>
          <span className={`kpi-badge ${camera?.offline === 0 ? 'success' : 'warning'}`}>
            {camera?.offline === 0 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {camera?.uptimePct}%
          </span>
        </div>

        <div className="kpi-footer">
          <span>{camera?.offline === 0 ? 'All traps streaming' : `${camera?.offline} node offline`}</span>
          <span className="highlight">Optical + PIR</span>
        </div>
      </div>

      {/* 2. Acoustic Array */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View acoustic audio sensors"
      >
        <div className="kpi-header">
          <span className="kpi-label">Acoustic Nodes</span>
          <div className="kpi-icon-wrapper">
            <Radio size={15} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">{acoustic?.online} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {acoustic?.total}</span></span>
          <span className={`kpi-badge ${acoustic?.offline === 0 ? 'success' : 'warning'}`}>
            {acoustic?.offline === 0 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {acoustic?.uptimePct}%
          </span>
        </div>

        <div className="kpi-footer">
          <span>{acoustic?.offline === 0 ? 'Array synchronized' : `${acoustic?.offline} node offline`}</span>
          <span className="highlight">20Hz - 96kHz</span>
        </div>
      </div>

      {/* 3. Wildlife Detections */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('wildlife')}
        title="View wildlife detections and sightings"
      >
        <div className="kpi-header">
          <span className="kpi-label">Wildlife Logged</span>
          <div className="kpi-icon-wrapper">
            <Activity size={15} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">{wildlife?.totalDetections}</span>
          <span className="kpi-badge purple">
            {wildlife?.uniqueSpeciesCount} Species
          </span>
        </div>

        <div className="kpi-footer">
          <span>{wildlife?.speciesList?.slice(0, 2).join(', ')}</span>
          <span className="highlight">Non-threat</span>
        </div>
      </div>

      {/* 4. Active Incidents */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('threats')}
        title="View active threat alerts"
      >
        <div className="kpi-header">
          <span className="kpi-label">Active Incidents</span>
          <div className="kpi-icon-wrapper">
            <ShieldAlert size={15} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span
            className="kpi-value"
            style={{ color: incidents?.active > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}
          >
            {incidents?.active}
          </span>
          <span className={`kpi-badge ${incidents?.active > 0 ? 'critical' : 'success'}`}>
            {incidents?.active > 0 ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
            {incidents?.active > 0 ? `${incidents?.criticalCount} Critical` : 'Nominal'}
          </span>
        </div>

        <div className="kpi-footer">
          <span>{incidents?.acknowledged} Acknowledged</span>
          <span className="highlight">{incidents?.resolved} Resolved</span>
        </div>
      </div>

      {/* 5. Sensor Grid Health */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View hardware telemetry and power"
      >
        <div className="kpi-header">
          <span className="kpi-label">Grid Availability</span>
          <div className="kpi-icon-wrapper">
            {offlineCount === 0 ? <CheckCircle2 size={15} /> : <WifiOff size={15} />}
          </div>
        </div>

        <div className="kpi-metric-row">
          <span
            className="kpi-value"
            style={{ color: offlineCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}
          >
            {connectivity?.uptimePct}%
          </span>
          <span className={`kpi-badge ${offlineCount === 0 ? 'success' : 'warning'}`}>
            {offlineCount === 0 ? 'Optimal' : `${offlineCount} Disconnected`}
          </span>
        </div>

        <div className="kpi-footer">
          <span>{connectivity?.online} / {connectivity?.total} Nodes Active</span>
          <span className="highlight">Telemetry Watchdog</span>
        </div>
      </div>
    </section>
  )
}
