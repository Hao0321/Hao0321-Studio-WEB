import { useState, useRef, useEffect, useCallback } from "react";

const BASE_W = 400, BASE_H = 700;
const B_DOG = 14, B_BEE = 7, B_LW = 7;
const DRAW_T = 200, SURV_T = 360;

const v2d = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const d2 = (ax, ay, bx, by) => ax * bx + ay * by;

function closestOnSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  if (!l2) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}
function inBox(px, py, o, pad = 0) {
  return px >= o.x - pad && px <= o.x + o.w + pad && py >= o.y - pad && py <= o.y + o.h + pad;
}
function pushOut(cx, cy, r, vx, vy, o) {
  const ex = o.x - r, ey = o.y - r, ew = o.w + r * 2, eh = o.h + r * 2;
  if (cx < ex || cx > ex + ew || cy < ey || cy > ey + eh) return null;
  const dl = cx - ex, dr = ex + ew - cx, dt = cy - ey, db = ey + eh - cy;
  const m = Math.min(dl, dr, dt, db);
  let nx = cx, ny = cy, nvx = vx, nvy = vy;
  if (m === dl) { nx = ex; nvx = Math.min(nvx, 0) * -.3; }
  else if (m === dr) { nx = ex + ew; nvx = Math.max(nvx, 0) * -.3; }
  else if (m === dt) { ny = ey; nvy = Math.min(nvy, 0) * -.3; }
  else { ny = ey + eh; nvy = Math.max(nvy, 0) * -.3; }
  return { cx: nx, cy: ny, vx: nvx, vy: nvy };
}

function createBody(pts) {
  if (pts.length < 2) return null;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  const local = pts.map(p => ({ x: p.x - cx, y: p.y - cy }));
  let tl = 0;
  for (let i = 0; i < pts.length - 1; i++) tl += v2d(pts[i], pts[i + 1]);
  const mass = Math.max(4, tl * .018);
  let I = 0;
  for (const lp of local) I += lp.x * lp.x + lp.y * lp.y;
  I = Math.max(500, I * mass * .01);
  return { cx, cy, angle: 0, vx: 0, vy: 0, av: 0, local, mass, I, alive: true, tl };
}
function getWP(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  return b.local.map(p => ({ x: b.cx + p.x * c - p.y * s, y: b.cy + p.x * s + p.y * c }));
}
function appImp(b, px, py, ix, iy) {
  b.vx += ix / b.mass; b.vy += iy / b.mass;
  b.av += ((px - b.cx) * iy - (py - b.cy) * ix) / b.I;
}
function stepBody(b, obs, gnd, W) {
  if (!b.alive) return;
  b.vy += .1; b.vx *= .986; b.vy *= .986; b.av *= .98;
  b.cx += b.vx; b.cy += b.vy; b.angle += b.av;
  for (const p of getWP(b)) {
    if (p.y > gnd) { b.cy -= (p.y - gnd); b.vy = -Math.abs(b.vy) * .25; b.av *= .8; }
    if (p.x < 0) { b.cx -= p.x; b.vx = Math.abs(b.vx) * .25; }
    if (p.x > W) { b.cx -= (p.x - W); b.vx = -Math.abs(b.vx) * .25; }
    if (p.y < 0) { b.cy -= p.y; b.vy = Math.abs(b.vy) * .25; }
  }
  for (const o of obs) {
    for (const p of getWP(b)) {
      if (!inBox(p.x, p.y, o)) continue;
      const dx = p.x - (o.x + o.w / 2), dy = p.y - (o.y + o.h / 2);
      const hw = o.w / 2 + 1, hh = o.h / 2 + 1;
      if (hw - Math.abs(dx) < hh - Math.abs(dy)) { b.cx += (dx > 0 ? hw - Math.abs(dx) : -(hw - Math.abs(dx))); b.vx = -b.vx * .25; }
      else { b.cy += (dy > 0 ? hh - Math.abs(dy) : -(hh - Math.abs(dy))); b.vy = -b.vy * .25; }
      b.av *= .7;
    }
  }
}

function stepDog(dog, obs, gnd, W, DR) {
  dog.vy += .25; dog.vx *= .92; dog.vy *= .92;
  dog.x += dog.vx; dog.y += dog.vy;
  dog.onGround = false;
  if (dog.y + DR > gnd) { dog.y = gnd - DR; dog.vy = 0; dog.vx *= .85; dog.onGround = true; }
  if (dog.x < DR) { dog.x = DR; dog.vx = 0; }
  if (dog.x > W - DR) { dog.x = W - DR; dog.vx = 0; }
  if (dog.y < DR) { dog.y = DR; dog.vy = 0; }
  for (const o of obs) {
    const r = pushOut(dog.x, dog.y, DR, dog.vx, dog.vy, o);
    if (r) { dog.x = r.cx; dog.y = r.cy; dog.vx = r.vx; dog.vy = r.vy; if (r.cy < o.y) dog.onGround = true; }
  }
}

function collideDogBody(dog, body, DR, LW) {
  if (!body || !body.alive) return;
  const th = DR + LW / 2 + 1;
  const pts = getWP(body);
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestOnSeg(dog, pts[i], pts[i + 1]), d = v2d(dog, cp);
    if (d < th && d > .1) {
      const nx = (dog.x - cp.x) / d, ny = (dog.y - cp.y) / d;
      dog.x += nx * Math.min(th - d + .5, 8); dog.y += ny * Math.min(th - d + .5, 8);
      const imp = d2(body.vx - dog.vx, body.vy - dog.vy, nx, ny);
      if (imp > 0) { dog.vx += nx * imp * .7; dog.vy += ny * imp * .7; }
      appImp(body, cp.x, cp.y, nx * Math.abs(imp) * .15 * body.mass, ny * Math.abs(imp) * .15 * body.mass);
    }
  }
}

/*
 * UNIFIED BEE MOVEMENT: substep loop that checks obstacles + line + ground at every micro-step.
 * This is the ONLY way to guarantee no tunneling through thin objects.
 */
function moveBeeUnified(b, obs, body, gnd, W, BR, LW, particles) {
  const STEPS = 6;
  const sx = b.vx / STEPS, sy = b.vy / STEPS;
  const th = BR + LW / 2 + 1;
  const linePts = body && body.alive ? getWP(body) : [];

  for (let step = 0; step < STEPS; step++) {
    b.x += sx;
    b.y += sy;

    // 1) obstacle pushout
    for (let pass = 0; pass < 2; pass++) {
      for (const o of obs) {
        const r = pushOut(b.x, b.y, BR, b.vx, b.vy, o);
        if (r) { b.x = r.cx; b.y = r.cy; b.vx = r.vx; b.vy = r.vy; }
      }
    }

    // 2) ground + walls
    if (b.y > gnd - BR) { b.y = gnd - BR; b.vy = -Math.abs(b.vy) * .4; }
    if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * .3; }
    if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * .3; }
    if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * .3; }

    // 3) LINE collision - check at every substep!
    if (linePts.length >= 2 && b.cd <= 0) {
      let minD = Infinity, minCp = null;
      for (let i = 0; i < linePts.length - 1; i++) {
        const cp = closestOnSeg(b, linePts[i], linePts[i + 1]);
        const d = v2d(b, cp);
        if (d < minD) { minD = d; minCp = cp; }
      }
      if (minD < th && minD > .1) {
        const nx = (b.x - minCp.x) / minD, ny = (b.y - minCp.y) / minD;
        // push out
        b.x += nx * Math.min(th - minD + 1, 5);
        b.y += ny * Math.min(th - minD + 1, 5);
        // reflect
        const vDot = d2(b.vx, b.vy, nx, ny);
        if (vDot < 0) {
          b.vx -= 2 * vDot * nx;
          b.vy -= 2 * vDot * ny;
          b.vx *= .4; b.vy *= .4;
        }
        // cap speed
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 5) { b.vx = b.vx / spd * 5; b.vy = b.vy / spd * 5; }
        // push the body
        const is = (b.kind === 2 ? 5 : 2.8) * (1 + b.rage * .006);
        appImp(body, minCp.x, minCp.y, -nx * is, -ny * is);
        b.rage += 12;
        b.cd = 8;
        // particles
        for (let p = 0; p < 4; p++)
          particles.push({ x: minCp.x, y: minCp.y, vx: nx * 1.5 + (Math.random() - .5) * 3, vy: ny * 1.5 + (Math.random() - .5) * 3, life: 18, ml: 18, c: [63, 81, 181] });
        // stop remaining substeps this frame
        break;
      }
    }
  }
}

const rawLevels = [
  { label: "1", bc: 4, bs: 2.8, dogX: .5,
    obs: [{ x: .14, y: -.17, w: .21, h: .025 }, { x: .68, y: -.25, w: .14, h: .105 }, { x: .35, y: -.35, w: .18, h: .028 }] },
  { label: "2", bc: 6, bs: 3.0, dogX: .32,
    obs: [{ x: .53, y: -.19, w: .04, h: .125 }, { x: .69, y: -.28, w: .15, h: .086 }, { x: .14, y: -.34, w: .14, h: .021 }, { x: .39, y: -.44, w: .21, h: .028 }] },
  { label: "3", bc: 8, bs: 3.2, dogX: .5,
    obs: [{ x: .18, y: -.15, w: .14, h: .105 }, { x: .69, y: -.15, w: .14, h: .105 }, { x: .31, y: -.31, w: .38, h: .025 }, { x: .41, y: -.44, w: .18, h: .021 }, { x: .06, y: -.4, w: .15, h: .028 }] },
  { label: "4", bc: 10, bs: 3.5, dogX: .75,
    obs: [{ x: .6, y: -.19, w: .33, h: .028 }, { x: .35, y: -.12, w: .04, h: .105 }, { x: .14, y: -.28, w: .26, h: .025 }, { x: .5, y: -.38, w: .035, h: .134 }, { x: .74, y: -.46, w: .11, h: .086 }] },
  { label: "5", bc: 13, bs: 3.8, dogX: .5,
    obs: [{ x: .21, y: -.13, w: .14, h: .095 }, { x: .65, y: -.13, w: .14, h: .095 }, { x: .36, y: -.27, w: .28, h: .025 }, { x: .06, y: -.37, w: .04, h: .163 }, { x: .9, y: -.37, w: .04, h: .163 }, { x: .29, y: -.44, w: .16, h: .021 }, { x: .55, y: -.44, w: .16, h: .021 }] },
  { label: "★", bc: 16, bs: 4.2, dogX: .5,
    obs: [{ x: .25, y: -.19, w: .5, h: .028 }, { x: .16, y: -.37, w: .04, h: .153 }, { x: .8, y: -.37, w: .04, h: .153 }, { x: .34, y: -.35, w: .11, h: .086 }, { x: .55, y: -.35, w: .11, h: .086 }, { x: .25, y: -.5, w: .2, h: .021 }, { x: .55, y: -.5, w: .2, h: .021 }, { x: .39, y: -.62, w: .23, h: .028 }] },
];
function buildLevels(W, H, GND, DR) {
  return rawLevels.map(r => ({
    label: r.label, bc: r.bc, bs: r.bs,
    dog: { x: Math.round(r.dogX * W), y: GND - DR - 2 },
    obs: r.obs.map(o => ({ x: Math.round(o.x * W), y: Math.round(GND + o.y * H), w: Math.max(6, Math.round(o.w * W)), h: Math.max(6, Math.round(o.h * H)) })),
  }));
}
function spawnBees(n, dog, W, H) {
  return Array.from({ length: n }, (_, i) => {
    const side = i % 4; let x, y;
    if (side === 0) { x = -10; y = 50 + Math.random() * H * .4; }
    else if (side === 1) { x = W + 10; y = 50 + Math.random() * H * .4; }
    else if (side === 2) { x = W * .1 + Math.random() * W * .8; y = -10; }
    else { x = W * .1 + Math.random() * W * .8; y = -20; }
    const a = Math.atan2(dog.y - y, dog.x - x);
    return { x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, wt: Math.random() * 99, kind: i < n * .2 ? 2 : i < n * .5 ? 1 : 0, rage: 0, cd: 0 };
  });
}

/* ── render ── */
function renderBg(ctx, f, W, H, GND) {
  const g = ctx.createLinearGradient(0, 0, 0, GND);
  g.addColorStop(0, "#42A5F5"); g.addColorStop(.55, "#64B5F6"); g.addColorStop(1, "#BBDEFB");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GND);
  ctx.fillStyle = "#FFF59D"; ctx.shadowColor = "rgba(255,245,157,.35)"; ctx.shadowBlur = W * .06;
  ctx.beginPath(); ctx.arc(W * .87, H * .07, W * .065, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  for (const [sp, cy, sc] of [[.3, .06, 1], [.18, .12, .7], [.24, .04, .55]]) {
    const cx = (f * sp) % (W * 1.5) - W * .25, s = sc * W / 400;
    ctx.save(); ctx.translate(cx, H * cy); ctx.scale(s, s); ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.arc(28, -4, 18, 0, Math.PI * 2); ctx.arc(50, 3, 20, 0, Math.PI * 2); ctx.arc(22, 10, 15, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }
  ctx.fillStyle = "#9CCC65"; ctx.beginPath(); ctx.moveTo(-5, GND);
  ctx.quadraticCurveTo(W * .2, GND - H * .08, W * .4, GND - H * .025);
  ctx.quadraticCurveTo(W * .65, GND - H * .09, W * .9, GND - H * .02); ctx.lineTo(W + 5, GND); ctx.fill();
  ctx.fillStyle = "#8BC34A"; ctx.beginPath(); ctx.moveTo(-5, GND + 3);
  ctx.quadraticCurveTo(W * .3, GND - H * .03, W * .55, GND);
  ctx.quadraticCurveTo(W * .8, GND - H * .04, W + 5, GND + 3); ctx.lineTo(W + 5, GND); ctx.fill();
  ctx.fillStyle = "#689F38"; ctx.fillRect(0, GND, W, Math.max(6, H * .015));
  ctx.fillStyle = "#795548"; ctx.fillRect(0, GND + Math.max(6, H * .015), W, H);
  ctx.fillStyle = "#7CB342";
  for (let x = -2; x < W; x += W * .02) {
    const sw = Math.sin(f * .025 + x * .15) * 1.5;
    ctx.beginPath(); ctx.moveTo(x, GND + 1); ctx.quadraticCurveTo(x + 2 + sw, GND - 5, x + 4, GND + 1); ctx.fill();
  }
}
function renderOb(ctx, o) {
  if (Math.min(o.w, o.h) <= Math.max(o.w, o.h) * .35) {
    const isV = o.h > o.w;
    const g = ctx.createLinearGradient(o.x, o.y, o.x + (isV ? o.w : 0), o.y + (isV ? 0 : o.h));
    g.addColorStop(0, "#A1887F"); g.addColorStop(.5, "#BCAAA4"); g.addColorStop(1, "#8D6E63");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.12)";
    if (isV) ctx.fillRect(o.x + 1, o.y, Math.max(2, o.w * .15), o.h);
    else ctx.fillRect(o.x, o.y + 1, o.w, Math.max(2, o.h * .15));
  } else {
    ctx.fillStyle = "#90A4AE"; ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.roundRect(o.x + 3, o.y + 3, o.w * .35, o.h * .3, 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,.04)"; ctx.fillRect(o.x, o.y + o.h - 2, o.w, 2);
}
function renderDog(ctx, dog, f, phase, S) {
  const scared = phase === "play" || phase === "lose", happy = phase === "win";
  const sh = scared ? Math.sin(f * .8) * 2 * S : 0, jmp = happy ? Math.abs(Math.sin(f * .12)) * 7 * S : 0;
  ctx.save(); ctx.translate(dog.x + sh, dog.y - jmp); ctx.rotate(Math.atan2(dog.vy || 0, 10) * .12); ctx.scale(S, S);
  ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.beginPath(); ctx.ellipse(0, 15, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFECB3"; ctx.beginPath(); ctx.ellipse(0, 2, 12, 9 + Math.sin(f * .07), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFB74D"; ctx.beginPath(); ctx.ellipse(4, 0, 6, 4.5, .3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFECB3"; ctx.beginPath(); ctx.arc(0, -8, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFB74D"; ctx.beginPath(); ctx.ellipse(3, -12, 5, 4, .2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#E09040";
  ctx.beginPath(); ctx.ellipse(-7.5, -14, 4, 6, -.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7.5, -14, 4, 6, .4, 0, Math.PI * 2); ctx.fill();
  if (scared) {
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    for (const sx of [-3.5, 3.5]) {
      ctx.beginPath(); ctx.moveTo(sx - 2, -11); ctx.lineTo(sx + 2, -7.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 2, -11); ctx.lineTo(sx - 2, -7.5); ctx.stroke();
    }
  } else if (happy) {
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-3.5, -9, 2, Math.PI * .15, Math.PI * .85); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.5, -9, 2, Math.PI * .15, Math.PI * .85); ctx.stroke();
  } else {
    ctx.fillStyle = "#3E2723"; ctx.beginPath(); ctx.arc(-3.5, -9, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -9, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-2.8, -10, .7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4.2, -10, .7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,138,128,.12)";
  ctx.beginPath(); ctx.ellipse(-6, -4.5, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -4.5, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4E342E"; ctx.beginPath(); ctx.ellipse(0, -4, 1.8, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  if (happy) { ctx.fillStyle = "#EF9A9A"; ctx.beginPath(); ctx.ellipse(0, -1, 2.5, 2, 0, 0, Math.PI); ctx.fill(); }
  else if (scared) { ctx.fillStyle = "#5D4037"; ctx.beginPath(); ctx.ellipse(0, -1.5, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.strokeStyle = "#6D4C41"; ctx.lineWidth = .7; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, -2.5, 2, .2, Math.PI - .2); ctx.stroke(); }
  const tw = Math.sin(f * (happy ? .25 : .15)) * (scared ? .05 : .55);
  ctx.strokeStyle = "#E09040"; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(10, 3); ctx.quadraticCurveTo(18 + tw * 7, -3, 15 + tw * 5, -9); ctx.stroke();
  ctx.fillStyle = "#FFECB3";
  for (const px of [-5.5, 5.5]) { ctx.beginPath(); ctx.ellipse(px, 11, 3, 2.3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function renderBee(ctx, b, f, S) {
  const wb = Math.sin(f * .14 + b.wt) * 1.3 * S, wf = Math.sin(f * .7 + b.wt) * .45, mad = b.rage > 20;
  ctx.save(); ctx.translate(b.x, b.y + wb); ctx.scale(S, S);
  ctx.fillStyle = "rgba(220,240,255,.5)";
  ctx.beginPath(); ctx.ellipse(-4, -4.5, 4, 6.5, -.3 + wf, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -4.5, 4, 6.5, .3 - wf, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mad ? "#FFB300" : "#FFCA28";
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3E2723"; for (let i = -1; i <= 1; i++) ctx.fillRect(-5, i * 3.8 - 1, 10, 2);
  ctx.strokeStyle = mad ? "#E65100" : "#F9A825"; ctx.lineWidth = .6;
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-2, -2.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -2.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mad ? "#B71C1C" : "#212121"; ctx.beginPath(); ctx.arc(-2, -2.5, .7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -2.5, .7, 0, Math.PI * 2); ctx.fill();
  if (mad) { ctx.strokeStyle = "#3E2723"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-4.5, -5.5); ctx.lineTo(-.8, -4.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4.5, -5.5); ctx.lineTo(.8, -4.5); ctx.stroke(); }
  ctx.fillStyle = "#3E2723"; ctx.beginPath(); ctx.moveTo(0, 6.5); ctx.lineTo(-1.2, 9.5); ctx.lineTo(1.2, 9.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function renderBody(ctx, body, LW) {
  if (!body || !body.alive) return;
  const pts = getWP(body); if (pts.length < 2) return;
  ctx.strokeStyle = "rgba(0,0,0,.07)"; ctx.lineWidth = LW + 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(pts[0].x + 1, pts[0].y + 2);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + 1, pts[i].y + 2); ctx.stroke();
  ctx.strokeStyle = "#3F51B5"; ctx.lineWidth = LW;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = LW * .3;
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y - LW * .3);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - LW * .3); ctx.stroke();
}

export default function App() {
  const ref = useRef(null);
  const G = useRef({ W: 400, H: 700, GND: 616, S: 1, DR: 14, BR: 7, LW: 7 });
  const ST = useRef({ phase: "menu", level: 0, dog: { x: 200, y: 600, vx: 0, vy: 0, onGround: true },
    bees: [], body: null, curLine: [], ink: 0, frame: 0, timer: 0, drawTimer: 0, particles: [], levels: [] });
  const drawing = useRef(false), raf = useRef(null);
  const [, re] = useState(0);

  const resize = useCallback(() => {
    const c = ref.current; if (!c) return;
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W; c.height = H; c.style.width = W + "px"; c.style.height = H + "px";
    const sc = Math.min(W / BASE_W, H / BASE_H);
    const GND = Math.round(H * .88);
    G.current = { W, H, GND, S: sc, DR: B_DOG * sc, BR: B_BEE * sc, LW: B_LW * sc };
    ST.current.levels = buildLevels(W, H, GND, B_DOG * sc);
  }, []);
  const gp = useCallback((e) => { const s = e.touches ? e.touches[0] : e; return { x: s.clientX, y: s.clientY }; }, []);
  const finalize = useCallback(() => {
    const s = ST.current; drawing.current = false;
    if (s.curLine.length > 2) {
      let sm = [...s.curLine];
      for (let pass = 0; pass < 2; pass++) { const r = [sm[0]];
        for (let i = 1; i < sm.length - 1; i++) r.push({ x: sm[i].x * .6 + (sm[i-1].x + sm[i+1].x) * .2, y: sm[i].y * .6 + (sm[i-1].y + sm[i+1].y) * .2 });
        r.push(sm[sm.length - 1]); sm = r; }
      const ds = [sm[0]]; for (let i = 1; i < sm.length; i++) if (v2d(sm[i], ds[ds.length-1]) > 5) ds.push(sm[i]);
      if (ds.length > 1) s.body = createBody(ds);
    }
    s.curLine = []; s.phase = "play"; s.timer = SURV_T; re(v => v + 1);
  }, []);
  const init = useCallback((n) => {
    resize(); const { W, H } = G.current; const l = ST.current.levels[n];
    Object.assign(ST.current, { level: n, dog: { ...l.dog, vx: 0, vy: 0, onGround: true }, bees: spawnBees(l.bc, l.dog, W, H),
      body: null, curLine: [], ink: 0, phase: "ready", timer: SURV_T, drawTimer: DRAW_T, particles: [] }); re(v => v + 1);
  }, [resize]);

  useEffect(() => { resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, [resize]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const onD = (e) => { e.preventDefault(); const s = ST.current;
      if (s.phase === "menu") { init(0); return; }
      if (s.phase === "win") { s.level + 1 < s.levels.length ? init(s.level + 1) : (s.phase = "menu", re(v => v + 1)); return; }
      if (s.phase === "lose") { init(s.level); return; }
      if (s.phase === "ready") { s.phase = "drawing"; s.drawTimer = DRAW_T; drawing.current = true; s.curLine = [gp(e)]; re(v => v + 1); }
    };
    const onM = (e) => { e.preventDefault(); const s = ST.current; const { GND, W, DR } = G.current;
      if (!drawing.current || s.phase !== "drawing") return;
      const p = gp(e), cl = s.curLine; if (!cl.length) return;
      const d = v2d(p, cl[cl.length - 1]); if (d < 3) return;
      const lvl = s.levels[s.level];
      for (const o of lvl.obs) { if (inBox(p.x, p.y, o, 2)) { finalize(); return; } }
      if (p.y >= GND - 2 || p.x < 2 || p.x > W - 2 || p.y < 2) { finalize(); return; }
      if (v2d(p, s.dog) < DR + 3) { finalize(); return; }
      if (s.ink + d <= W * 3) { cl.push(p); s.ink += d; }
    };
    const onU = (e) => { e.preventDefault(); if (drawing.current && ST.current.phase === "drawing") finalize(); };
    c.addEventListener("mousedown", onD); c.addEventListener("mousemove", onM); c.addEventListener("mouseup", onU); c.addEventListener("mouseleave", onU);
    c.addEventListener("touchstart", onD, { passive: false }); c.addEventListener("touchmove", onM, { passive: false }); c.addEventListener("touchend", onU, { passive: false });

    const loop = () => {
      const s = ST.current; s.frame++; const f = s.frame;
      const { W, H, GND, S: sc, DR, BR, LW } = G.current;
      const lvl = s.levels[s.level] || s.levels[0];
      if (!lvl) { raf.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      renderBg(ctx, f, W, H, GND);
      const fs = Math.round(W * .04);

      if (s.phase === "menu") {
        for (const o of lvl.obs) renderOb(ctx, o);
        renderDog(ctx, { x: W / 2, y: GND - DR - 2, vx: 0, vy: 0 }, f, "menu", sc);
        for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 / 5) * i + f * .015;
          renderBee(ctx, { x: W / 2 + Math.cos(a) * W * .2, y: GND - H * .15 + Math.sin(a) * H * .06, wt: i * 18, rage: 0 }, f, sc); }
        ctx.textAlign = "center";
        ctx.fillStyle = "#4E342E"; ctx.font = `bold ${W * .1}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText("拯救狗狗", W / 2, H * .16);
        ctx.fillStyle = "#6D4C41"; ctx.font = `${fs}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText("畫線保護狗狗 · 蜜蜂會把線推走！", W / 2, H * .21);
        const pu = .93 + Math.sin(f * .06) * .07, bw = W * .38, bh = H * .06;
        ctx.save(); ctx.translate(W / 2, GND + (H - GND) / 2); ctx.scale(pu, pu);
        ctx.fillStyle = "#FF6E40"; ctx.shadowColor = "rgba(0,0,0,.1)"; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(bh * .45)}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText("開始遊戲", 0, bh * .16); ctx.restore();
        ctx.fillStyle = "rgba(80,50,30,.1)"; ctx.font = `${Math.round(W * .025)}px sans-serif`;
        ctx.fillText("HAO0321 ©Studio", W / 2, H - H * .015);
        raf.current = requestAnimationFrame(loop); return;
      }

      for (const o of lvl.obs) renderOb(ctx, o);
      if (s.curLine.length > 1) {
        ctx.strokeStyle = "rgba(0,0,0,.05)"; ctx.lineWidth = LW + 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(s.curLine[0].x + 1, s.curLine[0].y + 2);
        for (let i = 1; i < s.curLine.length; i++) ctx.lineTo(s.curLine[i].x + 1, s.curLine[i].y + 2); ctx.stroke();
        ctx.strokeStyle = "#3F51B5"; ctx.lineWidth = LW;
        ctx.beginPath(); ctx.moveTo(s.curLine[0].x, s.curLine[0].y);
        for (let i = 1; i < s.curLine.length; i++) ctx.lineTo(s.curLine[i].x, s.curLine[i].y); ctx.stroke();
      }
      renderBody(ctx, s.body, LW);
      if (s.phase === "drawing") { s.drawTimer--; if (s.drawTimer <= 0) finalize(); }
      if (s.phase === "play") {
        if (s.body && s.body.alive) stepBody(s.body, lvl.obs, GND, W);
        stepDog(s.dog, lvl.obs, GND, W, DR);
        collideDogBody(s.dog, s.body, DR, LW);
      }
      renderDog(ctx, s.dog, f, s.phase, sc);

      if (s.phase === "play") {
        const spd = lvl.bs * sc;
        for (const b of s.bees) {
          b.cd = Math.max(0, b.cd - 1); b.rage = Math.max(0, b.rage - .1);
          const toDog = Math.atan2(s.dog.y - b.y, s.dog.x - b.x), dDog = v2d(b, s.dog);
          let ms = spd * (1 + b.rage * .004);
          // check if line blocks direct path
          let blocked = false;
          if (s.body && s.body.alive) {
            const wPts = getWP(s.body);
            const chk = { x: b.x + Math.cos(toDog) * 22 * sc, y: b.y + Math.sin(toDog) * 22 * sc };
            for (let i = 0; i < wPts.length - 1; i++) {
              if (v2d(chk, closestOnSeg(chk, wPts[i], wPts[i + 1])) < BR + LW + 2) { blocked = true; break; }
            }
          }
          const acc = (b.kind === 2 ? .16 : b.kind === 1 ? .11 : .1) * sc;
          if (b.kind === 2) { b.vx += Math.cos(toDog) * acc * (1 + b.rage * .003); b.vy += Math.sin(toDog) * acc * (1 + b.rage * .003); ms *= 1.12; }
          else if (b.kind === 1 && blocked && dDog > 30 * sc) {
            const side = b.wt > 50 ? 1 : -1;
            b.vx += Math.cos(toDog + side * Math.PI * .45) * acc + Math.cos(toDog) * acc * .3;
            b.vy += Math.sin(toDog + side * Math.PI * .45) * acc + Math.sin(toDog) * acc * .3;
          } else if (blocked) {
            const alt = toDog + (Math.sin(f * .04 + b.wt) > 0 ? .9 : -.9);
            b.vx += Math.cos(alt) * acc * .9 + Math.cos(toDog) * acc * .25;
            b.vy += Math.sin(alt) * acc * .9 + Math.sin(toDog) * acc * .25;
          } else { b.vx += Math.cos(toDog) * acc; b.vy += Math.sin(toDog) * acc; }
          const cs = Math.hypot(b.vx, b.vy);
          if (cs > ms) { b.vx = b.vx / cs * ms; b.vy = b.vy / cs * ms; }

          // UNIFIED substep movement (obstacles + line + ground in one loop)
          moveBeeUnified(b, lvl.obs, s.body, GND, W, BR, LW, s.particles);

          // off screen redirect
          if (b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > H + 80) {
            const a2 = Math.atan2(s.dog.y - b.y, s.dog.x - b.x);
            b.vx = Math.cos(a2) * ms * .5; b.vy = Math.sin(a2) * ms * .5;
            b.x = Math.max(-15, Math.min(W + 15, b.x)); b.y = Math.max(-15, b.y);
          }
          if (v2d(b, s.dog) < DR + BR) {
            s.phase = "lose";
            for (let p = 0; p < 18; p++)
              s.particles.push({ x: s.dog.x, y: s.dog.y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: 35, ml: 35, c: [244, 67, 54] });
            re(v => v + 1);
          }
        }
        s.timer--;
        if (s.timer <= 0 && s.phase === "play") {
          s.phase = "win";
          for (let p = 0; p < 35; p++)
            s.particles.push({ x: s.dog.x + (Math.random() - .5) * 50, y: s.dog.y + (Math.random() - .5) * 50,
              vx: (Math.random() - .5) * 6, vy: -Math.random() * 5 - 2, life: 50, ml: 50, c: Math.random() > .5 ? [255, 193, 7] : [255, 112, 67] });
          re(v => v + 1);
        }
      }
      for (const b of s.bees) renderBee(ctx, b, f, sc);
      s.particles = s.particles.filter(p => p.life > 0);
      for (const p of s.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += .07; p.life--;
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.life / p.ml})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, (1.5 + (p.life / p.ml) * 2) * sc, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      const pd = W * .03, bH = H * .04, bR = bH / 2;
      ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.05)"; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.roundRect(pd, pd, W * .14, bH, bR); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#E53935"; ctx.font = `bold ${Math.round(bH * .55)}px 'Helvetica Neue','PingFang TC',sans-serif`;
      ctx.textAlign = "center"; ctx.fillText(lvl.label, pd + W * .07, pd + bH * .65);
      ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.05)"; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.roundRect(W - pd - W * .17, pd, W * .17, bH * .9, bR); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#E65100"; ctx.font = `bold ${Math.round(bH * .45)}px sans-serif`;
      ctx.fillText(`🐝×${lvl.bc}`, W - pd - W * .085, pd + bH * .6);
      const barY = GND + (H - GND) * .35, barH = H * .015, barPad = W * .08;
      if (s.phase === "ready") {
        ctx.textAlign = "center"; ctx.fillStyle = "#4E342E";
        ctx.font = `bold ${fs}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText("觸碰開始畫線！", W / 2, GND + (H - GND) * .35);
        ctx.fillStyle = "#795548"; ctx.font = `${Math.round(fs * .8)}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText("一筆畫完放手蜜蜂就來", W / 2, GND + (H - GND) * .55);
      }
      if (s.phase === "drawing" || s.phase === "play") {
        const isD = s.phase === "drawing", pct = isD ? s.drawTimer / DRAW_T : s.timer / SURV_T;
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(barPad, barY, W - barPad * 2, barH, barH / 2); ctx.fill();
        ctx.fillStyle = isD ? (pct > .3 ? "#FF7043" : "#E53935") : (pct > .3 ? "#66BB6A" : "#FF7043");
        ctx.beginPath(); ctx.roundRect(barPad, barY, (W - barPad * 2) * pct, barH, barH / 2); ctx.fill();
        ctx.textAlign = "center"; ctx.fillStyle = "#4E342E";
        ctx.font = `bold ${Math.round(fs * .85)}px 'Helvetica Neue','PingFang TC',sans-serif`;
        ctx.fillText(isD ? `✏️ ${Math.ceil(s.drawTimer / 60)}秒` : `⏱ ${Math.ceil(s.timer / 60)}秒`, W / 2, barY - barH * .8);
      }
      if (s.phase === "win" || s.phase === "lose") {
        ctx.fillStyle = s.phase === "win" ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.2)"; ctx.fillRect(0, 0, W, H);
        const cw = W * .75, ch = H * .15;
        ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.1)"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.roundRect((W - cw) / 2, (H - ch) / 2, cw, ch, W * .04); ctx.fill(); ctx.shadowBlur = 0;
        ctx.textAlign = "center";
        if (s.phase === "win") {
          ctx.fillStyle = "#FF6E40"; ctx.font = `bold ${Math.round(W * .065)}px 'Helvetica Neue','PingFang TC',sans-serif`;
          ctx.fillText("🎉 狗狗得救了！", W / 2, H / 2 - ch * .08);
          ctx.fillStyle = "#8D6E63"; ctx.font = `${Math.round(W * .035)}px 'Helvetica Neue','PingFang TC',sans-serif`;
          ctx.fillText(s.level + 1 < s.levels.length ? "點擊下一關 →" : "🏆 全部通關！", W / 2, H / 2 + ch * .28);
        } else {
          ctx.fillStyle = "#E53935"; ctx.font = `bold ${Math.round(W * .065)}px 'Helvetica Neue','PingFang TC',sans-serif`;
          ctx.fillText("💀 被叮了！", W / 2, H / 2 - ch * .08);
          ctx.fillStyle = "#8D6E63"; ctx.font = `${Math.round(W * .035)}px 'Helvetica Neue','PingFang TC',sans-serif`;
          ctx.fillText("點擊重試", W / 2, H / 2 + ch * .28);
        }
      }
      ctx.fillStyle = "rgba(80,50,30,.07)"; ctx.font = `${Math.round(W * .023)}px sans-serif`;
      ctx.textAlign = "center"; ctx.fillText("HAO0321 ©Studio", W / 2, H - H * .01);
      ctx.restore();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current);
      c.removeEventListener("mousedown", onD); c.removeEventListener("mousemove", onM); c.removeEventListener("mouseup", onU); c.removeEventListener("mouseleave", onU);
      c.removeEventListener("touchstart", onD); c.removeEventListener("touchmove", onM); c.removeEventListener("touchend", onU); };
  }, [gp, init, finalize]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#795548", userSelect: "none", WebkitUserSelect: "none" }}>
      <canvas ref={ref} style={{ display: "block", touchAction: "none", cursor: "crosshair" }} />
    </div>
  );
}
