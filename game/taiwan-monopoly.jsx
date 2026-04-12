import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════ GAME DATA ═══════════════ */
const BS=28;
const P=[
  {id:0, n:"起點",     t:"start",   g:0,c:"#FF8A65",pr:0,   e:"🏁",r:[0]},
  {id:1, n:"台北101",  t:"prop",    g:1,c:"#ef4444",pr:600, e:"🏙️",r:[60,180,360,900,1600,2500]},
  {id:2, n:"命運",     t:"fate",    g:0,c:"#a855f7",pr:0,   e:"🔮",r:[0]},
  {id:3, n:"西門町",   t:"prop",    g:1,c:"#ef4444",pr:600, e:"🎭",r:[60,180,360,900,1600,2500]},
  {id:4, n:"繳稅",     t:"tax",     g:0,c:"#64748b",pr:0,   e:"💸",r:[200]},
  {id:5, n:"高鐵站",   t:"station", g:9,c:"#14b8a6",pr:2000,e:"🚄",r:[250]},
  {id:6, n:"九份老街", t:"prop",    g:2,c:"#3b82f6",pr:1000,e:"🏮",r:[100,300,600,1400,2200,3500]},
  {id:7, n:"機會",     t:"chance",  g:0,c:"#f59e0b",pr:0,   e:"🎴",r:[0]},
  {id:8, n:"日月潭",   t:"prop",    g:2,c:"#3b82f6",pr:1000,e:"🌊",r:[100,300,600,1400,2200,3500]},
  {id:9, n:"阿里山",   t:"prop",    g:2,c:"#3b82f6",pr:1200,e:"⛰️",r:[120,360,720,1600,2600,4000]},
  {id:10,n:"探險廣場", t:"visit",   g:0,c:"#22c55e",pr:0,   e:"🗺️",r:[0]},
  {id:11,n:"墾丁",     t:"prop",    g:3,c:"#eab308",pr:1400,e:"🏖️",r:[140,420,840,1800,2800,4500]},
  {id:12,n:"電力公司", t:"util",    g:9,c:"#78716c",pr:1500,e:"⚡",r:[150]},
  {id:13,n:"太魯閣",   t:"prop",    g:3,c:"#eab308",pr:1400,e:"🏔️",r:[140,420,840,1800,2800,4500]},
  {id:14,n:"台南古都", t:"prop",    g:3,c:"#eab308",pr:1600,e:"🏯",r:[160,480,960,2000,3200,5000]},
  {id:15,n:"捷運站",   t:"station", g:9,c:"#14b8a6",pr:2000,e:"🚇",r:[250]},
  {id:16,n:"夜市",     t:"prop",    g:4,c:"#ec4899",pr:1800,e:"🍜",r:[180,540,1080,2200,3600,5500]},
  {id:17,n:"命運",     t:"fate",    g:0,c:"#a855f7",pr:0,   e:"🔮",r:[0]},
  {id:18,n:"鼎泰豐",   t:"prop",    g:4,c:"#ec4899",pr:1800,e:"🥟",r:[180,540,1080,2200,3600,5500]},
  {id:19,n:"故宮",     t:"prop",    g:4,c:"#ec4899",pr:2000,e:"🏛️",r:[200,600,1200,2400,4000,6000]},
  {id:20,n:"休息站",   t:"free",    g:0,c:"#22c55e",pr:0,   e:"🍵",r:[0]},
  {id:21,n:"信義區",   t:"prop",    g:5,c:"#22c55e",pr:2200,e:"🏢",r:[220,660,1320,2600,4200,6500]},
  {id:22,n:"機會",     t:"chance",  g:0,c:"#f59e0b",pr:0,   e:"🎴",r:[0]},
  {id:23,n:"大安森林", t:"prop",    g:5,c:"#22c55e",pr:2200,e:"🌳",r:[220,660,1320,2600,4200,6500]},
  {id:24,n:"陽明山",   t:"prop",    g:5,c:"#22c55e",pr:2400,e:"🌸",r:[240,720,1440,2800,4600,7000]},
  {id:25,n:"桃園機場", t:"station", g:9,c:"#14b8a6",pr:2000,e:"✈️",r:[250]},
  {id:26,n:"奢華酒店", t:"prop",    g:6,c:"#8b5cf6",pr:3500,e:"🏨",r:[350,1050,2100,4200,6500,9000]},
  {id:27,n:"帝寶",     t:"prop",    g:6,c:"#8b5cf6",pr:4000,e:"👑",r:[500,1500,3000,6000,9000,12000]},
];
const HC={1:500,2:500,3:1000,4:1000,5:1500,6:2000};
const WHEEL=[
  {text:"中了刮刮樂！",amt:2000,e:"🎉",bg:"#ef4444"},{text:"退稅回饋金",amt:1500,e:"💰",bg:"#3b82f6"},
  {text:"房屋漏水",amt:-800,e:"🔧",bg:"#64748b"},{text:"朋友還錢",amt:500,e:"🎁",bg:"#a855f7"},
  {text:"看醫生",amt:-1000,e:"🏥",bg:"#f97316"},{text:"基金獲利！",amt:2500,e:"📈",bg:"#22c55e"},
  {text:"超速罰單",amt:-500,e:"🚗",bg:"#eab308"},{text:"年終獎金",amt:3000,e:"🏆",bg:"#ec4899"},
  {text:"直播大賣",amt:2000,e:"📱",bg:"#14b8a6"},{text:"手機摔碎",amt:-600,e:"💔",bg:"#78716c"},
  {text:"撿到紅包！",amt:800,e:"🧧",bg:"#ef4444"},{text:"Podcast業配",amt:1800,e:"🎙️",bg:"#8b5cf6"},
];
const GEV=[
  {text:"🌪️ 颱風天！每人 -$500",fn:ps=>ps.map(p=>p.bk?p:{...p,money:Math.max(0,p.money-500)})},
  {text:"📈 股市大漲！每人 +$1000",fn:ps=>ps.map(p=>p.bk?p:{...p,money:p.money+1000})},
  {text:"🎆 國慶日快樂！",fn:ps=>ps},
  {text:"🏗️ 都更補助！最窮 +$2000",fn:ps=>{const m=Math.min(...ps.filter(p=>!p.bk).map(p=>p.money));return ps.map(p=>p.money===m&&!p.bk?{...p,money:p.money+2000}:p);}},
  {text:"💸 通膨！最有錢 -$1500",fn:ps=>{const m=Math.max(...ps.filter(p=>!p.bk).map(p=>p.money));return ps.map(p=>p.money===m&&!p.bk?{...p,money:Math.max(0,p.money-1500)}:p);}},
  {text:"🧧 政府發紅包！每人 +$800",fn:ps=>ps.map(p=>p.bk?p:{...p,money:p.money+800})},
];
const PC=["#f97316","#3b82f6","#a855f7","#22c55e"];
const PN=["你","電腦A","電腦B","電腦C"];
const PA=["🦊","🐺","🐱","🐸"];

const c2g=id=>{if(id<=7)return{c:7-id,r:7};if(id<=13)return{c:0,r:7-(id-7)};if(id<=21)return{c:id-14,r:0};return{c:7,r:id-21};};
const getRent=(p,hs,ow,oid)=>{if(p.t!=="prop")return p.r[0]||0;const h=hs[p.id]||0;let rent=p.r[h]||p.r[0];if(h===0){const g=P.filter(x=>x.g===p.g&&x.g>0);if(g.every(x=>ow[x.id]===oid))rent*=2;}return rent;};
const aiWants=(p,prop,ow)=>{const l=p.money-prop.pr;if(l<400)return prop.pr<=600;if(prop.t==="station")return true;const g=P.filter(x=>x.g===prop.g&&x.g>0);const oc=g.filter(x=>ow[x.id]===p.id).length;if(oc>=g.length-1)return true;if(oc>=1)return l>1000;if(p.money>8000)return true;return p.money>3500&&Math.random()>0.3;};
const aiBuild=(p,ow,hs)=>{const owned=P.filter(x=>x.t==="prop"&&ow[x.id]===p.id);const grps={};owned.forEach(x=>{if(!grps[x.g])grps[x.g]=[];grps[x.g].push(x);});const nhs={...hs};let built=null;for(const gid in grps){const full=P.filter(x=>x.g===+gid&&x.g>0);if(grps[gid].length!==full.length)continue;const cost=HC[gid]||1000;const sorted=[...grps[gid]].sort((a,b)=>(nhs[a.id]||0)-(nhs[b.id]||0));for(const pr of sorted){const h=nhs[pr.id]||0;if(h>=5)continue;if(p.money-cost<2000)continue;if(Math.random()>0.65&&h>=2)continue;p.money-=cost;nhs[pr.id]=h+1;built=pr;break;}if(built)break;}return{hs:nhs,built};};

/* ═══════════════ COMPONENTS ═══════════════ */
function Dice({v,rolling}){
  const D={1:[[1,1]],2:[[0,2],[2,0]],3:[[0,2],[1,1],[2,0]],4:[[0,0],[0,2],[2,0],[2,2]],5:[[0,0],[0,2],[1,1],[2,0],[2,2]],6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]};
  return <div style={{width:48,height:48,borderRadius:12,background:"#fff",
    boxShadow:"0 2px 12px rgba(0,0,0,0.08), inset 0 -2px 0 rgba(0,0,0,0.04)",
    border:"1.5px solid #e2e0dc",display:"grid",gridTemplateColumns:"repeat(3,1fr)",
    gridTemplateRows:"repeat(3,1fr)",padding:8,
    animation:rolling?"diceRoll 0.1s infinite alternate":"none"}}>
    {[0,1,2].flatMap(r=>[0,1,2].map(c=>{
      const has=(D[v]||[]).some(([dr,dc])=>dr===r&&dc===c);
      return <div key={`${r}${c}`} style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
        {has&&<div style={{width:8,height:8,borderRadius:"50%",
          background:"linear-gradient(135deg,#f97316,#ea580c)",
          boxShadow:"0 1px 3px rgba(249,115,22,0.4)"}}/>}
      </div>;
    }))}
  </div>;
}

function Confetti({on}){
  if(!on)return null;
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
    {Array.from({length:50},(_,i)=>{
      const colors=["#f97316","#3b82f6","#a855f7","#22c55e","#ec4899","#eab308","#ef4444"];
      return <div key={i} style={{
        position:"absolute",left:`${Math.random()*100}%`,top:-12,
        width:8+Math.random()*6,height:5+Math.random()*3,
        background:colors[i%7],borderRadius:2,
        transform:`rotate(${Math.random()*360}deg)`,
        animation:`confettiFall ${2+Math.random()*2}s ease-in ${Math.random()*1}s forwards`,
      }}/>;
    })}
  </div>;
}

function Wheel({on,res,onDone}){
  const[ang,setAng]=useState(0);const[ph,setPh]=useState("spin");
  const dr=useRef(false);const odr=useRef(onDone);odr.current=onDone;
  useEffect(()=>{
    if(!on){dr.current=false;setPh("spin");setAng(0);return;}
    const idx=Math.max(0,WHEEL.findIndex(w=>w.text===res?.text));
    const sa=360/WHEEL.length;
    setAng(360*6+(360-idx*sa-sa/2));
    const t1=setTimeout(()=>setPh("reveal"),3400);
    const t2=setTimeout(()=>{if(!dr.current){dr.current=true;odr.current();}},5200);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[on,res]);
  if(!on||!res)return null;
  const N=WHEEL.length,sa=360/N;
  return <div style={{position:"fixed",inset:0,background:"rgba(15,15,20,0.6)",backdropFilter:"blur(12px)",
    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:200,animation:"fadeIn 0.3s"}}>
    <div style={{color:"#f97316",fontSize:32,marginBottom:-6,zIndex:10,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
      textShadow:"0 0 20px rgba(249,115,22,0.6)"}}>▼</div>
    <div style={{position:"relative",width:270,height:270,filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.3))"}}>
      <svg width="270" height="270" viewBox="0 0 270 270"
        style={{transform:`rotate(${ang}deg)`,transition:ang===0?"none":"transform 3.5s cubic-bezier(0.15,0.6,0.1,1)"}}>
        {WHEEL.map((item,i)=>{
          const s=(i*sa-90)*Math.PI/180,e2=((i+1)*sa-90)*Math.PI/180;
          const x1=135+128*Math.cos(s),y1=135+128*Math.sin(s);
          const x2=135+128*Math.cos(e2),y2=135+128*Math.sin(e2);
          const m=((i+0.5)*sa-90)*Math.PI/180,tx=135+85*Math.cos(m),ty=135+85*Math.sin(m);
          return <g key={i}><path d={`M135,135 L${x1},${y1} A128,128 0 0,1 ${x2},${y2} Z`}
            fill={item.bg} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize="18"
              transform={`rotate(${i*sa+sa/2},${tx},${ty})`}>{item.e}</text></g>;
        })}
        <circle cx="135" cy="135" r="24" fill="#1e1b2e" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
        <text x="135" y="137" textAnchor="middle" dominantBaseline="central" fontSize="10"
          fontWeight="900" fill="#f97316" letterSpacing="1">SPIN</text>
      </svg>
    </div>
    {ph==="reveal"&&<div style={{marginTop:20,background:"rgba(255,255,255,0.97)",borderRadius:20,
      padding:"24px 36px",textAlign:"center",animation:"scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      boxShadow:"0 20px 60px rgba(0,0,0,0.25)",border:`2.5px solid ${res.amt>0?"#22c55e":"#ef4444"}`}}>
      <div style={{fontSize:38,marginBottom:6}}>{res.e}</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1e1b2e",marginBottom:8}}>{res.text}</div>
      <div style={{fontSize:30,fontWeight:900,color:res.amt>0?"#16a34a":"#dc2626",
        textShadow:`0 0 20px ${res.amt>0?"rgba(22,163,106,0.3)":"rgba(220,38,38,0.3)"}`}}>
        {res.amt>0?"+":""}{res.amt.toLocaleString()}</div>
    </div>}
  </div>;
}

function Info({prop,ow,hs,ps,onClose,onBuild,canB}){
  if(!prop)return null;
  const oid=ow[prop.id],owner=oid!==undefined?ps[oid]:null;
  const h=hs[prop.id]||0,ip=prop.t==="prop",cost=HC[prop.g]||0;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,15,20,0.5)",
    backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,animation:"fadeIn 0.2s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:24,padding:"28px 30px",
      minWidth:270,maxWidth:300,boxShadow:"0 24px 64px rgba(0,0,0,0.2)",animation:"scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${prop.c},${prop.c}cc)`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
          boxShadow:`0 4px 14px ${prop.c}40`}}>{prop.e}</div>
        <div><div style={{fontSize:18,fontWeight:800,color:"#1e1b2e"}}>{prop.n}</div>
          {prop.pr>0&&<div style={{fontSize:13,color:"#94a3b8"}}>售價 ${prop.pr.toLocaleString()}</div>}</div>
      </div>
      {ip&&<div style={{background:"#f8fafc",borderRadius:14,padding:"12px 14px",marginBottom:14}}>
        {[["空地",0],["🏠×1",1],["🏠×2",2],["🏠×3",3],["🏠×4",4],["🏨飯店",5]].map(([l,i])=>
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",
            fontSize:13,color:i===h?"#f97316":i===5?"#8b5cf6":"#64748b",
            fontWeight:i===h||i===5?700:400,
            background:i===h?"#fff7ed":"transparent",borderRadius:6,padding:"4px 8px",margin:"1px 0"}}>
            <span>{l}{i===h&&" ← 目前"}</span><span style={{fontWeight:700}}>${(prop.r[i]||0).toLocaleString()}</span>
          </div>)}
        <div style={{borderTop:"1px solid #e2e8f0",marginTop:6,paddingTop:6,display:"flex",
          justifyContent:"space-between",fontSize:12,color:"#94a3b8"}}>
          <span>蓋房費用</span><span style={{fontWeight:600}}>${cost}/間</span></div>
      </div>}
      {owner&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,
        background:`${owner.color}10`,padding:"8px 12px",borderRadius:10}}>
        <div style={{width:26,height:26,borderRadius:8,background:owner.color,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{PA[owner.id]}</div>
        <span style={{fontSize:13,fontWeight:600,color:owner.color}}>{owner.name}</span>
      </div>}
      <div style={{display:"flex",gap:8}}>
        {canB&&ip&&h<5&&<button onClick={()=>onBuild(prop)} style={{
          flex:1,padding:"11px 0",background:"linear-gradient(135deg,#22c55e,#16a34a)",
          border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
          boxShadow:"0 4px 14px rgba(34,197,94,0.3)"}}>{h<4?`🏠 蓋房 $${cost}`:`🏨 升級飯店 $${cost}`}</button>}
        <button onClick={onClose} style={{flex:canB&&ip&&h<5?0:1,minWidth:80,padding:"11px 0",
          background:"#f1f5f9",border:"none",borderRadius:12,color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer"}}>關閉</button>
      </div>
    </div>
  </div>;
}

function EventBanner({ev}){
  if(!ev)return null;
  return <div style={{position:"fixed",top:0,left:0,right:0,
    background:"linear-gradient(135deg,#1e1b2e,#312e81)",
    color:"#fff",padding:"16px 24px",textAlign:"center",fontSize:15,fontWeight:700,
    zIndex:180,animation:"slideDown 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    letterSpacing:1,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>{ev.text}</div>;
}

/* ═══════════════ MAIN ═══════════════ */
export default function Game(){
  const[scr,setScr]=useState("menu");const[npc,setNpc]=useState(1);
  const pollRef=useRef(null);

  const[mode,setMode]=useState(null);const[ps,setPs]=useState([]);const[cur,setCur]=useState(0);
  const[dice,setDice]=useState([1,1]);const[rolling,setRolling]=useState(false);
  const[ow,setOw]=useState({});const[hs,setHs]=useState({});
  const[msg,setMsg]=useState("");const[log,setLog]=useState([]);
  const[showBuy,setShowBuy]=useState(false);const[buyPr,setBuyPr]=useState(null);
  const[mAn,setMAn]=useState([]);const[moving,setMoving]=useState(false);
  const[aPos,setAPos]=useState({});const[winner,setWinner]=useState(null);
  const[bPx,setBPx]=useState(540);const[mySlot,setMySlot]=useState(0);const[tc,setTc]=useState(0);
  const[wheelOn,setWheelOn]=useState(false);const[wheelRes,setWheelRes]=useState(null);
  const[infoP,setInfoP]=useState(null);const[confetti,setCon]=useState(false);
  const[gEv,setGEv]=useState(null);const[shk,setShk]=useState(false);const[locked,setLocked]=useState(false);

  const uid=useRef(0);const gs=useRef({});const busy=useRef(false);const pwRef=useRef(null);

  useEffect(()=>{const fn=()=>{const w=window.innerWidth;setBPx(w<480?Math.min(w-16,375):w<768?Math.min(w-32,500):560);};
    fn();window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);
  useEffect(()=>{gs.current={ps,ow,hs,cur,winner,mySlot,mode,tc};},[ps,ow,hs,cur,winner,mySlot,mode,tc]);
  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  const addLog=useCallback(m=>setLog(p=>[m,...p].slice(0,50)),[]);
  const showM=useCallback((pid,a)=>{if(!a)return;const id=++uid.current;
    setMAn(p=>[...p,{id,pid,a}]);setTimeout(()=>setMAn(p=>p.filter(x=>x.id!==id)),1800);},[]);
  const pop=()=>{setCon(true);setTimeout(()=>setCon(false),3000);};
  const shake=()=>{setShk(true);setTimeout(()=>setShk(false),600);};

  // ══════ SOLO ══════
  const startSolo=(n)=>{const p=Array.from({length:1+n},(_,i)=>({id:i,name:PN[i],money:15000,position:0,color:PC[i],bk:false,isAI:i>0}));
    const ap={};p.forEach(x=>{ap[x.id]=0;});setPs(p);setAPos(ap);setCur(0);setOw({});setHs({});setWinner(null);
    setLog([]);setShowBuy(false);setWheelOn(false);setMoving(false);setRolling(false);setTc(0);setLocked(false);
    setMsg("擲骰子吧！");addLog("🎮 遊戲開始！");setMode("solo");setMySlot(0);setScr("game");};

  // ══════ BUILD ══════
  const buildH=(prop)=>{const g=gs.current,p=g.ps[g.cur],h=g.hs[prop.id]||0;if(h>=5)return;
    const cost=HC[prop.g]||1000;if(p.money<cost){setMsg("資金不足！");return;}
    const grp=P.filter(x=>x.g===prop.g&&x.g>0);if(!grp.every(x=>g.ow[x.id]===p.id)){setMsg("需集滿同色！");return;}
    const up=g.ps.map(x=>({...x}));up[g.cur].money-=cost;const nh={...g.hs,[prop.id]:h+1};
    showM(g.cur,-cost);setPs(up);setHs(nh);
    addLog(`${p.name} ${prop.n} ${h<4?`🏠×${h+1}`:"🏨"}`);pop();setInfoP(null);
  };

  // ══════ ROLL ══════
  const doRoll=useCallback(()=>{if(rolling||showBuy||moving||winner||wheelOn||locked)return;
    const g=gs.current;if(g.ps[g.cur]?.isAI)return;exeRoll();},[rolling,showBuy,moving,winner,wheelOn,locked]);
  const exeRoll=()=>{setRolling(true);let c=0;const iv=setInterval(()=>{
    setDice([Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)]);
    if(++c>8){clearInterval(iv);const d1=Math.ceil(Math.random()*6),d2=Math.ceil(Math.random()*6);
      setDice([d1,d2]);setRolling(false);beginMove(d1+d2);}},75);};
  const beginMove=(steps)=>{setMoving(true);const g=gs.current,start=g.ps[g.cur].position;
    let step=0,passed=false;const tick=()=>{step++;const pos=(start+step)%BS;
      setAPos(p=>({...p,[g.cur]:pos}));if(pos===0&&step>0)passed=true;
      if(step<steps)setTimeout(tick,145);else setTimeout(()=>finishMove(pos,passed),200);};setTimeout(tick,160);};
  const finishMove=(np,passed)=>{setMoving(false);const g=gs.current;const up=g.ps.map(p=>({...p}));
    up[g.cur].position=np;if(passed){up[g.cur].money+=2000;showM(g.cur,2000);addLog(`${up[g.cur].name} 起點 +$2,000`);}
    setPs(up);handleLand(up,g.ow,g.hs,g.cur,np);};

  // ══════ LANDING ══════
  const handleLand=(p,o,h,c,pos)=>{const cell=P[pos];if(!cell){endTurn(p,o,h);return;}const pl=p[c];
    if(cell.t==="fate"||cell.t==="chance"){const r=WHEEL[Math.floor(Math.random()*WHEEL.length)];
      setWheelRes(r);setWheelOn(true);pwRef.current={p,o,h,c,r};return;}
    if(cell.t==="tax"){const up=p.map(x=>({...x}));up[c].money=Math.max(0,up[c].money-cell.r[0]);
      showM(c,-cell.r[0]);setMsg(`繳稅 $${cell.r[0]}`);addLog(`${pl.name} 繳稅 -$${cell.r[0]}`);shake();
      if(up[c].money<=0)up[c].bk=true;setPs(up);checkWin(up);endTurn(up,o,h);return;}
    const buyable=["prop","station","util"].includes(cell.t);
    if(!buyable){setMsg(`${cell.e} ${cell.n}`);endTurn(p,o,h);return;}
    if(o[cell.id]!==undefined&&o[cell.id]!==c){const oid=o[cell.id],rent=getRent(cell,h,o,oid);
      const up=p.map(x=>({...x}));up[c].money=Math.max(0,up[c].money-rent);up[oid].money+=rent;
      showM(c,-rent);setTimeout(()=>showM(oid,rent),350);
      setMsg(`付 $${rent} 給 ${up[oid].name}`);addLog(`${pl.name}→${up[oid].name} $${rent}`);
      if(rent>=1000)shake();if(up[c].money<=0)up[c].bk=true;setPs(up);checkWin(up);endTurn(up,o,h);return;}
    if(o[cell.id]===c){setMsg(`自己的地盤！`);endTurn(p,o,h);return;}
    if(pl.money<cell.pr){setMsg("資金不足！");endTurn(p,o,h);return;}
    if(pl.isAI){if(aiWants(pl,cell,o)){const up=p.map(x=>({...x}));up[c].money-=cell.pr;const no={...o,[cell.id]:c};
      showM(c,-cell.pr);setMsg(`🤖 ${pl.name} 買 ${cell.n}`);addLog(`🤖 ${pl.name} 買 ${cell.n}`);
      setPs(up);setOw(no);const{hs:nh,built}=aiBuild(up[c],no,{...h});
      if(built){addLog(`🤖 ${pl.name} ${built.n} 蓋房`);setHs(nh);setPs([...up]);}
      endTurn(up,no,built?nh:h);}else{setMsg(`🤖 ${pl.name} 跳過`);endTurn(p,o,h);}return;}
    setBuyPr(cell);setShowBuy(true);setMsg(`${cell.e} ${cell.n} — $${cell.pr}`);
    };

  const onWheelDone=()=>{const pw=pwRef.current;if(!pw)return;
    setWheelOn(false);setWheelRes(null);pwRef.current=null;
    const up=pw.p.map(x=>({...x}));up[pw.c].money=Math.max(0,up[pw.c].money+pw.r.amt);
    showM(pw.c,pw.r.amt);addLog(`${up[pw.c].name}: ${pw.r.text} ${pw.r.amt>0?"+":""}$${Math.abs(pw.r.amt)}`);
    if(pw.r.amt>0)pop();if(pw.r.amt<-500)shake();if(up[pw.c].money<=0)up[pw.c].bk=true;
    setPs(up);checkWin(up);endTurn(up,pw.o,pw.h);};

  const doBuyAct=()=>{if(!buyPr)return;const g=gs.current;const up=g.ps.map(x=>({...x}));
    up[g.cur].money-=buyPr.pr;const no={...g.ow,[buyPr.id]:g.cur};showM(g.cur,-buyPr.pr);
    addLog(`${up[g.cur].name} 買 ${buyPr.n}`);pop();setPs(up);setOw(no);setShowBuy(false);setBuyPr(null);endTurn(up,no,g.hs);};
  const skipBuyAct=()=>{addLog(`${gs.current.ps[gs.current.cur].name} 跳過`);setShowBuy(false);setBuyPr(null);endTurn();};
  const checkWin=(p)=>{const a=p.filter(x=>!x.bk);if(a.length===1){setWinner(a[0]);setMsg(`🏆 ${a[0].name} 獲勝！`);addLog(`🏆 ${a[0].name} 贏了！`);pop();}};

  const endTurn=(uP,uO,uH)=>{setLocked(true);const g=gs.current;let p=uP||g.ps,o=uO||g.ow,h=uH||g.hs;
    if(g.winner||p.filter(x=>!x.bk).length<=1)return;
    let next=(g.cur+1)%p.length,guard=0;while(p[next]?.bk&&guard++<p.length)next=(next+1)%p.length;
    const ntc=(g.tc||0)+1;setTc(ntc);
    if(ntc>0&&ntc%8===0&&Math.random()>0.3){const ev=GEV[Math.floor(Math.random()*GEV.length)];
      setGEv(ev);shake();p=ev.fn(p.map(x=>({...x})));setPs(p);addLog(ev.text);setTimeout(()=>setGEv(null),3000);}
    const delay=p[next]?.isAI?1000:500;
    setTimeout(()=>{setCur(next);if(p[next]?.isAI){setMsg(`🤖 ${p[next].name} ...`);setTimeout(()=>{if(!gs.current.winner)exeRoll();},900);}
      else{setMsg("擲骰子吧！");setLocked(false);}},delay);};

  const goMenu=()=>{if(pollRef.current)clearInterval(pollRef.current);setScr("menu");setMode(null);setWinner(null);setShowBuy(false);setWheelOn(false);};

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  if(scr==="menu"){
    return <div style={{minHeight:"100vh",background:"#faf9f7",fontFamily:"'Quicksand','Noto Sans TC',sans-serif",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center",maxWidth:420,width:"100%"}}>
        {/* Hero */}
        <div style={{background:"linear-gradient(135deg,#1e1b2e 0%,#312e81 50%,#4c1d95 100%)",
          borderRadius:28,padding:"36px 24px 28px",marginBottom:16,position:"relative",overflow:"hidden",
          boxShadow:"0 20px 60px rgba(30,27,46,0.3)"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,
            background:"radial-gradient(circle at 30% 20%,rgba(249,115,22,0.15),transparent 60%)",pointerEvents:"none"}}/>
          <div style={{fontSize:56,marginBottom:8,animation:"bounce 2.5s ease-in-out infinite",position:"relative"}}>🎲</div>
          <h1 style={{fontSize:32,fontWeight:800,color:"#fff",letterSpacing:3,margin:"0 0 4px",position:"relative"}}>台灣大富翁</h1>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:8,fontWeight:600,position:"relative"}}>TAIWAN MONOPOLY</p>
        </div>

        {/* Solo */}
        <div style={{background:"#fff",borderRadius:20,padding:"22px 24px",marginBottom:10,
          boxShadow:"0 2px 16px rgba(0,0,0,0.04)",border:"1px solid #f0eeeb"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#f97316,#ea580c)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
              boxShadow:"0 4px 12px rgba(249,115,22,0.3)"}}>🎮</div>
            <div style={{textAlign:"left"}}><div style={{fontSize:15,fontWeight:800,color:"#1e1b2e"}}>單人模式</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>對抗超強 AI 電腦</div></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14}}>
            {[1,2,3].map(n=><button key={n} onClick={()=>setNpc(n)} style={{
              width:52,height:52,borderRadius:14,fontSize:17,fontWeight:800,cursor:"pointer",
              border:npc===n?"2.5px solid #f97316":"2.5px solid #e5e2de",
              background:npc===n?"linear-gradient(135deg,#f97316,#ea580c)":"#fff",
              color:npc===n?"#fff":"#94a3b8",transition:"all 0.2s",
              boxShadow:npc===n?"0 4px 14px rgba(249,115,22,0.3)":"none",
            }}>{n} <span style={{fontSize:9,display:"block",marginTop:-2}}>AI</span></button>)}
          </div>
          <button onClick={()=>startSolo(npc)} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#f97316,#ea580c)",
            color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",
            boxShadow:"0 6px 20px rgba(249,115,22,0.3)",letterSpacing:2}}>開始遊戲</button>
        </div>

        <div style={{marginTop:14,display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap"}}>
          {["🏠 蓋房","🎡 轉盤","🌪️ 事件","🤖 AI"].map(f=>
            <span key={f} style={{fontSize:10,background:"#1e1b2e",color:"#f97316",
              padding:"4px 10px",borderRadius:20,fontWeight:700,letterSpacing:0.5}}>{f}</span>)}
        </div>
      </div>
    </div>;
  }

  /* ═══════════════ GAME ═══════════════ */
  const cPx=bPx/8,curP=ps[cur];
  const isMyTurn=curP&&!curP.isAI;
  const canRoll=isMyTurn&&!rolling&&!showBuy&&!moving&&!winner&&!wheelOn&&!locked;
  const canB=isMyTurn&&!rolling&&!moving&&!showBuy&&!winner&&!wheelOn&&!locked;
  const myBld=canB?P.filter(p=>p.t==="prop"&&ow[p.id]===cur&&(hs[p.id]||0)<5&&
    P.filter(x=>x.g===p.g&&x.g>0).every(x=>ow[x.id]===cur)):[];

  return <div style={{minHeight:"100vh",background:"#faf9f7",
    fontFamily:"'Quicksand','Noto Sans TC',sans-serif",padding:"8px 6px",color:"#1e1b2e"}}>
    <style>{CSS}</style>
    <Confetti on={confetti}/><EventBanner ev={gEv}/>
    <Wheel on={wheelOn} res={wheelRes} onDone={onWheelDone}/>
    {infoP&&<Info prop={infoP} ow={ow} hs={hs} ps={ps} onClose={()=>setInfoP(null)}
      onBuild={buildH} canB={canB&&ow[infoP.id]===cur}/>}

    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,padding:"0 4px"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#1e1b2e,#312e81)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🎲</div>
        <span style={{fontSize:13,fontWeight:800,color:"#1e1b2e",letterSpacing:1}}>台灣大富翁</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:10,color:"#cbd5e1",fontWeight:700}}>R{tc}</span>
        <button onClick={goMenu} style={{width:28,height:28,borderRadius:8,background:"#f1f5f9",
          border:"none",fontSize:12,cursor:"pointer",color:"#94a3b8",display:"flex",
          alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
    </div>

    {/* Players */}
    <div style={{display:"flex",gap:4,marginBottom:6,overflow:"auto",padding:"0 2px"}}>
      {ps.map(p=><div key={p.id} style={{
        flex:"1 1 0",minWidth:76,padding:"7px 8px",
        background:p.id===cur?"#fff":"#faf9f7",
        border:`2px solid ${p.id===cur?p.color:"transparent"}`,
        borderRadius:14,opacity:p.bk?0.25:1,transition:"all 0.3s",position:"relative",
        boxShadow:p.id===cur?`0 4px 16px ${p.color}20`:"none"}}>
        {mAn.filter(a=>a.pid===p.id).map(a=><div key={a.id} style={{
          position:"absolute",top:-12,right:4,fontSize:14,fontWeight:900,
          color:a.a>0?"#16a34a":"#dc2626",zIndex:50,pointerEvents:"none",
          animation:"moneyRise 1.6s ease forwards"}}>{a.a>0?"+":""}{a.a.toLocaleString()}</div>)}
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
          <div style={{width:22,height:22,borderRadius:7,background:`linear-gradient(135deg,${p.color},${p.color}bb)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
            boxShadow:p.id===cur?`0 0 0 2.5px ${p.color}30`:"none"}}>{PA[p.id]}</div>
          <span style={{fontSize:10,fontWeight:800,color:p.bk?"#cbd5e1":"#334155"}}>
            {p.name}{p.bk&&" 💀"}
          </span>
        </div>
        <div style={{fontSize:15,fontWeight:900,color:p.color,letterSpacing:0.5}}>${p.money.toLocaleString()}</div>
        <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>
          {Object.values(ow).filter(o=>o===p.id).length}地
          {Object.keys(hs).filter(k=>hs[k]>0&&ow[k]===p.id).reduce((s,k)=>s+(hs[k]||0),0)>0&&
            ` · ${Object.keys(hs).filter(k=>hs[k]>0&&ow[k]===p.id).reduce((s,k)=>s+(hs[k]||0),0)}房`}
        </div>
      </div>)}
    </div>

    {/* Board */}
    <div style={{display:"flex",justifyContent:"center",marginBottom:6}}>
      <div style={{position:"relative",width:bPx,height:bPx,
        background:"linear-gradient(135deg,#f8f7f4,#f3f1ed)",
        borderRadius:18,border:"2px solid #e5e2dc",
        boxShadow:"0 8px 40px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.8)",
        overflow:"hidden",animation:shk?"boardShake 0.15s ease 3":"none"}}>

        {/* Board texture */}
        <div style={{position:"absolute",inset:0,opacity:0.03,
          backgroundImage:"repeating-linear-gradient(45deg,#000 0px,#000 1px,transparent 1px,transparent 12px)",
          pointerEvents:"none"}}/>

        {P.map(prop=>{
          const{c:col,r:row}=c2g(prop.id);const od=ow[prop.id]!==undefined;const oc=od?PC[ow[prop.id]]:null;
          const h=hs[prop.id]||0;
          const isCorner=[0,7,14,21].includes(prop.id);
          return <div key={prop.id} onClick={()=>setInfoP(prop)} style={{
            position:"absolute",left:col*cPx+1,top:row*cPx+1,width:cPx-2,height:cPx-2,
            background:od?`linear-gradient(135deg,${oc}12,${oc}06)`:"rgba(255,255,255,0.7)",
            border:`1px solid ${od?`${oc}25`:"rgba(0,0,0,0.06)"}`,
            borderRadius:isCorner?8:4,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            overflow:"hidden",cursor:"pointer",transition:"all 0.2s",
            boxShadow:"0 1px 3px rgba(0,0,0,0.02)"}}>
            {["prop","station","util"].includes(prop.t)&&
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,
                background:`linear-gradient(90deg,${prop.c},${prop.c}cc)`,borderRadius:"4px 4px 0 0"}}/>}
            {od&&<div style={{position:"absolute",top:4,right:4,width:7,height:7,
              borderRadius:"50%",background:oc,boxShadow:`0 0 6px ${oc}60`}}/>}
            {h>0&&h<5&&<div style={{position:"absolute",bottom:2,left:3,display:"flex",gap:1}}>
              {Array.from({length:h}).map((_,i)=><div key={i} style={{width:5,height:6,
                background:"#16a34a",borderRadius:"1px 1px 0 0",boxShadow:"0 -1px 0 #22c55e"}}/>)}</div>}
            {h===5&&<div style={{position:"absolute",bottom:1,left:3,fontSize:8}}>🏨</div>}
            <span style={{fontSize:Math.max(13,cPx*0.26),lineHeight:1}}>{prop.e}</span>
            <span style={{fontSize:Math.max(7,cPx*0.115),color:"#64748b",textAlign:"center",
              lineHeight:1.1,marginTop:1,fontWeight:700,padding:"0 1px",letterSpacing:-0.3}}>{prop.n}</span>
            {prop.pr>0&&<span style={{fontSize:Math.max(6.5,cPx*0.095),color:"#94a3b8",fontWeight:600}}>
              ${prop.pr}</span>}
          </div>;
        })}

        {/* Tokens */}
        {ps.filter(p=>!p.bk).map(p=>{
          const pos=aPos[p.id]??p.position;const{c:col,r:row}=c2g(pos);
          const off=[[0.28,0.73],[0.72,0.73],[0.28,0.33],[0.72,0.33]];const[ox,oy]=off[p.id]||[0.5,0.5];
          const ic=p.id===cur;
          return <div key={`t${p.id}`} style={{
            position:"absolute",
            left:col*cPx+cPx*ox-12,top:row*cPx+cPx*oy-12,
            width:24,height:24,borderRadius:8,
            background:`linear-gradient(135deg,${p.color},${p.color}cc)`,
            border:"2.5px solid #fff",
            boxShadow:ic?`0 0 0 2px ${p.color}50,0 4px 12px ${p.color}40`:`0 2px 8px ${p.color}30`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
            transition:"left 0.13s ease-out,top 0.13s ease-out",
            animation:moving&&ic?"hop 0.15s ease-out":"none",
            zIndex:ic?20:10}}>
            {PA[p.id]}
          </div>;
        })}

        {/* Center */}
        <div style={{position:"absolute",left:cPx,top:cPx,width:cPx*6,height:cPx*6,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:6,pointerEvents:"none"}}>

          {/* Dice area */}
          <div style={{background:"rgba(255,255,255,0.85)",borderRadius:20,padding:"14px 20px",
            backdropFilter:"blur(8px)",boxShadow:"0 4px 20px rgba(0,0,0,0.04)",
            display:"flex",flexDirection:"column",alignItems:"center",gap:8,
            border:"1px solid rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",gap:10}}>
              {dice.map((d,i)=><Dice key={i} v={d} rolling={rolling}/>)}
            </div>
            {!rolling&&<div style={{fontSize:20,fontWeight:900,color:"#f97316",
              textShadow:"0 0 12px rgba(249,115,22,0.2)"}}>{dice[0]+dice[1]}</div>}
            <div style={{fontSize:12,color:"#64748b",textAlign:"center",maxWidth:200,
              lineHeight:1.4,fontWeight:600,minHeight:17}}>{msg}</div>
          </div>

          {/* Actions */}
          <div style={{pointerEvents:"auto",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            {showBuy&&buyPr?<div style={{display:"flex",gap:8,animation:"scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
              <button onClick={doBuyAct} style={{padding:"10px 22px",
                background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:12,
                color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",
                boxShadow:"0 4px 14px rgba(34,197,94,0.3)"}}>購買 ${buyPr.pr}</button>
              <button onClick={skipBuyAct} style={{padding:"10px 22px",background:"#fff",
                border:"2px solid #e5e2de",borderRadius:12,color:"#94a3b8",fontSize:13,
                fontWeight:700,cursor:"pointer"}}>跳過</button>
            </div>:winner?<div style={{textAlign:"center",animation:"scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)"}}>
              <div style={{fontSize:48,marginBottom:6}}>🏆</div>
              <div style={{fontSize:20,fontWeight:900,color:winner.color,marginBottom:10,
                textShadow:`0 0 20px ${winner.color}30`}}>{winner.name} 獲勝！</div>
              <button onClick={goMenu} style={{padding:"10px 28px",
                background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",border:"none",
                borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer",
                boxShadow:"0 4px 16px rgba(249,115,22,0.3)"}}>再來一局</button>
            </div>:<>
              <button onClick={canRoll?doRoll:undefined} style={{
                padding:"11px 32px",border:"none",borderRadius:14,fontSize:14,fontWeight:800,
                letterSpacing:1,transition:"all 0.2s",
                background:canRoll?"linear-gradient(135deg,#f97316,#ea580c)":"#e5e2de",
                color:canRoll?"#fff":"#94a3b8",
                cursor:canRoll?"pointer":"default",
                boxShadow:canRoll?"0 6px 20px rgba(249,115,22,0.3)":"none",
                transform:canRoll?"scale(1)":"scale(0.97)"}}>
                {rolling?"🎲 ...":moving?"🏃 移動中":!isMyTurn?"🤖 AI":"🎲 擲骰子"}
              </button>
              {myBld.length>0&&canB&&!rolling&&!moving&&
                <button onClick={()=>setInfoP(myBld[0])} style={{padding:"6px 16px",
                  background:"linear-gradient(135deg,#fef3c7,#fde68a)",border:"1.5px solid #fbbf24",
                  borderRadius:10,fontSize:10,fontWeight:700,color:"#92400e",
                  cursor:"pointer",animation:"scaleIn 0.3s ease"}}>🏠 蓋房子</button>}
            </>}
          </div>
        </div>
      </div>
    </div>

    {/* Log */}
    <div style={{maxWidth:bPx,margin:"0 auto",background:"#fff",borderRadius:14,
      border:"1px solid #f0eeeb",padding:"8px 10px",maxHeight:80,overflowY:"auto",
      boxShadow:"0 1px 6px rgba(0,0,0,0.03)"}}>
      <div style={{fontSize:9,fontWeight:800,color:"#cbd5e1",marginBottom:3,letterSpacing:2,textTransform:"uppercase"}}>log</div>
      {log.slice(0,20).map((l,i)=><div key={i} style={{fontSize:10,color:i===0?"#475569":"#cbd5e1",
        padding:"2px 0",borderBottom:"1px solid #f8f7f4",
        animation:i===0?"fadeUp 0.3s ease":"none",fontWeight:i===0?600:400}}>{l}</div>)}
    </div>
  </div>;
}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
button{font-family:inherit}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#e5e2de;border-radius:3px}
input:focus{border-color:#f97316!important;box-shadow:0 0 0 3px rgba(249,115,22,0.15)!important}
@keyframes hop{0%{transform:translateY(0) scale(1)}30%{transform:translateY(-18px) scale(1.18)}60%{transform:translateY(-2px) scale(0.92)}100%{transform:translateY(0) scale(1)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes diceRoll{0%{transform:rotate(-10deg) scale(1.06)}100%{transform:rotate(10deg) scale(0.94)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes moneyRise{0%{opacity:1;transform:translateY(0) scale(1)}60%{opacity:0.9;transform:translateY(-30px) scale(1.15)}100%{opacity:0;transform:translateY(-48px) scale(0.85)}}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(1080deg);opacity:0}}
@keyframes boardShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}
`;
