// Tools: what the thief carries, and what each one costs. A smoke bomb
// drops a cloud that blocks every sightline inside it; an EMP kills the
// cameras for a while. Both are paid for out of the loot score, so using one
// is a real decision, not a free panic button.

import { TOOLS } from './config.js';

/** Fresh tool stock for a run. */
export function createTools() {
  return {
    smoke: TOOLS.smokeCharges,
    emp: TOOLS.empCharges,
    clouds: [], // { x, y, r, t } — t is seconds left
    empTimer: 0, // seconds of camera blackout left
  };
}

/** Drop a smoke bomb at the thief's feet. Returns false when none are left. */
export function useSmoke(tools, x, y, score) {
  if (tools.smoke <= 0) return { ok: false, score };
  tools.smoke -= 1;
  tools.clouds.push({ x, y, r: TOOLS.smokeRadius, t: TOOLS.smokeSeconds });
  return { ok: true, score: Math.max(0, score - TOOLS.smokeCost) };
}

/** Fire the EMP. Returns false when none are left. */
export function useEmp(tools, score) {
  if (tools.emp <= 0) return { ok: false, score };
  tools.emp -= 1;
  tools.empTimer = TOOLS.empSeconds;
  return { ok: true, score: Math.max(0, score - TOOLS.empCost) };
}

/** Age the clouds and the EMP blackout by one step. */
export function stepTools(tools, dt) {
  for (let i = tools.clouds.length - 1; i >= 0; i -= 1) {
    tools.clouds[i].t -= dt;
    if (tools.clouds[i].t <= 0) tools.clouds.splice(i, 1);
  }
  if (tools.empTimer > 0) tools.empTimer = Math.max(0, tools.empTimer - dt);
}
