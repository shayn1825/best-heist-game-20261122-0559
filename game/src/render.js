// The renderer: everything the judge ever sees. One canvas, 1280x720
// logical pixels: the museum floor, the cones, the loot, the HUD with the
// alarm meter, and the title / caught / getaway screens. Safe cover, danger
// and loot are different colours at a glance — teal is the thief, red is
// danger, gold is money, green is the way out.

import { FIELD, HUD_H, PALETTE, FONT, GUARD, CAMERA, THIEF } from './config.js';
import { pointInShadow, WALL } from './level.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function label(ctx, str, x, y, size, color) {
  ctx.font = `700 ${size}px ${FONT}`;
  const w = ctx.measureText(str).width + 12;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.78)';
  roundRect(ctx, x - w / 2, y - size / 2 - 4, w, size + 8, 5);
  ctx.fill();
  text(ctx, str, x, y + 1, size, color, '700', 'center');
}

/** A vision cone: a wedge that fades with distance, with a bright rim. */
function drawCone(ctx, x, y, angle, half, range, fill, rim) {
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - half) * range, y + Math.sin(angle - half) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + half) * range, y + Math.sin(angle + half) * range);
  ctx.stroke();
}

function drawFloor(ctx, world) {
  const level = world.level;
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Parquet tiles.
  for (let y = HUD_H + WALL; y < FIELD.height - WALL; y += 56) {
    for (let x = WALL; x < FIELD.width - WALL; x += 56) {
      ctx.fillStyle = ((x + y) / 56) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, 56, 56);
    }
  }
  // The rug down the centre hall.
  ctx.fillStyle = PALETTE.rug;
  ctx.fillRect(520, HUD_H + WALL, 240, FIELD.height - HUD_H - WALL * 2);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(528, HUD_H + WALL + 8, 224, FIELD.height - HUD_H - WALL * 2 - 16);
  // Walls.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, HUD_H, FIELD.width, WALL);
  ctx.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
  ctx.fillRect(0, HUD_H, WALL, FIELD.height - HUD_H);
  ctx.fillRect(FIELD.width - WALL, HUD_H, WALL, FIELD.height - HUD_H);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, HUD_H, FIELD.width, 3);
  // Shadow zones: dark pools where the thief is hard to spot.
  for (const s of level.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.shadowEdge;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    // The label sits at the top of the zone so it never covers the thief
    // hiding in its middle.
    label(ctx, s.label, s.x + s.w / 2, s.y + 14, 11, '#7d8db0');
  }
}

function drawObstacles(ctx, world) {
  for (const o of world.level.obstacles) {
    if (o.kind === 'pillar') {
      ctx.fillStyle = '#565e78';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a8299';
      ctx.lineWidth = 2;
      ctx.stroke();
      continue;
    }
    if (o.kind === 'pedestal') {
      ctx.fillStyle = '#3d4a6b';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = PALETTE.caseTrim;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      continue;
    }
    ctx.fillStyle = PALETTE.case;
    roundRect(ctx, o.x, o.y, o.w, o.h, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.caseTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glass shine.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(o.x + 10, o.y + o.h - 8);
    ctx.lineTo(o.x + o.w - 14, o.y + 8);
    ctx.stroke();
    if (o.label) label(ctx, o.label, o.x + o.w / 2, o.y + o.h / 2, 10, '#c8b06a');
  }
}

function drawLoot(ctx, world) {
  for (const item of world.level.loot) {
    if (item.taken) continue;
    if (item.kind === 'diamond') {
      const t = world.time;
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.lootDiamond;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
      ctx.strokeStyle = 'rgba(142, 241, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(item.x - 22, item.y);
      ctx.lineTo(item.x - 30, item.y);
      ctx.moveTo(item.x + 22, item.y);
      ctx.lineTo(item.x + 30, item.y);
      ctx.moveTo(item.x, item.y - 22);
      ctx.lineTo(item.x, item.y - 30);
      ctx.moveTo(item.x, item.y + 22);
      ctx.lineTo(item.x, item.y + 30);
      ctx.stroke();
      label(ctx, '◆ DIAMOND  $5,000', item.x, item.y - 34, 12, PALETTE.lootDiamond);
    } else if (item.kind === 'gold') {
      ctx.fillStyle = PALETTE.lootGold;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(-0.3);
      ctx.fillRect(-12, -6, 24, 12);
      ctx.strokeStyle = '#8a6d1f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -6, 24, 12);
      ctx.restore();
      label(ctx, '$400', item.x, item.y - 22, 11, PALETTE.lootGold);
    } else {
      ctx.fillStyle = '#3a2a3d';
      ctx.fillRect(item.x - 4, item.y - 34, 10, 68);
      ctx.strokeStyle = PALETTE.lootPainting;
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x - 4, item.y - 34, 10, 68);
      ctx.fillStyle = PALETTE.lootPainting;
      ctx.beginPath();
      ctx.arc(item.x + 1, item.y, 5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'PAINTING $800', item.x + 62, item.y, 11, PALETTE.lootPainting);
    }
  }
}

function drawDoors(ctx, world) {
  const e = world.level.exit;
  const glow = world.hasDiamond ? 0.9 : 0.45;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(e.x - 4, e.y - 4, e.w + 8, e.h + 8);
  ctx.restore();
  ctx.fillStyle = PALETTE.exitDark;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = PALETTE.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  label(ctx, 'GETAWAY →', e.x - 52, e.y + e.h / 2, 12, PALETTE.exit);
  const en = world.level.entry;
  ctx.fillStyle = '#2c3145';
  ctx.fillRect(en.x, en.y, en.w, en.h);
  ctx.strokeStyle = '#5a6278';
  ctx.lineWidth = 2;
  ctx.strokeRect(en.x, en.y, en.w, en.h);
  label(ctx, 'ENTRY', en.x + 52, en.y + en.h / 2, 11, '#9aa3b8');
}

function drawSmoke(ctx, world) {
  for (const c of world.tools.clouds) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 228, 240, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, 'SMOKE', c.x, c.y, 10, '#dfe6f2');
  }
}

function drawGhostTrail(ctx, world) {
  if (world.ghostTimer <= 0 || world.ghostTrail.length < 2) return;
  const alpha = Math.min(1, world.ghostTimer / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PALETTE.ghost;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(world.ghostTrail[0].x, world.ghostTrail[0].y);
  for (let i = 1; i < world.ghostTrail.length; i += 1) ctx.lineTo(world.ghostTrail[i].x, world.ghostTrail[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < world.ghostTrail.length; i += 4) {
    ctx.fillStyle = PALETTE.ghost;
    ctx.beginPath();
    ctx.arc(world.ghostTrail[i].x, world.ghostTrail[i].y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const mid = world.ghostTrail[Math.floor(world.ghostTrail.length / 2)];
  const labelW = 300;
  const labelX = Math.max(labelW / 2 + 8, Math.min(FIELD.width - labelW / 2 - 8, mid.x));
  label(ctx, '⏪ GHOST TRAIL — THE PATH YOU UNDID', labelX, mid.y - 22, 11, PALETTE.ghost);
  ctx.restore();
}

function drawGuards(ctx, world) {
  for (const g of world.guards) {
    const fill = g.alerted ? PALETTE.coneGuardAlert : PALETTE.coneGuard;
    drawCone(ctx, g.x, g.y, g.angle, GUARD.coneHalf, GUARD.coneRange, fill, 'rgba(255, 90, 78, 0.45)');
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Facing nose.
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * (GUARD.radius + 7), g.y + Math.sin(g.angle) * (GUARD.radius + 7));
    ctx.lineTo(g.x + Math.cos(g.angle + 2.5) * GUARD.radius, g.y + Math.sin(g.angle + 2.5) * GUARD.radius);
    ctx.lineTo(g.x + Math.cos(g.angle - 2.5) * GUARD.radius, g.y + Math.sin(g.angle - 2.5) * GUARD.radius);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'GUARD', g.x, g.y - GUARD.radius - 14, 10, '#ff8a80');
  }
}

function drawCameras(ctx, world) {
  for (const c of world.cameras) {
    const off = c.disabled;
    const fill = off ? PALETTE.coneCameraOff : PALETTE.coneCamera;
    drawCone(ctx, c.x, c.y, c.angle, CAMERA.coneHalf, CAMERA.range, fill, off ? 'rgba(140,140,150,0.4)' : 'rgba(255, 176, 32, 0.5)');
    ctx.fillStyle = off ? '#6a6f7d' : PALETTE.camera;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillRect(-4, -7, 16, 14);
    ctx.fillStyle = off ? '#3a3d47' : '#fff3cf';
    ctx.beginPath();
    ctx.arc(13, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // A camera mounted on the right wall has no room for its label to the
    // right, so the label goes to its left instead of off the canvas.
    const labelX = c.x > FIELD.width - 70 ? c.x - 52 : c.x;
    label(ctx, off ? 'CAMERA — EMP OFF' : 'CAMERA', labelX, c.y - 24, 10, off ? '#9aa3b8' : PALETTE.camera);
  }
}

function drawThief(ctx, world) {
  const t = world.thief;
  const inShadow = pointInShadow(t.x, t.y, world.level.shadows);
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b3f3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point in the facing direction.
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.moveTo(t.x + Math.cos(t.angle) * (THIEF.radius + 8), t.y + Math.sin(t.angle) * (THIEF.radius + 8));
  ctx.lineTo(t.x + Math.cos(t.angle + 2.6) * THIEF.radius, t.y + Math.sin(t.angle + 2.6) * THIEF.radius);
  ctx.lineTo(t.x + Math.cos(t.angle - 2.6) * THIEF.radius, t.y + Math.sin(t.angle - 2.6) * THIEF.radius);
  ctx.closePath();
  ctx.fill();
  if (inShadow) label(ctx, 'HIDDEN', t.x, t.y - THIEF.radius - 14, 10, '#8fb4d8');
  else label(ctx, 'YOU', t.x, t.y - THIEF.radius - 14, 10, PALETTE.thief);
  if (t.target) {
    ctx.strokeStyle = 'rgba(57, 208, 196, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.target.x, t.target.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t.target.x - 12, t.target.y);
    ctx.lineTo(t.target.x + 12, t.target.y);
    ctx.moveTo(t.target.x, t.target.y - 12);
    ctx.lineTo(t.target.x, t.target.y + 12);
    ctx.stroke();
  }
}

function alarmColor(alarm) {
  if (alarm < 40) return PALETTE.alarmLow;
  if (alarm < 75) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, HUD_H);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, HUD_H - 2, FIELD.width, 2);
  text(ctx, '⏪ REWIND HEIST', 16, 22, 21, PALETTE.text, '800');
  text(ctx, 'one vault · one second chance', 16, 46, 12, PALETTE.muted, '600');
  text(ctx, `LOOT  $${world.score.toLocaleString('en-US')}`, 250, 22, 19, PALETTE.lootGold, '800');
  text(ctx, world.hasDiamond ? '◆ DIAMOND SECURED — GET TO THE DOOR' : 'JOB: STEAL THE ◆ DIAMOND, THEN REACH THE GETAWAY DOOR', 250, 46, 12, world.hasDiamond ? PALETTE.exit : PALETTE.muted, '700');
  // Alarm meter.
  const mx = 620;
  const mw = 250;
  text(ctx, 'ALARM', mx, 22, 13, PALETTE.muted, '800');
  ctx.fillStyle = '#0a0d18';
  roundRect(ctx, mx + 62, 12, mw, 20, 6);
  ctx.fill();
  ctx.fillStyle = alarmColor(world.alarm);
  const aw = Math.max(0, (mw - 4) * (world.alarm / 100));
  if (aw > 0) {
    roundRect(ctx, mx + 64, 14, aw, 16, 5);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, mx + 62, 12, mw, 20, 6);
  ctx.stroke();
  text(ctx, `${Math.round(world.alarm)}%`, mx + 62 + mw + 10, 22, 15, alarmColor(world.alarm), '800');
  text(ctx, world.seenNow ? '⚠ SPOTTED!' : world.alarm > 50 ? 'HOT — THEY ARE ALERT' : 'UNSEEN', mx + 62, 46, 12, world.seenNow ? PALETTE.alarmHigh : PALETTE.muted, '700');
  // Rewind and tool buttons, right side.
  const bx = 970;
  ctx.fillStyle = world.rewinds > 0 ? '#123f3c' : '#232838';
  roundRect(ctx, bx, 10, 118, 44, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, 10, 118, 44, 8);
  ctx.stroke();
  text(ctx, `⏪ REWIND ×${world.rewinds}`, bx + 59, 24, 14, PALETTE.thief, '800', 'center');
  text(ctx, '[R] −10s', bx + 59, 42, 10, PALETTE.muted, '600', 'center');
  text(ctx, `SMOKE ×${world.tools.smoke} [Q]`, 1100, 22, 12, '#cdd6e4', '700');
  text(ctx, `EMP ×${world.tools.emp} [E]`, 1100, 44, 12, '#cdd6e4', '700');
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 1264, 33, 15, PALETTE.muted, '700', 'right');
}

function drawBanners(ctx, world) {
  if (world.rewindFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.rewindFlash);
    ctx.fillStyle = 'rgba(10, 20, 22, 0.55)';
    ctx.fillRect(0, 300, FIELD.width, 64);
    text(ctx, '⏪ REWIND — TEN SECONDS BACK', FIELD.width / 2, 322, 30, PALETTE.thief, '800', 'center');
    text(ctx, 'the alarm keeps half of what it gained', FIELD.width / 2, 350, 14, PALETTE.text, '600', 'center');
    ctx.restore();
  }
}

function overlay(ctx, color, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, world) {
  overlay(ctx, '#07080f', 0.72);
  text(ctx, '⏪ REWIND HEIST', FIELD.width / 2, 210, 58, PALETTE.text, '800', 'center');
  text(ctx, 'One vault. Three guards. Two cameras. One second chance.', FIELD.width / 2, 258, 19, PALETTE.lootGold, '600', 'center');
  text(ctx, 'Sneak past the cones, pocket the ◆ DIAMOND, and slip out the GETAWAY door.', FIELD.width / 2, 292, 16, PALETTE.muted, '600', 'center');
  text(ctx, 'WASD / arrows to move · click to walk · R rewinds 10 seconds · Q smoke · E EMP', FIELD.width / 2, 340, 15, PALETTE.text, '700', 'center');
  text(ctx, 'Shadows hide you · smoke blinds them · the alarm keeps half its heat after a rewind', FIELD.width / 2, 368, 14, PALETTE.muted, '600', 'center');
  text(ctx, '▶  PRESS ENTER TO CASE THE JOINT', FIELD.width / 2, 440, 22, PALETTE.thief, '800', 'center');
  if (world.best > 0) text(ctx, `BEST HAUL  $${world.best.toLocaleString('en-US')}`, FIELD.width / 2, 486, 15, PALETTE.muted, '700', 'center');
}

function drawCaught(ctx, world) {
  overlay(ctx, '#160607', 0.78);
  text(ctx, 'CAUGHT!', FIELD.width / 2, 230, 60, PALETTE.alarmHigh, '800', 'center');
  text(ctx, 'The alarm hit 100% and the vault sealed shut.', FIELD.width / 2, 282, 18, PALETTE.text, '600', 'center');
  text(ctx, `LOOT KEPT  $${world.score.toLocaleString('en-US')}    ·    TIME  ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}    ·    REWINDS USED  ${world.rewindsUsed}`, FIELD.width / 2, 340, 16, PALETTE.muted, '700', 'center');
  text(ctx, 'A rewind would have undone the last ten seconds — if any were left.', FIELD.width / 2, 376, 15, PALETTE.lootGold, '600', 'center');
  text(ctx, '▶  PRESS ENTER TO TRY AGAIN', FIELD.width / 2, 440, 22, PALETTE.thief, '800', 'center');
}

function drawWin(ctx, world) {
  overlay(ctx, '#04120a', 0.78);
  text(ctx, 'CLEAN GETAWAY!', FIELD.width / 2, 210, 56, PALETTE.exit, '800', 'center');
  text(ctx, 'The diamond is yours and the night never saw you leave.', FIELD.width / 2, 262, 18, PALETTE.text, '600', 'center');
  const rating = world.maxAlarm < 25 && world.rewindsUsed === 0 ? 'GHOST — never seen' : world.maxAlarm < 60 ? 'PRO — cool under pressure' : 'LOUD — they knew you were there';
  text(ctx, rating, FIELD.width / 2, 306, 20, PALETTE.lootGold, '800', 'center');
  text(ctx, `HAUL  $${world.score.toLocaleString('en-US')}    ·    TIME  ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}    ·    PEAK ALARM  ${Math.round(world.maxAlarm)}%    ·    REWINDS  ${world.rewindsUsed}`, FIELD.width / 2, 352, 16, PALETTE.muted, '700', 'center');
  text(ctx, '▶  PRESS ENTER TO RUN IT AGAIN', FIELD.width / 2, 430, 22, PALETTE.thief, '800', 'center');
}

/** Draw the whole game for this world onto the canvas context. */
export function drawWorld(ctx, world) {
  drawFloor(ctx, world);
  drawObstacles(ctx, world);
  drawLoot(ctx, world);
  drawDoors(ctx, world);
  drawSmoke(ctx, world);
  drawGhostTrail(ctx, world);
  drawGuards(ctx, world);
  drawCameras(ctx, world);
  drawThief(ctx, world);
  drawHud(ctx, world);
  drawBanners(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'caught') drawCaught(ctx, world);
  else if (world.screen === 'win') drawWin(ctx, world);
}
