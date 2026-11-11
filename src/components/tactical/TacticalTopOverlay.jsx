import { useState, useEffect } from 'react'
import {
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  Send,
  CheckCircle2,
  GitFork,
  Volume2,
  ShieldCheck,
  Compass,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  User,
  LogOut
} from 'lucide-react'

/**
 * Top Telemetry HUD Overlay for the Tactical Map
 */
export default function TacticalTopOverlay({
  stats,
  activeIncident,
  isIncidentOverlayVisible = true,
  onShowIncidentOverlay,
  packetsInTransitCount = 0,
  onSwitchToForestMap,
  onNavigateToOverview,
  currentRole = 'RANGER',
  onLogout
}) {
  const networkStatus = stats?.networkStatus || (stats?.failedSensors > 0 ? 'DEGRADED' : 'OPTIMAL')
  const statusColor =
    networkStatus === 'OPTIMAL' ? '#00f0ff' :
    networkStatus === 'CONNECTED' ? '#10b981' :
    networkStatus === 'DEGRADED' ? '#f59e0b' :
    '#ef4444' // DISCONNECTED
  const statusText = networkStatus
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  return (
    <div className="tactical-top-overlay">
      {/* Brand & Mode Indicator */}
      <div className="tactical-hud-cluster">
        <div className="tactical-badge live">
          <span className="live-pulse" />
          <span>TACTICAL SWARM MESH</span>
        </div>
        <div className="hud-metric-pair">
          <span className="metric-label">NETWORK:</span>
          <span className="metric-value" style={{ color: statusColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Middle Vital Telemetry Counters */}
      <div className="tactical-hud-counters">
        <div className="counter-item" title="Operational Sensors in the Reserve">
          <Radio size={13} style={{ color: '#06b6d4' }} />
          <span className="counter-label">NODES:</span>
          <span className="counter-val">
            {stats?.operationalSensors || 0} / {stats?.totalSensors || 0}
          </span>
        </div>

        <div className="counter-item" title="Active Bidirectional Communication Links">
          <Wifi size={13} style={{ color: '#06b6d4' }} />
          <span className="counter-label">ACTIVE LINKS:</span>
          <span className="counter-val highlight">{stats?.activeLinks || 0}</span>
        </div>

        <div className="counter-item" title="Nodes with verified route to Base Station">
          <CheckCircle2 size={13} style={{ color: '#10b981' }} />
          <span className="counter-label">BASE REACHABILITY:</span>
          <span className="counter-val green">
            {stats?.connectivityPercentage ?? 100}%
          </span>
        </div>

        <div className="counter-item" title="Sensors with two vertex-disjoint independent paths to Base Station">
          <GitFork size={13} style={{ color: '#00f0ff' }} />
          <span className="counter-label">2-INDEPENDENT ROUTES:</span>
          <span className="counter-val cyan">
            {stats?.twoIndependentRoutesCount ?? 26} / {stats?.operationalSensors ?? 0}
          </span>
        </div>

        <div className="counter-item" title="Acoustic sensor detection coverage across forest terrain">
          <Volume2 size={13} style={{ color: '#10b981' }} />
          <span className="counter-label">ACOUSTIC COVERAGE:</span>
          <span className="counter-val green">
            {stats?.coverage?.overallCoveragePct ?? 100}%
          </span>
        </div>

        {(stats?.isolatedSensorsCount || 0) > 0 && (
          <div className="counter-item" title="Sensors with zero active neighbors (isolated)">
            <WifiOff size={13} style={{ color: '#ef4444' }} />
            <span className="counter-label">ISOLATED:</span>
            <span className="counter-val red">{stats.isolatedSensorsCount}</span>
          </div>
        )}

        <div className="counter-item" title="Sensors with hardware failure">
          <WifiOff size={13} style={{ color: networkStatus === 'DEGRADED' || networkStatus === 'DISCONNECTED' ? '#ef4444' : '#64748b' }} />
          <span className="counter-label">FAILED:</span>
          <span className={`counter-val ${stats?.failedSensors > 0 ? 'red' : 'muted'}`}>
            {stats?.failedSensors || 0}
          </span>
        </div>

        <div className="counter-item" title="Telemetry packets currently traveling through mesh relays">
          <Send size={13} style={{ color: '#00f0ff' }} />
          <span className="counter-label">IN TRANSIT:</span>
          <span className="counter-val cyan">{packetsInTransitCount}</span>
        </div>

        {activeIncident && (
          <div
            className={`counter-item incident ${!isIncidentOverlayVisible ? 'clickable' : ''}`}
            title={!isIncidentOverlayVisible ? 'Click to show incident information overlay' : 'Current Active Acoustic Incident'}
            onClick={!isIncidentOverlayVisible ? onShowIncidentOverlay : undefined}
            style={!isIncidentOverlayVisible ? { cursor: 'pointer' } : undefined}
          >
            <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
            <span className="counter-label">THREAT:</span>
            <span className="counter-val amber">
              {activeIncident.title || 'ACTIVE'} ({activeIncident.detectionCount || 1} SENSORS)
            </span>
          </div>
        )}
      </div>

      {/* View Switcher Actions (Return to Dashboard, 3D Forest Map, or Browser Fullscreen) */}
      <div className="tactical-hud-actions">
        {activeIncident && !isIncidentOverlayVisible && onShowIncidentOverlay && (
          <button
            className="btn-switch-map btn-show-incident"
            onClick={onShowIncidentOverlay}
            title="Restore Incident Information Overlay"
          >
            <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
            <span>SHOW INCIDENT</span>
          </button>
        )}
        {onNavigateToOverview && (
          <button
            className="btn-switch-map btn-dashboard-return"
            onClick={onNavigateToOverview}
            title="Return to Main Operations Dashboard"
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>
        )}
        {onSwitchToForestMap && (
          <button
            className="btn-switch-map"
            onClick={onSwitchToForestMap}
            title="Switch to 3D Realistic Forest Surveillance View"
          >
            <Compass size={14} />
            <span>3D Forest Map</span>
          </button>
        )}
        <button
          className="btn-switch-map btn-fullscreen-toggle"
          onClick={toggleBrowserFullscreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Browser Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
        </button>

        {/* Role Indicator Badge */}
        <div
          className={`tactical-role-indicator ${currentRole === 'GUEST' ? 'guest' : 'ranger'}`}
          title={`Active Session Role: ${currentRole || 'RANGER'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            fontFamily: 'monospace',
            backgroundColor: currentRole === 'GUEST' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)',
            border: `1px solid ${currentRole === 'GUEST' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
            color: currentRole === 'GUEST' ? '#f59e0b' : '#10b981'
          }}
        >
          {currentRole === 'GUEST' ? <User size={12} /> : <ShieldCheck size={12} />}
          <span>{currentRole === 'GUEST' ? 'GUEST' : 'RANGER'}</span>
        </div>

        {/* Tactical Mode Logout Button */}
        {onLogout && (
          <button
            className="btn-switch-map btn-tactical-logout"
            onClick={onLogout}
            title="Sign out of EcoSentry"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: '#f87171'
            }}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  )
}
