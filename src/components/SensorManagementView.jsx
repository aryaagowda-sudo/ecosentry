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
  MapPin,
  RefreshCw,
  Power,
  Sliders
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
    <div className="sensor-mgmt-container">
      {/* Header */}
      <div className="events-table-header">
        <div className="events-header-left">
          <h2>
            <Radio size={18} color="#10b981" />
            <span>IoT Sensor Grid Telemetry & Hardware Control</span>
          </h2>
          <span className="events-count-badge">
            {onlineCount} Online • {offlineCount} Disconnected
          </span>
        </div>

        {/* Filters */}
        <div className="events-table-controls">
          <select
            className="filter-select compact"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Sensor Types</option>
            <option value="camera">Camera Traps</option>
            <option value="acoustic">Acoustic Audio Nodes</option>
          </select>

          <select
            className="filter-select compact"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline / Disconnected</option>
          </select>

          <select
            className="filter-select compact"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="all">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hardware Telemetry Notice */}
      <div className="panel-disclaimer-banner" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
        <Info size={14} color="#06b6d4" />
        <span>
          <strong>Telemetry Simulation Control:</strong> Use the buttons below to simulate a sensor losing signal or recovering connectivity. Sensor failures are classified as hardware telemetry events and are kept strictly isolated from poaching threat classifications.
        </span>
      </div>

      {/* Sensor Grid Cards / Table */}
      <div className="table-responsive">
        <table className="events-table">
          <thead>
            <tr>
              <th>Sensor ID</th>
              <th>Type & Model</th>
              <th>Zone Location</th>
              <th>Simulated Coordinates</th>
              <th>Battery & Power</th>
              <th>Signal & Ping</th>
              <th>Current Status</th>
              <th>Simulation Control</th>
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
                      <span className="event-id-cell">{sensor.id}</span>
                    </div>
                  </td>
                  <td>
                    <div className="event-type-badge">
                      {isCamera ? <Camera size={14} color="#06b6d4" /> : <Radio size={14} color="#10b981" />}
                      <div>
                        <div>{sensor.name}</div>
                        <span style={{ fontSize: '11px', color: '#64746b' }}>{sensor.model}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', color: '#e2e8f0' }}>{sensor.zoneName}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#94a39b' }}>
                      {sensor.coordinates.simulatedLat}°N, {sensor.coordinates.simulatedLng}°E
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sensor.solarCharging ? (
                        <BatteryCharging size={15} color="#10b981" />
                      ) : (
                        <Battery size={15} color={sensor.battery < 20 ? '#ef4444' : '#f59e0b'} />
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: sensor.battery < 20 ? '#ef4444' : '#fff' }}>
                        {sensor.battery}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: isOnline ? '#34d399' : '#ef4444' }}>
                        {sensor.signalStrength}
                      </span>
                      <div style={{ fontSize: '10.5px', color: '#64746b' }}>{sensor.lastPing}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${isOnline ? 'normal' : 'critical'}`}>
                      {isOnline ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {sensor.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn-simulate-toggle ${isOnline ? 'disconnect' : 'reconnect'}`}
                        onClick={() => onToggleSensor(sensor.id)}
                        title={isOnline ? 'Simulate hardware disconnect / telemetry failure' : 'Simulate sensor reconnecting'}
                      >
                        <Power size={13} />
                        <span>{isOnline ? 'Simulate Disconnect' : 'Simulate Reconnect'}</span>
                      </button>

                      <button
                        className="btn-inspect"
                        onClick={() => onInspectSensor(sensor)}
                        title="View sensor telemetry specs"
                      >
                        Specs
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
