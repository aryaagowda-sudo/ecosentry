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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-dialog-header">
          <div className="modal-dialog-title">
            {itemType === 'event' ? (
              data.category === 'threat' ? (
                <ShieldAlert size={18} style={{ color: 'var(--accent-red)' }} />
              ) : (
                <Activity size={18} style={{ color: 'var(--accent-purple)' }} />
              )
            ) : data.type === 'camera' ? (
              <Camera size={18} style={{ color: 'var(--accent-teal)' }} />
            ) : (
              <Radio size={18} style={{ color: 'var(--accent-green)' }} />
            )}
            <span>{itemType === 'event' ? data.title : data.name}</span>
          </div>
          <button className="btn-modal-close" onClick={onClose} title="Close dialog">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-dialog-body">
          {itemType === 'event' ? (
            <>
              {/* Event Status Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className={`status-tag ${data.priority}`}>
                  {data.priority.toUpperCase()} PRIORITY
                </span>
                <span className={`status-tag ${data.status}`}>
                  STATUS: {data.status.toUpperCase()}
                </span>
                <span
                  className="status-tag"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-standard)',
                    color: 'var(--text-muted)'
                  }}
                >
                  SIMULATED PROTOTYPE EVENT
                </span>
              </div>

              {/* Event Description */}
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '4px 0' }}>
                {data.description}
              </p>

              {/* Metadata Grid */}
              <div className="modal-meta-grid">
                <div className="meta-field">
                  <span className="lbl">Event ID</span>
                  <span className="val code-id-cell">{data.id}</span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Detection Timestamp</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.timestamp} ({data.timeAgo})
                  </span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Monitoring Node</span>
                  <span className="val" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
                    {data.sensorId} ({data.sensorType})
                  </span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Forest Sector</span>
                  <span className="val">{data.zoneName}</span>
                </div>
                <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                  <span className="lbl">Simulated Spatial Coordinates</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.coordinates.simulatedLat}°N, {data.coordinates.simulatedLng}°E (Grid: {Math.round(data.coordinates.x)}, {Math.round(data.coordinates.y)})
                  </span>
                </div>
                {data.confidence !== null && (
                  <div className="meta-field">
                    <span className="lbl">AI Model Confidence</span>
                    <span className="val" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                      {Math.round(data.confidence * 100)}% Pattern Match
                    </span>
                  </div>
                )}
                {data.source && (
                  <div className="meta-field">
                    <span className="lbl">Classification Source</span>
                    <span className="val">{data.source}</span>
                  </div>
                )}
              </div>

              {/* Scientific & Academic Disclaimer */}
              <div className="notice-box-warning">
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  {data.disclaimer ||
                    'Simulated event generated for academic testing. Sound classification indicates acoustic similarity and does not confirm illegal poaching activity.'}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Sensor Node Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className={`status-tag ${data.status}`}>
                  {data.status.toUpperCase()}
                </span>
                <span
                  className="status-tag"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-standard)',
                    color: 'var(--text-muted)'
                  }}
                >
                  {data.type.toUpperCase()} NODE
                </span>
              </div>

              <div className="modal-meta-grid">
                <div className="meta-field">
                  <span className="lbl">Sensor ID</span>
                  <span className="val code-id-cell">{data.id}</span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Device Model</span>
                  <span className="val">{data.name}</span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Sector Placement</span>
                  <span className="val">{data.zoneName}</span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Last Heartbeat</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.lastPing}
                  </span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Battery & Solar</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.battery}% {data.solarCharging ? '(Solar Active)' : '(Battery Reserve)'}
                  </span>
                </div>
                <div className="meta-field">
                  <span className="lbl">Signal Strength</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.signalStrength}
                  </span>
                </div>
                <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                  <span className="lbl">Coordinates</span>
                  <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {data.coordinates.simulatedLat}°N, {data.coordinates.simulatedLng}°E
                  </span>
                </div>
              </div>

              {/* Hardware Specifications */}
              {data.specs && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Hardware Telemetry Specs
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {Object.entries(data.specs).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key}:</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dialog Footer Actions */}
          <div className="modal-dialog-footer">
            {itemType === 'event' && data.status === 'active' && (
              <button
                className="btn-action-sm primary-ack"
                onClick={() => {
                  onAcknowledge(data.id)
                  onClose()
                }}
              >
                <CheckCircle size={11} />
                <span>Acknowledge</span>
              </button>
            )}

            {itemType === 'event' && data.status === 'acknowledged' && (
              <button
                className="btn-action-sm primary-resolve"
                onClick={() => {
                  onResolve(data.id)
                  onClose()
                }}
              >
                <CheckCircle2 size={11} />
                <span>Resolve</span>
              </button>
            )}

            {itemType === 'sensor' && (
              <button
                className={`btn-sim-power ${data.status === 'online' ? 'disconnect' : 'reconnect'}`}
                onClick={() => {
                  onToggleSensor(data.id)
                  onClose()
                }}
              >
                <Power size={11} />
                <span>{data.status === 'online' ? 'Simulate Disconnect' : 'Simulate Reconnect'}</span>
              </button>
            )}

            <button className="btn-action-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
