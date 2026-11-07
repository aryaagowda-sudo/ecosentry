import { Play, Pause } from 'lucide-react'

/**
 * Bottom Status HUD Overlay for the Tactical Map
 * 
 * Shows current packet route, hop progress, transmission state,
 * and animation playback controls.
 */
export default function TacticalBottomOverlay({
  currentPacket,
  stats,
  isPaused = false,
  speedMultiplier = 1.0,
  onTogglePause,
  onChangeSpeed
}) {
  const hasPacket = Boolean(currentPacket)
  const pathStr = currentPacket?.path?.join(' → ') || 'IDLE (Awaiting Acoustic Threat)'

  const status = currentPacket?.status?.toUpperCase() || 'STANDBY'
  let statusBadgeClass = 'neutral'
  if (status === 'IN_TRANSIT') statusBadgeClass = 'cyan'
  else if (status === 'REROUTING') statusBadgeClass = 'amber'
  else if (status === 'DELIVERED') statusBadgeClass = 'green'
  else if (status === 'QUEUED') statusBadgeClass = 'purple'
  else if (status === 'UNDELIVERABLE') statusBadgeClass = 'red'

  const currentHop = (currentPacket?.currentHopIndex ?? 0) + 1
  const totalHops = currentPacket?.totalHops || 1

  return (
    <div className="tactical-bottom-overlay">
      {/* 1. Network Topology Summary Tag */}
      <div className="topology-summary">
        <span className="topology-label">MESH TOPOLOGY:</span>
        <span className="topology-val">
          {stats?.totalSensors || 0} SENSORS • {stats?.activeLinks || 0} LINKS • BASE AT (88, 12)
        </span>
      </div>

      {/* 2. Primary Route HUD Card */}
      <div className="route-telemetry-cluster">
        <div className="route-main-line">
          <span className="route-label">
            {hasPacket ? `PACKET ${currentPacket.id}:` : 'ROUTING CHANNEL:'}
          </span>
          <span className="route-path-string">{pathStr}</span>
        </div>

        {hasPacket && (
          <div className="route-meta-row">
            <span className={`status-pill ${statusBadgeClass}`}>
              STATUS: {status.replace('_', ' ')}
            </span>

            {status === 'IN_TRANSIT' || status === 'REROUTING' ? (
              <span className="hop-counter">
                HOP {currentHop} / {totalHops} (Next: {currentPacket.nextNode || 'BASE'})
              </span>
            ) : null}

            {currentPacket.routeCost > 0 && (
              <span className="cost-counter">
                COST: {currentPacket.routeCost} SIMULATED UNITS
              </span>
            )}

            {currentPacket.rerouteReason && (
              <span className="reroute-note">[{currentPacket.rerouteReason}]</span>
            )}
          </div>
        )}
      </div>

      {/* 3. Animation Playback Controls */}
      <div className="playback-controls">
        <button
          className="btn-playback-toggle"
          onClick={onTogglePause}
          title={isPaused ? 'Resume Packet Simulation' : 'Pause Packet Simulation'}
        >
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
          <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
        </button>

        <div className="speed-buttons">
          {[0.5, 1.0, 2.0, 4.0].map((spd) => (
            <button
              key={spd}
              className={`btn-speed ${speedMultiplier === spd ? 'active' : ''}`}
              onClick={() => onChangeSpeed?.(spd)}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
