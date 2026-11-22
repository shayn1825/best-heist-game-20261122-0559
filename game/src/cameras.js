// Cameras: wall mounts that sweep their cone back and forth. An EMP shuts
// them down for a while; their cone then goes grey and they see nothing.

import { CAMERA } from './config.js';

/** A fresh camera, mid-sweep. */
export function createCamera(spec) {
  return {
    x: spec.x,
    y: spec.y,
    baseAngle: spec.baseAngle,
    sweep: spec.sweep,
    phase: 0,
    angle: spec.baseAngle,
    disabled: false,
  };
}

/** Advance the sweep; `disabled` freezes the cone at its rest angle. */
export function stepCamera(camera, dt, disabled) {
  camera.disabled = disabled;
  if (disabled) {
    camera.angle = camera.baseAngle;
    return;
  }
  camera.phase += dt * CAMERA.sweepSpeed;
  camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
}
