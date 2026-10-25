import React, { useState } from 'react'
import {
  Shield,
  Activity,
  Compass,
  ShieldAlert,
  Radio,
  FileText,
  BarChart3,
  Sliders,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react'

export default function Sidebar({ activeNav, setActiveNav, stats }) {
  const [collapsed, setCollapsed] = useState(false)

  const activeThreatsCount = stats?.incidents?.active || 0
  const onlineSensors = stats?.connectivity?.online || 0
  const totalSensors = stats?.connectivity?.total || 0
  const cameraOnline = stats?.camera?.online || 0
  const cameraTotal = stats?.camera?.total || 0
  const acousticOnline = stats?.acoustic?.online || 0
  const acousticTotal = stats?.acoustic?.total || 0

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Top Header */}
      <div className="sidebar-header">
        <div className="brand-wrapper" title="EcoSentry Wildlife Intelligence">
          <div className="brand-icon">
            <Shield size={18} strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="brand-details">
              <span className="brand-title">EcoSentry</span>
              <span className="brand-subtitle">WILDLIFE INTELLIGENCE</span>
            </div>
          )}
        </div>

        <button
          className="btn-sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {/* OPERATIONS SECTION */}
        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Operations</span>}

          <button
            className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveNav('overview')}
            title="Overview Dashboard"
          >
            <div className="nav-item-left">
              <Activity size={16} />
              {!collapsed && <span className="nav-label">Overview</span>}
            </div>
          </button>

          <button
            className={`nav-item ${activeNav === 'map' ? 'active' : ''}`}
            onClick={() => setActiveNav('map')}
            title="3D Forest Surveillance Map"
          >
            <div className="nav-item-left">
              <Compass size={16} />
              {!collapsed && <span className="nav-label">3D Forest Map</span>}
            </div>
          </button>

          <button
            className={`nav-item ${activeNav === 'threats' ? 'active' : ''}`}
            onClick={() => setActiveNav('threats')}
            title="Threat & Anomaly Alerts"
          >
            <div className="nav-item-left">
              <ShieldAlert size={16} />
              {!collapsed && <span className="nav-label">Threat Alerts</span>}
            </div>
            {!collapsed && activeThreatsCount > 0 && (
              <span className="nav-counter critical">{activeThreatsCount}</span>
            )}
          </button>

          <button
            className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
            onClick={() => setActiveNav('history')}
            title="Incident History Log"
          >
            <div className="nav-item-left">
              <FileText size={16} />
              {!collapsed && <span className="nav-label">Incident History</span>}
            </div>
          </button>
        </div>

        {/* MONITORING SECTION */}
        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">Monitoring</span>}

          <button
            className={`nav-item ${activeNav === 'sensors' ? 'active' : ''}`}
            onClick={() => setActiveNav('sensors')}
            title="Sensor Grid Management"
          >
            <div className="nav-item-left">
              <Radio size={16} />
              {!collapsed && <span className="nav-label">Sensor Management</span>}
            </div>
            {!collapsed && (
              <span className="nav-counter neutral">
                {onlineSensors}/{totalSensors}
              </span>
            )}
          </button>

          <button
            className={`nav-item ${activeNav === 'wildlife' ? 'active' : ''}`}
            onClick={() => setActiveNav('wildlife')}
            title="Wildlife Detections & Sighting Logs"
          >
            <div className="nav-item-left">
              <Eye size={16} />
              {!collapsed && <span className="nav-label">Wildlife Detections</span>}
            </div>
            {!collapsed && (
              <span className="nav-counter neutral">
                {stats?.wildlife?.totalDetections || 0}
              </span>
            )}
          </button>

          <button
            className={`nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveNav('analytics')}
            title="Operations Analytics & Trends"
          >
            <div className="nav-item-left">
              <BarChart3 size={16} />
              {!collapsed && <span className="nav-label">Analytics</span>}
            </div>
          </button>
        </div>

        {/* SYSTEM SECTION */}
        <div className="nav-section">
          {!collapsed && <span className="nav-section-title">System</span>}

          <button
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}
            title="System Parameters & Calibration"
          >
            <div className="nav-item-left">
              <Sliders size={16} />
              {!collapsed && <span className="nav-label">Settings</span>}
            </div>
          </button>
        </div>
      </nav>

      {/* System Status Panel & Officer Card */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="system-status-card">
            <div className="status-card-header">
              <span>Telemetry Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)' }}>
                <span className="status-indicator-dot"></span>
                ONLINE
              </span>
            </div>
            <div className="status-row">
              <span>Uptime:</span>
              <span className="val">{stats?.connectivity?.uptimePct || 99}%</span>
            </div>
            <div className="status-row">
              <span>Cameras:</span>
              <span className="val">{cameraOnline}/{cameraTotal} Online</span>
            </div>
            <div className="status-row">
              <span>Acoustic:</span>
              <span className="val">{acousticOnline}/{acousticTotal} Online</span>
            </div>
            <div className="status-row">
              <span>Forest Zones:</span>
              <span className="val">4 Active</span>
            </div>
          </div>

          <div className="officer-profile">
            <div className="officer-avatar">EV</div>
            <div className="officer-info">
              <span className="officer-name">Elena Vance</span>
              <span className="officer-role">Surveillance Lead • Sector 7</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
