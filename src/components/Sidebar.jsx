import React from 'react'
import {
  TreePine,
  Activity,
  Compass,
  ShieldAlert,
  Radio,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

export default function Sidebar({ activeNav, setActiveNav, stats }) {
  const activeThreatsCount = stats?.incidents?.active || 0
  const onlineSensors = stats?.connectivity?.online || 0
  const totalSensors = stats?.connectivity?.total || 0

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-wrapper">
          <TreePine size={24} strokeWidth={2.2} />
        </div>
        <div className="brand-text">
          <h1>EcoSentry</h1>
          <span className="brand-tag">Wildlife Sentinel v1.0</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <span className="nav-section-title">Navigation</span>

        <button
          className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveNav('overview')}
        >
          <div className="nav-item-left">
            <Activity size={18} />
            <span>Overview</span>
          </div>
          <span className="nav-badge info">Live</span>
        </button>

        <button
          className={`nav-item ${activeNav === 'map' ? 'active' : ''}`}
          onClick={() => setActiveNav('map')}
        >
          <div className="nav-item-left">
            <Compass size={18} />
            <span>Simulated Forest Map</span>
          </div>
          <span className="nav-badge info">4 Zones</span>
        </button>

        <button
          className={`nav-item ${activeNav === 'threats' ? 'active' : ''}`}
          onClick={() => setActiveNav('threats')}
        >
          <div className="nav-item-left">
            <ShieldAlert size={18} />
            <span>Threat Alerts</span>
          </div>
          {activeThreatsCount > 0 && (
            <span className="nav-badge">{activeThreatsCount}</span>
          )}
        </button>

        <button
          className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
          onClick={() => setActiveNav('history')}
        >
          <div className="nav-item-left">
            <FileText size={18} />
            <span>Incident History</span>
          </div>
        </button>

        <span className="nav-section-title">Telemetry & Grid</span>

        <button
          className={`nav-item ${activeNav === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveNav('sensors')}
        >
          <div className="nav-item-left">
            <Radio size={18} />
            <span>Sensor Management</span>
          </div>
          <span className={`nav-badge ${onlineSensors === totalSensors ? 'info' : 'warning-badge'}`}>
            {onlineSensors}/{totalSensors}
          </span>
        </button>
      </nav>

      {/* Telemetry and System Health Card */}
      <div className="sidebar-footer">
        <div className="telemetry-card">
          <div className="telemetry-header">
            <span>GRID TELEMETRY</span>
            <span style={{ color: onlineSensors === totalSensors ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {onlineSensors === totalSensors ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {stats?.connectivity?.uptimePct}% UPTIME
            </span>
          </div>
          <div className="telemetry-item">
            <span>Simulated Zones:</span>
            <span className="value">4 Active</span>
          </div>
          <div className="telemetry-item">
            <span>Sensors Online:</span>
            <span className="value">{onlineSensors} of {totalSensors}</span>
          </div>
          <div className="telemetry-item">
            <span>System Mode:</span>
            <span className="value" style={{ color: '#06b6d4' }}>Demo Prototype</span>
          </div>
        </div>

        {/* Ranger Profile */}
        <div className="ranger-profile">
          <div className="ranger-avatar">
            EV
            <div className="online-indicator"></div>
          </div>
          <div className="ranger-info">
            <div className="name">Ranger Elena Vance</div>
            <div className="role">Anti-Poaching Dispatch Lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
