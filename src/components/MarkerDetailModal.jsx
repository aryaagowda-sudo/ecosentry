import React from 'react'
import {
  X,
  MapPin,
  Clock,
  Radio,
  Camera,
  ShieldAlert,
  Activity,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Power,
  Battery,
  BatteryCharging,
  Wifi
} from 'lucide-react'

export default function MarkerDetailModal({
  selectedItem,
  onClose,
  onAcknowledge,
  onResolve,
  onToggleSensor
}) {
  if (!selectedItem) return null

  const { itemType, data } = selectedItem

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            {itemType === 'event' ? (
              data.category === 'threat' ? (
                <ShieldAlert size={20} color="#ef4444" />
              ) : (
                <Activity size={20} color="#a855f7" />
              )
            ) : data.type === 'camera' ? (
              <Camera size={20} color="#06b6d4" />
            ) : (
              <Radio size={20} color="#10b981" />
            )}
            <h3>{itemType === 'event' ? data.title : data.name}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {itemType === 'event' ? (
            <>
              {/* Event Status Badges */}
              <div className="modal-badges-row">
                <span className={`threat-severity-badge ${data.priority}`}>
                  {data.priority.toUpperCase()} PRIORITY
                </span>
                <span className={`status-pill ${data.status}`}>
                  STATUS: {data.status.toUpperCase()}
                </span>
                <span className="simulated-badge">
                  Simulated Prototype Event
                </span>
              </div>

              {/* Event Description */}
              <p className="modal-description">{data.description}</p>

              {/* Metadata Grid */}
              <div className="modal-meta-grid">
                <div className="meta-item">
                  <span className="label">Event ID</span>
                  <span className="value event-id-cell">{data.id}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Detection Timestamp</span>
                  <span className="value">{data.timestamp} ({data.timeAgo})</span>
                </div>
                <div className="meta-item">
                  <span className="label">Monitoring Sensor</span>
                  <span className="value" style={{ color: '#38bdf8' }}>
                    {data.sensorId} ({data.sensorType})
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">Forest Zone</span>
                  <span className="value">{data.zoneName}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Simulated Coordinates</span>
                  <span className="value" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.coordinates.simulatedLat}°N, {data.coordinates.simulatedLng}°E (Grid: {Math.round(data.coordinates.x)}, {Math.round(data.coordinates.y)})
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">AI Confidence Level</span>
                  <span className="value" style={{ color: '#10b981', fontWeight: 700 }}>
                    {data.confidence !== null ? `${Math.round(data.confidence * 100)}% Model Match` : 'N/A (Hardware Telemetry)'}
                  </span>
                </div>
              </div>

              {/* Academic & Poaching Disclaimer Notice */}
              <div className="modal-disclaimer-box">
                <Info size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Ethical & Operational Notice:</strong> {data.disclaimer}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions-footer">
                {data.status === 'active' && (
                  <button
                    className="modal-btn ack"
                    onClick={() => {
                      onAcknowledge(data.id)
                      onClose()
                    }}
                  >
                    <CheckCircle size={15} />
                    <span>Acknowledge Threat Alert</span>
                  </button>
                )}

                {data.status === 'acknowledged' && (
                  <button
                    className="modal-btn resolve"
                    onClick={() => {
                      onResolve(data.id)
                      onClose()
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Mark Incident Investigated & Resolved</span>
                  </button>
                )}

                <button className="modal-btn secondary" onClick={onClose}>
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            <>
              {/* SENSOR DETAIL VIEW */}
              <div className="modal-badges-row">
                <span className={`status-pill ${data.status}`}>
                  {data.status.toUpperCase()}
                </span>
                <span className="simulated-badge">
                  {data.type.toUpperCase()} SENSOR NODE
                </span>
              </div>

              <div className="modal-meta-grid">
                <div className="meta-item">
                  <span className="label">Sensor ID</span>
                  <span className="value event-id-cell">{data.id}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Hardware Model</span>
                  <span className="value">{data.model}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Assigned Zone</span>
                  <span className="value">{data.zoneName}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Simulated Coordinates</span>
                  <span className="value" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.coordinates.simulatedLat}°N, {data.coordinates.simulatedLng}°E
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">Battery Telemetry</span>
                  <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {data.solarCharging ? <BatteryCharging size={14} color="#10b981" /> : <Battery size={14} />}
                    {data.battery}% {data.solarCharging ? '(Solar Active)' : '(Discharging)'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">Network & Last Ping</span>
                  <span className="value">
                    Signal {data.signalStrength} • {data.lastPing}
                  </span>
                </div>
              </div>

              {/* Simulation Disconnect / Reconnect Button */}
              <div className="modal-actions-footer" style={{ marginTop: '20px' }}>
                <button
                  className={`modal-btn ${data.status === 'online' ? 'disconnect-btn' : 'reconnect-btn'}`}
                  onClick={() => {
                    onToggleSensor(data.id)
                    onClose()
                  }}
                >
                  <Power size={15} />
                  <span>
                    {data.status === 'online' ? 'Simulate Disconnecting Sensor' : 'Simulate Reconnecting Sensor'}
                  </span>
                </button>

                <button className="modal-btn secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
