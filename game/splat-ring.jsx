import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  green: "#C6FF00", pink: "#FF2B8A", yellow: "#FFE229",
  cyan: "#00E5FF", orange: "#FF6E1A", purple: "#8B5CF6",
  bg: "#18122B", text: "#F0EAFF", dim: "rgba(240,234,255,0.25)",
};
const TAU = Math.PI * 2;
const TR = 140, INNER = TR - 20, BR = 12;
const SEG = 180, SARC = TAU / SEG;
const BASE_SPEED = 0.010;

// Jump tuning
const GRAV = 0.42;
const TAP_V = -6.8;      // tap jump: small
const HOLD_BOOST = -0.32; // extra lift per frame while holding
const MAX_HOLD_F = 18;    // max frames of hold boost
const JUMP_BUF_F = 12;    // buffer window (frames)

const PLAYER_A = Math.PI / 2; // 6 o'clock

// ── helpers ──
function angDist(a, b) { return Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI); }

function splatShape(ctx, x, y, r, seed) {
  const n = 7 + (seed % 4);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const w = 0.55 + ((Math.sin(seed * 13.7 + i * 5.3) + 1) / 2) * 0.55;
    const px = x + Math.cos(a) * r * w, py = y + Math.sin(a) * r * w;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const pa = ((i - 0.5) / n) * TAU;
      const pw = 0.5 + ((Math.sin(seed * 7.1 + i * 3.7) + 1) / 2) * 0.6;
      ctx.quadraticCurveTo(x + Math.cos(pa) * r * pw * 1.1, y + Math.sin(pa) * r * pw * 1.1, px, py);
    }
  }
  ctx.closePath();
}

function makeBg(w, h) {
  const out = [], cols = [C.pink, C.green, C.purple, C.cyan, C.orange];
  for (let i = 0; i < 8; i++) out.push({ x: 20 + Math.random() * (w - 40), y: 20 + Math.random() * (h - 40), r: 18 + Math.random() * 35, color: cols[i % 5], a: 0.03 + Math.random() * 0.025, seed: i * 17 });
  for (let i = 0; i < 12; i++) out.push({ x: Math.random() * w, y: Math.random() * h, r: 2 + Math.random() * 4, color: cols[Math.floor(Math.random() * 5)], a: 0.035 + Math.random() * 0.02, seed: i, dot: true });
  return out;
}

// Generate obstacles with guaranteed minimum gap and safe zone around player
function makeObs(round) {
  const count = Math.min(3 + round, 8);     // r1=4, r2=5 … r5=8 cap
  const minGap = TAU / count * 0.7;         // at least 70% of even spacing
  const safeZone = 1.8;                      // ~103° clear around player

  const obs = [];
  let tries = 0;
  while (obs.length < count && tries < 200) {
    tries++;
    const a = Math.random() * TAU;
    // must be far from player
    if (angDist(a, PLAYER_A) < safeZone) continue;
    // must be far from other obstacles
    if (obs.some(o => angDist(a, o.a) < minGap)) continue;
    const canBig = round >= 3 && Math.random() < 0.2;
    obs.push({ a, big: canBig });
  }
  return obs;
}

export default function SplatRing() {
  const cvs = useRef(null);
  const G = useRef(null);
  const bgRef = useRef(null);
  const raf = useRef(null);
  // track whether finger/mouse is currently down
  const pressing = useRef(false);
  const [ui, setUi] = useState({ score: 0, lives: 3, phase: "menu", pct: 0, round: 1 });

  const W = 420, H = 420, CX = W / 2, CY = H / 2;

  // ── init ──
  const init = useCallback(() => {
    const best = G.current?.best || 0;
    G.current = {
      rot: 0,
      dropPhase: true, dropT: 0, dropDur: 45, goT: 0,
      vy: 0, jumpOff: 0, airborne: false,
      holdF: 0, jumpBuf: 0,
      painted: new Set(),
      obs: makeObs(1),
      score: 0, lives: 3, phase: "play",
      combo: 0, best, round: 1,
      spdMul: 1,
      particles: [], flash: 0,
      comboT: 0, comboV: 0, hitCD: 0,
    };
    pressing.current = false;
    setUi({ score: 0, lives: 3, phase: "play", pct: 0, round: 1 });
  }, []);

  // ── input ──
  const doPress = useCallback(() => {
    pressing.current = true;
    const g = G.current;
    if (!g || g.phase === "menu" || g.phase === "dead") { init(); return; }
    if (g.dropPhase) return;
    if (!g.airborne) {
      // jump immediately
      g.vy = TAP_V;
      g.airborne = true;
      g.holdF = 0;
    } else {
      // in air → buffer
      g.jumpBuf = JUMP_BUF_F;
    }
  }, [init]);

  const doRelease = useCallback(() => {
    pressing.current = false;
  }, []);

  useEffect(() => {
    const kd = e => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); doPress(); }
    };
    const ku = e => { if (e.code === "Space" || e.code === "ArrowUp") doRelease(); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [doPress, doRelease]);

  // ── game loop ──
  useEffect(() => {
    const ctx = cvs.current.getContext("2d");
    if (!bgRef.current) bgRef.current = makeBg(W, H);

    function burst(x, y, color, n, spd) {
      const g = G.current; if (!g) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        g.particles.push({ x, y, vx: Math.cos(a) * (1 + Math.random() * spd), vy: Math.sin(a) * (1 + Math.random() * spd), life: 16, ml: 16, color, r: 2 + Math.random() * 2.5 });
      }
    }

    // ── draw helpers ──
    function drawBg() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.016; ctx.strokeStyle = C.pink; ctx.lineWidth = 14;
      for (let i = -H; i < W + H; i += 46) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.restore();
      bgRef.current.forEach(s => {
        ctx.save(); ctx.globalAlpha = s.a; ctx.fillStyle = s.color;
        if (s.dot) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
        else { splatShape(ctx, s.x, s.y, s.r, s.seed); ctx.fill(); }
        ctx.restore();
      });
    }

    function drawTrack(g) {
      // outer ring base
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 22;
      ctx.beginPath(); ctx.arc(CX, CY, TR, 0, TAU); ctx.stroke();
      // painted segments
      ctx.lineWidth = 22; ctx.lineCap = "butt";
      ctx.strokeStyle = C.pink; ctx.shadowColor = C.pink; ctx.shadowBlur = 5;
      g.painted.forEach(seg => {
        const wa = seg * SARC + g.rot;
        ctx.beginPath(); ctx.arc(CX, CY, TR, wa - 0.003, wa + SARC + 0.006); ctx.stroke();
      });
      ctx.shadowBlur = 0;
      // inner edge
      ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(CX, CY, INNER, 0, TAU); ctx.stroke();
    }

    function drawObs(g) {
      g.obs.forEach(ob => {
        const wa = ob.a + g.rot;
        const ox = CX + Math.cos(wa) * INNER, oy = CY + Math.sin(wa) * INNER;
        const h = ob.big ? 28 : 16, w = 14;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(wa + Math.PI / 2);
        const col = ob.big ? C.orange : C.yellow;
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 5;
        const rx = -w / 2, ry = -h, cr = 4;
        ctx.beginPath();
        ctx.moveTo(rx + cr, ry); ctx.lineTo(rx + w - cr, ry);
        ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + cr);
        ctx.lineTo(rx + w, -cr); ctx.quadraticCurveTo(rx + w, 0, rx + w - cr, 0);
        ctx.lineTo(rx + cr, 0); ctx.quadraticCurveTo(rx, 0, rx, -cr);
        ctx.lineTo(rx, ry + cr); ctx.quadraticCurveTo(rx, ry, rx + cr, ry);
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        // label
        ctx.fillStyle = "rgba(24,18,43,0.75)";
        ctx.font = `bold ${ob.big ? 12 : 9}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(ob.big ? "!!" : "!", 0, -h / 2);
        ctx.restore();
      });
    }

    function drawBall(px, py, sz, blink) {
      if (blink) return;
      ctx.fillStyle = C.green; ctx.shadowColor = C.green; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      // eyes
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.arc(px - 4, py - 2, 3.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 4, py - 2, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = C.bg;
      ctx.beginPath(); ctx.arc(px - 3.5, py - 2.5, 1.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 4.3, py - 2.5, 1.2, 0, TAU); ctx.fill();
    }

    function drawParticles(g) {
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life / p.ml; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / p.ml), 0, TAU); ctx.fill();
      }); ctx.globalAlpha = 1;
    }

    // ── main loop ──
    function loop() {
      ctx.clearRect(0, 0, W, H);
      drawBg();
      const g = G.current;

      // ═══ MENU ═══
      if (!g || g.phase === "menu") {
        ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.arc(CX, CY, TR, 0, TAU); ctx.stroke();
        const t = Date.now() / 2000;
        ctx.strokeStyle = C.pink; ctx.lineWidth = 22; ctx.shadowColor = C.pink; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(CX, CY, TR, t - 2.5, t); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(CX, CY, INNER, 0, TAU); ctx.stroke();
        const bounce = Math.abs(Math.sin(Date.now() / 280)) * 14;
        drawBall(CX, CY + INNER - bounce, BR, false);
        ctx.textAlign = "center";
        ctx.fillStyle = C.green; ctx.font = "900 42px 'Trebuchet MS',sans-serif";
        ctx.fillText("SPLAT", CX - 52, CY - 22);
        ctx.fillStyle = C.pink; ctx.fillText("RING", CX + 54, CY - 22);
        ctx.fillStyle = C.text; ctx.font = "600 12px 'Trebuchet MS',sans-serif";
        ctx.fillText("跳過障礙 ● 塗滿圓環！", CX, CY + 10);
        ctx.fillStyle = C.yellow; ctx.font = "500 11px 'Trebuchet MS',sans-serif";
        ctx.fillText("點擊跳 ● 長按跳更高", CX, CY + 30);
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 350) * 0.6;
        ctx.fillStyle = C.cyan; ctx.font = "700 15px 'Trebuchet MS',sans-serif";
        ctx.fillText("點擊開始", CX, CY + 64); ctx.globalAlpha = 1;
        if (g?.best) { ctx.fillStyle = C.dim; ctx.font = "12px 'Trebuchet MS',sans-serif"; ctx.fillText("BEST " + g.best, CX, CY + 88); }
        raf.current = requestAnimationFrame(loop); return;
      }

      // ═══ DEAD ═══
      if (g.phase === "dead") {
        drawTrack(g); drawObs(g);
        ctx.textAlign = "center";
        ctx.fillStyle = C.pink; ctx.font = "900 38px 'Trebuchet MS',sans-serif"; ctx.fillText("GAME OVER", CX, CY - 28);
        var goScoreSize = g.score > 9999 ? 16 : g.score > 999 ? 18 : 22;
        ctx.fillStyle = C.text; ctx.font = "700 " + goScoreSize + "px 'Trebuchet MS',sans-serif"; ctx.fillText(g.score + " 分", CX, CY + 10);
        ctx.fillStyle = C.dim; ctx.font = "12px 'Trebuchet MS',sans-serif";
        ctx.fillText("ROUND " + g.round + " ● " + Math.round(g.painted.size / SEG * 100) + "%", CX, CY + 34);
        if (g.score >= g.best && g.score > 0) { ctx.fillStyle = C.yellow; ctx.font = "700 13px 'Trebuchet MS',sans-serif"; ctx.fillText(" NEW RECORD ", CX, CY + 56); }
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 350) * 0.6;
        ctx.fillStyle = C.cyan; ctx.font = "600 14px 'Trebuchet MS',sans-serif"; ctx.fillText("點擊重來", CX, CY + 88); ctx.globalAlpha = 1;
        raf.current = requestAnimationFrame(loop); return;
      }

      // ═══ DROP PHASE ═══
      if (g.dropPhase) {
        g.dropT++;
        const t = Math.min(g.dropT / g.dropDur, 1);
        const ease = t < 0.65 ? (t / 0.65) : 1 - Math.sin((t - 0.65) / 0.35 * Math.PI) * 0.1 * (1 - t);
        const dropR = ease * INNER;
        const bx = CX + Math.cos(PLAYER_A) * dropR, by = CY + Math.sin(PLAYER_A) * dropR;

        drawTrack(g); drawObs(g); drawBall(bx, by, BR, false);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = C.yellow; ctx.font = "900 26px 'Trebuchet MS',sans-serif";
        ctx.globalAlpha = 1 - t * 0.6; ctx.fillText("READY", CX, CY); ctx.globalAlpha = 1;

        if (g.dropT % 3 === 0) {
          g.particles.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 12, ml: 12, color: C.green, r: 2 + Math.random() * 2 });
        }
        g.particles = g.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; p.life--; return p.life > 0; });
        drawParticles(g);

        if (g.dropT >= g.dropDur) { g.dropPhase = false; g.goT = 35; g.hitCD = 70; }
        raf.current = requestAnimationFrame(loop); return;
      }

      // ═══ PLAY ═══

      // ring rotation
      const speed = BASE_SPEED * g.spdMul;
      g.rot = (g.rot + speed) % TAU;

      // ── jump physics ──
      if (g.airborne) {
        // hold boost: only if player is CURRENTLY pressing
        if (pressing.current && g.holdF < MAX_HOLD_F) {
          g.vy += HOLD_BOOST;
          g.holdF++;
        }
        g.vy += GRAV;
        g.jumpOff -= g.vy;
        if (g.jumpOff <= 0) {
          g.jumpOff = 0; g.vy = 0; g.airborne = false; g.holdF = 0;
          // land burst
          burst(CX + Math.cos(PLAYER_A) * INNER, CY + Math.sin(PLAYER_A) * INNER, C.pink, 3, 1.5);
          // jump buffer → auto re-jump
          if (g.jumpBuf > 0 && pressing.current) {
            g.vy = TAP_V;
            g.airborne = true;
            g.holdF = 0;
            g.jumpBuf = 0;
          }
        }
      }
      if (g.jumpBuf > 0) g.jumpBuf--;

      // ── paint ──
      if (!g.airborne) {
        const ringA = ((PLAYER_A - g.rot) % TAU + TAU) % TAU;
        const seg0 = Math.round(ringA / SARC) % SEG;
        for (let d = -1; d <= 1; d++) {
          const s = ((seg0 + d) % SEG + SEG) % SEG;
          if (!g.painted.has(s)) { g.painted.add(s); g.score++; }
        }
      }

      // ── round clear (80%) ──
      if (g.painted.size >= Math.floor(SEG * 0.80)) {
        g.round++;
        g.painted.clear();
        g.obs = makeObs(g.round);
        g.spdMul = 1 + (g.round - 1) * 0.04; // gentle ramp
        g.score += 50;
        g.hitCD = 70;
        for (let i = 0; i < 18; i++) {
          const a2 = Math.random() * TAU, dd = 20 + Math.random() * (TR - 30);
          g.particles.push({ x: CX + Math.cos(a2) * dd, y: CY + Math.sin(a2) * dd, vx: Math.cos(a2) * 2, vy: Math.sin(a2) * 2, life: 24, ml: 24, color: [C.pink, C.green, C.yellow, C.cyan][i % 4], r: 3 + Math.random() * 3 });
        }
      }

      // timers
      if (g.hitCD > 0) g.hitCD--;
      if (g.goT > 0) g.goT--;
      if (g.flash > 0) g.flash--;
      if (g.comboT > 0) g.comboT--;

      // ── collision (forgiving) ──
      g.obs.forEach(ob => {
        const obsW = (ob.a + g.rot) % TAU;
        const d = angDist(obsW, PLAYER_A);
        if (d < 0.13 && g.hitCD <= 0) {
          const wallH = ob.big ? 24 : 14; // generous clearance
          if (g.jumpOff > wallH) {
            if (!ob._sc) {
              ob._sc = true;
              g.score += 20; g.combo++;
              g.comboT = 35; g.comboV = g.combo;
              burst(CX + Math.cos(PLAYER_A) * INNER, CY + Math.sin(PLAYER_A) * INNER, C.green, 6, 2);
            }
          } else {
            g.lives--; g.combo = 0; g.flash = 10;
            g.jumpOff = 0; g.vy = 0; g.airborne = false;
            g.hitCD = 50;
            burst(CX + Math.cos(PLAYER_A) * INNER, CY + Math.sin(PLAYER_A) * INNER, C.orange, 10, 3);
            if (g.lives <= 0) {
              g.phase = "dead"; if (g.score > g.best) g.best = g.score;
              if (typeof window !== "undefined" && window.haoGame) window.haoGame.reportScore(g.score);
            }
          }
        } else if (d > 0.25) { ob._sc = false; }
      });

      // particles
      g.particles = g.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.91; p.vy *= 0.91; p.life--; return p.life > 0; });

      // ═══ DRAW ═══
      if (g.flash > 0) { ctx.fillStyle = `rgba(255,110,26,${g.flash / 25})`; ctx.fillRect(0, 0, W, H); }
      drawTrack(g);
      drawObs(g);

      // player shadow
      if (g.airborne) {
        const sx = CX + Math.cos(PLAYER_A) * INNER, sy = CY + Math.sin(PLAYER_A) * INNER;
        ctx.globalAlpha = Math.max(0.03, 0.1 - g.jumpOff / 400);
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.ellipse(sx, sy, BR * 0.7, BR * 0.25, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // player
      const pr = INNER - g.jumpOff;
      const px = CX + Math.cos(PLAYER_A) * pr, py = CY + Math.sin(PLAYER_A) * pr;
      const blink = g.hitCD > 0 && g.hitCD < 50 && Math.floor(g.hitCD / 3) % 2 === 0;
      drawBall(px, py, BR + (g.airborne ? 1.5 : 0), blink);

      // hold ring
      if (pressing.current && g.airborne) {
        const chP = Math.min(g.holdF / MAX_HOLD_F, 1);
        ctx.strokeStyle = C.cyan; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(px, py, BR + 5, -Math.PI / 2, -Math.PI / 2 + chP * TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // approach warning
      g.obs.forEach(ob => {
        const wa = (ob.a + g.rot) % TAU;
        const d = angDist(wa, PLAYER_A);
        if (d < 0.6 && d > 0.12) {
          const dir = ((wa - PLAYER_A + TAU) % TAU) < Math.PI ? 1 : -1;
          const ax = CX + Math.cos(PLAYER_A + dir * 0.28) * (INNER + 16);
          const ay = CY + Math.sin(PLAYER_A + dir * 0.28) * (INNER + 16);
          ctx.save();
          ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.25;
          ctx.fillStyle = ob.big ? C.orange : C.yellow;
          ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("", ax, ay); ctx.restore();
        }
      });

      drawParticles(g);

      // "GO!" text
      if (g.goT > 0) {
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const sc = 1 + (1 - g.goT / 35) * 0.4;
        ctx.translate(CX, CY); ctx.scale(sc, sc);
        ctx.globalAlpha = g.goT / 35;
        ctx.fillStyle = C.green; ctx.font = "900 34px 'Trebuchet MS',sans-serif";
        ctx.fillText("GO!", 0, 0); ctx.restore();
      }

      // center HUD
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var scoreFontSize = g.score > 9999 ? 22 : g.score > 999 ? 26 : 32;
      ctx.fillStyle = C.text; ctx.font = "900 " + scoreFontSize + "px 'Trebuchet MS',sans-serif";
      ctx.fillText(g.score, CX, CY - 14);
      const pctV = Math.round(g.painted.size / SEG * 100);
      ctx.fillStyle = C.pink; ctx.font = "700 13px 'Trebuchet MS',sans-serif";
      ctx.fillText(pctV + "%", CX, CY + 10);
      ctx.fillStyle = C.dim; ctx.font = "11px 'Trebuchet MS',sans-serif";
      ctx.fillText("ROUND " + g.round, CX, CY + 28);

      // combo
      if (g.comboT > 0 && g.comboV > 1) {
        ctx.save();
        var comboFontSize = g.comboV > 50 ? 11 : g.comboV > 20 ? 13 : 15;
        const sc = 1 + (g.comboT / 35) * 0.2;
        ctx.translate(CX, CY + 48); ctx.scale(sc, sc);
        ctx.globalAlpha = Math.min(1, g.comboT / 12);
        ctx.fillStyle = C.cyan; ctx.font = "900 " + comboFontSize + "px 'Trebuchet MS',sans-serif";
        ctx.fillText(g.comboV + "x COMBO!", 0, 0); ctx.restore();
      }

      setUi({ score: g.score, lives: g.lives, phase: g.phase, pct: pctV, round: g.round });
      raf.current = requestAnimationFrame(loop);
    }

    if (!G.current) G.current = { phase: "menu", best: 0 };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div
      style={{
        width: "100vw", height: "100vh", background: C.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Trebuchet MS',sans-serif", overflow: "hidden",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation",
      }}
      onMouseDown={doPress} onMouseUp={doRelease}
      onTouchStart={e => { e.preventDefault(); doPress(); }}
      onTouchEnd={e => { e.preventDefault(); doRelease(); }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 6, zIndex: 2, alignItems: "center", maxWidth: "95vw", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255,43,138,0.08)", border: "1.5px solid " + C.pink,
          borderRadius: 20, padding: "4px 10px", display: "flex", gap: 4, alignItems: "center",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: "50%",
              background: i < ui.lives ? C.pink : "rgba(255,43,138,0.1)",
              boxShadow: i < ui.lives ? "0 0 4px " + C.pink : "none", transition: "all 0.2s",
            }} />
          ))}
        </div>
        <div style={{
          background: "rgba(198,255,0,0.06)", border: "1.5px solid " + C.green,
          borderRadius: 20, padding: "3px 12px",
          color: C.green, fontWeight: 800, fontSize: 14, minWidth: 46, textAlign: "center",
        }}>{ui.score}</div>
        <div style={{
          background: "rgba(255,43,138,0.06)", borderRadius: 20,
          padding: "3px 6px", display: "flex", alignItems: "center", gap: 4,
          border: "1.5px solid rgba(255,43,138,0.25)", minWidth: 68,
        }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: ui.pct + "%", height: "100%", background: C.pink, borderRadius: 3, transition: "width 0.15s", boxShadow: "0 0 3px " + C.pink }} />
          </div>
          <span style={{ color: C.pink, fontSize: 10, fontWeight: 700 }}>{ui.pct}%</span>
        </div>
      </div>

      <canvas ref={cvs} width={W} height={H}
        style={{ borderRadius: 16, maxWidth: "95vw", maxHeight: "70vh" }} />

      {ui.phase === "play" && (
        <div style={{ marginTop: 8, color: C.dim, fontSize: 11, letterSpacing: 0.3, zIndex: 2 }}>
          輕點跳 ● 長按跳更高 ● 80% 通關
        </div>
      )}
    </div>
  );
}
