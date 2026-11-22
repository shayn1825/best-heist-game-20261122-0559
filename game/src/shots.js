// The screenshot scenes behind ?shot=cover|shadow|rewind|getaway. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame. The
// autopilot reads the cones before it moves: it steps toward its waypoint,
// sidesteps when the next step would be seen, and waits when every step is
// watched. The rewind scene walks straight into a cone on purpose, then
// rewinds, so the ghost trail and the REWIND banner are in the frame.

import { STEP, THIEF } from './config.js';
import { createWorld, resetWorld, stepWorld, rewindWorld, EVENT_WIN, EVENT_CAUGHT } from './world.js';
import { coneSees } from './vision.js';
import { pointInShadow, circleHitsObstacle } from './level.js';

const SAMPLE = STEP;

/** Would the thief be seen standing at (x, y) right now? */
function wouldBeSeen(world, x, y) {
  const inShadow = pointInShadow(x, y, world.level.shadows);
  for (const g of world.guards) {
    if (coneSees(g, 'guard', x, y, world.level.obstacles, world.tools.clouds, inShadow).seen) return true;
  }
  if (world.tools.empTimer <= 0) {
    for (const c of world.cameras) {
      if (coneSees(c, 'camera', x, y, world.level.obstacles, world.tools.clouds, inShadow).seen) return true;
    }
  }
  return false;
}

const DIRECTIONS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * One autopilot move: toward the target, unless the step would be seen, in
 * which case sidestep to the safest direction that still closes in, or wait.
 * `reckless` ignores the cones entirely.
 */
function autopilot(world, target, reckless) {
  const t = world.thief;
  const dx = target.x - t.x;
  const dy = target.y - t.y;
  if (Math.hypot(dx, dy) < 10) return { mx: 0, my: 0, arrived: true };
  const step = 215 * SAMPLE;
  let best = null;
  for (const [ux, uy] of DIRECTIONS) {
    if (ux === 0 && uy === 0) continue;
    const len = Math.hypot(ux, uy);
    const nx = t.x + (ux / len) * step;
    const ny = t.y + (uy / len) * step;
    const seen = reckless ? false : wouldBeSeen(world, nx, ny);
    // A step into a display case or a pillar is no step at all: a corner
    // pocket (the thief wedged against a case corner, every slide failing)
    // stalls the run, so blocked directions score far below any free one
    // and the pilot steps around the furniture instead of into it.
    const blocked = circleHitsObstacle(nx, ny, THIEF.radius, world.level.obstacles);
    const dist = Math.hypot(target.x - nx, target.y - ny);
    const toward = (dx * ux + dy * uy) / (Math.hypot(dx, dy) * len);
    const score = (seen ? -10000 : 0) + (blocked ? -5000 : 0) + toward * 100 - dist;
    if (best === null || score > best.score) best = { mx: ux / len, my: uy / len, score };
  }
  // Waiting beats walking into a cone: if the best move is still seen and
  // standing still is safe, hold position.
  if (!reckless && best.score < -9000 && !wouldBeSeen(world, t.x, t.y)) {
    return { mx: 0, my: 0, arrived: false };
  }
  return { mx: best.mx, my: best.my, arrived: false };
}

/** Run the world forward with the autopilot chasing a list of waypoints. */
function runRoute(world, waypoints, seconds, reckless = false, stopAtAlarm = null) {
  let wp = 0;
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen !== 'play') break;
    if (stopAtAlarm !== null && world.alarm >= stopAtAlarm) break;
    const target = waypoints[Math.min(wp, waypoints.length - 1)];
    const move = autopilot(world, target, reckless);
    if (move.arrived) wp += 1;
    events |= stepWorld(world, STEP, { mx: move.mx, my: move.my, rewind: false, smoke: false, emp: false });
    if (events & (EVENT_WIN | EVENT_CAUGHT)) break;
  }
  return events;
}

const GOLD1 = { x: 375, y: 252 };
const GOLD2 = { x: 645, y: 252 };
const SHADOW_SPOT = { x: 215, y: 165 };
const DIAMOND = { x: 1152, y: 175 };
const EXIT = { x: 1230, y: 658 };

// Navigation waypoints: greedy steering cannot see around a display case
// (it dithers east-west against the wall), so each route is spelled out as
// open-space points that turn the corners for it.
const TO_GOLD1 = [
  { x: 430, y: 520 }, // east along the floor, clear of the cases
  { x: 430, y: 252 }, // north up the centre hall, clear of every case
  GOLD1,
];
const TO_GOLD2 = [GOLD2]; // straight east along y=252, clear of the cases
const TO_DIAMOND = [
  { x: 860, y: 252 }, // east past the silver case
  DIAMOND, // the vault pedestal, approached from the west
];
const TO_EXIT = [
  { x: 1152, y: 400 }, // south down the right side, clear of the cases
  EXIT,
];
const TO_SHADOW = [
  { x: 120, y: 400 }, // north up the left wall
  SHADOW_SPOT,
];

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any other name is the cover: a mid-heist frame with the thief between the
 * cases, cones sweeping, the diamond still in its case and the alarm warm.
 */
export function stageShot(name, world) {
  resetWorld(world);
  world.screen = 'play';
  if (name === 'shadow') {
    runRoute(world, TO_SHADOW, 40);
    for (let i = 0; i < 1.5 / STEP; i += 1) {
      stepWorld(world, STEP, { mx: 0, my: 0, rewind: false, smoke: false, emp: false });
    }
    return { screen: 'play' };
  }
  if (name === 'rewind') {
    // Walk straight at the diamond, blind, until the alarm bites, then
    // rewind — the frame after shows the ghost trail and the banner.
    runRoute(world, [...TO_GOLD1, ...TO_GOLD2, ...TO_DIAMOND], 14, true, 70);
    rewindWorld(world);
    for (let i = 0; i < 0.4 / STEP; i += 1) {
      stepWorld(world, STEP, { mx: 0, my: 0, rewind: false, smoke: false, emp: false });
    }
    return { screen: 'play' };
  }
  if (name === 'getaway') {
    runRoute(world, [...TO_GOLD1, ...TO_GOLD2, ...TO_DIAMOND, ...TO_EXIT], 150);
    return { screen: world.screen };
  }
  // cover
  runRoute(world, [...TO_GOLD1, ...TO_GOLD2, ...TO_DIAMOND], 17);
  return { screen: 'play' };
}
