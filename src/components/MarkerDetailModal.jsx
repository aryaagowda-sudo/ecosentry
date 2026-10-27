import React, { useState } from 'react'
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
  Move,
  Edit2,
  Trash2,
  Save
} from 'lucide-react'

export default function MarkerDetailModal({
  selectedItem,
  onClose,
  onAcknowledge,
  onResolve,
  onToggleSensor,
  onRepositionEvent,
  onEditEvent,
  onDeleteEvent
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('high')
  const [editStatus, setEditStatus] = useState('active')

  if (!selectedItem) return null

  const { itemType, data } = selectedItem

  const startEditing = () => {
    setEditTitle(data.title || '')
    setEditDescription(data.description || '')
    setEditPriority(data.priority || 'high')
    setEditStatus(data.status || 'active')
    setIsEditing(true)
  }

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!editTitle.trim()) return

    onEditEvent?.({
      ...data,
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
      status: editStatus
    })
    setIsEditing(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-dialog-header">
          <div className="modal-dialog-title">
            {itemType === 'event' ? (
              data.icon ? (
                <span className="modal-title-emoji">{data.icon}</span>
              ) : data.category === 'threat' ? (
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
              {isEditing ? (
                /* Inline Edit Form */
                <form onSubmit={handleSaveEdit} className="modal-edit-form">
                  <div className="form-field-group">
                    <label>Incident Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field-group">
                      <label>Severity Level</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="informational">Informational</option>
                      </select>
                    </div>

                    <div className="form-field-group">
                      <label>Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="acknowledged">Under Investigation</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-action-sm primary-ack"
                    >
                      <Save size={11} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard View */
                <>
                  {/* Event Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`status-tag ${data.priority}`}>
                      {data.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className={`status-tag ${data.status}`}>
                      STATUS: {data.status.toUpperCase()}
                    </span>
                    {data.isManual ? (
                      <span
                        className="status-tag"
                        style={{
                          backgroundColor: 'rgba(2, 132, 199, 0.12)',
                          color: '#0284C7',
                          border: '1px solid rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        MANUAL INCIDENT
                      </span>
                    ) : (
                      <span
                        className="status-tag"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-standard)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        SENSOR TELEMETRY EVENT
                      </span>
                    )}
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
                        {data.timestamp} {data.timeAgo ? `(${data.timeAgo})` : ''}
                      </span>
                    </div>
                    {data.sensorId && (
                      <div className="meta-field">
                        <span className="lbl">Monitoring Node</span>
                        <span className="val" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
                          {data.sensorId} ({data.sensorType})
                        </span>
                      </div>
                    )}
                    <div className="meta-field">
                      <span className="lbl">Forest Sector</span>
                      <span className="val">{data.zoneName}</span>
                    </div>
                    <div className="meta-field" style={{ gridColumn: 'span 2' }}>
                      <span className="lbl">Spatial Coordinates</span>
                      <span className="val" style={{ fontFamily: 'var(--font-mono)' }}>
                        {data.coordinates.simulatedLat}°N, {data.coordinates.simulatedLng}°E (Grid: {Math.round(data.coordinates.x)}, {Math.round(data.coordinates.y)})
                      </span>
                    </div>
                    {data.confidence !== null && data.confidence !== undefined && (
                      <div className="meta-field">
                        <span className="lbl">Confidence</span>
                        <span className="val" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                          {Math.round(data.confidence * 100)}% Pattern Match
                        </span>
                      </div>
                    )}
                    {data.source && (
                      <div className="meta-field">
                        <span className="lbl">Report Source</span>
                        <span className="val">{data.source}</span>
                      </div>
                    )}
                  </div>

                  {/* Scientific & Academic Disclaimer */}
                  <div className="notice-box-warning">
                    <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      {data.disclaimer ||
                        'Operational incident recorded on reserve intelligence map. Field ranger inspection recommended.'}
                    </span>
                  </div>
                </>
              )}
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
            </>
          )}

          {/* Dialog Footer Actions */}
          <div className="modal-dialog-footer">
            {itemType === 'event' && !isEditing && (
              <>
                {/* Reposition Action */}
                <button
                  className="btn-action-sm"
                  onClick={() => {
                    onRepositionEvent?.(data)
                    onClose()
                  }}
                  title="Move marker to new position on the 3D terrain"
                >
                  <Move size={11} />
                  <span>Reposition</span>
                </button>

                {/* Edit Action */}
                <button
                  className="btn-action-sm"
                  onClick={startEditing}
                  title="Edit incident title, description, or severity"
                >
                  <Edit2 size={11} />
                  <span>Edit</span>
                </button>

                {/* Delete Action (Manual incidents) */}
                {data.isManual && (
                  <button
                    className="btn-action-sm danger"
                    onClick={() => {
                      if (window.confirm(`Delete incident "${data.title}"?`)) {
                        onDeleteEvent?.(data.id)
                        onClose()
                      }
                    }}
                    title="Remove this incident from map and history"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                )}

                {/* Acknowledge Action */}
                {data.status === 'active' && (
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

                {/* Resolve Action */}
                {data.status === 'acknowledged' && (
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
              </>
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

            {!isEditing && (
              <button className="btn-action-sm" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
