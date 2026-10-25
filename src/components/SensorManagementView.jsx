import React, { useState } from 'react'
import {
  Radio,
  Camera,
  Wifi,
  WifiOff,
  BatteryCharging,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Info,
  Power
} from 'lucide-react'

export default function SensorManagementView({
  sensors,
  zones,
  onToggleSensor,
  onInspectSensor
}) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')

  const filteredSensors = sensors.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (zoneFilter !== 'all' && s.zoneId !== zoneFilter) return false
    return true
  })

  const onlineCount = sensors.filter((s) => s.status === 'online').length
  const offlineCount = sensors.length - onlineCount

  return (
    <div className="data-panel-card">
      {/* Header Toolbar */}
      <div className="data-panel-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 className="data-panel-title">
            <Radio size={16} style={{ color: 'var(--accent-green)' }} />
            <span>Sensor Grid Telemetry & Hardware Control</span>
          </h3>
          <span className="kpi-badge neutral" style={{ fontFamily: 'var(--font-mono)' }}>
            {onlineCount} Online • {offlineCount} Disconnected
          </span>
        </div>

        {/* Filters */}
        <div className="table-controls-cluster">
          <select
            className="control-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            title="Filter by sensor hardware type"
          >
            <option value="all">All Sensor Types</option>
            <option value="camera">Camera Traps</option>
            <option value="acoustic">Acoustic Audio Nodes</option>
          </select>

          <select
            className="control-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter by connection status"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline / Disconnected</option>
          </select>

          <select
            className="control-select"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            title="Filter by forest sector"
          >
            <option value="all">All Sectors</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hardware Telemetry Notice */}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}
      >
        <Info size={13} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
        <span>
          <strong>Telemetry Simulation Control:</strong> Use the power controls below to simulate a sensor losing signal or recovering network connectivity. Sensor failures are classified strictly as hardware telemetry events and kept separate from poaching threat classifications.
        </span>
      </div>

      {/* Responsive Table */}
      <div className="table-wrapper-responsive">
        <table className="standard-data-table">
          <thead>
            <tr>
              <th>Sensor ID</th>
              <th>Hardware Type & Model</th>
              <th>Sector Location</th>
              <th>Simulated Coordinates</th>
              <th>Power & Battery</th>
              <th>Signal & Last Heartbeat</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Hardware Simulation</th>
            </tr>
          </thead>
          <tbody>
            {filteredSensors.map((sensor) => {
              const isOnline = sensor.status === 'online'
              const isCamera = sensor.type === 'camera'

              return (
                <tr key={sensor.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="code-id-cell">{sensor.id}</span>
                      {isCamera ? (
                        <Camera size={13} style={{ color: 'var(--accent-teal)' }} />
                      ) : (
                        <Radio size={13} style={{ color: 'var(--accent-green)' }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sensor.name}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {sensor.specs?.resolution || sensor.specs?.frequencyRange || 'Sensory Array'}
                      </span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{sensor.zoneName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {sensor.coordinates.simulatedLat}°N, {sensor.coordinates.simulatedLng}°E
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sensor.solarCharging ? (
                        <BatteryCharging size={13} style={{ color: 'var(--accent-green)' }} />
                      ) : (
                        <Battery
                          size={13}
                          style={{
                            color: sensor.battery < 25 ? 'var(--accent-red)' : 'var(--text-secondary)'
                          }}
                        />
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{sensor.battery}%</span>
                      {sensor.solarCharging && (
                        <span style={{ fontSize: '10px', color: 'var(--accent-green)' }}>
                          Solar Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {sensor.signalStrength}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {sensor.lastPing}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-tag ${isOnline ? 'online' : 'offline'}`}>
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className={`btn-sim-power ${isOnline ? 'disconnect' : 'reconnect'}`}
                        onClick={() => onToggleSensor(sensor.id)}
                        title={
                          isOnline
                            ? `Simulate signal disconnect for ${sensor.id}`
                            : `Simulate reconnect for ${sensor.id}`
                        }
                      >
                        <Power size={11} />
                        <span>{isOnline ? 'Disconnect' : 'Reconnect'}</span>
                      </button>

                      <button
                        className="btn-action-sm"
                        onClick={() => onInspectSensor(sensor)}
                        title="View sensor telemetry specs"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
