import React from 'react'
import { Activity, ArrowRight, Eye, Camera, Radio } from 'lucide-react'

export default function WildlifeSummaryTable({ events, zones, onNavigateToWildlife, onInspectEvent }) {
  // Filter for wildlife sightings or boundary crossings
  const wildlifeSightings = events.filter(
    (e) => e.category === 'wildlife' || e.type === 'animal_boundary_crossing'
  )

  // Format species name cleanly
  const extractSpecies = (title) => {
    if (title.includes('Tiger')) return 'Bengal Tiger'
    if (title.includes('Elephant')) return 'Asian Elephant'
    if (title.includes('Leopard')) return 'Indian Leopard'
    if (title.includes('Deer')) return 'Spotted Chital'
    return title.split('(')[0].trim()
  }

  return (
    <div className="wildlife-summary-card">
      <div className="panel-card-header">
        <div>
          <div className="panel-header-title-row">
            <h3 className="panel-title">Wildlife detections</h3>
            <span className="kpi-badge neutral">
              <Activity size={11} />
              {wildlifeSightings.length} Logged
            </span>
          </div>
          <p className="panel-subtitle">Optical and acoustic logged fauna across reserve sectors</p>
        </div>

        <button
          className="btn-text-link"
          onClick={onNavigateToWildlife}
          title="Open full wildlife sighting directory"
        >
          <span>Full log</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="summary-table-container">
        <table className="summary-data-table">
          <thead>
            <tr>
              <th>Species</th>
              <th>Sector</th>
              <th>Sensor Source</th>
              <th>AI Match</th>
              <th>Observed</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {wildlifeSightings.slice(0, 5).map((sighting) => {
              const zone = zones.find((z) => z.id === sighting.zoneId)
              const species = extractSpecies(sighting.title)
              const isCamera = sighting.sensorType === 'camera' || sighting.sensorId.startsWith('CAM')

              return (
                <tr key={sighting.id} className="summary-table-row">
                  <td>
                    <div className="species-cell">
                      <div className="species-dot" />
                      <span className="species-name">{species}</span>
                    </div>
                  </td>
                  <td>
                    <span className="zone-tag-mini">{zone?.name ? zone.name.split(':')[0] : sighting.zoneId}</span>
                  </td>
                  <td>
                    <div className="source-sensor-cell">
                      {isCamera ? (
                        <Camera size={12} style={{ color: 'var(--accent-teal)' }} />
                      ) : (
                        <Radio size={12} style={{ color: 'var(--accent-blue)' }} />
                      )}
                      <span>{sighting.sensorId}</span>
                    </div>
                  </td>
                  <td>
                    <span className="match-pill">
                      {sighting.confidence ? `${Math.round(sighting.confidence * 100)}%` : 'Bio-acoustic'}
                    </span>
                  </td>
                  <td>
                    <span className="time-text">{sighting.timeAgo || 'Recent'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-inspect-mini"
                      onClick={() => onInspectEvent(sighting)}
                      title="Inspect sighting details"
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer-disclaimer">
        <span>Optical and acoustic classifications are unverified until confirmed by a field ranger.</span>
      </div>
    </div>
  )
}
