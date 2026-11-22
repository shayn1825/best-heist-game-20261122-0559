// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. A 64px HUD strip sits at the top and the
// museum floor fills the rest.

export const FIELD = { width: 1280, height: 720 };
export const HUD_H = 64;

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = { radius: 13, speed: 215 };

export const GUARD = {
  radius: 14,
  speed: 80,
  alertSpeed: 112,
  coneRange: 245,
  coneHalf: 0.52, // radians, about 30 degrees each side
};

export const CAMERA = {
  range: 295,
  coneHalf: 0.38,
  sweepSpeed: 0.55,
};

/** How fast the alarm climbs while the thief is seen, and how it forgives. */
export const ALARM = {
  guardRate: 26,
  cameraRate: 18,
  closeMult: 1.6, // seen from under 120px: the meter jumps faster
  shadowMult: 0.3, // hidden in a shadow zone: barely noticed
  decay: 4, // points per second while nobody sees the thief
  rewindKeep: 0.5, // after a rewind, the alarm keeps half of what it gained
};

/** The rewind: how far back it jumps, and how many charges a run gets. */
export const REWIND = { seconds: 10, charges: 3 };

/** Tools, and what each one costs out of the loot score. */
export const TOOLS = {
  smokeCharges: 2,
  smokeCost: 100,
  smokeRadius: 95,
  smokeSeconds: 6,
  empCharges: 1,
  empCost: 200,
  empSeconds: 8,
};

/** Loot values in dollars. The diamond is the job; the rest is bonus. */
export const LOOT = { diamond: 5000, gold: 400, painting: 800 };

export const PALETTE = {
  backdrop: '#0d0f16',
  floorA: '#171a26',
  floorB: '#1b1f2e',
  rug: '#241a2e',
  wall: '#3a3f55',
  wallTop: '#4a5068',
  case: '#2b2f42',
  caseTrim: '#c9a227',
  shadow: '#0a0d1a',
  shadowEdge: '#2e3a5c',
  thief: '#39d0c4',
  thiefDark: '#0f5f58',
  guard: '#ff5a4e',
  guardDark: '#7a1d16',
  camera: '#ffb020',
  coneGuard: 'rgba(255, 90, 78, 0.20)',
  coneGuardAlert: 'rgba(255, 60, 40, 0.34)',
  coneCamera: 'rgba(255, 176, 32, 0.20)',
  coneCameraOff: 'rgba(120, 120, 130, 0.10)',
  lootDiamond: '#8ef1ff',
  lootGold: '#f2c94c',
  lootPainting: '#e07ec9',
  exit: '#3ddc84',
  exitDark: '#0e5c30',
  smoke: 'rgba(180, 190, 205, 0.55)',
  ghost: 'rgba(57, 208, 196, 0.75)',
  panel: '#141726',
  panelEdge: '#2c3250',
  text: '#eef1f5',
  muted: '#9aa3b8',
  alarmLow: '#3ddc84',
  alarmMid: '#ffb020',
  alarmHigh: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'rewind-heist.best';
