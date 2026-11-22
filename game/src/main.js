// Rewind Heist: a top-down museum heist with a ten-second rewind. Keyboard
// (WASD / arrows, R rewind, Q smoke, E EMP, Enter start) and mouse
// (click to walk, click the REWIND button). ?shot=cover|shadow|rewind|
// getaway stages a deterministic screenshot scene instead of playing.

import { FIELD, STEP, BEST_KEY } from './config.js';
import { createWorld, resetWorld, stepWorld, EVENT_LOOT, EVENT_REWIND } from './world.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

const world = createWorld(seed);
try {
  world.best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  world.best = 0;
}
window.__world = world;

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(world.best));
  } catch {
    // Best score is a nicety; a browser that refuses storage still plays.
  }
}

function announce() {
  const screen = world.screen === 'play' ? 'playing' : world.screen;
  statusEl.textContent =
    `Rewind Heist, ${screen}. Loot $${world.score.toLocaleString('en-US')}, ` +
    `alarm ${Math.round(world.alarm)} percent, ${world.rewinds} rewinds left.`;
}

function render() {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawWorld(ctx, world);
}

const keys = new Set();

function readInput() {
  const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
  const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
  const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
  const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
  return { mx: (right ? 1 : 0) - (left ? 1 : 0), my: (down ? 1 : 0) - (up ? 1 : 0) };
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.repeat) return;
  keys.add(event.key);
  if (event.key === 'Enter') {
    if (world.screen !== 'play') {
      resetWorld(world);
      saveBest();
      announce();
    }
    return;
  }
  if (world.screen !== 'play') return;
  if (event.key === 'r' || event.key === 'R') {
    stepWorld(world, 0, { mx: 0, my: 0, rewind: true, smoke: false, emp: false });
    announce();
  }
  if (event.key === 'q' || event.key === 'Q') {
    stepWorld(world, 0, { mx: 0, my: 0, rewind: false, smoke: true, emp: false });
  }
  if (event.key === 'e' || event.key === 'E') {
    stepWorld(world, 0, { mx: 0, my: 0, rewind: false, smoke: false, emp: true });
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key));

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
    y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const p = canvasPoint(event);
  if (world.screen !== 'play') return;
  // The REWIND button in the HUD.
  if (p.y < 64 && p.x >= 970 && p.x <= 1088 && world.rewinds > 0) {
    stepWorld(world, 0, { mx: 0, my: 0, rewind: true, smoke: false, emp: false });
    announce();
    return;
  }
  world.thief.target = { x: p.x, y: p.y };
});

if (shotName) {
  // Screenshot mode: stage the scene, draw it once, and stop.
  const staged = stageShot(shotName, world);
  world.screen = staged.screen;
  render();
  announce();
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  let announcedAt = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      const input = readInput();
      const events = stepWorld(world, STEP, { mx: input.mx, my: input.my, rewind: false, smoke: false, emp: false });
      if (events & (EVENT_LOOT | EVENT_REWIND)) announce();
      if (world.screen !== 'play') saveBest();
    }
    render();
    if (now - announcedAt > 2000) {
      announcedAt = now;
      announce();
    }
    requestAnimationFrame(frame);
  }
  render();
  announce();
  requestAnimationFrame(frame);
}
