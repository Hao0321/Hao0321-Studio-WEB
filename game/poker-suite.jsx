import { useState, useEffect, useCallback, useRef } from "react";

/* ══════════ CONSTANTS ══════════ */
const SUITS = ["♦", "♣", "♥", "♠"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const B2R = ["3","4","5","6","7","8","9","10","J","Q","K","A","2"];
const RV = {}; B2R.forEach((r, i) => (RV[r] = i));
const SV = { "♦": 0, "♣": 1, "♥": 2, "♠": 3 };
const cardVal = (c) => RV[c.rank] * 4 + SV[c.suit];
const CL = { single: "單張", pair: "對子", triple: "三條", straight: "順子", flush: "同花", fullhouse: "葫蘆", fourofakind: "鐵支", straightflush: "同花順" };
const PM = [{ n: "你", a: "" }, { n: "東風", a: "" }, { n: "南風", a: "" }, { n: "西風", a: "" }];

function mkDeck(jokers) {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s, id: r + s });
  if (jokers) {
    d.push({ rank: "JK", suit: "R", id: "JKR", isJoker: true, jcolor: "red" });
    d.push({ rank: "JK", suit: "B", id: "JKB", isJoker: true, jcolor: "black" });
  }
  return d;
}
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = 0 | Math.random() * (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function sortB2(c) { return [...c].sort((a, b) => cardVal(a) - cardVal(b)); }

/* ══════════ BIG TWO LOGIC ══════════ */
function gCT(cards) {
  if (!cards || !cards.length) return null;
  const n = cards.length;
  if (n === 1) return "single";
  if (n === 2 && cards[0].rank === cards[1].rank) return "pair";
  if (n === 3 && cards.every(c => c.rank === cards[0].rank)) return "triple";
  if (n !== 5) return null;
  const s = [...cards].sort((a, b) => RV[a.rank] - RV[b.rank]);
  const same = cards.every(c => c.suit === cards[0].suit);
  const no2 = !s.some(c => c.rank === "2");
  let con = no2;
  for (let i = 1; i < 5 && con; i++) if (RV[s[i].rank] - RV[s[i - 1].rank] !== 1) con = false;
  if (same && con) return "straightflush";
  const cnt = {}; cards.forEach(c => (cnt[c.rank] = (cnt[c.rank] || 0) + 1));
  const v = Object.values(cnt).sort();
  if (v.includes(4)) return "fourofakind";
  if (v.length === 2 && v[0] === 2 && v[1] === 3) return "fullhouse";
  if (same) return "flush";
  if (con) return "straight";
  return null;
}
const CR = { single: 0, pair: 0, triple: 0, straight: 1, flush: 2, fullhouse: 3, fourofakind: 4, straightflush: 5 };
function gCV(cards) {
  const t = gCT(cards); if (!t) return -1;
  if ("single pair triple".includes(t)) return Math.max(...cards.map(cardVal));
  if (t === "straight" || t === "straightflush") { const s = [...cards].sort((a, b) => RV[a.rank] - RV[b.rank]); return cardVal(s[4]); }
  if (t === "flush") return SV[cards[0].suit] * 100 + Math.max(...cards.map(cardVal));
  const cnt = {}; cards.forEach(c => (cnt[c.rank] = (cnt[c.rank] || 0) + 1));
  const k = Object.keys(cnt).find(r => cnt[r] >= (t === "fullhouse" ? 3 : 4));
  return RV[k] * 4 + 3;
}
function canBeat(p, c) {
  const pt = gCT(p), ct = gCT(c); if (!pt || !ct) return false;
  if (p.length === 5 && c.length === 5) { if (CR[pt] !== CR[ct]) return CR[pt] > CR[ct]; return gCV(p) > gCV(c); }
  if (p.length !== c.length || pt !== ct) return false;
  return gCV(p) > gCV(c);
}
function findCombos(h) {
  const c = [];
  h.forEach(x => c.push([x]));
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) if (h[i].rank === h[j].rank) c.push([h[i], h[j]]);
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) for (let k = j + 1; k < h.length; k++)
    if (h[i].rank === h[j].rank && h[j].rank === h[k].rank) c.push([h[i], h[j], h[k]]);
  if (h.length >= 5) for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) for (let k = j + 1; k < h.length; k++)
    for (let l = k + 1; l < h.length; l++) for (let m = l + 1; m < h.length; m++) { const f = [h[i], h[j], h[k], h[l], h[m]]; if (gCT(f)) c.push(f); }
  return c;
}
function aiB2(hand, cur, isF, m3) {
  const all = findCombos(hand);
  if (isF) {
    let v = all.filter(c => c.some(x => x.rank === "3" && x.suit === "♦"));
    if (m3 && v.length) { v.sort((a, b) => gCV(a) - gCV(b)); return v[0]; }
    const s = all.filter(c => gCT(c)).sort((a, b) => gCV(a) - gCV(b));
    return s[0] || null;
  }
  if (!cur) { const s = all.filter(c => gCT(c)).sort((a, b) => gCV(a) - gCV(b)); return s[0] || null; }
  const v = all.filter(c => canBeat(c, cur));
  v.sort((a, b) => gCV(a) - gCV(b));
  return v[0] || null;
}

/* ══════════ CSS ══════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+TC:wght@400;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-tap-highlight-color: transparent; }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: rgba(212,175,55,.3); border-radius: 9px; }

/* Card dealing - bouncy entrance */
@keyframes dc { 
  0% { opacity: 0; transform: scale(.2) translateY(-60px) rotate(-20deg); } 
  60% { opacity: 1; transform: scale(1.06) translateY(4px) rotate(1deg); }
  80% { transform: scale(.97) translateY(-2px) rotate(0); }
  100% { opacity: 1; transform: none; } 
}
/* Pop in */
@keyframes pi { 
  0% { opacity: 0; transform: scale(.3); } 
  50% { transform: scale(1.08); }
  100% { opacity: 1; transform: none; } 
}
/* Slide up */
@keyframes su { 
  0% { opacity: 0; transform: translateY(40px); } 
  100% { opacity: 1; transform: none; } 
}
/* Fade in */
@keyframes fi { 0% { opacity: 0; } 100% { opacity: 1; } }
/* Pulse */
@keyframes pu { 0%,100% { opacity: .4; transform: scale(.95); } 50% { opacity: 1; transform: scale(1.05); } }
/* Float up (fireworks) */
@keyframes fu { 
  0% { opacity: 1; transform: translateY(0) scale(1); } 
  50% { opacity: .8; }
  100% { opacity: 0; transform: translateY(-100px) scale(.2); } 
}
/* Shine text */
@keyframes sn { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
/* Breathe glow */
@keyframes br { 0%,100% { box-shadow: 0 0 10px rgba(212,175,55,.08); } 50% { box-shadow: 0 0 28px rgba(212,175,55,.35); } }
/* Card flip */
@keyframes fl { 
  0% { transform: rotateY(90deg) scale(.9); opacity: .5; } 
  100% { transform: rotateY(0) scale(1); opacity: 1; } 
}
/* Play card to center */
@keyframes playToCenter {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  50% { transform: translateY(-30px) scale(1.1); opacity: .9; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
/* Combo flash text */
@keyframes comboFlash {
  0% { opacity: 0; transform: scale(2.5) translateY(10px); filter: blur(4px); }
  30% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  70% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(.8) translateY(-10px); }
}
/* Tap ripple */
@keyframes tapRipple {
  0% { transform: scale(0); opacity: .5; }
  100% { transform: scale(3); opacity: 0; }
}
/* Slide in from left */
@keyframes slideL { 0% { opacity: 0; transform: translateX(-30px); } 100% { opacity: 1; transform: none; } }
/* Slide in from right */
@keyframes slideR { 0% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: none; } }
/* Gentle bob for active player */
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
/* Win celebration */
@keyframes winPop {
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(3deg); }
  70% { transform: scale(.95) rotate(-1deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
/* Card glow for playable */
@keyframes cardGlow {
  0%,100% { box-shadow: 0 0 8px rgba(212,175,55,.15); }
  50% { box-shadow: 0 0 18px rgba(212,175,55,.4); }
}
/* Shake for error */
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
/* Screen fade transition */
@keyframes screenFade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
`;

/* ══════════ CARD COMPONENT ══════════ */
function Card({ card, selected, onClick, faceDown, small, tiny, disabled, highlight, glow, style }) {
  const isRed = card && (card.suit === "♥" || card.suit === "♦");
  const isJ = card && card.isJoker;
  const w = tiny ? 26 : small ? 44 : 66;
  const h = tiny ? 37 : small ? 62 : 94;
  const st = style || {};

  if (faceDown) {
    return (
      <div onClick={!disabled ? onClick : undefined} style={{ width: w, height: h, borderRadius: tiny ? 2 : small ? 5 : 8, flexShrink: 0,
        background: "linear-gradient(145deg,#1e3355,#152745)", border: "1px solid #2d4a72",
        boxShadow: "0 2px 8px rgba(0,0,0,.5)", position: "relative", overflow: "hidden",
        cursor: glow ? "pointer" : "default", ...st }}>
        <div style={{ position: "absolute", inset: tiny ? 1 : 3, borderRadius: tiny ? 1 : small ? 3 : 5,
          background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(212,175,55,.04) 3px,rgba(212,175,55,.04) 6px)",
          border: "1px solid rgba(212,175,55,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: tiny ? 5 : small ? 9 : 14, color: "rgba(212,175,55,.12)" }}></span>
        </div>
        {glow && <div style={{ position: "absolute", inset: 0, borderRadius: tiny ? 2 : small ? 5 : 8, border: "1px solid rgba(212,175,55,.3)", animation: "br 1.5s infinite" }} />}
      </div>
    );
  }

  return (
    <div onClick={!disabled ? onClick : undefined} style={{ width: w, height: h, borderRadius: tiny ? 2 : small ? 5 : 8,
      position: "relative", cursor: disabled ? "default" : "pointer", flexShrink: 0, overflow: "hidden",
      background: selected ? "linear-gradient(170deg,#fffdf0,#f0e8d0)" : highlight ? "linear-gradient(170deg,#f0fff4,#d4f5e0)" : "linear-gradient(170deg,#fff,#f5f2ea)",
      border: selected ? "2px solid #d4af37" : highlight ? "2px solid #4ecdc4" : "1px solid rgba(0,0,0,.1)",
      boxShadow: selected ? "0 10px 30px rgba(212,175,55,.35), 0 0 0 1px rgba(212,175,55,.1)" : "0 1px 4px rgba(0,0,0,.12), 0 3px 8px rgba(0,0,0,.06)",
      transform: selected ? "translateY(-20px) scale(1.06)" : "",
      transition: "all .22s cubic-bezier(.34,1.56,.64,1)",
      zIndex: selected ? 100 : "auto", ...st }}>
      {/* Subtle card texture */}
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "radial-gradient(circle at 30% 30%, rgba(0,0,0,.1) 1px, transparent 1px)", backgroundSize: "6px 6px", pointerEvents: "none" }} />
      {!tiny && (
        <div style={{ position: "absolute", top: small ? 3 : 5, left: small ? 3 : 6, lineHeight: 1 }}>
          <div style={{ fontSize: small ? 9 : 13, fontWeight: 700, color: isJ ? (card.jcolor === "red" ? "#b71c1c" : "#1a1a2e") : isRed ? "#b71c1c" : "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{isJ ? "JK" : card.rank}</div>
          {!isJ && <div style={{ fontSize: small ? 9 : 12, color: isRed ? "#b71c1c" : "#1a1a2e", marginTop: -1 }}>{card.suit}</div>}
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: tiny ? 12 : small ? 20 : 32, color: isJ ? (card.jcolor === "red" ? "#b71c1c" : "#1a1a2e") : isRed ? "#b71c1c" : "#1a1a2e",
        filter: selected ? "drop-shadow(0 0 8px rgba(212,175,55,.4))" : "" }}>
        {isJ ? "" : card.suit}
      </div>
      {!tiny && !isJ && (
        <div style={{ position: "absolute", bottom: small ? 3 : 5, right: small ? 3 : 6, lineHeight: 1, transform: "rotate(180deg)" }}>
          <div style={{ fontSize: small ? 9 : 13, fontWeight: 700, color: isRed ? "#b71c1c" : "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{card.rank}</div>
          <div style={{ fontSize: small ? 9 : 12, color: isRed ? "#b71c1c" : "#1a1a2e", marginTop: -1 }}>{card.suit}</div>
        </div>
      )}
    </div>
  );
}

/* ══════════ SHARED UI ══════════ */
function Felt() { return <div style={{ position: "absolute", inset: 0, opacity: .06, background: "repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,.04) 1px,rgba(0,0,0,.04) 2px),repeating-linear-gradient(90deg,transparent,transparent 1px,rgba(0,0,0,.04) 1px,rgba(0,0,0,.04) 2px)", pointerEvents: "none" }} />; }

function TableBG({ children }) {
  return (
    <div style={{ height: "100vh", background: "radial-gradient(ellipse at 50% 45%,#1d4a30,#133322 30%,#0a1f14 60%,#060e09)", fontFamily: "'Noto Sans TC',sans-serif", color: "#e8e4da", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Felt />
      {children}
    </div>
  );
}

function TopBar({ title, onBack }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", zIndex: 20, background: "rgba(0,0,0,.2)", borderBottom: "1px solid rgba(212,175,55,.06)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4af37", opacity: .4 }} />
        <span style={{ fontSize: 12, color: "rgba(212,175,55,.5)", letterSpacing: 2, fontFamily: "'Playfair Display'" }}>{title}</span>
      </div>
      <button onClick={onBack} style={{ padding: "5px 14px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", color: "rgba(232,228,218,.3)", fontSize: 10, cursor: "pointer" }}>← 返回</button>
    </div>
  );
}

function GoldBtn({ children, onClick, disabled, sm }) {
  return (
    <button onClick={!disabled ? onClick : undefined} style={{ padding: sm ? "8px 20px" : "12px 36px", borderRadius: 50, fontSize: sm ? 12 : 14, fontWeight: 700, letterSpacing: 2, background: disabled ? "rgba(212,175,55,.03)" : "linear-gradient(135deg,#d4af37,#b8962e)", border: disabled ? "1px solid rgba(212,175,55,.06)" : "none", color: disabled ? "rgba(212,175,55,.1)" : "#0d1f16", cursor: disabled ? "default" : "pointer", boxShadow: disabled ? "none" : "0 4px 20px rgba(212,175,55,.25),inset 0 1px 0 rgba(255,255,255,.2)", transition: "all .25s", fontFamily: "'Noto Sans TC'" }}>{children}</button>
  );
}

function SecBtn({ children, onClick, disabled }) {
  return (
    <button onClick={!disabled ? onClick : undefined} style={{ padding: "8px 20px", borderRadius: 50, fontSize: 12, background: disabled ? "rgba(255,255,255,.01)" : "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255," + (disabled ? ".02" : ".08") + ")", color: disabled ? "rgba(232,228,218,.1)" : "rgba(232,228,218,.5)", cursor: disabled ? "default" : "pointer", transition: "all .2s" }}>{children}</button>
  );
}

function Fireworks({ active }) {
  const [sparks, setSparks] = useState([]);
  useEffect(() => {
    if (!active) return;
    setSparks(Array.from({ length: 45 }, (_, i) => ({ id: Date.now() + i, x: Math.random() * 100, y: Math.random() * 80 + 10, sz: Math.random() * 6 + 2, dur: Math.random() * 2 + .8, del: Math.random() * .5, c: ["#d4af37", "#e85d75", "#4ecdc4", "#fff", "#f2d06b"][0 | Math.random() * 5] })));
    const t = setTimeout(() => setSparks([]), 3000);
    return () => clearTimeout(t);
  }, [active]);
  if (!sparks.length) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {sparks.map(p => <div key={p.id} style={{ position: "absolute", left: p.x + "%", top: p.y + "%", width: p.sz, height: p.sz, borderRadius: "50%", background: p.c, boxShadow: "0 0 " + (p.sz * 3) + "px " + p.c, animation: "fu " + p.dur + "s ease-out " + p.del + "s forwards", opacity: 0 }} />)}
    </div>
  );
}

function WinScreen({ won, msg, onAgain, onBack, fwt }) {
  return (
    <TableBG>
      <Fireworks active={fwt} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, animation: "screenFade .5s" }}>
        <div style={{ fontSize: 64, animation: "winPop .6s cubic-bezier(.34,1.56,.64,1)" }}>{won ? "" : ""}</div>
        <h2 style={{
          fontSize: 30, fontWeight: 900, fontFamily: "'Playfair Display'",
          background: won ? "linear-gradient(135deg,#4ecdc4,#fff,#4ecdc4)" : "linear-gradient(135deg,#e85d75,#fff,#e85d75)",
          backgroundSize: "200% auto", animation: "sn 3s linear infinite",
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
          animationDelay: ".3s", opacity: 0, animationFillMode: "forwards"
        }}>{msg}</h2>
        <p style={{ fontSize: 12, color: "rgba(232,228,218,.3)", animation: "su .5s .4s both", fontStyle: "italic" }}>
          {won ? "Perfect game!" : "Better luck next time."}
        </p>
        <div style={{ display: "flex", gap: 12, animation: "su .5s .6s both" }}>
          <GoldBtn onClick={onAgain} sm>再來一局</GoldBtn>
          <SecBtn onClick={onBack}>返回選單</SecBtn>
        </div>
      </div>
    </TableBG>
  );
}

function HandArea({ cards, selected, onToggle, disabled, onPlay, onPass, canPlay, canPass, status, extra }) {
  const [hovIdx, setHovIdx] = useState(-1);
  const [tapFeedback, setTapFeedback] = useState(null);
  const [shakeMsg, setShakeMsg] = useState(false);

  const handleTap = (card, i) => {
    if (disabled) return;
    // If card has _playable === false, show shake feedback
    if (card._playable === false && onToggle) {
      setShakeMsg(true);
      setTimeout(() => setShakeMsg(false), 500);
      onToggle(card);
      return;
    }
    setTapFeedback(i);
    setTimeout(() => setTapFeedback(null), 300);
    if (onToggle) onToggle(card);
  };

  return (
    <div style={{ background: "linear-gradient(to top,rgba(4,10,6,.97) 0%,rgba(4,10,6,.9) 50%,rgba(4,10,6,.4) 85%,transparent)", padding: "4px 10px 14px", position: "relative", zIndex: 20, flexShrink: 0 }}>
      {status && (
        <div style={{ textAlign: "center", marginBottom: 4, animation: shakeMsg ? "shake .4s" : "" }}>
          <span style={{ fontSize: 10, color: "rgba(212,175,55,.5)", letterSpacing: 1, transition: "all .3s" }}>{status}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 10px", overflowX: "auto", WebkitOverflowScrolling: "touch", minHeight: 112 }}>
        <div style={{ display: "flex", alignItems: "flex-end", padding: "0 20px" }}>
          {cards.map((card, i, arr) => {
            const isSel = selected && selected.some(c => c.id === card.id);
            const isH = hovIdx === i;
            const isTapped = tapFeedback === i;
            const near = Math.abs(hovIdx - i);
            const baseOL = arr.length > 16 ? 42 : arr.length > 12 ? 34 : arr.length > 8 ? 24 : arr.length > 5 ? 16 : 8;
            const spread = hovIdx >= 0 && near <= 3 ? (3 - near) * 10 : 0;
            const isPlayable = card._playable;
            return (
              <div key={card.id}
                onMouseEnter={() => !disabled && setHovIdx(i)}
                onMouseLeave={() => setHovIdx(-1)}
                onTouchStart={() => !disabled && setHovIdx(i)}
                onTouchEnd={() => setTimeout(() => setHovIdx(-1), 200)}
                style={{
                  marginLeft: i ? -(baseOL - spread) : 0,
                  zIndex: isSel ? 100 : isH ? 99 : i,
                  animation: "dc .3s cubic-bezier(.34,1.56,.64,1) " + (i * .025) + "s both",
                  transition: "margin .2s cubic-bezier(.25,.1,.25,1), transform .2s cubic-bezier(.34,1.56,.64,1)",
                  transform: isSel ? "" : isH ? "translateY(-10px) scale(1.06)" : isTapped ? "scale(.95)" : ""
                }}>
                <Card card={card} selected={isSel} onClick={() => handleTap(card, i)} disabled={disabled}
                  style={isPlayable === false
                    ? { opacity: 0.35, filter: "grayscale(0.4)", transition: "all .3s" }
                    : isPlayable === true
                    ? { border: "2px solid rgba(212,175,55,.5)", animation: "cardGlow 2s ease-in-out infinite", transition: "all .3s" }
                    : { transition: "all .2s" }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", animation: "fi .3s" }}>
        {onPass && (
          <button onClick={canPass ? onPass : undefined} style={{
            padding: "10px 24px", borderRadius: 50, fontSize: 12, fontWeight: 600, letterSpacing: 2,
            background: canPass ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.01)",
            border: "1px solid rgba(255,255,255," + (canPass ? ".1" : ".03") + ")",
            color: canPass ? "rgba(232,228,218,.6)" : "rgba(232,228,218,.1)",
            cursor: canPass ? "pointer" : "default",
            transition: "all .25s cubic-bezier(.25,.1,.25,1)",
            transform: canPass ? "" : "scale(.98)"
          }}>PASS</button>
        )}
        {extra}
        {onToggle && (
          <button onClick={() => onToggle(null)} disabled={!selected || !selected.length} style={{
            padding: "8px 20px", borderRadius: 50, fontSize: 12,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255," + (selected && selected.length ? ".08" : ".02") + ")",
            color: selected && selected.length ? "rgba(232,228,218,.5)" : "rgba(232,228,218,.08)",
            cursor: selected && selected.length ? "pointer" : "default",
            transition: "all .25s"
          }}>重選</button>
        )}
        {onPlay && (
          <button onClick={canPlay ? onPlay : undefined} style={{
            padding: "10px 40px", borderRadius: 50, fontSize: 14, fontWeight: 700, letterSpacing: 3,
            background: canPlay ? "linear-gradient(135deg,#d4af37,#b8962e)" : "rgba(212,175,55,.03)",
            border: canPlay ? "none" : "1px solid rgba(212,175,55,.05)",
            color: canPlay ? "#0d1f16" : "rgba(212,175,55,.08)",
            cursor: canPlay ? "pointer" : "default",
            boxShadow: canPlay ? "0 4px 24px rgba(212,175,55,.3), inset 0 1px 0 rgba(255,255,255,.25)" : "none",
            transition: "all .3s cubic-bezier(.25,.1,.25,1)",
            transform: canPlay ? "scale(1)" : "scale(.97)",
            fontFamily: "'Noto Sans TC'"
          }}>出牌</button>
        )}
      </div>
    </div>
  );
}

/* ══════════ BIG TWO GAME ══════════ */
function BigTwoGame({ onBack }) {
  const [pc, setPc] = useState(4);
  const [ph, setPh] = useState("setup");
  const [hands, setH] = useState([]);
  const [cp, setCP] = useState(null);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState([]);
  const [paC, setPaC] = useState(0);
  const [lp, setLP] = useState(-1);
  const [isF, setIF] = useState(true);
  const [st, setST] = useState(0);
  const [logs, setLogs] = useState([]);
  const [win, setWin] = useState(null);
  const [tk, setTK] = useState(false);
  const [pa, setPA] = useState(null);
  const [fw, setFW] = useState(0);
  const lr = useRef(null);
  const log = useCallback(m => setLogs(p => [...p.slice(-25), { m, t: Date.now() }]), []);

  const start = () => {
    const d = shuffle(mkDeck()); const cpp = 0 | 52 / pc; const h = [];
    for (let i = 0; i < pc; i++) h.push(sortB2(d.slice(i * cpp, (i + 1) * cpp)));
    let s = 0; for (let i = 0; i < pc; i++) if (h[i].some(c => c.rank === "3" && c.suit === "♦")) { s = i; break; }
    setH(h); setCur(s); setST(s); setCP(null); setPaC(0); setLP(-1); setIF(true); setSel([]); setLogs([]); setWin(null); setPA(null); setPh("play"); log(PM[s].n + "先出");
  };

  const toggle = (c) => {
    if (!c) { setSel([]); return; }
    setSel(p => { const i = p.findIndex(x => x.id === c.id); return i >= 0 ? p.filter(x => x.id !== c.id) : [...p, c]; });
  };

  const play = () => {
    if (!sel.length) return; const t = gCT(sel); if (!t) return;
    if (isF && cur === st && !sel.some(c => c.rank === "3" && c.suit === "♦")) return;
    if (cp && lp !== 0 && !canBeat(sel, cp)) return;
    const nh = [...hands]; nh[0] = nh[0].filter(c => !sel.some(s2 => s2.id === c.id));
    setH(nh); setCP([...sel]); setPA({ c: [...sel], p: 0 }); setLP(0); setPaC(0);
    if (isF) setIF(false); setSel([]); log("你 " + CL[t]);
    if (!nh[0].length) { setWin(0); setFW(f => f + 1); setPh("over"); if(typeof window!=="undefined"&&window.haoGame)window.haoGame.reportScore(fw+1); return; }
    setCur(1 % pc);
  };

  const pass = () => {
    if (lp === 0 && cp) return;
    const np = paC + 1; log("你 PASS");
    if (np >= pc - 1) { setCP(null); setPaC(0); setPA(null); setCur(lp >= 0 ? lp : (cur + 1) % pc); log("─ 新一輪 ─"); }
    else { setPaC(np); setCur(1 % pc); }
  };

  useEffect(() => {
    if (ph !== "play" || cur === 0 || win !== null) return;
    setTK(true);
    const timer = setTimeout(() => {
      const p = cur; const h = hands[p]; if (!h || !h.length) return;
      const free = !cp || lp === p; const m3 = isF && p === st;
      const pl = aiB2(h, free ? null : cp, free || m3, m3);
      if (pl) {
        const t2 = gCT(pl); const nh = [...hands];
        nh[p] = nh[p].filter(c => !pl.some(x => x.id === c.id));
        setH(nh); setCP([...pl]); setPA({ c: [...pl], p: p }); setLP(p); setPaC(0);
        if (isF) setIF(false); log(PM[p].n + " " + CL[t2]);
        if (!nh[p].length) { setWin(p); setFW(f => f + 1); setPh("over"); setTK(false); return; }
      } else {
        const np = paC + 1; log(PM[p].n + " PASS");
        if (np >= pc - 1) { setCP(null); setPaC(0); setPA(null); setCur(lp >= 0 ? lp : (p + 1) % pc); log("─ 新一輪 ─"); setTK(false); return; }
        setPaC(np);
      }
      setCur((p + 1) % pc); setTK(false);
    }, 800 + Math.random() * 500);
    return () => clearTimeout(timer);
  }, [cur, ph, win]);

  useEffect(() => { if (lr.current) lr.current.scrollTop = lr.current.scrollHeight; }, [logs]);

  const myTurn = cur === 0 && ph === "play" && !win;
  const sT = gCT(sel); const fp = !cp || lp === 0;
  const cP = myTurn && sT && (fp || canBeat(sel, cp)) && (!isF || cur !== st || sel.some(c => c.rank === "3" && c.suit === "♦"));
  const cPa = myTurn && cp && lp !== 0;

  if (ph === "setup") {
    return (
      <TableBG>
        <TopBar title="大老二" onBack={onBack} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, animation: "su .5s" }}>
          <div style={{ fontSize: 11, color: "rgba(212,175,55,.4)", letterSpacing: 3 }}>選擇人數</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setPc(n)} style={{ width: 66, height: 66, borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: pc === n ? "rgba(212,175,55,.06)" : "rgba(255,255,255,.015)", border: pc === n ? "1.5px solid rgba(212,175,55,.4)" : "1.5px solid rgba(255,255,255,.04)", animation: pc === n ? "br 2.5s infinite" : "none" }}>
                <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Playfair Display'", color: pc === n ? "#d4af37" : "rgba(232,228,218,.2)" }}>{n}</span>
                <span style={{ fontSize: 8, color: pc === n ? "rgba(212,175,55,.5)" : "rgba(232,228,218,.1)" }}>人</span>
              </button>
            ))}
          </div>
          <GoldBtn onClick={start}>開始</GoldBtn>
        </div>
      </TableBG>
    );
  }

  if (ph === "over") {
    return <WinScreen won={win === 0} msg={win === 0 ? "你贏了！" : PM[win].n + "勝出"} onAgain={start} onBack={onBack} fwt={fw} />;
  }

  const ops = pc === 2 ? [{ i: 1, p: "top" }] : pc === 3 ? [{ i: 1, p: "left" }, { i: 2, p: "right" }] : [{ i: 1, p: "left" }, { i: 2, p: "top" }, { i: 3, p: "right" }];

  return (
    <TableBG>
      <TopBar title="大老二" onBack={onBack} />
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ position: "absolute", left: "10%", right: "10%", top: "8%", bottom: "5%", borderRadius: "50%", pointerEvents: "none", border: "2px solid rgba(212,175,55,.04)", boxShadow: "inset 0 0 60px rgba(0,0,0,.2)", background: "radial-gradient(ellipse,rgba(26,74,48,.2),transparent 70%)" }} />
        {ops.map(({ i: idx, p: pos }) => {
          const act = cur === idx;
          const sty = pos === "top" ? { position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)" } : pos === "left" ? { position: "absolute", left: 4, top: "42%", transform: "translateY(-50%)" } : { position: "absolute", right: 4, top: "42%", transform: "translateY(-50%)" };
          return (
            <div key={idx} style={{ ...sty, zIndex: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: 10, background: act ? "rgba(212,175,55,.05)" : "rgba(0,0,0,.2)", border: act ? "1px solid rgba(212,175,55,.18)" : "1px solid rgba(255,255,255,.02)", animation: act ? "br 2s infinite" : "none", minWidth: 64 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 13 }}>{PM[idx].a}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: act ? "#d4af37" : "rgba(232,228,218,.35)" }}>{PM[idx].n}</span>
                </div>
                <div style={{ display: "flex", height: 20, position: "relative", minWidth: 44 }}>
                  {(hands[idx] || []).slice(0, 8).map((c, j, a) => {
                    const total = Math.min(a.length, 8);
                    return <div key={j} style={{ position: "absolute", transform: "translateX(" + ((j - (total - 1) / 2) * 5) + "px) rotate(" + ((j - (total - 1) / 2) * 4) + "deg)", transformOrigin: "bottom center" }}><Card card={c} faceDown disabled style={{ width: 14, height: 20, borderRadius: 2 }} /></div>;
                  })}
                </div>
                <span style={{ fontSize: 7, color: "rgba(232,228,218,.2)" }}>{(hands[idx] || []).length}張</span>
                {act && tk && <span style={{ fontSize: 7, color: "#d4af37", animation: "pu 1.2s ease-in-out infinite" }}>⋯</span>}
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", zIndex: 5, textAlign: "center", minWidth: 180 }}>
          {pa ? (
            <div style={{ animation: "pi .35s cubic-bezier(.34,1.56,.64,1)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 16, marginBottom: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(212,175,55,.12)", backdropFilter: "blur(4px)" }}>
                <span style={{ fontSize: 12 }}>{PM[pa.p].a}</span>
                <span style={{ fontSize: 10, color: "rgba(232,228,218,.6)", fontWeight: 600 }}>{PM[pa.p].n}</span>
                {gCT(pa.c) && (
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: "linear-gradient(135deg,rgba(212,175,55,.15),rgba(212,175,55,.08))", color: "#f2d06b", fontWeight: 700, letterSpacing: 1 }}>{CL[gCT(pa.c)]}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                {pa.c.map((c, i) => (
                  <div key={c.id} style={{ animation: "dc .35s cubic-bezier(.34,1.56,.64,1) " + (i * .06) + "s both" }}>
                    <Card card={c} small disabled />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "18px 36px", borderRadius: 30, border: "1.5px dashed rgba(212,175,55,.06)", color: "rgba(212,175,55,.12)", fontSize: 11, letterSpacing: 3, animation: "fi .5s" }}>{isF ? "等待出牌" : "自由出牌"}</div>
          )}
        </div>
        <div ref={lr} style={{ position: "absolute", right: 3, bottom: 3, width: 120, maxHeight: 100, overflowY: "auto", padding: 5, background: "rgba(0,0,0,.25)", borderRadius: 6, border: "1px solid rgba(212,175,55,.03)", zIndex: 15 }}>
          {logs.map((l, i) => <div key={l.t + "" + i} style={{ fontSize: 8, color: "rgba(232,228,218,.25)", lineHeight: 1.5 }}>{l.m}</div>)}
        </div>
      </div>
      <HandArea cards={hands[0] || []} selected={sel} onToggle={toggle} disabled={!myTurn} onPlay={play} onPass={pass} canPlay={cP} canPass={cPa}
        status={myTurn ? "你的回合" + (sT ? " · " + CL[sT] + (cP ? " " : " ") : "") : "等待中"} />
    </TableBG>
  );
}

/* ══════════ BLACKJACK ══════════ */
function BlackjackGame({ onBack }) {
  const getVal = (c) => "JQK".includes(c.rank) ? 10 : c.rank === "A" ? 11 : +c.rank;
  const handVal = (h) => { let s = h.reduce((a, c) => a + getVal(c), 0), ac = h.filter(c => c.rank === "A").length; while (s > 21 && ac > 0) { s -= 10; ac--; } return s; };
  const [dk, setDK] = useState([]); const [pH, setPH] = useState([]); const [dH, setDH] = useState([]);
  const [ph, setPh] = useState("bet"); const [bt, setBt] = useState(10); const [ch, setCh] = useState(1000);
  const [msg, setMsg] = useState(""); const [fw, setFw] = useState(0);

  const deal = () => { const d = shuffle(mkDeck()); setPH([d[0], d[2]]); setDH([d[1], d[3]]); setDK(d.slice(4)); setPh("play"); setMsg("");
    if (handVal([d[0], d[2]]) === 21) setTimeout(() => stand([d[0], d[2]], [d[1], d[3]], d.slice(4)), 500); };
  const hit = () => { const nh = [...pH, dk[0]]; setPH(nh); setDK(d => d.slice(1));
    if (handVal(nh) > 21) { setMsg("爆牌！"); setCh(c => c - bt); setPh("over"); } else if (handVal(nh) === 21) stand(nh, dH, dk.slice(1)); };
  const stand = (ph2, dh, dd) => {
    const p2 = ph2 || pH, d2 = dh || dH; let d = [...d2], k = dd || [...dk];
    while (handVal(d) < 17) { d.push(k[0]); k = k.slice(1); }
    setDH(d); setDK(k);
    const pv = handVal(p2), dv = handVal(d);
    if (dv > 21 || pv > dv) { setMsg("你贏了！"); setCh(c => c + bt); setFw(f => f + 1); }
    else if (pv < dv) { setMsg("莊家贏"); setCh(c => c - bt); }
    else setMsg("平手");
    setPh("over");
  };
  const dbl = () => { const nb = bt * 2; setBt(nb); const nh = [...pH, dk[0]]; setPH(nh); setDK(d => d.slice(1));
    if (handVal(nh) > 21) { setMsg("爆牌！"); setCh(c => c - nb); setPh("over"); } else stand(nh, dH, dk.slice(1)); };

  return (
    <TableBG>
      <TopBar title="21點 Blackjack" onBack={onBack} />
      <Fireworks active={fw} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
        <div style={{ position: "absolute", top: 48, right: 14, padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,.3)", border: "1px solid rgba(212,175,55,.08)" }}>
          <div style={{ fontSize: 8, color: "rgba(212,175,55,.3)" }}>籌碼</div>
          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>${ch}</div>
        </div>
        {ph === "bet" ? (
          <div style={{ textAlign: "center", animation: "su .5s" }}>
            <div style={{ fontSize: 12, color: "rgba(212,175,55,.5)", letterSpacing: 2, marginBottom: 14 }}>下注</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[5, 10, 25, 50, 100].map(b => (
                <button key={b} onClick={() => setBt(b)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontFamily: "'Playfair Display'", background: bt === b ? "rgba(212,175,55,.08)" : "rgba(255,255,255,.02)", border: bt === b ? "1.5px solid rgba(212,175,55,.3)" : "1px solid rgba(255,255,255,.04)", color: bt === b ? "#d4af37" : "rgba(232,228,218,.3)", cursor: "pointer" }}>${b}</button>
              ))}
            </div>
            <GoldBtn onClick={deal}>發牌</GoldBtn>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(232,228,218,.35)", marginBottom: 6 }}>莊家 {ph === "over" ? "· " + handVal(dH) : ""}</div>
              <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                {dH.map((c, i) => <div key={c.id} style={{ animation: "dc .4s cubic-bezier(.34,1.56,.64,1) " + (i * .15) + "s both" }}><Card card={c} faceDown={ph === "play" && i === 1} disabled /></div>)}
              </div>
            </div>
            <div style={{ padding: "6px 16px", borderRadius: 16, background: "rgba(0,0,0,.25)", border: "1px solid rgba(212,175,55,.06)" }}>
              {msg ? <span style={{ fontSize: 13, fontWeight: 700, color: msg.includes("贏") ? "#4ecdc4" : msg.includes("爆") || msg.includes("莊") ? "#e85d75" : "#d4af37" }}>{msg}</span>
                : <span style={{ fontSize: 11, color: "rgba(232,228,218,.35)" }}>下注 ${bt}</span>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                {pH.map((c, i) => <div key={c.id} style={{ animation: "dc .4s cubic-bezier(.34,1.56,.64,1) " + (i * .15) + "s both" }}><Card card={c} disabled /></div>)}
              </div>
              <div style={{ fontSize: 10, color: "rgba(212,175,55,.5)", marginTop: 6 }}>你 · {handVal(pH)}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {ph === "play" && (
                <>
                  <GoldBtn onClick={hit} sm>要牌</GoldBtn>
                  <SecBtn onClick={() => stand()}>停牌</SecBtn>
                  {pH.length === 2 && ch >= bt && <SecBtn onClick={dbl}>加倍</SecBtn>}
                </>
              )}
              {ph === "over" && (
                <>
                  <GoldBtn onClick={() => { setPh("bet"); setBt(10); }} sm>再來</GoldBtn>
                  <SecBtn onClick={onBack}>返回</SecBtn>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </TableBG>
  );
}

/* ══════════ OLD MAID ══════════ */
function OldMaidGame({ onBack }) {
  const [ph, setPh] = useState("intro"); const [hs, setHs] = useState([[], []]); const [tn, setTn] = useState(0);
  const [msg, setMsg] = useState(""); const [win, setWin] = useState(null); const [fw, setFw] = useState(0); const [aiP, setAiP] = useState(false);

  const remP = (h) => { const cnt = {}; h.forEach(c => { const k = c.isJoker ? "JK" : c.rank; cnt[k] = (cnt[k] || 0) + 1; });
    const rm = new Set(); Object.entries(cnt).forEach(([r, n]) => { if (n >= 2) { let f = 0; for (const c of h) if ((c.isJoker ? "JK" : c.rank) === r && !rm.has(c.id) && f < 2) { rm.add(c.id); f++; } } }); return h.filter(c => !rm.has(c.id)); };
  const start = () => { let d = shuffle(mkDeck(true)); const ji = d.findIndex(c => c.isJoker); d.splice(ji, 1);
    let h0 = [], h1 = []; d.forEach((c, i) => (i % 2 ? h1 : h0).push(c)); h0 = remP(shuffle(h0)); h1 = remP(shuffle(h1));
    setHs([h0, h1]); setTn(0); setMsg(""); setWin(null); setPh("play"); };
  const chkW = (hs2) => { if (!hs2[0].length) { setWin(0); setMsg("你贏了！"); setFw(f => f + 1); setPh("over"); if(typeof window!=="undefined"&&window.haoGame)window.haoGame.reportScore(fw+1); return true; }
    if (!hs2[1].length) { setWin(1); setMsg("你持有鬼牌！"); setPh("over"); return true; } return false; };
  const draw = (idx) => { const c = hs[1][idx]; const n1 = hs[1].filter((_, i) => i !== idx); const n0 = remP([...hs[0], c]);
    const nh = [n0, n1]; setHs(nh); setMsg("抽到 " + (c.isJoker ? "" : c.rank + c.suit)); if (!chkW(nh)) setTn(1); };

  useEffect(() => {
    if (ph !== "play" || tn !== 1 || win !== null) return; setAiP(true);
    const t = setTimeout(() => { const idx = 0 | Math.random() * hs[0].length; const c = hs[0][idx];
      const n0 = hs[0].filter((_, i) => i !== idx); const n1 = remP([...hs[1], c]);
      const nh = [n0, n1]; setHs(nh); setMsg("對手抽走一張"); setAiP(false); if (!chkW(nh)) setTn(0);
    }, 900 + Math.random() * 600); return () => clearTimeout(t);
  }, [tn, ph, win]);

  if (ph === "intro") {
    return (
      <TableBG>
        <TopBar title="抽鬼牌" onBack={onBack} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, animation: "su .5s" }}>
          <div style={{ fontSize: 48 }}></div>
          <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>抽鬼牌</h2>
          <p style={{ fontSize: 11, color: "rgba(232,228,218,.3)", textAlign: "center", maxWidth: 260, lineHeight: 1.8 }}>配對相同點數，從對手抽牌。最後持有鬼牌的人輸！</p>
          <GoldBtn onClick={start}>開始</GoldBtn>
        </div>
      </TableBG>
    );
  }
  if (ph === "over") {
    return <WinScreen won={win === 0} msg={win === 0 ? "配對完成！你贏了！" : "你持有鬼牌，輸了！"} onAgain={start} onBack={onBack} fwt={fw} />;
  }
  return (
    <TableBG>
      <TopBar title="抽鬼牌" onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 10, gap: 6 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(232,228,218,.3)", marginBottom: 4 }}> 對手 · {hs[1].length}張 {tn === 0 ? "← 點擊抽牌" : ""}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
            {hs[1].map((c, i) => (
              <div key={c.id} style={{ animation: "dc .15s " + (i * .015) + "s both" }} onClick={() => tn === 0 && draw(i)}>
                <Card card={c} faceDown small disabled={tn !== 0} glow={tn === 0} style={{ width: 34, height: 48, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,.2)" }}>
          <span style={{ fontSize: 11, color: tn === 0 ? "#d4af37" : "rgba(232,228,218,.35)" }}>{aiP ? "對手正在抽牌⋯" : tn === 0 ? "點擊對手的牌抽取" : msg}</span>
        </div>
        <div style={{ textAlign: "center", marginTop: "auto" }}>
          <div style={{ fontSize: 10, color: "rgba(212,175,55,.5)", marginBottom: 4 }}>你 · {hs[0].length}張</div>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 2, maxHeight: 180, overflowY: "auto" }}>
            {hs[0].map((c, i) => <div key={c.id} style={{ animation: "dc .15s " + (i * .015) + "s both" }}><Card card={c} small disabled highlight={c.isJoker} /></div>)}
          </div>
        </div>
      </div>
    </TableBG>
  );
}

/* ══════════ SEVENS (Enhanced) ══════════ */
const S7_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function SevensGame({ onBack }) {
  const [ph, setPh] = useState("intro");
  const [hs, setHs] = useState([[], [], []]);
  const [bd, setBd] = useState({ "♦": [], "♣": [], "♥": [], "♠": [] });
  const [tn, setTn] = useState(0);
  const [win, setWin] = useState(null);
  const [msg, setMsg] = useState("");
  const [fw, setFw] = useState(0);
  const [tk, setTK] = useState(false);
  const [pC, setPC] = useState([0, 0, 0]);
  const [showHint, setShowHint] = useState(false);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);

  const so = (r) => ({ A: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, J: 10, Q: 11, K: 12 }[r] ?? -1);
  const canPl = (s, r) => {
    const row = bd[s];
    if (r === "7") return !row.includes("7");
    if (!row.includes("7")) return false;
    const ri = so(r), lo = Math.min(...row.map(so)), hi = Math.max(...row.map(so));
    return ri === lo - 1 || ri === hi + 1;
  };
  const playable = (h) => h.filter(c => canPl(c.suit, c.rank));
  const addLog = (m) => setLogs(p => [...p.slice(-20), { m, t: Date.now() }]);

  // Get next playable slots on board for each suit
  const getSlots = (s) => {
    const row = bd[s];
    const slots = [];
    if (!row.includes("7")) { slots.push("7"); return slots; }
    const lo = Math.min(...row.map(so));
    const hi = Math.max(...row.map(so));
    if (lo > 0) slots.push(S7_RANKS[lo - 1]);
    if (hi < 12) slots.push(S7_RANKS[hi + 1]);
    return slots;
  };

  const start = () => {
    const d = shuffle(mkDeck());
    const h = [[], [], []];
    d.forEach((c, i) => h[i % 3].push(c));
    h.forEach(x => x.sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || so(a.rank) - so(b.rank)));
    let s = 0;
    for (let i = 0; i < 3; i++) if (h[i].some(c => c.rank === "7")) { s = i; break; }
    setBd({ "♦": [], "♣": [], "♥": [], "♠": [] });
    setHs(h); setTn(s); setWin(null); setLastPlayed(null); setShowHint(false);
    setMsg(s === 0 ? "你先出！點擊手牌中的7開始" : PM[s].n + "先出");
    setPh("play"); setPC([0, 0, 0]); setLogs([]);
    addLog("遊戲開始！");
  };

  const place = (c) => {
    const nh = [...hs];
    nh[0] = nh[0].filter(x => x.id !== c.id);
    const nb = { ...bd };
    nb[c.suit] = [...nb[c.suit], c.rank].sort((a, b) => so(a) - so(b));
    setHs(nh); setBd(nb); setLastPlayed(c); setShowHint(false);
    const m = "你放了 " + c.rank + c.suit;
    setMsg(m); addLog(m);
    if (!nh[0].length) { setWin(0); setFw(f => f + 1); setPh("over"); addLog("你贏了！"); if(typeof window!=="undefined"&&window.haoGame)window.haoGame.reportScore(fw+1); return; }
    setTn(1);
  };

  const passT = () => {
    const np = [...pC]; np[0]++; setPC(np); setShowHint(false);
    if (np[0] >= 3) {
      setWin(np[1] < np[2] ? 1 : 2); setPh("over");
      addLog("你已PASS 3次，被淘汰");
      return;
    }
    const m = "你 PASS (" + np[0] + "/3)";
    setMsg(m); addLog(m); setTn(1);
  };

  useEffect(() => {
    if (ph !== "play" || tn === 0 || win !== null) return;
    setTK(true);
    const t = setTimeout(() => {
      const p = tn, h = hs[p]; const pl = playable(h);
      if (pl.length) {
        // AI: prefer 7s first, then play strategically (hold extremes)
        const sevens = pl.filter(c => c.rank === "7");
        const c = sevens.length ? sevens[0] : pl[0 | Math.random() * pl.length];
        const nh = [...hs];
        nh[p] = nh[p].filter(x => x.id !== c.id);
        const nb = { ...bd };
        nb[c.suit] = [...nb[c.suit], c.rank].sort((a, b) => so(a) - so(b));
        setHs(nh); setBd(nb); setLastPlayed(c);
        const m = PM[p].n + " 放了 " + c.rank + c.suit;
        setMsg(m); addLog(m);
        if (!nh[p].length) { setWin(p); setPh("over"); setTK(false); addLog(PM[p].n + " 贏了！"); return; }
      } else {
        const np = [...pC]; np[p]++; setPC(np);
        const m = PM[p].n + " PASS (" + np[p] + "/3)";
        setMsg(m); addLog(m);
        if (np[p] >= 3) { addLog(PM[p].n + " 被淘汰！"); }
      }
      setTn(tn === 1 ? 2 : 0); setTK(false);
    }, 850 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [tn, ph, win]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const mp = playable(hs[0] || []);
  const myTurn = tn === 0 && ph === "play" && !win;

  if (ph === "intro") {
    return (
      <TableBG>
        <TopBar title="排七" onBack={onBack} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, animation: "su .5s" }}>
          <div style={{ fontSize: 48 }}>7⃣</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>排七</h2>
          <p style={{ fontSize: 11, color: "rgba(232,228,218,.3)", textAlign: "center", maxWidth: 280, lineHeight: 1.8 }}>
            從7開始，依序向兩端延伸放牌（6←7→8）。沒有可放的牌就PASS，累計3次PASS淘汰。最先出完所有手牌的玩家獲勝！
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {["可出的牌會", "金色高亮", "提示"].map((t, i) => (
              <span key={i} style={{ padding: "3px 10px", borderRadius: 10, fontSize: 9, background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.15)", color: "rgba(212,175,55,.6)" }}>{t}</span>
            ))}
          </div>
          <GoldBtn onClick={start}>開始遊戲</GoldBtn>
        </div>
      </TableBG>
    );
  }

  if (ph === "over") {
    return (
      <WinScreen won={win === 0} msg={win === 0 ? "你贏了！" : PM[win].n + "贏了"} onAgain={start} onBack={onBack} fwt={fw} />
    );
  }

  return (
    <TableBG>
      <TopBar title="排七" onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "6px 8px", gap: 4, overflow: "hidden" }}>

        {/* ── Opponents ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexShrink: 0 }}>
          {[1, 2].map(i => {
            const act = tn === i;
            const eliminated = pC[i] >= 3;
            return (
              <div key={i} style={{
                padding: "5px 14px", borderRadius: 10, textAlign: "center", transition: "all .3s",
                background: eliminated ? "rgba(232,76,61,.06)" : act ? "rgba(212,175,55,.06)" : "rgba(0,0,0,.15)",
                border: eliminated ? "1px solid rgba(232,76,61,.15)" : act ? "1px solid rgba(212,175,55,.2)" : "1px solid rgba(255,255,255,.03)",
                animation: act ? "br 2s infinite" : "none", opacity: eliminated ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                  <span style={{ fontSize: 13 }}>{PM[i].a}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: act ? "#d4af37" : "rgba(232,228,218,.4)" }}>{PM[i].n}</span>
                </div>
                <div style={{ fontSize: 8, color: "rgba(232,228,218,.25)", marginTop: 2 }}>
                  {(hs[i] || []).length}張
                </div>
                {/* Pass indicators */}
                <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 3 }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: j < pC[i] ? "#e85d75" : "rgba(255,255,255,.06)",
                      border: "1px solid " + (j < pC[i] ? "rgba(232,76,61,.3)" : "rgba(255,255,255,.04)"),
                      transition: "all .3s"
                    }} />
                  ))}
                </div>
                {act && tk && <div style={{ fontSize: 7, color: "#d4af37", animation: "pu 1.2s ease-in-out infinite", marginTop: 2 }}>思考⋯</div>}
              </div>
            );
          })}
        </div>

        {/* ── Board ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, justifyContent: "center", padding: "0 2px" }}>
          {SUITS.map(s => {
            const isR = s === "♥" || s === "♦";
            const slots = getSlots(s);
            return (
              <div key={s} style={{
                display: "flex", alignItems: "center", gap: 2, padding: "4px 6px",
                background: "rgba(0,0,0,.12)", borderRadius: 8,
                border: "1px solid rgba(255,255,255,.03)"
              }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center", color: isR ? "#b71c1c" : "#c8cdd5", flexShrink: 0 }}>{s}</span>
                <div style={{ display: "flex", gap: 1, flex: 1, justifyContent: "center" }}>
                  {S7_RANKS.map(r => {
                    const placed = bd[s].includes(r);
                    const isSlot = !placed && slots.includes(r);
                    const isCenter = r === "7";
                    const isLast = lastPlayed && lastPlayed.rank === r && lastPlayed.suit === s;
                    return (
                      <div key={r} style={{
                        width: 26, height: 32, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, fontFamily: "'Playfair Display',serif",
                        transition: "all .3s",
                        background: placed
                          ? (isLast ? "rgba(212,175,55,.15)" : "rgba(255,255,255,.1)")
                          : isSlot && myTurn ? "rgba(212,175,55,.06)" : "rgba(0,0,0,.1)",
                        border: placed
                          ? (isLast ? "1.5px solid rgba(212,175,55,.4)" : "1px solid rgba(255,255,255,.08)")
                          : isSlot && myTurn ? "1px dashed rgba(212,175,55,.25)" : "1px solid rgba(255,255,255,.02)",
                        color: placed ? (isR ? "#e85d75" : "#e8e4da") : isSlot && myTurn ? "rgba(212,175,55,.3)" : "rgba(255,255,255,.04)",
                        boxShadow: isLast ? "0 0 8px rgba(212,175,55,.2)" : "none",
                        animation: isLast ? "pi .3s" : ""
                      }}>
                        {placed ? r : (isSlot && myTurn ? r : (isCenter ? "·" : ""))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Message & Hint ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "2px 0", flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: myTurn ? "#d4af37" : "rgba(232,228,218,.3)" }}>{msg}</span>
          {myTurn && mp.length > 0 && (
            <button onClick={() => setShowHint(!showHint)} style={{
              padding: "2px 10px", borderRadius: 10, fontSize: 9, cursor: "pointer",
              background: showHint ? "rgba(78,205,196,.1)" : "rgba(212,175,55,.06)",
              border: showHint ? "1px solid rgba(78,205,196,.25)" : "1px solid rgba(212,175,55,.12)",
              color: showHint ? "#4ecdc4" : "rgba(212,175,55,.5)"
            }}>
              {showHint ? "隱藏提示" : " 提示"}
            </button>
          )}
        </div>

        {/* ── Hint display ── */}
        {showHint && mp.length > 0 && (
          <div style={{
            display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", padding: "4px 8px",
            background: "rgba(78,205,196,.04)", borderRadius: 8, border: "1px solid rgba(78,205,196,.1)",
            animation: "fi .3s", flexShrink: 0
          }}>
            <span style={{ fontSize: 9, color: "rgba(78,205,196,.5)", alignSelf: "center" }}>可出：</span>
            {mp.map(c => {
              const isR = c.suit === "♥" || c.suit === "♦";
              return (
                <span key={c.id} onClick={() => place(c)} style={{
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: "rgba(78,205,196,.08)", border: "1px solid rgba(78,205,196,.2)",
                  color: isR ? "#e85d75" : "#e8e4da", fontFamily: "'Playfair Display',serif",
                  transition: "all .2s"
                }}>
                  {c.rank}{c.suit}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Log ── */}
        <div ref={logRef} style={{
          maxHeight: 48, overflowY: "auto", padding: "3px 8px",
          background: "rgba(0,0,0,.15)", borderRadius: 6, flexShrink: 0
        }}>
          {logs.map((l, i) => (
            <span key={l.t + "" + i} style={{ fontSize: 8, color: "rgba(232,228,218,.25)", marginRight: 8 }}>{l.m}</span>
          ))}
        </div>
      </div>

      {/* ── Hand with highlights ── */}
      <HandArea
        cards={(hs[0] || []).map(c => ({ ...c, _playable: myTurn && mp.some(x => x.id === c.id) }))}
        selected={[]}
        onToggle={(c) => {
          if (c && mp.some(x => x.id === c.id)) place(c);
          else if (c && myTurn && !mp.some(x => x.id === c.id)) setMsg("這張牌目前無法放置");
        }}
        disabled={!myTurn}
        canPlay={false}
        canPass={myTurn && !mp.length}
        onPass={passT}
        status={myTurn
          ? (mp.length > 0
            ? "你的回合 · " + mp.length + "張可出（金色高亮）"
            : "沒有可放的牌 · 請按 PASS (" + pC[0] + "/3)")
          : "等待中⋯"}
        extra={
          myTurn && (
            <span style={{
              display: "flex", gap: 3, alignSelf: "center"
            }}>
              {/* Your PASS dots */}
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: j < pC[0] ? "#e85d75" : "rgba(255,255,255,.06)",
                  border: "1px solid " + (j < pC[0] ? "rgba(232,76,61,.3)" : "rgba(255,255,255,.06)")
                }} />
              ))}
            </span>
          )
        }
      />
    </TableBG>
  );
}

/* ══════════ TEXAS HOLD'EM ══════════ */
function TexasGame({ onBack }) {
  const [ph, setPh] = useState("intro"); const [dk, setDK] = useState([]); const [pC, setPC] = useState([]); const [dC, setDC] = useState([]);
  const [cm, setCm] = useState([]); const [pot, setPot] = useState(0); const [ch, setCh] = useState(1000); const [stg, setStg] = useState("pre");
  const [msg, setMsg] = useState(""); const [fw, setFw] = useState(0); const [bt, setBt] = useState(20);
  const bH = (cs) => { let b = 0; cs.forEach(c => { const v = { A: 14, K: 13, Q: 12, J: 11 }[c.rank] || +c.rank; if (v > b) b = v; }); return b; };
  const deal = () => { const d = shuffle(mkDeck()); setPC([d[0], d[1]]); setDC([d[2], d[3]]); setCm([]); setDK(d.slice(4)); setPot(bt * 2); setCh(c => c - bt); setStg("pre"); setMsg(""); setPh("play"); };
  const adv = () => { if (stg === "pre") { setCm([dk[0], dk[1], dk[2]]); setDK(d => d.slice(3)); setStg("flop"); }
    else if (stg === "flop") { setCm(c => [...c, dk[0]]); setDK(d => d.slice(1)); setStg("turn"); }
    else if (stg === "turn") { setCm(c => [...c, dk[0]]); setDK(d => d.slice(1)); setStg("river"); }
    else sd(); };
  const raise = () => { setPot(p => p + bt); setCh(c => c - bt); adv(); };
  const fold = () => { setMsg("棄牌"); setPh("result"); };
  const sd = () => { const pv = bH([...pC, ...cm]), dv = bH([...dC, ...cm]);
    if (pv >= dv) { setMsg("你贏了！"); setCh(c => c + pot); setFw(f => f + 1); } else setMsg("莊家贏"); setPh("result"); };

  if (ph === "intro") {
    return (
      <TableBG>
        <TopBar title="德州撲克" onBack={onBack} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, animation: "su .5s" }}>
          <div style={{ fontSize: 48 }}></div>
          <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>德州撲克</h2>
          <p style={{ fontSize: 11, color: "rgba(232,228,218,.3)", textAlign: "center", maxWidth: 260, lineHeight: 1.8 }}>簡化版德州撲克，你 vs 莊家</p>
          <div style={{ display: "flex", gap: 6 }}>
            {[10, 20, 50].map(b => <button key={b} onClick={() => setBt(b)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: "'Playfair Display'", background: bt === b ? "rgba(212,175,55,.08)" : "rgba(255,255,255,.02)", border: bt === b ? "1.5px solid rgba(212,175,55,.3)" : "1px solid rgba(255,255,255,.04)", color: bt === b ? "#d4af37" : "rgba(232,228,218,.3)", cursor: "pointer" }}>${b}</button>)}
          </div>
          <GoldBtn onClick={deal}>發牌</GoldBtn>
        </div>
      </TableBG>
    );
  }
  if (ph === "result") {
    return (
      <TableBG>
        <TopBar title="德州撲克" onBack={onBack} />
        <Fireworks active={fw} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, animation: "su .5s" }}>
          <div style={{ fontSize: 10, color: "rgba(232,228,218,.3)" }}>莊家</div>
          <div style={{ display: "flex", gap: 4 }}>{dC.map((c, i) => <div key={c.id} style={{ animation: "fl .3s " + (i * .1) + "s both" }}><Card card={c} small /></div>)}</div>
          <div style={{ display: "flex", gap: 4 }}>{cm.map(c => <Card key={c.id} card={c} small disabled />)}</div>
          <div style={{ display: "flex", gap: 4 }}>{pC.map(c => <Card key={c.id} card={c} small disabled />)}</div>
          <div style={{ fontSize: 10, color: "rgba(212,175,55,.5)" }}>你</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Playfair Display'", color: msg.includes("贏") ? "#4ecdc4" : "#e85d75" }}>{msg}</h3>
          <div style={{ fontSize: 12, color: "#d4af37" }}>籌碼: ${ch}</div>
          <div style={{ display: "flex", gap: 8 }}><GoldBtn onClick={deal} sm>再來</GoldBtn><SecBtn onClick={onBack}>返回</SecBtn></div>
        </div>
      </TableBG>
    );
  }
  return (
    <TableBG>
      <TopBar title="德州撲克" onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ position: "absolute", top: 48, right: 14, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,.25)", border: "1px solid rgba(212,175,55,.06)" }}>
          <div style={{ fontSize: 7, color: "rgba(212,175,55,.3)" }}>籌碼</div>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>${ch}</div>
        </div>
        <div style={{ position: "absolute", top: 48, left: 14, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,.25)", border: "1px solid rgba(212,175,55,.06)" }}>
          <div style={{ fontSize: 7, color: "rgba(212,175,55,.3)" }}>獎池</div>
          <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#4ecdc4" }}>${pot}</div>
        </div>
        <div style={{ fontSize: 10, color: "rgba(232,228,218,.3)" }}>莊家</div>
        <div style={{ display: "flex", gap: 4 }}>{dC.map(c => <Card key={c.id} card={c} faceDown small disabled />)}</div>
        <div style={{ display: "flex", gap: 5, padding: "10px 16px", borderRadius: 14, background: "rgba(0,0,0,.15)", border: "1px solid rgba(212,175,55,.04)", minWidth: 160, justifyContent: "center" }}>
          {cm.length ? cm.map((c, i) => <div key={c.id} style={{ animation: "dc .3s " + (i * .08) + "s both" }}><Card card={c} small disabled /></div>)
            : <span style={{ fontSize: 10, color: "rgba(232,228,218,.08)", letterSpacing: 2 }}>公共牌</span>}
        </div>
        <div style={{ display: "flex", gap: 5 }}>{pC.map((c, i) => <div key={c.id} style={{ animation: "dc .3s " + (i * .08) + "s both" }}><Card card={c} disabled /></div>)}</div>
        <div style={{ fontSize: 10, color: "rgba(212,175,55,.5)" }}>你</div>
        <div style={{ display: "flex", gap: 8 }}>
          <GoldBtn onClick={raise} sm>加注 ${bt}</GoldBtn>
          <SecBtn onClick={adv}>{stg === "river" ? "攤牌" : "過牌"}</SecBtn>
          <SecBtn onClick={fold}>棄牌</SecBtn>
        </div>
        <div style={{ fontSize: 9, color: "rgba(232,228,218,.15)" }}>{({ pre: "翻牌前", flop: "翻牌", turn: "轉牌", river: "河牌" })[stg]}</div>
      </div>
    </TableBG>
  );
}

/* ══════════ DOU DI ZHU (Complete Rules) ══════════ */
/* 牌型: 單張, 對子, 三條, 三帶一, 三帶二, 順子(5+), 連對(3+對), 飛機, 飛機帶翅膀, 四帶二, 炸彈, 火箭 */
const DDZ_NAMES = {
  single: "單張", pair: "對子", triple: "三條", triple1: "三帶一", triple2: "三帶二",
  straight: "順子", straight_pair: "連對", plane: "飛機", plane1: "飛機帶單", plane2: "飛機帶對",
  four2: "四帶二", bomb: "炸彈", rocket: "火箭"
};
const DDZ_POWER = { single: 0, pair: 0, triple: 0, triple1: 0, triple2: 0, straight: 0, straight_pair: 0, plane: 0, plane1: 0, plane2: 0, four2: 0, bomb: 10, rocket: 20 };

function ddzValue(r) {
  return { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14, 2: 15, JK: 16 }[r] || 0;
}
function ddzSortCards(c) { return [...c].sort((a, b) => ddzValue(a.rank) - ddzValue(b.rank)); }

function ddzGetCombo(cards) {
  if (!cards || !cards.length) return null;
  const n = cards.length;
  const sorted = ddzSortCards(cards);
  const cnt = {};
  cards.forEach(c => { cnt[c.rank] = (cnt[c.rank] || 0) + 1; });
  const ranks = Object.keys(cnt);
  const counts = Object.values(cnt);

  // Rocket: both jokers
  if (n === 2 && cards.every(c => c.isJoker)) return { t: "rocket", v: 99, main: 99 };

  // Bomb: 4 of same rank
  if (n === 4 && counts[0] === 4) return { t: "bomb", v: ddzValue(ranks[0]), main: ddzValue(ranks[0]) };

  // Single
  if (n === 1) return { t: "single", v: ddzValue(cards[0].rank), main: ddzValue(cards[0].rank) };

  // Pair
  if (n === 2 && counts.length === 1 && counts[0] === 2) return { t: "pair", v: ddzValue(ranks[0]), main: ddzValue(ranks[0]) };

  // Triple
  if (n === 3 && counts.length === 1 && counts[0] === 3) return { t: "triple", v: ddzValue(ranks[0]), main: ddzValue(ranks[0]) };

  // Triple+1
  if (n === 4 && counts.length === 2) {
    const tripleR = ranks.find(r => cnt[r] === 3);
    if (tripleR && cnt[ranks.find(r => r !== tripleR)] === 1) {
      return { t: "triple1", v: ddzValue(tripleR), main: ddzValue(tripleR) };
    }
  }

  // Triple+pair
  if (n === 5 && counts.length === 2) {
    const tripleR = ranks.find(r => cnt[r] === 3);
    const pairR = ranks.find(r => cnt[r] === 2);
    if (tripleR && pairR) {
      return { t: "triple2", v: ddzValue(tripleR), main: ddzValue(tripleR) };
    }
  }

  // Four+2 singles
  if (n === 6 && ranks.some(r => cnt[r] === 4)) {
    const fourR = ranks.find(r => cnt[r] === 4);
    return { t: "four2", v: ddzValue(fourR), main: ddzValue(fourR) };
  }

  // Straight: 5+ consecutive singles, no 2 or jokers
  if (n >= 5 && counts.every(c => c === 1)) {
    const vals = sorted.map(c => ddzValue(c.rank));
    if (!cards.some(c => c.rank === "2" || c.isJoker)) {
      let isStraight = true;
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] - vals[i - 1] !== 1) { isStraight = false; break; }
      }
      if (isStraight) return { t: "straight", v: vals[vals.length - 1], main: vals[vals.length - 1], len: n };
    }
  }

  // Consecutive pairs: 3+ consecutive pairs, no 2 or jokers
  if (n >= 6 && n % 2 === 0 && counts.every(c => c === 2)) {
    const pairVals = ranks.map(r => ddzValue(r)).sort((a, b) => a - b);
    if (!cards.some(c => c.rank === "2" || c.isJoker) && pairVals.length >= 3) {
      let isConsec = true;
      for (let i = 1; i < pairVals.length; i++) {
        if (pairVals[i] - pairVals[i - 1] !== 1) { isConsec = false; break; }
      }
      if (isConsec) return { t: "straight_pair", v: pairVals[pairVals.length - 1], main: pairVals[pairVals.length - 1], len: n };
    }
  }

  // Plane (consecutive triples): 2+ consecutive triples, no 2 or jokers
  const tripleRanks = ranks.filter(r => cnt[r] === 3).map(r => ddzValue(r)).sort((a, b) => a - b);
  if (tripleRanks.length >= 2) {
    // Find longest consecutive triple run
    let bestRun = []; let curRun = [tripleRanks[0]];
    for (let i = 1; i < tripleRanks.length; i++) {
      if (tripleRanks[i] - tripleRanks[i - 1] === 1 && tripleRanks[i] <= 14) {
        curRun.push(tripleRanks[i]);
      } else {
        if (curRun.length > bestRun.length) bestRun = curRun;
        curRun = [tripleRanks[i]];
      }
    }
    if (curRun.length > bestRun.length) bestRun = curRun;

    if (bestRun.length >= 2) {
      const planeSize = bestRun.length * 3;
      const remaining = n - planeSize;
      if (remaining === 0) {
        return { t: "plane", v: bestRun[bestRun.length - 1], main: bestRun[bestRun.length - 1], len: bestRun.length };
      }
      // Plane + single wings
      if (remaining === bestRun.length) {
        return { t: "plane1", v: bestRun[bestRun.length - 1], main: bestRun[bestRun.length - 1], len: bestRun.length };
      }
      // Plane + pair wings
      if (remaining === bestRun.length * 2) {
        const nonTriple = ranks.filter(r => cnt[r] !== 3 || !bestRun.includes(ddzValue(r)));
        const pairWings = nonTriple.filter(r => cnt[r] >= 2);
        if (pairWings.length >= bestRun.length) {
          return { t: "plane2", v: bestRun[bestRun.length - 1], main: bestRun[bestRun.length - 1], len: bestRun.length };
        }
      }
    }
  }

  return null;
}

function ddzCanBeat(played, current) {
  const pc = ddzGetCombo(played);
  const cc = ddzGetCombo(current);
  if (!pc || !cc) return false;
  // Rocket beats everything
  if (pc.t === "rocket") return true;
  // Bomb beats non-bomb/non-rocket
  if (pc.t === "bomb" && DDZ_POWER[cc.t] < 10) return true;
  // Bomb vs bomb
  if (pc.t === "bomb" && cc.t === "bomb") return pc.v > cc.v;
  // Same type, same length
  if (pc.t !== cc.t) return false;
  if (played.length !== current.length) return false;
  // For straights/consecutive pairs/planes, must be same length
  if (pc.len !== undefined && cc.len !== undefined && pc.len !== cc.len) return false;
  return pc.v > cc.v;
}

// AI for DDZ - find all possible plays that beat current
function ddzAiFindPlays(hand, current) {
  const results = [];
  const cnt = {};
  hand.forEach(c => { cnt[c.rank] = (cnt[c.rank] || 0) + 1; });
  const sorted = ddzSortCards(hand);
  const cc = current ? ddzGetCombo(current) : null;

  // Helper: get cards of specific rank
  const getCards = (rank, count) => {
    return hand.filter(c => c.rank === rank).slice(0, count);
  };

  if (!cc) {
    // Free play - generate all possible combos, play smallest
    // Singles
    sorted.forEach(c => results.push([c]));
    // Pairs
    Object.keys(cnt).filter(r => cnt[r] >= 2).forEach(r => results.push(getCards(r, 2)));
    // Triples
    Object.keys(cnt).filter(r => cnt[r] >= 3).forEach(r => results.push(getCards(r, 3)));
    // Triple+1
    Object.keys(cnt).filter(r => cnt[r] >= 3).forEach(r => {
      const trip = getCards(r, 3);
      hand.filter(c => c.rank !== r).slice(0, 1).forEach(k => results.push([...trip, k]));
    });
    // Straights (5 cards)
    const vals = [...new Set(sorted.filter(c => !c.isJoker && c.rank !== "2").map(c => ddzValue(c.rank)))].sort((a, b) => a - b);
    for (let len = 5; len <= vals.length; len++) {
      for (let start = 0; start <= vals.length - len; start++) {
        let ok = true;
        for (let i = 1; i < len; i++) { if (vals[start + i] - vals[start + i - 1] !== 1) { ok = false; break; } }
        if (ok) {
          const cs = [];
          for (let i = 0; i < len; i++) {
            const v = vals[start + i];
            const card = hand.find(c => ddzValue(c.rank) === v && !cs.some(x => x.id === c.id));
            if (card) cs.push(card);
          }
          if (cs.length === len) results.push(cs);
        }
      }
    }
    // Bombs
    Object.keys(cnt).filter(r => cnt[r] >= 4).forEach(r => results.push(getCards(r, 4)));
    // Rocket
    const jokers = hand.filter(c => c.isJoker);
    if (jokers.length === 2) results.push(jokers);

    return results.filter(r => ddzGetCombo(r)).sort((a, b) => {
      const ac = ddzGetCombo(a), bc = ddzGetCombo(b);
      if (DDZ_POWER[ac.t] !== DDZ_POWER[bc.t]) return DDZ_POWER[ac.t] - DDZ_POWER[bc.t];
      return ac.v - bc.v;
    });
  }

  // Must beat current
  if (cc.t === "single") {
    sorted.filter(c => ddzValue(c.rank) > cc.v).forEach(c => results.push([c]));
  } else if (cc.t === "pair") {
    Object.keys(cnt).filter(r => cnt[r] >= 2 && ddzValue(r) > cc.v).forEach(r => results.push(getCards(r, 2)));
  } else if (cc.t === "triple") {
    Object.keys(cnt).filter(r => cnt[r] >= 3 && ddzValue(r) > cc.v).forEach(r => results.push(getCards(r, 3)));
  } else if (cc.t === "triple1") {
    Object.keys(cnt).filter(r => cnt[r] >= 3 && ddzValue(r) > cc.v).forEach(r => {
      const trip = getCards(r, 3);
      const kicker = hand.find(c => c.rank !== r);
      if (kicker) results.push([...trip, kicker]);
    });
  } else if (cc.t === "triple2") {
    Object.keys(cnt).filter(r => cnt[r] >= 3 && ddzValue(r) > cc.v).forEach(r => {
      const trip = getCards(r, 3);
      const pairR = Object.keys(cnt).find(r2 => r2 !== r && cnt[r2] >= 2);
      if (pairR) results.push([...trip, ...getCards(pairR, 2)]);
    });
  } else if (cc.t === "straight") {
    const len = current.length;
    const vals = [...new Set(sorted.filter(c => !c.isJoker && c.rank !== "2").map(c => ddzValue(c.rank)))].sort((a, b) => a - b);
    for (let start = 0; start <= vals.length - len; start++) {
      let ok = true;
      for (let i = 1; i < len; i++) { if (vals[start + i] - vals[start + i - 1] !== 1) { ok = false; break; } }
      if (ok && vals[start + len - 1] > cc.v) {
        const cs = [];
        for (let i = 0; i < len; i++) {
          const v = vals[start + i];
          const card = hand.find(c => ddzValue(c.rank) === v && !cs.some(x => x.id === c.id));
          if (card) cs.push(card);
        }
        if (cs.length === len) results.push(cs);
      }
    }
  } else if (cc.t === "straight_pair") {
    const pairCount = current.length / 2;
    const pairRanks = Object.keys(cnt).filter(r => cnt[r] >= 2 && r !== "2" && !hand.find(c => c.rank === r && c.isJoker))
      .map(r => ddzValue(r)).sort((a, b) => a - b);
    for (let start = 0; start <= pairRanks.length - pairCount; start++) {
      let ok = true;
      for (let i = 1; i < pairCount; i++) { if (pairRanks[start + i] - pairRanks[start + i - 1] !== 1) { ok = false; break; } }
      if (ok && pairRanks[start + pairCount - 1] > cc.v) {
        const cs = [];
        for (let i = 0; i < pairCount; i++) {
          const v = pairRanks[start + i];
          const rank = Object.keys(cnt).find(r => ddzValue(r) === v);
          if (rank) cs.push(...getCards(rank, 2));
        }
        if (cs.length === current.length) results.push(cs);
      }
    }
  } else if (cc.t === "four2") {
    Object.keys(cnt).filter(r => cnt[r] >= 4 && ddzValue(r) > cc.v).forEach(r => {
      const four = getCards(r, 4);
      const kickers = hand.filter(c => c.rank !== r).slice(0, 2);
      if (kickers.length === 2) results.push([...four, ...kickers]);
    });
  }

  // Always can play bombs and rockets to beat non-bombs
  if (DDZ_POWER[cc.t] < 10) {
    Object.keys(cnt).filter(r => cnt[r] >= 4).forEach(r => results.push(getCards(r, 4)));
  }
  if (cc.t === "bomb") {
    Object.keys(cnt).filter(r => cnt[r] >= 4 && ddzValue(r) > cc.v).forEach(r => results.push(getCards(r, 4)));
  }
  const jokers = hand.filter(c => c.isJoker);
  if (jokers.length === 2) results.push(jokers);

  return results.filter(r => ddzGetCombo(r) && ddzCanBeat(r, current)).sort((a, b) => {
    const ac = ddzGetCombo(a), bc = ddzGetCombo(b);
    if (DDZ_POWER[ac.t] !== DDZ_POWER[bc.t]) return DDZ_POWER[ac.t] - DDZ_POWER[bc.t];
    return ac.v - bc.v;
  });
}

function DDZGame({ onBack }) {
  const [ph, setPh] = useState("intro");
  const [hs, setHs] = useState([[], [], []]);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState([]);
  const [cp, setCP] = useState(null);
  const [lp, setLP] = useState(-1);
  const [paC, setPaC] = useState(0);
  const [win, setWin] = useState(null);
  const [fw, setFw] = useState(0);
  const [tk, setTK] = useState(false);
  const [msg, setMsg] = useState("");
  const [extra, setExtra] = useState([]);

  const start = () => {
    const d = shuffle(mkDeck(true));
    const h = [ddzSortCards(d.slice(0, 17)), ddzSortCards(d.slice(17, 34)), ddzSortCards(d.slice(34, 51))];
    const ex = d.slice(51);
    setExtra(ex);
    h[0] = ddzSortCards([...h[0], ...ex]);
    setHs(h); setCur(0); setSel([]); setCP(null); setLP(-1); setPaC(0); setWin(null); setMsg("你是地主！先出牌"); setPh("play");
  };

  const toggle = (c) => {
    if (!c) { setSel([]); return; }
    setSel(p => { const i = p.findIndex(x => x.id === c.id); return i >= 0 ? p.filter(x => x.id !== c.id) : [...p, c]; });
  };

  const play = () => {
    if (!sel.length) return;
    const co = ddzGetCombo(sel);
    if (!co) return;
    if (cp && lp !== 0 && !ddzCanBeat(sel, cp)) return;
    const nh = [...hs];
    nh[0] = nh[0].filter(c => !sel.some(s2 => s2.id === c.id));
    setHs(nh); setCP([...sel]); setLP(0); setPaC(0); setSel([]);
    setMsg("出了 " + (DDZ_NAMES[co.t] || co.t));
    if (!nh[0].length) { setWin(0); setFw(f => f + 1); setPh("over"); if(typeof window!=="undefined"&&window.haoGame)window.haoGame.reportScore(fw+1); return; }
    setCur(1);
  };

  const pass = () => {
    if (lp === 0 && cp) return;
    const np = paC + 1;
    if (np >= 2) { setCP(null); setPaC(0); setCur(lp >= 0 ? lp : 1); setMsg("新一輪"); return; }
    setPaC(np); setCur(1); setMsg("你 PASS");
  };

  useEffect(() => {
    if (ph !== "play" || cur === 0 || win !== null) return;
    setTK(true);
    const t = setTimeout(() => {
      const p = cur;
      const h = hs[p];
      const free = !cp || lp === p;
      const plays = ddzAiFindPlays(h, free ? null : cp);
      if (plays.length > 0) {
        const played = plays[0]; // play smallest valid combo
        const co = ddzGetCombo(played);
        const nh = [...hs];
        nh[p] = nh[p].filter(c => !played.some(x => x.id === c.id));
        setHs(nh); setCP([...played]); setLP(p); setPaC(0);
        setMsg(PM[p].n + " " + (DDZ_NAMES[co.t] || "出牌"));
        if (!nh[p].length) { setWin(p === 0 ? 0 : p); setPh("over"); setTK(false); return; }
      } else {
        const np = paC + 1;
        setMsg(PM[p].n + " PASS");
        if (np >= 2) { setCP(null); setPaC(0); setCur(lp >= 0 ? lp : (p + 1) % 3); setTK(false); return; }
        setPaC(np);
      }
      setCur((p + 1) % 3); setTK(false);
    }, 750 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [cur, ph, win]);

  const myTurn = cur === 0 && ph === "play" && !win;
  const co = ddzGetCombo(sel);
  const fp = !cp || lp === 0;
  const cP = myTurn && co && (fp || ddzCanBeat(sel, cp));
  const cPa = myTurn && cp && lp !== 0;

  if (ph === "intro") {
    return (
      <TableBG>
        <TopBar title="鬥地主" onBack={onBack} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, animation: "su .5s" }}>
          <div style={{ fontSize: 48 }}></div>
          <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display'", color: "#d4af37" }}>鬥地主</h2>
          <p style={{ fontSize: 11, color: "rgba(232,228,218,.3)", textAlign: "center", maxWidth: 280, lineHeight: 1.8 }}>
            你是地主對抗農民！完整規則：單張、對子、三條、三帶一、三帶二、順子、連對、飛機、四帶二、炸彈、火箭
          </p>
          <GoldBtn onClick={start}>開始</GoldBtn>
        </div>
      </TableBG>
    );
  }
  if (ph === "over") {
    return (
      <WinScreen won={win === 0} msg={win === 0 ? "地主勝利！" : "農民勝利！"} onAgain={start} onBack={onBack} fwt={fw} />
    );
  }
  return (
    <TableBG>
      <TopBar title="鬥地主" onBack={onBack} />
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ position: "absolute", left: "10%", right: "10%", top: "8%", bottom: "5%", borderRadius: "50%", pointerEvents: "none", border: "2px solid rgba(212,175,55,.04)", boxShadow: "inset 0 0 60px rgba(0,0,0,.2)", background: "radial-gradient(ellipse,rgba(26,74,48,.2),transparent 70%)" }} />
        {/* Bottom cards (地主牌) */}
        <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 12, display: "flex", gap: 3 }}>
          {extra.map(c => (
            <div key={c.id} style={{ opacity: 0.6 }}>
              <Card card={c} disabled style={{ width: 28, height: 40, borderRadius: 3 }} />
            </div>
          ))}
          <span style={{ fontSize: 8, color: "rgba(212,175,55,.3)", alignSelf: "center", marginLeft: 4 }}>地主牌</span>
        </div>
        {[1, 2].map(i => {
          const act = cur === i;
          const sty = i === 1 ? { position: "absolute", left: 6, top: "42%", transform: "translateY(-50%)" } : { position: "absolute", right: 6, top: "42%", transform: "translateY(-50%)" };
          return (
            <div key={i} style={{ ...sty, zIndex: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: 10, background: act ? "rgba(212,175,55,.05)" : "rgba(0,0,0,.2)", border: act ? "1px solid rgba(212,175,55,.18)" : "1px solid rgba(255,255,255,.02)", animation: act ? "br 2s infinite" : "none", minWidth: 60 }}>
                <span style={{ fontSize: 13 }}>{PM[i].a}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: act ? "#d4af37" : "rgba(232,228,218,.35)" }}>{PM[i].n}</span>
                <span style={{ fontSize: 7, color: "rgba(232,228,218,.2)" }}>{(hs[i] || []).length}張·農民</span>
                {act && tk && <span style={{ fontSize: 7, color: "#d4af37", animation: "pu 1.2s ease-in-out infinite" }}>⋯</span>}
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", zIndex: 5, textAlign: "center", minWidth: 180 }}>
          {cp ? (
            <div style={{ animation: "pi .35s cubic-bezier(.34,1.56,.64,1)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 16, marginBottom: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(212,175,55,.12)", backdropFilter: "blur(4px)" }}>
                {ddzGetCombo(cp) && (
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: "linear-gradient(135deg,rgba(212,175,55,.15),rgba(212,175,55,.08))", color: "#f2d06b", fontWeight: 700, letterSpacing: 1 }}>{DDZ_NAMES[ddzGetCombo(cp).t]}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", maxWidth: 300 }}>
                {cp.map((c, i) => (
                  <div key={c.id} style={{ animation: "dc .35s cubic-bezier(.34,1.56,.64,1) " + (i * .05) + "s both" }}>
                    <Card card={c} small disabled />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px 32px", borderRadius: 28, border: "1.5px dashed rgba(212,175,55,.06)", color: "rgba(212,175,55,.12)", fontSize: 11, letterSpacing: 3, animation: "fi .5s" }}>自由出牌</div>
          )}
          <div style={{ marginTop: 8, fontSize: 10, color: "rgba(232,228,218,.3)", transition: "all .3s", animation: "fi .3s" }}>{msg}</div>
        </div>
      </div>
      <HandArea cards={hs[0] || []} selected={sel} onToggle={toggle} disabled={!myTurn} onPlay={play} onPass={pass} canPlay={cP} canPass={cPa}
        status={myTurn ? ("你的回合 " + (co ? " · " + DDZ_NAMES[co.t] + (cP ? " " : " ") : "")) : "等待中"} />
    </TableBG>
  );
}

/* ══════════ GAME HUB ══════════ */
const GAMES = [
  { id: "b2", n: "大老二", s: "Big Two", i: "", d: "經典撲克，比大小出牌", c: "#d4af37" },
  { id: "bj", n: "21點", s: "Blackjack", i: "", d: "挑戰莊家，不要爆牌", c: "#e85d75" },
  { id: "om", n: "抽鬼牌", s: "Old Maid", i: "", d: "配對消牌，避開鬼牌", c: "#9b59b6" },
  { id: "s7", n: "排七", s: "Sevens", i: "7⃣", d: "從7延伸，提示可出牌", c: "#4ecdc4" },
  { id: "tx", n: "德州撲克", s: "Hold'em", i: "", d: "下注博弈，五張定輸贏", c: "#f39c12" },
  { id: "dz", n: "鬥地主", s: "Dou Di Zhu", i: "", d: "完整規則：順子連對飛機炸彈", c: "#e74c3c" },
];

export default function App() {
  const [game, setGame] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const goToGame = (id) => {
    setTransitioning(true);
    setTimeout(() => { setGame(id); setTransitioning(false); }, 250);
  };
  const goBack = () => {
    setTransitioning(true);
    setTimeout(() => { setGame(null); setTransitioning(false); }, 200);
  };

  if (game === "b2") return <div style={{ animation: "screenFade .3s" }}><BigTwoGame onBack={goBack} /></div>;
  if (game === "bj") return <div style={{ animation: "screenFade .3s" }}><BlackjackGame onBack={goBack} /></div>;
  if (game === "om") return <div style={{ animation: "screenFade .3s" }}><OldMaidGame onBack={goBack} /></div>;
  if (game === "s7") return <div style={{ animation: "screenFade .3s" }}><SevensGame onBack={goBack} /></div>;
  if (game === "tx") return <div style={{ animation: "screenFade .3s" }}><TexasGame onBack={goBack} /></div>;
  if (game === "dz") return <div style={{ animation: "screenFade .3s" }}><DDZGame onBack={goBack} /></div>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 20%,#1a3a2a,#0d1f16 40%,#060e09)",
      fontFamily: "'Noto Sans TC',sans-serif", color: "#e8e4da",
      position: "relative", overflow: "hidden",
      opacity: transitioning ? 0 : 1, transition: "opacity .25s"
    }}>
      <style>{CSS}</style>
      {/* Felt */}
      <div style={{ position: "absolute", inset: 0, opacity: .06, background: "repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,.04) 1px,rgba(0,0,0,.04) 2px),repeating-linear-gradient(90deg,transparent,transparent 1px,rgba(0,0,0,.04) 1px,rgba(0,0,0,.04) 2px)", pointerEvents: "none" }} />
      {/* Gold border */}
      <div style={{ position: "absolute", inset: 24, border: "1px solid rgba(212,175,55,.04)", borderRadius: 24, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(212,175,55,.02)", borderRadius: 22, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "44px 16px 36px", maxWidth: 460, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36, animation: "su .7s cubic-bezier(.25,.1,.25,1)" }}>
          <div style={{ fontSize: 8, letterSpacing: 7, color: "rgba(212,175,55,.2)", textTransform: "uppercase", marginBottom: 8 }}>HAO0321 ©Studio presents</div>
          <h1 style={{
            fontSize: 44, fontWeight: 900, fontFamily: "'Playfair Display',serif",
            background: "linear-gradient(135deg,#d4af37,#f2d06b,#d4af37,#f2d06b)",
            backgroundSize: "300% auto", animation: "sn 5s linear infinite",
            backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
            lineHeight: 1.1, letterSpacing: 5, marginBottom: 6
          }}>撲克遊戲廳</h1>
          <div style={{ fontSize: 11, color: "rgba(232,228,218,.15)", letterSpacing: 5, fontStyle: "italic" }}>Card Game Collection</div>
        </div>

        {/* Game Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {GAMES.map((g, i) => (
            <button key={g.id} onClick={() => goToGame(g.id)}
              style={{
                padding: "20px 16px", borderRadius: 16, cursor: "pointer", textAlign: "left",
                position: "relative", overflow: "hidden",
                background: "rgba(255,255,255,.02)",
                border: "1px solid rgba(255,255,255,.04)",
                transition: "all .35s cubic-bezier(.25,.1,.25,1)",
                animation: "su .5s cubic-bezier(.25,.1,.25,1) " + (i * .08) + "s both"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(212,175,55,.05)";
                e.currentTarget.style.borderColor = "rgba(212,175,55,.15)";
                e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,.3)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,.02)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,.04)";
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}>
              {/* Decorative glow */}
              <div style={{ position: "absolute", top: -20, right: -20, width: 60, height: 60, borderRadius: "50%", background: g.c, opacity: .03, filter: "blur(20px)", pointerEvents: "none" }} />
              <div style={{ fontSize: 28, marginBottom: 8, transition: "transform .3s" }}>{g.i}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: g.c, marginBottom: 3, fontFamily: "'Playfair Display'", letterSpacing: 1 }}>{g.n}</div>
              <div style={{ fontSize: 8, color: "rgba(232,228,218,.18)", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{g.s}</div>
              <div style={{ fontSize: 10, color: "rgba(232,228,218,.3)", lineHeight: 1.6 }}>{g.d}</div>
              {/* Corner dot */}
              <div style={{ position: "absolute", top: 12, right: 12, width: 5, height: 5, borderRadius: "50%", background: g.c, opacity: .25 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 36, display: "flex", justifyContent: "center", gap: 12, animation: "su .5s .6s both" }}>
          {["♠", "♥", "♣", "♦"].map((s, i) => (
            <span key={s} style={{
              fontSize: 14, opacity: .08,
              color: s === "♥" || s === "♦" ? "#e85d75" : "#c8cdd5",
              animation: "bob 3s ease-in-out " + (i * .5) + "s infinite"
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
