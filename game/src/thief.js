// The thief: movement, collision with the room, click-to-move, and the
// position history the rewind reads back. The history is a ring of snapshots
// taken every 0.1 seconds, ten seconds deep.

import { FIELD, HUD_H, THIEF } from './config.js';
import { circleHitsObstacle, WALL } from './level.js';

/** A fresh thief at the entry door. */
export function createThief(start) {
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    moving: false,
    target: null, // click-to-move destination, or null
    history: [], // { t, x, y } newest last
    historyTimer: 0,
  };
}

function clampToRoom(thief) {
  thief.x = Math.max(WALL + THIEF.radius, Math.min(FIELD.width - WALL - THIEF.radius, thief.x));
  thief.y = Math.max(HUD_H + WALL + THIEF.radius, Math.min(FIELD.height - WALL - THIEF.radius, thief.y));
}

/**
 * Move the thief one step. `mx, my` is the keyboard direction (-1..1 each);
 * when it is zero and a click target is set, the thief walks to the target.
 * Returns true when the thief actually moved.
 */
export function moveThief(thief, dt, mx, my, obstacles) {
  let dx = mx;
  let dy = my;
  if (dx === 0 && dy === 0 && thief.target) {
    const tx = thief.target.x - thief.x;
    const ty = thief.target.y - thief.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      thief.target = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  if (dx === 0 && dy === 0) {
    thief.moving = false;
    return false;
  }
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  thief.angle = Math.atan2(dy, dx);
  const step = THIEF.speed * dt;
  const nx = thief.x + dx * step;
  const ny = thief.y + dy * step;
  // Slide along walls: try the full move, then each axis on its own. A convex
  // corner can wedge the thief when all three fail (the circle sits in the
  // corner's pocket); then try the two perpendicular directions, which is
  // the way around the corner instead of into it.
  if (!circleHitsObstacle(nx, ny, THIEF.radius, obstacles)) {
    thief.x = nx;
    thief.y = ny;
  } else if (!circleHitsObstacle(nx, thief.y, THIEF.radius, obstacles)) {
    thief.x = nx;
  } else if (!circleHitsObstacle(thief.x, ny, THIEF.radius, obstacles)) {
    thief.y = ny;
  } else if (!circleHitsObstacle(thief.x - dy * step, thief.y + dx * step, THIEF.radius, obstacles)) {
    thief.x -= dy * step;
    thief.y += dx * step;
  } else if (!circleHitsObstacle(thief.x + dy * step, thief.y - dx * step, THIEF.radius, obstacles)) {
    thief.x += dy * step;
    thief.y -= dx * step;
  }
  clampToRoom(thief);
  thief.moving = true;
  return true;
}

/** Record the thief's position into the rewind history, every 0.1s. */
export function recordThiefHistory(thief, time, dt) {
  thief.historyTimer += dt;
  if (thief.historyTimer < 0.1) return;
  thief.historyTimer = 0;
  thief.history.push({ t: time, x: thief.x, y: thief.y });
  while (thief.history.length > 100) thief.history.shift();
}

/**
 * The ghost trail of a rewind: every recorded position between `fromTime`
 * and `toTime`, oldest first, for drawing the path the thief is undoing.
 */
export function ghostTrailBetween(thief, fromTime, toTime) {
  const trail = [];
  for (let i = 0; i < thief.history.length; i += 1) {
    const p = thief.history[i];
    if (p.t >= fromTime && p.t <= toTime) trail.push({ x: p.x, y: p.y });
  }
  return trail;
}
