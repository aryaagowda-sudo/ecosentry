import React from 'react'
import { Radio, Camera, Wifi, WifiOff, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function SensorHealthPanel({ stats, sensors, onNavigateToSensors, onToggleSensor }) {
  const { connectivity, camera, acoustic } = stats
  const totalSensors = connectivity?.total || 0
  const onlineSensors = connectivity?.online || 0
  const offlineSensors = connectivity?.offline || 0
  const uptimePct = connectivity?.uptimePct || 0

  const cameraOnline = camera?.online || 0
  const cameraTotal = camera?.total || 0
  const cameraPct = camera?.uptimePct || 0

  const acousticOnline = acoustic?.online || 0
  const acousticTotal = acoustic?.total || 0
  const acousticPct = acoustic?.uptimePct || 0

  // Find offline sensors for the maintenance alert card
  const offlineList = sensors.filter((s) => s.status === 'offline')

  return (
    <div className="sensor-health-card">
      <div className="panel-card-header">
        <div>
          <div className="panel-header-title-row">
            <h3 className="panel-title">Sensor network health</h3>
            <span className={`kpi-badge ${offlineSensors === 0 ? 'success' : 'warning'}`}>
              {offlineSensors === 0 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              {onlineSensors}/{totalSensors} Active ({uptimePct}%)
            </span>
          </div>
          <p className="panel-subtitle">Continuous telemetry watchdog and power integrity</p>
        </div>

        <button
          className="btn-text-link"
          onClick={onNavigateToSensors}
          title="Open full sensor grid management"
        >
          <span>Grid view</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Progress Bars for Grid Availability */}
      <div className="health-metrics-grid">
        {/* Metric 1: Overall Network */}
        <div className="health-metric-item">
          <div className="metric-item-header">
            <div className="metric-label-with-icon">
              <Wifi size={13} style={{ color: 'var(--accent-green)' }} />
              <span>Network Uptime</span>
            </div>
            <span className="metric-value-text">{uptimePct}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill green"
              style={{ width: `${uptimePct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Camera Traps */}
        <div className="health-metric-item">
          <div className="metric-item-header">
            <div className="metric-label-with-icon">
              <Camera size={13} style={{ color: 'var(--accent-teal)' }} />
              <span>Camera Traps</span>
            </div>
            <span className="metric-value-text">
              {cameraOnline}/{cameraTotal} ({cameraPct}%)
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill teal"
              style={{ width: `${cameraPct}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Acoustic Array */}
        <div className="health-metric-item">
          <div className="metric-item-header">
            <div className="metric-label-with-icon">
              <Radio size={13} style={{ color: 'var(--accent-blue)' }} />
              <span>Acoustic Array</span>
            </div>
            <span className="metric-value-text">
              {acousticOnline}/{acousticTotal} ({acousticPct}%)
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill blue"
              style={{ width: `${acousticPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Offline Hardware Advisory Notice */}
      {offlineList.length > 0 ? (
        <div className="offline-maintenance-alert">
          <div className="alert-icon-box">
            <WifiOff size={15} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="alert-content">
            <div className="alert-title">
              Hardware Telemetry Timeout ({offlineList.length} node{offlineList.length > 1 ? 's' : ''})
            </div>
            <p className="alert-desc">
              {offlineList.map((s) => `${s.id} (${s.name})`).join(', ')} reported signal loss. Field battery or antenna service recommended.
            </p>
          </div>
          {onToggleSensor && (
            <button
              className="btn-quick-reconnect"
              onClick={() => onToggleSensor(offlineList[0].id)}
              title="Simulate hardware reconnection"
            >
              Reconnect
            </button>
          )}
        </div>
      ) : (
        <div className="nominal-status-banner">
          <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
          <span>All 10 sensor nodes operating within nominal telemetry tolerances.</span>
        </div>
      )}
    </div>
  )
}
