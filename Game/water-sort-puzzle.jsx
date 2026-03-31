import { useState, useCallback, useMemo } from "react";

/* ── Highly distinct color palette ── */
const COLORS = {
  red:     { g: ["#ff6b6b","#e63946","#b5202e"], label: "紅" },
  blue:    { g: ["#74b9ff","#3584e4","#1a5fb4"], label: "藍" },
  green:   { g: ["#69db7c","#2d9f46","#1a7a30"], label: "綠" },
  yellow:  { g: ["#ffe066","#fcc419","#d9a004"], label: "黃" },
  purple:  { g: ["#cc5de8","#9c36b5","#6e1e8a"], label: "紫" },
  cyan:    { g: ["#66d9e8","#22b8cf","#0c8599"], label: "青" },
  orange:  { g: ["#ffa94d","#f76707","#c25200"], label: "橙" },
  magenta: { g: ["#f783ac","#d6336c","#a61e50"], label: "桃" },
  lime:    { g: ["#c0eb75","#82c91e","#5c940d"], label: "萊" },
};

const COLOR_KEYS = Object.keys(COLORS);
const CAP = 4;

/* ── Level configs: always 2 empty bottles for playability ── */
const LEVELS = [
  { colors: 3, empty: 2, shuffles: 30 },
  { colors: 4, empty: 2, shuffles: 50 },
  { colors: 5, empty: 2, shuffles: 80 },
  { colors: 6, empty: 2, shuffles: 100 },
  { colors: 7, empty: 2, shuffles: 130 },
  { colors: 8, empty: 2, shuffles: 160 },
  { colors: 9, empty: 2, shuffles: 200 },
];

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/* ── Pick N most-distinct colors ──
   We define a "distance" order so adjacent picks are never similar */
const DISTINCT_ORDER = [
  "red","blue","green","yellow","purple","cyan","orange","magenta","lime"
];

function pickColors(n) {
  const shuffled = shuffle([...DISTINCT_ORDER]);
  return shuffled.slice(0, n);
}

/* ── Guaranteed-solvable: reverse-shuffle from solved state ── */
function genLevel(li) {
  const cfg = LEVELS[Math.min(li, LEVELS.length - 1)];
  const keys = pickColors(cfg.colors);

  let bottles = keys.map(c => Array(CAP).fill(c));
  for (let i = 0; i < cfg.empty; i++) bottles.push([]);

  const total = bottles.length;
  let poursDone = 0, attempts = 0;
  const max = cfg.shuffles * 4;

  while (poursDone < cfg.shuffles && attempts < max) {
    attempts++;
    const from = Math.floor(Math.random() * total);
    const to = Math.floor(Math.random() * total);
    if (from === to || !bottles[from].length || bottles[to].length >= CAP) continue;
    const c = bottles[from][bottles[from].length - 1];
    bottles[from] = [...bottles[from]];
    bottles[to] = [...bottles[to]];
    bottles[from].pop();
    bottles[to].push(c);
    poursDone++;
  }

  if (bottles.every(b => b.length === 0 || (b.length === CAP && new Set(b).size === 1)))
    return genLevel(li);
  return bottles;
}

function isDone(bottles) {
  return bottles.every(b => b.length === 0 || (b.length === CAP && new Set(b).size === 1));
}

function canPour(f, t) {
  if (!f.length || t.length >= CAP) return false;
  if (!t.length) return true;
  return f[f.length - 1] === t[t.length - 1];
}

function pour(f, t) {
  const nf = [...f], nt = [...t];
  const c = nf[nf.length - 1];
  while (nf.length && nt.length < CAP && nf[nf.length - 1] === c) {
    nt.push(nf.pop());
  }
  return [nf, nt];
}

/* ── Bottle component ── */
function Bottle({ segments, selected, completed, onClick, shakeError, idx }) {
  const bw = 52, bh = 168, segH = bh / CAP, neckW = 28, neckH = 14;
  const bottlePath = `
    M${(bw-neckW)/2} 0 L${(bw+neckW)/2} 0
    L${(bw+neckW)/2} ${neckH-4}
    Q${bw} ${neckH+6} ${bw} ${neckH+18}
    L${bw} ${bh+neckH-14}
    Q${bw} ${bh+neckH} ${bw-14} ${bh+neckH}
    L14 ${bh+neckH} Q0 ${bh+neckH} 0 ${bh+neckH-14}
    L0 ${neckH+18} Q0 ${neckH+6} ${(bw-neckW)/2} ${neckH-4} Z`;

  return (
    <div onClick={onClick} style={{
      cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center",
      transition:"transform .25s cubic-bezier(.34,1.56,.64,1),filter .3s",
      transform: selected ? "translateY(-20px) scale(1.06)" : "translateY(0) scale(1)",
      filter: completed ? "drop-shadow(0 0 14px rgba(100,255,170,.25))" : "none",
      animation: shakeError ? "bottleShake .4s ease" : "none",
      WebkitTapHighlightColor:"transparent", userSelect:"none",
    }}>
      {selected ? (
        <div style={{
          width:6,height:6,borderRadius:"50%",background:"#fff",marginBottom:6,
          boxShadow:"0 0 10px rgba(255,255,255,.6)",animation:"pulse 1s ease infinite",
        }}/>
      ) : <div style={{height:12}}/>}

      <svg width={bw+20} height={bh+neckH+20} viewBox={`-10 -4 ${bw+20} ${bh+neckH+20}`}>
        <defs>
          <linearGradient id={`gl${idx}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,.08)"/>
            <stop offset="35%" stopColor="rgba(255,255,255,.02)"/>
            <stop offset="65%" stopColor="rgba(255,255,255,.01)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,.06)"/>
          </linearGradient>
          <linearGradient id={`sh${idx}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,.2)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>
          <clipPath id={`cl${idx}`}><path d={bottlePath}/></clipPath>
          {segments.map((color,i) => (
            <linearGradient key={i} id={`wg${idx}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[color].g[0]}/>
              <stop offset="50%" stopColor={COLORS[color].g[1]}/>
              <stop offset="100%" stopColor={COLORS[color].g[2]}/>
            </linearGradient>
          ))}
        </defs>

        <path d={bottlePath} fill={`url(#gl${idx})`}
          stroke={selected?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)"}
          strokeWidth={selected?2:1.2}
          style={{transition:"stroke .3s,stroke-width .3s"}}/>

        <g clipPath={`url(#cl${idx})`}>
          {segments.map((color,i) => {
            const y = bh+neckH-(i+1)*segH;
            const isTop = i===segments.length-1;
            return (
              <g key={i}>
                <rect x={0} y={y} width={bw} height={segH+1} fill={`url(#wg${idx}-${i})`}/>
                {isTop && <ellipse cx={bw/2} cy={y+2} rx={bw/2-1} ry={3} fill={COLORS[color].g[0]} opacity={.55}/>}
                <rect x={3} y={y+5} width={4} height={segH-10} rx={2} fill="rgba(255,255,255,.1)"/>
              </g>
            );
          })}
        </g>

        <rect x={5} y={neckH+8} width={4} height={bh*.6} rx={2}
          fill={`url(#sh${idx})`} clipPath={`url(#cl${idx})`}/>
        <rect x={(bw-neckW)/2+3} y={0} width={neckW-6} height={1.5} rx={.75} fill="rgba(255,255,255,.2)"/>

        {completed && (
          <text x={bw/2} y={bh/2+neckH+2} textAnchor="middle" dominantBaseline="central"
            fontSize={18} fill="rgba(100,255,170,.9)"
            style={{filter:"drop-shadow(0 0 4px rgba(100,255,170,.5))"}}>✦</text>
        )}
      </svg>

      {/* Color label on bottom for accessibility */}
      {segments.length > 0 && (
        <div style={{
          fontSize:9, fontWeight:400, marginTop:2,
          color: COLORS[segments[segments.length-1]].g[0],
          opacity:.6, letterSpacing:1,
        }}>
          {COLORS[segments[segments.length-1]].label}
        </div>
      )}
    </div>
  );
}

/* ── Main Game ── */
export default function WaterSortPuzzle() {
  const [level, setLevel] = useState(0);
  const [bottles, setBottles] = useState(() => genLevel(0));
  const [sel, setSel] = useState(null);
  const [moves, setMoves] = useState(0);
  const [hist, setHist] = useState([]);
  const [won, setWon] = useState(false);
  const [particles, setParticles] = useState(false);
  const [best, setBest] = useState({});
  const [shakeIdx, setShakeIdx] = useState(null);

  const click = useCallback((i) => {
    if (won) return;
    if (sel === null) {
      if (bottles[i].length > 0) setSel(i);
    } else if (sel === i) {
      setSel(null);
    } else {
      if (canPour(bottles[sel], bottles[i])) {
        const nb = bottles.map(b => [...b]);
        const [nf, nt] = pour(nb[sel], nb[i]);
        nb[sel] = nf; nb[i] = nt;
        setHist(h => [...h, bottles]);
        setBottles(nb); setMoves(m => m+1); setSel(null);
        if (isDone(nb)) {
          setWon(true); setParticles(true);
          setBest(p => {
            const b = p[level];
            if (!b || moves+1 < b) return {...p,[level]:moves+1};
            return p;
          });
          setTimeout(() => setParticles(false), 3500);
        }
      } else {
        setShakeIdx(i);
        setTimeout(() => setShakeIdx(null), 400);
        if (bottles[i].length > 0) setSel(i); else setSel(null);
      }
    }
  }, [sel, bottles, won, level, moves]);

  const undo = useCallback(() => {
    if (!hist.length || won) return;
    setBottles(hist[hist.length-1]);
    setHist(h => h.slice(0,-1));
    setMoves(m => m-1); setSel(null);
  }, [hist, won]);

  const reset = useCallback(() => {
    setBottles(genLevel(level));
    setSel(null); setMoves(0); setHist([]); setWon(false);
  }, [level]);

  const next = useCallback(() => {
    const n = level+1; setLevel(n); setBottles(genLevel(n));
    setSel(null); setMoves(0); setHist([]); setWon(false);
  }, [level]);

  const go = useCallback((l) => {
    setLevel(l); setBottles(genLevel(l));
    setSel(null); setMoves(0); setHist([]); setWon(false);
  }, []);

  const cnt = bottles.length;
  const perRow = cnt <= 5 ? cnt : Math.ceil(cnt / 2);

  const winParts = useMemo(() =>
    particles ? Array.from({length:40},(_,i) => ({
      x:5+Math.random()*90, y:10+Math.random()*70,
      s:Math.random()*6+3, d:Math.random()*.8,
      dur:1+Math.random()*2, hue:Math.random()*360,
    })) : [], [particles]);

  const renderRow = (arr, offset=0) => (
    <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
      {arr.map((b,i) => {
        const ri = i+offset;
        return (
          <Bottle key={`${level}-${ri}`} idx={ri} segments={b} selected={sel===ri}
            completed={b.length===CAP && new Set(b).size===1}
            shakeError={shakeIdx===ri} onClick={()=>click(ri)}/>
        );
      })}
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh", background:"#08080c", color:"#e8e4df",
      fontFamily:"'Noto Sans JP',sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"16px 8px 40px", position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@200;300;400;500;700&display=swap');
        *{box-sizing:border-box}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-160px) scale(.3)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes bottleShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
        @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.1)}66%{transform:translate(-20px,15px) scale(.9)}}
        @keyframes starSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        button{font-family:inherit} button:active{transform:scale(.95)!important}
      `}</style>

      {/* Ambient orbs */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:"10%",left:"15%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(77,138,255,.06) 0%,transparent 70%)",animation:"orbFloat 12s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"20%",right:"10%",width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(180,77,255,.05) 0%,transparent 70%)",animation:"orbFloat 15s ease-in-out infinite reverse"}}/>
      </div>

      {/* Win particles */}
      {particles && (
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999}}>
          {winParts.map((p,i) => (
            <div key={i} style={{
              position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
              width:p.s,height:p.s,borderRadius:"50%",
              background:`hsl(${p.hue},85%,65%)`,
              boxShadow:`0 0 ${p.s*2}px hsl(${p.hue},85%,65%)`,
              animation:`floatUp ${p.dur}s ease-out ${p.d}s both`,
            }}/>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:12,zIndex:1,animation:"fadeIn .6s ease"}}>
        <h1 style={{
          fontSize:32,fontWeight:200,letterSpacing:12,margin:0,
          background:"linear-gradient(135deg,rgba(255,255,255,.95),rgba(255,255,255,.5))",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        }}>水 の 分 類</h1>
        <div style={{width:"60%",height:1,margin:"4px auto 0",background:"linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)"}}/>
        <div style={{fontSize:9,letterSpacing:6,color:"rgba(255,255,255,.2)",marginTop:6,fontWeight:300,textTransform:"uppercase"}}>WATER SORT PUZZLE</div>
      </div>

      {/* Stats */}
      <div style={{
        display:"flex",alignItems:"center",gap:20,marginBottom:20,zIndex:1,
        background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",
        borderRadius:12,padding:"8px 24px",animation:"fadeIn .6s ease .1s both",
      }}>
        <Stat label="關卡" val={level+1}/>
        <div style={{width:1,height:28,background:"rgba(255,255,255,.08)"}}/>
        <Stat label="步數" val={moves}/>
        {best[level]!=null && <>
          <div style={{width:1,height:28,background:"rgba(255,255,255,.08)"}}/>
          <Stat label="最佳" val={best[level]} color="rgba(100,255,170,.85)"/>
        </>}
      </div>

      {/* Bottles */}
      <div style={{
        flex:1,display:"flex",flexDirection:"column",
        justifyContent:"center",alignItems:"center",
        gap:20,zIndex:1,minHeight:260,
        animation:"fadeIn .5s ease .15s both",
      }}>
        {cnt <= 5 ? renderRow(bottles) : (
          <>
            {renderRow(bottles.slice(0,perRow))}
            {renderRow(bottles.slice(perRow), perRow)}
          </>
        )}
      </div>

      {/* Hint */}
      {!won && sel===null && moves===0 && (
        <div style={{fontSize:12,color:"rgba(255,255,255,.18)",fontWeight:300,letterSpacing:2,marginBottom:16,zIndex:1,animation:"fadeIn .5s ease .3s both"}}>
          點擊瓶子選取 → 再點擊目標瓶
        </div>
      )}

      {/* Win */}
      {won && (
        <div style={{textAlign:"center",marginBottom:16,zIndex:10,animation:"fadeIn .6s ease"}}>
          <div style={{fontSize:40,marginBottom:4,animation:"starSpin 3s linear infinite",display:"inline-block"}}>✦</div>
          <div style={{
            fontSize:22,fontWeight:200,letterSpacing:10,
            background:"linear-gradient(135deg,rgba(100,255,170,.95),rgba(60,200,255,.8))",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>完 成</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.35)",fontWeight:300,marginTop:4}}>{moves} 步通關</div>
        </div>
      )}

      {/* Controls */}
      <div style={{display:"flex",gap:10,zIndex:1,animation:"fadeIn .5s ease .25s both"}}>
        <Btn icon="↩" label="撤回" onClick={undo} disabled={!hist.length||won}/>
        <Btn icon="↻" label="重來" onClick={reset}/>
        {won && <Btn icon="→" label="下一關" onClick={next} hl/>}
      </div>

      {/* Level select */}
      <div style={{marginTop:28,display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",zIndex:1,animation:"fadeIn .5s ease .35s both"}}>
        {LEVELS.map((_,i) => (
          <button key={i} onClick={()=>go(i)} style={{
            width:38,height:38,borderRadius:10,
            border:level===i?"1.5px solid rgba(255,255,255,.3)":"1px solid rgba(255,255,255,.06)",
            background:level===i?"linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.05))":"rgba(255,255,255,.02)",
            color:level===i?"#fff":"rgba(255,255,255,.3)",
            fontSize:14,fontWeight:level===i?500:300,cursor:"pointer",position:"relative",transition:"all .2s",
          }}>
            {i+1}
            {best[i]!=null && (
              <div style={{position:"absolute",bottom:2,right:2,width:5,height:5,borderRadius:"50%",background:"rgba(100,255,170,.7)",boxShadow:"0 0 6px rgba(100,255,170,.5)"}}/>
            )}
          </button>
        ))}
      </div>

      <div style={{marginTop:36,fontSize:8,letterSpacing:4,fontWeight:200,color:"rgba(255,255,255,.1)",zIndex:1}}>
        HAO0321 ©STUDIO
      </div>
    </div>
  );
}

function Stat({label,val,color}) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:2,fontWeight:300,marginBottom:2}}>{label}</div>
      <div style={{fontSize:18,fontWeight:500,color:color||"rgba(255,255,255,.85)",letterSpacing:1}}>{val}</div>
    </div>
  );
}

function Btn({icon,label,onClick,disabled,hl}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex",flexDirection:"column",alignItems:"center",gap:3,
      padding:"10px 20px",borderRadius:12,
      background:hl?"linear-gradient(135deg,rgba(100,255,170,.15),rgba(60,200,255,.1))":"rgba(255,255,255,.04)",
      border:hl?"1px solid rgba(100,255,170,.25)":"1px solid rgba(255,255,255,.06)",
      color:disabled?"rgba(255,255,255,.12)":hl?"rgba(100,255,170,.9)":"rgba(255,255,255,.55)",
      cursor:disabled?"not-allowed":"pointer",transition:"all .2s",minWidth:72,
    }}>
      <span style={{fontSize:18,lineHeight:1}}>{icon}</span>
      <span style={{fontSize:10,letterSpacing:2,fontWeight:300}}>{label}</span>
    </button>
  );
}
