import React from 'react'
import {
  Camera,
  Radio,
  Activity,
  ShieldAlert,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react'

export default function OverviewCards({ stats, onSelectCardTab }) {
  const { camera, acoustic, wildlife, incidents, connectivity } = stats
  const offlineCount = connectivity?.offline || 0
  const activeIncidents = incidents?.active || 0
  const totalWildlife = wildlife?.totalDetections || 0

  return (
    <section className="kpi-grid-5">
      {/* 1. Cameras Online */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View optical camera traps"
      >
        <div className="kpi-header">
          <span className="kpi-label">Cameras Online</span>
          <div className="kpi-icon-wrapper green">
            <Camera size={14} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">
            {camera?.online}{' '}
            <span className="kpi-sub-total">/ {camera?.total}</span>
          </span>
          <span className={`kpi-status-badge ${camera?.offline === 0 ? 'success' : 'warning'}`}>
            {camera?.offline === 0 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {camera?.uptimePct}%
          </span>
        </div>

        <div className="kpi-footer-subtext">
          <span className="kpi-sub-label">
            {camera?.offline === 0 ? 'All optical feeds nominal' : `${camera?.offline} trap offline`}
          </span>
          <span className="kpi-tag-subtle">PIR + Optical</span>
        </div>
      </div>

      {/* 2. Acoustics Online */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View bio-acoustic microphone array"
      >
        <div className="kpi-header">
          <span className="kpi-label">Acoustics Online</span>
          <div className="kpi-icon-wrapper blue">
            <Radio size={14} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">
            {acoustic?.online}{' '}
            <span className="kpi-sub-total">/ {acoustic?.total}</span>
          </span>
          <span className={`kpi-status-badge ${acoustic?.offline === 0 ? 'success' : 'warning'}`}>
            {acoustic?.offline === 0 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {acoustic?.uptimePct}%
          </span>
        </div>

        <div className="kpi-footer-subtext">
          <span className="kpi-sub-label">
            {acoustic?.offline === 0 ? 'Array synchronized' : `${acoustic?.offline} node offline`}
          </span>
          <span className="kpi-tag-subtle">Triangulation active</span>
        </div>
      </div>

      {/* 3. Wildlife Detections */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('wildlife')}
        title="View logged wildlife detections"
      >
        <div className="kpi-header">
          <span className="kpi-label">Wildlife Detections</span>
          <div className="kpi-icon-wrapper purple">
            <Activity size={14} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className="kpi-value">{totalWildlife}</span>
          <span className="kpi-status-badge neutral">
            {wildlife?.uniqueSpeciesCount} Species
          </span>
        </div>

        <div className="kpi-footer-subtext">
          <span className="kpi-sub-label">Logged this session</span>
          <span className="kpi-tag-subtle">Non-threat</span>
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
          <div className={`kpi-icon-wrapper ${activeIncidents > 0 ? 'critical' : 'green'}`}>
            <ShieldAlert size={14} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className={`kpi-value ${activeIncidents > 0 ? 'critical-text' : ''}`}>
            {activeIncidents}
          </span>
          <span className={`kpi-status-badge ${activeIncidents > 0 ? 'critical' : 'success'}`}>
            {activeIncidents > 0 ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
            {activeIncidents > 0 ? 'Verification needed' : 'All clear'}
          </span>
        </div>

        <div className="kpi-footer-subtext">
          <span className="kpi-sub-label">
            {incidents?.acknowledged || 0} Acknowledged
          </span>
          <span className="kpi-tag-subtle">
            {incidents?.criticalCount || 0} Critical
          </span>
        </div>
      </div>

      {/* 5. Offline Sensors */}
      <div
        className="kpi-card"
        onClick={() => onSelectCardTab && onSelectCardTab('sensors')}
        title="View offline hardware sensors"
      >
        <div className="kpi-header">
          <span className="kpi-label">Offline Sensors</span>
          <div className={`kpi-icon-wrapper ${offlineCount > 0 ? 'warning' : 'green'}`}>
            <WifiOff size={14} />
          </div>
        </div>

        <div className="kpi-metric-row">
          <span className={`kpi-value ${offlineCount > 0 ? 'warning-text' : ''}`}>
            {offlineCount}
          </span>
          <span className={`kpi-status-badge ${offlineCount === 0 ? 'success' : 'warning'}`}>
            {offlineCount === 0 ? 'Optimal' : `${offlineCount} Offline`}
          </span>
        </div>

        <div className="kpi-footer-subtext">
          <span className="kpi-sub-label">
            {offlineCount === 0 ? 'Full grid coverage' : 'Telemetry timeout'}
          </span>
          <span className="kpi-tag-subtle">
            {connectivity?.uptimePct}% Availability
          </span>
        </div>
      </div>
    </section>
  )
}
