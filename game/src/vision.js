// Vision: what a guard or a camera can see. A detector sees the thief when
// the thief is inside its cone, close enough, and the straight line between
// them is not cut by a wall, a display case or a pillar. Smoke blocks sight
// outright; a shadow zone shrinks the range at which the thief counts.

import { GUARD, CAMERA, ALARM } from './config.js';

/** True when the segment (x1,y1)-(x2,y2) crosses the rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when no obstacle stands between (x1,y1) and (x2,y2). */
export function lineOfSightClear(x1, y1, x2, y2, obstacles) {
  for (let i = 0; i < obstacles.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, obstacles[i])) return false;
  }
  return true;
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * Is the thief inside this detector's cone right now? Returns
 * { seen, dist } — seen is false in smoke, past the range, outside the cone
 * or behind an obstacle. `kind` is 'guard' or 'camera'; `inShadow` shrinks
 * the effective range, since a crouched thief is hard to pick out.
 */
export function coneSees(detector, kind, tx, ty, obstacles, smoke, inShadow) {
  const range = kind === 'guard' ? GUARD.coneRange : CAMERA.range;
  const half = kind === 'guard' ? GUARD.coneHalf : CAMERA.coneHalf;
  const dx = tx - detector.x;
  const dy = ty - detector.y;
  const dist = Math.hypot(dx, dy);
  const effectiveRange = inShadow ? Math.min(range, 105) : range;
  if (dist > effectiveRange) return { seen: false, dist };
  if (angleDiff(Math.atan2(dy, dx), detector.angle) > half) return { seen: false, dist };
  for (let i = 0; i < smoke.length; i += 1) {
    const cloud = smoke[i];
    if (Math.hypot(tx - cloud.x, ty - cloud.y) < cloud.r) return { seen: false, dist };
  }
  if (!lineOfSightClear(detector.x, detector.y, tx, ty, obstacles)) return { seen: false, dist };
  return { seen: true, dist };
}

/** Alarm points per second for a sighting at this distance. */
export function alarmRate(kind, dist, inShadow) {
  const base = kind === 'guard' ? ALARM.guardRate : ALARM.cameraRate;
  let rate = base * (dist < 120 ? ALARM.closeMult : 1);
  if (inShadow) rate *= ALARM.shadowMult;
  return rate;
}
