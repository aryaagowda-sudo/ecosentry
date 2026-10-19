import React from 'react'
import {
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export default function OverviewCards({ stats, onSelectCardTab }) {
  const { camera, acoustic, wildlife, incidents, connectivity } = stats
  const offlineCount = connectivity.offline

  return (
    <section className="overview-grid compact-5">
      {/* 1. Cameras Online */}
      <div
        className="overview-card compact"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View camera trap sensors"
      >
        <div className="card-top-row">
          <div className="card-icon-box cyan compact">
            <Camera size={18} />
          </div>
          <div className={`card-trend-badge ${camera.offline === 0 ? 'trend-emerald' : 'trend-amber'}`}>
            {camera.offline === 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>{camera.uptimePct}%</span>
          </div>
        </div>

        <div className="card-middle-metric">
          <span className="card-label">Cameras Online</span>
          <span className="card-value">{camera.online} / {camera.total}</span>
        </div>

        <div className="card-footer-subtext">
          <span>{camera.offline === 0 ? 'All cameras active' : `${camera.offline} unit offline`}</span>
          <span className="highlight">Optical + PIR</span>
        </div>
      </div>

      {/* 2. Acoustic Sensors Online */}
      <div
        className="overview-card compact"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View acoustic audio sensor nodes"
      >
        <div className="card-top-row">
          <div className="card-icon-box emerald compact">
            <Radio size={18} />
          </div>
          <div className={`card-trend-badge ${acoustic.offline === 0 ? 'trend-emerald' : 'trend-amber'}`}>
            {acoustic.offline === 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>{acoustic.uptimePct}%</span>
          </div>
        </div>

        <div className="card-middle-metric">
          <span className="card-label">Acoustics Online</span>
          <span className="card-value">{acoustic.online} / {acoustic.total}</span>
        </div>

        <div className="card-footer-subtext">
          <span>{acoustic.offline === 0 ? 'Audio array online' : `${acoustic.offline} node offline`}</span>
          <span className="highlight">20Hz - 96kHz</span>
        </div>
      </div>

      {/* 3. Wildlife Detections */}
      <div
        className="overview-card compact"
        onClick={() => onSelectCardTab && onSelectCardTab('history')}
        title="View wildlife detections in event history"
      >
        <div className="card-top-row">
          <div className="card-icon-box purple compact">
            <Activity size={18} />
          </div>
          <div className="card-trend-badge trend-purple">
            <span>{wildlife.uniqueSpeciesCount} Species</span>
          </div>
        </div>

        <div className="card-middle-metric">
          <span className="card-label">Wildlife Detections</span>
          <span className="card-value">{wildlife.totalDetections} Logged</span>
        </div>

        <div className="card-footer-subtext">
          <span>{wildlife.speciesList.slice(0, 2).join(', ')}</span>
          <span className="highlight">Safe</span>
        </div>
      </div>

      {/* 4. Active Incidents */}
      <div
        className="overview-card compact"
        onClick={() => onSelectCardTab && onSelectCardTab('threats')}
        title="View threat alert panel"
      >
        <div className="card-top-row">
          <div className="card-icon-box amber compact">
            <ShieldAlert size={18} />
          </div>
          <div className={`card-trend-badge ${incidents.active > 0 ? 'trend-critical' : 'trend-emerald'}`}>
            {incidents.active > 0 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
            <span>{incidents.active} Active</span>
          </div>
        </div>

        <div className="card-middle-metric">
          <span className="card-label">Active Incidents</span>
          <span
            className="card-value"
            style={{ color: incidents.active > 0 ? '#ef4444' : '#fff' }}
          >
            {incidents.active} Alerts
          </span>
        </div>

        <div className="card-footer-subtext">
          <span>{incidents.criticalCount} Critical • {incidents.acknowledged} Under Inspection</span>
          <span className="highlight">{incidents.resolved} Resolved</span>
        </div>
      </div>

      {/* 5. Offline Sensors */}
      <div
        className="overview-card compact"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View sensor management and hardware telemetry"
      >
        <div className="card-top-row">
          <div className={`card-icon-box ${offlineCount === 0 ? 'emerald' : 'amber'} compact`}>
            {offlineCount === 0 ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
          </div>
          <div className={`card-trend-badge ${offlineCount === 0 ? 'trend-emerald' : 'trend-amber'}`}>
            <span>{connectivity.uptimePct}% Grid</span>
          </div>
        </div>

        <div className="card-middle-metric">
          <span className="card-label">Offline Sensors</span>
          <span
            className="card-value"
            style={{ color: offlineCount > 0 ? '#f59e0b' : '#10b981' }}
          >
            {offlineCount} {offlineCount === 1 ? 'Unit' : 'Units'}
          </span>
        </div>

        <div className="card-footer-subtext">
          <span>{offlineCount === 0 ? 'All nodes reporting' : 'Telemetry loss'}</span>
          <span className="highlight">Hardware</span>
        </div>
      </div>
    </section>
  )
}
