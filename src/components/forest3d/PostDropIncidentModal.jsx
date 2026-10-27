import React, { useState } from 'react'
import {
  MapPin,
  Clock,
  ShieldAlert,
  AlertTriangle,
  X,
  Check,
  Compass,
  FileText,
  UserCheck
} from 'lucide-react'
import { SEVERITY_LEVELS } from '../../data/toolboxEvents'

export default function PostDropIncidentModal({
  pendingDrop,
  onConfirm,
  onCancel
}) {
  if (!pendingDrop) return null

  const { item, zone, gridCoords, latLng, timestamp } = pendingDrop

  // Editable form fields prepopulated from the dropped item
  const [title, setTitle] = useState(item.title || 'New Incident')
  const [description, setDescription] = useState(item.defaultDescription || '')
  const [severity, setSeverity] = useState(item.defaultSeverity || 'high')
  const [status, setStatus] = useState('active')
  const [category, setCategory] = useState(item.category || 'threat')
  const [source, setSource] = useState('Manual Field Report')
  const [error, setError] = useState('')

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide an incident title.')
      return
    }

    const newIncident = {
      id: `EVT-MAN-${Date.now().toString().slice(-4)}`,
      type: item.type || 'manual_incident',
      category: category,
      title: title.trim(),
      description: description.trim() || `Field incident logged at ${zone.name}.`,
      icon: item.icon || '📍',
      zoneId: zone.id,
      zoneName: zone.name,
      coordinates: {
        x: Number(gridCoords.x.toFixed(1)),
        y: Number(gridCoords.y.toFixed(1)),
        simulatedLat: latLng.simulatedLat,
        simulatedLng: latLng.simulatedLng
      },
      timestamp: timestamp,
      timeAgo: 'Just now',
      confidence: 1.0, // Confirmed manual entry
      priority: severity,
      status: status,
      source: source,
      isManual: true,
      disclaimer: 'Manual incident logged by reserve operations command via 3D interactive placement.'
    }

    onConfirm(newIncident)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="post-drop-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="post-drop-modal-header">
          <div className="header-left">
            <span className="incident-icon-pill">{item.icon}</span>
            <div>
              <h3>Log Incident on Reserve Map</h3>
              <p>Dropped on {zone.name}</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onCancel} title="Cancel placement">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleFormSubmit} className="post-drop-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Title */}
          <div className="form-field-group">
            <label>Incident Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError('')
              }}
              required
              autoFocus
            />
          </div>

          {/* Severity & Category Row */}
          <div className="form-grid-2">
            <div className="form-field-group">
              <label>Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className={`severity-select ${severity}`}
              >
                <option value="critical">Critical (Red)</option>
                <option value="high">High (Orange)</option>
                <option value="medium">Medium (Yellow)</option>
                <option value="low">Low (Blue)</option>
                <option value="informational">Informational (Green)</option>
              </select>
            </div>

            <div className="form-field-group">
              <label>Initial Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active (Immediate Dispatch)</option>
                <option value="acknowledged">Under Investigation</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-field-group">
            <label>Operational Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe evidence, animal condition, suspected count, or action needed..."
            />
          </div>

          {/* Source & Category */}
          <div className="form-grid-2">
            <div className="form-field-group">
              <label>Report Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="Manual Field Report">Manual Ranger Report</option>
                <option value="Drone Reconnaissance">Drone Reconnaissance</option>
                <option value="Community Hotline">Community / Buffer Hotline</option>
                <option value="Acoustic Triangulation">Acoustic Triangulation</option>
                <option value="Camera Trap Inspection">Camera Trap Inspection</option>
              </select>
            </div>

            <div className="form-field-group">
              <label>Domain Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="threat">Poaching & Threat</option>
                <option value="wildlife">Wildlife & Welfare</option>
                <option value="operations">Operations & Hardware</option>
                <option value="general">General Observation</option>
              </select>
            </div>
          </div>

          {/* Location & Coordinates Readout Card */}
          <div className="location-readout-card">
            <div className="readout-row">
              <div className="readout-item">
                <Compass size={13} className="readout-icon" />
                <span className="lbl">Sector:</span>
                <span className="val">{zone.name}</span>
              </div>
              <div className="readout-item">
                <Clock size={13} className="readout-icon" />
                <span className="lbl">Logged:</span>
                <span className="val">{timestamp}</span>
              </div>
            </div>

            <div className="readout-row">
              <div className="readout-item">
                <MapPin size={13} className="readout-icon" />
                <span className="lbl">Grid:</span>
                <span className="val font-mono">
                  ({Math.round(gridCoords.x)}, {Math.round(gridCoords.y)})
                </span>
              </div>
              <div className="readout-item">
                <span className="lbl">GPS:</span>
                <span className="val font-mono">
                  {latLng.simulatedLat}°N, {latLng.simulatedLng}°E
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="post-drop-actions">
            <button
              type="button"
              className="btn-action-cancel"
              onClick={onCancel}
            >
              Cancel Placement
            </button>
            <button
              type="submit"
              className="btn-action-confirm"
            >
              <Check size={14} />
              <span>Confirm & Place Marker</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
