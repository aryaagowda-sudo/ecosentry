/**
 * EcoSentry Tactical Routing - Smart Sensor Inspector Popup Positioning
 * 
 * Rules:
 * 1. Keep popup fully within visible tactical map viewport [minX..maxX, minY..maxY].
 * 2. Never cover the selected sensor itself.
 * 3. Avoid placing popup in the center of the terrain (where nodes/links converge).
 * 4. Avoid covering Base Station and active Incident marker.
 * 5. If near-sensor placement is obstructed, reposition to the nearest clean corner of the map.
 * 
 * @param {Object} params
 * @param {Object} params.screenPos Screen tracker projection data
 * @param {number} [params.popupWidth=240]
 * @param {number} [params.popupHeight=200]
 * @returns {{ left: string, top: string }} CSS position strings
 */
export function calculateSmartPopupPosition({
  screenPos,
  popupWidth = 240,
  popupHeight = 200
}) {
  if (!screenPos || typeof screenPos.canvasWidth !== 'number' || typeof screenPos.canvasHeight !== 'number') {
    return { left: '20px', top: '65px' }
  }

  const W = screenPos.canvasWidth
  const H = screenPos.canvasHeight

  // Safe viewport boundaries
  const paddingX = 16
  const minX = paddingX
  const maxX = Math.max(minX, W - popupWidth - paddingX)

  const minY = 55 // Clear space for top controls (e.g. SHOW INCIDENT button)
  const maxY = Math.max(minY, H - popupHeight - 45) // Clear space for bottom telemetry bar

  const sx = screenPos.x
  const sy = screenPos.y

  // Central terrain bounding zone where sensor clustering & mesh links are densest
  const centerZone = {
    xMin: W * 0.28,
    xMax: W * 0.72,
    yMin: H * 0.25,
    yMax: H * 0.75
  }

  const overlapsPoint = (rect, px, py, radius = 22) => {
    return (
      rect.x - radius <= px &&
      px <= rect.x + rect.width + radius &&
      rect.y - radius <= py &&
      py <= rect.y + rect.height + radius
    )
  }

  // 1. Local candidate positions adjacent to the sensor
  const localCandidates = [
    { id: 'local-right', x: sx + 28, y: Math.max(minY, Math.min(maxY, sy - popupHeight * 0.45)), isCorner: false },
    { id: 'local-left', x: sx - popupWidth - 28, y: Math.max(minY, Math.min(maxY, sy - popupHeight * 0.45)), isCorner: false },
    { id: 'local-top-right', x: sx + 24, y: sy - popupHeight - 22, isCorner: false },
    { id: 'local-top-left', x: sx - popupWidth - 24, y: sy - popupHeight - 22, isCorner: false },
    { id: 'local-bottom-right', x: sx + 24, y: sy + 24, isCorner: false },
    { id: 'local-bottom-left', x: sx - popupWidth - 24, y: sy + 24, isCorner: false }
  ]

  // 2. Corner candidate positions (Alternative Positioning when near-sensor causes obstruction)
  const cornerCandidates = [
    { id: 'corner-top-left', x: minX, y: minY, isCorner: true },
    { id: 'corner-bottom-left', x: minX, y: maxY, isCorner: true },
    { id: 'corner-top-right', x: maxX, y: minY, isCorner: true },
    { id: 'corner-bottom-right', x: maxX, y: maxY, isCorner: true }
  ]

  const allCandidates = [...localCandidates, ...cornerCandidates]
  const maxCanvasDiagonal = Math.sqrt(W * W + H * H) || 1000

  let bestRect = null
  let bestScore = Infinity

  for (const cand of allCandidates) {
    // Clamp to viewport
    const clampedX = Math.max(minX, Math.min(maxX, cand.x))
    const clampedY = Math.max(minY, Math.min(maxY, cand.y))

    const rect = {
      x: clampedX,
      y: clampedY,
      width: popupWidth,
      height: popupHeight
    }

    let penalty = 0

    // Rule 1: NEVER cover the selected sensor!
    if (overlapsPoint(rect, sx, sy, 22)) {
      penalty += 100000
    }

    // Rule 2: DO NOT cover the Base Station
    if (screenPos.baseScreenPos && overlapsPoint(rect, screenPos.baseScreenPos.x, screenPos.baseScreenPos.y, 25)) {
      penalty += 50000
    }

    // Rule 3: DO NOT cover the active Incident marker
    if (screenPos.incidentScreenPos && overlapsPoint(rect, screenPos.incidentScreenPos.x, screenPos.incidentScreenPos.y, 30)) {
      penalty += 50000
    }

    // Rule 4: Avoid covering other sensors on the terrain
    if (Array.isArray(screenPos.otherSensorsPos)) {
      for (const other of screenPos.otherSensorsPos) {
        if (overlapsPoint(rect, other.x, other.y, 14)) {
          penalty += 8000
        }
      }
    }

    // Rule 5: Avoid the dense center of the 3D diorama terrain
    const overlapLeft = Math.max(rect.x, centerZone.xMin)
    const overlapRight = Math.min(rect.x + rect.width, centerZone.xMax)
    const overlapTop = Math.max(rect.y, centerZone.yMin)
    const overlapBottom = Math.min(rect.y + rect.height, centerZone.yMax)

    if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
      const centerOverlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
      const popupArea = popupWidth * popupHeight
      penalty += (centerOverlapArea / popupArea) * 15000
    }

    // Rule 6: Proximity preference (closer to sensor is preferred if unobscured)
    const rectCenterX = rect.x + popupWidth / 2
    const rectCenterY = rect.y + popupHeight / 2
    const distToSensor = Math.sqrt(Math.pow(rectCenterX - sx, 2) + Math.pow(rectCenterY - sy, 2))
    penalty += (distToSensor / maxCanvasDiagonal) * 300

    // Small bias for corners: if local is clean, keep local. If local is obstructed, corner wins easily.
    if (cand.isCorner) {
      penalty += 120
    }

    if (penalty < bestScore) {
      bestScore = penalty
      bestRect = rect
    }
  }

  if (!bestRect) {
    bestRect = { x: minX, y: minY, width: popupWidth, height: popupHeight }
  }

  return {
    left: `${Math.round(bestRect.x)}px`,
    top: `${Math.round(bestRect.y)}px`
  }
}

/**
 * Identifies background sensor label IDs that visually intersect the sensor popup rectangle.
 * 
 * @param {Object} params
 * @param {Object} params.screenPos Screen tracker projection data with otherSensorsPos
 * @param {Object} [params.popupPos=null] Optional precalculated popup position { left, top }
 * @param {number} [params.popupWidth=240]
 * @param {number} [params.popupHeight=200]
 * @param {number} [params.padding=15]
 * @returns {Array<string>} Array of sensor IDs whose labels should be suppressed
 */
export function getSuppressedSensorLabelIds({
  screenPos,
  popupPos = null,
  popupWidth = 240,
  popupHeight = 200,
  padding = 15
}) {
  if (!screenPos || !Array.isArray(screenPos.otherSensorsPos) || !screenPos.canvasWidth || !screenPos.canvasHeight) {
    return []
  }

  const pos = popupPos || calculateSmartPopupPosition({
    screenPos,
    popupWidth,
    popupHeight
  })

  const left = parseInt(pos.left, 10)
  const top = parseInt(pos.top, 10)
  const right = left + popupWidth
  const bottom = top + popupHeight

  return screenPos.otherSensorsPos
    .filter((s) => (
      (!screenPos.id || s.id !== screenPos.id) &&
      s.x >= left - padding &&
      s.x <= right + padding &&
      s.y >= top - padding &&
      s.y <= bottom + padding
    ))
    .map((s) => s.id)
}
