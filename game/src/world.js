// The world: one run of the heist. It owns the thief, the guards, the
// cameras, the alarm meter and the loot, steps them all forward, and holds
// the rewind — the snapshots that let the player jump ten seconds back and
// the ghost trail that shows the path being undone.

import { ALARM, LOOT, REWIND, STEP } from './config.js';
import { buildLevel, pointInShadow } from './level.js';
import { createThief, moveThief, recordThiefHistory, ghostTrailBetween } from './thief.js';
import { createGuard, stepGuard } from './guards.js';
import { createCamera, stepCamera } from './cameras.js';
import { createTools, useSmoke, useEmp, stepTools } from './tools.js';
import { coneSees, alarmRate } from './vision.js';

export const EVENT_NONE = 0;
export const EVENT_CAUGHT = 1;
export const EVENT_WIN = 2;
export const EVENT_LOOT = 4;
export const EVENT_REWIND = 8;

/** A fresh run, seeded so the patrols and the screenshots repeat. */
export function createWorld(seed) {
  const level = buildLevel(seed);
  const world = {
    seed,
    level,
    time: 0,
    screen: 'title', // title | play | caught | win
    thief: createThief(level.start),
    guards: level.guards.map(createGuard),
    cameras: level.cameras.map(createCamera),
    tools: createTools(),
    alarm: 0,
    maxAlarm: 0,
    score: 0,
    hasDiamond: false,
    lootTaken: 0,
    rewinds: REWIND.charges,
    rewindsUsed: 0,
    rewindFlash: 0,
    ghostTrail: [],
    ghostTimer: 0,
    seenNow: false,
    seenTimer: 0,
    snapshots: [], // { t, thief, guards, cameras, alarm, score, loot, hasDiamond }
    snapshotTimer: 0,
    best: 0,
  };
  takeSnapshot(world);
  return world;
}

/** Reset a world back to a fresh run with the same seed. */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.best = world.best;
  Object.keys(fresh).forEach((key) => {
    world[key] = fresh[key];
  });
  world.screen = 'play';
}

function takeSnapshot(world) {
  world.snapshots.push({
    t: world.time,
    thief: { x: world.thief.x, y: world.thief.y, angle: world.thief.angle },
    guards: world.guards.map((g) => ({ x: g.x, y: g.y, angle: g.angle, wpIndex: g.wpIndex })),
    cameras: world.cameras.map((c) => ({ phase: c.phase, angle: c.angle })),
    alarm: world.alarm,
    score: world.score,
    loot: world.level.loot.map((l) => l.taken),
    hasDiamond: world.hasDiamond,
    lootTaken: world.lootTaken,
  });
  while (world.snapshots.length > 100) world.snapshots.shift();
}

/**
 * The rewind: jump back to the snapshot from ten seconds ago (or the oldest
 * one, early in a run). The ghost trail is the path being undone, and the
 * alarm keeps half of what it gained since then — a rewind is an escape, not
 * a free eraser. Returns false when no charges are left.
 */
export function rewindWorld(world) {
  if (world.rewinds <= 0 || world.snapshots.length < 2) return false;
  const target = world.snapshots[0];
  const alarmNow = world.alarm;
  world.ghostTrail = ghostTrailBetween(world.thief, target.t, world.time);
  world.ghostTimer = 6;
  world.thief.x = target.thief.x;
  world.thief.y = target.thief.y;
  world.thief.angle = target.thief.angle;
  world.thief.target = null;
  world.thief.history = world.thief.history.filter((p) => p.t <= target.t);
  world.guards.forEach((g, i) => {
    g.x = target.guards[i].x;
    g.y = target.guards[i].y;
    g.angle = target.guards[i].angle;
    g.wpIndex = target.guards[i].wpIndex;
  });
  world.cameras.forEach((c, i) => {
    c.phase = target.cameras[i].phase;
    c.angle = target.cameras[i].angle;
  });
  world.alarm = target.alarm + ALARM.rewindKeep * Math.max(0, alarmNow - target.alarm);
  world.score = target.score;
  world.level.loot.forEach((l, i) => {
    l.taken = target.loot[i];
  });
  world.hasDiamond = target.hasDiamond;
  world.lootTaken = target.lootTaken;
  world.time = target.t;
  world.snapshots = world.snapshots.filter((s) => s.t <= target.t);
  world.rewinds -= 1;
  world.rewindsUsed += 1;
  world.rewindFlash = 1.4;
  world.tools.clouds = [];
  return true;
}

/**
 * One fixed step of the run. `input` is { mx, my, rewind, smoke, emp }.
 * Returns a bitmask of EVENT_* flags.
 */
export function stepWorld(world, dt, input) {
  if (world.screen !== 'play') return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;

  if (input.rewind && rewindWorld(world)) events |= EVENT_REWIND;
  if (input.smoke) {
    const r = useSmoke(world.tools, world.thief.x, world.thief.y, world.score);
    world.score = r.score;
  }
  if (input.emp) {
    const r = useEmp(world.tools, world.score);
    world.score = r.score;
  }

  moveThief(world.thief, dt, input.mx, input.my, world.level.obstacles);
  recordThiefHistory(world.thief, world.time, dt);

  const alerted = world.alarm > 50;
  world.guards.forEach((g) => stepGuard(g, dt, alerted));
  world.cameras.forEach((c) => stepCamera(c, dt, world.tools.empTimer > 0));
  stepTools(world.tools, dt);

  // Detection: any guard or live camera with the thief in its cone.
  const inShadow = pointInShadow(world.thief.x, world.thief.y, world.level.shadows);
  let seen = false;
  let rate = 0;
  for (let i = 0; i < world.guards.length; i += 1) {
    const hit = coneSees(world.guards[i], 'guard', world.thief.x, world.thief.y, world.level.obstacles, world.tools.clouds, inShadow);
    if (hit.seen) {
      seen = true;
      rate = Math.max(rate, alarmRate('guard', hit.dist, inShadow));
    }
  }
  if (world.tools.empTimer <= 0) {
    for (let i = 0; i < world.cameras.length; i += 1) {
      const hit = coneSees(world.cameras[i], 'camera', world.thief.x, world.thief.y, world.level.obstacles, world.tools.clouds, inShadow);
      if (hit.seen) {
        seen = true;
        rate = Math.max(rate, alarmRate('camera', hit.dist, inShadow));
      }
    }
  }
  world.seenNow = seen;
  world.seenTimer = seen ? 0.8 : Math.max(0, world.seenTimer - dt);
  if (seen) {
    world.alarm = Math.min(100, world.alarm + rate * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM.decay * dt);
  }
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);

  // Loot: walk close enough and it is pocketed.
  for (let i = 0; i < world.level.loot.length; i += 1) {
    const item = world.level.loot[i];
    if (item.taken) continue;
    const reach = item.kind === 'diamond' ? 42 : item.kind === 'painting' ? 44 : 32;
    if (Math.hypot(world.thief.x - item.x, world.thief.y - item.y) < reach) {
      item.taken = true;
      world.score += item.value;
      world.lootTaken += 1;
      if (item.kind === 'diamond') world.hasDiamond = true;
      events |= EVENT_LOOT;
    }
  }

  // Snapshots for the rewind, every 0.1s.
  world.snapshotTimer += dt;
  if (world.snapshotTimer >= 0.1) {
    world.snapshotTimer = 0;
    takeSnapshot(world);
  }
  if (world.rewindFlash > 0) world.rewindFlash = Math.max(0, world.rewindFlash - dt);
  if (world.ghostTimer > 0) world.ghostTimer = Math.max(0, world.ghostTimer - dt);

  // Caught: the alarm tops out.
  if (world.alarm >= 100) {
    world.screen = 'caught';
    if (world.score > world.best) world.best = world.score;
    return events | EVENT_CAUGHT;
  }

  // The getaway: diamond in hand, back at the exit door.
  if (world.hasDiamond) {
    const e = world.level.exit;
    if (world.thief.x > e.x - 14 && world.thief.x < e.x + e.w + 14 && world.thief.y > e.y - 10 && world.thief.y < e.y + e.h + 10) {
      world.screen = 'win';
      if (world.score > world.best) world.best = world.score;
      return events | EVENT_WIN;
    }
  }
  return events;
}

/** Rating for the getaway screen, by how hot the run ever got. */
export function getawayRating(world) {
  if (world.maxAlarm < 25 && world.rewindsUsed === 0) return 'GHOST — never seen';
  if (world.maxAlarm < 60) return 'PRO — cool under pressure';
  return 'LOUD — they knew you were there';
}

export { STEP };
