import { useState, useEffect, useRef, useCallback } from "react";

const GW = 400, GH = 700;
const PW = 30, PH = 36;
const PLATH = 12;
const GRAV = 0.4;
const SPD = 4.8;
const SCRL = 1.15;
const GAP = 88;

const C = {
  bg: "#f5f3f0", grid: "#ebe8e4",
  pink: "#e84393", purple: "#6c5ce7", blue: "#0984e3",
  cyan: "#00cec9", green: "#00b894", yellow: "#fdcb6e",
  red: "#d63031", dark: "#2d3436", white: "#fff",
  orange: "#e17055", mint: "#55efc4",
};

const PC = [C.pink, C.purple, C.blue, C.cyan, C.green];
const T = { NORM: 0, MOVE: 1, BREAK: 2, SPIKE: 3, BOOST: 4, CONV: 5 };
const ITEM = { NONE: 0, REVERSE: 1, SHIELD: 2, STAR: 3, MAGNET: 4 };

function mkPlat(y, idx) {
  let type = T.NORM;
  if (idx > 4) {
    const r = Math.random();
    if (r < .13) type = T.MOVE;
    else if (r < .21) type = T.BREAK;
    else if (r < .28) type = T.SPIKE;
    else if (r < .34) type = T.BOOST;
    else if (r < .40) type = T.CONV;
  }
  const w = type === T.SPIKE ? 52 + Math.random() * 38 : 68 + Math.random() * 48;
  let item = ITEM.NONE;
  if (type !== T.SPIKE && type !== T.BOOST && Math.random() < 0.18 && idx > 3) {
    const ir = Math.random();
    if (ir < .22) item = ITEM.REVERSE;
    else if (ir < .42) item = ITEM.SHIELD;
    else if (ir < .80) item = ITEM.STAR;
    else item = ITEM.MAGNET;
  }
  return {
    x: 15 + Math.random() * (GW - w - 30), y, w, type,
    color: PC[Math.floor(Math.random() * PC.length)],
    dir: Math.random() > .5 ? 1 : -1,
    convDir: Math.random() > .5 ? 1 : -1,
    broken: false, id: Math.random(), item, itemTaken: false,
    hitFrame: 0, // landing glow
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export default function Game() {
  const cvs = useRef(null);
  const [state, setState] = useState("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const g = useRef({});
  const keys = useRef({ l: false, r: false });
  const touch = useRef({ on: false, x: 0 });
  const raf = useRef(null);

  const init = useCallback(() => {
    const plats = [];
    for (let i = 0; i < 9; i++) plats.push(mkPlat(160 + i * GAP, i));
    plats[0].x = GW / 2 - 45; plats[0].w = 90; plats[0].type = T.NORM;
    g.current = {
      p: { x: GW / 2 - PW / 2, y: 120, vy: 0, vx: 0, face: 1, land: 0 },
      plats, score: 0, idx: 9, spd: SCRL,
      dust: [], // landing dust particles
      t: 0, shake: 0,
      reversed: false, revTimer: 0, revMax: 480,
      shield: false, magnet: false, magTimer: 0, magMax: 360,
      combo: 0, comboTimer: 0, stars: 0,
      tintAlpha: 0,
    };
  }, []);

  const start = useCallback(() => { init(); setScore(0); setState("playing"); }, [init]);

  useEffect(() => {
    const kd = e => {
      const d = e.type === "keydown";
      if (e.key === "ArrowLeft" || e.key === "a") keys.current.l = d;
      if (e.key === "ArrowRight" || e.key === "d") keys.current.r = d;
      if ((e.key === " " || e.key === "Enter") && state !== "playing") start();
    };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", kd);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", kd); };
  }, [state, start]);

  const ts = e => { const t2 = e.touches[0], r = cvs.current?.getBoundingClientRect(); if (r) touch.current = { on: true, x: t2.clientX - r.left }; };
  const tm = e => { e.preventDefault(); const t2 = e.touches[0], r = cvs.current?.getBoundingClientRect(); if (r) touch.current.x = t2.clientX - r.left; };
  const te = () => { touch.current.on = false; keys.current.l = false; keys.current.r = false; };

  // Spawn landing dust
  function spawnDust(d, x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.8; // spread upward
      const speed = 1 + Math.random() * 1.8;
      d.dust.push({
        x, y: y - 1,
        vx: Math.cos(angle) * speed * (i % 2 === 0 ? 1.5 : 1),
        vy: -0.5 - Math.random() * 1.2,
        l: 18 + Math.random() * 8,
        ml: 26,
        r: 2 + Math.random() * 2,
        c: color,
      });
    }
  }

  useEffect(() => {
    if (state !== "playing") return;
    const canvas = cvs.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const d = g.current, p = d.p;
      d.t++;

      const sc = canvas.clientWidth / GW;
      if (touch.current.on) {
        const tx = touch.current.x / sc;
        keys.current.l = tx < p.x + PW / 2 - 12;
        keys.current.r = tx > p.x + PW / 2 + 12;
      }

      if (keys.current.l) { p.vx = -SPD; p.face = -1; }
      else if (keys.current.r) { p.vx = SPD; p.face = 1; }
      else p.vx *= 0.72;

      const gDir = d.reversed ? -1 : 1;
      p.vy += GRAV * gDir;
      if (Math.abs(p.vy) > 12) p.vy = 12 * Math.sign(p.vy);
      p.x += p.vx; p.y += p.vy;
      if (p.land > 0) p.land--;
      if (p.x < -PW) p.x = GW; if (p.x > GW) p.x = -PW;

      d.spd = SCRL + d.score * 0.0022;
      if (d.spd > 3.8) d.spd = 3.8;
      const scrollDir = d.reversed ? -d.spd : d.spd;

      if (d.reversed) {
        d.revTimer--;
        d.tintAlpha = Math.min(d.tintAlpha + 0.005, 0.05);
        if (d.revTimer <= 0) { d.reversed = false; }
      } else {
        d.tintAlpha = Math.max(d.tintAlpha - 0.005, 0);
      }
      if (d.magnet) { d.magTimer--; if (d.magTimer <= 0) d.magnet = false; }
      if (d.comboTimer > 0) { d.comboTimer--; if (d.comboTimer <= 0) d.combo = 0; }

      for (const pl of d.plats) {
        pl.y -= scrollDir;
        if (pl.hitFrame > 0) pl.hitFrame--;
        if (pl.type === T.MOVE && !pl.broken) {
          pl.x += pl.dir * 1.4; if (pl.x < 8 || pl.x + pl.w > GW - 8) pl.dir *= -1;
        }
        if (pl.broken) continue;

        if (d.magnet && pl.type !== T.SPIKE) {
          const dx = (pl.x + pl.w / 2) - (p.x + PW / 2);
          const dist = Math.abs(dx);
          if (dist < 100 && dist > 10) p.x += dx * 0.015;
        }

        const falling = d.reversed ? p.vy < 0 : p.vy >= 0;
        if (falling) {
          const cx = p.x + PW / 2;
          const hitY = d.reversed ? p.y : p.y + PH;
          const prevHitY = hitY - p.vy - scrollDir;

          let col = false;
          if (d.reversed) {
            col = cx > pl.x + 2 && cx < pl.x + pl.w - 2 && hitY <= pl.y + PLATH && prevHitY >= pl.y;
          } else {
            col = cx > pl.x + 2 && cx < pl.x + pl.w - 2 && hitY >= pl.y && prevHitY <= pl.y + PLATH;
          }

          if (col) {
            if (pl.type === T.SPIKE) {
              if (d.shield) {
                d.shield = false; d.shake = 5;
                p.vy = d.reversed ? 5 : -5;
                spawnDust(d, cx, pl.y, C.mint);
                continue;
              }
              d.shake = 10;
              setState("gameover"); setBest(b => Math.max(b, d.score));
              if (typeof window !== "undefined" && window.haoGame) window.haoGame.reportScore(d.score);
              return;
            }

            p.y = d.reversed ? pl.y + PLATH : pl.y - PH;
            p.vy = 0; p.land = 6;
            pl.hitFrame = 10; // trigger platform glow

            // Landing dust
            const dustY = d.reversed ? pl.y + PLATH : pl.y;
            spawnDust(d, cx, dustY, pl.color);

            if (pl.type === T.CONV) p.vx += pl.convDir * 2.5;

            if (pl.type === T.BREAK) {
              pl.broken = true;
              for (let i = 0; i < 5; i++)
                d.dust.push({
                  x: pl.x + Math.random() * pl.w, y: pl.y + PLATH / 2,
                  vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 2,
                  l: 18, ml: 18, r: 2 + Math.random() * 2.5, c: pl.color
                });
            }
            if (pl.type === T.BOOST) {
              p.vy = d.reversed ? 9 : -9; p.land = 0;
            }

            d.combo++; d.comboTimer = 90;
            const pts = d.combo >= 5 ? 3 : d.combo >= 3 ? 2 : 1;
            d.score += pts; setScore(d.score);

            if (pl.item !== ITEM.NONE && !pl.itemTaken) {
              pl.itemTaken = true;
              if (pl.item === ITEM.REVERSE) {
                d.reversed = !d.reversed; d.revTimer = d.revMax;
                p.vy = d.reversed ? -3 : 3;
              } else if (pl.item === ITEM.SHIELD) {
                d.shield = true;
              } else if (pl.item === ITEM.STAR) {
                d.stars++; d.score += 5; setScore(d.score);
              } else if (pl.item === ITEM.MAGNET) {
                d.magnet = true; d.magTimer = d.magMax;
              }
            }
          }
        }
      }

      if (d.reversed) {
        d.plats = d.plats.filter(pl => pl.y < GH + 30);
        while (d.plats.length < 9) {
          const minY = d.plats.length > 0 ? Math.min(...d.plats.map(pl => pl.y)) : 0;
          d.plats.push(mkPlat(minY - GAP, d.idx++));
        }
      } else {
        d.plats = d.plats.filter(pl => pl.y > -30);
        while (d.plats.length < 9) {
          const maxY = d.plats.length > 0 ? Math.max(...d.plats.map(pl => pl.y)) : GH;
          d.plats.push(mkPlat(maxY + GAP, d.idx++));
        }
      }

      const dead = d.reversed ? (p.y > GH + 50 || p.y < -PH - 30) : (p.y < -PH - 10 || p.y > GH + 50);
      if (dead) {
        d.shake = 10; setState("gameover"); setBest(b => Math.max(b, d.score));
        if (typeof window !== "undefined" && window.haoGame) window.haoGame.reportScore(d.score);
        return;
      }

      d.dust = d.dust.filter(f => { f.x += f.vx; f.y += f.vy; f.vy += 0.04; f.vx *= 0.96; f.l--; return f.l > 0; });
      if (d.shake > 0) d.shake--;

      // ========= RENDER =========
      const sk = d.shake > 0 ? (Math.random() - .5) * d.shake * 0.4 : 0;
      ctx.save(); ctx.translate(sk, sk);

      ctx.fillStyle = d.reversed ? "#f0f7f8" : C.bg;
      ctx.fillRect(0, 0, GW, GH);

      // Grid
      ctx.strokeStyle = d.reversed ? "#e0eef1" : C.grid; ctx.lineWidth = 0.5;
      for (let x = 0; x <= GW; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GH); ctx.stroke(); }
      for (let y2 = 0; y2 <= GH; y2 += 28) { ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(GW, y2); ctx.stroke(); }

      if (d.tintAlpha > 0.003) {
        ctx.fillStyle = `rgba(0,206,201,${d.tintAlpha})`;
        ctx.fillRect(0, 0, GW, GH);
      }

      // Danger zone
      const dzY = d.reversed ? GH - 36 : 0;
      const dg = ctx.createLinearGradient(0, dzY, 0, d.reversed ? GH : 36);
      dg.addColorStop(d.reversed ? 1 : 0, "rgba(214,48,49,0.18)");
      dg.addColorStop(d.reversed ? 0 : 1, "rgba(214,48,49,0)");
      ctx.fillStyle = dg; ctx.fillRect(0, dzY, GW, 36);

      // Danger line + teeth
      ctx.fillStyle = C.red;
      if (d.reversed) {
        ctx.fillRect(0, GH - 2, GW, 2);
        for (let i = 0; i < GW; i += 14) {
          ctx.beginPath();
          ctx.moveTo(i, GH - 2); ctx.lineTo(i + 7, GH - 9 - Math.sin(d.t * .05 + i * .1) * 1.5); ctx.lineTo(i + 14, GH - 2); ctx.fill();
        }
      } else {
        ctx.fillRect(0, 0, GW, 2);
        for (let i = 0; i < GW; i += 14) {
          ctx.beginPath();
          ctx.moveTo(i, 2); ctx.lineTo(i + 7, 9 + Math.sin(d.t * .05 + i * .1) * 1.5); ctx.lineTo(i + 14, 2); ctx.fill();
        }
      }

      // ---- PLATFORMS ----
      for (const pl of d.plats) {
        if (pl.broken) continue;
        ctx.save();

        // Landing glow: brief white highlight behind platform
        if (pl.hitFrame > 0) {
          const gAlpha = pl.hitFrame / 10 * 0.35;
          ctx.fillStyle = `rgba(255,255,255,${gAlpha})`;
          rr(ctx, pl.x - 3, pl.y - 3, pl.w + 6, PLATH + 6, 9);
          ctx.fill();
          ctx.shadowColor = pl.color;
          ctx.shadowBlur = pl.hitFrame * 1.2;
        }

        if (pl.type === T.SPIKE) {
          ctx.fillStyle = C.red;
          rr(ctx, pl.x, pl.y, pl.w, PLATH, 4); ctx.fill();
          ctx.fillStyle = "#ff7675";
          const base = d.reversed ? pl.y + PLATH : pl.y;
          const tipDir = d.reversed ? 1 : -1;
          for (let i = 3; i < pl.w - 5; i += 10) {
            ctx.beginPath();
            ctx.moveTo(pl.x + i, base); ctx.lineTo(pl.x + i + 5, base + tipDir * 7); ctx.lineTo(pl.x + i + 10, base); ctx.fill();
          }
        } else if (pl.type === T.BOOST) {
          ctx.fillStyle = C.yellow;
          rr(ctx, pl.x, pl.y, pl.w, PLATH, 6); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          rr(ctx, pl.x + 4, pl.y + 2, pl.w - 8, 4, 2); ctx.fill();
          ctx.strokeStyle = "#f39c12"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
          const mx = pl.x + pl.w / 2;
          for (let j = -1; j <= 1; j++) {
            ctx.beginPath();
            ctx.moveTo(mx + j * 14 - 3, pl.y + 9); ctx.lineTo(mx + j * 14, pl.y + 5); ctx.lineTo(mx + j * 14 + 3, pl.y + 9); ctx.stroke();
          }
        } else if (pl.type === T.BREAK) {
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([4, 3]); ctx.strokeStyle = pl.color; ctx.lineWidth = 1.5;
          ctx.fillStyle = pl.color + "15";
          rr(ctx, pl.x, pl.y, pl.w, PLATH, 5); ctx.fill(); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        } else if (pl.type === T.CONV) {
          ctx.fillStyle = C.orange;
          rr(ctx, pl.x, pl.y, pl.w, PLATH, 6); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          rr(ctx, pl.x + 3, pl.y + 2, pl.w - 6, 4, 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
          for (let i = 0; i < 3; i++) {
            const cx2 = pl.x + 12 + i * ((pl.w - 24) / 2);
            const off = ((d.t * 0.12 * pl.convDir) % 8);
            ctx.beginPath();
            ctx.moveTo(cx2 + off, pl.y + 3); ctx.lineTo(cx2 + off + pl.convDir * 4, pl.y + PLATH / 2); ctx.lineTo(cx2 + off, pl.y + PLATH - 3); ctx.stroke();
          }
        } else {
          ctx.fillStyle = pl.color;
          rr(ctx, pl.x, pl.y, pl.w, PLATH, 6); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          rr(ctx, pl.x + 4, pl.y + 2, pl.w - 8, 4, 2); ctx.fill();
          if (pl.type === T.MOVE) {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            const ax = pl.dir > 0 ? pl.x + pl.w - 10 : pl.x + 3;
            ctx.beginPath();
            ctx.moveTo(ax + pl.dir * 7, pl.y + PLATH / 2);
            ctx.lineTo(ax, pl.y + 2); ctx.lineTo(ax, pl.y + PLATH - 2); ctx.fill();
          }
        }
        ctx.shadowBlur = 0;

        // Item icon
        if (pl.item !== ITEM.NONE && !pl.itemTaken) {
          const ix = pl.x + pl.w / 2, iy = pl.y - 13 + Math.sin(d.t * 0.06) * 2.5;
          ctx.shadowBlur = 6;
          if (pl.item === ITEM.REVERSE) {
            ctx.shadowColor = C.cyan; ctx.fillStyle = C.cyan;
            ctx.beginPath(); ctx.moveTo(ix, iy - 6); ctx.lineTo(ix - 4, iy - 1); ctx.lineTo(ix + 4, iy - 1); ctx.fill();
            ctx.beginPath(); ctx.moveTo(ix, iy + 6); ctx.lineTo(ix - 4, iy + 1); ctx.lineTo(ix + 4, iy + 1); ctx.fill();
          } else if (pl.item === ITEM.SHIELD) {
            ctx.shadowColor = C.mint; ctx.fillStyle = C.mint;
            ctx.beginPath();
            ctx.moveTo(ix, iy - 6); ctx.lineTo(ix + 5, iy - 2); ctx.lineTo(ix + 4, iy + 4);
            ctx.lineTo(ix, iy + 6); ctx.lineTo(ix - 4, iy + 4); ctx.lineTo(ix - 5, iy - 2); ctx.closePath(); ctx.fill();
          } else if (pl.item === ITEM.STAR) {
            ctx.shadowColor = C.yellow; ctx.fillStyle = C.yellow;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const a1 = (i * 72 - 90) * Math.PI / 180;
              const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
              ctx.lineTo(ix + Math.cos(a1) * 6, iy + Math.sin(a1) * 6);
              ctx.lineTo(ix + Math.cos(a2) * 2.5, iy + Math.sin(a2) * 2.5);
            }
            ctx.closePath(); ctx.fill();
          } else if (pl.item === ITEM.MAGNET) {
            ctx.shadowColor = C.blue; ctx.fillStyle = C.blue;
            ctx.beginPath();
            ctx.arc(ix, iy - 1, 5, Math.PI, 0); ctx.lineTo(ix + 5, iy + 3);
            ctx.lineTo(ix + 2.5, iy + 3); ctx.lineTo(ix + 2.5, iy + 1);
            ctx.arc(ix, iy - 1, 2.5, 0, Math.PI, true);
            ctx.lineTo(ix - 2.5, iy + 3); ctx.lineTo(ix - 5, iy + 3);
            ctx.closePath(); ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }

      // Dust particles
      for (const f of d.dust) {
        const alpha = f.l / f.ml;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = f.c;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * alpha, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ---- PLAYER ----
      const px = p.x, py = p.y;
      const sq = p.land > 0 ? 1 + p.land * 0.01 : 1;
      const sqY = p.land > 0 ? 1 - p.land * 0.015 : 1;

      ctx.save();
      ctx.translate(px + PW / 2, py + PH / 2);
      if (d.reversed) ctx.scale(1, -1);
      ctx.scale(sq, sqY);
      ctx.translate(-(px + PW / 2), -(py + PH / 2));

      // Shield indicator: simple colored body tint
      const bodyC = d.reversed ? C.cyan : (d.shield ? C.mint : C.purple);

      ctx.fillStyle = bodyC;
      ctx.beginPath(); ctx.ellipse(px + PW / 2, py + PH - 10, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.ellipse(px + PW / 2 - 3, py + PH - 18, 5, 6, -.3, 0, Math.PI * 2); ctx.fill();

      const eo = p.face * 2.5;
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.ellipse(px + 9 + eo, py + 13, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + 21 + eo, py + 13, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      const po = p.face * 2;
      ctx.fillStyle = C.dark;
      ctx.beginPath(); ctx.ellipse(px + 9 + eo + po, py + 14, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + 21 + eo + po, py + 14, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.arc(px + 10.5 + eo + po, py + 12.5, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 22.5 + eo + po, py + 12.5, 1.2, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = bodyC; ctx.lineCap = "round"; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const tx = px + 5 + i * 10;
        const w = Math.sin(d.t * .08 + i * 1.2) * 3;
        ctx.beginPath(); ctx.moveTo(tx, py + 4);
        ctx.quadraticCurveTo(tx + w + p.face * 4, py - 7 - i * 2, tx + w + p.face * 7, py - 2);
        ctx.stroke();
        ctx.fillStyle = d.reversed ? C.green : C.pink;
        ctx.beginPath(); ctx.arc(tx + w + p.face * 7, py - 2, 2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();

      // ---- HUD ----
      // Score pill
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      rr(ctx, 10, 16, 118, 30, 15); ctx.fill();
      ctx.strokeStyle = (d.reversed ? C.cyan : C.purple) + "20"; ctx.lineWidth = 1;
      rr(ctx, 10, 16, 118, 30, 15); ctx.stroke();

      ctx.font = "700 10px 'Baloo 2',sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = (d.reversed ? C.cyan : C.purple) + "80";
      ctx.fillText("SCORE", 22, 31);
      ctx.font = "800 15px 'Baloo 2',sans-serif";
      ctx.fillStyle = C.dark; ctx.textAlign = "right";
      ctx.fillText(`${d.score}`, 120, 32);

      // Combo badge
      if (d.combo >= 3) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        rr(ctx, GW - 56, 16, 44, 24, 12); ctx.fill();
        ctx.font = "800 11px 'Baloo 2',sans-serif";
        ctx.textAlign = "center"; ctx.fillStyle = C.orange;
        ctx.fillText(`${d.combo}x`, GW - 34, 29);
      }

      // Status icons bottom-left (minimal)
      let ix = 10;
      const iy = GH - 30;
      if (d.reversed) {
        const pct = d.revTimer / d.revMax;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        rr(ctx, ix, iy, 70, 20, 10); ctx.fill();
        ctx.fillStyle = C.cyan + "25";
        rr(ctx, ix + 2, iy + 2, 66 * pct, 16, 8); ctx.fill();
        ctx.font = "700 9px 'Baloo 2',sans-serif";
        ctx.textAlign = "left"; ctx.fillStyle = C.cyan;
        ctx.fillText(" REVERSE", ix + 8, iy + 11);
        ix += 76;
      }
      if (d.shield) {
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        rr(ctx, ix, iy, 56, 20, 10); ctx.fill();
        ctx.font = "700 9px 'Baloo 2',sans-serif";
        ctx.textAlign = "left"; ctx.fillStyle = C.mint;
        ctx.fillText(" SHIELD", ix + 6, iy + 11);
        ix += 62;
      }
      if (d.magnet) {
        const pct = d.magTimer / d.magMax;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        rr(ctx, ix, iy, 62, 20, 10); ctx.fill();
        ctx.fillStyle = C.blue + "20";
        rr(ctx, ix + 2, iy + 2, 58 * pct, 16, 8); ctx.fill();
        ctx.font = "700 9px 'Baloo 2',sans-serif";
        ctx.textAlign = "left"; ctx.fillStyle = C.blue;
        ctx.fillText(" MAGNET", ix + 6, iy + 11);
      }

      ctx.restore();
      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [state, best]);

  const mw = typeof window !== "undefined" ? Math.min(GW, window.innerWidth - 20) : GW;
  const mh = mw * (GH / GW);

  const Ov = ({ children }) => (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "rgba(245,243,240,0.95)", backdropFilter: "blur(10px)"
    }}>{children}</div>
  );

  const Btn = ({ onClick, children }) => (
    <button onClick={onClick}
      onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
      onMouseLeave={e => e.target.style.transform = "scale(1)"}
      style={{
        padding: "12px 44px", fontSize: 17, fontWeight: 800, fontFamily: "inherit",
        border: "none", borderRadius: 50, cursor: "pointer",
        background: C.pink, color: C.white, letterSpacing: 2,
        boxShadow: `0 3px 14px ${C.pink}30`, transition: "transform .15s", textTransform: "uppercase"
      }}>{children}</button>
  );

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(150deg, #faf8f6, #f0ece8)",
      fontFamily: "'Baloo 2', sans-serif", overflow: "hidden", userSelect: "none"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {state !== "playing" && (
          <div style={{ textAlign: "center", marginBottom: 2, animation: "fi .4s ease-out" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: C.dark, margin: 0, letterSpacing: -.5 }}>
              <span style={{ color: C.pink }}>下</span>樓梯
            </h1>
            <p style={{ fontSize: 9, color: C.purple, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: .5, margin: 0 }}>SPLAT DESCENT</p>
          </div>
        )}

        <div style={{
          position: "relative", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 6px 28px rgba(108,92,231,.1), 0 1px 4px rgba(0,0,0,.06)",
          border: "1.5px solid #e8e5e0"
        }}>
          <canvas ref={cvs} width={GW} height={GH}
            onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}
            style={{ display: "block", width: mw, height: mh, touchAction: "none" }} />

          {state === "menu" && (
            <Ov>
              <div style={{ fontSize: 56, marginBottom: 8, animation: "bf 2s ease-in-out infinite" }}></div>
              <div style={{
                padding: "12px 20px", borderRadius: 12, background: C.white,
                border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,.03)",
                marginBottom: 14, textAlign: "center"
              }}>
                <p style={{ color: C.dark, fontSize: 12, opacity: .5, fontWeight: 600, margin: "2px 0" }}>◀ ▶ 或觸控左右移動</p>
                <p style={{ color: C.dark, fontSize: 12, opacity: .5, fontWeight: 600, margin: "2px 0" }}>踩平台往下 · 收集道具 · 存活越久越好！</p>
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 5, flexWrap: "wrap", justifyContent: "center", maxWidth: 280 }}>
                {[
                  { c: C.purple, l: "普通" }, { c: C.blue, l: "移動" }, { c: "#bbb", l: "碎裂" },
                  { c: C.red, l: "尖刺" }, { c: C.yellow, l: "彈跳" }, { c: C.orange, l: "傳送帶" },
                ].map((t2, i) => (
                  <span key={i} style={{
                    padding: "2px 8px", borderRadius: 10, background: t2.c + "15",
                    color: t2.c, fontSize: 10, fontWeight: 700
                  }}>{t2.l}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 280 }}>
                {[
                  { c: C.cyan, l: " 反轉" }, { c: C.mint, l: " 護盾" },
                  { c: "#d4a017", l: " 星星" }, { c: C.blue, l: " 磁鐵" },
                ].map((t2, i) => (
                  <span key={i} style={{
                    padding: "2px 8px", borderRadius: 10, background: t2.c + "15",
                    color: t2.c, fontSize: 10, fontWeight: 700
                  }}>{t2.l}</span>
                ))}
              </div>
              <Btn onClick={start}>START</Btn>
              {best > 0 && <p style={{ marginTop: 6, fontSize: 10, color: C.purple, opacity: .4, fontWeight: 700 }}>BEST: {best}</p>}
            </Ov>
          )}

          {state === "gameover" && (
            <Ov>
              <div style={{ fontSize: 44, marginBottom: 4, animation: "bf 1.5s ease-in-out infinite" }}></div>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.red, margin: "0 0 10px" }}>SPLATTED!</p>
              <div style={{
                padding: "14px 32px", borderRadius: 14, background: C.white,
                border: "1px solid #eee", boxShadow: "0 2px 10px rgba(0,0,0,.04)",
                textAlign: "center", marginBottom: 14
              }}>
                <p style={{ color: C.pink, fontSize: 40, fontWeight: 800, margin: 0, lineHeight: 1 }}>{score}</p>
                <p style={{ color: C.dark, fontSize: 10, opacity: .35, fontWeight: 700, margin: "3px 0 0" }}>SCORE</p>
                {score >= best && score > 0 && (
                  <p style={{ color: "#d4a017", fontSize: 12, fontWeight: 800, margin: "5px 0 0" }}> NEW BEST!</p>
                )}
                {best > 0 && <p style={{ color: C.purple, fontSize: 9, opacity: .4, fontWeight: 700, margin: "3px 0 0" }}>BEST: {best}</p>}
              </div>
              <Btn onClick={start}>RETRY</Btn>
            </Ov>
          )}
        </div>

        {state !== "playing" && (
          <p style={{ fontSize: 8, color: C.dark, opacity: .15, fontWeight: 700, letterSpacing: 3 }}>HAO0321 ©STUDIO</p>
        )}
      </div>

      <style>{`
        @keyframes fi{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bf{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>
    </div>
  );
}
