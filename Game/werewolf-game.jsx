import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ━━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const R = { W: "狼人", S: "預言家", D: "醫生", V: "村民", H: "獵人" };
const RICON = { 狼人: "🐺", 預言家: "🔮", 醫生: "💉", 村民: "👤", 獵人: "🏹" };
const RCOL = { 狼人: "#ff4757", 預言家: "#c084fc", 醫生: "#34d399", 村民: "#60a5fa", 獵人: "#fbbf24" };
const NAMES = ["月影", "星辰", "幽蘭", "風鈴", "雪見", "紫霧", "曉夢"];
const AVATARS = ["🌙", "⭐", "🌸", "🎐", "❄️", "💜", "🌅"];

function pick(a){return a[Math.floor(Math.random()*a.length)];}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

// ━━━ AI BRAIN (same logic, compacted) ━━━━━━━━━━━━━━━━━━━━━━━━
class AIBrain {
  constructor(ps){this.sus={};this.sr={};this.lp=null;this.ah=[];this.dh=[];this.pa=null;ps.forEach(p=>{this.sus[p.id]={};ps.forEach(q=>{if(p.id!==q.id)this.sus[p.id][q.id]=0.5;});});}
  recAcc(f,t){this.ah.push({from:f,to:t});}
  recDeath(id){this.dh.push(id);}
  recSeer(id,w){this.sr[id]=w;}
  setPA(id){this.pa=id;}
  updSus(ps){const al=ps.filter(p=>p.alive);al.forEach(ai=>{if(ai.isPlayer)return;al.forEach(t=>{if(ai.id===t.id)return;if(ai.role===R.W&&t.role===R.W){this.sus[ai.id][t.id]=0.05;return;}if(ai.role===R.S&&this.sr[t.id]!==undefined){this.sus[ai.id][t.id]=this.sr[t.id]?0.95:0.08;return;}let s=this.sus[ai.id]?.[t.id]??0.5;s+=this.ah.filter(a=>a.to===ai.id&&a.from===t.id).length*0.08;if(this.pa!=null&&t.id===this.pa&&ai.role!==R.W)s+=0.06;if(ai.role===R.W&&this.pa===ai.id)this.sus[ai.id][0]=Math.min(0.95,(this.sus[ai.id][0]||0.5)+0.12);s+=(Math.random()-0.45)*0.1;this.sus[ai.id][t.id]=Math.max(0.05,Math.min(0.95,s));});});}
  wolfKill(ws,ps){const al=ps.filter(p=>p.alive&&p.role!==R.W);if(!al.length)return null;for(const r of[R.S,R.D]){const t=al.filter(p=>p.role===r);if(t.length)return pick(t);}if(this.pa!=null){const aw=ws.find(w=>w.id===this.pa);if(aw){const pl=al.find(p=>p.id===0);if(pl&&Math.random()>0.4)return pl;}}for(const r of[R.H,R.V]){const t=al.filter(p=>p.role===r);if(t.length)return pick(t);}return pick(al);}
  seerTgt(sid,ps){const al=ps.filter(p=>p.alive&&p.id!==sid&&this.sr[p.id]===undefined);if(!al.length)return null;al.sort((a,b)=>(this.sus[sid]?.[b.id]??0.5)-(this.sus[sid]?.[a.id]??0.5));return al[0];}
  docTgt(did,ps){const al=ps.filter(p=>p.alive);const c=al.filter(p=>p.id!==this.lp);if(!c.length){this.lp=null;return pick(al);}if(Math.random()<0.3){const s=c.find(p=>p.id===did);if(s){this.lp=s.id;return s;}}c.sort((a,b)=>(this.sus[did]?.[a.id]??0.5)-(this.sus[did]?.[b.id]??0.5));this.lp=c[0].id;return c[0];}
  getVote(vid,vr,ps){const al=ps.filter(p=>p.alive&&p.id!==vid);if(!al.length)return null;if(vr===R.W){const nw=al.filter(p=>p.role!==R.W);if(!nw.length)return pick(al);if(this.pa!=null){const pl=nw.find(p=>p.id===0);if(pl&&Math.random()>0.35)return pl;}for(const r of[R.S,R.D,R.H,R.V]){const t=nw.filter(p=>p.role===r);if(t.length)return pick(t);}return pick(nw);}al.sort((a,b)=>(this.sus[vid]?.[b.id]??0.5)-(this.sus[vid]?.[a.id]??0.5));const r=Math.random();if(r<0.6)return al[0];if(r<0.85&&al[1])return al[1];return pick(al);}
  react(sp,ps,type,tid){if(!type)return null;const al=ps.filter(p=>p.alive&&p.id!==sp.id);if(!al.length)return null;if(type==="accuse"&&tid!=null){if(sp.id===tid&&sp.role===R.W)return pick(["你指控我？我才覺得你可疑！有什麼證據嗎？","無中生有！我是清白的，亂指控只會害好人。","笑話，我從第一天就在幫村民分析。"]);if(sp.id===tid)return pick(["你懷疑我？可以理解，但我真的是好人。","先別急著投我，再討論看看。"]);if(sp.role===R.W){const t=ps.find(p=>p.id===tid);return t?pick([`同意！${t.name}確實很可疑。`,`我也覺得${t.name}有問題。`]):null;}const t=ps.find(p=>p.id===tid);return t&&t.role===R.W?pick([`你說得有道理，${t.name}確實需要解釋。`,`讓我再想想...有點道理。`]):null;}if(type==="defend"){return sp.role===R.W?pick(["空口白話誰都會說。","辯解不太有說服力。"]):pick(["暫時相信你，先看看其他人。","說法還算合理。"]);}return null;}
  genSpeech(sp,ps,d){const al=ps.filter(p=>p.alive&&p.id!==sp.id);if(!al.length)return null;let mx=0,st=al[0];al.forEach(p=>{const s=this.sus[sp.id]?.[p.id]??0.5;if(s>mx){mx=s;st=p;}});if(sp.role===R.W){const nw=al.filter(p=>p.role!==R.W);const fr=nw.length?pick(nw):pick(al);this.recAcc(sp.id,fr.id);return pick([`${fr.name}從一開始就很低調，這種人最可疑。`,`${fr.name}的發言前後矛盾，我越想越不對。`,`有沒有人注意${fr.name}好像在引導投票？`,`我是村民，覺得${fr.name}是狼人機率很高。`,d>2?`時間不多了，我強烈懷疑${fr.name}。`:`先觀察，但${fr.name}讓我不安。`]);}if(sp.role===R.S){const ck=Object.entries(this.sr);if(ck.length&&(Math.random()>0.2||d>1)){const[tid,isW]=pick(ck);const tp=ps.find(p=>p.id===parseInt(tid));if(tp&&tp.alive){if(isW){this.recAcc(sp.id,tp.id);return pick([`我跳預言家！昨晚查了${tp.name}，是狼人！請投他！`,`緊急！我是預言家，${tp.name}是狼人🐺！`]);}return pick([`我是預言家，驗過${tp.name}是好人。`,`報告，${tp.name}是清白的。`]);}}this.recAcc(sp.id,st.id);return pick([`直覺告訴我${st.name}很可疑。`,`${st.name}表現不正常。`]);}if(sp.role===R.D)return pick([`冷靜分析，${st.name}需要解釋。`,`觀察了每人的反應，${st.name}不對。`,`保護好關鍵角色，懷疑${st.name}。`]);if(sp.role===R.H)return pick([`我有底牌不怕被投，${st.name}解釋清楚。`,`我盯上${st.name}了。`]);this.recAcc(sp.id,st.id);return pick([`觀察到${st.name}行為很奇怪。`,`${st.name}關鍵時刻沉默讓我擔心。`,`靠邏輯覺得${st.name}最可疑。`,d===1?`第一天資訊不多，但${st.name}讓我預感不好。`:`第${d}天了，指控${st.name}。`]);}
}

function initGame(){const pool=shuffle([R.W,R.W,R.S,R.D,R.H,R.V,R.V,R.V]);return[{id:0,name:"你",avatar:"🎭",role:pool[0],alive:true,isPlayer:true},...NAMES.map((n,i)=>({id:i+1,name:n,avatar:AVATARS[i],role:pool[i+1],alive:true,isPlayer:false}))];}

// ━━━ GLOBAL CSS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Noto+Sans+TC:wght@300;400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:9px}
@keyframes float{0%{transform:translateY(0) scale(1);opacity:.25}50%{opacity:.5}100%{transform:translateY(-40px) scale(1.6);opacity:.05}}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes breathe{0%,100%{filter:drop-shadow(0 0 20px rgba(255,71,87,.15))}50%{filter:drop-shadow(0 0 50px rgba(255,71,87,.35))}}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.85}}
@keyframes moonGlow{0%,100%{box-shadow:0 0 60px 20px rgba(200,200,255,.03)}50%{box-shadow:0 0 80px 30px rgba(200,200,255,.06)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ripple{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}
`;

// ━━━ PARTICLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Particles({count=20,color="rgba(255,70,87,.1)"}){
  const pts=useMemo(()=>Array.from({length:count},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,s:1.5+Math.random()*3,d:12+Math.random()*20,dl:Math.random()*8})),[count]);
  return <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>{pts.map(p=><div key={p.id} style={{position:"absolute",left:p.x+"%",top:p.y+"%",width:p.s,height:p.s,borderRadius:"50%",background:color,animation:`float ${p.d}s ease-in-out ${p.dl}s infinite alternate`}}/>)}</div>;
}

// ━━━ MOON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Moon({size=120,top="6%",opacity=1}){
  return (
    <div style={{position:"absolute",top,left:"50%",transform:"translateX(-50%)",zIndex:0,opacity,transition:"opacity 1.5s"}}>
      <div style={{width:size,height:size,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%, #e8e4d4 0%, #c8c4b4 40%, #a8a498 70%, #888478 100%)",boxShadow:`0 0 ${size/2}px ${size/6}px rgba(200,200,180,.08), inset -${size/6}px -${size/8}px ${size/4}px rgba(0,0,0,.3)`,animation:"moonGlow 6s ease-in-out infinite",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"20%",left:"25%",width:size*.18,height:size*.18,borderRadius:"50%",background:"rgba(0,0,0,.08)"}}/>
        <div style={{position:"absolute",top:"55%",left:"60%",width:size*.12,height:size*.12,borderRadius:"50%",background:"rgba(0,0,0,.06)"}}/>
        <div style={{position:"absolute",top:"35%",left:"55%",width:size*.08,height:size*.08,borderRadius:"50%",background:"rgba(0,0,0,.05)"}}/>
      </div>
    </div>
  );
}

// ━━━ SHARED BUTTONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TBtn({p,onClick,color,disabled,showRole}){
  const [h,setH]=useState(false);const c=color||"#ff4757";
  return(
    <button onClick={onClick} disabled={disabled} onPointerDown={()=>setH(true)} onPointerUp={()=>setH(false)} onPointerLeave={()=>setH(false)}
      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"14px 16px",minWidth:72,background:h?`linear-gradient(160deg,${c}20,${c}08)`:"linear-gradient(160deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",border:`1px solid ${h?c+"70":"rgba(255,255,255,.06)"}`,borderRadius:16,color:"#e8e6f0",cursor:disabled?"default":"pointer",transition:"all .2s cubic-bezier(.4,0,.2,1)",fontFamily:"inherit",outline:"none",WebkitTapHighlightColor:"transparent",transform:h?"scale(.93)":"none",boxShadow:h?`0 4px 24px ${c}18,inset 0 0 12px ${c}08`:"0 2px 8px rgba(0,0,0,.2)",opacity:disabled?.25:1,backdropFilter:"blur(8px)"}}>
      <span style={{fontSize:30,lineHeight:1,transition:"transform .2s",transform:h?"scale(1.15)":"none"}}>{p.avatar}</span>
      <span style={{fontSize:11,fontWeight:600,letterSpacing:.5,color:h?c:"rgba(255,255,255,.7)"}}>{p.name}</span>
      {showRole&&<span style={{fontSize:9,color:RCOL[p.role],fontWeight:700}}>{RICON[p.role]}</span>}
    </button>
  );
}

function GlowBtn({children,onClick,color,small,sx}){
  const [h,setH]=useState(false);const c=color||"#ff4757";
  return(
    <button onClick={onClick} onPointerDown={()=>setH(true)} onPointerUp={()=>setH(false)} onPointerLeave={()=>setH(false)}
      style={{position:"relative",padding:small?"11px 28px":"18px 56px",fontSize:small?13:15,fontWeight:800,letterSpacing:small?2:4,background:h?`linear-gradient(135deg,${c},${c}bb)`:"transparent",color:h?"#fff":c,border:`1.5px solid ${h?c:c+"80"}`,borderRadius:14,cursor:"pointer",transition:"all .3s cubic-bezier(.4,0,.2,1)",fontFamily:"'Noto Sans TC',sans-serif",outline:"none",WebkitTapHighlightColor:"transparent",transform:h?"scale(.96)":"none",boxShadow:h?`0 6px 32px ${c}35,0 0 0 4px ${c}10`:`0 0 20px ${c}08`,overflow:"hidden",...(sx||{})}}>
      {children}
      {h&&<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${c}20,transparent)`,animation:"shimmer 1s linear infinite",backgroundSize:"200% 100%"}}/>}
    </button>
  );
}

// ━━━ SPEECH PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SpeechPanel({players,me,onChoice,seerResults}){
  const [mode,setMode]=useState(null);
  const alive=players.filter(p=>p.alive&&p.id!==0);
  if(mode==="accuse"){
    return(
      <div style={{textAlign:"center",animation:"slideUp .3s ease"}}>
        <p style={{fontSize:12,color:"#ff4757",marginBottom:10,fontWeight:700,letterSpacing:2}}>🎯 選擇指控對象</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:10}}>
          {alive.map(p=><TBtn key={p.id} p={p} onClick={()=>{setMode(null);onChoice("accuse",p.id);}} color="#ff4757"/>)}
        </div>
        <button onClick={()=>setMode(null)} style={{fontSize:11,color:"#555",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"6px 16px"}}>← 返回</button>
      </div>
    );
  }
  const opts=[];
  opts.push({key:"accuse",icon:"🎯",label:"指控某人",desc:"指出你懷疑的對象",color:"#ff4757"});
  opts.push({key:"defend",icon:"🛡️",label:"為自己辯護",desc:"降低別人對你的懷疑",color:"#60a5fa"});
  if(me.role===R.S&&Object.keys(seerResults||{}).length>0) opts.push({key:"claim",icon:"🔮",label:"跳預言家",desc:"公布查驗結果",color:"#c084fc"});
  if(me.role===R.H) opts.push({key:"hint",icon:"🏹",label:"暗示底牌",desc:"威懾狼人",color:"#fbbf24"});
  if(me.role===R.W) opts.push({key:"frame",icon:"🎭",label:"栽贓好人",desc:"引導大家投好人",color:"#c084fc"});
  opts.push({key:"silent",icon:"🤫",label:"保持沉默",desc:"觀察局勢",color:"#555"});
  return(
    <div style={{textAlign:"center",animation:"slideUp .3s ease"}}>
      <p style={{fontSize:11,color:"#999",marginBottom:12,fontWeight:600,letterSpacing:3,textTransform:"uppercase"}}>💬 你的發言</p>
      <div style={{display:"flex",flexDirection:"column",gap:6,maxWidth:340,margin:"0 auto"}}>
        {opts.map(o=><SpeechOpt key={o.key} {...o} onClick={()=>{if(o.key==="accuse"||o.key==="frame")setMode("accuse");else onChoice(o.key,null);}}/>)}
      </div>
    </div>
  );
}

function SpeechOpt({icon,label,desc,color,onClick}){
  const [h,setH]=useState(false);
  return(
    <button onClick={onClick} onPointerDown={()=>setH(true)} onPointerUp={()=>setH(false)} onPointerLeave={()=>setH(false)}
      style={{display:"flex",alignItems:"center",gap:14,padding:"12px 18px",background:h?color+"12":"rgba(255,255,255,.015)",border:`1px solid ${h?color+"40":"rgba(255,255,255,.04)"}`,borderRadius:14,cursor:"pointer",transition:"all .2s",fontFamily:"inherit",outline:"none",WebkitTapHighlightColor:"transparent",textAlign:"left",transform:h?"translateX(4px)":"none",boxShadow:h?`0 0 20px ${color}10`:"none"}}>
      <span style={{fontSize:22,flexShrink:0,width:32,textAlign:"center"}}>{icon}</span>
      <div><div style={{fontSize:13,fontWeight:700,color}}>{label}</div><div style={{fontSize:10,color:"#555",marginTop:2}}>{desc}</div></div>
    </button>
  );
}

// ━━━ VOTE TALLY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function VoteTally({tally,players}){
  const entries=Object.entries(tally).map(([id,c])=>({id:parseInt(id),count:c,player:players.find(p=>p.id===parseInt(id))})).filter(e=>e.player).sort((a,b)=>b.count-a.count);
  const max=Math.max(...entries.map(e=>e.count),1);
  return(
    <div style={{margin:"8px 0",padding:"14px 16px",background:"linear-gradient(135deg,rgba(255,71,87,.04),rgba(168,85,247,.03))",borderRadius:16,border:"1px solid rgba(255,255,255,.04)",animation:"slideUp .4s ease"}}>
      <p style={{fontSize:10,color:"#888",marginBottom:8,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>投票統計</p>
      {entries.map((e,i)=>(
        <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:16,width:24,textAlign:"center"}}>{e.player.avatar}</span>
          <span style={{fontSize:11,color:"#aaa",width:32,fontWeight:600}}>{e.player.name}</span>
          <div style={{flex:1,height:20,background:"rgba(255,255,255,.03)",borderRadius:10,overflow:"hidden",position:"relative"}}>
            <div style={{width:`${(e.count/max)*100}%`,height:"100%",background:i===0?`linear-gradient(90deg,#ff475740,#ff4757)`:`linear-gradient(90deg,#a855f720,#a855f7)`,borderRadius:10,transition:"width .8s cubic-bezier(.4,0,.2,1)",transitionDelay:i*100+"ms"}}/>
          </div>
          <span style={{fontSize:14,fontWeight:900,width:22,textAlign:"right",color:i===0?"#ff4757":"#888"}}>{e.count}</span>
        </div>
      ))}
    </div>
  );
}

// ━━━ MAIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function WerewolfGame(){
  const [screen,setScreen]=useState("menu");
  const [players,setPlayers]=useState([]);
  const [phase,setPhase]=useState("night");
  const [dayNum,setDayNum]=useState(0);
  const [msgs,setMsgs]=useState([]);
  const [votingOpen,setVotingOpen]=useState(false);
  const [nightStep,setNightStep]=useState("");
  const [winner,setWinner]=useState(null);
  const [busy,setBusy]=useState(false);
  const [pVoted,setPVoted]=useState(false);
  const [hunterModal,setHunterModal]=useState(null);
  const [nightAnim,setNightAnim]=useState(false);
  const [lastProt,setLastProt]=useState(null);
  const [showSpeech,setShowSpeech]=useState(false);
  const [voteTally,setVoteTally]=useState(null);
  const [pSeer,setPSeer]=useState({});
  const endRef=useRef(null);
  const brainRef=useRef(null);
  const ndRef=useRef({wk:null,ds:null});

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const log=useCallback((t,type,sp)=>{setMsgs(p=>[...p,{text:t,type:type||"sys",speaker:sp||null,id:Date.now()+Math.random()}]);},[]);
  const checkWin=ps=>{const w=ps.filter(p=>p.alive&&p.role===R.W).length;const g=ps.filter(p=>p.alive&&p.role!==R.W).length;if(!w)return"good";if(w>=g)return"evil";return null;};

  const startGame=()=>{const p=initGame();const b=new AIBrain(p);setPlayers(p);brainRef.current=b;setMsgs([]);setDayNum(0);setPhase("night");setVotingOpen(false);setNightStep("");setWinner(null);setPVoted(false);setHunterModal(null);setNightAnim(false);setLastProt(null);setShowSpeech(false);setVoteTally(null);setPSeer({});ndRef.current={wk:null,ds:null};setScreen("reveal");};
  const enterGame=()=>{setScreen("game");startNight(players,1);};

  // ━━━ NIGHT FLOW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startNight=async(ps,n)=>{const num=n||dayNum+1;setDayNum(num);setPhase("night");setNightAnim(true);ndRef.current={wk:null,ds:null};setVoteTally(null);await wait(500);log(`🌙 第 ${num} 個夜晚，所有人閉眼...`,"phase");await wait(700);beginWolf(ps);};
  const beginWolf=async ps=>{const me=ps.find(p=>p.id===0);log("🐺 狼人請睜眼...","phase");await wait(500);if(me.alive&&me.role===R.W){const tm=ps.filter(p=>p.alive&&p.role===R.W&&p.id!==0);if(tm.length)log(`隊友：${tm.map(t=>t.avatar+t.name).join("、")}`,"wolfinfo");setNightStep("wolf");}else{setBusy(true);await wait(1400);const b=brainRef.current;const t=b.wolfKill(ps.filter(p=>p.alive&&p.role===R.W),ps);ndRef.current.wk=t?t.id:null;log("🐺 狼人閉眼。","phase");await wait(400);beginSeer(ps);setBusy(false);}};
  const onWolf=async tid=>{ndRef.current.wk=tid;const t=players.find(p=>p.id===tid);log(`🔪 鎖定：${t.name}`,"action");setNightStep("");await wait(500);log("🐺 狼人閉眼。","phase");await wait(400);beginSeer(players);};
  const beginSeer=async ps=>{const me=ps.find(p=>p.id===0);log("🔮 預言家請睜眼...","phase");await wait(500);if(me.alive&&me.role===R.S){setNightStep("seer");}else{setBusy(true);await wait(1100);const b=brainRef.current;ps.filter(p=>p.alive&&p.role===R.S&&!p.isPlayer).forEach(s=>{const t=b.seerTgt(s.id,ps);if(t)b.recSeer(t.id,t.role===R.W);});log("🔮 預言家閉眼。","phase");await wait(400);beginDoc(ps);setBusy(false);}};
  const onSeer=async tid=>{const t=players.find(p=>p.id===tid);const isW=t.role===R.W;brainRef.current.recSeer(tid,isW);setPSeer(prev=>({...prev,[tid]:isW}));log(`🔮 ${t.name} ${isW?"── 🐺 狼人！":"── ✅ 好人"}`,isW?"danger":"safe");setNightStep("");await wait(700);log("🔮 預言家閉眼。","phase");await wait(400);beginDoc(players);};
  const beginDoc=async ps=>{const me=ps.find(p=>p.id===0);log("💉 醫生請睜眼...","phase");await wait(500);if(me.alive&&me.role===R.D){setNightStep("doctor");}else{setBusy(true);await wait(1100);const b=brainRef.current;const docs=ps.filter(p=>p.alive&&p.role===R.D&&!p.isPlayer);if(docs.length){const t=b.docTgt(docs[0].id,ps);if(t)ndRef.current.ds=t.id;}log("💉 醫生閉眼。","phase");await wait(400);resolveNight(ps);setBusy(false);}};
  const onDoc=async tid=>{ndRef.current.ds=tid;setLastProt(tid);const t=players.find(p=>p.id===tid);log(`🛡️ 守護：${t.name}`,"action");setNightStep("");await wait(500);log("💉 醫生閉眼。","phase");await wait(400);resolveNight(players);};

  const resolveNight=async ps=>{setBusy(true);await wait(1200);const{wk,ds}=ndRef.current;setPhase("day");setNightStep("");setNightAnim(false);const b=brainRef.current;b.pa=null;if(wk!=null&&wk!==ds){const v=ps.find(p=>p.id===wk);let np=ps.map(p=>p.id===wk?{...p,alive:false}:p);setPlayers(np);b.recDeath(wk);log(`☀️ 天亮了，第 ${dayNum} 天白天`,"phase");log(pick([`昨夜，${v.name} 倒在了血泊中... 身份：${v.role}${RICON[v.role]}`,`${v.name} 在沉睡中離開了... 身份：${v.role}${RICON[v.role]}`]),"death");if(v.role===R.H){await wait(800);np=await handleHunter(v,np);}const w=checkWin(np);if(w){setWinner(w);setScreen("over");setBusy(false);return;}await wait(1000);b.updSus(np);runDay(np);}else{log(`☀️ 天亮了，第 ${dayNum} 天白天`,"phase");log(pick(["平安夜！醫生成功守護了目標！","所有人安全度過了夜晚。"]),"safe");await wait(1000);b.updSus(ps);runDay(ps);}setBusy(false);};

  // ━━━ DAY FLOW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const runDay=async ps=>{setBusy(true);const b=brainRef.current;const alive=ps.filter(p=>p.alive&&!p.isPlayer);const order=shuffle(alive).slice(0,Math.min(4,alive.length));const me=ps.find(p=>p.id===0);const half=Math.ceil(order.length/2);for(let i=0;i<half;i++){await wait(800+Math.random()*600);const sp=b.genSpeech(order[i],ps,dayNum);if(sp)log(sp,"chat",order[i]);}if(me.alive){await wait(400);setShowSpeech(true);setBusy(false);return;}for(let i=half;i<order.length;i++){await wait(800+Math.random()*600);const sp=b.genSpeech(order[i],ps,dayNum);if(sp)log(sp,"chat",order[i]);}await wait(500);log("🗳️ 討論結束，開始投票！","phase");setVotingOpen(true);setPVoted(false);setBusy(false);};

  const onPlayerSpeech=async(type,tid)=>{setShowSpeech(false);setBusy(true);const me=players[0];const b=brainRef.current;const alive=players.filter(p=>p.alive&&!p.isPlayer);if(type==="accuse"||type==="frame"){const t=players.find(p=>p.id===tid);b.setPA(tid);b.recAcc(0,tid);log(me.role===R.W?`我覺得${t.name}非常可疑，大家注意他！`:`我指控${t.name}！他的行為很不正常。`,"playerchat",me);await wait(600);for(const r of shuffle(alive).slice(0,2)){await wait(500+Math.random()*400);const rx=b.react(r,players,"accuse",tid);if(rx)log(rx,"chat",r);}}else if(type==="defend"){log("我是好人！你們可以觀察我的表現，我沒有可疑行為。","playerchat",me);await wait(600);const r=pick(alive);const rx=b.react(r,players,"defend",null);if(rx)log(rx,"chat",r);}else if(type==="claim"){const ck=Object.entries(pSeer);if(ck.length){const res=ck.map(([id,isW])=>{const p=players.find(pp=>pp.id===parseInt(id));return p?`${p.name}${isW?"是狼人🐺":"是好人✅"}`:""}).filter(Boolean).join("，");log(`我跳預言家！查驗結果：${res}`,"playerchat",me);await wait(600);const wolves=alive.filter(p=>p.role===R.W);if(wolves.length&&Math.random()>0.4){await wait(500);log(pick(["你是假預言家吧？我才是真的！","別聽他的，他在騙人！"]),"chat",pick(wolves));}}}else if(type==="hint"){log("投我的人要三思。我有底牌，狼人不會想讓我死。","playerchat",me);}else if(type==="silent"){log("（你保持沉默，觀察局勢）","dim");}await wait(500);for(const sp of shuffle(alive).slice(0,2)){await wait(700+Math.random()*500);const speech=b.genSpeech(sp,players,dayNum);if(speech)log(speech,"chat",sp);}await wait(500);log("🗳️ 討論結束，開始投票！","phase");b.updSus(players);setVotingOpen(true);setPVoted(false);setBusy(false);};

  // ━━━ VOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const doVote=async vid=>{if(pVoted)return;setPVoted(true);setBusy(true);const b=brainRef.current;const t=players.find(p=>p.id===vid);if(players[0].alive)log(`你投了 ${t.name}`,"vote",players[0]);const tally={};if(players[0].alive)tally[vid]=1;for(const ai of players.filter(p=>p.alive&&!p.isPlayer)){await wait(300+Math.random()*200);const vt=b.getVote(ai.id,ai.role,players);if(vt){tally[vt.id]=(tally[vt.id]||0)+1;log(`${ai.name} → ${vt.name}`,"vote",ai);}}await wait(500);setVoteTally(tally);await wait(1000);let maxV=0,outId=null;Object.entries(tally).forEach(([id,c])=>{if(c>maxV){maxV=c;outId=parseInt(id);}});const ties=Object.entries(tally).filter(([_,c])=>c===maxV);if(ties.length>1){log(`⚖️ 平票（${maxV}票），無人被放逐。`,"phase");setVotingOpen(false);await wait(1000);startNight(players);setBusy(false);return;}const out=players.find(p=>p.id===outId);let np=players.map(p=>p.id===outId?{...p,alive:false}:p);setPlayers(np);log(`☠️ ${out.name} 以 ${maxV} 票被放逐`,"elim");await wait(400);if(!out.isPlayer){log(`💬 ${out.name}：「${out.role===R.W?pick(["哼...你們贏了這次。","可惜，差一點。"]):pick(["我是好人，你們投錯了！","冤枉...希望你們找到真狼。"])}」`,"chat",out);await wait(500);}log(`📋 身份：${out.role} ${RICON[out.role]}`,"reveal");setVotingOpen(false);if(out.role===R.H){await wait(800);np=await handleHunter(out,np);}const w=checkWin(np);if(w){setWinner(w);setScreen("over");setBusy(false);return;}await wait(1000);startNight(np);setBusy(false);};

  // ━━━ HUNTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleHunter=async(dead,ps)=>{if(dead.isPlayer)return new Promise(res=>setHunterModal({ps,resolve:res}));const b=brainRef.current;const targets=ps.filter(p=>p.alive&&p.id!==dead.id);const se=Object.entries(b.sus[dead.id]||{}).filter(([id])=>{const p=ps.find(pp=>pp.id===parseInt(id));return p&&p.alive&&p.id!==dead.id;}).sort((a,b2)=>b2[1]-a[1]);const t=se.length?ps.find(p=>p.id===parseInt(se[0][0])):pick(targets);log(`🏹 ${dead.name}是獵人！帶走了 ${t.name}（${t.role}${RICON[t.role]}）`,"hunter");const np=ps.map(p=>p.id===t.id?{...p,alive:false}:p);setPlayers(np);await wait(800);return np;};
  const confirmHunter=tid=>{if(!hunterModal)return;const t=hunterModal.ps.find(p=>p.id===tid);log(`🏹 你帶走了 ${t.name}（${t.role}${RICON[t.role]}）`,"hunter");const np=hunterModal.ps.map(p=>p.id===tid?{...p,alive:false}:p);setPlayers(np);const res=hunterModal.resolve;setHunterModal(null);const w=checkWin(np);if(w){setWinner(w);setScreen("over");return;}res(np);};
  const doNight=tid=>{if(nightStep==="wolf")onWolf(tid);else if(nightStep==="seer")onSeer(tid);else if(nightStep==="doctor")onDoc(tid);};

  // ━━━ STYLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const MS={phase:{bg:"linear-gradient(135deg,rgba(100,149,237,.06),rgba(100,149,237,.02))",ac:"#6495ed",bc:"rgba(100,149,237,.25)"},chat:{bg:"linear-gradient(135deg,rgba(255,255,255,.02),rgba(255,255,255,.005))",ac:"rgba(255,255,255,.1)",bc:"rgba(255,255,255,.06)"},playerchat:{bg:"linear-gradient(135deg,rgba(96,165,250,.06),rgba(96,165,250,.02))",ac:"#60a5fa",bc:"rgba(96,165,250,.2)"},vote:{bg:"rgba(168,85,247,.04)",ac:"#a855f7",bc:"rgba(168,85,247,.15)"},elim:{bg:"linear-gradient(135deg,rgba(255,71,87,.08),rgba(255,71,87,.02))",ac:"#ff4757",bc:"rgba(255,71,87,.25)"},death:{bg:"linear-gradient(135deg,rgba(255,71,87,.06),rgba(255,71,87,.01))",ac:"#ff4757",bc:"rgba(255,71,87,.2)"},action:{bg:"linear-gradient(135deg,rgba(255,211,42,.05),rgba(255,211,42,.01))",ac:"#ffd32a",bc:"rgba(255,211,42,.2)"},hunter:{bg:"linear-gradient(135deg,rgba(245,158,11,.06),rgba(245,158,11,.01))",ac:"#f59e0b",bc:"rgba(245,158,11,.2)"},safe:{bg:"linear-gradient(135deg,rgba(52,211,153,.06),rgba(52,211,153,.01))",ac:"#34d399",bc:"rgba(52,211,153,.2)"},danger:{bg:"linear-gradient(135deg,rgba(255,71,87,.1),rgba(255,71,87,.03))",ac:"#ff4757",bc:"rgba(255,71,87,.3)"},dim:{bg:"rgba(255,255,255,.01)",ac:"#333",bc:"rgba(255,255,255,.03)"},wolfinfo:{bg:"linear-gradient(135deg,rgba(255,71,87,.05),rgba(255,71,87,.01))",ac:"#ff4757",bc:"rgba(255,71,87,.15)"},reveal:{bg:"rgba(255,255,255,.02)",ac:"#888",bc:"rgba(255,255,255,.06)"}};

  const page={width:"100%",minHeight:"100vh",background:"#08080e",fontFamily:"'Noto Sans TC','SF Pro Display',-apple-system,sans-serif",color:"#e8e6f0",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"};

  // ═══ MENU ═══
  if(screen==="menu"){
    return(
      <div style={page}><style>{CSS}</style>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 20%,rgba(20,15,40,1) 0%,#08080e 65%)"}}/>
        <Moon size={100} top="8%"/>
        <Particles count={30} color="rgba(200,180,255,.06)"/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"30%",background:"linear-gradient(0deg,rgba(8,8,14,1) 0%,transparent 100%)",pointerEvents:"none",zIndex:1}}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,position:"relative",zIndex:2}}>
          <div style={{fontSize:88,marginBottom:28,animation:"breathe 4s ease infinite"}}>🐺</div>
          <h1 style={{fontFamily:"'Cinzel',serif",fontSize:52,fontWeight:900,letterSpacing:16,margin:0,color:"#fff",textShadow:"0 0 60px rgba(255,71,87,.2),0 2px 4px rgba(0,0,0,.5)"}}>狼人殺</h1>
          <p style={{fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:14,color:"#4a4a5a",marginTop:12}}>WEREWOLF</p>
          <div style={{width:100,height:1,background:"linear-gradient(90deg,transparent,rgba(255,71,87,.2),transparent)",margin:"32px auto"}}/>
          <p style={{fontSize:12,color:"#4a4a5a",marginBottom:44,letterSpacing:2}}>8人局 · 智能AI · 經典規則</p>
          <GlowBtn onClick={startGame}>開始遊戲</GlowBtn>
          <div style={{marginTop:52,padding:"20px 24px",background:"rgba(255,255,255,.015)",borderRadius:20,border:"1px solid rgba(255,255,255,.04)",maxWidth:320,width:"100%",backdropFilter:"blur(12px)"}}>
            <p style={{fontSize:10,color:"#444",letterSpacing:4,marginBottom:14,textAlign:"center",textTransform:"uppercase"}}>角色一覽</p>
            <div style={{fontSize:12,color:"#666",lineHeight:2.2}}>
              {Object.entries(RICON).map(([name,icon])=>(<div key={name} style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16,width:24,textAlign:"center"}}>{icon}</span><span style={{color:RCOL[name],fontWeight:700,minWidth:50}}>{name}</span><span style={{color:"#444"}}>—</span><span style={{color:"#555"}}>{name==="狼人"?"×2 夜晚殺人":name==="預言家"?"查驗身份":name==="醫生"?"守護（不可連守）":name==="獵人"?"死時帶走一人":"×3 推理投票"}</span></div>))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ REVEAL ═══
  if(screen==="reveal"){
    const me=players[0],rc=RCOL[me.role],wolves=players.filter(p=>p.role===R.W);
    return(
      <div style={page}><style>{CSS}</style>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 30%,${rc}08,#08080e 60%)`}}/>
        <Particles count={18} color={rc+"14"}/>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:28,position:"relative",zIndex:2}}>
          <div style={{textAlign:"center",padding:"52px 36px",background:"rgba(255,255,255,.015)",borderRadius:32,border:"1px solid rgba(255,255,255,.05)",maxWidth:380,width:"100%",position:"relative",overflow:"hidden",backdropFilter:"blur(16px)",boxShadow:`0 20px 80px ${rc}08`}}>
            <div style={{position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:240,height:240,borderRadius:"50%",background:`radial-gradient(circle,${rc}10,transparent)`,filter:"blur(60px)"}}/>
            <p style={{fontSize:10,color:"#444",letterSpacing:8,marginBottom:32,textTransform:"uppercase",position:"relative",fontWeight:600}}>你的身份</p>
            <div style={{fontSize:84,marginBottom:20,position:"relative",filter:`drop-shadow(0 0 30px ${rc}30)`}}>{RICON[me.role]}</div>
            <h2 style={{fontFamily:"'Cinzel','Noto Sans TC',serif",fontSize:38,fontWeight:900,color:rc,margin:"0 0 8px",letterSpacing:10,position:"relative",textShadow:`0 0 30px ${rc}30`}}>{me.role}</h2>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${rc}40,transparent)`,margin:"18px auto 22px"}}/>
            <p style={{fontSize:13,color:"#777",lineHeight:2,marginBottom:16,position:"relative"}}>
              {me.role===R.W&&"夜晚與同伴選擇殺害目標，白天隱藏身份。"}
              {me.role===R.S&&"每晚查驗一名玩家的真實身份。"}
              {me.role===R.D&&"每晚守護一人（不能連續兩晚守同一人）。"}
              {me.role===R.H&&"被淘汰時可開槍帶走一名玩家。"}
              {me.role===R.V&&"通過討論發言影響局勢，用投票消滅狼人！"}
            </p>
            {me.role===R.W&&(<div style={{background:"rgba(255,71,87,.06)",borderRadius:14,padding:"12px 18px",marginBottom:24,border:"1px solid rgba(255,71,87,.12)"}}>
              <p style={{fontSize:10,color:"#ff4757",marginBottom:8,fontWeight:700,letterSpacing:2}}>你的同伴</p>
              <div style={{display:"flex",justifyContent:"center",gap:16}}>{wolves.filter(w=>w.id!==0).map(w=>(<div key={w.id} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:24}}>{w.avatar}</span><span style={{fontSize:14,color:"#ff6b7a",fontWeight:700}}>{w.name}</span></div>))}</div>
            </div>)}
            <GlowBtn onClick={enterGame} color={rc}>進入遊戲</GlowBtn>
          </div>
        </div>
      </div>
    );
  }

  // ═══ GAME OVER ═══
  if(screen==="over"){
    const isWin=(winner==="good"&&players[0].role!==R.W)||(winner==="evil"&&players[0].role===R.W);
    const c=isWin?"#34d399":"#ff4757";
    return(
      <div style={page}><style>{CSS}</style>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 30%,${c}06,#08080e 60%)`}}/>
        <Particles count={30} color={c+"14"}/>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative",zIndex:2}}>
          <div style={{textAlign:"center",padding:"44px 28px",maxWidth:440,width:"100%",background:"rgba(255,255,255,.015)",borderRadius:32,border:"1px solid rgba(255,255,255,.05)",backdropFilter:"blur(16px)",boxShadow:`0 20px 80px ${c}08`}}>
            <div style={{fontSize:76,marginBottom:16,filter:`drop-shadow(0 0 20px ${c}30)`}}>{isWin?"🏆":"💀"}</div>
            <h1 style={{fontFamily:"'Cinzel',serif",fontSize:34,fontWeight:900,color:c,margin:"0 0 6px",letterSpacing:8,textShadow:`0 0 30px ${c}25`}}>{isWin?"勝利":"落敗"}</h1>
            <p style={{fontSize:12,color:"#555",marginBottom:24}}>{winner==="good"?"好人陣營消滅了所有狼人！":"狼人佔領了村莊..."}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:28}}>
              {players.map(p=>(<div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"12px 4px",background:p.alive?"rgba(255,255,255,.025)":"rgba(255,255,255,.008)",borderRadius:14,opacity:p.alive?1:.3,border:`1px solid ${p.alive?RCOL[p.role]+"20":"transparent"}`,transition:"all .3s"}}>
                <span style={{fontSize:24}}>{p.avatar}</span>
                <span style={{fontSize:10,color:"#888",fontWeight:500}}>{p.name}</span>
                <span style={{fontSize:10,color:RCOL[p.role],fontWeight:800}}>{RICON[p.role]}{p.role}</span>
              </div>))}
            </div>
            <GlowBtn onClick={()=>{setScreen("menu");setMsgs([]);}}>再來一局</GlowBtn>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MAIN GAME ═══
  const me=players[0];
  const aliveN=players.filter(p=>p.alive).length;
  const getNT=()=>{if(nightStep==="wolf")return players.filter(p=>p.alive&&p.role!==R.W);if(nightStep==="seer")return players.filter(p=>p.alive&&p.id!==0);if(nightStep==="doctor")return players.filter(p=>p.alive&&p.id!==lastProt);return[];};
  const nt=getNT();
  const nc=nightStep==="wolf"?"#ff4757":nightStep==="seer"?"#c084fc":"#34d399";

  return(
    <div style={{...page,minHeight:"100dvh"}}>
      <style>{CSS}</style>

      {/* BG gradient */}
      <div style={{position:"fixed",inset:0,background:nightAnim?"radial-gradient(ellipse at 50% 0%,rgba(15,15,45,.9),#08080e 70%)":"radial-gradient(ellipse at 50% 0%,rgba(25,20,15,.4),#08080e 70%)",transition:"background 1.5s ease",pointerEvents:"none",zIndex:0}}/>

      {/* Night overlay */}
      {nightAnim&&(<div style={{position:"fixed",inset:0,zIndex:5,pointerEvents:"none",transition:"opacity 1s"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(5,5,25,.5) 0%,rgba(8,8,20,.3) 50%,rgba(5,5,25,.5) 100%)"}}/>
        <Moon size={60} top="2%" opacity={.7}/>
        <Particles count={10} color="rgba(120,160,255,.06)"/>
      </div>)}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"rgba(8,8,14,.92)",borderBottom:"1px solid rgba(255,255,255,.04)",position:"sticky",top:0,zIndex:10,flexShrink:0,backdropFilter:"blur(24px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:18}}>{nightAnim?"🌙":"☀️"}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:800,letterSpacing:2,color:nightAnim?"#8ba4ff":"#ffd32a"}}>{nightAnim?"NIGHT":"DAY"} {dayNum}</span>
          </div>
          <div style={{fontSize:10,color:"#555",padding:"4px 12px",background:"rgba(255,255,255,.03)",borderRadius:20,fontWeight:600,letterSpacing:1,border:"1px solid rgba(255,255,255,.03)"}}>{aliveN} 存活</div>
        </div>
        <div style={{fontSize:11,fontWeight:800,padding:"5px 14px",borderRadius:20,background:`linear-gradient(135deg,${RCOL[me.role]}12,${RCOL[me.role]}06)`,border:`1px solid ${RCOL[me.role]}30`,color:RCOL[me.role],display:"flex",alignItems:"center",gap:5,letterSpacing:1}}>
          {RICON[me.role]}<span>{me.role}</span>{!me.alive&&<span style={{opacity:.5}}>☠️</span>}
        </div>
      </div>

      {/* Player strip */}
      <div style={{display:"flex",gap:3,padding:"10px 10px",justifyContent:"center",flexWrap:"wrap",borderBottom:"1px solid rgba(255,255,255,.025)",background:"rgba(255,255,255,.005)",flexShrink:0,position:"relative",zIndex:1}}>
        {players.map(p=>(
          <div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 9px",borderRadius:14,minWidth:44,opacity:p.alive?1:.12,background:p.isPlayer?`linear-gradient(180deg,${RCOL[me.role]}08,transparent)`:"transparent",border:p.isPlayer?`1.5px solid ${RCOL[me.role]}20`:"1.5px solid transparent",transition:"all .6s cubic-bezier(.4,0,.2,1)"}}>
            <span style={{fontSize:20,lineHeight:1,transition:"all .3s",filter:p.alive?"none":"grayscale(1)"}}>{p.alive?p.avatar:"💀"}</span>
            <span style={{fontSize:9,color:p.alive?"#666":"#222",fontWeight:600,letterSpacing:.5}}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:6,WebkitOverflowScrolling:"touch",position:"relative",zIndex:1}}>
        {msgs.map(m=>{
          const s=MS[m.type]||MS.chat;
          const isSmall=m.type==="vote";
          return(
            <div key={m.id} style={{padding:isSmall?"6px 14px":"12px 16px",borderRadius:14,fontSize:isSmall?12:13,lineHeight:1.7,background:s.bg,borderLeft:`3px solid ${s.bc}`,animation:"slideUp .3s ease",backdropFilter:"blur(4px)"}}>
              {m.speaker&&(
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:isSmall?12:15}}>{m.speaker.avatar}</span>
                  <span style={{fontSize:isSmall?11:12,fontWeight:700,color:m.type==="playerchat"?"#60a5fa":"#aaa",letterSpacing:.5}}>{m.speaker.name}</span>
                  {m.type==="playerchat"&&<span style={{fontSize:8,color:"#60a5fa",marginLeft:"auto",opacity:.5,background:"rgba(96,165,250,.1)",padding:"2px 6px",borderRadius:6,fontWeight:700}}>YOU</span>}
                </div>
              )}
              <div style={{color:m.type==="death"||m.type==="danger"?"#ff6b7a":m.type==="safe"?"#6ee7b7":m.type==="dim"?"#444":m.type==="playerchat"?"#93c5fd":"#bbb"}}>{m.text}</div>
            </div>
          );
        })}
        {voteTally&&<VoteTally tally={voteTally} players={players}/>}
        <div ref={endRef}/>
      </div>

      {/* Action bar */}
      <div style={{padding:"12px 14px 18px",borderTop:"1px solid rgba(255,255,255,.04)",background:"rgba(8,8,14,.95)",position:"sticky",bottom:0,zIndex:10,flexShrink:0,backdropFilter:"blur(24px)"}}>
        {showSpeech&&me.alive&&<SpeechPanel players={players} me={me} onChoice={onPlayerSpeech} seerResults={pSeer}/>}

        {votingOpen&&me.alive&&!pVoted&&(
          <div style={{textAlign:"center",animation:"slideUp .3s ease"}}>
            <p style={{fontSize:10,color:"#888",marginBottom:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>選擇放逐目標</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
              {players.filter(p=>p.alive&&p.id!==0).map(p=><TBtn key={p.id} p={p} onClick={()=>doVote(p.id)}/>)}
            </div>
          </div>
        )}
        {votingOpen&&!me.alive&&!busy&&(
          <div style={{textAlign:"center"}}>
            <p style={{fontSize:11,color:"#444",marginBottom:8}}>你已出局</p>
            <GlowBtn onClick={()=>{const a=players.filter(p=>p.alive&&!p.isPlayer);if(a.length)doVote(pick(a).id);}} color="#555" small>快進</GlowBtn>
          </div>
        )}

        {["wolf","seer","doctor"].includes(nightStep)&&me.alive&&(
          <div style={{textAlign:"center",animation:"slideUp .3s ease"}}>
            <p style={{fontSize:11,color:nc,marginBottom:12,fontWeight:800,letterSpacing:3}}>
              {nightStep==="wolf"?"🔪 選擇獵殺目標":nightStep==="seer"?"🔮 選擇查驗對象":"🛡️ 選擇守護對象"}
            </p>
            {nightStep==="doctor"&&lastProt!=null&&(<p style={{fontSize:10,color:"#555",marginBottom:8}}>⚠️ 不可連守（上次：{players.find(p=>p.id===lastProt)?.name}）</p>)}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
              {nt.map(p=><TBtn key={p.id} p={p} onClick={()=>doNight(p.id)} color={nc}/>)}
            </div>
          </div>
        )}

        {busy&&!votingOpen&&!showSpeech&&!["wolf","seer","doctor"].includes(nightStep)&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:14,color:"#444",fontSize:12,animation:"pulse 2s ease infinite",letterSpacing:2}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#ff4757",animation:"pulse 1s ease infinite"}}/>
            進行中
          </div>
        )}
      </div>

      {/* Hunter */}
      {hunterModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20,backdropFilter:"blur(12px)",animation:"fadeIn .3s ease"}}>
          <div style={{background:"linear-gradient(180deg,#1a1a30,#0e0e1a)",border:"1px solid rgba(245,158,11,.15)",borderRadius:28,padding:"36px 28px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.6),0 0 40px rgba(245,158,11,.05)"}}>
            <div style={{fontSize:56,marginBottom:16,filter:"drop-shadow(0 0 20px rgba(245,158,11,.3))"}}>🏹</div>
            <h3 style={{fontFamily:"'Cinzel',serif",color:"#fbbf24",margin:"0 0 8px",fontSize:22,fontWeight:900,letterSpacing:6}}>獵人技能</h3>
            <p style={{color:"#666",fontSize:12,marginBottom:20}}>選擇一名玩家帶走</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
              {hunterModal.ps.filter(p=>p.alive&&p.id!==0).map(p=><TBtn key={p.id} p={p} onClick={()=>confirmHunter(p.id)} color="#fbbf24"/>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
