import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Battery,
  Wifi,
  Volume2,
  Route,
  AlertTriangle,
  Power,
  RotateCcw,
  Share2
} from 'lucide-react'
import { findShortestPath } from '../../services/meshNetwork/dijkstra.js'
import { calculateSmartPopupPosition } from '../../services/meshNetwork/popupPositioning.js'

export { calculateSmartPopupPosition }

/**
 * Tactical Sensor Status & Failure/Restore Interactive Popup
 */
export default function TacticalSensorPopup({
  sensor,
  graph,
  screenPos,
  onToggleStatus,
  onClose,
  activeIncident,
  isDragging = false
}) {
  const [showConfirmFailure, setShowConfirmFailure] = useState(false)
  const popupRef = useRef(null)

  // Reset confirmation state if selected sensor changes
  useEffect(() => {
    setShowConfirmFailure(false)
  }, [sensor?.id])

  // Escape key closes popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!sensor) return null

  const isFailed = sensor.status === 'failed' || sensor.status === 'offline'
  const isOnline = sensor.status === 'online'

  // Active communication neighbors
  const activeNeighbors = graph?.adjacency?.get?.(sensor.id) || []
  const neighborCount = sensor.neighbors?.length ?? activeNeighbors.length
  const hasTwoIndependentPaths = Boolean(
    graph?.stats?.twoIndependentRouteSensorIds?.includes(sensor.id) ??
    graph?.stats?.redundantSensorIds?.includes(sensor.id)
  )

  // Base Station reachability & Dijkstra path
  const isReachable = Boolean(graph?.reachableFromBase?.has(sensor.id))
  const dijkstraRoute = graph?.adjacency && isOnline
    ? findShortestPath(graph.adjacency, sensor.id, 'BASE')
    : { reachable: false, path: [], hops: 0 }

  let routeSummary = 'OFFLINE (Node disconnected)'
  if (isOnline) {
    if (isReachable && dijkstraRoute.reachable) {
      routeSummary = `BASE OK (${dijkstraRoute.hops} hop${dijkstraRoute.hops === 1 ? '' : 's'})`
    } else {
      routeSummary = 'ISOLATED (No path to BASE)'
    }
  }

  // Compact layout dimensions
  const popupWidth = 240
  const popupHeight = showConfirmFailure ? 230 : 190

  // Calculate smart position avoiding the sensor, terrain center, base, and incident
  const { left: leftStyle, top: topStyle } = useMemo(() => {
    return calculateSmartPopupPosition({
      screenPos,
      popupWidth,
      popupHeight
    })
  }, [screenPos, popupWidth, popupHeight])

  const handleConfirmFail = () => {
    setShowConfirmFailure(false)
    onToggleStatus?.(sensor.id)
  }

  const handleRestore = () => {
    onToggleStatus?.(sensor.id)
  }

  return (
    <div
      ref={popupRef}
      className={`tactical-sensor-popup ${isFailed ? 'failed' : 'online'} ${isDragging ? 'dragging-active' : ''}`}
      style={{ left: leftStyle, top: topStyle }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header with Sensor ID, Status Pill & Close Button */}
      <div className="popup-header">
        <div className="popup-title-group">
          <span className={`popup-status-pulse ${isFailed ? 'red' : 'green'}`} />
          <div className="popup-title-text">
            <span className="popup-sensor-id">{sensor.id}</span>
            <span className="popup-zone-subtitle">{sensor.zoneName || 'Forest Reserve'}</span>
          </div>
        </div>

        <div className="popup-header-right">
          <span className={`popup-status-badge ${isFailed ? 'badge-red' : 'badge-green'}`}>
            {isFailed ? 'OFFLINE' : 'ONLINE'}
          </span>
          <button
            className="btn-popup-close"
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
            }}
            title="Close popup (Esc)"
            aria-label="Close sensor popup"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* 2. Key Telemetry Grid */}
      <div className="popup-grid">
        <div className="popup-grid-item">
          <div className="popup-item-label">
            <Battery size={10} style={{ color: (sensor.batteryLevel || 94) < 30 ? '#ef4444' : '#10b981' }} />
            <span>BATTERY</span>
          </div>
          <span className="popup-item-value highlight">{sensor.batteryLevel ?? 94}%</span>
        </div>

        <div className="popup-grid-item">
          <div className="popup-item-label">
            <Share2 size={10} style={{ color: '#06b6d4' }} />
            <span>NEIGHBORS</span>
          </div>
          <span className="popup-item-value">
            {neighborCount} active
          </span>
        </div>

        <div className="popup-grid-item">
          <div className="popup-item-label">
            <Wifi size={10} style={{ color: '#00f0ff' }} />
            <span>COMM RANGE</span>
          </div>
          <span className="popup-item-value">{sensor.communicationRange} units</span>
        </div>

        <div className="popup-grid-item">
          <div className="popup-item-label">
            <Volume2 size={10} style={{ color: '#f59e0b' }} />
            <span>HEARING</span>
          </div>
          <span className="popup-item-value">{sensor.acousticDetectionRange} units</span>
        </div>
      </div>

      {/* 3. Base Station Route Status Banner */}
      <div className={`popup-route-banner ${isReachable && isOnline ? 'connected' : 'disconnected'}`}>
        <div className="route-banner-header">
          <Route size={10} />
          <span className="route-banner-label">ROUTE TO BASE:</span>
          <span className={`route-status-pill ${isReachable && isOnline ? 'green' : 'red'}`}>
            {routeSummary}
          </span>
        </div>

        {isOnline && isReachable && dijkstraRoute.path?.length > 1 && (
          <div className="route-path-flow">
            {dijkstraRoute.path.map((nodeId, idx) => (
              <React.Fragment key={nodeId}>
                <span className={`route-hop-node ${nodeId === sensor.id ? 'current' : nodeId === 'BASE' ? 'base' : ''}`}>
                  {nodeId}
                </span>
                {idx < dijkstraRoute.path.length - 1 && <span className="route-hop-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {isOnline && isReachable && (
          <div className="popup-redundancy-badge" style={{ marginTop: '2px', fontSize: '8px', color: hasTwoIndependentPaths ? '#00f0ff' : '#94a3b8' }}>
            <span>{hasTwoIndependentPaths ? '🛡️ 2 VERTEX-DISJOINT ROUTES' : '⚠️ SINGLE CONVERGENT ROUTE'}</span>
          </div>
        )}

        {(sensor.messageQueue?.length || 0) > 0 && (
          <div className="popup-queue-notice">
            <span className="queue-pulse-dot" />
            <span>
              {sensor.messageQueue.length} msg{sensor.messageQueue.length === 1 ? '' : 's'} buffered locally
            </span>
          </div>
        )}
      </div>

      {/* 4. Sensor Failure / Restore Actions */}
      <div className="popup-actions-zone">
        {isOnline ? (
          showConfirmFailure ? (
            <div className="popup-confirm-card">
              <div className="confirm-warning-row">
                <AlertTriangle size={13} className="confirm-icon" />
                <div className="confirm-text">
                  <span className="confirm-title">Confirm Failure</span>
                  <span className="confirm-desc">
                    Take {sensor.id} offline? Mesh packets will reroute.
                  </span>
                </div>
              </div>
              <div className="confirm-btn-row">
                <button
                  className="btn-confirm-cancel"
                  onClick={() => setShowConfirmFailure(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-danger"
                  onClick={handleConfirmFail}
                >
                  <Power size={11} />
                  <span>Confirm</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-simulate-fail"
              onClick={() => setShowConfirmFailure(true)}
              title={`Simulate failure of sensor ${sensor.id}`}
            >
              <Power size={12} />
              <span>SIMULATE SENSOR FAILURE</span>
            </button>
          )
        ) : (
          <button
            className="btn-restore-sensor"
            onClick={handleRestore}
            title={`Restore sensor ${sensor.id} to online status`}
          >
            <RotateCcw size={12} />
            <span>RESTORE SENSOR</span>
          </button>
        )}
      </div>
    </div>
  )
}
