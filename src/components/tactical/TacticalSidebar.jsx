import { useState, useEffect } from 'react'
import {
  Search,
  Sliders,
  Radio,
  WifiOff,
  RefreshCw,
  Power,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Archive,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { getStoreAndForwardMetrics } from '../../services/meshNetwork/storeAndForward.js'

export default function TacticalSidebar({
  isCollapsed = false,
  onToggleCollapse,
  sensors = [],
  baseStation = null,
  graph = null,
  packets = [],
  selectedNodeId = null,
  activeIncident = null,
  selectedPath = [],
  // Toggles
  showLinks = true,
  setShowLinks,
  showLabels = true,
  setShowLabels,
  commRangeMode = 'none',
  setCommRangeMode,
  acousticRangeMode = 'none',
  setAcousticRangeMode,
  showUncertainty = true,
  setShowUncertainty,
  // Sliders
  defaultCommRange = 22,
  onChangeDefaultCommRange,
  defaultAcousticRange = 28,
  onChangeDefaultAcousticRange,
  // Email Notification Mode
  emailNotificationMode = 'AFTER BASE STATION RECEIVES PACKET',
  onChangeEmailMode,
  // Sensor Actions
  onSelectNode,
  onToggleSensorStatus,
  onChangeSensorCommRange,
  onChangeSensorAcousticRange,
  onFailRandomSensor,
  onRestoreAllSensors,
  onRegenerateTopology
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'operational' | 'failed' | 'disconnected' | 'route' | 'incident'
  // Accordion state: only one panel can be open at a time ('inspector' | 'storeAndForward' | 'controls' | 'list' | null)
  const [activePanel, setActivePanel] = useState('inspector')

  const togglePanel = (panelKey) => {
    setActivePanel((prev) => (prev === panelKey ? null : panelKey))
  }

  // When a sensor node or base station is selected, automatically expand the inspector panel and close others
  useEffect(() => {
    if (selectedNodeId) {
      setActivePanel('inspector')
    }
  }, [selectedNodeId])

  const selectedSensor = sensors.find((s) => s.id === selectedNodeId)
  const isBaseSelected = selectedNodeId === 'BASE'
  const detectingSensorIds = activeIncident?.detectingSensors || []
  const pathSet = new Set(selectedPath)

  // Store-and-Forward Network Metrics
  const sfMetrics = getStoreAndForwardMetrics(sensors, packets, graph)

  // Filter sensor list
  const filteredSensors = sensors.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!s.id.toLowerCase().includes(q) && !s.zoneName.toLowerCase().includes(q)) {
        return false
      }
    }

    if (filterMode === 'operational') return s.status === 'online'
    if (filterMode === 'failed') return s.status === 'failed'
    if (filterMode === 'disconnected') {
      const isReachable = graph?.reachableFromBase?.has(s.id)
      return s.status === 'online' && !isReachable
    }
    if (filterMode === 'route') return pathSet.has(s.id)
    if (filterMode === 'incident') return detectingSensorIds.includes(s.id)

    return true
  })

  return (
    <aside className={`tactical-sidebar ${isCollapsed ? 'collapsed' : ''}`} aria-label="Tactical Controls Sidebar">
      {isCollapsed ? (
        /* Collapsed Slim Strip */
        <div className="sidebar-collapsed-strip">
          <button
            className="btn-sidebar-toggle-collapsed"
            onClick={onToggleCollapse}
            title="Expand Tactical Controls & Telemetry"
            aria-label="Expand tactical controls sidebar"
          >
            <ChevronRight size={18} />
          </button>
          <div
            className="collapsed-strip-label"
            onClick={onToggleCollapse}
            title="Click to expand Mesh Telemetry & Controls"
          >
            <Radio size={14} style={{ color: '#00f0ff' }} />
            <span className="collapsed-vertical-text">TELEMETRY & CONTROLS</span>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Header Toolbar with Collapse Toggle */}
          <div className="sidebar-tactical-header">
            <div className="sidebar-header-info">
              <div className="title-row">
                <Radio size={16} style={{ color: '#00f0ff' }} />
                <h2 className="title-text">MESH TELEMETRY & CONTROLS</h2>
              </div>
              <span className="subtitle-text">BAYMAX TACTICAL SURVEILLANCE ENGINE</span>
            </div>
            {onToggleCollapse && (
              <button
                className="btn-sidebar-toggle"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                aria-label="Collapse tactical controls sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          <div className="sidebar-scrollable-content">
        {/* ACTIVE INCIDENT TELEMETRY */}
        {activeIncident && (
          <div className="tactical-card highlight-card" style={{ borderColor: '#f59e0b' }}>
            <div
              className="card-header-clickable"
              onClick={() => togglePanel('incident')}
            >
              <div className="card-header-left">
                <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                <span className="card-title">
                  Incident: {activeIncident.title || 'Acoustic Threat'}
                </span>
              </div>
              {activePanel === 'incident' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {activePanel === 'incident' && (
              <div className="card-body">
                <div className="inspector-stat-grid">
                  <div className="stat-box">
                    <span className="box-lbl">SOURCE</span>
                    <span className="box-val cyan">
                      {activeIncident.coordinates?.x !== undefined
                        ? `[${activeIncident.coordinates.x}, ${activeIncident.coordinates.y}]`
                        : activeIncident.worldPosition
                        ? `[${activeIncident.worldPosition.x}, ${activeIncident.worldPosition.z}]`
                        : 'RESERVE'}
                    </span>
                  </div>

                  <div className="stat-box">
                    <span className="box-lbl">NEAREST SENSOR</span>
                    <span className="box-val cyan">
                      {activeIncident.nearestSensorId || activeIncident.originatingSensorId || 'N/A'}
                      {activeIncident.nearestSensorDistance !== undefined && activeIncident.nearestSensorDistance !== null
                        ? ` (${Number(activeIncident.nearestSensorDistance).toFixed(1)}m)`
                        : ''}
                    </span>
                  </div>

                  <div className="stat-box">
                    <span className="box-lbl">PACKET ORIGIN</span>
                    <span className="box-val highlight">
                      {activeIncident.originatingSensorId || 'NONE'}
                      {activeIncident.bypassedNearestSensor ? ' (BYPASS)' : ''}
                    </span>
                  </div>

                  <div className="stat-box">
                    <span className="box-lbl">TRANSMISSION</span>
                    <span className={`box-val ${activeIncident.deliveryStatus === 'DELIVERED' ? 'green' : 'cyan'}`}>
                      {activeIncident.transmissionStatus?.toUpperCase() || 'IN TRANSIT'}
                    </span>
                  </div>
                </div>

                {activeIncident.bypassedNearestSensor && activeIncident.bypassReason && (
                  <div className="incident-hud-row bypass-row" style={{ marginTop: '8px' }}>
                    <span className="hud-label" style={{ color: '#f59e0b' }}>BYPASS REASON:</span>
                    <span className="hud-val amber-warning">
                      {activeIncident.bypassReason}
                    </span>
                  </div>
                )}

                {activeIncident.otherDetectingSensors && activeIncident.otherDetectingSensors.length > 0 && (
                  <div className="incident-hud-row detectors-row" style={{ marginTop: '8px' }}>
                    <span className="hud-label">OTHER DETECTORS:</span>
                    <div className="hud-val-detectors">
                      {activeIncident.otherDetectingSensors.map((d, idx) => (
                        <span key={d.sensorId || idx} className="detector-pill">
                          {d.sensorId} ({Number(d.distance).toFixed(1)}m)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeIncident.routeToBasestation && activeIncident.routeToBasestation.length > 0 && (
                  <div className="node-route-preview" style={{ marginTop: '8px' }}>
                    <span className="preview-label">Dijkstra Shortest Path to BASE:</span>
                    <span className="preview-route">
                      {activeIncident.routeToBasestation.join(' → ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. SELECTED SENSOR INSPECTOR & QUEUE INSPECTOR */}
        <div className="tactical-card highlight-card">
          <div
            className="card-header-clickable"
            onClick={() => togglePanel('inspector')}
          >
            <div className="card-header-left">
              <Sliders size={14} style={{ color: '#00f0ff' }} />
              <span className="card-title">
                {selectedSensor
                  ? `Node Inspector: ${selectedSensor.id}`
                  : isBaseSelected
                  ? 'Command Base Station'
                  : 'Node Inspector (Select a sensor)'}
              </span>
            </div>
            {activePanel === 'inspector' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {activePanel === 'inspector' && (
            <div className="card-body">
              {selectedSensor ? (
                <div className="inspector-details">
                  <div className="inspector-stat-grid">
                    <div className="stat-box">
                      <span className="box-lbl">STATUS</span>
                      <span className={`box-val ${selectedSensor.status === 'online' ? 'green' : 'red'}`}>
                        {selectedSensor.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="stat-box">
                      <span className="box-lbl">BATTERY</span>
                      <span className="box-val cyan">{selectedSensor.batteryLevel || 92}%</span>
                    </div>

                    <div className="stat-box">
                      <span className="box-lbl">ACTIVE NEIGHBORS</span>
                      <span className="box-val highlight">
                        {selectedSensor.neighbors?.length || 0}
                      </span>
                    </div>

                    <div className="stat-box">
                      <span className="box-lbl">BASE ROUTE</span>
                      <span className={`box-val ${graph?.reachableFromBase?.has(selectedSensor.id) ? 'green' : 'red'}`}>
                        {graph?.reachableFromBase?.has(selectedSensor.id) ? 'CONNECTED' : 'ISOLATED'}
                      </span>
                    </div>
                  </div>

                  {/* Failure / Recovery Simulation Toggle */}
                  <div className="node-failure-toggle">
                    <button
                      className={`btn-tactical ${selectedSensor.status === 'online' ? 'action-red' : 'action-green'}`}
                      onClick={() => onToggleSensorStatus?.(selectedSensor.id)}
                    >
                      <Power size={13} />
                      <span>
                        {selectedSensor.status === 'online'
                          ? `Simulate Sensor Failure (${selectedSensor.id})`
                          : `Restore Sensor (${selectedSensor.id})`}
                      </span>
                    </button>
                  </div>

                  {/* Individual Range Adjustments */}
                  <div className="range-slider-group">
                    <div className="slider-label-row">
                      <span>Comm Range (Bluetooth):</span>
                      <span className="slider-val cyan">{selectedSensor.communicationRange} units</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="40"
                      step="1"
                      className="tactical-slider cyan"
                      value={selectedSensor.communicationRange}
                      onChange={(e) =>
                        onChangeSensorCommRange?.(selectedSensor.id, Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="range-slider-group">
                    <div className="slider-label-row">
                      <span>Acoustic Hearing Range:</span>
                      <span className="slider-val amber">{selectedSensor.acousticDetectionRange} units</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="50"
                      step="1"
                      className="tactical-slider amber"
                      value={selectedSensor.acousticDetectionRange}
                      onChange={(e) =>
                        onChangeSensorAcousticRange?.(selectedSensor.id, Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Route Information */}
                  <div className="node-route-preview">
                    <span className="preview-label">Dijkstra Shortest Path to BASE:</span>
                    <span className="preview-route">
                      {selectedPath.length > 0 && selectedPath[0] === selectedSensor.id
                        ? selectedPath.join(' → ')
                        : graph?.reachableFromBase?.has(selectedSensor.id)
                        ? 'Select to highlight path'
                        : 'NO ROUTE (Isolated Node)'}
                    </span>
                  </div>

                  {/* Local Sensor Message Queue Inspector (Store-and-Forward) */}
                  <div className="node-queue-inspector">
                    <div className="queue-header-row">
                      <div className="queue-header-left">
                        <Inbox size={12} style={{ color: '#f59e0b' }} />
                        <span className="queue-title">LOCAL MESSAGE QUEUE</span>
                      </div>
                      <span className={`queue-capacity-pill ${(selectedSensor.messageQueue?.length || 0) >= 10 ? 'full' : ''}`}>
                        {selectedSensor.messageQueue?.length || 0} / 10 CAPACITY
                      </span>
                    </div>

                    {!selectedSensor.messageQueue || selectedSensor.messageQueue.length === 0 ? (
                      <div className="queue-empty-box">
                        <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                        <span>Queue empty • Node ready to buffer or relay</span>
                      </div>
                    ) : (
                      <div className="queue-message-list">
                        {selectedSensor.messageQueue.map((msg) => {
                          const p = String(msg.priority || 'high').toLowerCase()
                          const priorityColor =
                            p === 'critical'
                              ? '#ef4444'
                              : p === 'high'
                              ? '#f59e0b'
                              : p === 'medium'
                              ? '#00f0ff'
                              : '#94a3b8'

                          const s = String(msg.status || 'queued').toLowerCase()
                          const statusColor =
                            s === 'queued'
                              ? '#f59e0b'
                              : s === 'in_transit' || s === 'rerouting'
                              ? '#00f0ff'
                              : s === 'delivered'
                              ? '#10b981'
                              : '#ef4444'

                          return (
                            <div key={msg.messageId || msg.id} className="queue-msg-card">
                              <div className="msg-card-top">
                                <span className="msg-id">{msg.messageId || msg.id}</span>
                                <div className="msg-status-cluster">
                                  <span
                                    className="msg-priority-pill"
                                    style={{ borderColor: priorityColor, color: priorityColor }}
                                  >
                                    {(msg.priority || 'HIGH').toUpperCase()}
                                  </span>
                                  <span
                                    className="msg-status-badge"
                                    style={{ backgroundColor: `${statusColor}22`, color: statusColor, borderColor: statusColor }}
                                  >
                                    {(msg.status || 'QUEUED').toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              <div className="msg-title-row">
                                <span className="msg-incident-title">
                                  {msg.payload?.title || msg.messageType || 'Acoustic Threat Alert'}
                                </span>
                              </div>

                              <div className="msg-meta-row">
                                <span>Origin: <strong>{msg.originSensorId || msg.source}</strong></span>
                                <span>Retries: <strong>{msg.retryCount || 0}</strong></span>
                                <span>Dest: <strong>BASE</strong></span>
                              </div>

                              {msg.rerouteReason && (
                                <div className="msg-reason-row">
                                  <Clock size={10} style={{ color: '#f59e0b' }} />
                                  <span>{msg.rerouteReason}</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : isBaseSelected ? (
                <div className="base-details">
                  <p className="card-hint">Primary command receiver and telemetry sink.</p>
                  <div className="stat-box">
                    <span className="box-lbl">LOCATION</span>
                    <span className="box-val cyan">Perimeter Grid (88, 12)</span>
                  </div>
                </div>
              ) : (
                <p className="empty-selection-hint">
                  Click any sensor on the 3D map or select from the list below to inspect telemetry,
                  view buffered message queue, simulate failure, or adjust individual ranges.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. STORE & FORWARD QUEUE TELEMETRY CARD */}
        <div className="tactical-card">
          <div
            className="card-header-clickable"
            onClick={() => togglePanel('storeAndForward')}
          >
            <div className="card-header-left">
              <Archive size={14} style={{ color: '#f59e0b' }} />
              <span className="card-title">Store &amp; Forward Messaging</span>
              {sfMetrics.totalPending > 0 && (
                <span className="badge-pending-count">{sfMetrics.totalPending} QUEUED</span>
              )}
            </div>
            {activePanel === 'storeAndForward' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {activePanel === 'storeAndForward' && (
            <div className="card-body">
              <p className="card-hint">
                Autonomous disruption-tolerant mesh: disconnected sensors buffer incident messages locally and forward them automatically upon topology restoration.
              </p>

              <div className="inspector-stat-grid sf-grid">
                <div className="stat-box" title="Total messages currently buffered in sensor queues">
                  <span className="box-lbl">PENDING</span>
                  <span className={`box-val ${sfMetrics.totalPending > 0 ? 'amber' : 'green'}`}>
                    {sfMetrics.totalPending}
                  </span>
                </div>

                <div className="stat-box" title="Messages currently traversing mesh hops">
                  <span className="box-lbl">IN TRANSIT</span>
                  <span className="box-val cyan">{sfMetrics.inTransitCount}</span>
                </div>

                <div className="stat-box" title="Messages successfully received at Base Station">
                  <span className="box-lbl">DELIVERED</span>
                  <span className="box-val green">{sfMetrics.deliveredCount}</span>
                </div>

                <div className="stat-box" title="Sensors holding buffered messages">
                  <span className="box-lbl">BUFFER NODES</span>
                  <span className="box-val highlight">{sfMetrics.sensorsWithQueuedMessages}</span>
                </div>

                <div className="stat-box" title="Messages waiting for path connectivity to BASE">
                  <span className="box-lbl">ISOLATED</span>
                  <span className={`box-val ${sfMetrics.waitingForConnectivity > 0 ? 'red' : 'muted'}`}>
                    {sfMetrics.waitingForConnectivity}
                  </span>
                </div>
              </div>

              {sfMetrics.allQueuedMessages.length > 0 ? (
                <div className="sf-queued-list">
                  <span className="sf-queued-heading">BUFFERED QUEUE DIRECTORY:</span>
                  {sfMetrics.allQueuedMessages.map((msg) => (
                    <div
                      key={msg.messageId || msg.id}
                      className="sf-queued-item"
                      onClick={() => onSelectNode?.({ id: msg.sensorId })}
                      title={`Click to inspect holding sensor ${msg.sensorId}`}
                    >
                      <div className="sf-item-left">
                        <span className="sf-node-tag">{msg.sensorId}</span>
                        <span className="sf-msg-id">{msg.messageId || msg.id}</span>
                        <span className={`sf-prio-tag ${msg.priority}`}>{msg.priority?.toUpperCase()}</span>
                      </div>
                      <span className="sf-inspect-hint">INSPECT →</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="queue-all-clear">
                  <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  <span>All queues clear • Direct route forwarding operational</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. GLOBAL MESH RANGES & DISPLAY CONTROLS */}
        <div className="tactical-card">
          <div
            className="card-header-clickable"
            onClick={() => togglePanel('controls')}
          >
            <div className="card-header-left">
              <Layers size={14} style={{ color: '#06b6d4' }} />
              <span className="card-title">Network Configuration</span>
            </div>
            {activePanel === 'controls' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {activePanel === 'controls' && (
            <div className="card-body">
              {/* Mesh Health & Quality Status Grid */}
              <div className="inspector-stat-grid" style={{ marginBottom: '10px' }}>
                <div className="stat-box" title="Network Connectivity Status">
                  <span className="box-lbl">STATUS</span>
                  <span className={`box-val ${
                    graph?.stats?.networkStatus === 'OPTIMAL' ? 'cyan' :
                    graph?.stats?.networkStatus === 'CONNECTED' ? 'green' :
                    graph?.stats?.networkStatus === 'DEGRADED' ? 'amber' : 'red'
                  }`}>
                    {graph?.stats?.networkStatus || 'OPTIMAL'}
                  </span>
                </div>

                <div className="stat-box" title="Base Station Reachability">
                  <span className="box-lbl">REACHABILITY</span>
                  <span className="box-val green">
                    {graph?.stats?.connectivityPercentage ?? 100}%
                  </span>
                </div>

                <div className="stat-box" title="Sensors with two vertex-disjoint independent routes to Base Station">
                  <span className="box-lbl">2-INDEPENDENT ROUTES</span>
                  <span className="box-val highlight">
                    {graph?.stats?.twoIndependentRoutesCount || 26} / {graph?.stats?.operationalSensors || 0}
                  </span>
                </div>

                <div className="stat-box" title="Sensors without active neighbors">
                  <span className="box-lbl">ISOLATED</span>
                  <span className={`box-val ${(graph?.stats?.isolatedSensorsCount || 0) > 0 ? 'red' : 'muted'}`}>
                    {graph?.stats?.isolatedSensorsCount || 0}
                  </span>
                </div>
              </div>

              {/* Objective C: Acoustic Coverage Across All 4 Zones */}
              <div className="acoustic-coverage-card-block" style={{ marginBottom: '12px', padding: '8px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#00f0ff', letterSpacing: '0.5px' }}>
                    ACOUSTIC COVERAGE (3D TERRAIN)
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>
                    {graph?.stats?.coverage?.overallCoveragePct ?? 100}%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px', color: '#94a3b8' }}>
                  <div>Dual Coverage: <strong style={{ color: '#00f0ff' }}>{graph?.stats?.coverage?.dualCoveragePct ?? 100}%</strong></div>
                  <div>Z1 North: <strong style={{ color: '#e2e8f0' }}>{graph?.stats?.coverage?.zone1CoveragePct ?? 100}%</strong></div>
                  <div>Z2 East: <strong style={{ color: '#e2e8f0' }}>{graph?.stats?.coverage?.zone2CoveragePct ?? 100}%</strong></div>
                  <div>Z3 South: <strong style={{ color: '#e2e8f0' }}>{graph?.stats?.coverage?.zone3CoveragePct ?? 100}%</strong></div>
                  <div>Z4 Buffer: <strong style={{ color: '#e2e8f0' }}>{graph?.stats?.coverage?.zone4CoveragePct ?? 100}%</strong></div>
                  <div>Uncovered: <strong style={{ color: '#10b981' }}>None (0%)</strong></div>
                </div>
              </div>

              {/* Default Comm Range Slider */}
              <div className="range-slider-group">
                <div className="slider-label-row">
                  <span>Default Comm Range:</span>
                  <span className="slider-val cyan">{defaultCommRange} units</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="1"
                  className="tactical-slider cyan"
                  value={defaultCommRange}
                  onChange={(e) => onChangeDefaultCommRange?.(Number(e.target.value))}
                />
              </div>

              {/* Default Acoustic Range Slider */}
              <div className="range-slider-group">
                <div className="slider-label-row">
                  <span>Default Hearing Range:</span>
                  <span className="slider-val amber">{defaultAcousticRange} units</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="1"
                  className="tactical-slider amber"
                  value={defaultAcousticRange}
                  onChange={(e) => onChangeDefaultAcousticRange?.(Number(e.target.value))}
                />
              </div>

              {/* Range Spheres Visibility Toggles */}
              <div className="toggle-group-row">
                <span className="toggle-lbl">Comm Spheres:</span>
                <div className="btn-toggle-cluster">
                  {['none', 'selected', 'all'].map((m) => (
                    <button
                      key={m}
                      className={`btn-toggle-option ${commRangeMode === m ? 'active' : ''}`}
                      onClick={() => setCommRangeMode(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="toggle-group-row">
                <span className="toggle-lbl">Hearing Spheres:</span>
                <div className="btn-toggle-cluster">
                  {['none', 'selected', 'incident', 'all'].map((m) => (
                    <button
                      key={m}
                      className={`btn-toggle-option ${acousticRangeMode === m ? 'active' : ''}`}
                      onClick={() => setAcousticRangeMode(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Notification Mode Quick Selector */}
              <div className="range-slider-group">
                <div className="slider-label-row">
                  <span>Email Notification Mode:</span>
                  <span className="slider-val cyan" style={{ fontSize: '9px' }}>
                    {emailNotificationMode === 'AFTER BASE STATION RECEIVES PACKET'
                      ? 'BASE CONFIRMED'
                      : emailNotificationMode}
                  </span>
                </div>
                <div className="btn-toggle-cluster" style={{ width: '100%' }}>
                  <button
                    className={`btn-toggle-option ${emailNotificationMode === 'AFTER BASE STATION RECEIVES PACKET' ? 'active' : ''}`}
                    onClick={() => onChangeEmailMode?.('AFTER BASE STATION RECEIVES PACKET')}
                    style={{ flex: 1, textAlign: 'center' }}
                    title="Send email only after packet reaches Base Station"
                  >
                    BASE CONFIRMED
                  </button>
                  <button
                    className={`btn-toggle-option ${emailNotificationMode === 'IMMEDIATE' ? 'active' : ''}`}
                    onClick={() => onChangeEmailMode?.('IMMEDIATE')}
                    style={{ flex: 1, textAlign: 'center' }}
                    title="Send email immediately upon incident creation"
                  >
                    IMMEDIATE
                  </button>
                  <button
                    className={`btn-toggle-option ${emailNotificationMode === 'DISABLED' ? 'active' : ''}`}
                    onClick={() => onChangeEmailMode?.('DISABLED')}
                    style={{ flex: 1, textAlign: 'center' }}
                    title="Disable email notifications"
                  >
                    DISABLED
                  </button>
                </div>
              </div>

              {/* Checkbox Toggles */}
              <div className="checkbox-list">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={showLinks}
                    onChange={(e) => setShowLinks(e.target.checked)}
                  />
                  <span>Show Communication Links</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  <span>Show Sensor Labels</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={showUncertainty}
                    onChange={(e) => setShowUncertainty(e.target.checked)}
                  />
                  <span>Show Plausible Uncertainty Region (R)</span>
                </label>
              </div>

              {/* Bulk Network Actions */}
              <div className="bulk-actions-row">
                <button
                  className="btn-tactical neutral small"
                  onClick={onFailRandomSensor}
                  title="Randomly induce a hardware/battery failure on one active sensor"
                >
                  <WifiOff size={11} style={{ color: '#ef4444' }} />
                  <span>Fail Random Sensor</span>
                </button>

                <button
                  className="btn-tactical neutral small"
                  onClick={onRestoreAllSensors}
                  title="Restore all offline/failed sensors to full operational state"
                >
                  <RotateCcw size={11} style={{ color: '#10b981' }} />
                  <span>Restore All Sensors</span>
                </button>
              </div>

              <button
                className="btn-tactical action-cyan full-width"
                onClick={onRegenerateTopology}
                title="Regenerate all 28 sensors with deterministic spatial layout"
              >
                <RefreshCw size={12} />
                <span>Regenerate Network Topology</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. SENSOR DIRECTORY & TELEMETRY LIST */}
        <div className="tactical-card">
          <div
            className="card-header-clickable"
            onClick={() => togglePanel('list')}
          >
            <div className="card-header-left">
              <Radio size={14} style={{ color: '#06b6d4' }} />
              <span className="card-title">Sensor Directory ({filteredSensors.length})</span>
            </div>
            {activePanel === 'list' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {activePanel === 'list' && (
            <div className="card-body">
              {/* Search Box */}
              <div className="sidebar-search-box">
                <Search size={12} style={{ color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Filter by ID (S-001) or Zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="tactical-search-input"
                />
              </div>

              {/* Filter Pills */}
              <div className="filter-pills-row">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'operational', label: 'Online' },
                  { id: 'failed', label: 'Failed' },
                  { id: 'disconnected', label: 'Isolated' },
                  { id: 'route', label: 'On Route' }
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`filter-pill-btn ${filterMode === f.id ? 'active' : ''}`}
                    onClick={() => setFilterMode(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sensor Item List */}
              <div className="sidebar-sensor-list">
                {filteredSensors.map((sensor) => {
                  const isSelected = sensor.id === selectedNodeId
                  const isFailed = sensor.status === 'failed'
                  const isIsolated = !graph?.reachableFromBase?.has(sensor.id) && !isFailed
                  const queueLength = sensor.messageQueue?.length || 0

                  return (
                    <div
                      key={sensor.id}
                      className={`sensor-row-item ${isSelected ? 'selected' : ''} ${isFailed ? 'failed' : ''}`}
                      onClick={() => {
                        onSelectNode?.(sensor)
                        setActivePanel('inspector')
                      }}
                    >
                      <div className="sensor-row-left">
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: isFailed ? '#ef4444' : isIsolated ? '#f59e0b' : '#06b6d4'
                          }}
                        />
                        <div className="sensor-row-text">
                          <span className="sensor-row-id">{sensor.id}</span>
                          <span className="sensor-row-zone">{sensor.zoneName}</span>
                        </div>
                      </div>

                      <div className="sensor-row-right">
                        {queueLength > 0 && (
                          <span className="badge-pending-count" title={`${queueLength} message(s) queued`}>
                            Q:{queueLength}
                          </span>
                        )}
                        <span className={`sensor-route-status ${isFailed ? 'red' : isIsolated ? 'amber' : 'cyan'}`}>
                          {isFailed ? 'OFFLINE' : isIsolated ? 'ISOLATED' : 'BASE OK'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </aside>
  )
}
