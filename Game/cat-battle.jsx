import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════
   にゃんこ突撃 — Nyanko Assault
   HAO0321 ©Studio
   ═══════════════════════════════════════════════════ */

const CW = 1800;
const PBX = 100;
const EBX = CW - 100;

const BASE_CATS = [
  { id:"basic",name:"小白貓",cost:50, hp:150,atk:24,spd:1.9,rng:34,cd:50, as:26,clr:"#FFB74D",clr2:"#FF9800" },
  { id:"tank", name:"鐵壁貓",cost:100,hp:420,atk:15,spd:0.9,rng:28,cd:80, as:40,clr:"#FF8A65",clr2:"#E64A19" },
  { id:"axe",  name:"武士貓",cost:120,hp:170,atk:60,spd:2.1,rng:38,cd:70, as:23,clr:"#EF5350",clr2:"#C62828" },
  { id:"ninja",name:"忍者貓",cost:150,hp:270,atk:40,spd:1.7,rng:44,cd:90, as:30,clr:"#AB47BC",clr2:"#7B1FA2" },
  { id:"fast", name:"疾風貓",cost:200,hp:120,atk:30,spd:4.5,rng:32,cd:60, as:18,clr:"#26C6DA",clr2:"#00838F" },
  { id:"arch", name:"弓手貓",cost:250,hp:200,atk:88,spd:1.4,rng:140,cd:110,as:46,clr:"#42A5F5",clr2:"#1565C0" },
  { id:"gen",  name:"將軍貓",cost:350,hp:380,atk:100,spd:1.2,rng:40,cd:130,as:32,clr:"#66BB6A",clr2:"#2E7D32" },
  { id:"drag", name:"龍神貓",cost:550,hp:240,atk:140,spd:0.8,rng:200,cd:170,as:55,clr:"#FFA726",clr2:"#E65100" },
];

const BASE_ENEMIES = [
  { hp:120, atk:18, spd:1.6,rng:30,as:27,clr:"#A1887F",clr2:"#6D4C41",shape:"dog" },
  { hp:480, atk:13, spd:0.45,rng:24,as:42,clr:"#90A4AE",clr2:"#546E7A",shape:"snail" },
  { hp:300, atk:68, spd:1.8,rng:38,as:32,clr:"#8D6E63",clr2:"#4E342E",shape:"bear" },
  { hp:150, atk:48, spd:2.5,rng:90,as:36,clr:"#E57373",clr2:"#C62828",shape:"tengu" },
  { hp:1600,atk:120,spd:0.6,rng:54,as:46,clr:"#7E57C2",clr2:"#4A148C",shape:"boss" },
  { hp:80,  atk:12, spd:3.2,rng:28,as:20,clr:"#FFD54F",clr2:"#F9A825",shape:"fox" },
  { hp:600, atk:85, spd:1.0,rng:100,as:50,clr:"#5C6BC0",clr2:"#283593",shape:"mage" },
  { hp:2400,atk:160,spd:0.5,rng:60,as:52,clr:"#D32F2F",clr2:"#B71C1C",shape:"dragon" },
];

const STAGES = [
  { name:"春の草原",sub:"Spring Meadow",reward:150,
    enemies:[0,0,0,0,0,1],si:170,diff:1,
    sky1:"#89CFF0",sky2:"#B6E3FF",sky3:"#DFF1FF",grd:"#7CB342",grd2:"#558B2F",grd3:"#9CCC65" },
  { name:"竹林秘境",sub:"Bamboo Forest",reward:200,
    enemies:[0,0,1,1,2,0,0,1],si:150,diff:1.2,
    sky1:"#81C784",sky2:"#A5D6A7",sky3:"#E8F5E9",grd:"#43A047",grd2:"#2E7D32",grd3:"#66BB6A" },
  { name:"紅葉山道",sub:"Autumn Trail",reward:280,
    enemies:[0,5,2,1,5,5,2,0,3,1],si:130,diff:1.5,
    sky1:"#FFAB91",sky2:"#FFCCBC",sky3:"#FFF3E0",grd:"#A1887F",grd2:"#795548",grd3:"#BCAAA4" },
  { name:"妖怪之森",sub:"Yokai Forest",reward:350,
    enemies:[5,0,3,1,2,5,3,0,2,1,4],si:115,diff:1.8,
    sky1:"#CE93D8",sky2:"#D1C4E9",sky3:"#EDE7F6",grd:"#78909C",grd2:"#546E7A",grd3:"#90A4AE" },
  { name:"雪山險道",sub:"Frozen Peak",reward:400,
    enemies:[1,1,5,2,3,5,6,0,0,2,3,1],si:105,diff:2.2,
    sky1:"#B3E5FC",sky2:"#E1F5FE",sky3:"#FAFAFA",grd:"#B0BEC5",grd2:"#78909C",grd3:"#CFD8DC" },
  { name:"火山地獄",sub:"Volcanic Hell",reward:500,
    enemies:[2,5,3,2,6,5,0,3,2,6,1,2,4],si:95,diff:2.8,
    sky1:"#FF8A65",sky2:"#FFAB91",sky3:"#FBE9E7",grd:"#6D4C41",grd2:"#4E342E",grd3:"#8D6E63" },
  { name:"冥界深淵",sub:"Abyss Gate",reward:650,
    enemies:[6,3,5,2,6,3,5,1,2,6,3,0,0,4],si:85,diff:3.5,
    sky1:"#7E57C2",sky2:"#9575CD",sky3:"#D1C4E9",grd:"#37474F",grd2:"#263238",grd3:"#546E7A" },
  { name:"終焉決戰",sub:"Final Armageddon",reward:1000,
    enemies:[6,5,3,2,6,5,3,2,6,4,0,0,6,3,7],si:75,diff:4.5,
    sky1:"#E53935",sky2:"#EF9A9A",sky3:"#FFEBEE",grd:"#424242",grd2:"#212121",grd3:"#616161" },
];

const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);

// ─── Persistent state via React state (simulated save) ───
const initSave=()=>({
  coins:0, cleared:[], catLvl:BASE_CATS.map(()=>1),
  walletLvl:1, cannonLvl:1, baseHpLvl:1,
});

export default function App(){
  const [scr,setScr]=useState("title");
  const [si,setSi]=useState(0);
  const [save,setSave]=useState(initSave);
  const [won,setWon]=useState(true);
  const [reward,setReward]=useState(0);
  const [gk,setGk]=useState(0);

  const play=i=>{setSi(i);setGk(k=>k+1);setScr("game");};
  const end=(w)=>{
    setWon(w);
    const r=w?STAGES[si].reward:Math.floor(STAGES[si].reward*.2);
    setReward(r);
    setSave(s=>{
      const n={...s,coins:s.coins+r};
      if(w&&!s.cleared.includes(si))n.cleared=[...s.cleared,si];
      return n;
    });
    setScr("result");
  };

  return(
    <div style={{width:"100%",height:"100dvh",overflow:"hidden",position:"relative",
      fontFamily:"'Zen Maru Gothic','Rounded Mplus 1c',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        button{font-family:inherit;cursor:pointer}
        @keyframes popScale{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes floatBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes petal{0%{opacity:0;transform:translateY(-10px) rotate(0)}10%{opacity:.5}90%{opacity:.4}100%{opacity:0;transform:translateY(100vh) rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(255,138,65,.4)}50%{box-shadow:0 0 0 8px rgba(255,138,65,0)}}
        @keyframes shakeX{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
        ::-webkit-scrollbar{display:none}
      `}</style>
      {scr==="title"&&<Title onStart={()=>setScr("select")}/>}
      {scr==="select"&&<SelectScreen stages={STAGES} save={save} onPick={play} onUpgrade={()=>setScr("upgrade")} onBack={()=>setScr("title")}/>}
      {scr==="upgrade"&&<UpgradeScreen save={save} setSave={setSave} onBack={()=>setScr("select")}/>}
      {scr==="game"&&<GameScreen key={gk} stage={STAGES[si]} save={save} onEnd={end} onBack={()=>setScr("select")}/>}
      {scr==="result"&&<ResultScreen won={won} name={STAGES[si].name} reward={reward} onRetry={()=>play(si)} onMenu={()=>setScr("select")}/>}
    </div>
  );
}

// ════════ TITLE ════════
function Title({onStart}){
  const [show,setShow]=useState(false);
  useEffect(()=>{setTimeout(()=>setShow(true),60);},[]);
  return(
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(160deg,#E8F5E9 0%,#FFF8E1 35%,#FFF3E0 65%,#FCE4EC 100%)",
      position:"relative",overflow:"hidden",userSelect:"none"}}>
      {[...Array(15)].map((_,i)=>(
        <div key={i} style={{position:"absolute",left:`${2+Math.random()*96}%`,top:-15,
          fontSize:10+Math.random()*10,opacity:0,pointerEvents:"none",
          animation:`petal ${5+Math.random()*7}s linear infinite`,animationDelay:`${Math.random()*7}s`}}>🌸</div>
      ))}
      <div style={{textAlign:"center",zIndex:2,opacity:show?1:0,transform:show?"none":"translateY(16px)",
        transition:"all .8s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14}}>
          {BASE_CATS.map((c,i)=>(
            <div key={i} style={{width:34,height:34,borderRadius:9,
              background:`linear-gradient(135deg,${c.clr},${c.clr2})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 3px 10px ${c.clr}50`,border:"2px solid rgba(255,255,255,.6)",
              animation:`floatBob 2.2s ease-in-out infinite`,animationDelay:`${i*.08}s`}}>
              <CatSVG sz={16} c="#fff"/>
            </div>
          ))}
        </div>
        <h1 style={{fontSize:"clamp(28px,7vw,50px)",fontWeight:900,color:"#3E2723",letterSpacing:5,lineHeight:1.2}}>
          にゃんこ突撃</h1>
        <p style={{color:"#A1887F",fontSize:"clamp(9px,2vw,12px)",letterSpacing:8,fontWeight:500,marginTop:2,marginBottom:32}}>
          NYANKO ASSAULT</p>
        <button onClick={onStart} style={{
          padding:"12px 44px",fontSize:"clamp(13px,3vw,17px)",fontWeight:900,
          background:"linear-gradient(135deg,#FF8A65,#F4511E)",border:"none",borderRadius:40,color:"#fff",
          boxShadow:"0 4px 20px rgba(244,81,30,.3),0 2px 0 #D84315",letterSpacing:3,
          animation:"glow 2.5s ease-in-out infinite"}}>はじめる</button>
        <p style={{color:"#D7CCC8",fontSize:8,marginTop:24,letterSpacing:2}}>HAO0321 ©Studio</p>
      </div>
    </div>
  );
}

function CatSVG({sz=16,c="#fff"}){
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
    <path d="M4 8L7 3h2l-2 5h10l-2-5h2l3 5c2 3 2 6 0 9-1.5 2.5-4 4-8 4s-6.5-1.5-8-4c-2-3-2-6 0-9z" fill={c} opacity=".9"/>
    <circle cx="9" cy="12" r="1.5" fill={c==="#fff"?"#5D4037":"#fff"}/>
    <circle cx="15" cy="12" r="1.5" fill={c==="#fff"?"#5D4037":"#fff"}/>
    <ellipse cx="12" cy="14.5" rx="1" ry=".7" fill={c==="#fff"?"#F48FB1":"rgba(255,255,255,.6)"}/>
  </svg>;
}

// ════════ SELECT ════════
function SelectScreen({stages,save,onPick,onUpgrade,onBack}){
  const icons=["🌸","🎋","🍁","⛩️","❄️","🌋","💀","🐉"];
  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",
      background:"linear-gradient(180deg,#FDFBF7,#FFF8E1)",userSelect:"none",overflow:"auto"}}>
      <div style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,
        borderBottom:"1px solid #EDE7DD",flexShrink:0}}>
        <button onClick={onBack} style={{background:"#FFF",border:"1.5px solid #E0D5C5",borderRadius:10,
          color:"#8D6E63",padding:"4px 10px",fontSize:11,fontWeight:700}}>←</button>
        <span style={{color:"#4E342E",fontSize:15,fontWeight:900,letterSpacing:2,flex:1}}>🗺️ ステージ</span>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"#FFF8E1",padding:"3px 10px",
          borderRadius:8,border:"1px solid #FFE0B240"}}>
          <span style={{fontSize:10}}>🪙</span>
          <span style={{fontSize:12,fontWeight:900,color:"#E65100"}}>{save.coins}</span>
        </div>
        <button onClick={onUpgrade} style={{
          background:"linear-gradient(135deg,#FFB74D,#FF9800)",border:"none",borderRadius:10,
          color:"#fff",padding:"4px 12px",fontSize:11,fontWeight:900,
          boxShadow:"0 2px 8px rgba(255,152,0,.25)"}}>⬆ 強化</button>
      </div>
      <div style={{flex:1,padding:"6px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {stages.map((s,i)=>{
          const ok=i===0||save.cleared.includes(i-1),done=save.cleared.includes(i);
          const stars=done?s.diff<=2?"⭐⭐⭐":s.diff<=3?"⭐⭐":"⭐":"";
          return(
            <button key={i} onClick={()=>ok&&onPick(i)} style={{
              padding:"10px 14px",borderRadius:12,textAlign:"left",
              background:done?"linear-gradient(135deg,#E8F5E9,#F1F8E9)":"#FFF",
              border:`2px solid ${done?"#A5D6A7":ok?"#FFE0B2":"#EEE"}`,
              opacity:ok?1:.35,display:"flex",alignItems:"center",gap:10,
              boxShadow:ok?"0 2px 8px rgba(0,0,0,.04)":"none",
              cursor:ok?"pointer":"not-allowed"}}>
              <div style={{width:36,height:36,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,background:`linear-gradient(135deg,${s.sky1},${s.sky2})`,
                boxShadow:"0 2px 6px rgba(0,0,0,.08)",flexShrink:0}}>
                {done?"⭐":ok?icons[i]:"🔒"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#3E2723",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",gap:4}}>
                  {i+1}. {s.name}
                  {s.diff>=3&&<span style={{fontSize:8,background:"#FFCDD2",color:"#C62828",padding:"1px 5px",borderRadius:4,fontWeight:700}}>HARD</span>}
                  {s.diff>=4&&<span style={{fontSize:8,background:"#F3E5F5",color:"#7B1FA2",padding:"1px 5px",borderRadius:4,fontWeight:700}}>地獄</span>}
                </div>
                <div style={{color:"#BCAAA4",fontSize:9,fontWeight:500,marginTop:1}}>
                  {s.sub} · {s.enemies.length}波 · 🪙{s.reward} {stars}
                </div>
              </div>
              {ok&&<div style={{color:"#FF7043",fontSize:14,fontWeight:900,flexShrink:0}}>▶</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════ UPGRADE ════════
function UpgradeScreen({save,setSave,onBack}){
  const catUpgradeCost=(lv)=>lv*80;
  const statUpgradeCost=(lv)=>lv*120;

  const upgradeCat=(i)=>{
    const cost=catUpgradeCost(save.catLvl[i]);
    if(save.coins<cost||save.catLvl[i]>=10)return;
    setSave(s=>({...s,coins:s.coins-cost,catLvl:s.catLvl.map((l,j)=>j===i?l+1:l)}));
  };
  const upgradeWallet=()=>{
    const cost=statUpgradeCost(save.walletLvl);
    if(save.coins<cost||save.walletLvl>=8)return;
    setSave(s=>({...s,coins:s.coins-cost,walletLvl:s.walletLvl+1}));
  };
  const upgradeCannon=()=>{
    const cost=statUpgradeCost(save.cannonLvl);
    if(save.coins<cost||save.cannonLvl>=8)return;
    setSave(s=>({...s,coins:s.coins-cost,cannonLvl:s.cannonLvl+1}));
  };
  const upgradeBase=()=>{
    const cost=statUpgradeCost(save.baseHpLvl);
    if(save.coins<cost||save.baseHpLvl>=8)return;
    setSave(s=>({...s,coins:s.coins-cost,baseHpLvl:s.baseHpLvl+1}));
  };

  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",
      background:"linear-gradient(180deg,#FDFBF7,#FFF8E1)",userSelect:"none",overflow:"auto"}}>
      <div style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:8,
        borderBottom:"1px solid #EDE7DD",flexShrink:0}}>
        <button onClick={onBack} style={{background:"#FFF",border:"1.5px solid #E0D5C5",borderRadius:10,
          color:"#8D6E63",padding:"4px 10px",fontSize:11,fontWeight:700}}>← 戻る</button>
        <span style={{color:"#4E342E",fontSize:15,fontWeight:900,letterSpacing:2,flex:1}}>⬆ 強化工房</span>
        <div style={{display:"flex",alignItems:"center",gap:4,background:"#FFF8E1",padding:"3px 10px",
          borderRadius:8,border:"1px solid #FFE0B240"}}>
          <span style={{fontSize:10}}>🪙</span>
          <span style={{fontSize:12,fontWeight:900,color:"#E65100"}}>{save.coins}</span>
        </div>
      </div>

      <div style={{flex:1,padding:"8px 12px",display:"flex",flexDirection:"column",gap:6,overflow:"auto"}}>
        {/* Base upgrades */}
        <div style={{fontSize:11,fontWeight:900,color:"#8D6E63",letterSpacing:2,marginTop:4}}>🏯 基地強化</div>
        {[
          {name:"錢包容量",desc:`金幣生產速度 +${save.walletLvl*15}%`,lv:save.walletLvl,max:8,fn:upgradeWallet,cost:statUpgradeCost(save.walletLvl),icon:"💰",clr:"#FFB74D"},
          {name:"貓咪大砲",desc:`大砲傷害 ${50+save.cannonLvl*30}`,lv:save.cannonLvl,max:8,fn:upgradeCannon,cost:statUpgradeCost(save.cannonLvl),icon:"💥",clr:"#EF5350"},
          {name:"城堡耐久",desc:`基地HP ${1400+save.baseHpLvl*200}`,lv:save.baseHpLvl,max:8,fn:upgradeBase,cost:statUpgradeCost(save.baseHpLvl),icon:"🏰",clr:"#66BB6A"},
        ].map((u,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
            background:"#FFF",borderRadius:12,border:"1px solid #EDE7DD"}}>
            <div style={{width:34,height:34,borderRadius:9,background:`${u.clr}20`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
              {u.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:900,color:"#3E2723"}}>{u.name} <span style={{color:"#FF7043",fontSize:10}}>Lv.{u.lv}</span></div>
              <div style={{fontSize:9,color:"#BCAAA4"}}>{u.desc}</div>
              <div style={{display:"flex",gap:2,marginTop:3}}>
                {[...Array(u.max)].map((_,j)=>(
                  <div key={j} style={{width:12,height:3,borderRadius:2,
                    background:j<u.lv?u.clr:"#E0E0E0"}}/>
                ))}
              </div>
            </div>
            <button onClick={u.fn} disabled={save.coins<u.cost||u.lv>=u.max}
              style={{padding:"4px 10px",borderRadius:8,border:"none",fontSize:10,fontWeight:900,
                background:save.coins>=u.cost&&u.lv<u.max?"linear-gradient(135deg,#FFB74D,#FF9800)":"#E0E0E0",
                color:save.coins>=u.cost&&u.lv<u.max?"#fff":"#999",
                opacity:u.lv>=u.max?.4:1}}>
              {u.lv>=u.max?"MAX":`🪙${u.cost}`}
            </button>
          </div>
        ))}

        {/* Cat upgrades */}
        <div style={{fontSize:11,fontWeight:900,color:"#8D6E63",letterSpacing:2,marginTop:8}}>🐱 貓咪強化</div>
        {BASE_CATS.map((c,i)=>{
          const lv=save.catLvl[i],cost=catUpgradeCost(lv),maxed=lv>=10;
          const hpN=Math.floor(c.hp*(1+(lv-1)*.15));
          const atkN=Math.floor(c.atk*(1+(lv-1)*.12));
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",
              background:"#FFF",borderRadius:12,border:`1px solid ${c.clr}30`}}>
              <div style={{width:30,height:30,borderRadius:8,
                background:`linear-gradient(135deg,${c.clr},${c.clr2})`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                border:"1.5px solid rgba(255,255,255,.5)"}}>
                <CatSVG sz={15} c="#fff"/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:900,color:"#3E2723"}}>{c.name} <span style={{color:"#FF7043",fontSize:9}}>Lv.{lv}</span></div>
                <div style={{fontSize:8,color:"#BCAAA4"}}>HP:{hpN} ATK:{atkN}</div>
                <div style={{display:"flex",gap:1.5,marginTop:2}}>
                  {[...Array(10)].map((_,j)=>(
                    <div key={j} style={{width:10,height:2.5,borderRadius:1.5,
                      background:j<lv?c.clr:"#E8E8E8"}}/>
                  ))}
                </div>
              </div>
              <button onClick={()=>upgradeCat(i)} disabled={save.coins<cost||maxed}
                style={{padding:"3px 8px",borderRadius:7,border:"none",fontSize:9,fontWeight:900,
                  background:save.coins>=cost&&!maxed?`linear-gradient(135deg,${c.clr},${c.clr2})`:"#E0E0E0",
                  color:save.coins>=cost&&!maxed?"#fff":"#999",opacity:maxed?.4:1}}>
                {maxed?"MAX":`🪙${cost}`}
              </button>
            </div>
          );
        })}
        <div style={{height:20}}/>
      </div>
    </div>
  );
}

// ════════ RESULT ════════
function ResultScreen({won,name,reward,onRetry,onMenu}){
  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:won?"linear-gradient(180deg,#FFF8E1,#FFFDE7,#F9FBE7)":"linear-gradient(180deg,#FBE9E7,#FFEBEE,#FCE4EC)",
      userSelect:"none"}}>
      <div style={{fontSize:52,marginBottom:8,animation:"popScale .5s cubic-bezier(.16,1,.3,1)"}}>{won?"🏆":"😿"}</div>
      <h1 style={{fontSize:"clamp(22px,6vw,36px)",fontWeight:900,color:won?"#E65100":"#C62828",marginBottom:4}}>
        {won?"勝利！":"敗北..."}</h1>
      <p style={{color:"#BCAAA4",fontSize:11,marginBottom:8}}>{name}</p>
      <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 16px",background:"rgba(255,248,225,.8)",
        borderRadius:10,border:"1px solid #FFE0B240",marginBottom:24}}>
        <span style={{fontSize:14}}>🪙</span>
        <span style={{fontSize:16,fontWeight:900,color:"#E65100"}}>+{reward}</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onRetry} style={{padding:"10px 22px",borderRadius:22,border:"none",color:"#fff",fontSize:13,fontWeight:900,
          background:won?"linear-gradient(135deg,#FF8A65,#F4511E)":"linear-gradient(135deg,#EF5350,#C62828)",
          boxShadow:"0 3px 12px rgba(0,0,0,.12)"}}>{won?"もう一回":"再挑戰"}</button>
        <button onClick={onMenu} style={{padding:"10px 22px",borderRadius:22,background:"#FFF",
          border:"2px solid #E0D5C5",color:"#8D6E63",fontSize:13,fontWeight:700}}>選択に戻る</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  GAME SCREEN
// ════════════════════════════════════════════════
function GameScreen({stage,save,onEnd,onBack}){
  const cvs=useRef(null),G=useRef(null),raf=useRef(null),box=useRef(null);
  const sz=useRef({w:700,h:320});
  const drag=useRef({sx:0,ss:0,on:false});
  const [money,setMoney]=useState(300);
  const baseMaxHp=1400+save.baseHpLvl*200;
  const [php,setPhp]=useState(baseMaxHp);
  const eMaxHp=Math.floor(1100*stage.diff);
  const [ehp,setEhp]=useState(eMaxHp);
  const [cds,setCds]=useState(()=>BASE_CATS.map(()=>0));
  const [paused,setPaused]=useState(false);
  const [over,setOver]=useState(false);
  const [wave,setWave]=useState(`0/${stage.enemies.length}`);
  const [cannonReady,setCannonReady]=useState(0);
  const [combo,setCombo]=useState(0);
  const [speed,setSpeed]=useState(1);

  // Build cats with upgrades
  const CATS=BASE_CATS.map((c,i)=>{
    const lv=save.catLvl[i];
    return{...c,hp:Math.floor(c.hp*(1+(lv-1)*.15)),atk:Math.floor(c.atk*(1+(lv-1)*.12))};
  });

  useEffect(()=>{
    G.current={pu:[],eu:[],ph:baseMaxHp,eh:eMaxHp,money:300,t:0,
      cd:BASE_CATS.map(()=>0),q:[...stage.enemies],st:80,si:stage.si,
      fx:[],pt:[],over:false,sx:0,cannon:0,combo:0,comboTimer:0,
      kills:0,speed:1};
  },[stage,baseMaxHp,eMaxHp]);

  const spawn=useCallback(i=>{
    const g=G.current;if(!g||g.over)return;
    const c=CATS[i];if(g.money<c.cost||g.cd[i]>0)return;
    g.money-=c.cost;g.cd[i]=c.cd;
    g.pu.push({...c,x:PBX+55,mhp:c.hp,at:0,alive:true,s:"p",ph:Math.random()*6.28});
    setMoney(g.money);
  },[CATS]);

  const fireCannon=useCallback(()=>{
    const g=G.current;if(!g||g.over||g.cannon<100)return;
    g.cannon=0;setCannonReady(0);
    const dmg=50+save.cannonLvl*30;
    // Hit all enemies on screen
    for(const u of g.eu){
      if(!u.alive)continue;
      u.hp-=dmg;
      g.fx.push({x:u.x,y:sz.current.h*.45,t:`${dmg}`,l:30,c:"#FF6D00"});
      for(let p=0;p<5;p++)g.pt.push({x:u.x+(Math.random()-.5)*25,y:sz.current.h*.55+(Math.random()-.5)*12,
        vx:(Math.random()-.5)*5,vy:-Math.random()*3-1,l:18,c:"#FFAB40",r:2+Math.random()*2});
      if(u.hp<=0){u.alive=false;g.money+=20;g.kills++;}
    }
    // Screen flash effect
    g.fx.push({x:sz.current.w/2+g.sx,y:0,t:"CANNON",l:20,c:"#FF6D00",big:true});
    setMoney(g.money);
  },[save.cannonLvl]);

  const toggleSpeed=useCallback(()=>{
    const g=G.current;if(!g)return;
    g.speed=g.speed===1?2:1;
    setSpeed(g.speed);
  },[]);

  // Scroll
  const pd=useCallback(e=>{const cx=e.touches?e.touches[0].clientX:e.clientX;
    drag.current={sx:cx,ss:G.current?.sx||0,on:true};},[]);
  const pm=useCallback(e=>{if(!drag.current.on)return;
    const cx=e.touches?e.touches[0].clientX:e.clientX;const g=G.current;if(!g)return;
    g.sx=clamp(drag.current.ss+(drag.current.sx-cx),0,Math.max(0,CW-sz.current.w));},[]);
  const pup=useCallback(()=>{drag.current.on=false;},[]);

  useEffect(()=>{
    const fn=()=>{if(!box.current)return;const w=box.current.clientWidth,h=box.current.clientHeight;
      sz.current={w,h};if(cvs.current){const d=window.devicePixelRatio||1;cvs.current.width=w*d;cvs.current.height=h*d;}};
    fn();window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);
  },[]);

  useEffect(()=>{
    const canvas=cvs.current;if(!canvas)return;const ctx=canvas.getContext("2d");
    const moneyRate=Math.floor(10*(1+save.walletLvl*.15));

    const drawCat=(x,y,r,clr,clr2,isAtk)=>{
      ctx.fillStyle=clr;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.25)";ctx.beginPath();ctx.arc(x-r*.2,y-r*.25,r*.55,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=clr2;
      ctx.beginPath();ctx.moveTo(x-r*.7,y-r*.5);ctx.lineTo(x-r*.3,y-r*1.1);ctx.lineTo(x-r*.1,y-r*.5);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+r*.7,y-r*.5);ctx.lineTo(x+r*.3,y-r*1.1);ctx.lineTo(x+r*.1,y-r*.5);ctx.fill();
      const ew=isAtk?1:1.8;
      ctx.fillStyle="#FFF";
      ctx.beginPath();ctx.ellipse(x-r*.28,y-r*.1,ew+.8,2.5,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(x+r*.28,y-r*.1,ew+.8,2.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#3E2723";
      ctx.beginPath();ctx.ellipse(x-r*.28,y-r*.08,ew*.5,ew*.8,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(x+r*.28,y-r*.08,ew*.5,ew*.8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#F48FB1";ctx.beginPath();ctx.ellipse(x,y+r*.15,1.2,.8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(244,143,177,.2)";
      ctx.beginPath();ctx.ellipse(x-r*.55,y+r*.12,2.5,1.5,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(x+r*.55,y+r*.12,2.5,1.5,0,0,Math.PI*2);ctx.fill();
    };

    const drawEnemy=(x,y,r,clr,clr2,shape)=>{
      if(shape==="boss"||shape==="dragon"){
        const s=shape==="dragon"?1.3:1.2;
        ctx.fillStyle=clr;ctx.beginPath();ctx.arc(x,y,r*s,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(0,0,0,.1)";ctx.beginPath();ctx.arc(x+r*.1,y+r*.2,r*.9,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#FFF59D";
        ctx.beginPath();ctx.moveTo(x-r*.5,y-r*.8);ctx.lineTo(x-r*.2,y-r*1.6);ctx.lineTo(x,y-r*.7);ctx.fill();
        ctx.beginPath();ctx.moveTo(x+r*.5,y-r*.8);ctx.lineTo(x+r*.2,y-r*1.6);ctx.lineTo(x,y-r*.7);ctx.fill();
        ctx.fillStyle="#FF1744";
        ctx.beginPath();ctx.ellipse(x-r*.3,y-r*.15,2.5,2,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(x+r*.3,y-r*.15,2.5,2,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=clr2;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(x,y+r*.15,r*.35,.15,Math.PI-.15);ctx.stroke();
      }else{
        ctx.fillStyle=clr;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(0,0,0,.08)";ctx.beginPath();ctx.arc(x+r*.15,y+r*.15,r*.7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#FFF";
        ctx.beginPath();ctx.ellipse(x-r*.25,y-r*.1,2,2.2,-.15,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(x+r*.25,y-r*.1,2,2.2,.15,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#212121";
        ctx.beginPath();ctx.arc(x-r*.25,y-r*.05,1.2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+r*.25,y-r*.05,1.2,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=clr2;ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(x-r*.45,y-r*.35);ctx.lineTo(x-r*.1,y-r*.25);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+r*.45,y-r*.35);ctx.lineTo(x+r*.1,y-r*.25);ctx.stroke();
      }
    };

    const rRect=(x,y,w,h,r)=>{
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
      ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
    };

    const loop=()=>{
      const g=G.current;if(!g){raf.current=requestAnimationFrame(loop);return;}
      const W=sz.current.w,H=sz.current.h,dpr=window.devicePixelRatio||1;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const groundY=H*.65;
      const spd=g.speed;

      if(!g.over&&!paused){
        for(let tick=0;tick<spd;tick++){
          g.t++;
          if(g.t%11===0){g.money+=moneyRate;setMoney(g.money);}
          g.cd=g.cd.map(c=>Math.max(0,c-1));
          if(g.t%4===0)setCds([...g.cd]);
          // Cannon charge
          if(g.cannon<100){g.cannon+=0.15;setCannonReady(Math.floor(g.cannon));}
          // Combo decay
          if(g.comboTimer>0){g.comboTimer--;if(g.comboTimer<=0){g.combo=0;setCombo(0);}}

          g.st--;
          if(g.st<=0&&g.q.length>0){
            const ei=g.q.shift(),et=BASE_ENEMIES[ei];
            const d=stage.diff;
            g.eu.push({...et,hp:Math.floor(et.hp*d),mhp:Math.floor(et.hp*d),
              atk:Math.floor(et.atk*d),x:EBX-55,at:0,alive:true,s:"e",ph:Math.random()*6.28});
            g.st=g.si+Math.random()*40;
            setWave(`${stage.enemies.length-g.q.length}/${stage.enemies.length}`);
          }

          for(const u of[...g.pu,...g.eu]){
            if(!u.alive)continue;
            const isP=u.s==="p",foes=isP?g.eu:g.pu,dir=isP?1:-1;
            let nr=null,nd=1e9;
            for(const e of foes){if(!e.alive)continue;const d=Math.abs(u.x-e.x);if(d<nd){nd=d;nr=e;}}
            const bx=isP?EBX:PBX,bd=Math.abs(u.x-bx);
            if(nr&&nd<=u.rng+24){
              u.at++;if(u.at>=u.as){u.at=0;
                let dmg=u.atk;
                // Combo bonus for player
                if(isP&&g.combo>0)dmg=Math.floor(dmg*(1+g.combo*.05));
                nr.hp-=dmg;
                g.fx.push({x:nr.x,y:groundY-28,t:`${dmg}`,l:24,c:isP?"#E65100":"#C62828"});
                for(let p=0;p<3;p++)g.pt.push({x:nr.x+(Math.random()-.5)*18,y:groundY-12+(Math.random()-.5)*10,
                  vx:(Math.random()-.5)*3,vy:-Math.random()*2.5-.5,l:13,c:isP?"#FFCC80":"#EF9A9A",r:1.5+Math.random()});
                if(nr.hp<=0){nr.alive=false;
                  for(let p=0;p<6;p++)g.pt.push({x:nr.x+(Math.random()-.5)*28,y:groundY-12+(Math.random()-.5)*14,
                    vx:(Math.random()-.5)*5,vy:-Math.random()*3.5-1,l:20,c:nr.clr||"#CCC",r:2+Math.random()*2});
                  if(isP){
                    g.money+=Math.floor(20*(1+g.combo*.1));g.kills++;
                    g.combo++;g.comboTimer=180;
                    setCombo(g.combo);setMoney(g.money);
                    // Cannon charge on kill
                    g.cannon=Math.min(100,g.cannon+8);setCannonReady(Math.floor(g.cannon));
                  }
                }
              }
            }else if(bd<=u.rng+24){
              u.at++;if(u.at>=u.as){u.at=0;
                if(isP){g.eh-=u.atk;g.fx.push({x:EBX,y:groundY-48,t:`${u.atk}`,l:24,c:"#E65100"});}
                else{g.ph-=u.atk;g.fx.push({x:PBX,y:groundY-48,t:`${u.atk}`,l:24,c:"#C62828"});}
              }
            }else{u.x+=u.spd*dir;u.at=Math.max(0,u.at-1);}
          }
          g.pu=g.pu.filter(u=>u.alive);g.eu=g.eu.filter(u=>u.alive);
        }
        g.fx=g.fx.map(e=>({...e,l:e.l-1})).filter(e=>e.l>0);
        g.pt=g.pt.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+.13,l:p.l-1})).filter(p=>p.l>0);
        setPhp(g.ph);setEhp(g.eh);
        if(g.eh<=0){g.over=true;setOver(true);setTimeout(()=>onEnd(true),700);}
        else if(g.ph<=0){g.over=true;setOver(true);setTimeout(()=>onEnd(false),700);}
      }

      // ──── RENDER ────
      const sx=g.sx;

      // Sky
      const sg=ctx.createLinearGradient(0,0,0,groundY);
      sg.addColorStop(0,stage.sky1);sg.addColorStop(.6,stage.sky2);sg.addColorStop(1,stage.sky3);
      ctx.fillStyle=sg;ctx.fillRect(0,0,W,groundY);

      // Sun
      ctx.fillStyle="rgba(255,255,255,.3)";ctx.beginPath();ctx.arc(W*.78-sx*.02,H*.14,20,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.arc(W*.78-sx*.02,H*.14,32,0,Math.PI*2);ctx.fill();

      // Clouds
      ctx.globalAlpha=.28;
      for(let i=0;i<5;i++){
        const cx=((i*300+50)-sx*.1+3000)%(W+300)-150,cy=H*.06+i*13+(i%2)*10;
        ctx.fillStyle="#FFF";
        [[0,0,42+i*4,11],[20,-3,28,8],[-16,-1,22,7]].forEach(([ox,oy,rx,ry])=>{
          ctx.beginPath();ctx.ellipse(cx+ox,cy+oy,rx,ry,0,0,Math.PI*2);ctx.fill();});
      }ctx.globalAlpha=1;

      // Far mountains
      ctx.fillStyle=stage.sky2+"77";ctx.beginPath();ctx.moveTo(0,groundY);
      for(let x=0;x<=W;x+=18){const m=(x+sx*.06)*.007;
        ctx.lineTo(x,groundY-H*.11+Math.sin(m*2.8)*H*.05+Math.sin(m*1.3)*H*.03);}
      ctx.lineTo(W,groundY);ctx.fill();

      // Near hills
      ctx.fillStyle=stage.grd3+"80";ctx.beginPath();ctx.moveTo(0,groundY);
      for(let x=0;x<=W;x+=12){const m=(x+sx*.15)*.009;
        ctx.lineTo(x,groundY-H*.035+Math.sin(m*3.5)*H*.02);}
      ctx.lineTo(W,groundY);ctx.fill();

      // Ground
      const gg=ctx.createLinearGradient(0,groundY,0,H);
      gg.addColorStop(0,stage.grd3);gg.addColorStop(.15,stage.grd);gg.addColorStop(1,stage.grd2);
      ctx.fillStyle=gg;ctx.fillRect(0,groundY,W,H-groundY);
      ctx.fillStyle=stage.grd3;ctx.fillRect(0,groundY,W,2);

      // Grass tufts
      ctx.fillStyle=stage.grd3;
      for(let i=0;i<25;i++){
        const gx=((i*72+15)-sx*.3+3000)%(W+80)-40;
        ctx.beginPath();ctx.moveTo(gx-3,groundY);ctx.quadraticCurveTo(gx-1,groundY-5-i%3*2,gx,groundY);
        ctx.quadraticCurveTo(gx+2,groundY-4-i%2*3,gx+3,groundY);ctx.fill();
      }

      // ── Bases ──
      const drawBase=(bx,isP)=>{
        const x=bx-sx;if(x<-70||x>W+70)return;
        if(isP){
          ctx.fillStyle="#FAF3E0";ctx.fillRect(x-18,groundY-40,36,40);
          ctx.fillStyle="#EFEBE9";ctx.fillRect(x-12,groundY-55,24,18);
          ctx.fillStyle="#C62828";
          [[x,groundY-38,30,groundY-52],[x,groundY-53,22,groundY-65]].forEach(([cx,y1,hw,y2])=>{
            ctx.beginPath();ctx.moveTo(cx-hw,y1);ctx.quadraticCurveTo(cx,y2-4,cx+hw,y1);ctx.fill();});
          ctx.fillStyle="#5D4037";ctx.beginPath();ctx.arc(x,groundY-10,6,Math.PI,0);ctx.fill();
          ctx.fillRect(x-6,groundY-10,12,10);
          ctx.fillStyle="#FFE082";ctx.fillRect(x-3,groundY-48,6,5);
        }else{
          ctx.fillStyle="#4527A0";ctx.fillRect(x-20,groundY-45,40,45);
          ctx.fillStyle="#5E35B1";ctx.fillRect(x-26,groundY-50,52,7);
          ctx.fillStyle="#7E57C2";
          for(let s=-2;s<=2;s++){ctx.beginPath();ctx.moveTo(x+s*10-4,groundY-48);ctx.lineTo(x+s*10,groundY-60);ctx.lineTo(x+s*10+4,groundY-48);ctx.fill();}
          ctx.fillStyle="#FF1744";
          ctx.beginPath();ctx.arc(x-6,groundY-30,2.5,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(x+6,groundY-30,2.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#311B92";ctx.fillRect(x-7,groundY-18,14,18);
        }
        const hp=isP?g.ph:g.eh,mx=isP?baseMaxHp:eMaxHp,pct=clamp(hp/mx,0,1);
        const by=groundY-(isP?72:68),bw=40;
        ctx.fillStyle="rgba(0,0,0,.1)";rRect(x-bw/2,by,bw,5,2.5);ctx.fill();
        ctx.fillStyle=isP?(pct>.5?"#66BB6A":pct>.2?"#FFA726":"#EF5350"):"#EF5350";
        if(pct>0){rRect(x-bw/2,by,bw*pct,5,2.5);ctx.fill();}
      };
      drawBase(PBX,true);drawBase(EBX,false);

      // ── Units ──
      g.pu.forEach(u=>{
        const ux=u.x-sx;if(ux<-25||ux>W+25)return;
        const bob=Math.sin(g.t*.06+u.ph)*2.5,ab=u.at>u.as-4?-4:0;
        ctx.fillStyle="rgba(0,0,0,.08)";ctx.beginPath();ctx.ellipse(ux,groundY+2,10,3,0,0,Math.PI*2);ctx.fill();
        drawCat(ux,groundY-14+bob+ab,11,u.clr,u.clr2,u.at>u.as-4);
        const hp=clamp(u.hp/u.mhp,0,1);
        ctx.fillStyle="#E0E0E0";rRect(ux-9,groundY-30+bob,18,2.5,1.25);ctx.fill();
        ctx.fillStyle=hp>.5?"#66BB6A":"#FFA726";
        if(hp>0){rRect(ux-9,groundY-30+bob,18*hp,2.5,1.25);ctx.fill();}
      });
      g.eu.forEach(u=>{
        const ux=u.x-sx;if(ux<-25||ux>W+25)return;
        const bob=Math.sin(g.t*.05+u.ph)*2,ab=u.at>u.as-4?4:0;
        const isBig=u.shape==="boss"||u.shape==="dragon";
        ctx.fillStyle="rgba(0,0,0,.08)";ctx.beginPath();ctx.ellipse(ux,groundY+2,isBig?14:10,isBig?4:3,0,0,Math.PI*2);ctx.fill();
        drawEnemy(ux,groundY-14+bob+ab,isBig?14:11,u.clr,u.clr2,u.shape);
        const hp=clamp(u.hp/u.mhp,0,1);
        ctx.fillStyle="#E0E0E0";rRect(ux-9,groundY-30+bob,18,2.5,1.25);ctx.fill();
        ctx.fillStyle=hp>.5?"#EF5350":"#D32F2F";
        if(hp>0){rRect(ux-9,groundY-30+bob,18*hp,2.5,1.25);ctx.fill();}
      });

      // Particles
      for(const p of g.pt){const px=p.x-sx;ctx.globalAlpha=clamp(p.l/10,0,.7);
        ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(px,p.y,p.r||2,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;

      // Damage text
      for(const e of g.fx){
        if(e.big)continue;
        const ex=e.x-sx,ey=e.y-(24-e.l)*1.4;
        ctx.globalAlpha=clamp(e.l/12,0,1);
        ctx.font=`bold ${e.l>20?13:11}px 'Zen Maru Gothic',sans-serif`;ctx.textAlign="center";
        ctx.fillStyle="#FFF";ctx.fillText(`-${e.t}`,ex+.7,ey+.7);
        ctx.fillStyle=e.c;ctx.fillText(`-${e.t}`,ex,ey);
      }ctx.globalAlpha=1;

      // Cannon flash
      for(const e of g.fx){
        if(!e.big)continue;
        ctx.globalAlpha=clamp(e.l/10,0,.15);
        ctx.fillStyle="#FF6D00";ctx.fillRect(0,0,W,H);
      }ctx.globalAlpha=1;

      raf.current=requestAnimationFrame(loop);
    };
    raf.current=requestAnimationFrame(loop);
    return()=>{if(raf.current)cancelAnimationFrame(raf.current);};
  },[paused,stage,onEnd,save,baseMaxHp,eMaxHp]);

  const ppct=clamp(php/baseMaxHp*100,0,100);
  const epct=clamp(ehp/eMaxHp*100,0,100);

  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",userSelect:"none",background:"#F5F0E8"}}>
      {/* HUD */}
      <div style={{padding:"3px 8px",display:"flex",alignItems:"center",gap:4,
        background:"rgba(255,253,245,.95)",backdropFilter:"blur(6px)",
        borderBottom:"1px solid #EDE7DD",flexShrink:0,minHeight:32}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#BCAAA4",fontSize:13,padding:"0 3px",fontWeight:700}}>✕</button>

        <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:7,fontWeight:900,color:"#43A047",whiteSpace:"nowrap"}}>🏯我方</span>
          <div style={{flex:1,height:5,background:"#EFEBE9",borderRadius:3,overflow:"hidden",maxWidth:100}}>
            <div style={{height:"100%",borderRadius:3,transition:"width .3s",width:`${ppct}%`,
              background:ppct>50?"linear-gradient(90deg,#81C784,#43A047)":ppct>20?"linear-gradient(90deg,#FFB74D,#F57C00)":"linear-gradient(90deg,#EF5350,#D32F2F)"}}/>
          </div>
          <span style={{fontSize:7,color:"#BCAAA4",minWidth:24,textAlign:"right"}}>{Math.max(0,php)}</span>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:6,padding:"1px 6px",
          background:"rgba(255,248,225,.8)",borderRadius:6,border:"1px solid #FFE0B230"}}>
          <span style={{fontSize:7,color:"#BCAAA4",fontWeight:700}}>⚔{wave}</span>
          <span style={{fontSize:12,fontWeight:900,color:"#E65100",lineHeight:1}}>💰{money}</span>
          {combo>0&&<span style={{fontSize:9,fontWeight:900,color:"#FF6D00",
            animation:"popScale .3s ease"}}>×{combo}</span>}
        </div>

        <div style={{flex:1,display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:7,color:"#BCAAA4",minWidth:24}}>{Math.max(0,ehp)}</span>
          <div style={{flex:1,height:5,background:"#EFEBE9",borderRadius:3,overflow:"hidden",maxWidth:100}}>
            <div style={{height:"100%",borderRadius:3,transition:"width .3s",width:`${epct}%`,
              background:"linear-gradient(90deg,#EF5350,#B71C1C)",float:"right"}}/>
          </div>
          <span style={{fontSize:7,fontWeight:900,color:"#D32F2F",whiteSpace:"nowrap"}}>敵方👹</span>
        </div>

        {/* Speed button */}
        <button onClick={toggleSpeed} style={{
          background:speed===2?"#FF7043":"rgba(255,255,255,.8)",border:speed===2?"none":"1.5px solid #E0D5C5",
          borderRadius:6,color:speed===2?"#FFF":"#8D6E63",padding:"1px 6px",fontSize:9,fontWeight:900,
          minWidth:28}}>
          {speed}×
        </button>

        <button onClick={()=>setPaused(p=>!p)} style={{
          background:paused?"#FF7043":"rgba(255,255,255,.8)",border:paused?"none":"1.5px solid #E0D5C5",
          borderRadius:6,color:paused?"#FFF":"#8D6E63",padding:"1px 6px",fontSize:9,fontWeight:900}}>
          {paused?"▶":"⏸"}
        </button>
      </div>

      {/* Canvas */}
      <div ref={box} style={{flex:1,position:"relative",overflow:"hidden",minHeight:0,cursor:"grab"}}
        onTouchStart={pd} onTouchMove={pm} onTouchEnd={pup}
        onMouseDown={pd} onMouseMove={pm} onMouseUp={pup} onMouseLeave={pup}>
        <canvas ref={cvs} style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}/>
        {paused&&<div style={{position:"absolute",inset:0,background:"rgba(255,253,245,.8)",backdropFilter:"blur(3px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:16,color:"#5D4037",fontWeight:900,letterSpacing:6}}>⏸ 一時停止</div>}
        {over&&<div style={{position:"absolute",inset:0,background:"rgba(255,253,245,.6)",backdropFilter:"blur(2px)",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:30,animation:"floatBob .5s ease-in-out infinite"}}>{ehp<=0?"🎉":"😿"}</div>
        </div>}
      </div>

      {/* Bottom bar */}
      <div style={{flexShrink:0,background:"rgba(255,253,245,.95)",backdropFilter:"blur(6px)",
        borderTop:"1px solid #EDE7DD",
        padding:"4px 6px calc(env(safe-area-inset-bottom,3px)+3px) 6px",
        display:"flex",alignItems:"center",gap:5}}>

        {/* Cannon button */}
        <button onClick={fireCannon} disabled={cannonReady<100||paused||over}
          style={{width:52,height:52,borderRadius:14,border:"none",flexShrink:0,
            background:cannonReady>=100?"linear-gradient(135deg,#FF6D00,#F4511E)":"#EFEBE9",
            color:cannonReady>=100?"#FFF":"#BCAAA4",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
            boxShadow:cannonReady>=100?"0 2px 12px rgba(255,109,0,.35)":"none",
            animation:cannonReady>=100?"glow 1.5s ease-in-out infinite":"none",
            position:"relative",overflow:"hidden"}}>
          {cannonReady<100&&<div style={{position:"absolute",bottom:0,left:0,right:0,
            height:`${cannonReady}%`,background:"linear-gradient(0deg,#FFE0B2,#FFCC80)",
            transition:"height .3s",borderRadius:"0 0 12px 12px"}}/>}
          <span style={{fontSize:18,position:"relative",zIndex:1}}>💥</span>
          <span style={{fontSize:7,fontWeight:900,position:"relative",zIndex:1}}>
            {cannonReady>=100?"発射!":` ${cannonReady}%`}
          </span>
        </button>

        {/* Cat buttons */}
        <div style={{flex:1,display:"flex",gap:4,overflowX:"auto",paddingBottom:1}}>
          {CATS.map((c,i)=>{
            const ok=money>=c.cost,cd=cds[i]>0,dis=!ok||cd||paused||over;
            const cdP=cd?(cds[i]/c.cd)*100:0;
            const lv=save.catLvl[i];
            return(
              <button key={c.id} onClick={()=>!dis&&spawn(i)} style={{
                position:"relative",overflow:"hidden",flexShrink:0,
                width:62,padding:"4px 3px 3px",borderRadius:10,
                background:dis?"#F5F0E8":"#FFF",
                border:`2px solid ${dis?"#E8E3DB":c.clr+"50"}`,
                opacity:dis&&!cd?.3:1,
                display:"flex",flexDirection:"column",alignItems:"center",gap:0,
                boxShadow:!dis?`0 2px 6px ${c.clr}15`:"none",
                transition:"all .08s"}}
                onPointerDown={e=>{if(!dis)e.currentTarget.style.transform="scale(0.9)"}}
                onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
                onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                {cd&&<div style={{position:"absolute",top:0,left:0,right:0,height:`${cdP}%`,
                  background:"rgba(0,0,0,.05)",transition:"height .1s",borderRadius:"8px 8px 0 0"}}/>}
                <div style={{width:24,height:24,borderRadius:6,
                  background:`linear-gradient(135deg,${c.clr},${c.clr2})`,
                  display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1,
                  border:"1.5px solid rgba(255,255,255,.5)",boxShadow:`0 1px 4px ${c.clr}25`}}>
                  <CatSVG sz={14} c="#fff"/>
                </div>
                <span style={{fontSize:8,color:"#5D4037",fontWeight:700,position:"relative",zIndex:1,lineHeight:1.1}}>
                  {c.name}
                </span>
                <div style={{display:"flex",alignItems:"center",gap:2,position:"relative",zIndex:1}}>
                  <span style={{fontSize:8,fontWeight:900,color:ok?"#E65100":"#CCC"}}>¥{c.cost}</span>
                  {lv>1&&<span style={{fontSize:6,color:c.clr2,fontWeight:900,
                    background:`${c.clr}18`,padding:"0 2px",borderRadius:2}}>Lv{lv}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
