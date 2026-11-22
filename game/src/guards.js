// Guards: patrols that walk a loop of waypoints and face where they walk.
// When the alarm is high they hurry and their cones burn brighter — the
// player reads the patrol before moving, which is the whole game.

import { GUARD } from './config.js';

/** A fresh guard on its first waypoint, facing the next one. */
export function createGuard(spec) {
  const first = spec.waypoints[0];
  const second = spec.waypoints[1] ?? spec.waypoints[0];
  return {
    name: spec.name,
    waypoints: spec.waypoints,
    wpIndex: 1 % spec.waypoints.length,
    x: first.x,
    y: first.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    alerted: false,
  };
}

/** Walk one step toward the current waypoint; face the direction of travel. */
export function stepGuard(guard, dt, alerted) {
  const speed = alerted ? GUARD.alertSpeed : GUARD.speed;
  const target = guard.waypoints[guard.wpIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  guard.alerted = alerted;
  if (dist < 4) {
    guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
    return;
  }
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  const wanted = Math.atan2(dy, dx);
  // Turn toward the walk direction instead of snapping.
  let diff = wanted - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  guard.angle += turn;
}
