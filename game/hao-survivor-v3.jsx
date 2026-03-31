import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// 🎮 HAO SURVIVOR v2 — 全面重製版
// ═══════════════════════════════════════════

const PLAYER_R = 18;
const XP_PER_LEVEL = [0,5,8,12,16,20,25,30,36,42,50,58,68,78,90,104,120,138,158,180,205,232,262,295,330,370,415,465,520,580,999];

const CHARACTERS = [
  { id:"knight", name:"劍士・騎", desc:"近戰爆發型", emoji:"⚔️", color:"#ff6b6b", hp:120, atk:18, speed:3.5, atkRange:70, atkSpeed:400, weapon:"劍氣斬" },
  { id:"mage", name:"法師・幻", desc:"遠程魔法AOE", emoji:"🔮", color:"#a78bfa", hp:85, atk:14, speed:3.2, atkRange:170, atkSpeed:600, weapon:"魔法彈" },
  { id:"archer", name:"弓手・疾", desc:"極速連射", emoji:"🏹", color:"#34d399", hp:95, atk:11, speed:4.2, atkRange:200, atkSpeed:280, weapon:"連射箭" },
  { id:"tank", name:"守衛・盾", desc:"肉盾坦克", emoji:"🛡️", color:"#60a5fa", hp:200, atk:10, speed:2.5, atkRange:55, atkSpeed:500, weapon:"盾擊" },
];

const ALL_SKILLS = [
  { id:"atk_up", name:"攻擊強化", desc:"攻擊力 +25%", icon:"⚔️", apply:(p)=>{p.atk*=1.25;} },
  { id:"hp_up", name:"生命強化", desc:"最大HP +40", icon:"❤️", apply:(p)=>{p.maxHp+=40;p.hp+=40;} },
  { id:"speed_up", name:"疾風步", desc:"移速 +20%", icon:"💨", apply:(p)=>{p.speed*=1.2;} },
  { id:"atk_speed", name:"急速攻擊", desc:"攻速 +25%", icon:"⚡", apply:(p)=>{p.atkSpeed*=0.75;} },
  { id:"range_up", name:"射程延伸", desc:"射程 +30%", icon:"🎯", apply:(p)=>{p.atkRange*=1.3;} },
  { id:"heal", name:"治癒之光", desc:"回復 40 HP", icon:"💚", apply:(p)=>{p.hp=Math.min(p.hp+40,p.maxHp);} },
  { id:"crit", name:"致命一擊", desc:"暴擊率 +12%", icon:"💥", apply:(p)=>{p.critRate=(p.critRate||0.05)+0.12;} },
  { id:"shield", name:"能量護盾", desc:"護盾 +25", icon:"🔰", apply:(p)=>{p.shield=(p.shield||0)+25;} },
  { id:"lifesteal", name:"嗜血", desc:"吸血 5%（上限8/次）", icon:"🧛", apply:(p)=>{p.lifesteal=Math.min((p.lifesteal||0)+0.05,0.15);} },
  { id:"multi", name:"多重射擊", desc:"彈幕 +1", icon:"✨", apply:(p)=>{p.multiShot=(p.multiShot||1)+1;} },
  { id:"explosion", name:"爆裂彈", desc:"子彈爆炸AOE", icon:"💣", apply:(p)=>{p.explosive=true;} },
  { id:"magnet", name:"經驗磁鐵", desc:"拾取範圍 ×2", icon:"🧲", apply:(p)=>{p.magnetRange=(p.magnetRange||80)*2;} },
  { id:"swarm", name:"怪物狂潮", desc:"召喚滿版弱怪農經驗！", icon:"🌊", apply:(p)=>{p._triggerSwarm=true;} },
  { id:"orbital", name:"守護光環", desc:"環繞火球自動傷害", icon:"🔥", apply:(p)=>{p.orbitals=(p.orbitals||0)+1;} },
  { id:"thorns", name:"荊棘反甲", desc:"被打反彈 30% 傷害", icon:"🌹", apply:(p)=>{p.thorns=(p.thorns||0)+0.3;} },
  { id:"freeze", name:"冰霜光環", desc:"周圍敵人減速 40%", icon:"❄️", apply:(p)=>{p.freezeAura=(p.freezeAura||0)+40;p.freezeRange=(p.freezeRange||100)+30;} },
  { id:"dodge", name:"閃避本能", desc:"15% 機率完全閃避", icon:"🌀", apply:(p)=>{p.dodgeRate=(p.dodgeRate||0)+0.15;} },
  { id:"regen", name:"生命再生", desc:"每秒回復 2 HP", icon:"🍀", apply:(p)=>{p.regen=(p.regen||0)+2;} },
];

const ENEMY_TYPES = [
  { name:"史萊姆", emoji:"🟢", hp:12, atk:5, speed:1.2, r:10, xp:1, color:"#4ade80" },
  { name:"蝙蝠", emoji:"🦇", hp:8, atk:7, speed:3, r:8, xp:1, color:"#c084fc" },
  { name:"骷髏", emoji:"💀", hp:25, atk:10, speed:1.5, r:12, xp:2, color:"#e2e8f0" },
  { name:"惡魔", emoji:"👿", hp:40, atk:14, speed:1.8, r:14, xp:3, color:"#f87171" },
  { name:"暗影", emoji:"👻", hp:30, atk:11, speed:2.5, r:11, xp:2, color:"#818cf8" },
  { name:"毒蜘蛛", emoji:"🕷️", hp:20, atk:8, speed:2.2, r:9, xp:2, color:"#a3e635", ranged:true, shootCD:2000 },
  { name:"火焰魔", emoji:"🔥", hp:55, atk:18, speed:1.3, r:13, xp:4, color:"#fb923c" },
  { name:"冰霜巫", emoji:"🧊", hp:35, atk:12, speed:1.6, r:11, xp:3, color:"#67e8f9", ranged:true, shootCD:1800 },
];

const BOSS_TYPES = [
  { name:"骨龍", emoji:"🐉", hp:1200, atk:30, speed:1.2, r:36, xp:50, color:"#ef4444" },
  { name:"暗黑騎士", emoji:"🗡️", hp:2000, atk:40, speed:1.4, r:34, xp:70, color:"#7c3aed" },
  { name:"魔王", emoji:"👑", hp:3000, atk:50, speed:1, r:42, xp:100, color:"#f59e0b" },
];

const STAGES = [
  { id:1, name:"幽暗森林", bg1:"#060e1a", bg2:"#0a1e14", waves:25, enemies:[0,1,5], bossIdx:0 },
  { id:2, name:"亡靈墓地", bg1:"#100820", bg2:"#1a0a30", waves:30, enemies:[1,2,4,7], bossIdx:1 },
  { id:3, name:"魔王城堡", bg1:"#1a0808", bg2:"#2a0e0e", waves:35, enemies:[2,3,4,6,7], bossIdx:2 },
];

const dist = (a,b) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
const rand = (a,b) => Math.random()*(b-a)+a;
const randInt = (a,b) => Math.floor(rand(a,b+1));
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const pick = (a,n) => [...a].sort(()=>Math.random()-0.5).slice(0,n);
const lerp = (a,b,t) => a+(b-a)*t;

export default function HaoSurvivor() {
  const [screen, setScreen] = useState("title");
  const [selectedChar, setSelectedChar] = useState(null);
  const [selectedStage, setSelectedStage] = useState(0);
  const [skillChoices, setSkillChoices] = useState([]);
  const [gameStats, setGameStats] = useState({ kills:0, time:0, level:1 });
  const [stagesUnlocked, setStagesUnlocked] = useState(1);
  const [joyVis, setJoyVis] = useState(null); // { ox, oy, cx, cy }

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef({});
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const joyRef = useRef({ active:false, ox:0, oy:0, cx:0, cy:0, dx:0, dy:0 });

  const [dims, setDims] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const CW = dims.w;
  const CH = dims.h;

  const initGame = useCallback((ci, si) => {
    const c = CHARACTERS[ci];
    const s = STAGES[si];
    const mapW = Math.max(CW*2.5, 2000);
    const mapH = Math.max(CH*2.5, 1500);
    gameRef.current = {
      player: {
        x:mapW/2, y:mapH/2, r:PLAYER_R,
        hp:c.hp, maxHp:c.hp, atk:c.atk, speed:c.speed,
        atkRange:c.atkRange, atkSpeed:c.atkSpeed,
        color:c.color, emoji:c.emoji, charId:c.id, weapon:c.weapon,
        level:1, xp:0, xpNext:XP_PER_LEVEL[1],
        lastAtk:0, critRate:0.05, shield:0, lifesteal:0,
        multiShot:1, invincible:0, skills:[],
        magnetRange:80, explosive:false, facing:0,
        orbitals:0, thorns:0, freezeAura:0, freezeRange:0,
        dodgeRate:0, regen:0,
      },
      enemies:[], projectiles:[], particles:[], xpOrbs:[], dmgTexts:[], enemyProjectiles:[],
      wave:1, maxWaves:s.waves, bossSpawned:false, bossDefeated:false,
      kills:0, time:0, lastWave:0,
      lastTrickle:0, trickleInterval:2200,
      nextWaveTime:12,
      stage:s, stageIdx:si, paused:false,
      cam:{x:0,y:0}, mapW, mapH,
      shake:{x:0,y:0,intensity:0,decay:0.88},
      flash:0, killCombo:0, comboTimer:0,
    };
    // Spawn a small starting group (easy to farm)
    const g = gameRef.current;
    for (let i=0; i<5; i++) {
      const ti = s.enemies[randInt(0, s.enemies.length-1)];
      const t = ENEMY_TYPES[ti];
      const a = (i/5)*Math.PI*2 + rand(-0.3,0.3);
      const d = rand(200, 320);
      g.enemies.push({
        ...t,
        hp: t.hp, maxHp: t.hp,
        atk: t.atk,
        x: mapW/2+Math.cos(a)*d, y: mapH/2+Math.sin(a)*d,
        isBoss:false, hitFlash:0,
      });
    }
  }, [CW, CH]);

  const spawnTrickle = useCallback((g) => {
    const { stage, wave, player } = g;
    const count = Math.min(3 + wave * 2, 25);
    for (let i=0; i<count; i++) {
      const ti = stage.enemies[randInt(0, stage.enemies.length-1)];
      const t = ENEMY_TYPES[ti];
      const a = Math.random()*Math.PI*2;
      const d = rand(300, 500);
      // Steeper scaling: HP ×(1+wave*0.25), ATK ×(1+wave*0.15), speed ramps too
      const hpScale = 1 + wave * 0.25;
      const atkScale = 1 + wave * 0.15;
      const spdScale = 1 + wave * 0.02;
      const isElite = wave >= 8 && Math.random() < 0.08 + wave * 0.005;
      g.enemies.push({
        ...t,
        hp: t.hp * hpScale * (isElite?3:1),
        maxHp: t.hp * hpScale * (isElite?3:1),
        atk: t.atk * atkScale * (isElite?2:1),
        speed: t.speed * spdScale * (isElite?1.3:1),
        r: isElite ? t.r*1.4 : t.r,
        xp: isElite ? t.xp*5 : t.xp,
        x: player.x+Math.cos(a)*d, y: player.y+Math.sin(a)*d,
        isBoss:false, hitFlash:0, isElite,
        lastShot: t.ranged ? 0 : undefined,
        ranged: t.ranged, shootCD: t.shootCD,
      });
    }
  }, []);

  const spawnBoss = useCallback((g) => {
    const { stage, player } = g;
    const b = BOSS_TYPES[stage.bossIdx];
    const a = Math.random()*Math.PI*2;
    g.enemies.push({ ...b, x:player.x+Math.cos(a)*400, y:player.y+Math.sin(a)*400, maxHp:b.hp, isBoss:true, hitFlash:0 });
    g.bossSpawned = true;
  }, []);

  const addShake = (intensity) => {
    const g = gameRef.current;
    if (g) g.shake.intensity = Math.min(g.shake.intensity + intensity, 10);
  };

  const gameLoop = useCallback((timestamp) => {
    const g = gameRef.current;
    if (!g || g.paused) { animRef.current = requestAnimationFrame(gameLoop); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rawDt = lastTimeRef.current ? (timestamp - lastTimeRef.current)/1000 : 1/60;
    const dt = Math.min(rawDt, 1/30);
    lastTimeRef.current = timestamp;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    g.time += dt;

    let dx=0, dy=0;
    const k = keysRef.current;
    if (k["w"]||k["arrowup"]) dy-=1;
    if (k["s"]||k["arrowdown"]) dy+=1;
    if (k["a"]||k["arrowleft"]) dx-=1;
    if (k["d"]||k["arrowright"]) dx+=1;
    const j = joyRef.current;
    if (j.active) { dx=j.dx; dy=j.dy; }
    const mag = Math.sqrt(dx*dx+dy*dy);
    if (mag>0) { dx/=mag; dy/=mag; }

    const p = g.player;
    p.x = clamp(p.x+dx*p.speed*(dt*60), p.r, g.mapW-p.r);
    p.y = clamp(p.y+dy*p.speed*(dt*60), p.r, g.mapH-p.r);
    if (mag>0) p.facing = Math.atan2(dy, dx);
    if (p.invincible>0) p.invincible-=dt;

    const targetCX = clamp(p.x-W/2, 0, g.mapW-W);
    const targetCY = clamp(p.y-H/2, 0, g.mapH-H);
    g.cam.x = lerp(g.cam.x, targetCX, 0.12);
    g.cam.y = lerp(g.cam.y, targetCY, 0.12);

    if (g.shake.intensity > 0.5) {
      g.shake.x = (Math.random()-0.5)*g.shake.intensity*2;
      g.shake.y = (Math.random()-0.5)*g.shake.intensity*2;
      g.shake.intensity *= g.shake.decay;
    } else { g.shake.x=0; g.shake.y=0; g.shake.intensity=0; }

    if (g.flash > 0) g.flash -= dt * 8;
    if (g.comboTimer > 0) g.comboTimer -= dt; else g.killCombo = 0;

    const now = g.time*1000;

    // Trickle spawn: stop once we reach final wave (let player clear for boss)
    const atFinalWave = g.wave >= g.maxWaves;
    if (!g.bossSpawned && !atFinalWave && now - g.lastTrickle > g.trickleInterval) {
      g.lastTrickle = now;
      spawnTrickle(g);
      g.trickleInterval = Math.max(1200, 2200 - g.wave * 150);
    }

    // Wave progression: every 12 seconds
    if (!g.bossSpawned && g.time > g.nextWaveTime && g.wave < g.maxWaves) {
      g.wave++;
      g.nextWaveTime = g.time + 12;
      // Big wave announcement burst on wave change
      for (let wi=0; wi<6+g.wave*3; wi++) {
        const wa = Math.random()*Math.PI*2;
        const wd = rand(300,480);
        const ti = g.stage.enemies[randInt(0, g.stage.enemies.length-1)];
        const t = ENEMY_TYPES[ti];
        g.enemies.push({
          ...t,
          hp:t.hp*(1+g.wave*0.25), maxHp:t.hp*(1+g.wave*0.25),
          atk:t.atk*(1+g.wave*0.15),
          speed:t.speed*(1+g.wave*0.02),
          x:p.x+Math.cos(wa)*wd, y:p.y+Math.sin(wa)*wd,
          isBoss:false, hitFlash:0,
          lastShot: t.ranged ? 0 : undefined,
          ranged: t.ranged, shootCD: t.shootCD,
        });
      }
    }

    // Boss trigger: final wave reached → spawn boss after 3 seconds
    if (atFinalWave && !g.bossSpawned) {
      if (!g.finalWaveTime) g.finalWaveTime = g.time;
      if (g.time - g.finalWaveTime > 3) {
        spawnBoss(g);
        // Clear all remaining small enemies for dramatic boss entrance
        const cleared = g.enemies.filter(e => !e.isBoss);
        cleared.forEach(e => {
          // Death burst for each cleared enemy
          for (let ci=0; ci<4; ci++) {
            g.particles.push({ x:e.x, y:e.y, vx:rand(-3,3), vy:rand(-3,3), life:15, maxLife:15, color:e.color, r:rand(2,4) });
          }
          g.xpOrbs.push({ x:e.x, y:e.y, value:e.xp, r:5 });
          g.kills++;
        });
        g.enemies = g.enemies.filter(e => e.isBoss);
        addShake(8); g.flash = 0.8;
      }
    }

    // Swarm skill trigger: MASSIVE full-screen wave of weak enemies
    if (p._triggerSwarm) {
      p._triggerSwarm = false;
      const swarmCount = 80 + g.wave * 6;
      // Spawn in expanding rings for full coverage
      for (let si2=0; si2<swarmCount; si2++) {
        const ring = Math.floor(si2 / 20); // 0,1,2,3...
        const idxInRing = si2 % 20;
        const sa = (idxInRing/20)*Math.PI*2 + ring*0.15 + rand(-0.2,0.2);
        const sd = 120 + ring * 120 + rand(-40,40);
        // Mix of slimes and bats for variety
        const weakIdx = si2 % 3 === 0 ? 1 : 0;
        const weakType = ENEMY_TYPES[weakIdx];
        g.enemies.push({
          ...weakType,
          hp: weakType.hp*0.4, maxHp: weakType.hp*0.4,
          atk: weakType.atk*0.3,
          speed: weakType.speed * rand(0.8, 1.5),
          xp: 1,
          x: p.x+Math.cos(sa)*sd, y: p.y+Math.sin(sa)*sd,
          isBoss:false, hitFlash:0,
        });
      }
      addShake(6);
      g.flash = 0.4;
      // Big expanding ring particles
      for (let si3=0; si3<40; si3++) {
        const ra=(si3/40)*Math.PI*2;
        const spd = rand(4,14);
        g.particles.push({ x:p.x, y:p.y, vx:Math.cos(ra)*spd, vy:Math.sin(ra)*spd, life:35, maxLife:35, color:si3%2===0?"#4ade80":"#86efac", r:rand(3,7) });
      }
    }

    // Auto Attack
    if (now-p.lastAtk*1000>p.atkSpeed && g.enemies.length>0) {
      const sorted = [...g.enemies].sort((a,b)=>dist(p,a)-dist(p,b));
      const targets = sorted.slice(0, p.multiShot);
      let fired = false;
      targets.forEach(t => {
        if (dist(p,t) < p.atkRange+150) {
          const angle = Math.atan2(t.y-p.y, t.x-p.x);
          g.projectiles.push({
            x:p.x, y:p.y,
            vx:Math.cos(angle)*10, vy:Math.sin(angle)*10,
            atk:p.atk, range:p.atkRange, dist:0,
            color:p.color, r:6, isCrit:Math.random()<p.critRate, explosive:p.explosive,
          });
          for (let i=0;i<4;i++) {
            g.particles.push({
              x:p.x+Math.cos(angle)*p.r, y:p.y+Math.sin(angle)*p.r,
              vx:Math.cos(angle+rand(-0.4,0.4))*rand(2,5),
              vy:Math.sin(angle+rand(-0.4,0.4))*rand(2,5),
              life:12, maxLife:12, color:p.color, r:rand(2,4),
            });
          }
          fired = true;
        }
      });
      if (fired) p.lastAtk = g.time;
    }

    // Projectiles
    g.projectiles = g.projectiles.filter(pr => {
      pr.x+=pr.vx*(dt*60); pr.y+=pr.vy*(dt*60);
      pr.dist+=Math.sqrt(pr.vx**2+pr.vy**2)*(dt*60);
      if (pr.dist>pr.range+150) return false;

      if (Math.random()<0.4) {
        g.particles.push({
          x:pr.x, y:pr.y, vx:rand(-0.5,0.5), vy:rand(-0.5,0.5),
          life:8, maxLife:8, color:pr.color, r:rand(1.5,3),
        });
      }

      for (let i=g.enemies.length-1;i>=0;i--) {
        const e = g.enemies[i];
        if (dist(pr,e)<e.r+pr.r) {
          let dmg = pr.atk; if (pr.isCrit) dmg*=2.5;
          e.hp-=dmg; e.hitFlash=8;
          if (p.lifesteal>0) { const healAmt=Math.min(dmg*p.lifesteal, 8); p.hp=Math.min(p.hp+healAmt,p.maxHp); }

          const hitAngle = Math.atan2(pr.vy, pr.vx);
          for (let j2=0;j2<8;j2++) {
            g.particles.push({
              x:e.x, y:e.y,
              vx:Math.cos(hitAngle+rand(-1,1))*rand(2,6),
              vy:Math.sin(hitAngle+rand(-1,1))*rand(2,6),
              life:18, maxLife:18, color: pr.isCrit?"#fbbf24":e.color, r:rand(2,5),
            });
          }
          g.dmgTexts.push({
            x:e.x+rand(-10,10), y:e.y-e.r-5,
            text:Math.round(dmg), color:pr.isCrit?"#fbbf24":"#fff",
            life:45, maxLife:45, isCrit:pr.isCrit, scale:pr.isCrit?1.8:1,
          });
          addShake(pr.isCrit ? 3 : 1);

          if (pr.explosive) {
            const expDmg = dmg*0.5;
            for (let k2=0;k2<12;k2++) {
              const ea = (k2/12)*Math.PI*2;
              g.particles.push({
                x:e.x, y:e.y,
                vx:Math.cos(ea)*rand(3,7), vy:Math.sin(ea)*rand(3,7),
                life:20, maxLife:20, color:"#f97316", r:rand(3,6),
              });
            }
            addShake(3);
            // AOE damage — collect kills to process after
            const aoeKills = [];
            g.enemies.forEach((ne,ni) => {
              if (ni!==i && dist(e,ne)<70) {
                ne.hp-=expDmg; ne.hitFlash=5;
                g.dmgTexts.push({ x:ne.x, y:ne.y-ne.r, text:Math.round(expDmg), color:"#f97316", life:30, maxLife:30, scale:1 });
                if (ne.hp<=0) aoeKills.push(ni);
              }
            });
            // Process AOE kills in reverse order to keep indices valid
            aoeKills.sort((a2,b2)=>b2-a2).forEach(ki => {
              const dead = g.enemies[ki];
              if (!dead) return;
              for (let j3=0;j3<10;j3++) {
                const da2=(j3/10)*Math.PI*2;
                g.particles.push({ x:dead.x, y:dead.y, vx:Math.cos(da2)*rand(2,5), vy:Math.sin(da2)*rand(2,5), life:20, maxLife:20, color:dead.color, r:rand(2,6) });
              }
              for (let k3=0;k3<dead.xp;k3++) {
                g.xpOrbs.push({ x:dead.x+rand(-15,15), y:dead.y+rand(-15,15), value:1, r:5 });
              }
              g.kills++; g.killCombo++; g.comboTimer=2;
              if (dead.isBoss) { g.bossDefeated=true; g.flash=1; }
              g.enemies.splice(ki,1);
            });
            // Adjust i if AOE kills shifted indices
            // (primary target handled below, just need to account for splice offset)
          }

          if (e.hp<=0) {
            for (let j2=0;j2<12;j2++) {
              const da = (j2/12)*Math.PI*2;
              g.particles.push({
                x:e.x, y:e.y,
                vx:Math.cos(da)*rand(2,6), vy:Math.sin(da)*rand(2,6),
                life:25, maxLife:25, color:e.color, r:rand(3,7),
              });
            }
            for (let k2=0;k2<e.xp;k2++) {
              g.xpOrbs.push({ x:e.x+rand(-20,20), y:e.y+rand(-20,20), value:1, r:5 });
            }
            g.enemies.splice(i,1);
            g.kills++; g.killCombo++; g.comboTimer=2;
            addShake(e.isBoss ? 8 : 1.5);
            if (e.isBoss) { g.bossDefeated=true; g.flash=1; }
          }
          return false;
        }
      }
      return true;
    });

    // Enemies
    g.enemies.forEach(e => {
      const a = Math.atan2(p.y-e.y, p.x-e.x);
      // Freeze aura slows nearby enemies
      let spdMult = 1;
      if (p.freezeAura > 0 && dist(e, p) < p.freezeRange) {
        spdMult = 1 - p.freezeAura/100;
      }
      e.x+=Math.cos(a)*e.speed*spdMult*(dt*60);
      e.y+=Math.sin(a)*e.speed*spdMult*(dt*60);
      if (e.hitFlash>0) e.hitFlash--;

      // Ranged enemy shooting
      if (e.ranged && !e.isBoss) {
        if (!e.lastShot) e.lastShot = 0;
        if (now - e.lastShot > (e.shootCD || 2000) && dist(e,p) < 250) {
          e.lastShot = now;
          const sa = Math.atan2(p.y-e.y, p.x-e.x);
          g.enemyProjectiles.push({
            x:e.x, y:e.y, vx:Math.cos(sa)*5, vy:Math.sin(sa)*5,
            atk:e.atk*0.7, life:120, color:e.color, r:4,
          });
        }
      }

      if (dist(e,p)<e.r+p.r && p.invincible<=0) {
        // Dodge check
        if (p.dodgeRate > 0 && Math.random() < p.dodgeRate) {
          g.dmgTexts.push({ x:p.x, y:p.y-p.r-15, text:"MISS", color:"#60a5fa", life:35, maxLife:35, scale:1.3 });
          p.invincible=0.3;
          return;
        }
        let dmg=e.atk;
        if (p.shield>0) { const ab=Math.min(p.shield,dmg); p.shield-=ab; dmg-=ab; }
        p.hp-=dmg; p.invincible=0.4;
        addShake(4); g.flash=0.3;
        g.dmgTexts.push({ x:p.x, y:p.y-p.r-15, text:Math.round(e.atk), color:"#ff4444", life:40, maxLife:40, scale:1.5 });
        for (let i2=0;i2<6;i2++) {
          g.particles.push({ x:p.x, y:p.y, vx:rand(-4,4), vy:rand(-4,4), life:15, maxLife:15, color:"#ff4444", r:rand(2,5) });
        }
        // Thorns reflect
        if (p.thorns > 0) {
          const thornDmg = Math.round(e.atk * p.thorns);
          e.hp -= thornDmg; e.hitFlash = 5;
          g.dmgTexts.push({ x:e.x, y:e.y-e.r-5, text:thornDmg, color:"#f472b6", life:30, maxLife:30, scale:1 });
          if (e.hp <= 0) {
            for (let j4=0;j4<8;j4++) {
              const da3=(j4/8)*Math.PI*2;
              g.particles.push({ x:e.x, y:e.y, vx:Math.cos(da3)*rand(2,5), vy:Math.sin(da3)*rand(2,5), life:20, maxLife:20, color:e.color, r:rand(2,5) });
            }
            for (let k4=0;k4<e.xp;k4++) g.xpOrbs.push({ x:e.x+rand(-15,15), y:e.y+rand(-15,15), value:1, r:5 });
            g.kills++; g.killCombo++; g.comboTimer=2;
          }
        }
        if (p.hp<=0) {
          g.paused=true;
          setGameStats({kills:g.kills,time:g.time,level:p.level});
          setScreen("gameover");
        }
      }
    });
    // Remove dead enemies (from thorns)
    g.enemies = g.enemies.filter(e => e.hp > 0);

    // Enemy projectiles
    g.enemyProjectiles = (g.enemyProjectiles||[]).filter(ep => {
      ep.x += ep.vx*(dt*60); ep.y += ep.vy*(dt*60);
      ep.life -= (dt*60);
      if (ep.life <= 0) return false;
      if (dist(ep, p) < p.r + ep.r && p.invincible <= 0) {
        if (p.dodgeRate > 0 && Math.random() < p.dodgeRate) {
          g.dmgTexts.push({ x:p.x, y:p.y-p.r-10, text:"MISS", color:"#60a5fa", life:30, maxLife:30, scale:1 });
          p.invincible=0.2;
          return false;
        }
        let dmg = ep.atk;
        if (p.shield>0) { const ab=Math.min(p.shield,dmg); p.shield-=ab; dmg-=ab; }
        p.hp -= dmg; p.invincible = 0.3;
        addShake(2); g.flash=0.15;
        g.dmgTexts.push({ x:p.x, y:p.y-p.r-10, text:Math.round(dmg), color:"#ff6b6b", life:35, maxLife:35, scale:1.2 });
        if (p.hp<=0) { g.paused=true; setGameStats({kills:g.kills,time:g.time,level:p.level}); setScreen("gameover"); }
        return false;
      }
      return true;
    });

    // Regen
    if (p.regen > 0) {
      p.hp = Math.min(p.hp + p.regen * dt, p.maxHp);
    }

    // Orbitals
    if (p.orbitals > 0) {
      const orbSpeed = 2.5;
      for (let oi=0; oi<p.orbitals; oi++) {
        const orbAngle = g.time * orbSpeed + (oi / p.orbitals) * Math.PI * 2;
        const orbDist = 55 + oi * 15;
        const ox = p.x + Math.cos(orbAngle) * orbDist;
        const oy = p.y + Math.sin(orbAngle) * orbDist;
        // Damage enemies
        for (let ei=g.enemies.length-1; ei>=0; ei--) {
          const e2 = g.enemies[ei];
          if (dist({x:ox,y:oy}, e2) < e2.r + 10) {
            const orbDmg = p.atk * 0.4;
            e2.hp -= orbDmg; e2.hitFlash = 4;
            g.dmgTexts.push({ x:e2.x, y:e2.y-e2.r-5, text:Math.round(orbDmg), color:"#fb923c", life:25, maxLife:25, scale:0.9 });
            if (e2.hp <= 0) {
              for (let j5=0;j5<8;j5++) {
                const da4=(j5/8)*Math.PI*2;
                g.particles.push({ x:e2.x, y:e2.y, vx:Math.cos(da4)*rand(2,5), vy:Math.sin(da4)*rand(2,5), life:20, maxLife:20, color:e2.color, r:rand(2,5) });
              }
              for (let k5=0;k5<e2.xp;k5++) g.xpOrbs.push({ x:e2.x+rand(-15,15), y:e2.y+rand(-15,15), value:1, r:5 });
              g.enemies.splice(ei,1); g.kills++; g.killCombo++; g.comboTimer=2;
            }
          }
        }
      }
    }

    // XP Orbs
    g.xpOrbs = g.xpOrbs.filter(orb => {
      const d2 = dist(orb,p);
      if (d2<p.magnetRange) {
        const a = Math.atan2(p.y-orb.y, p.x-orb.x);
        const spd = Math.max(6, (p.magnetRange-d2)/p.magnetRange*14);
        orb.x+=Math.cos(a)*spd*(dt*60); orb.y+=Math.sin(a)*spd*(dt*60);
      }
      if (d2<p.r+orb.r+5) {
        p.xp+=orb.value;
        if (p.xp>=p.xpNext) {
          p.xp-=p.xpNext; p.level++;
          p.xpNext=XP_PER_LEVEL[Math.min(p.level,XP_PER_LEVEL.length-1)];
          g.paused=true; g.flash=0.3; addShake(3);
          setSkillChoices(pick(ALL_SKILLS,3));
          setScreen("levelup");
          for(let i2=0;i2<20;i2++){
            const a2=(i2/20)*Math.PI*2;
            g.particles.push({x:p.x,y:p.y,vx:Math.cos(a2)*rand(3,8),vy:Math.sin(a2)*rand(3,8),life:30,maxLife:30,color:"#fbbf24",r:rand(2,5)});
          }
        }
        return false;
      }
      return true;
    });

    g.particles = g.particles.filter(pt => { pt.x+=pt.vx*(dt*60); pt.y+=pt.vy*(dt*60); pt.vx*=0.96; pt.vy*=0.96; pt.life-=(dt*60); return pt.life>0; });
    g.dmgTexts = g.dmgTexts.filter(d2 => { d2.y-=1.2*(dt*60); d2.life-=(dt*60); return d2.life>0; });

    if (g.bossDefeated && g.enemies.length===0) {
      g.paused=true;
      setGameStats({kills:g.kills,time:g.time,level:p.level});
      if (g.stageIdx+1<STAGES.length) setStagesUnlocked(prev=>Math.max(prev,g.stageIdx+2));
      setScreen("stageclear");
    }

    // ═══════ RENDER ═══════
    const ccx = g.cam.x+g.shake.x;
    const ccy = g.cam.y+g.shake.y;
    ctx.clearRect(0,0,W,H);

    const bgGrad = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W);
    bgGrad.addColorStop(0, g.stage.bg2); bgGrad.addColorStop(1, g.stage.bg1);
    ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);

    ctx.strokeStyle = "#ffffff08"; ctx.lineWidth = 1;
    const gs = 50;
    const gridOx = -(ccx%gs); const gridOy = -(ccy%gs);
    ctx.beginPath();
    for(let x=gridOx;x<W;x+=gs){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=gridOy;y<H;y+=gs){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();

    // XP Orbs
    g.xpOrbs.forEach(o => {
      const ox=o.x-ccx, oy=o.y-ccy;
      if(ox<-20||ox>W+20||oy<-20||oy>H+20)return;
      ctx.save(); ctx.shadowColor="#86efac"; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(ox,oy,o.r,0,Math.PI*2);
      ctx.fillStyle="#86efac"; ctx.fill(); ctx.restore();
    });

    // Enemies
    g.enemies.forEach(e => {
      const ex=e.x-ccx, ey=e.y-ccy;
      if(ex<-60||ex>W+60||ey<-60||ey>H+60)return;
      ctx.beginPath(); ctx.ellipse(ex,ey+e.r*0.8,e.r*0.8,e.r*0.3,0,0,Math.PI*2);
      ctx.fillStyle="#00000044"; ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(ex,ey,e.r,0,Math.PI*2);
      if(e.hitFlash>0){ ctx.fillStyle="#fff"; ctx.shadowColor="#fff"; ctx.shadowBlur=20; }
      else {
        const eg=ctx.createRadialGradient(ex-e.r*0.3,ey-e.r*0.3,0,ex,ey,e.r);
        eg.addColorStop(0,e.color); eg.addColorStop(1,e.color+"88"); ctx.fillStyle=eg;
      }
      ctx.fill(); ctx.restore();
      // Elite glow
      if(e.isElite){
        ctx.save(); ctx.strokeStyle=e.color; ctx.lineWidth=2;
        ctx.shadowColor=e.color; ctx.shadowBlur=15;
        ctx.beginPath(); ctx.arc(ex,ey,e.r+3,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }
      if(e.isBoss){
        ctx.strokeStyle="#fbbf24"; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath(); ctx.arc(ex,ey,e.r+8+Math.sin(g.time*4)*4,0,Math.PI*2);
        ctx.strokeStyle="#fbbf2433"; ctx.lineWidth=2; ctx.stroke();
      }
      ctx.font=`${e.isBoss?e.r*1.1:e.r*1.2}px serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(e.emoji,ex,ey);
      if(e.isBoss||e.hp<e.maxHp){
        const bw=e.r*(e.isBoss?3:2.2), bh=e.isBoss?6:4, by=ey-e.r-(e.isBoss?14:8);
        ctx.fillStyle="#0008"; ctx.fillRect(ex-bw/2-1,by-1,bw+2,bh+2);
        ctx.fillStyle="#1e1e2e"; ctx.fillRect(ex-bw/2,by,bw,bh);
        ctx.fillStyle=e.isBoss?"#ef4444":"#4ade80";
        ctx.fillRect(ex-bw/2,by,bw*(e.hp/e.maxHp),bh);
      }
      if(e.isBoss){
        ctx.font="bold 13px sans-serif"; ctx.fillStyle="#fbbf24";
        ctx.fillText(`👑 ${e.name}`,ex,ey-e.r-22);
      }
    });

    // Projectiles
    g.projectiles.forEach(pr => {
      const px2=pr.x-ccx, py2=pr.y-ccy;
      ctx.save(); ctx.shadowColor=pr.isCrit?"#fbbf24":pr.color; ctx.shadowBlur=pr.isCrit?16:10;
      ctx.beginPath(); ctx.arc(px2,py2,pr.r+(pr.isCrit?2:0),0,Math.PI*2);
      ctx.fillStyle=pr.isCrit?"#fbbf24":pr.color; ctx.fill(); ctx.restore();
    });

    // Player
    const ppx=p.x-ccx, ppy=p.y-ccy;
    ctx.beginPath(); ctx.arc(ppx,ppy,p.atkRange,0,Math.PI*2);
    ctx.strokeStyle=`${p.color}12`; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ppx,ppy+p.r*0.8,p.r*0.9,p.r*0.3,0,0,Math.PI*2);
    ctx.fillStyle="#00000055"; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(ppx,ppy,p.r,0,Math.PI*2);
    const pg=ctx.createRadialGradient(ppx-p.r*0.3,ppy-p.r*0.3,0,ppx,ppy,p.r);
    pg.addColorStop(0,"#fff"); pg.addColorStop(0.3,p.color); pg.addColorStop(1,p.color+"66");
    ctx.fillStyle= p.invincible>0 ? `${p.color}55` : pg;
    ctx.fill(); ctx.strokeStyle="#ffffff88"; ctx.lineWidth=2; ctx.stroke();
    if(p.shield>0){
      ctx.beginPath(); ctx.arc(ppx,ppy,p.r+6,0,Math.PI*2);
      ctx.strokeStyle=`rgba(96,165,250,${0.3+Math.sin(g.time*6)*0.15})`; ctx.lineWidth=3; ctx.stroke();
    }
    ctx.restore();
    ctx.font=`${p.r*1.1}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(p.emoji,ppx,ppy);

    // Freeze aura visual
    if (p.freezeAura > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(ppx,ppy,p.freezeRange,0,Math.PI*2);
      ctx.strokeStyle=`rgba(103,232,249,${0.15+Math.sin(g.time*3)*0.05})`;
      ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle=`rgba(103,232,249,0.04)`;
      ctx.fill(); ctx.restore();
    }

    // Orbitals visual
    if (p.orbitals > 0) {
      for (let oi=0; oi<p.orbitals; oi++) {
        const orbAngle = g.time * 2.5 + (oi / p.orbitals) * Math.PI * 2;
        const orbDist2 = 55 + oi * 15;
        const oox = ppx + Math.cos(orbAngle) * orbDist2;
        const ooy = ppy + Math.sin(orbAngle) * orbDist2;
        ctx.save(); ctx.shadowColor="#fb923c"; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.arc(oox,ooy,7,0,Math.PI*2);
        ctx.fillStyle="#fb923c"; ctx.fill();
        ctx.font="10px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("🔥",oox,ooy);
        ctx.restore();
      }
    }

    // Enemy projectiles
    (g.enemyProjectiles||[]).forEach(ep => {
      const epx=ep.x-ccx, epy=ep.y-ccy;
      ctx.save(); ctx.shadowColor=ep.color; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(epx,epy,ep.r,0,Math.PI*2);
      ctx.fillStyle=ep.color; ctx.fill(); ctx.restore();
    });

    // Boss incoming warning
    if (g.wave >= g.maxWaves && !g.bossSpawned && g.finalWaveTime) {
      const countdown = Math.max(0, Math.ceil(3 - (g.time - g.finalWaveTime)));
      ctx.save(); ctx.textAlign="center"; ctx.font="bold 24px sans-serif";
      ctx.fillStyle="#ef4444"; ctx.globalAlpha=0.6+Math.sin(g.time*8)*0.3;
      ctx.fillText(`⚠️ BOSS 即將出現 ${countdown}`,W/2,H/2-60);
      ctx.restore();
    }

    // Particles
    g.particles.forEach(pt => {
      const ptx=pt.x-ccx, pty=pt.y-ccy;
      const alpha = Math.max(0,pt.life/pt.maxLife);
      ctx.beginPath(); ctx.arc(ptx,pty,pt.r*alpha,0,Math.PI*2);
      const hex = Math.floor(alpha*255).toString(16).padStart(2,"0");
      ctx.fillStyle=pt.color+hex; ctx.fill();
    });

    // Damage texts
    g.dmgTexts.forEach(dt2 => {
      const dtx=dt2.x-ccx, dty=dt2.y-ccy;
      const alpha = Math.max(0,dt2.life/dt2.maxLife);
      const s = (dt2.scale||1) * (dt2.isCrit ? 1+Math.sin((1-alpha)*Math.PI)*0.3 : 1);
      ctx.save(); ctx.globalAlpha=alpha;
      ctx.font=`bold ${Math.round(14*s)}px sans-serif`; ctx.textAlign="center";
      ctx.strokeStyle="#000"; ctx.lineWidth=3; ctx.strokeText(dt2.text,dtx,dty);
      ctx.fillStyle=dt2.color; ctx.fillText(dt2.text,dtx,dty);
      ctx.restore();
    });

    if(g.flash>0){
      ctx.fillStyle=`rgba(255,255,255,${g.flash*0.3})`; ctx.fillRect(0,0,W,H);
    }

    // HUD
    const xpPct = p.xp/p.xpNext;
    ctx.fillStyle="#0008"; ctx.fillRect(0,0,W,5);
    const xpGr=ctx.createLinearGradient(0,0,W*xpPct,0);
    xpGr.addColorStop(0,"#818cf8"); xpGr.addColorStop(1,"#a78bfa");
    ctx.fillStyle=xpGr; ctx.fillRect(0,0,W*xpPct,5);

    ctx.font="bold 14px sans-serif"; ctx.textAlign="left";
    ctx.fillStyle="#fbbf24"; ctx.fillText(`Lv.${p.level}`,10,24);
    const hpW2=90, hpH2=8, hpX2=58, hpY2=17;
    ctx.fillStyle="#1e293b"; ctx.fillRect(hpX2,hpY2,hpW2,hpH2);
    const hpPct=p.hp/p.maxHp;
    ctx.fillStyle=hpPct>0.5?"#4ade80":hpPct>0.25?"#fbbf24":"#ef4444";
    ctx.fillRect(hpX2,hpY2,hpW2*hpPct,hpH2);
    ctx.strokeStyle="#fff3"; ctx.lineWidth=1; ctx.strokeRect(hpX2,hpY2,hpW2,hpH2);
    ctx.font="bold 9px sans-serif"; ctx.fillStyle="#fff";
    ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`,hpX2+3,hpY2+7);
    if(p.shield>0){
      ctx.fillStyle="#60a5fa"; ctx.font="bold 11px sans-serif";
      ctx.fillText(`🔰${Math.ceil(p.shield)}`,hpX2+hpW2+6,hpY2+8);
    }

    ctx.textAlign="right"; ctx.font="bold 13px sans-serif"; ctx.fillStyle="#e2e8f0";
    ctx.fillText(`🗡️${g.kills}`,W-10,22);
    ctx.fillText(`🌊${Math.min(g.wave,g.maxWaves)}/${g.maxWaves}${g.bossSpawned&&!g.bossDefeated?" 👑":""}`,W-10,40);

    if(g.killCombo>=3){
      ctx.textAlign="center"; ctx.font=`bold ${16+Math.min(g.killCombo,20)}px sans-serif`;
      ctx.fillStyle="#fbbf24"; ctx.globalAlpha=0.9;
      ctx.fillText(`${g.killCombo} COMBO!`,W/2,46);
      ctx.globalAlpha=1;
    }

    const mmW=70,mmH=50,mmX=W-mmW-8,mmY=H-mmH-8;
    ctx.fillStyle="#00000055"; ctx.fillRect(mmX,mmY,mmW,mmH);
    ctx.strokeStyle="#ffffff18"; ctx.strokeRect(mmX,mmY,mmW,mmH);
    ctx.fillStyle=p.color;
    ctx.fillRect(mmX+(p.x/g.mapW)*mmW-2,mmY+(p.y/g.mapH)*mmH-2,4,4);
    g.enemies.forEach(e2=>{
      ctx.fillStyle=e2.isBoss?"#fbbf24":"#ef444466";
      const s2=e2.isBoss?3:1.5;
      ctx.fillRect(mmX+(e2.x/g.mapW)*mmW-s2/2,mmY+(e2.y/g.mapH)*mmH-s2/2,s2,s2);
    });

    animRef.current = requestAnimationFrame(gameLoop);
  }, [spawnTrickle, spawnBoss]);

  useEffect(()=>{
    const d=e=>{keysRef.current[e.key.toLowerCase()]=true;};
    const u=e=>{keysRef.current[e.key.toLowerCase()]=false;};
    window.addEventListener("keydown",d); window.addEventListener("keyup",u);
    return()=>{window.removeEventListener("keydown",d); window.removeEventListener("keyup",u);};
  },[]);

  useEffect(()=>{
    if(screen==="playing"){
      if(gameRef.current)gameRef.current.paused=false;
      lastTimeRef.current=0;
      animRef.current=requestAnimationFrame(gameLoop);
    }
    return()=>{if(animRef.current)cancelAnimationFrame(animRef.current);};
  },[screen,gameLoop]);

  // Floating joystick
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tx = touch.clientX - rect.left;
    if (tx < rect.width * 0.65) {
      e.preventDefault();
      joyRef.current = { active:true, ox:touch.clientX, oy:touch.clientY, cx:touch.clientX, cy:touch.clientY, dx:0, dy:0 };
      setJoyVis({ ox:touch.clientX, oy:touch.clientY, cx:touch.clientX, cy:touch.clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!joyRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx2 = touch.clientX - joyRef.current.ox;
    const dy2 = touch.clientY - joyRef.current.oy;
    const maxD = 50;
    const d2 = Math.sqrt(dx2*dx2+dy2*dy2);
    const clamped = Math.min(d2, maxD);
    if (d2 > 2) {
      joyRef.current.dx = (dx2/d2)*(clamped/maxD);
      joyRef.current.dy = (dy2/d2)*(clamped/maxD);
    }
    joyRef.current.cx = touch.clientX;
    joyRef.current.cy = touch.clientY;
    setJoyVis({ ox:joyRef.current.ox, oy:joyRef.current.oy, cx:touch.clientX, cy:touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    joyRef.current = { active:false, ox:0, oy:0, cx:0, cy:0, dx:0, dy:0 };
    setJoyVis(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (screen !== "playing" && screen !== "levelup")) return;
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [screen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const onSelectSkill = (skill) => {
    const g=gameRef.current; if(!g)return;
    skill.apply(g.player); g.player.skills.push(skill.id);
    g.paused=false; setScreen("playing");
  };

  const startGame = () => {
    if(selectedChar===null)return;
    initGame(selectedChar,selectedStage); setScreen("playing");
  };

  const KF = `
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes scaleIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  `;

  if (screen==="title") {
    return (
      <div style={S.root}><style>{KF}</style>
        <div style={S.center}>
          <div style={{fontSize:80,animation:"float 2s ease-in-out infinite",filter:"drop-shadow(0 0 40px #fbbf2466)"}}>⚔️</div>
          <h1 style={S.title}>HAO SURVIVOR</h1>
          <p style={{fontSize:14,color:"#64748b",letterSpacing:6,margin:0}}>卡通RPG生存射擊</p>
          <button style={S.btnGold} onClick={()=>setScreen("select")}>開始遊戲</button>
          <p style={{fontSize:12,color:"#475569",margin:0}}>🕹️ WASD / 觸控搖桿 移動 · 自動攻擊</p>
        </div>
      </div>
    );
  }

  if (screen==="select") {
    return (
      <div style={S.root}><style>{KF}</style>
        <div style={S.selectWrap}>
          <h2 style={S.secTitle}>選擇角色</h2>
          <div style={S.charGrid}>
            {CHARACTERS.map((c,i) => (
              <div key={c.id} onClick={()=>setSelectedChar(i)}
                style={{...S.charCard,
                  borderColor:selectedChar===i?c.color:"#1e293b",
                  boxShadow:selectedChar===i?`0 0 20px ${c.color}44`:"none",
                  animation:`slideUp 0.3s ease-out ${i*0.05}s both`,
                }}>
                <div style={{fontSize:32}}>{c.emoji}</div>
                <div style={{fontSize:14,fontWeight:800,color:c.color,marginTop:4}}>{c.name}</div>
                <div style={{fontSize:11,color:"#64748b",margin:"3px 0 6px"}}>{c.desc}</div>
                <div style={{display:"flex",justifyContent:"center",gap:6,fontSize:11,color:"#94a3b8"}}>
                  <span>❤️{c.hp}</span><span>⚔️{c.atk}</span><span>💨{c.speed}</span>
                </div>
              </div>
            ))}
          </div>
          <h2 style={{...S.secTitle,marginTop:18}}>選擇關卡</h2>
          <div style={S.stageRow}>
            {STAGES.map((s,i) => (
              <div key={s.id} onClick={()=>i<stagesUnlocked&&setSelectedStage(i)}
                style={{...S.stageCard,
                  borderColor:selectedStage===i?"#fbbf24":"#1e293b",
                  opacity:i<stagesUnlocked?1:0.35,
                }}>
                <div style={{fontSize:13,fontWeight:700}}>{i<stagesUnlocked?`第${s.id}章`:"🔒"} {s.name}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{s.waves}波+BOSS</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginTop:20,justifyContent:"center"}}>
            <button style={S.btnGhost} onClick={()=>setScreen("title")}>← 返回</button>
            <button style={{...S.btnGold,opacity:selectedChar!==null?1:0.4}} onClick={startGame}>⚔️ 出發！</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen==="playing"||screen==="levelup") {
    return (
      <div style={S.root}><style>{KF}</style>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{display:"block",width:"100vw",height:"100vh",touchAction:"none"}} />

        {joyVis && (
          <div style={{position:"fixed",left:joyVis.ox-55,top:joyVis.oy-55,width:110,height:110,
            borderRadius:"50%",background:"#ffffff0d",border:"2px solid #ffffff20",pointerEvents:"none",zIndex:50}}>
            <div style={{position:"absolute",width:40,height:40,borderRadius:"50%",
              background:"radial-gradient(circle,#fbbf24cc,#f59e0b88)",
              boxShadow:"0 0 18px #fbbf2455",
              left:55+Math.max(-40,Math.min(40,(joyVis.cx-joyVis.ox)*0.7))-20,
              top:55+Math.max(-40,Math.min(40,(joyVis.cy-joyVis.oy)*0.7))-20,
            }}/>
          </div>
        )}

        {screen==="levelup" && (
          <div style={S.overlay}>
            <div style={{...S.levelUpBox,animation:"scaleIn 0.25s ease-out"}}>
              <div style={{fontSize:36}}>⬆️</div>
              <h2 style={{fontSize:22,fontWeight:900,color:"#fbbf24",margin:"4px 0"}}>升級！</h2>
              <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 12px"}}>選擇一項技能</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {skillChoices.map((sk,i) => (
                  <div key={sk.id} onClick={()=>onSelectSkill(sk)}
                    style={{
                      display:"flex",alignItems:"center",gap:14,
                      background:"#1e293b",border:"2px solid #334155",borderRadius:14,
                      padding:"14px 16px",cursor:"pointer",textAlign:"left",
                      animation:`slideUp 0.25s ease-out ${i*0.08}s both`,
                      transition:"border-color 0.15s,transform 0.15s",
                    }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor="#fbbf24";e.currentTarget.style.transform="scale(1.02)";}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.transform="scale(1)";}}
                  >
                    <div style={{fontSize:32,flexShrink:0}}>{sk.icon}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0"}}>{sk.name}</div>
                      <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{sk.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen==="gameover") {
    return (
      <div style={S.root}><style>{KF}</style>
        <div style={S.center}>
          <div style={{fontSize:60}}>💀</div>
          <h1 style={{fontSize:34,fontWeight:900,color:"#ef4444",margin:0}}>陣亡</h1>
          <div style={S.resultBox}>
            <div>🗡️ 擊殺 {gameStats.kills}</div>
            <div>⏱️ 存活 {Math.floor(gameStats.time)}s</div>
            <div>📊 等級 Lv.{gameStats.level}</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button style={S.btnGhost} onClick={()=>setScreen("title")}>主選單</button>
            <button style={S.btnGold} onClick={startGame}>再來一次</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen==="stageclear") {
    return (
      <div style={S.root}><style>{KF}</style>
        <div style={S.center}>
          <div style={{fontSize:60,animation:"float 1.5s ease-in-out infinite"}}>🏆</div>
          <h1 style={{fontSize:34,fontWeight:900,color:"#fbbf24",margin:0}}>通關！</h1>
          <p style={{color:"#94a3b8",fontSize:13,margin:0}}>{STAGES[selectedStage].name} 已征服</p>
          <div style={S.resultBox}>
            <div>🗡️ 擊殺 {gameStats.kills}</div>
            <div>⏱️ 時間 {Math.floor(gameStats.time)}s</div>
            <div>📊 等級 Lv.{gameStats.level}</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button style={S.btnGhost} onClick={()=>setScreen("title")}>主選單</button>
            <button style={S.btnGold} onClick={()=>setScreen("select")}>下一關</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

const S = {
  root:{width:"100vw",height:"100vh",background:"#060a14",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',system-ui,sans-serif",color:"#e2e8f0",overflow:"hidden",userSelect:"none"},
  center:{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:20},
  title:{fontSize:"clamp(30px,9vw,50px)",fontWeight:900,letterSpacing:4,margin:0,background:"linear-gradient(135deg,#fbbf24,#ef4444,#a78bfa,#60a5fa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  btnGold:{padding:"13px 40px",fontSize:17,fontWeight:800,letterSpacing:2,color:"#0a0a12",background:"linear-gradient(135deg,#fbbf24,#f59e0b)",border:"none",borderRadius:14,cursor:"pointer",boxShadow:"0 4px 20px #fbbf2444"},
  btnGhost:{padding:"12px 26px",fontSize:15,fontWeight:700,color:"#94a3b8",background:"transparent",border:"1.5px solid #334155",borderRadius:12,cursor:"pointer"},
  selectWrap:{textAlign:"center",maxHeight:"95vh",overflowY:"auto",padding:"14px 16px",width:"100%",maxWidth:400},
  secTitle:{fontSize:18,fontWeight:800,color:"#fbbf24",margin:"0 0 10px"},
  charGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,maxWidth:340,margin:"0 auto"},
  charCard:{background:"linear-gradient(145deg,#111827,#0f172a)",border:"2px solid #1e293b",borderRadius:14,padding:"12px 8px",cursor:"pointer",transition:"all 0.2s",textAlign:"center"},
  stageRow:{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",maxWidth:380,margin:"0 auto"},
  stageCard:{background:"#111827",border:"2px solid #1e293b",borderRadius:12,padding:"10px 14px",cursor:"pointer",transition:"all 0.2s",flex:"1 1 90px",textAlign:"center"},
  overlay:{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16},
  levelUpBox:{background:"linear-gradient(145deg,#111827,#0d1117)",border:"2px solid #fbbf24",borderRadius:20,padding:"20px 16px",textAlign:"center",maxWidth:"92vw",width:380,boxShadow:"0 0 50px #fbbf2422"},
  resultBox:{background:"#111827",borderRadius:14,padding:"14px 24px",display:"flex",flexDirection:"column",gap:6,fontSize:15,border:"1px solid #1e293b"},
};
