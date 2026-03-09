function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function isWithinEllipse(relX, relY, centerX, centerY, radiusX, radiusY) {
  const dx = (relX - centerX) / radiusX;
  const dy = (relY - centerY) / radiusY;
  return dx * dx + dy * dy <= 1;
}

export function getCoverageCell(relX, relY, cols = 8, rows = 5) {
  const x = clamp01(relX);
  const y = clamp01(relY);
  const col = Math.min(cols - 1, Math.floor(x * cols));
  const row = Math.min(rows - 1, Math.floor(y * rows));
  return `${col}:${row}`;
}

export function getCoverageProgress(visitedCount, cols = 8, rows = 5) {
  const total = Math.max(1, cols * rows);
  return clamp01(visitedCount / total);
}

export function getFeedDeliveryProgress(deliveryCount, needed = 3) {
  return clamp01(deliveryCount / Math.max(1, needed));
}

export function isFeedTargetHit(relX, relY) {
  const x = clamp01(relX);
  const y = clamp01(relY);
  return isWithinEllipse(x, y, 0.5, 0.59, 0.18, 0.14);
}

export function isPlayTargetHit(relX, relY) {
  const x = clamp01(relX);
  const y = clamp01(relY);
  return isWithinEllipse(x, y, 0.5, 0.59, 0.24, 0.24);
}

export function getPlayTargetCell(relX, relY, cols = 6, rows = 6) {
  const minX = 0.26;
  const maxX = 0.74;
  const minY = 0.34;
  const maxY = 0.82;
  const x = clamp01((clamp01(relX) - minX) / (maxX - minX));
  const y = clamp01((clamp01(relY) - minY) / (maxY - minY));
  const col = Math.min(cols - 1, Math.floor(x * cols));
  const row = Math.min(rows - 1, Math.floor(y * rows));
  return `${col}:${row}`;
}
