// The museum floor: one big room with three routes from the entry door to
// the vault, drawn as rectangles the thief, the guards and every sightline
// must respect. Cover is the shadow zones; loot is the diamond, three gold
// bars and one painting; the getaway door is the exit once the diamond is
// taken. Guard routes are straight lines between waypoints that never cross
// an obstacle, so patrols never need to steer around furniture.

import { HUD_H } from './config.js';

/** The outer wall, as four rectangles (top, right, bottom, left). */
export const WALL = 14;

export function buildLevel() {
  const top = HUD_H + WALL;
  const obstacles = [
    // Display cases: the three routes run between them.
    { x: 300, y: 180, w: 150, h: 60, kind: 'case', label: 'JADE' },
    { x: 560, y: 150, w: 170, h: 60, kind: 'case', label: 'PORCELAIN' },
    { x: 830, y: 300, w: 60, h: 170, kind: 'case', label: 'SILVER' },
    { x: 240, y: 430, w: 150, h: 60, kind: 'case', label: 'COINS' },
    { x: 980, y: 520, w: 170, h: 60, kind: 'case', label: 'RELIQUARY' },
    // Pillars in the middle of the hall.
    { x: 480, y: 380, w: 46, h: 46, kind: 'pillar' },
    { x: 760, y: 420, w: 46, h: 46, kind: 'pillar' },
    // The vault pedestal the diamond sits on.
    { x: 1120, y: 118, w: 64, h: 40, kind: 'pedestal' },
  ];

  // Shadow zones: standing in one, a guard has to be almost on top of the
  // thief to spot them. Each one sits beside a route, never on it.
  const shadows = [
    { x: 150, y: 120, w: 130, h: 90, label: 'SHADOW' },
    { x: 560, y: 480, w: 150, h: 90, label: 'SHADOW' },
    { x: 1000, y: 250, w: 120, h: 80, label: 'SHADOW' },
    { x: 880, y: 600, w: 130, h: 80, label: 'SHADOW' },
  ];

  const loot = [
    { id: 'diamond', kind: 'diamond', x: 1152, y: 138, value: 5000, taken: false },
    { id: 'gold1', kind: 'gold', x: 375, y: 252, value: 400, taken: false },
    { id: 'gold2', kind: 'gold', x: 645, y: 252, value: 400, taken: false },
    { id: 'gold3', kind: 'gold', x: 1065, y: 592, value: 400, taken: false },
    { id: 'painting', kind: 'painting', x: 34, y: 300, value: 800, taken: false },
  ];

  const guards = [
    {
      name: 'PATROL A',
      waypoints: [
        { x: 640, y: 260 },
        { x: 640, y: 560 },
      ],
    },
    {
      name: 'PATROL B',
      waypoints: [
        { x: 900, y: 140 },
        { x: 1180, y: 140 },
        { x: 1180, y: 300 },
        { x: 900, y: 300 },
      ],
    },
    {
      name: 'PATROL C',
      waypoints: [
        { x: 200, y: 560 },
        { x: 520, y: 560 },
        { x: 520, y: 640 },
        { x: 200, y: 640 },
      ],
    },
  ];

  const cameras = [
    // Mounted on the top wall, sweeping the centre hall.
    { x: 640, y: top + 2, baseAngle: Math.PI / 2, sweep: 0.62 },
    // Mounted on the right wall, sweeping the vault approach.
    { x: 1266, y: 200, baseAngle: Math.PI, sweep: 0.5 },
  ];

  return {
    top,
    obstacles,
    shadows,
    loot,
    guards,
    cameras,
    start: { x: 80, y: 660 },
    // The getaway door, on the right wall near the floor.
    exit: { x: 1218, y: 620, w: 48, h: 76 },
    entry: { x: 14, y: 620, w: 20, h: 76 },
  };
}

/** True when the point is inside any shadow zone. */
export function pointInShadow(x, y, shadows) {
  for (let i = 0; i < shadows.length; i += 1) {
    const s = shadows[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

/** True when a circle of radius r at (x,y) overlaps any obstacle. */
export function circleHitsObstacle(x, y, r, obstacles) {
  for (let i = 0; i < obstacles.length; i += 1) {
    const o = obstacles[i];
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
