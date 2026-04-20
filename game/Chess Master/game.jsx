import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// ============================================================
// CONSTANTS & UTILITIES
// ============================================================
const COLORS = {
  bg: '#0a0a0f', bgCard: '#14141f', bgHover: '#1a1a2e',
  surface: '#1e1e30', surfaceLight: '#252540',
  gold: '#c9a84c', goldLight: '#e8d48b', goldDim: '#8a7430',
  red: '#c44040', redLight: '#e06060', blue: '#4060c4',
  text: '#e8e4d8', textDim: '#8a8678', textMuted: '#5a5850',
  green: '#40a060', border: '#2a2a40', white: '#f0ece0', black: '#1a1a1a',
};

const font = `'Noto Serif TC', 'Source Han Serif TC', serif`;
const fontSans = `'Noto Sans TC', 'Source Han Sans TC', sans-serif`;

// ============================================================
// GAME DEFINITIONS
// ============================================================
const GAMES = [
  { id:'xiangqi', name:'象棋', sub:'Chinese Chess', icon:'车', cat:'棋', desc:'楚河漢界，將帥對弈' },
  { id:'darkchess', name:'暗棋', sub:'Dark Chess', icon:'暗', cat:'棋', desc:'翻棋博弈，策略為先' },
  { id:'go', name:'圍棋', sub:'Go / Weiqi', icon:'棋', cat:'棋', desc:'黑白縱橫，圍地為王' },
  { id:'gomoku', name:'五子棋', sub:'Gomoku', icon:'五', cat:'棋', desc:'五子連珠，先手制勝' },
  { id:'flight', name:'飛行棋', sub:'Aeroplane Chess', icon:'飛', cat:'棋', desc:'擲骰前進，安全到家' },
  { id:'checkers', name:'跳棋', sub:'Chinese Checkers', icon:'跳', cat:'棋', desc:'跳躍前行，搶占對角' },
  { id:'jpmahjong', name:'日式麻將', sub:'Riichi Mahjong', icon:'雀', cat:'牌', desc:'立直一發，役滿和了' },
  { id:'twmahjong', name:'台式麻將', sub:'Taiwanese Mahjong', icon:'麻', cat:'牌', desc:'十六張，台灣玩法' },
];

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Btn({ children, onClick, active, disabled, style, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 14px' : '10px 22px',
      background: active ? COLORS.gold : 'transparent',
      color: active ? COLORS.bg : COLORS.text,
      border: `1px solid ${active ? COLORS.gold : COLORS.border}`,
      borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
      fontFamily: fontSans, fontSize: small ? 12 : 14,
      opacity: disabled ? 0.4 : 1, transition: 'all 0.2s',
      ...style,
    }}>{children}</button>
  );
}

function GameShell({ title, sub, onBack, children, sidebar }) {
  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, color:COLORS.text, fontFamily:fontSans }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom:`1px solid ${COLORS.border}`, background:COLORS.bgCard }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:COLORS.gold, cursor:'pointer', fontSize:20, marginRight:16, fontFamily:font }}>←</button>
        <div>
          <div style={{ fontSize:20, fontFamily:font, color:COLORS.gold }}>{title}</div>
          <div style={{ fontSize:12, color:COLORS.textDim }}>{sub}</div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:24, padding:24, flexWrap:'wrap' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>{children}</div>
        {sidebar && <div style={{ minWidth:200 }}>{sidebar}</div>}
      </div>
    </div>
  );
}

function StatusBar({ text, style }) {
  return <div style={{ padding:'10px 20px', background:COLORS.surface, borderRadius:8, marginBottom:16, fontSize:14, color:COLORS.goldLight, textAlign:'center', fontFamily:font, ...style }}>{text}</div>;
}

function ScrollBoard({ children, style }) {
  return (
    <div style={{ overflow:'auto', WebkitOverflowScrolling:'touch', maxWidth:'100vw', maxHeight:'80vh', touchAction:'pan-x pan-y', ...style }}>
      {children}
    </div>
  );
}

// ============================================================
// 1. XIANGQI (Chinese Chess)
// ============================================================
const XQ_INIT = () => {
  const b = Array(10).fill(null).map(() => Array(9).fill(null));
  const set = (r,c,p) => { b[r][c] = p; };
  // Red (bottom)
  set(9,0,{t:'车',c:'r'}); set(9,8,{t:'车',c:'r'});
  set(9,1,{t:'马',c:'r'}); set(9,7,{t:'马',c:'r'});
  set(9,2,{t:'相',c:'r'}); set(9,6,{t:'相',c:'r'});
  set(9,3,{t:'仕',c:'r'}); set(9,5,{t:'仕',c:'r'});
  set(9,4,{t:'帅',c:'r'});
  set(7,1,{t:'炮',c:'r'}); set(7,7,{t:'炮',c:'r'});
  set(6,0,{t:'兵',c:'r'}); set(6,2,{t:'兵',c:'r'}); set(6,4,{t:'兵',c:'r'}); set(6,6,{t:'兵',c:'r'}); set(6,8,{t:'兵',c:'r'});
  // Black (top)
  set(0,0,{t:'车',c:'b'}); set(0,8,{t:'车',c:'b'});
  set(0,1,{t:'马',c:'b'}); set(0,7,{t:'马',c:'b'});
  set(0,2,{t:'象',c:'b'}); set(0,6,{t:'象',c:'b'});
  set(0,3,{t:'士',c:'b'}); set(0,5,{t:'士',c:'b'});
  set(0,4,{t:'将',c:'b'});
  set(2,1,{t:'炮',c:'b'}); set(2,7,{t:'炮',c:'b'});
  set(3,0,{t:'卒',c:'b'}); set(3,2,{t:'卒',c:'b'}); set(3,4,{t:'卒',c:'b'}); set(3,6,{t:'卒',c:'b'}); set(3,8,{t:'卒',c:'b'});
  return b;
};

function xqMoves(board, r, c) {
  const p = board[r][c]; if (!p) return [];
  const moves = [];
  const inBoard = (rr,cc) => rr>=0 && rr<10 && cc>=0 && cc<9;
  const canMove = (rr,cc) => inBoard(rr,cc) && (!board[rr][cc] || board[rr][cc].c !== p.c);
  const empty = (rr,cc) => inBoard(rr,cc) && !board[rr][cc];

  if (p.t==='车') {
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      for (let i=1; i<10; i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (!inBoard(nr,nc)) break;
        if (!board[nr][nc]) moves.push([nr,nc]);
        else { if (board[nr][nc].c!==p.c) moves.push([nr,nc]); break; }
      }
    }
  } else if (p.t==='马') {
    for (const [dr,dc,br,bc] of [[2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0],[1,2,0,1],[1,-2,0,-1],[-1,2,0,1],[-1,-2,0,-1]]) {
      if (empty(r+br,c+bc) && canMove(r+dr,c+dc)) moves.push([r+dr,c+dc]);
    }
  } else if (p.t==='相'||p.t==='象') {
    const half = p.c==='r' ? [5,9] : [0,4];
    for (const [dr,dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
      const nr=r+dr, nc=c+dc;
      if (inBoard(nr,nc) && nr>=half[0] && nr<=half[1] && empty(r+dr/2,c+dc/2) && canMove(nr,nc)) moves.push([nr,nc]);
    }
  } else if (p.t==='仕'||p.t==='士') {
    const rr = p.c==='r' ? [7,9] : [0,2];
    for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=rr[0]&&nr<=rr[1]&&nc>=3&&nc<=5&&canMove(nr,nc)) moves.push([nr,nc]);
    }
  } else if (p.t==='帅'||p.t==='将') {
    const rr = p.c==='r' ? [7,9] : [0,2];
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=rr[0]&&nr<=rr[1]&&nc>=3&&nc<=5&&canMove(nr,nc)) moves.push([nr,nc]);
    }
  } else if (p.t==='炮') {
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let jumped = false;
      for (let i=1; i<10; i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (!inBoard(nr,nc)) break;
        if (!jumped) {
          if (!board[nr][nc]) moves.push([nr,nc]);
          else jumped = true;
        } else {
          if (board[nr][nc]) { if (board[nr][nc].c!==p.c) moves.push([nr,nc]); break; }
        }
      }
    }
  } else if (p.t==='兵'||p.t==='卒') {
    if (p.c==='r') {
      if (canMove(r-1,c)) moves.push([r-1,c]);
      if (r<=4) { if(canMove(r,c-1)) moves.push([r,c-1]); if(canMove(r,c+1)) moves.push([r,c+1]); }
    } else {
      if (canMove(r+1,c)) moves.push([r+1,c]);
      if (r>=5) { if(canMove(r,c-1)) moves.push([r,c-1]); if(canMove(r,c+1)) moves.push([r,c+1]); }
    }
  }
  return moves;
}

function XiangqiGame({ onBack }) {
  const [board, setBoard] = useState(XQ_INIT);
  const [sel, setSel] = useState(null);
  const [turn, setTurn] = useState('r');
  const [moves, setMoves] = useState([]);
  const [winner, setWinner] = useState(null);
  const [captured, setCaptured] = useState({ r:[], b:[] });
  const [lastMove, setLastMove] = useState(null);
  const [vsAI, setVsAI] = useState(true);
  const aiRef = useRef(0);
  const boardR = useRef(board); useEffect(()=>{boardR.current=board;},[board]);
  const capR = useRef(captured); useEffect(()=>{capR.current=captured;},[captured]);
  const CS = 38;

  // Check if board has flying general (將帥對面)
  const hasFlyingGeneral = (bd) => {
    let rKing = null, bKing = null;
    for (let r = 0; r < 10; r++) for (let c = 3; c <= 5; c++) {
      if (bd[r][c]?.t === '帅') rKing = [r, c];
      if (bd[r][c]?.t === '将') bKing = [r, c];
    }
    if (!rKing || !bKing || rKing[1] !== bKing[1]) return false;
    for (let r = bKing[0] + 1; r < rKing[0]; r++) {
      if (bd[r][rKing[1]]) return false;
    }
    return true;
  };

  // Get only legal moves (filter out moves that leave king in check)
  const isInCheck = useCallback((bd, side) => {
    // Find king
    const kingT = side==='r'?'帅':'将';
    let kr=-1,kc=-1;
    for(let r=0;r<10;r++) for(let c=0;c<9;c++) if(bd[r][c]?.t===kingT){kr=r;kc=c;}
    if(kr<0) return true; // king missing = in check
    // Can any opponent piece capture the king?
    const opp = side==='r'?'b':'r';
    for(let r=0;r<10;r++) for(let c=0;c<9;c++){
      if(bd[r][c]?.c===opp){
        const ms=xqMoves(bd,r,c);
        if(ms.some(([tr,tc])=>tr===kr&&tc===kc)) return true;
      }
    }
    // Flying general check
    let rK=null,bK=null;
    for(let r=0;r<10;r++) for(let c=3;c<=5;c++){if(bd[r][c]?.t==='帅')rK=[r,c];if(bd[r][c]?.t==='将')bK=[r,c];}
    if(rK&&bK&&rK[1]===bK[1]){
      let blocked=false;
      for(let r=bK[0]+1;r<rK[0];r++) if(bd[r][rK[1]]){blocked=true;break;}
      if(!blocked) return true;
    }
    return false;
  }, []);

  const getLegalMoves = useCallback((bd, r, c, side) => {
    return xqMoves(bd, r, c).filter(([tr, tc]) => {
      const nb = bd.map(row => [...row]);
      nb[tr][tc] = nb[r][c]; nb[r][c] = null;
      return !hasFlyingGeneral(nb) && !isInCheck(nb, side);
    });
  }, [hasFlyingGeneral, isInCheck]);

  // Check if a side has any legal moves
  const hasAnyLegalMove = useCallback((bd, side) => {
    for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
      if (bd[r][c]?.c === side && getLegalMoves(bd, r, c, side).length > 0) return true;
    }
    return false;
  }, [getLegalMoves]);

  const handleClick = (r, c) => {
    if (winner) return;
    if (vsAI && turn !== 'r') return;
    const p = board[r][c];
    if (sel) {
      const isValid = moves.some(m => m[0]===r && m[1]===c);
      if (isValid) {
        const nb = board.map(row => [...row]);
        const cap = nb[r][c];
        nb[r][c] = nb[sel[0]][sel[1]];
        nb[sel[0]][sel[1]] = null;
        if (cap) {
          const nc = { ...captured };
          nc[turn] = [...nc[turn], cap];
          setCaptured(nc);
          if (cap.t==='帅'||cap.t==='将') setWinner(turn);
        }
        const nextT = turn==='r'?'b':'r';
        setBoard(nb); setTurn(nextT); setSel(null); setMoves([]); setLastMove([r,c]);
        // Check if opponent is checkmated
        if (!hasAnyLegalMove(nb, nextT)) {
          setWinner(turn);
        }
      } else if (p && p.c === turn) {
        setSel([r,c]); setMoves(getLegalMoves(board, r, c, turn));
      } else { setSel(null); setMoves([]); }
    } else {
      if (p && p.c === turn) { setSel([r,c]); setMoves(getLegalMoves(board, r, c, turn)); }
    }
  };

  const reset = () => { aiRef.current++; setBoard(XQ_INIT()); setSel(null); setTurn('r'); setMoves([]); setWinner(null); setCaptured({r:[],b:[]}); setLastMove(null); };

  // Check if a side's king is under attack

  // AI with proper check awareness
  useEffect(() => {
    if (!vsAI || turn !== 'b' || winner) return;
    const gen = ++aiRef.current;
    const timer = setTimeout(() => {
      if (aiRef.current !== gen) return;
      const board = boardR.current;
      const PIECE_VAL = {'帅':10000,'将':10000,'车':90,'马':40,'炮':45,'相':20,'象':20,'仕':20,'士':20,'兵':10,'卒':10};

      // Generate all legal moves (don't leave own king in check)
      const legalMoves = [];
      for (let r=0;r<10;r++) for (let c=0;c<9;c++) {
        const p = board[r][c];
        if (!p || p.c!=='b') continue;
        const ms = xqMoves(board,r,c);
        for (const [tr,tc] of ms) {
          const nb = board.map(row=>[...row]);
          nb[tr][tc]=nb[r][c]; nb[r][c]=null;
          if (!isInCheck(nb,'b')) {
            legalMoves.push({fr:r,fc:c,tr,tc,cap:board[tr][tc]});
          }
        }
      }
      if (legalMoves.length===0) { setWinner('r'); return; } // checkmate

      // Score each move
      for (const m of legalMoves) {
        let sc = 0;
        // Capture value
        if (m.cap) sc += PIECE_VAL[m.cap.t] || 10;
        // Does this move put opponent in check?
        const nb = board.map(row=>[...row]);
        nb[m.tr][m.tc]=nb[m.fr][m.fc]; nb[m.fr][m.fc]=null;
        if (isInCheck(nb,'r')) sc += 30;
        // Is the moved piece safe? Check if opponent can capture it
        let threatened = false;
        for(let r=0;r<10;r++) for(let c=0;c<9;c++){
          if(nb[r][c]?.c==='r'){
            if(xqMoves(nb,r,c).some(([tr,tc])=>tr===m.tr&&tc===m.tc)){
              threatened=true; break;
            }
          }
          if(threatened) break;
        }
        if (threatened) sc -= PIECE_VAL[board[m.fr][m.fc].t] * 0.7;
        // Piece was already threatened before? Moving it is good
        let wasThreatened = false;
        for(let r=0;r<10;r++) for(let c=0;c<9;c++){
          if(board[r][c]?.c==='r'){
            if(xqMoves(board,r,c).some(([tr,tc])=>tr===m.fr&&tc===m.fc)){
              wasThreatened=true; break;
            }
          }
          if(wasThreatened) break;
        }
        if (wasThreatened && !threatened) sc += PIECE_VAL[board[m.fr][m.fc].t] * 0.3;
        // Positional: prefer center, advance pawns
        if (board[m.fr][m.fc].t==='卒' && m.tr > m.fr) sc += 5;
        sc += Math.random() * 3;
        m.score = sc;
      }

      legalMoves.sort((a,b)=>b.score-a.score);
      // Pick from top moves with some randomness
      const best = legalMoves[0].score;
      const top = legalMoves.filter(m => m.score >= best - 5);
      const mv = top[Math.floor(Math.random()*top.length)];
      const nb = board.map(row=>[...row]);
      const cap = nb[mv.tr][mv.tc];
      nb[mv.tr][mv.tc]=nb[mv.fr][mv.fc]; nb[mv.fr][mv.fc]=null;
      if(cap){const nc={...capR.current};nc.b=[...nc.b,cap];setCaptured(nc);if(cap.t==='帅')setWinner('b');}
      setBoard(nb); setTurn('r'); setSel(null); setMoves([]); setLastMove([mv.tr,mv.tc]);
    }, 400);
    return () => clearTimeout(timer);
  }, [turn, vsAI, winner, isInCheck]);

  const bw = 8 * CS, bh = 9 * CS;

  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, color:COLORS.text, fontFamily:fontSans }}>
      <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${COLORS.border}`, background:COLORS.bgCard }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:COLORS.gold, cursor:'pointer', fontSize:20, marginRight:12, fontFamily:font }}>←</button>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:18, fontFamily:font, color:COLORS.gold }}>象棋</span>
          <span style={{ fontSize:11, color:COLORS.textDim, marginLeft:8 }}>Chinese Chess</span>
        </div>
        <Btn onClick={()=>{setVsAI(!vsAI);reset();}} small active={vsAI} style={{marginRight:6}}>{vsAI?'人機':'雙人'}</Btn>
        <Btn onClick={reset} small>重開</Btn>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 8px', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
          <div style={{ padding:'6px 16px', borderRadius:8, background: turn==='r'?'rgba(196,64,64,0.15)':'transparent', border:`1px solid ${turn==='r'?COLORS.red:COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:14, color: turn==='r'?COLORS.redLight:COLORS.textMuted }}>{winner==='r'?'紅方 勝!':'紅方'}{vsAI?' (你)':''}</span>
            <span style={{ fontSize:11, color:COLORS.textDim, marginLeft:6 }}>{captured.b.map(p=>p.t).join('')}</span>
          </div>
          <div style={{ padding:'6px 16px', borderRadius:8, background: turn==='b'?'rgba(255,255,255,0.06)':'transparent', border:`1px solid ${turn==='b'?COLORS.text:COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:14, color: turn==='b'?COLORS.text:COLORS.textMuted }}>{winner==='b'?'黑方 勝!':'黑方'}</span>
            <span style={{ fontSize:11, color:COLORS.textDim, marginLeft:6 }}>{captured.r.map(p=>p.t).join('')}</span>
          </div>
        </div>
        <ScrollBoard>
        <div style={{ position:'relative', borderRadius:10, padding:CS/2, background:'linear-gradient(145deg, #dbb568, #c49a48 50%, #b88a38)', boxShadow:'0 8px 32px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)', border:'3px solid #8a6420', minWidth: bw+CS }}>
          <svg width={bw} height={bh} style={{ display:'block' }}>
            {Array.from({length:10}, (_,i) => <line key={`h${i}`} x1={0} y1={i*CS} x2={bw} y2={i*CS} stroke="#7a5818" strokeWidth={1.2}/>)}
            {Array.from({length:9}, (_,i) => <line key={`v${i}`} x1={i*CS} y1={0} x2={i*CS} y2={4*CS} stroke="#7a5818" strokeWidth={1.2}/>)}
            {Array.from({length:9}, (_,i) => <line key={`v2${i}`} x1={i*CS} y1={5*CS} x2={i*CS} y2={9*CS} stroke="#7a5818" strokeWidth={1.2}/>)}
            <line x1={3*CS} y1={0} x2={5*CS} y2={2*CS} stroke="#7a5818" strokeWidth={1}/>
            <line x1={5*CS} y1={0} x2={3*CS} y2={2*CS} stroke="#7a5818" strokeWidth={1}/>
            <line x1={3*CS} y1={7*CS} x2={5*CS} y2={9*CS} stroke="#7a5818" strokeWidth={1}/>
            <line x1={5*CS} y1={7*CS} x2={3*CS} y2={9*CS} stroke="#7a5818" strokeWidth={1}/>
            <text x={bw/2} y={4.6*CS} textAnchor="middle" fill="#7a5818" fontSize={16} fontFamily={font} opacity={0.5}>楚 河{'     '}漢 界</text>
          </svg>
          {board.map((row, r) => row.map((p, c) => {
            const isSel = sel && sel[0]===r && sel[1]===c;
            const isMove = moves.some(m => m[0]===r && m[1]===c);
            const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
            const sz = CS * 0.88;
            return (
              <div key={`${r}-${c}`} onClick={() => handleClick(r,c)} style={{
                position:'absolute', left: c*CS+CS/2-sz/2, top: r*CS+CS/2-sz/2,
                width:sz, height:sz, borderRadius:'50%', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: p ? (p.c==='r'
                  ? 'radial-gradient(circle at 38% 36%, #f8dbb0, #d48830 70%, #a06020)'
                  : 'radial-gradient(circle at 38% 36%, #707070, #303030 70%, #1a1a1a)')
                  : isMove ? 'rgba(201,168,76,0.2)' : 'transparent',
                border: p ? `2.5px solid ${p.c==='r'?'#8a5018':'#555'}`
                  : isMove ? `2px dashed ${COLORS.goldDim}` : 'none',
                boxShadow: isSel ? `0 0 0 3px ${COLORS.gold}, 0 4px 12px rgba(201,168,76,0.5)`
                  : isLast && p ? '0 0 0 2px #ffe066, 0 0 12px #ffe06688, 0 3px 8px rgba(0,0,0,0.35)'
                  : p ? '0 3px 8px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.2)' : 'none',
                animation: isLast && p ? 'lastPulse 1.5s ease-in-out infinite' : 'none',
                zIndex: p ? 3 : 2, transition: 'box-shadow 0.15s, transform 0.1s',
                transform: isSel ? 'scale(1.08)' : 'none',
              }}>
                {p && <span style={{ fontSize:sz*0.48, fontFamily:font, fontWeight:700, userSelect:'none',
                  color: p.c==='r' ? '#8b1a1a' : '#e8e0d0',
                  textShadow: p.c==='r' ? '0 1px 0 rgba(255,200,150,0.3)' : '0 1px 0 rgba(0,0,0,0.5)',
                }}>{p.t}</span>}
                {!p && isMove && <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS.gold, opacity:0.7 }}/>}
              </div>
            );
          }))}
        </div>
        </ScrollBoard>
      </div>
    </div>
  );
}

// ============================================================
// 2. DARK CHESS (暗棋)
// ============================================================
const DC_PIECES = ['帅','仕','仕','相','相','马','马','车','车','炮','炮','兵','兵','兵','兵','兵'];
const DC_NAMES_R = { '帅':'帅','仕':'仕','相':'相','马':'马','车':'车','炮':'炮','兵':'兵' };
const DC_NAMES_B = { '帅':'将','仕':'士','相':'象','马':'马','车':'车','炮':'炮','兵':'卒' };
const DC_RANK = { '帅':7,'仕':6,'相':5,'马':4,'车':3,'炮':2,'兵':1 };

function DarkChessGame({ onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const aiRef = useRef(0);
  const dcBoardRef = useRef(null);
  const dcScoreRef = useRef({r:0,b:0});
  const initBoard = useCallback(() => {
    const all = [];
    ['r','b'].forEach(c => DC_PIECES.forEach(t => all.push({ t, c, hidden: true })));
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
    const b = [];
    for (let r=0; r<4; r++) { b.push([]); for (let c=0; c<8; c++) b[r].push(all[r*8+c]); }
    return b;
  }, []);

  const [board, setBoard] = useState(initBoard);
  const [sel, setSel] = useState(null);
  const [turn, setTurn] = useState('r');
  const [winner, setWinner] = useState(null);
  const [score, setScore] = useState({ r:0, b:0 });
  const [lastMove, setLastMove] = useState(null);
  useEffect(()=>{dcBoardRef.current=board;},[board]);
  useEffect(()=>{dcScoreRef.current=score;},[score]);

  const canCapture = (attacker, defender) => {
    if (attacker.t==='炮') return true;
    if (attacker.t==='兵' && defender.t==='帅') return true;
    if (attacker.t==='帅' && defender.t==='兵') return false;
    return DC_RANK[attacker.t] >= DC_RANK[defender.t];
  };

  const getMoves = (r, c, bd, tn) => {
    const b = bd || board;
    const t2 = tn || turn;
    const p = b[r][c];
    if (!p || p.hidden || p.c !== t2) return [];
    const ms = [];
    if (p.t === '炮') {
      for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<4&&nc>=0&&nc<8&&!b[nr][nc]) ms.push([nr,nc,'move']);
      }
      for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let jumped = false;
        let cr=r+dr, cc=c+dc;
        while (cr>=0&&cr<4&&cc>=0&&cc<8) {
          if (b[cr][cc]) {
            if (!jumped) jumped = true;
            else { if (!b[cr][cc].hidden && b[cr][cc].c!==p.c) ms.push([cr,cc,'capture']); break; }
          }
          cr+=dr; cc+=dc;
        }
      }
    } else {
      for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<4&&nc>=0&&nc<8) {
          const t = b[nr][nc];
          if (!t) ms.push([nr,nc,'move']);
          else if (!t.hidden && t.c!==p.c && canCapture(p,t)) ms.push([nr,nc,'capture']);
        }
      }
    }
    return ms;
  };

  const handleClick = (r, c) => {
    if (winner) return;
    if (vsAI && turn !== 'r') return;
    const p = board[r][c];
    if (sel) {
      const ms = getMoves(sel[0], sel[1]);
      const mv = ms.find(m => m[0]===r && m[1]===c);
      if (mv) {
        const nb = board.map(row => row.map(cell => cell ? {...cell} : null));
        const cap = nb[r][c];
        nb[r][c] = nb[sel[0]][sel[1]];
        nb[sel[0]][sel[1]] = null;
        if (cap) {
          const ns = {...score}; ns[turn]++; setScore(ns);
          const remaining = nb.flat().filter(x => x);
          const opp = turn==='r'?'b':'r';
          if (!remaining.some(x => x.c===opp)) setWinner(turn);
        }
        setBoard(nb); setTurn(turn==='r'?'b':'r'); setSel(null); setLastMove([r,c]);
      } else if (p && p.hidden) {
        const nb = board.map(row => row.map(cell => cell ? {...cell} : null));
        nb[r][c].hidden = false;
        setBoard(nb); setTurn(turn==='r'?'b':'r'); setSel(null); setLastMove([r,c]);
      } else if (p && !p.hidden && p.c===turn) {
        setSel([r,c]);
      } else { setSel(null); }
    } else {
      if (p && p.hidden) {
        const nb = board.map(row => row.map(cell => cell ? {...cell} : null));
        nb[r][c].hidden = false;
        setBoard(nb); setTurn(turn==='r'?'b':'r'); setLastMove([r,c]);
      } else if (p && !p.hidden && p.c===turn) {
        setSel([r,c]);
      }
    }
  };

  const reset = () => { aiRef.current++; setBoard(initBoard()); setSel(null); setTurn('r'); setWinner(null); setScore({r:0,b:0}); setLastMove(null); };

  useEffect(() => {
    if (!vsAI || turn !== 'b' || winner) return;
    const gen = ++aiRef.current;
    const timer = setTimeout(() => {
      if (aiRef.current !== gen) return;
      const nb = dcBoardRef.current.map(row => row.map(cell => cell ? {...cell} : null));
      // Try captures first, then moves, then flips
      const caps=[],mvs=[],flips=[];
      for(let r=0;r<4;r++) for(let c=0;c<8;c++){
        const p=nb[r][c];
        if(p&&p.hidden){flips.push([r,c]);continue;}
        if(p&&!p.hidden&&p.c==='b'){
          const ms=getMoves(r,c,nb,'b');
          ms.forEach(m=>{if(m[2]==='capture')caps.push({fr:r,fc:c,tr:m[0],tc:m[1]});else mvs.push({fr:r,fc:c,tr:m[0],tc:m[1]});});
        }
      }
      if(caps.length>0){
        // Prefer capturing high-value pieces with low-value attackers
        caps.sort((a,b)=>{
          const aVal=DC_RANK[nb[a.tr][a.tc].t], bVal=DC_RANK[nb[b.tr][b.tc].t];
          if(bVal!==aVal) return bVal-aVal;
          return DC_RANK[nb[a.fr][a.fc].t]-DC_RANK[nb[b.fr][b.fc].t];
        });
        const m=caps[0];
        const cap=nb[m.tr][m.tc];
        nb[m.tr][m.tc]=nb[m.fr][m.fc];nb[m.fr][m.fc]=null;
        if(cap){const ns={...dcScoreRef.current};ns.b++;setScore(ns);if(!nb.flat().filter(x=>x).some(x=>x.c==='r'))setWinner('b');}
        setBoard(nb);setTurn('r');setSel(null);setLastMove([m.tr,m.tc]);
      } else if(mvs.length>0){
        const m=mvs[Math.floor(Math.random()*mvs.length)];
        nb[m.tr][m.tc]=nb[m.fr][m.fc];nb[m.fr][m.fc]=null;
        setBoard(nb);setTurn('r');setSel(null);setLastMove([m.tr,m.tc]);
      } else if(flips.length>0){
        const [r,c]=flips[Math.floor(Math.random()*flips.length)];
        nb[r][c].hidden=false;
        setBoard(nb);setTurn('r');setSel(null);setLastMove([r,c]);
      } else {
        // AI has no legal actions — AI loses
        setWinner('r');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [turn, vsAI, winner]);

  // Stalemate detection: if current player has no legal actions (no moves, no flips), they lose
  useEffect(() => {
    if (winner || !board) return;
    let hasAction = false;
    for (let r=0; r<4 && !hasAction; r++) for (let c=0; c<8 && !hasAction; c++) {
      const p = board[r][c];
      if (p && p.hidden) { hasAction = true; break; }
      if (p && !p.hidden && p.c === turn && getMoves(r, c, board, turn).length > 0) hasAction = true;
    }
    if (!hasAction) setWinner(turn === 'r' ? 'b' : 'r');
  }, [board, turn, winner]);
  const CS = 44;
  const ms = sel ? getMoves(sel[0],sel[1]) : [];

  return (
    <GameShell title="暗棋" sub="Dark Chess" onBack={onBack} sidebar={
      <div style={{ padding:16, background:COLORS.bgCard, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily:font, fontSize:16, color:COLORS.gold, marginBottom:12 }}>計分</div>
        <div style={{ fontSize:14, color:COLORS.red, marginBottom:4 }}>紅方{vsAI?' (你)':''}: {score.r} 子</div>
        <div style={{ fontSize:14, color:COLORS.textDim, marginBottom:12 }}>黑方{vsAI?' (AI)':''}: {score.b} 子</div>
        <div style={{ display:'flex', gap:4, marginBottom:12 }}>
          <Btn onClick={()=>{setVsAI(!vsAI);reset();}} small active={vsAI}>{vsAI?'人機':'雙人'}</Btn>
          <Btn onClick={reset} small>重開</Btn>
        </div>
      </div>
    }>
      <StatusBar text={winner ? `${winner==='r'?'紅方':'黑方'} 勝利!` : `${turn==='r'?'紅方':'黑方'} 行動`} />
      <ScrollBoard>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(8, ${CS}px)`, gap:2, background:COLORS.surface, padding:12, borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
        {board.flat().map((p, idx) => {
          const r = Math.floor(idx/8), c = idx%8;
          const isSel = sel && sel[0]===r && sel[1]===c;
          const isTarget = ms.some(m => m[0]===r && m[1]===c);
          const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
          return (
            <div key={idx} onClick={() => handleClick(r,c)} style={{
              width:CS, height:CS, display:'flex', alignItems:'center', justifyContent:'center',
              background: isSel ? COLORS.surfaceLight : isTarget ? 'rgba(201,168,76,0.15)' : COLORS.bgCard,
              borderRadius:6, cursor:'pointer', border: isSel ? `2px solid ${COLORS.gold}` : isTarget ? `1px solid ${COLORS.goldDim}` : isLast ? '2px solid #ffe066' : `1px solid ${COLORS.border}`,
              transition:'all 0.15s',
              animation: isLast ? 'lastPulse 1.5s ease-in-out infinite' : 'none',
            }}>
              {p ? (p.hidden ?
                <div style={{ width:CS*0.7, height:CS*0.7, borderRadius:6, background:'linear-gradient(135deg, #3a3020, #2a2018)', border:'1px solid #4a4030', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:font, fontSize:20, color:'#6a5a40' }}>?</span>
                </div> :
                <div style={{ width:CS*0.75, height:CS*0.75, borderRadius:'50%',
                  background: p.c==='r' ? 'radial-gradient(circle at 35% 35%, #f5d0a0, #c47030)' : 'radial-gradient(circle at 35% 35%, #555, #222)',
                  border: `2px solid ${p.c==='r'?'#a05020':'#444'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 2px 6px rgba(0,0,0,0.3)',
                }}>
                  <span style={{ fontFamily:font, fontSize:CS*0.36, color:p.c==='r'?'#8b1a1a':'#e8e0d0', fontWeight:700, userSelect:'none' }}>
                    {p.c==='r' ? DC_NAMES_R[p.t] : DC_NAMES_B[p.t]}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </ScrollBoard>
    </GameShell>
  );
}

// ============================================================
// 3. GO (圍棋) - 9x9
// ============================================================
function GoGame({ onBack }) {
  const SIZE = 9, CS = 38;
  const [board, setBoard] = useState(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
  const [turn, setTurn] = useState('b');
  const [pass, setPass] = useState(0);
  const [captured, setCaptured] = useState({ b:0, w:0 });
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [vsAI, setVsAI] = useState(true);
  const aiRef = useRef(0);

  const getGroup = (bd, r, c, color) => {
    const visited = new Set();
    const group = [];
    let liberties = 0;
    const dfs = (rr, cc) => {
      const key = `${rr},${cc}`;
      if (visited.has(key)) return;
      if (rr<0||rr>=SIZE||cc<0||cc>=SIZE) return;
      if (bd[rr][cc] === null) { liberties++; return; }
      if (bd[rr][cc] !== color) return;
      visited.add(key);
      group.push([rr,cc]);
      dfs(rr-1,cc); dfs(rr+1,cc); dfs(rr,cc-1); dfs(rr,cc+1);
    };
    dfs(r, c);
    return { group, liberties };
  };

  const removeCaptures = (bd, color) => {
    let count = 0;
    const nb = bd.map(r => [...r]);
    for (let r=0; r<SIZE; r++) for (let c=0; c<SIZE; c++) {
      if (nb[r][c] === color) {
        const { group, liberties } = getGroup(nb, r, c, color);
        if (liberties === 0) { group.forEach(([gr,gc]) => { nb[gr][gc] = null; }); count += group.length; }
      }
    }
    return { board: nb, count };
  };

  const handleClick = (r, c) => {
    if (winner || board[r][c]) return;
    if (vsAI && turn !== 'b') return;
    const nb = board.map(row => [...row]);
    nb[r][c] = turn;
    const opp = turn==='b'?'w':'b';
    const r1 = removeCaptures(nb, opp);
    const r2 = removeCaptures(r1.board, turn);
    const boardStr = JSON.stringify(r2.board);
    if (history.includes(boardStr)) return; // ko
    if (r2.count > 0) return; // suicide when no capture
    const nc = { ...captured }; nc[turn] += r1.count;
    setCaptured(nc);
    setBoard(r1.board); setTurn(opp); setPass(0); setLastMove([r,c]);
    setHistory([...history, boardStr]);
  };

  const handlePass = useCallback(() => {
    if (passRef.current >= 1) {
      // Count territory
      const bd = boardRef.current;
      const territory = { b: 0, w: 0 };
      const visited = new Set();
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        if (bd[r][c] || visited.has(`${r},${c}`)) continue;
        const group = []; const borders = new Set();
        const flood = (rr, cc) => {
          const k = `${rr},${cc}`;
          if (rr<0||rr>=SIZE||cc<0||cc>=SIZE||visited.has(k)) return;
          if (bd[rr][cc]) { borders.add(bd[rr][cc]); return; }
          visited.add(k); group.push(k);
          flood(rr-1,cc); flood(rr+1,cc); flood(rr,cc-1); flood(rr,cc+1);
        };
        flood(r, c);
        if (borders.size === 1) territory[borders.values().next().value] += group.length;
      }
      const bStones = bd.flat().filter(x => x==='b').length;
      const wStones = bd.flat().filter(x => x==='w').length;
      const bScore = bStones + territory.b;
      const wScore = wStones + territory.w + 5.5;
      setWinner(bScore > wScore ? `黑 ${bScore} vs 白 ${wScore.toFixed(1)} — 黑方勝` : `白 ${wScore.toFixed(1)} vs 黑 ${bScore} — 白方勝`);
      return;
    }
    setPass(p=>p+1); setTurn(t=>t==='b'?'w':'b');
  }, []);

  const reset = () => { aiRef.current++; setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null))); setTurn('b'); setPass(0); setCaptured({b:0,w:0}); setLastMove(null); setHistory([]); setWinner(null); };

  // Use refs so AI always reads latest state
  const boardRef = useRef(board);
  const histRef = useRef(history);
  const capRef = useRef(captured);
  const passRef = useRef(pass);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { histRef.current = history; }, [history]);
  useEffect(() => { capRef.current = captured; }, [captured]);
  useEffect(() => { passRef.current = pass; }, [pass]);

  // Stronger AI with influence-based evaluation
  const goAiScore = useCallback((bd, r, c, me, opp) => {
    const nb = bd.map(row=>[...row]); nb[r][c] = me;
    const r1 = removeCaptures(nb, opp);
    const r2 = removeCaptures(r1.board, me);
    const bs = JSON.stringify(r1.board);
    if (histRef.current.includes(bs) || r2.count > 0) return null; // illegal

    let sc = 0;
    // Captures are very valuable
    sc += r1.count * 30;

    // Check liberties of the placed stone's group
    const grp = getGroup(r1.board, r, c, me);
    if (grp.liberties <= 1 && r1.count === 0) sc -= 20; // dangerous atari
    if (grp.liberties >= 3) sc += 5;

    // Attack: reduce opponent liberties
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE && bd[nr][nc]===opp) {
        const og = getGroup(r1.board, nr, nc, opp);
        if (og.group.length > 0) {
          if (og.liberties === 1) sc += 25; // about to capture!
          else if (og.liberties === 2) sc += 8;
        }
      }
    }

    // Defense: save own groups in atari
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE && bd[nr][nc]===me) {
        const myG = getGroup(bd, nr, nc, me);
        if (myG.liberties === 1) sc += 20; // rescue!
        else if (myG.liberties === 2) sc += 5;
      }
    }

    // Connectivity & influence
    let adj_me=0, adj_opp=0, adj_empty=0;
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) continue;
      if (bd[nr][nc]===me) adj_me++;
      else if (bd[nr][nc]===opp) adj_opp++;
      else adj_empty++;
    }
    sc += adj_me * 2;
    sc += adj_opp * 1; // contact fight
    sc += adj_empty * 0.5;

    // Extended influence (2-step)
    for (const [dr,dc] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE) {
        if (bd[nr][nc]===me) sc += 1;
      }
    }

    // Prefer non-edge, especially star points and center
    const distEdge = Math.min(r, c, SIZE-1-r, SIZE-1-c);
    sc += distEdge * 0.8;
    if (r===2&&c===2 || r===2&&c===6 || r===6&&c===2 || r===6&&c===6 || r===4&&c===4) sc += 3;

    // Small randomness
    sc += Math.random() * 1.5;

    return { r, c, sc, board: r1.board, bs, caps: r1.count };
  }, []);

  useEffect(() => {
    if (!vsAI || turn !== 'w' || winner) return;
    const gen = ++aiRef.current;
    const timer = setTimeout(() => {
      if (aiRef.current !== gen) return;
      const bd = boardRef.current;
      const candidates = [];
      for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
        if (bd[r][c]) continue;
        const result = goAiScore(bd, r, c, 'w', 'b');
        if (result) candidates.push(result);
      }
      if (candidates.length > 0) {
        candidates.sort((a,b) => b.sc - a.sc);
        // Don't play if best score is very low and board is mostly filled (endgame)
        const empties = bd.flat().filter(x=>!x).length;
        if (candidates[0].sc < 1 && empties < SIZE*SIZE*0.2) {
          // Pass
          if (passRef.current >= 1) {
            handlePass();
          } else {
            setPass(p=>p+1); setTurn('b');
          }
          return;
        }
        const mv = candidates[0];
        const nc = {...capRef.current}; nc.w += mv.caps;
        setCaptured(nc);
        setBoard(mv.board); setTurn('b'); setPass(0); setLastMove([mv.r,mv.c]);
        setHistory(prev => [...prev, mv.bs]);
      } else {
        if (passRef.current >= 1) {
          handlePass();
        } else {
          setPass(p=>p+1); setTurn('b');
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [turn, vsAI, winner, goAiScore, handlePass]);
  const bw = (SIZE-1)*CS;

  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, color:COLORS.text, fontFamily:fontSans }}>
      <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${COLORS.border}`, background:COLORS.bgCard }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:COLORS.gold, cursor:'pointer', fontSize:20, marginRight:12, fontFamily:font }}>←</button>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:18, fontFamily:font, color:COLORS.gold }}>圍棋</span>
          <span style={{ fontSize:11, color:COLORS.textDim, marginLeft:8 }}>Go 9×9</span>
        </div>
        <Btn onClick={()=>{setVsAI(!vsAI);reset();}} small active={vsAI} style={{marginRight:6}}>{vsAI?'人機':'雙人'}</Btn>
        <Btn onClick={handlePass} small style={{ marginRight:6 }}>虛手</Btn>
        <Btn onClick={reset} small>重開</Btn>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 8px', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ padding:'5px 14px', borderRadius:8, background: turn==='b'?'rgba(255,255,255,0.06)':'transparent', border:`1px solid ${turn==='b'?COLORS.text:COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:13, color:turn==='b'?COLORS.text:COLORS.textMuted }}>●黑 提{captured.b}</span>
          </div>
          <div style={{ padding:'5px 14px', borderRadius:8, background: turn==='w'?'rgba(255,255,255,0.06)':'transparent', border:`1px solid ${turn==='w'?'#ddd':COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:13, color:turn==='w'?'#eee':COLORS.textMuted }}>○白 提{captured.w}</span>
          </div>
        </div>
        {winner && <div style={{ padding:'6px 20px', background:'rgba(201,168,76,0.15)', borderRadius:8, fontSize:13, color:COLORS.gold, fontFamily:font }}>{winner}</div>}
        <ScrollBoard>
        <div style={{ position:'relative', borderRadius:10, padding:CS, background:'linear-gradient(145deg, #dbb568, #c49a48 50%, #b88a38)', boxShadow:'0 8px 32px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)', border:'3px solid #8a6420', minWidth: bw+CS*2 }}>
          <svg width={bw} height={bw} style={{ display:'block' }}>
            {Array.from({length:SIZE}, (_,i) => <line key={`h${i}`} x1={0} y1={i*CS} x2={bw} y2={i*CS} stroke="#7a5818" strokeWidth={1.2}/>)}
            {Array.from({length:SIZE}, (_,i) => <line key={`v${i}`} x1={i*CS} y1={0} x2={i*CS} y2={bw} stroke="#7a5818" strokeWidth={1.2}/>)}
            {[2,4,6].map(r => [2,4,6].map(c => <circle key={`s${r}${c}`} cx={c*CS} cy={r*CS} r={3.5} fill="#7a5818"/>))}
          </svg>
          {Array.from({length:SIZE}, (_,r) => Array.from({length:SIZE}, (_,c) => {
            const stone = board[r][c];
            const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
            return (
              <div key={`${r}-${c}`} onClick={() => handleClick(r,c)} style={{
                position:'absolute', left:c*CS+CS, top:r*CS+CS,
                width:CS, height:CS, marginLeft:-CS/2, marginTop:-CS/2,
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: stone ? 'default' : 'pointer',
              }}>
                {stone && <div style={{
                  width:CS*0.9, height:CS*0.9, borderRadius:'50%',
                  background: stone==='b'
                    ? 'radial-gradient(circle at 36% 34%, #666, #222 50%, #0a0a0a)'
                    : 'radial-gradient(circle at 36% 34%, #fff, #e8e8e8 40%, #bbb)',
                  boxShadow: stone==='b'
                    ? '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.15)'
                    : '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.8)',
                  border: isLast ? '2.5px solid #ffe066' : 'none',
                  animation: isLast ? 'lastPulse 1.5s ease-in-out infinite' : 'none',
                }}/>}
              </div>
            );
          }))}
        </div>
        </ScrollBoard>
      </div>
    </div>
  );
}

// ============================================================
// 4. GOMOKU (五子棋)
// ============================================================
function GomokuGame({ onBack }) {
  const SIZE = 15, CS = 22;
  const [board, setBoard] = useState(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
  const [turn, setTurn] = useState('b');
  const [winner, setWinner] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [vsAI, setVsAI] = useState(true);
  const moveGen = useRef(0);

  const checkWin = (bd, r, c, color) => {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr,dc] of dirs) {
      let count = 1;
      for (let i=1; i<5; i++) { const nr=r+dr*i, nc=c+dc*i; if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&bd[nr][nc]===color) count++; else break; }
      for (let i=1; i<5; i++) { const nr=r-dr*i, nc=c-dc*i; if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&bd[nr][nc]===color) count++; else break; }
      if (count >= 5) return true;
    }
    return false;
  };

  const aiMove = useCallback((bd) => {
    const score = (r, c, color) => {
      let s = 0;
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr,dc] of dirs) {
        let cnt = 0, open = 0;
        for (let i=1; i<5; i++) { const nr=r+dr*i, nc=c+dc*i; if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&bd[nr][nc]===color) cnt++; else { if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&!bd[nr][nc]) open++; break; } }
        for (let i=1; i<5; i++) { const nr=r-dr*i, nc=c-dc*i; if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&bd[nr][nc]===color) cnt++; else { if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&!bd[nr][nc]) open++; break; } }
        if (cnt>=4) s += 100000;
        else if (cnt===3 && open===2) s += 10000;
        else if (cnt===3 && open===1) s += 1000;
        else if (cnt===2 && open===2) s += 500;
        else if (cnt===2 && open===1) s += 100;
        else if (cnt===1 && open===2) s += 10;
      }
      return s;
    };
    let best = null, bestScore = -1;
    for (let r=0; r<SIZE; r++) for (let c=0; c<SIZE; c++) {
      if (bd[r][c]) continue;
      let hasNeighbor = false;
      for (let dr=-2; dr<=2; dr++) for (let dc=-2; dc<=2; dc++) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&bd[nr][nc]) { hasNeighbor=true; break; }
        if (hasNeighbor) break;
      }
      if (!hasNeighbor && !(r===7&&c===7)) continue;
      const s = score(r,c,'w') * 1.1 + score(r,c,'b');
      if (s > bestScore) { bestScore = s; best = [r,c]; }
    }
    return best || [7,7];
  }, []);

  const handleClick = (r, c) => {
    if (winner || board[r][c]) return;
    if (vsAI && turn !== 'b') return;
    const nb = board.map(row => [...row]);
    nb[r][c] = turn;
    setBoard(nb); setLastMove([r,c]);
    if (checkWin(nb, r, c, turn)) { setWinner(turn); return; }
    // Draw check
    if (nb.every(row => row.every(cell => cell !== null))) { setWinner('draw'); return; }
    if (vsAI) {
      setTurn('w');
      const gen = ++moveGen.current;
      setTimeout(() => {
        if (moveGen.current !== gen) return;
        const [ar, ac] = aiMove(nb);
        const nb2 = nb.map(row => [...row]);
        nb2[ar][ac] = 'w';
        setBoard(nb2); setLastMove([ar,ac]);
        if (checkWin(nb2, ar, ac, 'w')) setWinner('w');
        else setTurn('b');
      }, 200);
    } else {
      setTurn(turn==='b'?'w':'b');
    }
  };

  const reset = () => { moveGen.current++; setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null))); setTurn('b'); setWinner(null); setLastMove(null); };
  const bw = (SIZE-1)*CS;

  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, color:COLORS.text, fontFamily:fontSans }}>
      <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${COLORS.border}`, background:COLORS.bgCard }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:COLORS.gold, cursor:'pointer', fontSize:20, marginRight:12, fontFamily:font }}>←</button>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:18, fontFamily:font, color:COLORS.gold }}>五子棋</span>
          <span style={{ fontSize:11, color:COLORS.textDim, marginLeft:8 }}>Gomoku</span>
        </div>
        <Btn onClick={() => { setVsAI(!vsAI); reset(); }} small active={vsAI} style={{ marginRight:6 }}>{vsAI?'人機':'雙人'}</Btn>
        <Btn onClick={reset} small>重開</Btn>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 8px', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ padding:'5px 14px', borderRadius:8, background: turn==='b'?'rgba(255,255,255,0.06)':'transparent', border:`1px solid ${turn==='b'?COLORS.text:COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:13, color:turn==='b'?COLORS.text:COLORS.textMuted }}>●黑{vsAI?' (你)':''}</span>
          </div>
          <div style={{ padding:'5px 14px', borderRadius:8, background: turn==='w'?'rgba(255,255,255,0.06)':'transparent', border:`1px solid ${turn==='w'?'#ddd':COLORS.border}` }}>
            <span style={{ fontFamily:font, fontSize:13, color:turn==='w'?'#eee':COLORS.textMuted }}>○白{vsAI?' (AI)':''}</span>
          </div>
          {winner && <span style={{ fontFamily:font, fontSize:14, color:COLORS.gold }}>{winner==='draw'?'平局!':winner==='b'?'黑方勝!':'白方勝!'}</span>}
        </div>
        <ScrollBoard>
        <div style={{ position:'relative', borderRadius:10, padding:CS, background:'linear-gradient(145deg, #dbb568, #c49a48 50%, #b88a38)', boxShadow:'0 8px 32px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)', border:'3px solid #8a6420', minWidth: bw+CS*2 }}>
          <svg width={bw} height={bw} style={{ display:'block' }}>
            {Array.from({length:SIZE}, (_,i) => <line key={`h${i}`} x1={0} y1={i*CS} x2={bw} y2={i*CS} stroke="#7a5818" strokeWidth={1}/>)}
            {Array.from({length:SIZE}, (_,i) => <line key={`v${i}`} x1={i*CS} y1={0} x2={i*CS} y2={bw} stroke="#7a5818" strokeWidth={1}/>)}
            {[3,7,11].map(r => [3,7,11].map(c => <circle key={`s${r}${c}`} cx={c*CS} cy={r*CS} r={2.5} fill="#7a5818"/>))}
          </svg>
          {Array.from({length:SIZE}, (_,r) => Array.from({length:SIZE}, (_,c) => {
            const stone = board[r][c];
            const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
            return (
              <div key={`${r}-${c}`} onClick={() => handleClick(r,c)} style={{
                position:'absolute', left:c*CS+CS, top:r*CS+CS,
                width:CS, height:CS, marginLeft:-CS/2, marginTop:-CS/2,
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: stone ? 'default' : 'pointer',
              }}>
                {stone && <div style={{
                  width:CS*0.88, height:CS*0.88, borderRadius:'50%',
                  background: stone==='b'
                    ? 'radial-gradient(circle at 36% 34%, #666, #222 50%, #0a0a0a)'
                    : 'radial-gradient(circle at 36% 34%, #fff, #e8e8e8 40%, #bbb)',
                  boxShadow: stone==='b'
                    ? '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.15)'
                    : '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.8)',
                  border: isLast ? '2.5px solid #ffe066' : 'none',
                  animation: isLast ? 'lastPulse 1.5s ease-in-out infinite' : 'none',
                }}/>}
              </div>
            );
          }))}
        </div>
        </ScrollBoard>
      </div>
    </div>
  );
}

// ============================================================
// 5. AEROPLANE CHESS (飛行棋) - Simplified 2P
// ============================================================
function FlightGame({ onBack }) {
  const TRACK = 28;
  const pColors = [COLORS.red, COLORS.blue, COLORS.green, '#c080e0'];
  const pNames = ['紅','藍','綠','紫'];
  const [players, setPlayers] = useState(2);
  const [pieces, setPieces] = useState(null);
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [vsAI, setVsAI] = useState(true);
  const [message, setMessage] = useState('');

  // Each player starts at a different offset on the circular track
  // pieces[player][i] stores "steps traveled" (0=just entered, TRACK=home, -1=base)
  // Actual position on circular track = (steps + offset) % TRACK
  const getOffset = (pi) => Math.floor(pi * TRACK / players);
  const getActualPos = (steps, pi) => (steps + getOffset(pi)) % TRACK;

  useEffect(() => {
    const p = {};
    for (let i=0; i<players; i++) p[i] = [-1,-1,-1,-1]; // -1 = base, 0..TRACK-1 = track, TRACK = home
    setPieces(p); setMessage('');
  }, [players]);

  const canAnyMove = (d, p, t) => {
    for (let i = 0; i < 4; i++) {
      const pos = p[t][i];
      if (pos === -1 && d === 6) return true;
      if (pos >= 0 && pos < TRACK) return true;
    }
    return false;
  };

  const roll = () => {
    if (rolling || winner) return;
    setRolling(true);
    let count = 0;
    const iv = setInterval(() => {
      const d = Math.floor(Math.random()*6)+1;
      setDice(d);
      count++;
      if (count > 8) {
        clearInterval(iv); setRolling(false);
        // Auto-skip if no valid moves
        if (!canAnyMove(d, pieces, turn)) {
          setMessage(`${pNames[turn]}方無法移動，跳過!`);
          setTimeout(() => { setDice(null); setTurn((turn+1)%players); }, 600);
        }
      }
    }, 80);
  };

  const movePiece = (pi) => {
    if (!dice || winner) return;
    const np = JSON.parse(JSON.stringify(pieces));
    const pos = np[turn][pi];
    let newPos;
    if (pos === -1 && dice === 6) {
      newPos = 0;
    } else if (pos >= 0 && pos < TRACK) {
      newPos = pos + dice;
      if (newPos > TRACK) return; // overshoot, pick another piece
      if (newPos >= TRACK) newPos = TRACK;
    } else return;

    np[turn][pi] = newPos;
    // Bump: compare actual track positions to send opponents back to base
    if (newPos >= 0 && newPos < TRACK) {
      const myActual = getActualPos(newPos, turn);
      let bumped = false;
      for (let op = 0; op < players; op++) {
        if (op === turn) continue;
        for (let oi = 0; oi < 4; oi++) {
          if (np[op][oi] >= 0 && np[op][oi] < TRACK && getActualPos(np[op][oi], op) === myActual) {
            np[op][oi] = -1; bumped = true;
          }
        }
      }
      if (bumped) setMessage(`${pNames[turn]}方撞飛了對手的棋子!`);
      else setMessage('');
    } else setMessage('');
    // Check win
    if (np[turn].every(p => p === TRACK)) setWinner(turn);
    // Roll again on 6
    const nextTurn = dice === 6 ? turn : (turn+1)%players;
    setPieces(np); setDice(null); setTurn(nextTurn);
  };

  const reset = () => { setDice(null); setTurn(0); setWinner(null); setMessage(''); const p={}; for(let i=0;i<players;i++) p[i]=[-1,-1,-1,-1]; setPieces(p); };

  // AI auto-play for non-player-0 turns
  useEffect(() => {
    if (!vsAI || turn === 0 || winner || rolling || !pieces) return;
    const timer = setTimeout(() => {
      // AI roll
      const d = Math.floor(Math.random()*6)+1;
      setDice(d);
      setTimeout(() => {
        if (!canAnyMove(d, pieces, turn)) {
          setDice(null); setTurn((turn+1)%players); return;
        }
        // Pick a piece to move
        const np = JSON.parse(JSON.stringify(pieces));
        const movable = [];
        for(let i=0;i<4;i++){
          const pos=np[turn][i];
          if(pos===-1&&d===6) movable.push(i);
          else if(pos>=0&&pos<TRACK&&pos+d<=TRACK) movable.push(i);
        }
        if(movable.length>0){
          const pi=movable[Math.floor(Math.random()*movable.length)];
          const pos=np[turn][pi];
          if(pos===-1&&d===6) np[turn][pi]=0;
          else { const npos=pos+d; np[turn][pi]=npos>TRACK?TRACK:npos; }
          // Bump: compare actual positions
          const newPos=np[turn][pi];
          if(newPos>=0&&newPos<TRACK){const myAct=getActualPos(newPos,turn);for(let op=0;op<players;op++){if(op===turn)continue;for(let oi=0;oi<4;oi++){if(np[op][oi]>=0&&np[op][oi]<TRACK&&getActualPos(np[op][oi],op)===myAct)np[op][oi]=-1;}}}
          if(np[turn].every(p=>p===TRACK)) setWinner(turn);
          const next=d===6?turn:(turn+1)%players;
          setPieces(np); setDice(null); setTurn(next);
        }
      }, 300);
    }, 600);
    return () => clearTimeout(timer);
  }, [turn, vsAI, winner, rolling, pieces, players]);

  if (!pieces) return null;

  const trackPos = (idx) => {
    const angle = (idx / TRACK) * Math.PI * 2 - Math.PI/2;
    const radius = 130;
    return { x: 180 + Math.cos(angle) * radius, y: 180 + Math.sin(angle) * radius };
  };

  return (
    <GameShell title="飛行棋" sub="Aeroplane Chess" onBack={onBack} sidebar={
      <div style={{ padding:16, background:COLORS.bgCard, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily:font, fontSize:16, color:COLORS.gold, marginBottom:12 }}>設定</div>
        <div style={{ display:'flex', gap:4, marginBottom:12 }}>
          {[2,3,4].map(n => <Btn key={n} small active={players===n} onClick={() => { setPlayers(n); }}>{n}人</Btn>)}
        </div>
        <Btn onClick={()=>setVsAI(!vsAI)} small active={vsAI} style={{marginBottom:8}}>{vsAI?'人機 (你=紅)':'同機多人'}</Btn>
        <div style={{ fontSize:14, color:pColors[turn], marginBottom:8, fontFamily:font }}>{pNames[turn]}方回合{vsAI&&turn===0?' (你)':''}</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <Btn onClick={roll} disabled={!!dice || rolling}>擲骰子</Btn>
          {dice && <span style={{ fontSize:32, fontFamily:font, color:COLORS.gold }}>{dice}</span>}
        </div>
        {dice && <div style={{ fontSize:12, color:COLORS.textDim, marginBottom:8 }}>點選要移動的棋子 {dice===6?'(擲到6可出發)':''}</div>}
        <div style={{ marginTop:12 }}>
          {Array.from({length:players}, (_,i) => (
            <div key={i} style={{ fontSize:12, color:pColors[i], marginBottom:4 }}>
              {pNames[i]}: {pieces[i].filter(p=>p===TRACK).length}/4 到家
            </div>
          ))}
        </div>
        <Btn onClick={reset} style={{ width:'100%', marginTop:12 }}>重新開局</Btn>
      </div>
    }>
      <StatusBar text={winner!==null ? `${pNames[winner]}方 勝利!` : message || `${pNames[turn]}方 ${dice?'選擇棋子':'擲骰子'}`} />
      <ScrollBoard>
      <div style={{ position:'relative', width:360, height:360, background:COLORS.surface, borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
        {/* Track circles */}
        {Array.from({length:TRACK}, (_,i) => {
          const {x,y} = trackPos(i);
          // Highlight start positions for each player
          const startPlayer = Array.from({length:players}, (_,pi) => pi).find(pi => getActualPos(0, pi) === i);
          const isStart = startPlayer !== undefined;
          return <div key={i} style={{ position:'absolute', left:x-12, top:y-12, width:24, height:24, borderRadius:'50%', background: isStart ? pColors[startPlayer] + '33' : COLORS.bgCard, border: isStart ? `2px solid ${pColors[startPlayer]}` : `1px solid ${COLORS.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color: isStart ? pColors[startPlayer] : COLORS.textMuted }}>{isStart ? '★' : i}</div>;
        })}
        {/* Home */}
        <div style={{ position:'absolute', left:155, top:155, width:50, height:50, borderRadius:'50%', background:COLORS.gold, opacity:0.2 }}/>
        <div style={{ position:'absolute', left:163, top:168, fontSize:14, fontFamily:font, color:COLORS.gold }}>HOME</div>
        {/* Pieces */}
        {Array.from({length:players}, (_,pi) => pieces[pi].map((pos, idx) => {
          let x, y;
          if (pos === -1) {
            const baseX = pi%2===0 ? 30 : 300;
            const baseY = pi<2 ? 30 : 300;
            x = baseX + (idx%2)*30; y = baseY + Math.floor(idx/2)*30;
          } else if (pos === TRACK) {
            x = 168 + (idx-1.5)*12; y = 168 + (pi-1)*8;
          } else {
            const tp = trackPos(getActualPos(pos, pi));
            x = tp.x + (idx-1.5)*4 + pi*2; y = tp.y + (pi-1)*4;
          }
          return (
            <div key={`${pi}-${idx}`} onClick={() => pi===turn && dice && movePiece(idx)} style={{
              position:'absolute', left:x-8, top:y-8, width:16, height:16,
              borderRadius:'50%', background:pColors[pi], cursor:pi===turn&&dice?'pointer':'default',
              border: pi===turn ? `2px solid ${COLORS.gold}` : '1px solid rgba(0,0,0,0.3)',
              boxShadow:'0 2px 4px rgba(0,0,0,0.3)', transition:'all 0.3s', zIndex:5,
            }}/>
          );
        }))}
      </div>
      </ScrollBoard>
    </GameShell>
  );
}

// ============================================================
// 6. CHINESE CHECKERS (跳棋) - 2/3/4/6 players, full star board
// ============================================================
const CC_ROWS = [
  {y:0,  cols:[6]},
  {y:1,  cols:[5,6]},
  {y:2,  cols:[5,6,7]},
  {y:3,  cols:[4,5,6,7]},
  {y:4,  cols:[0,1,2,3,4,5,6,7,8,9,10,11,12]},
  {y:5,  cols:[0,1,2,3,4,5,6,7,8,9,10,11]},
  {y:6,  cols:[1,2,3,4,5,6,7,8,9,10,11]},
  {y:7,  cols:[1,2,3,4,5,6,7,8,9,10]},
  {y:8,  cols:[2,3,4,5,6,7,8,9,10]},
  {y:9,  cols:[1,2,3,4,5,6,7,8,9,10]},
  {y:10, cols:[1,2,3,4,5,6,7,8,9,10,11]},
  {y:11, cols:[0,1,2,3,4,5,6,7,8,9,10,11]},
  {y:12, cols:[0,1,2,3,4,5,6,7,8,9,10,11,12]},
  {y:13, cols:[4,5,6,7]},
  {y:14, cols:[5,6,7]},
  {y:15, cols:[5,6]},
  {y:16, cols:[6]},
];

// 6 zones: 0=top, 1=upper-right, 2=lower-right, 3=bottom, 4=lower-left, 5=upper-left
const CC_ZONES = [
  [[0,6],[1,5],[1,6],[2,5],[2,6],[2,7],[3,4],[3,5],[3,6],[3,7]],
  [[4,9],[4,10],[4,11],[4,12],[5,9],[5,10],[5,11],[6,10],[6,11],[7,10]],
  [[9,10],[10,10],[10,11],[11,9],[11,10],[11,11],[12,9],[12,10],[12,11],[12,12]],
  [[13,4],[13,5],[13,6],[13,7],[14,5],[14,6],[14,7],[15,5],[15,6],[16,6]],
  [[9,1],[10,1],[10,2],[11,0],[11,1],[11,2],[12,0],[12,1],[12,2],[12,3]],
  [[4,0],[4,1],[4,2],[4,3],[5,0],[5,1],[5,2],[6,1],[6,2],[7,1]],
];
// Opposite zone: 0↔3, 1↔4, 2↔5
const CC_OPP = [3,4,5,0,1,2];
const CC_COLORS = ['#4488dd','#44aa66','#22aa88','#dd4444','#cc8822','#aa44cc'];
const CC_NAMES = ['藍','綠','青','紅','橙','紫'];

// Which zones to use per player count
const CC_LAYOUTS = {
  2: [0,3],
  3: [0,2,4],
  4: [1,2,4,5],
  6: [0,1,2,3,4,5],
};

const CC_HEX_DIRS = [
  [-1,-1,-1,0],[-1,0,-1,1],[0,-1,0,-1],[0,1,0,1],[1,-1,1,0],[1,0,1,1],
];

function CheckersGame({ onBack }) {
  const CS = 24;
  const [numPlayers, setNumPlayers] = useState(2);
  const validSet = useRef(new Set());

  const initBoard = useCallback((np) => {
    const b = {};
    const vs = new Set();
    CC_ROWS.forEach(({y, cols}) => cols.forEach(c => { vs.add(`${y},${c}`); b[`${y},${c}`] = null; }));
    validSet.current = vs;
    const layout = CC_LAYOUTS[np] || CC_LAYOUTS[2];
    layout.forEach((zone, pi) => {
      CC_ZONES[zone].forEach(([r,c]) => { b[`${r},${c}`] = pi; });
    });
    return b;
  }, []);

  const [board, setBoard] = useState(() => initBoard(2));
  const [sel, setSel] = useState(null);
  const [turn, setTurn] = useState(0);
  const [winner, setWinner] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [vsAI, setVsAI] = useState(true);
  const aiRef = useRef(0);

  const hexStep = useCallback((r, c, dir) => {
    const [edr,edc,odr,odc] = dir;
    return [r + (r%2===0?edr:odr), c + (r%2===0?edc:odc)];
  }, []);

  const getAdj = useCallback((r, c) => {
    return CC_HEX_DIRS.map(d => hexStep(r, c, d))
      .filter(([rr,cc]) => validSet.current.has(`${rr},${cc}`));
  }, [hexStep]);

  const getJumps = useCallback((bd, r, c, visited = new Set()) => {
    const jumps = [];
    for (const dir of CC_HEX_DIRS) {
      const [ar, ac] = hexStep(r, c, dir);
      if (!validSet.current.has(`${ar},${ac}`) || bd[`${ar},${ac}`] === null || bd[`${ar},${ac}`] === undefined) continue;
      const [jr, jc] = hexStep(ar, ac, dir);
      const key = `${jr},${jc}`;
      if (validSet.current.has(key) && bd[key] === null && !visited.has(key)) {
        visited.add(key);
        jumps.push([jr, jc]);
        jumps.push(...getJumps(bd, jr, jc, visited));
      }
    }
    return jumps;
  }, [hexStep]);

  const getMoves = useCallback((bd, r, c) => {
    const moves = [];
    for (const [ar, ac] of getAdj(r, c)) {
      if (bd[`${ar},${ac}`] === null) moves.push([ar, ac]);
    }
    moves.push(...getJumps(bd, r, c));
    return moves;
  }, [getAdj, getJumps]);

  const layout = CC_LAYOUTS[numPlayers] || CC_LAYOUTS[2];

  const checkWin = useCallback((bd, np) => {
    const lay = CC_LAYOUTS[np] || CC_LAYOUTS[2];
    for (let pi = 0; pi < lay.length; pi++) {
      const targetZone = CC_OPP[lay[pi]];
      const targetCells = CC_ZONES[targetZone];
      if (targetCells.every(([r,c]) => bd[`${r},${c}`] === pi)) return pi;
    }
    return null;
  }, []);

  const nextTurn = useCallback((t, np) => (t + 1) % (CC_LAYOUTS[np]||CC_LAYOUTS[2]).length, []);

  const handleClick = (r, c) => {
    if (winner !== null) return;
    if (vsAI && turn !== 0) return;
    const key = `${r},${c}`;
    if (sel) {
      const ms = getMoves(board, sel[0], sel[1]);
      if (ms.some(([mr,mc]) => mr===r && mc===c)) {
        const nb = { ...board };
        nb[key] = nb[`${sel[0]},${sel[1]}`];
        nb[`${sel[0]},${sel[1]}`] = null;
        const w = checkWin(nb, numPlayers);
        if (w !== null) setWinner(w);
        setBoard(nb); setTurn(nextTurn(turn, numPlayers)); setSel(null); setLastMove([r,c]);
      } else if (board[key] === turn) {
        setSel([r, c]);
      } else setSel(null);
    } else {
      if (board[key] === turn) setSel([r, c]);
    }
  };

  const reset = useCallback((np) => {
    aiRef.current++;
    const n = np || numPlayers;
    setBoard(initBoard(n)); setSel(null); setTurn(0); setWinner(null); setLastMove(null);
  }, [numPlayers, initBoard]);

  // AI
  useEffect(() => {
    if (!vsAI || turn === 0 || winner !== null) return;
    const gen = ++aiRef.current;
    const timer = setTimeout(() => {
      if (aiRef.current !== gen) return;
      const playerZone = layout[turn];
      const targetZone = CC_OPP[playerZone];
      const targetCells = CC_ZONES[targetZone];
      // Target center for scoring
      const tCenterR = targetCells.reduce((s,[r])=>s+r,0)/targetCells.length;
      const tCenterC = targetCells.reduce((s,[,c])=>s+c,0)/targetCells.length;

      const allMoves = [];
      Object.entries(board).forEach(([key, val]) => {
        if (val !== turn) return;
        const [r,c] = key.split(',').map(Number);
        const ms = getMoves(board, r, c);
        ms.forEach(([tr,tc]) => {
          const oldDist = Math.abs(r-tCenterR) + Math.abs(c-tCenterC);
          const newDist = Math.abs(tr-tCenterR) + Math.abs(tc-tCenterC);
          const score = (oldDist - newDist) * 10 + (Math.abs(tr-r)>1?20:0) + Math.random()*2;
          allMoves.push({fr:r,fc:c,tr,tc,score});
        });
      });
      if (allMoves.length === 0) { setTurn(nextTurn(turn, numPlayers)); return; }
      allMoves.sort((a,b) => b.score - a.score);
      const top = allMoves.filter(m => m.score >= allMoves[0].score - 1);
      const mv = top[Math.floor(Math.random()*top.length)];
      const nb = { ...board };
      nb[`${mv.tr},${mv.tc}`] = nb[`${mv.fr},${mv.fc}`];
      nb[`${mv.fr},${mv.fc}`] = null;
      const w = checkWin(nb, numPlayers);
      if (w !== null) setWinner(w);
      setBoard(nb); setTurn(nextTurn(turn, numPlayers)); setSel(null); setLastMove([mv.tr,mv.tc]);
    }, 400);
    return () => clearTimeout(timer);
  }, [turn, vsAI, winner, board, numPlayers, layout, getMoves, checkWin, nextTurn]);

  const ms = sel ? getMoves(board, sel[0], sel[1]) : [];
  const activeName = CC_NAMES[layout[turn]] || '';
  const activeColor = CC_COLORS[layout[turn]] || '#888';

  // Determine which zone a cell belongs to (for background tinting)
  const cellZone = useMemo(() => {
    const map = {};
    CC_ZONES.forEach((cells, zi) => { cells.forEach(([r,c]) => { map[`${r},${c}`] = zi; }); });
    return map;
  }, []);

  const zoneInUse = useMemo(() => new Set(layout), [layout]);

  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, color:COLORS.text, fontFamily:fontSans }}>
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${COLORS.border}`, background:COLORS.bgCard, gap:6 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:COLORS.gold, cursor:'pointer', fontSize:20, marginRight:6, fontFamily:font }}>←</button>
        <span style={{ fontSize:17, fontFamily:font, color:COLORS.gold }}>跳棋</span>
        <div style={{ flex:1 }}/>
        <div style={{ display:'flex', gap:2 }}>
          {[2,3,4,6].map(n => (
            <button key={n} onClick={() => { setNumPlayers(n); reset(n); }} style={{
              padding:'4px 8px', fontSize:11, borderRadius:4, border:'none', cursor:'pointer',
              background: numPlayers===n ? COLORS.gold : COLORS.surface,
              color: numPlayers===n ? COLORS.bg : COLORS.textDim,
              fontFamily:fontSans, fontWeight: numPlayers===n ? 600 : 400,
            }}>{n}人</button>
          ))}
        </div>
        <button onClick={()=>{setVsAI(!vsAI);reset();}} style={{
          padding:'4px 8px', fontSize:11, borderRadius:4, border:'none', cursor:'pointer',
          background: vsAI ? COLORS.gold : COLORS.surface,
          color: vsAI ? COLORS.bg : COLORS.textDim, fontFamily:fontSans,
        }}>{vsAI?'人機':'同機'}</button>
        <button onClick={()=>reset()} style={{
          padding:'4px 8px', fontSize:11, borderRadius:4, border:'none', cursor:'pointer',
          background:COLORS.surface, color:COLORS.textDim, fontFamily:fontSans,
        }}>重開</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 4px', gap:6 }}>
        {/* Player indicators */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
          {layout.map((zone, pi) => (
            <div key={pi} style={{
              padding:'3px 10px', borderRadius:20, fontSize:12, fontFamily:font,
              background: turn===pi ? CC_COLORS[zone] : 'transparent',
              border: `2px solid ${CC_COLORS[zone]}`,
              color: turn===pi ? '#fff' : CC_COLORS[zone],
              fontWeight: turn===pi ? 700 : 400,
              boxShadow: turn===pi ? `0 0 8px ${CC_COLORS[zone]}44` : 'none',
            }}>
              {CC_NAMES[zone]}{vsAI && pi===0 ? '(你)' : ''}{winner===pi ? ' 勝!' : ''}
            </div>
          ))}
        </div>
        {/* Board */}
        <ScrollBoard>
        <div style={{
          position:'relative', borderRadius:14,
          background:'linear-gradient(145deg, #dbb568, #c49a48 50%, #b88a38)',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
          border:'3px solid #8a6420',
          width: 13*CS+CS+2*Math.round((CS+CS*0.82)/2), height: 16*CS+CS*0.82+2*Math.round(CS*0.6),
        }}>
          {(() => {
            const sz = CS * 0.82;
            const bw = 13*CS+CS+2*Math.round((CS+sz)/2);
            const xOff = Math.round((bw - 12*CS - sz) / 2);
            const yOff = Math.round(CS*0.6);
            return Object.entries(board).map(([key, val]) => {
            const [r, c] = key.split(',').map(Number);
            const isSel = sel && sel[0]===r && sel[1]===c;
            const isTarget = ms.some(([mr,mc]) => mr===r && mc===c);
            const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
            const x = c * CS + (r % 2 ? CS/2 : 0) + xOff;
            const y = r * CS + yOff;
            const pieceColor = val !== null && val !== undefined ? CC_COLORS[layout[val]] : null;
            const zone = cellZone[key];
            const zoneColor = zone !== undefined && zoneInUse.has(zone) ? CC_COLORS[zone] : null;
            const sz = CS * 0.82;
            return (
              <div key={key} onClick={() => handleClick(r, c)} style={{
                position:'absolute', left:x, top:y,
                width:sz, height:sz, borderRadius:'50%',
                cursor:'pointer',
                background: pieceColor
                  ? `radial-gradient(circle at 36% 34%, ${pieceColor}ee, ${pieceColor})`
                  : isTarget
                    ? 'rgba(201,168,76,0.3)'
                    : zoneColor
                      ? `${zoneColor}18`
                      : 'rgba(0,0,0,0.15)',
                border: isSel ? `2px solid #fff`
                  : isTarget ? `2px dashed ${COLORS.gold}`
                  : pieceColor ? `1px solid ${pieceColor}88`
                  : zoneColor ? `1px solid ${zoneColor}30`
                  : '1px solid rgba(0,0,0,0.1)',
                boxShadow: isSel
                  ? `0 0 0 2px ${COLORS.gold}, 0 4px 12px rgba(0,0,0,0.4)`
                  : isLast && pieceColor
                    ? `0 0 0 2px #ffe066, 0 0 12px #ffe06688, 0 3px 6px rgba(0,0,0,0.35)`
                  : pieceColor
                    ? `inset 0 1px 3px rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.35)`
                    : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                animation: isLast && pieceColor ? 'lastPulse 1.5s ease-in-out infinite' : 'none',
                transition: 'transform 0.12s, box-shadow 0.12s',
                transform: isSel ? 'scale(1.2)' : 'none',
                zIndex: isSel ? 10 : pieceColor ? 2 : 1,
              }}/>
            );
          });})()}
        </div>
        </ScrollBoard>
      </div>
    </div>
  );
}

// ============================================================
// 7 & 8. MAHJONG (Shared Engine)
// ============================================================
const MJ_SUITS = ['萬','筒','條'];
const MJ_WINDS = ['東','南','西','北'];
const MJ_DRAGONS = ['中','發','白'];
const MJ_WIND_NAMES = ['東','南','西','北'];

function createMJTiles(includeFlowers, threePlayer) {
  const tiles = [];
  let id = 0;
  for (const suit of MJ_SUITS) {
    for (let n = 1; n <= 9; n++) {
      if (threePlayer && suit === '萬' && n >= 2 && n <= 8) continue; // 三麻去掉2-8萬
      for (let i = 0; i < 4; i++) tiles.push({ id: id++, suit, num: n, display: `${n}${suit}` });
    }
  }
  for (const w of MJ_WINDS) {
    if (threePlayer && w === '北') continue; // 三麻去掉北
    for (let i = 0; i < 4; i++) tiles.push({ id: id++, suit: '字', num: 0, display: w });
  }
  for (const d of MJ_DRAGONS) {
    for (let i = 0; i < 4; i++) tiles.push({ id: id++, suit: '字', num: 0, display: d });
  }
  if (includeFlowers) {
    ['春','夏','秋','冬','梅','蘭','竹','菊'].forEach(f => tiles.push({ id: id++, suit: '花', num: 0, display: f }));
  }
  for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [tiles[i],tiles[j]]=[tiles[j],tiles[i]]; }
  return tiles;
}

const MJ_UNICODE = {
  '萬': ['\u{1F007}','\u{1F008}','\u{1F009}','\u{1F00A}','\u{1F00B}','\u{1F00C}','\u{1F00D}','\u{1F00E}','\u{1F00F}'],
  '筒': ['\u{1F019}','\u{1F01A}','\u{1F01B}','\u{1F01C}','\u{1F01D}','\u{1F01E}','\u{1F01F}','\u{1F020}','\u{1F021}'],
  '條': ['\u{1F010}','\u{1F011}','\u{1F012}','\u{1F013}','\u{1F014}','\u{1F015}','\u{1F016}','\u{1F017}','\u{1F018}'],
};
const MJ_HONOR_MAP = {'東':'\u{1F000}','南':'\u{1F001}','西':'\u{1F002}','北':'\u{1F003}','中':'\u{1F004}','發':'\u{1F005}','白':'\u{1F006}'};
const MJ_CN_NUM = ['','一','二','三','四','五','六','七','八','九'];
const MJ_TONG_DOTS = {
  1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],
  4:[[0,0],[0,2],[2,0],[2,2]],5:[[0,0],[0,2],[1,1],[2,0],[2,2]],
  6:[[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],7:[[0,0],[0,2],[1,0],[1,1],[1,2],[2,0],[2,2]],
  8:[[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]],9:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
};

function MahjongTile({ tile, onClick, selected, small, faceDown, drawn }) {
  const w = small ? 18 : 36;
  const h = small ? 24 : 48;
  const getSuitColor = (t) => {
    if (!t) return '#333';
    if (t.display === '中') return '#cc0000';
    if (t.display === '發') return '#006600';
    if (t.display === '白') return '#888';
    if ('東南西北'.includes(t.display)) return '#1a1a3e';
    if (t.suit === '筒') return '#0066aa';
    if (t.suit === '條') return '#006633';
    if (t.suit === '萬') return '#aa2222';
    if (t.suit === '花') return '#9944aa';
    return '#333';
  };

  const renderFace = (t) => {
    if (!t) return null;
    const s = small;
    const col = getSuitColor(t);
    // Honor tiles: large character
    if (t.suit === '字') {
      return <span style={{ fontSize: s?18:28, fontFamily:font, fontWeight:900, color:col, lineHeight:1, textShadow: t.display==='白'?'none':'0 1px 2px rgba(0,0,0,0.1)' }}>{t.display}</span>;
    }
    // Flower tiles
    if (t.suit === '花') {
      const flowers = {'春':'🌸','夏':'☀','秋':'🍂','冬':'❄','梅':'🌺','蘭':'🌿','竹':'🎋','菊':'🌼'};
      return (<>
        <span style={{ fontSize: s?12:16 }}>{flowers[t.display]||'🌸'}</span>
        <span style={{ fontSize: s?8:10, color:col, fontFamily:font, marginTop:1 }}>{t.display}</span>
      </>);
    }
    // 萬 (Characters): Chinese numeral + 萬
    if (t.suit === '萬') {
      return (<>
        <span style={{ fontSize: s?14:20, fontFamily:font, fontWeight:800, color:col, lineHeight:1 }}>{MJ_CN_NUM[t.num]}</span>
        <span style={{ fontSize: s?8:11, fontFamily:font, fontWeight:700, color:col, lineHeight:1, marginTop: s?0:1 }}>萬</span>
      </>);
    }
    // 筒 (Circles): dot pattern
    if (t.suit === '筒') {
      const dots = MJ_TONG_DOTS[t.num] || [];
      const gs = s ? 10 : 14;
      const ds = s ? 2.5 : 3.5;
      return (
        <div style={{ width:gs, height:gs, position:'relative' }}>
          {dots.map(([dr,dc],i) => (
            <div key={i} style={{
              position:'absolute', left: dc*(gs/2)-ds, top: dr*(gs/2)-ds,
              width:ds*2, height:ds*2, borderRadius:'50%',
              background: col, border:`0.5px solid ${col}`,
            }}/>
          ))}
        </div>
      );
    }
    // 條 (Bamboo): number + bamboo lines
    if (t.suit === '條') {
      if (t.num === 1) {
        return <span style={{ fontSize: s?16:24, lineHeight:1 }}>🐦</span>;
      }
      const bars = Math.min(t.num, 9);
      const bh2 = s ? 2 : 3;
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: s?0:1 }}>
          <span style={{ fontSize: s?9:12, fontFamily:font, fontWeight:800, color:col, lineHeight:1 }}>{t.num}</span>
          <div style={{ display:'flex', gap: s?1:1.5, flexWrap:'wrap', justifyContent:'center', maxWidth: s?18:26 }}>
            {Array.from({length: Math.min(bars,6)}, (_,i) => (
              <div key={i} style={{ width: s?2:3, height: bh2*3, borderRadius:1, background:`linear-gradient(180deg, #2a8a44, ${col})` }}/>
            ))}
          </div>
        </div>
      );
    }
    return <span style={{ fontSize: s?13:18, fontFamily:font, color:col }}>{t.num}</span>;
  };

  return (
    <div onClick={onClick} style={{
      width:w, height:h, borderRadius: small?3:5,
      background: faceDown
        ? 'linear-gradient(135deg, #1a5a3a, #0e3a22)'
        : 'linear-gradient(180deg, #faf6ec 0%, #ece4d0 60%, #ddd4be 100%)',
      border: selected ? `2px solid ${COLORS.gold}` : faceDown ? '1px solid #2a7a4a' : '1px solid #c0b8a0',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: selected
        ? `0 -6px 0 ${COLORS.gold}, 0 4px 12px rgba(201,168,76,0.4)`
        : faceDown
          ? 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3)'
          : '0 2px 0 #b8b0a0, 0 3px 6px rgba(0,0,0,0.15)',
      transition: 'transform 0.12s, box-shadow 0.12s',
      transform: selected ? 'translateY(-6px)' : 'none',
      flexShrink: 0,
      marginLeft: drawn && !small ? 8 : 0,
      position: 'relative',
    }}>
      {!faceDown && tile && renderFace(tile)}
      {faceDown && <div style={{ width: small?8:14, height: small?10:18, borderRadius:2, border:'1px solid rgba(255,255,255,0.15)', background:'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)' }}/>}
    </div>
  );
}

function MahjongGame({ onBack, variant }) {
  const isJP = variant === 'jp';
  const handSize = isJP ? 13 : 16;
  const setsNeeded = isJP ? 4 : 5;
  const [numP, setNumP] = useState(4);

  const tk = (t) => t.suit==='字'||t.suit==='花' ? t.display : `${t.num}${t.suit}`;

  const canWin = useCallback((tiles, numMelds=0) => {
    const need = (setsNeeded - numMelds) * 3 + 2;
    if (tiles.length !== need) return false;
    // Filter out flower tiles (they don't participate in win check)
    const hand = tiles.filter(t => t.suit !== '花');
    if (hand.length !== need) return false;

    const sorted = [...hand].sort((a,b) => { if(a.suit!==b.suit) return a.suit.localeCompare(b.suit); return a.num-b.num; });
    const keys = sorted.map(t=>tk(t));

    // === Special hands (JP only) ===
    if (isJP && numMelds === 0) {
      // 七對子 (7 pairs): 14 tiles, all pairs
      if (need === 14) {
        const counts = {}; keys.forEach(k => counts[k]=(counts[k]||0)+1);
        if (Object.keys(counts).length === 7 && Object.values(counts).every(c => c === 2)) return true;
      }
      // 國士無雙 (13 orphans): one of each terminal/honor + one duplicate
      if (need === 14) {
        const kokushi = ['1萬','9萬','1筒','9筒','1條','9條','東','南','西','北','中','發','白'];
        const has = kokushi.every(k => keys.includes(k));
        if (has) return true;
      }
    }

    // === Standard form: pair + melds ===
    const tryForm = (rem) => {
      if (rem.length===0) return true;
      // Try triplet (刻子)
      if (rem.length>=3 && rem[0]===rem[1] && rem[1]===rem[2]) {
        if(tryForm(rem.slice(3))) return true;
      }
      // Try sequence (順子) — only for numbered suits
      const f=sorted[keys.indexOf(rem[0])];
      if (f && f.suit!=='字' && f.suit!=='花') {
        const k2=`${f.num+1}${f.suit}`,k3=`${f.num+2}${f.suit}`;
        const i2=rem.indexOf(k2),i3=rem.indexOf(k3);
        if(i2>=0&&i3>=0){
          const r=[...rem];
          r.splice(r.indexOf(rem[0]),1);
          r.splice(r.indexOf(k2),1);
          r.splice(r.indexOf(k3),1);
          if(tryForm(r))return true;
        }
      }
      return false;
    };
    for(let i=0;i<keys.length-1;i++){
      if(keys[i]===keys[i+1]){
        const r=[...keys];r.splice(i,2);
        if(tryForm(r))return true;
        while(i+2<keys.length&&keys[i+2]===keys[i])i++;
      }
    }
    return false;
  }, [setsNeeded, isJP]);

  // Find chow options: sequences player can form with discarded tile
  const getChowOptions = useCallback((hand, tile) => {
    if(tile.suit==='字'||tile.suit==='花') return [];
    const opts=[];
    for(const [d1,d2] of [[-2,-1],[-1,1],[1,2]]){
      const k1=`${tile.num+d1}${tile.suit}`, k2=`${tile.num+d2}${tile.suit}`;
      const t1=hand.find(t=>tk(t)===k1), t2=hand.find(t=>tk(t)===k2&&t.id!==(t1?.id));
      if(t1&&t2) opts.push([t1,t2]);
    }
    return opts;
  }, []);

  const [wall,setWall]=useState([]);
  const [hands,setHands]=useState([]);
  const [melds,setMelds]=useState([]);
  const [discards,setDiscards]=useState([]);
  const [currentTile,setCurrentTile]=useState(null);
  const [turn,setTurn]=useState(0);
  const [selected,setSelected]=useState(null);
  const [phase,setPhase]=useState('init');
  const [message,setMessage]=useState('');
  const [dealer,setDealer]=useState(0);
  const [lastDiscard,setLastDiscard]=useState(null);
  const [claimOptions,setClaimOptions]=useState(null);
  const [winnerInfo,setWinnerInfo]=useState(null);
  const [turnCount,setTurnCount]=useState(0);
  const [riichi,setRiichi]=useState(Array(4).fill(false)); // per-player riichi status

  // Refs for AI to avoid stale closures
  const wallRef=useRef(wall); const handsRef=useRef(hands); const meldsRef=useRef(melds);
  const discardsRef=useRef(discards); const turnRef=useRef(turn); const dealerRef=useRef(dealer);
  const turnCountRef=useRef(turnCount); const riichiRef=useRef(riichi);
  useEffect(()=>{wallRef.current=wall;},[wall]);
  useEffect(()=>{handsRef.current=hands;},[hands]);
  useEffect(()=>{meldsRef.current=melds;},[melds]);
  useEffect(()=>{discardsRef.current=discards;},[discards]);
  useEffect(()=>{turnRef.current=turn;},[turn]);
  useEffect(()=>{dealerRef.current=dealer;},[dealer]);
  useEffect(()=>{turnCountRef.current=turnCount;},[turnCount]);
  useEffect(()=>{riichiRef.current=riichi;},[riichi]);

  // Check if hand is tenpai (one tile away from winning)
  const isTenpai = useCallback((hand, numM) => {
    // Try adding each possible tile and check if it completes the hand
    const testTiles = [];
    for (const s of MJ_SUITS) for (let n=1;n<=9;n++) testTiles.push({suit:s,num:n,display:`${n}${s}`});
    for (const d of [...MJ_WINDS,...MJ_DRAGONS]) testTiles.push({suit:'字',num:0,display:d});
    return testTiles.some(t => canWin([...hand,t],numM));
  }, [canWin]);

  // Yaku detection
  const detectYaku = useCallback((hand, playerMelds, winTile, isTsumo, pIdx, dlr, wallLen, tc) => {
    const yakus = [];
    const all = [...hand]; // hand includes winTile already
    const keys = all.map(t=>tk(t));
    const isClosed = (playerMelds||[]).every(m=>m.type==='kong'&&m.concealed);
    const isMenuzen = (playerMelds||[]).length===0; // truly closed
    const isTermOrHonor = (t) => t.suit==='字'||t.suit==='花'||t.num===1||t.num===9;
    const isHonor = (t) => t.suit==='字'||t.suit==='花';
    const isSimple = (t) => t.suit!=='字'&&t.suit!=='花'&&t.num>=2&&t.num<=8;
    const counts = {}; keys.forEach(k => counts[k]=(counts[k]||0)+1);
    const suits = new Set(all.filter(t=>t.suit!=='字'&&t.suit!=='花').map(t=>t.suit));
    const hasHonor = all.some(t=>isHonor(t));

    // === 役滿 Yakuman ===
    // 國士無雙 Kokushi Musou (13 orphans)
    if (isJP && isMenuzen) {
      const kokushi = ['1萬','9萬','1筒','9筒','1條','9條','東','南','西','北','中','發','白'];
      const has = kokushi.every(k => keys.includes(k));
      if (has && all.length===14) yakus.push({name:'國士無雙',han:'役滿',yakuman:true});
    }
    // 四暗刻 Suuankou
    if (isMenuzen) {
      const trips = Object.values(counts).filter(c=>c>=3).length;
      if (trips >= setsNeeded) yakus.push({name:'四暗刻',han:'役滿',yakuman:true});
    }
    // 大三元 Daisangen
    const dragonCnt = ['中','發','白'].filter(d=>counts[d]>=3).length;
    if (dragonCnt===3) yakus.push({name:'大三元',han:'役滿',yakuman:true});
    // 字一色 Tsuuiisou
    if (all.every(t=>isHonor(t))) yakus.push({name:'字一色',han:'役滿',yakuman:true});
    // 清老頭 Chinroutou
    if (all.every(t=>!isHonor(t)&&(t.num===1||t.num===9))) yakus.push({name:'清老頭',han:'役滿',yakuman:true});
    // 綠一色 Ryuuiisou
    const greenTiles = ['2條','3條','4條','6條','8條','發'];
    if (all.every(t=>greenTiles.includes(tk(t)))) yakus.push({name:'綠一色',han:'役滿',yakuman:true});
    // 天和 Tenhou (dealer wins on first draw)
    if (pIdx===dlr && isTsumo && tc===0) yakus.push({name:'天和',han:'役滿',yakuman:true});
    // 地和 Chiihou (non-dealer wins on first draw)  
    if (pIdx!==dlr && isTsumo && tc<=numP-1) yakus.push({name:'地和',han:'役滿',yakuman:true});

    if (yakus.some(y=>y.yakuman)) return yakus;

    // === 一般役 Normal Yaku ===
    // 門前清自摸和 Menzen Tsumo
    if (isMenuzen && isTsumo) yakus.push({name:'門前清自摸和',han:1});
    // 立直 (simplified - not implemented as action, auto-detect)
    // 斷么九 Tanyao (all simples)
    if (all.every(t=>isSimple(t))) yakus.push({name:'斷么九',han:1});
    // 役牌 Yakuhai
    if (counts['中']>=3) yakus.push({name:'役牌 中',han:1});
    if (counts['發']>=3) yakus.push({name:'役牌 發',han:1});
    if (counts['白']>=3) yakus.push({name:'役牌 白',han:1});
    const seatWind = MJ_WIND_NAMES[pIdx];
    if (counts[seatWind]>=3) yakus.push({name:`自風 ${seatWind}`,han:1});
    const roundWind = MJ_WIND_NAMES[dlr]; // simplified
    if (roundWind!==seatWind && counts[roundWind]>=3) yakus.push({name:`場風 ${roundWind}`,han:1});
    // 平和 Pinfu (all sequences + valueless pair + two-sided wait) - simplified
    if (isMenuzen && !all.some(t=>isHonor(t))) {
      const tripCount = Object.values(counts).filter(c=>c>=3).length;
      if (tripCount===0) yakus.push({name:'平和',han:1});
    }
    // 一盃口 Iipeiko (two identical sequences)
    if (isMenuzen) {
      const seqs = [];
      for (const t of all) {
        if (t.suit!=='字'&&t.suit!=='花'&&t.num<=7) {
          const k = `${t.num}${t.num+1}${t.num+2}${t.suit}`;
          const has = [tk(t),`${t.num+1}${t.suit}`,`${t.num+2}${t.suit}`].every(x=>keys.includes(x));
          if (has) seqs.push(k);
        }
      }
      const seqCounts = {};seqs.forEach(s=>seqCounts[s]=(seqCounts[s]||0)+1);
      if (Object.values(seqCounts).some(c=>c>=2)) yakus.push({name:'一盃口',han:1});
    }
    // 海底撈月 Haitei (last tile from wall, tsumo)
    if (isTsumo && wallLen===0) yakus.push({name:'海底撈月',han:1});
    // 河底撈魚 Houtei (last discard, ron)
    if (!isTsumo && wallLen===0) yakus.push({name:'河底撈魚',han:1});
    // 嶺上開花 Rinshan - would need kong flag, skip for now

    // === 2翻 ===
    // 對對和 Toitoi (all triplets)
    const tripCount = Object.values(counts).filter(c=>c>=3).length;
    const meldTrips = (playerMelds||[]).filter(m=>m.type==='pong'||m.type==='kong').length;
    if (tripCount + meldTrips >= setsNeeded) yakus.push({name:'對對和',han:2});
    // 三暗刻 San Ankou
    if (tripCount>=3 && isMenuzen) yakus.push({name:'三暗刻',han:2});
    // 混全帶么九 Chanta
    // 七對子 Chiitoitsu (7 pairs, JP only)
    if (isJP && isMenuzen && all.length===14) {
      const pairs = Object.values(counts).filter(c=>c===2).length;
      if (pairs===7) yakus.push({name:'七對子',han:2});
    }
    // 三色同順 Sanshoku Doujun
    for (let n=1;n<=7;n++){
      if(['萬','筒','條'].every(s=>{const k1=`${n}${s}`,k2=`${n+1}${s}`,k3=`${n+2}${s}`;return keys.includes(k1)&&keys.includes(k2)&&keys.includes(k3);})){
        yakus.push({name:'三色同順',han:isMenuzen?2:1});break;
      }
    }
    // 一氣通貫 Ittsu
    for (const s of ['萬','筒','條']){
      if([1,2,3,4,5,6,7,8,9].every(n=>keys.includes(`${n}${s}`))){
        yakus.push({name:'一氣通貫',han:isMenuzen?2:1});break;
      }
    }

    // === 3翻+ ===
    // 混一色 Honitsu
    if (suits.size===1 && hasHonor) yakus.push({name:'混一色',han:isMenuzen?3:2});
    // 清一色 Chinitsu
    if (suits.size===1 && !hasHonor) yakus.push({name:'清一色',han:isMenuzen?6:5});
    // 混老頭 Honroutou (all terminals + honors)
    if (all.every(t=>isTermOrHonor(t)) && hasHonor && suits.size>0) yakus.push({name:'混老頭',han:2});
    // 小三元 Shousangen
    if (dragonCnt===2 && ['中','發','白'].some(d=>counts[d]===2)) yakus.push({name:'小三元',han:2});

    // If no yaku found but hand is valid, give a basic win
    if (yakus.length===0) yakus.push({name:isTsumo?'自摸':'榮和',han:1});

    return yakus;
  }, [isJP, setsNeeded, numP]);

  // Build win info with yakus
  const makeWinInfo = useCallback((player, isTsumo, winTile) => {
    const hand = [...(hands[player]||[])];
    if (winTile && !hand.some(t=>t.id===winTile.id)) hand.push(winTile);
    const pm = melds[player]||[];
    const yakus = detectYaku(hand, pm, winTile, isTsumo, player, dealer, wall.length, turnCount);
    const isYakuman = yakus.some(y=>y.yakuman);
    const totalHan = isYakuman ? '役滿' : yakus.reduce((s,y)=>s+(y.han||0),0)+'翻';
    return { player, type:isTsumo?'自摸':'榮和', yakus, totalHan, isYakuman };
  }, [hands, melds, dealer, wall, turnCount, detectYaku]);

  const SUIT_ORDER = {'萬':0,'筒':1,'條':2,'字':3,'花':4};
  const HONOR_ORDER = {'東':1,'南':2,'西':3,'北':4,'中':5,'發':6,'白':7};
  const sortH = (h) => [...h].sort((a,b) => {
    const sa = SUIT_ORDER[a.suit]??9, sb = SUIT_ORDER[b.suit]??9;
    if (sa!==sb) return sa-sb;
    if (a.suit==='字'||a.suit==='花') return (HONOR_ORDER[a.display]||a.display.charCodeAt(0)) - (HONOR_ORDER[b.display]||b.display.charCodeAt(0));
    return a.num-b.num;
  });

  const deal = useCallback(() => {
    const np = numP;
    const threeP = np===3;
    const tiles = createMJTiles(!isJP, threeP);
    const h=[]; const m=[]; const d=[];
    for(let i=0;i<np;i++){h.push([]);m.push([]);d.push([]);}
    let idx=0;
    for(let p=0;p<np;p++) for(let i=0;i<handSize;i++) h[p].push(tiles[idx++]);
    // Handle flowers in initial hands (TW mahjong): set aside and replace
    const remWall = tiles.slice(idx);
    if (!isJP) {
      for(let p=0;p<np;p++){
        while(h[p].some(t=>t.suit==='花') && remWall.length>0){
          const fi=h[p].findIndex(t=>t.suit==='花');
          const flower=h[p].splice(fi,1)[0];
          m[p].push({tiles:[flower],type:'flower'});
          const rep=remWall.pop(); if(rep) h[p].push(rep);
        }
      }
    }
    h.forEach((hand,i)=>{h[i]=sortH(hand);});
    const dl=Math.floor(Math.random()*np);
    setDealer(dl);setWall(remWall);setHands(h);setMelds(m);setDiscards(d);
    setTurn(dl);setPhase('draw');setCurrentTile(null);setSelected(null);
    setLastDiscard(null);setClaimOptions(null);setWinnerInfo(null);setTurnCount(0);setRiichi(Array(np).fill(false));
    setMessage(`${MJ_WIND_NAMES[dl]||'P'+(dl+1)} 莊`);
  }, [isJP,handSize,numP]);

  useEffect(()=>{deal();},[deal]);

  const nextT=(t)=>(t+1)%numP;

  // Check claims after discard — priority: win > kong > pong > chow
  const checkClaims = useCallback((tile, byP, curH, curMelds) => {
    // Gather all possible claims
    let winClaim = null, kongClaim = null, pongClaim = null, chowClaim = null, playerClaim = null;
    for(let off=1;off<numP;off++){
      const p=(byP+off)%numP;
      const hand=curH[p]; const cnt=hand.filter(t=>tk(t)===tk(tile)).length;
      const nm=(curMelds&&curMelds[p])?curMelds[p].length:0;
      const tw=[...hand,tile]; const cw=canWin(tw,nm);
      const isNext=(byP+1)%numP===p;
      const chow=isNext?getChowOptions(hand,tile):[];
      if(p===0){
        if(cw||cnt>=3||cnt>=2||chow.length>0) playerClaim={canWin:cw,canKong:cnt>=3,canPong:cnt>=2,canChow:chow.length>0,chowOpts:chow,forPlayer:0,tile,by:byP};
      } else {
        if(cw && !winClaim) winClaim={autoWin:p};
        if(cnt>=3 && !kongClaim) kongClaim={autoKong:p,tile};
        if(cnt>=2 && !pongClaim) pongClaim={autoPong:p,tile};
        if(chow.length>0 && !chowClaim) chowClaim={autoChow:p,tile,chowOpts:chow};
      }
    }
    // Win has highest priority
    if(winClaim) return winClaim;
    // Player claims always shown for user decision
    if(playerClaim) return playerClaim;
    // AI claims by priority
    if(kongClaim) return kongClaim;
    if(pongClaim) return pongClaim;
    if(chowClaim) return chowClaim;
    return null;
  },[numP,canWin,getChowOptions]);

  // AI discard scoring: pick the most "isolated" tile to discard
  const aiPickDiscard = useCallback((hand) => {
    if(hand.length===0) return 0;
    const scores = hand.map((t,i) => {
      let s=0;
      const k=tk(t);
      // Pairs/triplets are valuable — don't discard
      const cnt=hand.filter(h=>tk(h)===k).length;
      if(cnt>=3) s-=80;
      if(cnt===2) s-=30;
      // Connected tiles (sequences) are valuable
      if(t.suit!=='字'&&t.suit!=='花'){
        if(hand.some(h=>h.suit===t.suit&&h.num===t.num-1)) s-=15;
        if(hand.some(h=>h.suit===t.suit&&h.num===t.num+1)) s-=15;
        if(hand.some(h=>h.suit===t.suit&&h.num===t.num-2)) s-=5;
        if(hand.some(h=>h.suit===t.suit&&h.num===t.num+2)) s-=5;
        // Terminals are less flexible
        if(t.num===1||t.num===9) s+=5;
      }
      // Honor tiles without pair/trip are isolated
      if(t.suit==='字'&&cnt===1) s+=10;
      // Small random
      s+=Math.random()*3;
      return {i,s};
    });
    scores.sort((a,b)=>b.s-a.s);
    return scores[0].i;
  },[]);

  const doAIClaim=(nh,nd,p,tile,type,chowOpts)=>{
    const isKong=type==='kong'; const isChow=type==='chow';
    let meldTiles;
    if(isChow){meldTiles=chowOpts[0];} else {meldTiles=nh[p].filter(t=>tk(t)===tk(tile)).slice(0,isKong?3:2);}
    nh[p]=sortH(nh[p].filter(t=>!meldTiles.some(mt=>mt.id===t.id)));
    const nm=meldsRef.current.map(m=>[...m]); nm[p].push({tiles:[...meldTiles,tile],type});
    setHands([...nh]);setMelds(nm);setTurn(p);setPhase('discard');
    setMessage(`${MJ_WIND_NAMES[p]||'P'+(p+1)} ${isKong?'槓':isChow?'吃':'碰'}!`);
    setTimeout(()=>{
      const di=aiPickDiscard(nh[p]);
      const ad=nh[p][di];nh[p].splice(di,1);nh[p]=sortH(nh[p]);
      nd[p]=[...nd[p],ad]; setHands([...nh]);setDiscards([...nd]);
      setLastDiscard({tile:ad,by:p});
      const next=nextT(p);setTurn(next);setPhase('draw');
      setMessage(next===0?'請摸牌':`${MJ_WIND_NAMES[next]||''}`);
    },600);
  };

  const drawTile=()=>{
    if(phase!=='draw'||turn!==0)return;
    if(wall.length===0){setPhase('end');setMessage('流局');return;}
    setTurnCount(c=>c+1);
    const nw=[...wall];let t=nw.pop();
    // Handle flower tiles: set aside and draw replacement
    let curMelds=melds;
    const nh0=[...hands[0]];
    nh0.push(t);
    while(nh0.some(ti=>ti.suit==='花') && nw.length>0) {
      const fi=nh0.findIndex(ti=>ti.suit==='花');
      const flower=nh0.splice(fi,1)[0];
      const nm2=curMelds.map(m=>[...m]);
      nm2[0]=[...(nm2[0]||[]),{tiles:[flower],type:'flower'}];
      curMelds=nm2;
      setMelds(nm2);
      t=nw.pop(); if(t) nh0.push(t);
    }
    // Remove the drawn tile from temp array since we handle it separately
    if(nh0.length>0 && t) nh0.pop();
    setWall(nw);
    if(!t){setPhase('end');setMessage('流局');return;}
    const nh=hands.map(h=>[...h]); nh[0]=nh0;
    setHands(nh);
    const allT=[...nh0,t];
    const cw=canWin(allT,(curMelds[0]||[]).length);
    const counts={};allT.forEach(ti=>{const k=tk(ti);counts[k]=(counts[k]||0)+1;});
    const hasAnK=!riichi[0] && Object.values(counts).some(c=>c>=4); // no kong during riichi
    if(cw||hasAnK){
      setCurrentTile(t);setPhase('discard');
      setClaimOptions({canWin:cw,canKong:hasAnK,canPong:false,canChow:false,forPlayer:0,selfDraw:true});
      setMessage(cw?(riichi[0]?'立直自摸!':'自摸!'):'可以暗槓!');return;
    }
    // If in riichi, auto-discard the drawn tile
    if(riichi[0]){
      const rnh=hands.map(h=>[...h]);
      const nd=discards.map(d=>[...d]); nd[0].push(t);
      setHands(rnh);setDiscards(nd);setCurrentTile(null);
      setLastDiscard({tile:t,by:0});
      const claim=checkClaims(t,0,rnh,melds);
      if(claim){
        if(claim.autoWin!==undefined){setWinnerInfo(makeWinInfo(claim.autoWin,false,t));setPhase('end');return;}
        if(claim.forPlayer===0){setClaimOptions(claim);setPhase('claim');return;}
      }
      const next=nextT(0);setTurn(next);setPhase('draw');
      setMessage(`${MJ_WIND_NAMES[next]}`);return;
    }
    setCurrentTile(t);setPhase('discard');setMessage('選牌打出');
  };

  const playerDiscard=(idx)=>{
    if(phase!=='discard'||turn!==0||claimOptions)return;
    const allT=[...hands[0]];if(currentTile)allT.push(currentTile);
    const disc=allT[idx]; const newH=sortH(allT.filter((_,i)=>i!==idx));
    const nh=hands.map(h=>[...h]);nh[0]=newH;
    const nd=discards.map(d=>[...d]);nd[0].push(disc);
    setHands(nh);setDiscards(nd);setCurrentTile(null);setSelected(null);
    setLastDiscard({tile:disc,by:0});
    const claim=checkClaims(disc,0,nh,melds);
    if(claim){
      if(claim.autoWin!==undefined){setWinnerInfo(makeWinInfo(claim.autoWin,false,disc));setPhase('end');setMessage(`${MJ_WIND_NAMES[claim.autoWin]} 胡牌!`);return;}
      if(claim.autoPong!==undefined||claim.autoKong!==undefined){
        const p=claim.autoPong??claim.autoKong;doAIClaim(nh,nd,p,disc,claim.autoKong!==undefined?'kong':'pong');return;
      }
      if(claim.autoChow!==undefined){doAIClaim(nh,nd,claim.autoChow,disc,'chow',claim.chowOpts);return;}
      if(claim.forPlayer===0){setClaimOptions(claim);setPhase('claim');setMessage('碰/槓/吃/胡?');return;}
    }
    const next=nextT(0);setTurn(next);setPhase('draw');setMessage(`${MJ_WIND_NAMES[next]||''}`);
  };

  const doPass=()=>{setClaimOptions(null);
    if(phase==='claim'){const next=nextT(lastDiscard.by);setTurn(next);setPhase('draw');setMessage(`${MJ_WIND_NAMES[next]||''}`);}
    else{setPhase('discard');setMessage('選牌打出');}
  };
  const doWin=()=>{if(!claimOptions?.canWin)return;
    setWinnerInfo(makeWinInfo(0,claimOptions.selfDraw,claimOptions.selfDraw?currentTile:lastDiscard?.tile));setPhase('end');setMessage(claimOptions.selfDraw?'自摸!':'胡牌!');setClaimOptions(null);
  };
  const doPong=()=>{if(!claimOptions?.canPong||!lastDiscard)return;
    const tile=lastDiscard.tile;const nh=hands.map(h=>[...h]);
    const mt=nh[0].filter(t=>tk(t)===tk(tile)).slice(0,2);
    nh[0]=sortH(nh[0].filter(t=>!mt.some(m=>m.id===t.id)));
    const nm=melds.map(m=>[...m]);nm[0].push({tiles:[...mt,tile],type:'pong'});
    setHands(nh);setMelds(nm);setCurrentTile(null);setClaimOptions(null);setTurn(0);setPhase('discard');setMessage('碰! 請打牌');
  };
  const doKong=()=>{if(!claimOptions?.canKong)return;
    const nh=hands.map(h=>[...h]);
    if(claimOptions.selfDraw){
      // 暗槓: find 4-of-a-kind in hand+currentTile
      const allT=[...nh[0]];if(currentTile)allT.push(currentTile);
      const counts={};allT.forEach(t=>{const k=tk(t);counts[k]=(counts[k]||0)+1;});
      const kk=Object.entries(counts).find(([,c])=>c>=4)?.[0];if(!kk)return;
      const kt=allT.filter(t=>tk(t)===kk).slice(0,4);
      const rem=[...allT];kt.forEach(k=>{const i=rem.findIndex(t=>t.id===k.id);if(i>=0)rem.splice(i,1);});
      nh[0]=sortH(rem);
      const nm=melds.map(m=>[...m]);nm[0].push({tiles:kt,type:'kong',concealed:true});
      setHands(nh);setMelds(nm);setClaimOptions(null);
      // Draw replacement tile
      if(wall.length>0){
        const nw=[...wall];const rep=nw.pop();setWall(nw);
        // Check win with replacement
        const testAll=[...nh[0],rep];
        const cw=canWin(testAll,nm[0].length);
        // Check another kong
        const rc={};testAll.forEach(t=>{const k=tk(t);rc[k]=(rc[k]||0)+1;});
        const hasAnK2=Object.values(rc).some(c=>c>=4);
        if(cw||hasAnK2){
          setCurrentTile(rep);setPhase('discard');
          setClaimOptions({canWin:cw,canKong:hasAnK2,canPong:false,canChow:false,forPlayer:0,selfDraw:true});
          setMessage(cw?'嶺上自摸!':'可再槓!');
        } else {
          setCurrentTile(rep);setPhase('discard');setMessage('暗槓! 補牌後請打牌');
        }
      } else { setCurrentTile(null);setPhase('discard');setMessage('暗槓!'); }
    } else {
      // 明槓: claim from discard
      const tile=lastDiscard.tile;const mt=nh[0].filter(t=>tk(t)===tk(tile)).slice(0,3);
      nh[0]=sortH(nh[0].filter(t=>!mt.some(m=>m.id===t.id)));
      const nm=melds.map(m=>[...m]);nm[0].push({tiles:[...mt,tile],type:'kong'});
      setHands(nh);setMelds(nm);setClaimOptions(null);
      if(wall.length>0){
        const nw=[...wall];const rep=nw.pop();setWall(nw);
        const testAll=[...nh[0],rep];
        const cw=canWin(testAll,nm[0].length);
        if(cw){
          setCurrentTile(rep);setPhase('discard');
          setClaimOptions({canWin:true,canKong:false,canPong:false,canChow:false,forPlayer:0,selfDraw:true});
          setMessage('嶺上自摸!');
        } else {
          setCurrentTile(rep);setPhase('discard');setMessage('槓! 補牌後請打牌');
        }
      } else { setCurrentTile(null);setPhase('discard');setMessage('槓!'); }
    }
  };
  const doChow=()=>{if(!claimOptions?.canChow||!lastDiscard)return;
    const tile=lastDiscard.tile;const opts=claimOptions.chowOpts;
    if(!opts||opts.length===0)return;
    const pick=opts[0];const nh=hands.map(h=>[...h]);
    nh[0]=sortH(nh[0].filter(t=>!pick.some(p=>p.id===t.id)));
    const nm=melds.map(m=>[...m]);nm[0].push({tiles:[...pick,tile],type:'chow'});
    setHands(nh);setMelds(nm);setCurrentTile(null);setClaimOptions(null);setTurn(0);setPhase('discard');setMessage('吃! 請打牌');
  };

  // Riichi declaration
  const canDeclareRiichi = phase==='discard' && turn===0 && !riichi[0] && (melds[0]||[]).length===0 && wall.length>=4;
  const doRiichi = (idx) => {
    const allT=[...hands[0]]; if(currentTile) allT.push(currentTile);
    // Must be tenpai after discarding idx
    const afterDiscard = allT.filter((_,i)=>i!==idx);
    if (!isTenpai(afterDiscard, 0)) { setMessage('聽牌才能立直'); return; }
    const disc = allT[idx];
    const newH = sortH(afterDiscard);
    const nh = hands.map(h=>[...h]); nh[0]=newH;
    const nd = discards.map(d=>[...d]); nd[0].push({...disc, riichi:true});
    const nr = [...riichi]; nr[0]=true;
    setHands(nh); setDiscards(nd); setCurrentTile(null); setSelected(null); setRiichi(nr);
    setLastDiscard({tile:disc,by:0});
    setMessage('立直!');
    const claim=checkClaims(disc,0,nh,melds);
    if(claim){
      if(claim.autoWin!==undefined){setWinnerInfo(makeWinInfo(claim.autoWin,false,disc));setPhase('end');return;}
      if(claim.forPlayer===0){setClaimOptions(claim);setPhase('claim');return;}
    }
    const next=nextT(0);setTurn(next);setPhase('draw');
  };

  // AI auto-play (uses refs to avoid stale closures)
  useEffect(()=>{
    if(phase!=='draw'||turn===0||winnerInfo)return;
    const curWall=wallRef.current;
    if(curWall.length===0){setPhase('end');setMessage('流局');return;}
    const timer=setTimeout(()=>{
      setTurnCount(c=>c+1);
      const nw=[...wallRef.current];const drawn=nw.pop();
      const nh=handsRef.current.map(h=>[...h]);
      const curMelds=meldsRef.current;
      nh[turn].push(drawn);

      // Handle flower tiles: set aside and draw replacement (Taiwan mahjong)
      while(nh[turn].some(t=>t.suit==='花') && nw.length>0) {
        const fi=nh[turn].findIndex(t=>t.suit==='花');
        const flower=nh[turn].splice(fi,1)[0];
        const nm2=curMelds.map(m=>[...m]);
        nm2[turn]=[...(nm2[turn]||[]),{tiles:[flower],type:'flower'}];
        // Update melds ref immediately for subsequent checks
        meldsRef.current=nm2;
        setMelds(nm2);
        const rep=nw.pop(); if(rep) nh[turn].push(rep);
      }

      if(canWin(nh[turn],(curMelds[turn]||[]).length)){
        setWinnerInfo(makeWinInfo(turn,true,drawn));setPhase('end');
        setMessage(`${MJ_WIND_NAMES[turn]} 自摸!`);setWall(nw);setHands(nh);return;
      }
      // Check concealed kong for AI
      const counts={};nh[turn].forEach(t=>{const k=tk(t);counts[k]=(counts[k]||0)+1;});
      const akk=Object.entries(counts).find(([,c])=>c>=4);
      if(akk&&nw.length>0){
        const kt=nh[turn].filter(t=>tk(t)===akk[0]).slice(0,4);
        nh[turn]=sortH(nh[turn].filter(t=>!kt.some(k=>k.id===t.id)));
        const nm=curMelds.map(m=>[...m]);nm[turn].push({tiles:kt,type:'kong',concealed:true});
        const rep=nw.pop();nh[turn].push(rep);nh[turn]=sortH(nh[turn]);
        setMelds(nm);
        meldsRef.current=nm;
        // Check if replacement tile completes win
        if(canWin(nh[turn],nm[turn].length)){
          setWinnerInfo(makeWinInfo(turn,true,rep));setPhase('end');
          setMessage(`${MJ_WIND_NAMES[turn]} 嶺上自摸!`);setWall(nw);setHands(nh);return;
        }
      }
      // Smart discard
      const di=aiPickDiscard(nh[turn]);
      const disc=nh[turn][di];nh[turn].splice(di,1);nh[turn]=sortH(nh[turn]);
      const nd=discardsRef.current.map(d=>[...d]);nd[turn].push(disc);
      setWall(nw);setHands(nh);setDiscards(nd);setLastDiscard({tile:disc,by:turn});
      const claim=checkClaims(disc,turn,nh,meldsRef.current);
      if(claim){
        if(claim.autoWin!==undefined){setWinnerInfo(makeWinInfo(claim.autoWin,false,disc));setPhase('end');setMessage(`${MJ_WIND_NAMES[claim.autoWin]} 胡牌!`);return;}
        if(claim.autoPong!==undefined||claim.autoKong!==undefined){
          const p=claim.autoPong??claim.autoKong;doAIClaim(nh,nd,p,disc,claim.autoKong!==undefined?'kong':'pong');return;
        }
        if(claim.autoChow!==undefined){doAIClaim(nh,nd,claim.autoChow,disc,'chow',claim.chowOpts);return;}
        if(claim.forPlayer===0){setClaimOptions(claim);setPhase('claim');setMessage('碰/槓/吃/胡?');return;}
      }
      const next=nextT(turn);setTurn(next);setPhase('draw');
      setMessage(next===0?`剩${nw.length}張`:`${MJ_WIND_NAMES[next]||''}`);
    },500);
    return ()=>clearTimeout(timer);
  },[turn,phase,winnerInfo,canWin,makeWinInfo,checkClaims,aiPickDiscard,nextT,numP]);

  const playerHand=hands[0]||[];
  const allDisplay=currentTile?[...playerHand,currentTile]:playerHand;
  // Seat mapping: 0=bottom(you), then clockwise
  const seatOf=(offset)=>{
    if(numP===4) return [0,3,2,1][offset]; // you, right, top, left
    if(numP===3) return [0,2,1][offset]; // you, top-right, top-left
    return [0,1][offset];
  };
  const topP=numP===4?seatOf(2):seatOf(numP===3?2:1);
  const leftP=numP===4?seatOf(3):(numP===3?seatOf(2):-1);
  const rightP=numP>=4?seatOf(1):(numP===3?seatOf(1):-1);

  // === Meld rendering (雀魂 style) ===
  // called tile is laid sideways, position depends on which player it was called from
  const renderMeld = (m, playerIdx, isSmall) => {
    if(m.type==='flower') return m.tiles.map((t,j)=><MahjongTile key={j} tile={t} small/>);
    const tiles = m.tiles;
    const isConcealed = m.concealed;
    const isKong = m.type==='kong';
    const callIdx = tiles.length-1; // last tile is the called one

    if(isConcealed && isKong) {
      // Concealed kong: first and last face down, middle two face up
      return tiles.map((t,j) => (
        <MahjongTile key={j} tile={t} small={isSmall} faceDown={j===0||j===3}/>
      ));
    }
    // Open meld: called tile is sideways
    return tiles.map((t,j) => (
      <div key={j} style={{
        display:'inline-flex',
        transform: j===callIdx ? 'rotate(90deg)' : 'none',
        margin: j===callIdx ? (isSmall?'2px 3px':'4px 5px') : '0',
        transformOrigin: 'center center',
      }}>
        <MahjongTile tile={t} small={isSmall}/>
      </div>
    ));
  };

  // === River rendering (6 tiles per row, 雀魂 style) ===
  const renderRiver = (playerIdx, rot) => {
    const d = discards[playerIdx]||[];
    const rows = [];
    for(let i=0;i<d.length;i+=6) rows.push(d.slice(i,i+6));
    return (
      <div style={{transform:rot?`rotate(${rot}deg)`:'none',transformOrigin:'center center'}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:'flex',gap:1,justifyContent:'center',marginBottom:1}}>
            {row.map((t,ti)=>(
              <div key={ri*6+ti} style={{
                transform:t.riichi?'rotate(90deg)':'none',
                margin:t.riichi?'0 6px':'0',
              }}>
                <MahjongTile tile={t} small/>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // === Opponent hand (face down, oriented) ===
  const renderOppHand = (playerIdx, orientation) => {
    const h=hands[playerIdx]||[];
    const count=Math.min(h.length,handSize);
    const isVert = orientation==='left'||orientation==='right';
    const tw=12, th=16; // small back dimensions
    return (
      <div style={{
        display:'flex',
        flexDirection: isVert?'column':'row',
        gap:1,
        alignItems:'center',
      }}>
        {Array.from({length:count},(_,i)=>(
          <div key={i} style={{
            width:isVert?th:tw, height:isVert?tw:th,
            borderRadius:2,
            background:'linear-gradient(135deg, #1a6a3a, #0e4a22)',
            border:'1px solid #2a8a4a',
            boxShadow:'inset 0 1px 2px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.3)',
          }}/>
        ))}
      </div>
    );
  };

  // === Opponent melds (oriented) ===
  const renderOppMelds = (playerIdx, orientation) => {
    const ms=melds[playerIdx]||[];
    if(ms.length===0) return null;
    const isVert = orientation==='left'||orientation==='right';
    const rot = orientation==='left'?90:orientation==='right'?-90:180;
    return (
      <div style={{
        display:'flex',
        flexDirection: isVert?'column':'row',
        gap:3,
        transform: `rotate(${rot}deg)`,
        transformOrigin:'center center',
      }}>
        {ms.map((m,i)=>(
          <div key={i} style={{display:'flex',gap:0,alignItems:'center'}}>
            {renderMeld(m,playerIdx,true)}
          </div>
        ))}
      </div>
    );
  };

  // Table size constants
  const TW=520, TH=520; // virtual table area
  const RIVER_W=6*20, RIVER_OFF=60; // river area sizing

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#0a0a14',overflow:'hidden',fontFamily:fontSans,userSelect:'none'}}>
      {/* Header bar */}
      <div style={{display:'flex',alignItems:'center',padding:'6px 10px',background:'rgba(0,0,0,0.7)',gap:6,flexShrink:0,zIndex:20,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:COLORS.gold,cursor:'pointer',fontSize:18,fontFamily:font}}>←</button>
        <span style={{fontSize:13,fontFamily:font,color:COLORS.gold,fontWeight:700}}>{isJP?'日式麻將':'台式麻將'}</span>
        <div style={{flex:1}}/>
        {[3,4].map(n=><button key={n} onClick={()=>setNumP(n)} style={{
          padding:'3px 10px',fontSize:11,borderRadius:4,border:'none',cursor:'pointer',
          background:numP===n?COLORS.gold:'rgba(255,255,255,0.08)',
          color:numP===n?'#000':'#777',fontFamily:fontSans,fontWeight:numP===n?600:400,
        }}>{n}人</button>)}
        <button onClick={deal} style={{padding:'3px 10px',fontSize:11,borderRadius:4,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:'#777',fontFamily:fontSans,marginLeft:4}}>重開</button>
      </div>

      {/* === FULL SCREEN TABLE (雀魂 style) === */}
      <div style={{flex:1,position:'relative',overflow:'hidden',
        background:'radial-gradient(ellipse at 50% 50%, #1a6b3a 0%, #0f5028 40%, #0a3c1e 70%, #062a14 100%)',
      }}>
        {/* Table felt texture overlay */}
        <div style={{position:'absolute',inset:0,
          background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)',
          pointerEvents:'none',zIndex:0,
        }}/>
        {/* Table border frame */}
        <div style={{position:'absolute',inset:'3%',border:'2px solid rgba(255,220,100,0.08)',borderRadius:16,pointerEvents:'none',zIndex:0}}/>

        {/* ====== TOP PLAYER ====== */}
        {numP>=3 && <>
          {/* Top hand (face down, horizontal, upside-down) */}
          <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:4,zIndex:5}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {renderOppMelds(topP,'top')}
              <div style={{display:'flex',flexDirection:'row-reverse',gap:1}}>
                {renderOppHand(topP,'top').props.children}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:10,fontFamily:font,
                color:turn===topP?'#ffe066':'rgba(255,255,255,0.3)',
                fontWeight:turn===topP?700:400,
                textShadow:turn===topP?'0 0 8px rgba(255,224,102,0.5)':'none',
              }}>{MJ_WIND_NAMES[topP]}{riichi[topP]?' 立直':''}</span>
            </div>
          </div>
          {/* Top river (rotated 180°, above center) */}
          <div style={{position:'absolute',top:'18%',left:'50%',transform:'translateX(-50%)',zIndex:4}}>
            {renderRiver(topP, 180)}
          </div>
        </>}

        {/* ====== LEFT PLAYER ====== */}
        {((numP>=4)||(numP===3)) && leftP>=0 && <>
          <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'row',alignItems:'center',gap:4,zIndex:5}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <span style={{fontSize:10,fontFamily:font,writingMode:'vertical-rl',
                color:turn===leftP?'#ffe066':'rgba(255,255,255,0.3)',
                fontWeight:turn===leftP?700:400,
                textShadow:turn===leftP?'0 0 8px rgba(255,224,102,0.5)':'none',
              }}>{MJ_WIND_NAMES[leftP]}{riichi[leftP]?' 立直':''}</span>
              {renderOppHand(leftP,'left')}
              {renderOppMelds(leftP,'left')}
            </div>
          </div>
          {/* Left river (rotated 90°, left of center) */}
          <div style={{position:'absolute',left:'18%',top:'50%',transform:'translate(-50%,-50%)',zIndex:4}}>
            {renderRiver(leftP, 90)}
          </div>
        </>}

        {/* ====== RIGHT PLAYER ====== */}
        {numP>=4 && rightP>=0 && <>
          <div style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'row',alignItems:'center',gap:4,zIndex:5}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <span style={{fontSize:10,fontFamily:font,writingMode:'vertical-rl',
                color:turn===rightP?'#ffe066':'rgba(255,255,255,0.3)',
                fontWeight:turn===rightP?700:400,
                textShadow:turn===rightP?'0 0 8px rgba(255,224,102,0.5)':'none',
              }}>{MJ_WIND_NAMES[rightP]}{riichi[rightP]?' 立直':''}</span>
              {renderOppHand(rightP,'right')}
              {renderOppMelds(rightP,'right')}
            </div>
          </div>
          {/* Right river (rotated -90°, right of center) */}
          <div style={{position:'absolute',right:'18%',top:'50%',transform:'translate(50%,-50%)',zIndex:4}}>
            {renderRiver(rightP, -90)}
          </div>
        </>}

        {/* ====== CENTER INFO (wind indicator like 雀魂) ====== */}
        <div style={{position:'absolute',left:'50%',top:'45%',transform:'translate(-50%,-50%)',zIndex:6}}>
          <div style={{
            width:80,height:80,borderRadius:8,
            background:'rgba(0,0,0,0.5)',
            border:'1px solid rgba(255,220,100,0.15)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
          }}>
            <span style={{fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:1}}>莊 {MJ_WIND_NAMES[dealer]}</span>
            <div style={{
              fontSize:28,fontFamily:font,fontWeight:700,lineHeight:1,
              color: turn===0 ? '#ffe066' : 'rgba(255,255,255,0.5)',
              textShadow: turn===0 ? '0 0 12px rgba(255,224,102,0.6)' : 'none',
            }}>{MJ_WIND_NAMES[turn]}</div>
            <span style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>殘 {wall.length}</span>
          </div>
        </div>

        {/* ====== YOUR RIVER (bottom, facing up) ====== */}
        <div style={{position:'absolute',bottom:'26%',left:'50%',transform:'translateX(-50%)',zIndex:4}}>
          {renderRiver(0, 0)}
        </div>

        {/* ====== MESSAGE ====== */}
        <div style={{position:'absolute',left:'50%',top:'62%',transform:'translateX(-50%)',zIndex:8}}>
          <span style={{fontSize:12,color:'#ffe066',textShadow:'0 1px 8px rgba(0,0,0,0.9)',fontFamily:font,letterSpacing:1}}>{message}</span>
        </div>

        {/* ====== WINNER OVERLAY ====== */}
        {winnerInfo && (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,backdropFilter:'blur(4px)'}}>
            <div style={{padding:'24px 36px',background:'linear-gradient(135deg,#1a1408,#2a2010)',borderRadius:16,border:'2px solid #ffe066',textAlign:'center',maxWidth:'85vw',boxShadow:'0 8px 40px rgba(255,224,102,0.2)'}}>
              <div style={{fontSize:24,fontFamily:font,color:'#ffe066',fontWeight:700,marginBottom:12}}>{winnerInfo.player===0?'你':MJ_WIND_NAMES[winnerInfo.player]+'家'} {winnerInfo.type}!</div>
              {winnerInfo.yakus&&<div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
                {winnerInfo.yakus.map((y,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',gap:20,fontSize:14,fontFamily:font}}>
                    <span style={{color:y.yakuman?'#ff6666':'#e8e0d0'}}>{y.name}</span>
                    <span style={{color:y.yakuman?'#ff6666':COLORS.gold,fontWeight:700}}>{y.yakuman?'役滿':y.han+'翻'}</span>
                  </div>
                ))}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.15)',paddingTop:6,display:'flex',justifyContent:'space-between',fontSize:16,fontFamily:font}}>
                  <span style={{color:'#e8e0d0'}}>合計</span>
                  <span style={{color:winnerInfo.isYakuman?'#ff6666':COLORS.gold,fontWeight:700,fontSize:20}}>{winnerInfo.totalHan}</span>
                </div>
              </div>}
              <button onClick={deal} style={{padding:'10px 32px',background:'linear-gradient(180deg,#e0c050,#c4a030)',color:'#1a1408',border:'none',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,letterSpacing:2}}>再來一局</button>
            </div>
          </div>
        )}

        {/* ====== ACTION BUTTONS + YOUR HAND (bottom) ====== */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:15}}>
          {/* Action buttons */}
          <div style={{display:'flex',justifyContent:'center',gap:8,padding:'6px 0'}}>
            {claimOptions&&claimOptions.forPlayer===0&&<>
              {claimOptions.canWin&&<button onClick={doWin} style={{padding:'8px 20px',background:'linear-gradient(180deg,#e84040,#c03030)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,boxShadow:'0 4px 12px rgba(232,64,64,0.3)'}}>胡</button>}
              {claimOptions.canKong&&<button onClick={doKong} style={{padding:'8px 20px',background:'linear-gradient(180deg,#e0a020,#c08818)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,boxShadow:'0 4px 12px rgba(224,160,32,0.3)'}}>槓</button>}
              {claimOptions.canPong&&<button onClick={doPong} style={{padding:'8px 20px',background:'linear-gradient(180deg,#4088d0,#3060a0)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,boxShadow:'0 4px 12px rgba(64,136,208,0.3)'}}>碰</button>}
              {claimOptions.canChow&&<button onClick={doChow} style={{padding:'8px 20px',background:'linear-gradient(180deg,#40b060,#308840)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,boxShadow:'0 4px 12px rgba(64,176,96,0.3)'}}>吃</button>}
              <button onClick={doPass} style={{padding:'8px 20px',background:'rgba(255,255,255,0.06)',color:'#666',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer'}}>過</button>
            </>}
            {phase==='draw'&&turn===0&&!winnerInfo&&(
              <button onClick={drawTile} style={{padding:'10px 40px',background:'linear-gradient(180deg,#e0c050,#c4a030)',color:'#1a1408',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:16,fontFamily:font,cursor:'pointer',letterSpacing:6,fontWeight:700,boxShadow:'0 4px 16px rgba(224,192,80,0.3)'}}>摸牌</button>
            )}
            {phase==='discard'&&turn===0&&!claimOptions&&!riichi[0]&&canDeclareRiichi&&isTenpai(hands[0]||[],(melds[0]||[]).length)&&(
              <button onClick={()=>{if(selected!==null)doRiichi(selected);else setMessage('先選牌再立直');}} style={{padding:'8px 20px',background:'linear-gradient(180deg,#d060d0,#a040a0)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:15,fontFamily:font,cursor:'pointer',fontWeight:700,boxShadow:'0 4px 12px rgba(208,96,208,0.3)'}}>立直</button>
            )}
          </div>
          {phase==='discard'&&turn===0&&!claimOptions&&!riichi[0]&&<div style={{textAlign:'center',fontSize:10,color:'rgba(255,255,255,0.3)',paddingBottom:2}}>點選牌後再點一次打出</div>}
          {riichi[0]&&phase==='draw'&&turn===0&&<div style={{textAlign:'center',fontSize:10,color:'#d060d0',paddingBottom:2,fontFamily:font}}>立直中</div>}

          {/* Your hand + melds (雀魂 bottom bar) */}
          <div style={{
            background:'linear-gradient(180deg,rgba(18,12,6,0.9),rgba(28,20,10,0.96))',
            borderTop:'1px solid rgba(255,220,100,0.08)',
            padding:'4px 8px 8px',
            display:'flex',alignItems:'flex-end',justifyContent:'center',gap:0,
          }}>
            {/* Your melds (left side, 雀魂 style: melds are to the right but we put left for space) */}
            {(melds[0]||[]).length>0 && (
              <div style={{display:'flex',gap:4,alignItems:'flex-end',marginRight:10,flexShrink:0}}>
                {(melds[0]||[]).map((m,i)=>(
                  <div key={`m${i}`} style={{display:'flex',gap:0,alignItems:'flex-end',
                    background:'rgba(255,255,255,0.03)',borderRadius:4,padding:'2px 1px',
                  }}>
                    {renderMeld(m,0,false)}
                  </div>
                ))}
              </div>
            )}
            {/* Hand tiles */}
            <div style={{display:'flex',gap:2,alignItems:'flex-end',overflowX:'auto',WebkitOverflowScrolling:'touch',paddingBottom:2}}>
              {allDisplay.map((t,i)=>(
                <MahjongTile key={t.id} tile={t} selected={selected===i} drawn={currentTile&&i===allDisplay.length-1}
                  onClick={()=>{if(phase==='discard'&&turn===0&&!claimOptions&&!riichi[0]){if(selected===i)playerDiscard(i);else setSelected(i);}}}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// HOME SCREEN
// ============================================================
function HomeScreen({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ minHeight:'100vh', background:COLORS.bg, fontFamily:fontSans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 640px) { .mj-landscape-hint { display:block; } }
        @keyframes lastPulse { 0%,100%{box-shadow:0 0 0 2px #ffe066,0 0 8px #ffe06688;} 50%{box-shadow:0 0 0 3px #ffe066,0 0 16px #ffe066aa;} }
        body { background: ${COLORS.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>
      {/* Header */}
      <div style={{
        padding:'48px 32px 32px', textAlign:'center',
        background:`linear-gradient(180deg, ${COLORS.bgCard} 0%, ${COLORS.bg} 100%)`,
        borderBottom:`1px solid ${COLORS.border}`,
      }}>
        <div style={{ fontSize:14, letterSpacing:8, color:COLORS.goldDim, marginBottom:12, fontFamily:fontSans, fontWeight:300 }}>HAO0321 STUDIO</div>
        <h1 style={{ fontFamily:font, fontSize:42, color:COLORS.gold, fontWeight:700, marginBottom:8, letterSpacing:4 }}>棋牌大師</h1>
        <div style={{ fontSize:14, color:COLORS.textDim, letterSpacing:2 }}>BOARD GAME COLLECTION</div>
        <div style={{ width:60, height:2, background:COLORS.gold, margin:'20px auto 0', opacity:0.5 }}/>
      </div>
      {/* Game Grid */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
          {GAMES.map((g, i) => (
            <div key={g.id}
              onClick={() => onSelect(g.id)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered===i ? COLORS.bgHover : COLORS.bgCard,
                border: `1px solid ${hovered===i ? COLORS.goldDim : COLORS.border}`,
                borderRadius: 12, padding: 24, cursor: 'pointer',
                transition: 'all 0.25s ease',
                transform: hovered===i ? 'translateY(-4px)' : 'none',
                boxShadow: hovered===i ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${COLORS.goldDim}` : '0 2px 8px rgba(0,0,0,0.2)',
              }}>
              <div style={{
                width:48, height:48, borderRadius:8,
                background:`linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.gold}08)`,
                border:`1px solid ${COLORS.gold}30`,
                display:'flex', alignItems:'center', justifyContent:'center',
                marginBottom:16, fontFamily:font, fontSize:22, color:COLORS.gold,
              }}>{g.icon}</div>
              <div style={{ fontFamily:font, fontSize:18, color:COLORS.text, marginBottom:4 }}>{g.name}</div>
              <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom:8, letterSpacing:1 }}>{g.sub}</div>
              <div style={{ fontSize:12, color:COLORS.textDim, lineHeight:1.5 }}>{g.desc}</div>
              <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:COLORS.green }}/>
                <span style={{ fontSize:10, color:COLORS.textMuted }}>{g.cat === '牌' ? '單人 / 四人' : '雙人對戰'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div style={{ textAlign:'center', padding:'32px 0', borderTop:`1px solid ${COLORS.border}`, marginTop:40 }}>
        <div style={{ fontSize:11, color:COLORS.textMuted, letterSpacing:2 }}>HAO0321 STUDIO -- BOARD GAME COLLECTION v1.0</div>
      </div>
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [game, setGame] = useState(null);
  const back = () => setGame(null);

  if (!game) return <HomeScreen onSelect={setGame} />;
  switch (game) {
    case 'xiangqi': return <XiangqiGame onBack={back} />;
    case 'darkchess': return <DarkChessGame onBack={back} />;
    case 'go': return <GoGame onBack={back} />;
    case 'gomoku': return <GomokuGame onBack={back} />;
    case 'flight': return <FlightGame onBack={back} />;
    case 'checkers': return <CheckersGame onBack={back} />;
    case 'jpmahjong': return <MahjongGame onBack={back} variant="jp" />;
    case 'twmahjong': return <MahjongGame onBack={back} variant="tw" />;
    default: return <HomeScreen onSelect={setGame} />;
  }
}
