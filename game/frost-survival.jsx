import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════ GAME CONSTANTS ═══════════════════════ */
const WW=3200,WH=3200,FX=WW/2,FY=WH/2,AR=46,ACD=20,DLEN=3600,SAFE_DAYS=3;
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),cl=(v,a,b)=>Math.max(a,Math.min(b,v)),rn=(a,b)=>Math.random()*(b-a)+a,ri=(a,b)=>Math.floor(rn(a,b)),ag=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);

const FORTS=[
  {n:"營火",hp:80,r:30,wHp:0,wSeg:0,wk:0,tu:0,cost:{},desc:"基礎營地"},
  {n:"木柵欄",hp:150,r:50,wHp:40,wSeg:8,wk:1,tu:0,cost:{w:25},desc:"🔓 城牆防禦 · 1位工人"},
  {n:"木屋堡壘",hp:300,r:68,wHp:70,wSeg:10,wk:2,tu:0,cost:{w:50,s:20},desc:"🔓 強化城牆 · 2位工人"},
  {n:"石牆要塞",hp:500,r:88,wHp:120,wSeg:12,wk:3,tu:1,cost:{w:80,s:60},desc:"🔓 防禦砲塔 · 3位工人"},
  {n:"哨塔城堡",hp:800,r:108,wHp:180,wSeg:14,wk:4,tu:2,cost:{w:120,s:100,f:40},desc:"🔓 征服能力 · 雙砲塔"},
  {n:"烈焰王城",hp:1200,r:130,wHp:250,wSeg:16,wk:5,tu:3,cost:{w:180,s:150,f:80},desc:"👑 最終形態"},
];

function mkWorld(){const t=[],r=[],a=[];for(let i=0;i<180;i++){let x,y;do{x=rn(60,WW-60);y=rn(60,WH-60)}while(d({x,y},{x:FX,y:FY})<200);t.push({id:i,x,y,hp:4+ri(0,2),mhp:5,t:ri(0,4),sz:rn(.85,1.15),sh:0})}for(let i=0;i<70;i++){let x,y;do{x=rn(60,WW-60);y=rn(60,WH-60)}while(d({x,y},{x:FX,y:FY})<200);r.push({id:i+400,x,y,hp:5+ri(0,2),mhp:6,sz:rn(.75,1.1),sh:0})}for(let i=0;i<24;i++){let x,y;do{x=rn(120,WW-120);y=rn(120,WH-120)}while(d({x,y},{x:FX,y:FY})<300);a.push({id:i+700,x,y,hp:3,mhp:3,t:Math.random()>.4?"deer":"rabbit",vx:0,vy:0,wt:ri(40,150),fl:false,dir:1,an:0})}const v=[];for(let i=0;i<3;i++){const aa=((i/3)*Math.PI*2)+rn(-.3,.3),dd=800+rn(0,400);v.push({id:i,x:cl(FX+Math.cos(aa)*dd,200,WW-200),y:cl(FY+Math.sin(aa)*dd,200,WH-200),hp:60+i*30,mhp:60+i*30,lv:i,nm:["狼巢","冰窟","暗堡"][i],con:false,rt:ri(300,600),sol:3+i*2})}return{trees:t,rocks:r,animals:a,villages:v}}

function mkWalls(lv){if(lv<1)return[];const f=FORTS[lv],w=[];for(let i=0;i<f.wSeg;i++){const a=(i/f.wSeg)*Math.PI*2,na=((i+1)/f.wSeg)*Math.PI*2;w.push({id:i,x1:FX+Math.cos(a)*f.r,y1:FY+Math.sin(a)*f.r,x2:FX+Math.cos(na)*f.r,y2:FY+Math.sin(na)*f.r,hp:f.wHp,mhp:f.wHp,mx:FX+Math.cos((a+na)/2)*f.r,my:FY+Math.sin((a+na)/2)*f.r})}return w}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function EmberGame(){
  const cvs=useRef(null),G=useRef(null),joy=useRef({on:false,sx:0,sy:0,cx:0,cy:0,id:null}),ks=useRef({}),fr=useRef(0);
  const [ui,setUi]=useState({screen:"title"});
  const mQ=useRef([]);
  const addM=(t,c="#ffe0b0")=>{mQ.current.push({text:t,life:110,color:c});if(mQ.current.length>3)mQ.current.shift()};

  const init=useCallback(()=>{const w=mkWorld();G.current={p:{x:FX,y:FY-50,hp:15,mhp:15,dir:1,acd:0,inv:0,fr:0,sw:false},res:{w:10,s:5,f:8},fort:{lv:0,hp:80,mhp:80},walls:[],workers:[],turrets:[],trees:w.trees,rocks:w.rocks,animals:w.animals,villages:w.villages,enemies:[],pt:[],dr:[],bul:[],time:0,day:1,kills:0,esp:0,cam:{x:0,y:0},over:false,con:0};fr.current=0;setUi({screen:"game",w:10,s:5,f:8,hp:15,mhp:15,flv:0,fhp:80,fmhp:80,day:1,night:false,en:0,kills:0,wk:0,con:0,showU:false,vil:w.villages})},[]);

  useEffect(()=>{const kd=e=>{ks.current[e.key.toLowerCase()]=true};const ku=e=>{ks.current[e.key.toLowerCase()]=false};window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku)}},[]);
  const onTS=useCallback(e=>{e.preventDefault();for(let t of e.changedTouches)if(!joy.current.on)joy.current={on:true,sx:t.clientX,sy:t.clientY,cx:t.clientX,cy:t.clientY,id:t.identifier}},[]);
  const onTM=useCallback(e=>{e.preventDefault();for(let t of e.changedTouches)if(t.identifier===joy.current.id){joy.current.cx=t.clientX;joy.current.cy=t.clientY}},[]);
  const onTE=useCallback(e=>{e.preventDefault();for(let t of e.changedTouches)if(t.identifier===joy.current.id)joy.current={on:false,sx:0,sy:0,cx:0,cy:0,id:null}},[]);

  /* ═══════════════════════ GAME LOOP ═══════════════════════ */
  useEffect(()=>{
    if(ui.screen!=="game")return;const c=cvs.current;if(!c)return;const ctx=c.getContext("2d");let anim;
    const resize=()=>{c.width=window.innerWidth;c.height=window.innerHeight};resize();window.addEventListener("resize",resize);

    const tick=()=>{
      const g=G.current;if(!g||g.over){anim=requestAnimationFrame(tick);return}
      const CW=c.width,CH=c.height;fr.current++;const f=fr.current;
      let dx=0,dy=0;const k=ks.current;
      if(k.w||k.arrowup)dy-=1;if(k.s||k.arrowdown)dy+=1;if(k.a||k.arrowleft)dx-=1;if(k.d||k.arrowright)dx+=1;
      if(joy.current.on){const jx=joy.current.cx-joy.current.sx,jy=joy.current.cy-joy.current.sy,jd=Math.hypot(jx,jy);if(jd>10){dx=jx/jd;dy=jy/jd}}
      const len=Math.hypot(dx,dy);if(len>0){dx/=len;dy/=len}
      const p=g.p;p.x=cl(p.x+dx*2.8,20,WW-20);p.y=cl(p.y+dy*2.8,20,WH-20);if(len>.1){p.dir=dx>=0?1:-1;p.fr++}if(p.acd>0)p.acd--;if(p.inv>0)p.inv--;p.sw=p.acd>ACD-10;

      // AUTO INTERACT
      if(p.acd<=0){let acted=false;
        let nt=null,nd=AR;for(let t of g.trees){const dd=d(p,t);if(dd<nd){nd=dd;nt=t}}
        if(nt){nt.hp--;nt.sh=6;p.acd=ACD;acted=true;p.sw=true;g.pt.push({x:nt.x+rn(-5,5),y:nt.y-8,vx:rn(-1.5,1.5),vy:rn(-2.5,-.5),life:22,c:"#6a4"});if(nt.hp<=0){const a=3+ri(0,4);g.res.w+=a;g.dr.push({x:nt.x,y:nt.y-12,text:`+${a}`,icon:"🪵",life:50,c:"#d4a46a"});for(let i=0;i<5;i++)g.pt.push({x:nt.x+rn(-8,8),y:nt.y-rn(0,12),vx:rn(-2,2),vy:rn(-3,-1),life:ri(12,25),c:"#a86"})}}g.trees=g.trees.filter(t=>t.hp>0);
        if(!acted){let nr=null,nrd=AR;for(let r of g.rocks){const dd=d(p,r);if(dd<nrd){nrd=dd;nr=r}}if(nr){nr.hp--;nr.sh=5;p.acd=ACD;acted=true;p.sw=true;g.pt.push({x:nr.x,y:nr.y-3,vx:rn(-1,1),vy:rn(-2,-.5),life:15,c:"#999"});if(nr.hp<=0){const a=2+ri(0,4);g.res.s+=a;g.dr.push({x:nr.x,y:nr.y-12,text:`+${a}`,icon:"🪨",life:50,c:"#a0aab8"})}}g.rocks=g.rocks.filter(r=>r.hp>0)}
        if(!acted){let na=null,nad=AR;for(let a of g.animals){const dd=d(p,a);if(dd<nad){nad=dd;na=a}}if(na){na.hp--;p.acd=ACD;acted=true;p.sw=true;na.fl=true;const fx=na.x-p.x,fy=na.y-p.y,fl2=Math.hypot(fx,fy)||1;na.vx=fx/fl2*3.5;na.vy=fy/fl2*3.5;g.pt.push({x:na.x,y:na.y,vx:rn(-1,1),vy:rn(-1.5,-.3),life:14,c:"#c44"});if(na.hp<=0){const a=na.t==="deer"?5+ri(0,3):2+ri(0,3);g.res.f+=a;g.dr.push({x:na.x,y:na.y-12,text:`+${a}`,icon:"🍖",life:50,c:"#e8a050"})}}g.animals=g.animals.filter(a=>a.hp>0)}
        if(!acted){let ne=null,ned=AR+8;for(let e of g.enemies){const dd=d(p,e);if(dd<ned){ned=dd;ne=e}}if(ne){ne.hp-=2+Math.floor(g.fort.lv*.5);p.acd=ACD;p.sw=true;const fx=ne.x-p.x,fy=ne.y-p.y,fl2=Math.hypot(fx,fy)||1;ne.kb=8;ne.kbx=fx/fl2*5;ne.kby=fy/fl2*5;g.pt.push({x:ne.x,y:ne.y,vx:rn(-2,2),vy:rn(-2,0),life:16,c:"#f55"});if(ne.hp<=0){g.kills++;g.dr.push({x:ne.x,y:ne.y-8,text:"擊殺",icon:"💀",life:40,c:"#f66"});if(Math.random()<.45){const a=ri(1,5);g.res.f+=a}}}g.enemies=g.enemies.filter(e=>e.hp>0)}
        if(!acted){for(let v of g.villages){if(!v.con&&d(p,v)<60){v.hp-=3;p.acd=ACD;p.sw=true;g.pt.push({x:v.x+rn(-10,10),y:v.y+rn(-10,5),vx:rn(-1,1),vy:rn(-2,-.5),life:18,c:"#fa0"});if(v.hp<=0){v.con=true;g.con++;g.res.w+=30+v.lv*20;g.res.s+=20+v.lv*15;g.res.f+=15+v.lv*10;addM(`🏴 征服 ${v.nm}！大量資源入手`,"#ffcc44");p.mhp+=3;p.hp=p.mhp}break}}}}

      // TIME
      g.time++;const dp=(g.time%DLEN)/DLEN,isN=dp>.65;if(g.time>0&&g.time%DLEN===0){g.day++;addM(g.day<=SAFE_DAYS?`☀️ 第 ${g.day} 天 — 安全期（第${SAFE_DAYS}天後入夜有敵人）`:`☀️ 第 ${g.day} 天破曉`,g.day<=SAFE_DAYS?"#88ddaa":"#88ccff")}

      // WORKERS
      const mxW=FORTS[g.fort.lv].wk;while(g.workers.length<mxW)g.workers.push({id:Date.now()+g.workers.length,x:FX+rn(-30,30),y:FY+rn(-30,30),tgt:null,carry:null,amt:0,st:"idle"});while(g.workers.length>mxW)g.workers.pop();
      for(let wk of g.workers){if(wk.st==="idle"){const all=[...g.trees.map(t=>({...t,rt:"w"})),...g.rocks.map(r=>({...r,rt:"s"})),...g.animals.filter(a=>!a.fl).map(a=>({...a,rt:"f"}))].sort((a,b)=>d(a,{x:FX,y:FY})-d(b,{x:FX,y:FY}));const tg=all.find(r=>d(r,{x:FX,y:FY})<500);if(tg){wk.tgt=tg;wk.st="go"}}else if(wk.st==="go"&&wk.tgt){const dd2=d(wk,wk.tgt);if(dd2<20){const rt=wk.tgt.rt;if(rt==="w"){const t=g.trees.find(t=>t.id===wk.tgt.id);if(t){t.hp-=.05;t.sh=2;if(t.hp<=0){wk.carry=rt;wk.amt=3+ri(0,3);wk.st="ret"}}}else if(rt==="s"){const r=g.rocks.find(r=>r.id===wk.tgt.id);if(r){r.hp-=.04;r.sh=1.5;if(r.hp<=0){wk.carry=rt;wk.amt=2+ri(0,3);wk.st="ret"}}}else{const a=g.animals.find(a=>a.id===wk.tgt.id);if(a){a.hp-=.06;if(a.hp<=0){wk.carry=rt;wk.amt=3+ri(0,2);wk.st="ret"}}}g.trees=g.trees.filter(t=>t.hp>0);g.rocks=g.rocks.filter(r=>r.hp>0);g.animals=g.animals.filter(a=>a.hp>0);if(!wk.carry){const rt=wk.tgt.rt;const st=rt==="w"?g.trees.find(t=>t.id===wk.tgt.id):rt==="s"?g.rocks.find(r=>r.id===wk.tgt.id):g.animals.find(a=>a.id===wk.tgt.id);if(!st){wk.st="idle";wk.tgt=null}}}else{const a2=ag(wk,wk.tgt);wk.x+=Math.cos(a2)*1.4;wk.y+=Math.sin(a2)*1.4}}else if(wk.st==="ret"){const dd2=d(wk,{x:FX,y:FY});if(dd2<40){g.res[wk.carry]+=wk.amt;g.dr.push({x:FX+rn(-15,15),y:FY-20,text:`+${wk.amt}`,icon:wk.carry==="w"?"🪵":wk.carry==="s"?"🪨":"🍖",life:40,c:wk.carry==="w"?"#c96":wk.carry==="s"?"#bbc":"#ea8"});wk.carry=null;wk.amt=0;wk.st="idle";wk.tgt=null}else{const a2=ag(wk,{x:FX,y:FY});wk.x+=Math.cos(a2)*1.6;wk.y+=Math.sin(a2)*1.6}}}

      // TURRETS
      const mxT=FORTS[g.fort.lv].tu;while(g.turrets.length<mxT){const ta=(g.turrets.length/(mxT||1))*Math.PI*2;g.turrets.push({id:g.turrets.length,a:ta,cd:0})}
      for(let tr of g.turrets){tr.cd=Math.max(0,tr.cd-1);if(tr.cd<=0&&g.enemies.length>0){const r2=FORTS[g.fort.lv].r,tx=FX+Math.cos(tr.a)*r2,ty=FY+Math.sin(tr.a)*r2;let ne=null,ned=250;for(let e of g.enemies){const dd2=d(e,{x:tx,y:ty});if(dd2<ned){ned=dd2;ne=e}}if(ne){tr.cd=40;g.bul.push({x:tx,y:ty,tx:ne.x,ty:ne.y,life:30,spd:5})}}}
      for(let b of g.bul){const ba=Math.atan2(b.ty-b.y,b.tx-b.x);b.x+=Math.cos(ba)*b.spd;b.y+=Math.sin(ba)*b.spd;b.life--;for(let e of g.enemies){if(d(b,e)<14){e.hp-=2;b.life=0;g.pt.push({x:e.x,y:e.y,vx:rn(-1,1),vy:rn(-1.5,-.3),life:12,c:"#ff8"});break}}}g.bul=g.bul.filter(b=>b.life>0);g.enemies=g.enemies.filter(e=>e.hp>0);

      // RESPAWN
      if(f%450===0){if(g.trees.length<130){let x,y;do{x=rn(60,WW-60);y=rn(60,WH-60)}while(d({x,y},{x:FX,y:FY})<200);g.trees.push({id:Date.now(),x,y,hp:4,mhp:5,t:ri(0,4),sz:rn(.85,1.15),sh:0})}if(g.animals.length<18){let x,y;do{x=rn(100,WW-100);y=rn(100,WH-100)}while(d({x,y},{x:FX,y:FY})<280);g.animals.push({id:Date.now()+1,x,y,hp:3,mhp:3,t:Math.random()>.4?"deer":"rabbit",vx:0,vy:0,wt:ri(40,150),fl:false,dir:1,an:0})}if(g.rocks.length<50){let x,y;do{x=rn(60,WW-60);y=rn(60,WH-60)}while(d({x,y},{x:FX,y:FY})<200);g.rocks.push({id:Date.now()+2,x,y,hp:5,mhp:6,sz:rn(.75,1.1),sh:0})}}

      // ANIMALS
      for(let a of g.animals){a.an++;if(a.fl){a.x+=a.vx;a.y+=a.vy;a.vx*=.95;a.vy*=.95;if(Math.hypot(a.vx,a.vy)<.2)a.fl=false}else{if(d(p,a)<90){const fx=a.x-p.x,fy=a.y-p.y,fl2=Math.hypot(fx,fy)||1;a.vx=fx/fl2*2.2;a.vy=fy/fl2*2.2;a.fl=true}else{a.wt--;if(a.wt<=0){a.vx=rn(-.4,.4);a.vy=rn(-.4,.4);a.wt=ri(60,200)}a.x+=a.vx;a.y+=a.vy}}if(a.vx)a.dir=a.vx>0?1:-1;a.x=cl(a.x,30,WW-30);a.y=cl(a.y,30,WH-30)}

      // ENEMIES
      if(isN&&g.day>SAFE_DAYS){g.esp--;const rate=Math.max(50,180-(g.day-SAFE_DAYS)*10);if(g.esp<=0&&g.enemies.length<8+(g.day-SAFE_DAYS)*2){g.esp=rate;const ea=rn(0,Math.PI*2),sd=550+rn(0,300),boss=Math.random()<.03+(g.day-SAFE_DAYS)*.01;g.enemies.push({id:Date.now()+ri(0,9999),x:cl(FX+Math.cos(ea)*sd,40,WW-40),y:cl(FY+Math.sin(ea)*sd,40,WH-40),hp:boss?12+(g.day-SAFE_DAYS)*2:2+Math.floor((g.day-SAFE_DAYS)*.5),mhp:boss?12+(g.day-SAFE_DAYS)*2:2+Math.floor((g.day-SAFE_DAYS)*.5),spd:boss?.6:.7+Math.min((g.day-SAFE_DAYS)*.04,.7),dmg:boss?3:1,t:boss?"boss":(Math.random()>.5?"wolf":"frost"),kb:0,kbx:0,kby:0,acd:0})}}
      for(let v of g.villages){if(v.con||g.day<=SAFE_DAYS+1)continue;v.rt--;if(v.rt<=0){v.rt=ri(600,1000)-Math.max(0,(g.day-SAFE_DAYS))*8;for(let i=0;i<v.sol;i++)g.enemies.push({id:Date.now()+ri(0,99999),x:v.x+rn(-20,20),y:v.y+rn(-20,20),hp:3+v.lv*2,mhp:3+v.lv*2,spd:.8+v.lv*.1,dmg:1+Math.floor(v.lv*.5),t:"raid",kb:0,kbx:0,kby:0,acd:0});addM(`⚔️ ${v.nm}派出突襲隊！`,"#ff8866")}}

      const fp={x:FX,y:FY};
      for(let e of g.enemies){if(e.kb>0){e.x+=e.kbx;e.y+=e.kby;e.kbx*=.85;e.kby*=.85;e.kb--;continue}e.acd=Math.max(0,(e.acd||0)-1);if(d(e,p)<24&&e.acd<=0&&p.inv<=0){p.hp-=e.dmg;p.inv=30;e.acd=50;g.pt.push({x:p.x,y:p.y-5,vx:rn(-2,2),vy:rn(-2,0),life:15,c:"#f44"});if(p.hp<=0){g.over=true;setUi(pr=>({...pr,screen:"over",kills:g.kills,day:g.day,flv:g.fort.lv,con:g.con}))}continue}const dTF=d(e,fp),fR=FORTS[g.fort.lv].r;if(g.walls.length>0&&dTF<fR+80){let cw=null,cd2=999;for(let w of g.walls){if(w.hp<=0)continue;const wd=d(e,{x:w.mx,y:w.my});if(wd<cd2){cd2=wd;cw=w}}if(cw&&cd2<fR+30){if(cd2>18){const wa=ag(e,{x:cw.mx,y:cw.my});e.x+=Math.cos(wa)*e.spd;e.y+=Math.sin(wa)*e.spd}else if(e.acd<=0){cw.hp-=e.dmg;e.acd=50;g.pt.push({x:cw.mx+rn(-5,5),y:cw.my+rn(-5,5),vx:rn(-1,1),vy:rn(-1.5,-.3),life:15,c:g.fort.lv>=3?"#889":"#a86"});if(cw.hp<=0)addM("⚠️ 城牆被突破！","#ff4444")}continue}}const tgt=d(e,p)<200?p:fp;const ea2=ag(e,tgt);e.x+=Math.cos(ea2)*e.spd;e.y+=Math.sin(ea2)*e.spd;if(dTF<fR+10&&e.acd<=0){const wA=g.walls.filter(w=>w.hp>0).length;if(wA===0||g.walls.length===0){g.fort.hp-=e.dmg;e.acd=60;g.pt.push({x:FX+rn(-12,12),y:FY+rn(-12,12),vx:rn(-1,1),vy:rn(-2,0),life:20,c:"#fa0"});if(g.fort.hp<=0){g.over=true;setUi(pr=>({...pr,screen:"over",kills:g.kills,day:g.day,flv:g.fort.lv,con:g.con}))}}}}

      if(d(p,fp)<FORTS[g.fort.lv].r+35&&f%70===0)p.hp=Math.min(p.mhp,p.hp+1);
      for(let t of g.trees)if(t.sh>0)t.sh*=.8;for(let r of g.rocks)if(r.sh>0)r.sh*=.8;
      for(let pt of g.pt){pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=.06;pt.life--}g.pt=g.pt.filter(pt=>pt.life>0);
      for(let dr2 of g.dr){dr2.y-=.4;dr2.life--}g.dr=g.dr.filter(dr2=>dr2.life>0);
      for(let m of mQ.current)m.life--;mQ.current=mQ.current.filter(m=>m.life>0);

      g.cam.x=cl(p.x-CW/2,0,WW-CW);g.cam.y=cl(p.y-CH/2,0,WH-CH);const cx=g.cam.x,cy=g.cam.y;

      // ═══ RENDER ═══
      ctx.fillStyle="#121a26";ctx.fillRect(0,0,CW,CH);
      const ts=64,stx=Math.floor(cx/ts),sty=Math.floor(cy/ts),etx=Math.ceil((cx+CW)/ts),ety=Math.ceil((cy+CH)/ts);
      for(let tx=stx;tx<=etx;tx++)for(let ty=sty;ty<=ety;ty++){const sx=tx*ts-cx,sy=ty*ts-cy,sd=(tx*127+ty*311)&0xff;ctx.fillStyle=sd%5===0?"#172434":sd%7===0?"#141f2c":"#151e2b";ctx.fillRect(sx,sy,ts,ts);ctx.fillStyle=`rgba(195,215,240,${.03+(sd%4)*.008})`;ctx.fillRect(sx+(sd%38)+3,sy+((sd*3)%38)+3,1.5,1.5)}

      const objs=[];for(let t of g.trees)objs.push({ty:"T",y:t.y,d:t});for(let r of g.rocks)objs.push({ty:"R",y:r.y,d:r});for(let a of g.animals)objs.push({ty:"A",y:a.y,d:a});for(let e of g.enemies)objs.push({ty:"E",y:e.y,d:e});for(let w of g.workers)objs.push({ty:"W",y:w.y,d:w});for(let v of g.villages)objs.push({ty:"V",y:v.y,d:v});objs.push({ty:"F",y:FY,d:null});objs.push({ty:"P",y:p.y,d:p});objs.sort((a,b)=>a.y-b.y);

      for(let o of objs){const ox=(o.d?.x||FX)-cx,oy=(o.d?.y||FY)-cy;if(ox<-160||ox>CW+160||oy<-160||oy>CH+160)continue;
        if(o.ty==="F"){ctx.save();ctx.translate(FX-cx,FY-cy);const lv=g.fort.lv,r=FORTS[lv].r,fl=Math.sin(f*.12)*2;const gr=r+70+fl*4,gw=ctx.createRadialGradient(0,0,r*.2,0,0,gr);gw.addColorStop(0,"rgba(255,160,60,.12)");gw.addColorStop(1,"rgba(255,80,20,0)");ctx.fillStyle=gw;ctx.fillRect(-gr,-gr,gr*2,gr*2);ctx.fillStyle="rgba(90,75,55,.15)";ctx.beginPath();ctx.ellipse(0,0,r*.75,r*.45,0,0,Math.PI*2);ctx.fill();for(let w of g.walls){const wx1=w.x1-FX,wy1=w.y1-FY,wx2=w.x2-FX,wy2=w.y2-FY;if(w.hp>0){ctx.strokeStyle=lv>=3?`rgba(100,110,130,${.5+.5*(w.hp/w.mhp)})`:`rgba(140,110,70,${.5+.5*(w.hp/w.mhp)})`;ctx.lineWidth=lv>=3?5:3.5;ctx.beginPath();ctx.moveTo(wx1,wy1);ctx.lineTo(wx2,wy2);ctx.stroke();ctx.fillStyle=lv>=3?"#6a7080":"#6a4a2a";ctx.beginPath();ctx.arc(wx1,wy1,lv>=3?5:3.5,0,Math.PI*2);ctx.fill();if(w.hp<w.mhp){const mx2=w.mx-FX,my2=w.my-FY;ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(mx2-10,my2-8,20,3);ctx.fillStyle=w.hp>w.mhp*.3?"#6a6":"#e44";ctx.fillRect(mx2-10,my2-8,20*(w.hp/w.mhp),3)}}else{ctx.fillStyle="rgba(100,90,70,.3)";ctx.fillRect((wx1+wx2)/2-4,(wy1+wy2)/2-2,8,4)}}if(lv>=3)for(let i=0;i<(lv>=5?16:12);i++){const ba=(i/(lv>=5?16:12))*Math.PI*2;ctx.fillStyle="#5a6070";ctx.fillRect(Math.cos(ba)*(r+3)-3,Math.sin(ba)*(r+3)-3,6,6)}if(lv>=4){ctx.fillStyle="#5a6070";ctx.fillRect(-5,-r-28,10,22);ctx.fillStyle="#6a7888";ctx.fillRect(-8,-r-32,16,6);ctx.fillStyle="#cc3333";ctx.beginPath();ctx.moveTo(0,-r-32);ctx.lineTo(14,-r-26);ctx.lineTo(0,-r-21);ctx.fill()}for(let tr of g.turrets){const tx2=Math.cos(tr.a)*r,ty2=Math.sin(tr.a)*r;ctx.fillStyle="#556";ctx.beginPath();ctx.arc(tx2,ty2,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=tr.cd>30?"#f80":"#778";ctx.beginPath();ctx.arc(tx2,ty2,3,0,Math.PI*2);ctx.fill()}ctx.fillStyle="#ff8020";ctx.beginPath();ctx.arc(0,0,5+fl*.3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffaa40";ctx.beginPath();ctx.arc(0,-2,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffe080";ctx.beginPath();ctx.arc(0,-3,2,0,Math.PI*2);ctx.fill();if(f%4===0)g.pt.push({x:FX+rn(-3,3),y:FY+rn(-4,0),vx:rn(-.3,.3),vy:rn(-1.5,-.5),life:ri(12,25),c:Math.random()>.5?"#fa0":"#f70"});const bw=Math.min(r*1.2,55);ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(-bw,r+16,bw*2,5);ctx.fillStyle=g.fort.hp>g.fort.mhp*.3?"#4a8":"#e44";ctx.fillRect(-bw,r+16,bw*2*(g.fort.hp/g.fort.mhp),5);ctx.restore()}
        else if(o.ty==="T"){ctx.save();ctx.translate(Math.round(ox+Math.sin(o.d.sh)*2),Math.round(oy));ctx.scale(o.d.sz,o.d.sz);ctx.fillStyle="rgba(0,0,0,.18)";ctx.beginPath();ctx.ellipse(0,10,14,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#5a3a20";ctx.fillRect(-3,-2,6,14);const gc=[["#1a5428","#2d8040"],["#1a4a30","#288045"],["#2a4a20","#4a7830"],["#143a28","#226838"]][o.d.t%4];ctx.fillStyle=gc[0];ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(-18,-4);ctx.lineTo(18,-4);ctx.closePath();ctx.fill();ctx.fillStyle=gc[1];ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(-12,-6);ctx.lineTo(12,-6);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(220,235,255,.65)";ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(-7,-24);ctx.lineTo(7,-24);ctx.closePath();ctx.fill();ctx.restore();if(d(p,o.d)<AR+15){ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(ox-14,oy-38*o.d.sz,28,4);ctx.fillStyle="#6b4";ctx.fillRect(ox-14,oy-38*o.d.sz,28*(o.d.hp/o.d.mhp),4)}}
        else if(o.ty==="R"){ctx.save();ctx.translate(Math.round(ox+Math.sin(o.d.sh)*1.5),Math.round(oy));ctx.scale(o.d.sz,o.d.sz);ctx.fillStyle="rgba(0,0,0,.15)";ctx.beginPath();ctx.ellipse(0,6,14,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#556";ctx.beginPath();ctx.moveTo(-14,4);ctx.lineTo(-10,-8);ctx.lineTo(-2,-12);ctx.lineTo(8,-10);ctx.lineTo(14,-2);ctx.lineTo(12,6);ctx.closePath();ctx.fill();ctx.fillStyle="#778";ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(-2,-12);ctx.lineTo(6,-8);ctx.lineTo(2,0);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(220,235,255,.4)";ctx.beginPath();ctx.moveTo(-8,-6);ctx.lineTo(-2,-12);ctx.lineTo(6,-10);ctx.lineTo(2,-5);ctx.closePath();ctx.fill();ctx.restore();if(d(p,o.d)<AR+15){ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(ox-14,oy-16*o.d.sz,28,4);ctx.fillStyle="#aab";ctx.fillRect(ox-14,oy-16*o.d.sz,28*(o.d.hp/o.d.mhp),4)}}
        else if(o.ty==="A"){ctx.save();ctx.translate(Math.round(ox),Math.round(oy));ctx.scale(o.d.dir,1);const bob=Math.sin(o.d.an*.15);ctx.fillStyle="rgba(0,0,0,.15)";ctx.beginPath();ctx.ellipse(0,o.d.t==="deer"?8:5,o.d.t==="deer"?10:5,3,0,0,Math.PI*2);ctx.fill();if(o.d.t==="deer"){ctx.fillStyle="#8b6a44";ctx.beginPath();ctx.ellipse(1,-1+bob,10,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#9b7a54";ctx.beginPath();ctx.arc(10,-4+bob,4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#a89070";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(9,-8+bob);ctx.lineTo(6,-16);ctx.stroke();ctx.beginPath();ctx.moveTo(11,-8+bob);ctx.lineTo(14,-16);ctx.stroke()}else{ctx.fillStyle="#d0c0a0";ctx.beginPath();ctx.ellipse(0,bob,5,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e0d0b0";ctx.beginPath();ctx.arc(5,-2+bob,3.5,0,Math.PI*2);ctx.fill()}ctx.restore()}
        else if(o.ty==="E"){ctx.save();ctx.translate(Math.round(ox),Math.round(oy));const pulse=Math.sin(f*.08)*2;ctx.fillStyle="rgba(0,0,0,.2)";ctx.beginPath();ctx.ellipse(0,10,o.d.t==="boss"?16:10,4,0,0,Math.PI*2);ctx.fill();if(o.d.t==="boss"){ctx.fillStyle="#3a1028";ctx.beginPath();ctx.ellipse(0,0,16,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f22";ctx.beginPath();ctx.arc(-5,-4,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(5,-4,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#777";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(-16,-22-pulse);ctx.stroke();ctx.beginPath();ctx.moveTo(10,-8);ctx.lineTo(16,-22-pulse);ctx.stroke()}else if(o.d.t==="wolf"){ctx.fillStyle="#3a3a48";ctx.beginPath();ctx.ellipse(0,0,10,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4a4a58";ctx.beginPath();ctx.arc(8,-2,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e33";ctx.beginPath();ctx.arc(11,-2,1.5,0,Math.PI*2);ctx.fill()}else if(o.d.t==="raid"){ctx.fillStyle="#5a3030";ctx.fillRect(-6,-10,12,14);ctx.fillStyle="#daa070";ctx.beginPath();ctx.arc(0,-14,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#8a4040";ctx.fillRect(-7,-8,14,3)}else{ctx.fillStyle="#2a5a78";ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.fillStyle="#8ef";ctx.beginPath();ctx.arc(-3,-3,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(3,-3,2,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){const sa=(i/5)*Math.PI*2+f*.015;ctx.fillStyle="rgba(150,220,255,.4)";ctx.fillRect(Math.cos(sa)*12-1,Math.sin(sa)*12-2,2,4)}}ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(-12,o.d.t==="boss"?-28:-16,24,3);ctx.fillStyle="#e33";ctx.fillRect(-12,o.d.t==="boss"?-28:-16,24*(o.d.hp/o.d.mhp),3);ctx.restore()}
        else if(o.ty==="W"){ctx.save();ctx.translate(Math.round(ox),Math.round(oy));const wb=Math.sin(f*.2);ctx.fillStyle="rgba(0,0,0,.2)";ctx.beginPath();ctx.ellipse(0,8,6,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4a8844";ctx.fillRect(-4,-3+wb,8,8);ctx.fillStyle="#edc8a0";ctx.beginPath();ctx.arc(0,-7+wb,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3a6634";ctx.fillRect(-5,-3+wb,10,2);if(o.d.carry){ctx.fillStyle=o.d.carry==="w"?"#a86":o.d.carry==="s"?"#889":"#d84";ctx.fillRect(4,-2+wb,4,4)}ctx.restore()}
        else if(o.ty==="V"){ctx.save();ctx.translate(Math.round(ox),Math.round(oy));if(o.d.con){ctx.fillStyle="rgba(100,200,100,.1)";ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4a6a4a";ctx.fillRect(-12,-14,24,18);ctx.fillStyle="#3a5a3a";ctx.beginPath();ctx.moveTo(-16,-14);ctx.lineTo(0,-24);ctx.lineTo(16,-14);ctx.closePath();ctx.fill();ctx.fillStyle="#8c8";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText("已征服",0,20)}else{ctx.fillStyle="rgba(200,60,60,.08)";ctx.beginPath();ctx.arc(0,0,35,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(200,60,60,.3)";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#5a2a2a";ctx.fillRect(-14,-16,28,20);ctx.fillStyle="#4a1a1a";ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(0,-28);ctx.lineTo(18,-16);ctx.closePath();ctx.fill();ctx.fillStyle="#f44";ctx.beginPath();ctx.moveTo(0,-28);ctx.lineTo(8,-22);ctx.lineTo(0,-18);ctx.fill();ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(-16,10,32,4);ctx.fillStyle="#c44";ctx.fillRect(-16,10,32*(o.d.hp/o.d.mhp),4);ctx.fillStyle="rgba(255,200,200,.6)";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.fillText(o.d.nm,0,24)}ctx.restore()}
        else if(o.ty==="P"){ctx.save();ctx.translate(Math.round(ox),Math.round(oy));const flip=p.dir<0?-1:1;ctx.scale(flip,1);const bob=Math.sin(p.fr*.25)*1.5;if(p.inv>0&&f%6<3)ctx.globalAlpha=.4;ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(0,11,9,4,0,0,Math.PI*2);ctx.fill();const la=Math.sin(p.fr*.3)*3;ctx.fillStyle="#3a2820";ctx.fillRect(-4,4+bob,3,7+la*.5);ctx.fillRect(1,4+bob,3,7-la*.5);ctx.fillStyle=p.inv>0?"#cc6666":"#4477aa";ctx.fillRect(-6,-5+bob,12,10);ctx.fillStyle="#8b7355";ctx.fillRect(-7,-5+bob,14,3);ctx.fillStyle="#5a3a20";ctx.fillRect(-6,2+bob,12,2);ctx.fillStyle="#c8a84a";ctx.fillRect(-1,2+bob,2,2);ctx.fillStyle="#4477aa";ctx.save();ctx.translate(7,-2+bob);ctx.rotate((p.sw?Math.sin(p.fr*.8)*20:0)*Math.PI/180);ctx.fillRect(0,0,3,7);if(p.sw){ctx.fillStyle="#aaa";ctx.fillRect(1,6,2,6);ctx.fillStyle="#888";ctx.fillRect(-1,10,5,4)}ctx.restore();ctx.fillStyle="#4477aa";ctx.fillRect(-10,-2+bob,3,6);ctx.fillStyle="#f0d0a0";ctx.fillRect(-5,-13+bob,10,8);ctx.fillStyle="#3a2520";ctx.fillRect(-6,-14+bob,12,3);ctx.fillRect(-6,-14+bob,2,6);ctx.fillStyle="#222";ctx.fillRect(1,-10+bob,2,2);ctx.fillRect(5,-10+bob,2,2);ctx.fillStyle="#993333";ctx.globalAlpha=Math.min(ctx.globalAlpha,.85);ctx.beginPath();ctx.moveTo(-7,-4+bob);ctx.lineTo(-10,8+bob+la*.2);ctx.lineTo(-4,6+bob);ctx.fill();ctx.globalAlpha=1;ctx.restore();ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(ox-14,oy-22,28,3);ctx.fillStyle=p.hp>p.mhp*.3?"#5b5":"#e44";ctx.fillRect(ox-14,oy-22,28*(p.hp/p.mhp),3)}}

      for(let b of g.bul){ctx.fillStyle="#ffcc44";ctx.beginPath();ctx.arc(b.x-cx,b.y-cy,3,0,Math.PI*2);ctx.fill()}
      for(let pt of g.pt){ctx.globalAlpha=cl(pt.life/20,0,1);ctx.fillStyle=pt.c;const sz=cl(pt.life/10,1,3);ctx.fillRect(pt.x-cx-sz/2,pt.y-cy-sz/2,sz,sz)}ctx.globalAlpha=1;
      for(let dr2 of g.dr){ctx.globalAlpha=cl(dr2.life/30,0,1);ctx.font="bold 12px 'Noto Sans TC',sans-serif";ctx.textAlign="center";ctx.fillStyle="#000";ctx.fillText(`${dr2.icon}${dr2.text}`,dr2.x-cx+1,dr2.y-cy+1);ctx.fillStyle=dr2.c;ctx.fillText(`${dr2.icon}${dr2.text}`,dr2.x-cx,dr2.y-cy)}ctx.globalAlpha=1;
      for(let i=0;i<2;i++){ctx.fillStyle=`rgba(200,220,245,${rn(.08,.25)})`;ctx.fillRect(rn(0,CW),(f*(1+i*.3)+i*200)%CH,rn(1,2.5),rn(1,2.5))}
      const nA=isN?Math.min(.5,(dp-.5)*2.5):0;if(nA>0){ctx.fillStyle=`rgba(5,8,25,${nA})`;ctx.fillRect(0,0,CW,CH);const px2=p.x-cx,py2=p.y-cy;const tg2=ctx.createRadialGradient(px2,py2,8,px2,py2,120);tg2.addColorStop(0,"rgba(255,200,100,.18)");tg2.addColorStop(1,"rgba(255,150,50,0)");ctx.fillStyle=tg2;ctx.fillRect(px2-130,py2-130,260,260)}const vig=ctx.createRadialGradient(CW/2,CH/2,CW*.28,CW/2,CH/2,CW*.7);vig.addColorStop(0,"rgba(0,0,0,0)");vig.addColorStop(1,"rgba(0,0,0,.4)");ctx.fillStyle=vig;ctx.fillRect(0,0,CW,CH);
      if(joy.current.on){const rect=c.getBoundingClientRect();const jx=joy.current.sx-rect.left,jy=joy.current.sy-rect.top,jcx=joy.current.cx-rect.left,jcy=joy.current.cy-rect.top;ctx.globalAlpha=.15;ctx.strokeStyle="#c8aa80";ctx.lineWidth=2;ctx.beginPath();ctx.arc(jx,jy,48,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.25;ctx.fillStyle="#c8aa80";const jjd=Math.min(Math.hypot(jcx-jx,jcy-jy),48),jja=Math.atan2(jcy-jy,jcx-jx);ctx.beginPath();ctx.arc(jx+Math.cos(jja)*jjd,jy+Math.sin(jja)*jjd,14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
      mQ.current.forEach((m,i)=>{const ma=Math.min(1,m.life/20);ctx.globalAlpha=ma;ctx.font="bold 13px 'Noto Sans TC',sans-serif";ctx.textAlign="center";const tw=ctx.measureText(m.text).width+32;const my=CH*.32+i*34;ctx.fillStyle="rgba(10,8,4,.82)";ctx.strokeStyle="rgba(180,140,80,.25)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(CW/2-tw/2,my,tw,28,6);ctx.fill();ctx.stroke();ctx.fillStyle=m.color;ctx.fillText(m.text,CW/2,my+19)});ctx.globalAlpha=1;

      if(f%8===0)setUi(prev=>({...prev,w:g.res.w,s:g.res.s,f:g.res.f,hp:p.hp,mhp:p.mhp,flv:g.fort.lv,fhp:g.fort.hp,fmhp:g.fort.mhp,day:g.day,night:isN,en:g.enemies.length,kills:g.kills,wk:g.workers.length,con:g.con,vil:g.villages.map(v=>({...v}))}));
      anim=requestAnimationFrame(tick)};
    anim=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(anim);window.removeEventListener("resize",resize)}
  },[ui.screen]);

  const upgF=()=>{const g=G.current;if(!g)return;const nl=g.fort.lv+1;if(nl>=FORTS.length){addM("已達最高等級！");return}const c2=FORTS[nl].cost;if((c2.w||0)>g.res.w||(c2.s||0)>g.res.s||(c2.f||0)>g.res.f){addM("⚠️ 資源不足！","#ff8866");return}g.res.w-=c2.w||0;g.res.s-=c2.s||0;g.res.f-=c2.f||0;g.fort.lv=nl;g.fort.mhp=FORTS[nl].hp;g.fort.hp=FORTS[nl].hp;g.walls=mkWalls(nl);addM(`🏰 升級為 ${FORTS[nl].n}！`,"#ffcc44");for(let i=0;i<20;i++)g.pt.push({x:FX+rn(-40,40),y:FY+rn(-40,10),vx:rn(-2,2),vy:rn(-3,-1),life:ri(20,40),c:Math.random()>.5?"#fa0":"#ff6"});setUi(p=>({...p,showU:false}))};
  const repW=()=>{const g=G.current;if(!g||g.walls.length===0)return;const br=g.walls.filter(w=>w.hp<w.mhp);if(!br.length){addM("城牆完好！");return}const cost=br.length*3;if(g.res.w<cost){addM("⚠️ 木材不足！","#ff8866");return}g.res.w-=cost;for(let w of br)w.hp=w.mhp;addM("🔧 城牆已修復！","#88ccff")};
  const eat=()=>{const g=G.current;if(!g)return;if(g.res.f>=3){g.res.f-=3;g.p.hp=Math.min(g.p.mhp,g.p.hp+5);addM("🍖 恢復體力！")}else addM("⚠️ 食物不足！","#ff8866")};

  /* ═══════════════════════ CSS ═══════════════════════ */
  const CSS=`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Cinzel:wght@700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-user-select:none;user-select:none}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes glow{0%,100%{filter:drop-shadow(0 0 15px rgba(255,140,40,.3))}50%{filter:drop-shadow(0 0 45px rgba(255,140,40,.7))}}
@keyframes snow{0%{transform:translateY(-5vh);opacity:0}10%{opacity:1}90%{opacity:.3}100%{transform:translateY(105vh);opacity:0}}
@keyframes fadeUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes barGlow{0%,100%{box-shadow:0 0 4px rgba(255,180,80,.2)}50%{box-shadow:0 0 10px rgba(255,180,80,.4)}}
@keyframes panelIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;

  const panel={background:"linear-gradient(180deg,rgba(18,14,10,.96),rgba(12,10,8,.98))",border:"1px solid rgba(180,140,80,.2)",borderRadius:4,boxShadow:"0 0 20px rgba(0,0,0,.6), inset 0 1px 0 rgba(180,140,80,.08)"};
  const goldBorder="1px solid rgba(180,140,80,.25)";
  const goldText={color:"#c8a868",textShadow:"0 0 8px rgba(200,160,80,.2)"};

  /* ═══ TITLE ═══ */
  if(ui.screen==="title")return(
    <div style={{width:"100%",height:"100vh",background:"radial-gradient(ellipse at 50% 30%, #151820 0%, #0a0c12 50%, #060810 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif",color:"#c8d8e8",overflow:"hidden",position:"relative",touchAction:"none"}}>
      <style>{CSS}</style>
      {Array.from({length:50}).map((_,i)=><div key={i} style={{position:"absolute",width:rn(1,2.5),height:rn(1,2.5),background:`rgba(180,200,230,${rn(.12,.4)})`,borderRadius:"50%",left:`${rn(0,100)}%`,top:"-2%",animation:`snow ${rn(6,16)}s linear ${rn(0,10)}s infinite`}}/>)}
      {/* Decorative lines */}
      <div style={{position:"absolute",top:"15%",left:"50%",transform:"translateX(-50%)",width:200,height:1,background:"linear-gradient(90deg,transparent,rgba(180,140,80,.3),transparent)"}}/>
      <div style={{position:"absolute",bottom:"18%",left:"50%",transform:"translateX(-50%)",width:200,height:1,background:"linear-gradient(90deg,transparent,rgba(180,140,80,.3),transparent)"}}/>
      <div style={{animation:"float 3s ease-in-out infinite, glow 4s ease-in-out infinite",fontSize:100,marginBottom:12}}>🔥</div>
      <h1 style={{fontFamily:"'Cinzel',serif",fontSize:48,fontWeight:900,letterSpacing:12,...goldText,animation:"fadeUp 1s ease-out",lineHeight:1.2}}>餘燼荒原</h1>
      <p style={{fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:16,color:"#5a4a3a",marginBottom:30,marginTop:4}}>ASHEN FRONTIER</p>
      <div style={{...panel,padding:"16px 24px",marginBottom:30,animation:"fadeUp 1s ease-out .2s both",maxWidth:300}}>
        <p style={{fontSize:12,color:"#8a7a68",lineHeight:2.2,textAlign:"center"}}>
          在荒蕪大地上建造你的王國<br/>
          <span style={{color:"#b8a070"}}>砍伐</span> · <span style={{color:"#a0a8b8"}}>採礦</span> · <span style={{color:"#c8a050"}}>狩獵</span> · <span style={{color:"#c07040"}}>征服</span><br/>
          <span style={{fontSize:10,color:"#6a8a6a"}}>前3天安全期，好好備戰！</span>
        </p>
      </div>
      <button onClick={init} style={{...panel,background:"linear-gradient(180deg,rgba(160,80,20,.7),rgba(120,50,10,.8))",border:"1px solid rgba(220,160,60,.35)",color:"#ffe0b0",padding:"14px 52px",fontSize:17,fontWeight:800,letterSpacing:8,cursor:"pointer",boxShadow:"0 4px 25px rgba(200,100,20,.3), inset 0 1px 0 rgba(255,200,120,.15)",animation:"fadeUp 1s ease-out .4s both",transition:"all .15s"}} onMouseDown={e=>e.target.style.transform="scale(.96)"} onMouseUp={e=>e.target.style.transform="scale(1)"}>點 燃 火 種</button>
      <div style={{marginTop:28,fontSize:10,color:"#3a3028",textAlign:"center",lineHeight:2.2,animation:"fadeUp 1s ease-out .6s both"}}>
        <span style={{color:"#5a4a38"}}>📱 觸控拖曳移動</span> · <span style={{color:"#5a4a38"}}>靠近自動互動</span><br/>
        <span style={{color:"#4a3a28"}}>⌨️ WASD 移動</span>
      </div>
      <p style={{fontSize:8,color:"#2a2018",marginTop:20,letterSpacing:4}}>HAO0321 ©STUDIO</p>
    </div>
  );

  /* ═══ GAME OVER ═══ */
  if(ui.screen==="over")return(
    <div style={{width:"100%",height:"100vh",background:"radial-gradient(ellipse at 50% 40%, #1a1018 0%, #0c080a 60%, #060408 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif",color:"#c8d8e8"}}>
      <style>{CSS}</style>
      <div style={{fontSize:70,marginBottom:16,filter:"drop-shadow(0 0 20px rgba(200,60,60,.3))",animation:"fadeUp .8s ease-out"}}>💀</div>
      <h1 style={{fontFamily:"'Cinzel',serif",fontSize:34,fontWeight:900,color:"#c08080",letterSpacing:8,marginBottom:8,textShadow:"0 0 15px rgba(200,80,80,.2)",animation:"fadeUp .8s ease-out .1s both"}}>城市陷落</h1>
      <p style={{fontSize:11,color:"#5a4a4a",marginBottom:24,animation:"fadeUp .8s ease-out .15s both"}}>永恆的黑暗吞噬了最後的餘燼</p>
      <div style={{...panel,padding:20,marginBottom:24,minWidth:250,animation:"fadeUp .8s ease-out .2s both"}}>
        {[["存活天數",`${ui.day} 天`,"#c8a868"],["擊殺敵人",`${ui.kills}`,"#c88080"],["堡壘等級",FORTS[ui.flv]?.n||"營火","#a0a8b8"],["征服領地",`${ui.con} 座`,"#80c880"]].map(([k,v,c])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 4px",borderBottom:"1px solid rgba(180,140,80,.06)",fontSize:13}}>
            <span style={{color:"#5a4a3a"}}>{k}</span><span style={{color:c,fontWeight:700}}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={init} style={{...panel,background:"linear-gradient(180deg,rgba(160,80,20,.7),rgba(120,50,10,.8))",border:"1px solid rgba(220,160,60,.35)",color:"#ffe0b0",padding:"13px 44px",fontSize:15,fontWeight:800,letterSpacing:6,cursor:"pointer",boxShadow:"0 4px 20px rgba(200,100,20,.25), inset 0 1px 0 rgba(255,200,120,.15)",animation:"fadeUp .8s ease-out .3s both"}}>再次挑戰</button>
    </div>
  );

  /* ═══ GAME HUD ═══ */
  const nc=ui.flv+1<FORTS.length?FORTS[ui.flv+1]:null;
  const hpP=(ui.hp/ui.mhp)*100,fhpP=(ui.fhp/ui.fmhp)*100;

  return(
    <div style={{width:"100%",height:"100vh",background:"#000",overflow:"hidden",position:"relative",fontFamily:"'Noto Sans TC',sans-serif",touchAction:"none"}}>
      <style>{CSS}</style>
      <canvas ref={cvs} style={{display:"block",width:"100%",height:"100%"}} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}/>

      {/* ═══ TOP HUD ═══ */}
      <div style={{position:"absolute",top:0,left:0,right:0,pointerEvents:"none",zIndex:10,animation:"slideDown .4s ease-out"}}>
        {/* Ornate top bar */}
        <div style={{background:"linear-gradient(180deg,rgba(12,10,6,.92) 0%,rgba(12,10,6,.7) 70%,transparent 100%)",borderBottom:"1px solid rgba(180,140,80,.1)",padding:"8px 12px 14px"}}>
          {/* Day + Status row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:ui.night?"radial-gradient(circle,#2a3a6a,#1a1a3a)":"radial-gradient(circle,#4a3a20,#2a2010)",border:goldBorder,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:ui.night?"0 0 10px rgba(60,80,160,.3)":"0 0 10px rgba(200,150,60,.3)"}}>
                {ui.night?"🌙":"☀️"}
              </div>
              <div>
                <div style={{...goldText,fontWeight:800,fontSize:14,lineHeight:1}}>第 {ui.day} 天</div>
                <div style={{fontSize:8,color:"#5a4a3a",marginTop:1}}>{ui.day<=SAFE_DAYS?`安全期 ${SAFE_DAYS-ui.day+1}天`:ui.night?"夜晚 · 危險":"白天 · 安全"}</div>
              </div>
            </div>
            {ui.night&&ui.day>SAFE_DAYS&&<div style={{fontSize:10,color:"#c87060",background:"rgba(160,40,30,.15)",padding:"3px 10px",borderRadius:3,border:"1px solid rgba(160,40,30,.2)",animation:"barGlow 2s infinite"}}>⚔ {ui.en} 來襲</div>}
            <div style={{display:"flex",gap:10,fontSize:10}}>
              <span style={{color:"#a08070"}}>💀 {ui.kills}</span>
              <span style={{color:"#80a080"}}>🏴 {ui.con}</span>
            </div>
          </div>

          {/* Resources row */}
          <div style={{display:"flex",gap:5,marginBottom:8}}>
            {[{i:"🪵",v:ui.w,n:"木材",c:"#c8a060",bg:"rgba(160,120,50,.08)"},{i:"🪨",v:ui.s,n:"石頭",c:"#90a0b0",bg:"rgba(120,140,160,.08)"},{i:"🍖",v:ui.f,n:"食物",c:"#c89050",bg:"rgba(180,120,50,.08)"}].map(r=>(
              <div key={r.n} style={{flex:1,background:r.bg,border:goldBorder,borderRadius:3,padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:16,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.5))"}}>{r.i}</span>
                <div>
                  <div style={{color:r.c,fontWeight:800,fontSize:15,lineHeight:1,textShadow:"0 1px 3px rgba(0,0,0,.5)"}}>{r.v}</div>
                  <div style={{fontSize:7,color:"#4a3a2a",letterSpacing:2,marginTop:1}}>{r.n}</div>
                </div>
              </div>
            ))}
          </div>

          {/* HP bars */}
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:9,...goldText}}>❤️ 玩家</span>
                <span style={{fontSize:9,color:"#5a4a3a"}}>{ui.hp}/{ui.mhp}</span>
              </div>
              <div style={{height:7,background:"rgba(0,0,0,.4)",borderRadius:2,border:"1px solid rgba(180,140,80,.1)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${hpP}%`,background:hpP>30?"linear-gradient(180deg,#5a9a3a,#3a7a2a)":"linear-gradient(180deg,#c84030,#a03020)",transition:"width .3s",borderRadius:2}}/>
                <div style={{position:"absolute",top:0,left:0,height:"40%",width:`${hpP}%`,background:"rgba(255,255,255,.15)",borderRadius:"2px 2px 0 0"}}/>
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:9,...goldText}}>🏰 {FORTS[ui.flv].n}</span>
                <span style={{fontSize:9,color:"#5a4a3a"}}>{ui.fhp}/{ui.fmhp}</span>
              </div>
              <div style={{height:7,background:"rgba(0,0,0,.4)",borderRadius:2,border:"1px solid rgba(180,140,80,.1)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${fhpP}%`,background:fhpP>30?"linear-gradient(180deg,#4a7aaa,#2a5a8a)":"linear-gradient(180deg,#c84030,#a03020)",transition:"width .3s",borderRadius:2}}/>
                <div style={{position:"absolute",top:0,left:0,height:"40%",width:`${fhpP}%`,background:"rgba(255,255,255,.12)",borderRadius:"2px 2px 0 0"}}/>
              </div>
            </div>
          </div>

          {/* Workers */}
          {ui.wk>0&&<div style={{marginTop:6,fontSize:9,color:"#6a8a5a",display:"flex",alignItems:"center",gap:4}}>
            <span style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:"#6a8a5a",animation:"barGlow 2s infinite"}}/>
            <span>工人 ×{ui.wk} 採集中</span>
          </div>}
        </div>
      </div>

      {/* ═══ VILLAGE TRACKER ═══ */}
      <div style={{position:"absolute",top:170,right:6,zIndex:10,pointerEvents:"none"}}>
        {(ui.vil||[]).map(v=>(
          <div key={v.id} style={{...panel,padding:"3px 8px",marginBottom:3,fontSize:9,color:v.con?"#80a870":"#b07060",display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:4,height:4,borderRadius:"50%",background:v.con?"#6a8":"#c66"}}/>
            {v.con?"✓":"⚔"} {v.nm}
          </div>
        ))}
      </div>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,zIndex:10}}>
        {[
          {icon:"🏗",label:"升級",action:()=>setUi(p=>({...p,showU:!p.showU})),accent:"rgba(180,140,60,.15)",bc:"rgba(180,140,60,.2)"},
          {icon:"🔧",label:"修牆",action:repW,accent:"rgba(100,160,180,.15)",bc:"rgba(100,160,180,.2)"},
          {icon:"🍖",label:"進食",action:eat,accent:"rgba(180,120,50,.15)",bc:"rgba(180,120,50,.2)"},
        ].map(b=>(
          <button key={b.label} onClick={b.action} style={{background:`linear-gradient(180deg,${b.accent},rgba(10,8,6,.9))`,border:`1px solid ${b.bc}`,borderRadius:4,padding:"8px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:56,boxShadow:"0 2px 10px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.03)",transition:"all .12s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.93)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
            <span style={{fontSize:18,filter:"drop-shadow(0 1px 3px rgba(0,0,0,.5))"}}>{b.icon}</span>
            <span style={{fontSize:9,color:"#8a7a60",letterSpacing:2,fontWeight:700}}>{b.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ UPGRADE PANEL ═══ */}
      {ui.showU&&(
        <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",animation:"panelIn .25s ease-out",...panel,padding:0,zIndex:30,width:300,overflow:"hidden"}}>
          {/* Header */}
          <div style={{background:"linear-gradient(180deg,rgba(180,140,60,.1),transparent)",borderBottom:goldBorder,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:900,...goldText}}>堡壘升級</div>
            <div style={{fontSize:10,color:"#5a4a38",marginTop:2}}>{FORTS[ui.flv].n} · Lv.{ui.flv+1}</div>
          </div>

          <div style={{padding:"12px 16px"}}>
            {nc?(
              <>
                {/* Next level card */}
                <div style={{background:"rgba(180,140,60,.04)",border:goldBorder,borderRadius:3,padding:12,marginBottom:12}}>
                  <div style={{fontSize:14,...goldText,fontWeight:700,marginBottom:4,textAlign:"center"}}>→ {nc.n}</div>
                  <div style={{fontSize:10,color:"#7a8a6a",textAlign:"center",marginBottom:10}}>{nc.desc}</div>
                  <div style={{display:"flex",justifyContent:"center",gap:8}}>
                    {nc.cost.w&&<div style={{textAlign:"center",background:"rgba(0,0,0,.2)",borderRadius:3,padding:"4px 10px",border:"1px solid rgba(180,140,80,.08)"}}>
                      <div style={{fontSize:14}}>🪵</div>
                      <div style={{fontSize:12,color:ui.w>=nc.cost.w?"#a0c880":"#c08060",fontWeight:700}}>{nc.cost.w}</div>
                      <div style={{fontSize:8,color:"#4a3a2a"}}>有 {ui.w}</div>
                    </div>}
                    {nc.cost.s&&<div style={{textAlign:"center",background:"rgba(0,0,0,.2)",borderRadius:3,padding:"4px 10px",border:"1px solid rgba(180,140,80,.08)"}}>
                      <div style={{fontSize:14}}>🪨</div>
                      <div style={{fontSize:12,color:ui.s>=nc.cost.s?"#a0c880":"#c08060",fontWeight:700}}>{nc.cost.s}</div>
                      <div style={{fontSize:8,color:"#4a3a2a"}}>有 {ui.s}</div>
                    </div>}
                    {nc.cost.f&&<div style={{textAlign:"center",background:"rgba(0,0,0,.2)",borderRadius:3,padding:"4px 10px",border:"1px solid rgba(180,140,80,.08)"}}>
                      <div style={{fontSize:14}}>🍖</div>
                      <div style={{fontSize:12,color:ui.f>=nc.cost.f?"#a0c880":"#c08060",fontWeight:700}}>{nc.cost.f}</div>
                      <div style={{fontSize:8,color:"#4a3a2a"}}>有 {ui.f}</div>
                    </div>}
                  </div>
                </div>
                <button onClick={upgF} style={{width:"100%",padding:11,fontSize:13,fontWeight:800,...goldText,background:"linear-gradient(180deg,rgba(160,80,20,.6),rgba(120,50,10,.7))",border:"1px solid rgba(220,160,60,.3)",borderRadius:3,cursor:"pointer",letterSpacing:4,boxShadow:"0 2px 12px rgba(200,100,20,.2), inset 0 1px 0 rgba(255,200,120,.1)"}}>升 級</button>
              </>
            ):<div style={{fontSize:13,textAlign:"center",padding:16,...goldText}}>👑 已達最終形態</div>}

            {/* Unlock list */}
            <div style={{marginTop:10,paddingTop:8,borderTop:goldBorder}}>
              <div style={{fontSize:8,color:"#4a3a28",textAlign:"center",marginBottom:6,letterSpacing:3}}>解鎖進度</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3}}>
                {[{lv:1,t:"城牆",i:"🧱"},{lv:1,t:"工人",i:"👷"},{lv:2,t:"強化",i:"🔨"},{lv:3,t:"砲塔",i:"🗼"},{lv:4,t:"征服",i:"⚔️"},{lv:5,t:"王城",i:"👑"}].map((u,i)=>(
                  <div key={i} style={{fontSize:8,padding:"3px 0",textAlign:"center",borderRadius:2,background:ui.flv>=u.lv?"rgba(100,160,80,.08)":"rgba(0,0,0,.2)",color:ui.flv>=u.lv?"#8aaa70":"#3a3028",border:`1px solid ${ui.flv>=u.lv?"rgba(100,160,80,.12)":"rgba(255,255,255,.02)"}`}}>
                    {u.i} {u.t}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={()=>setUi(p=>({...p,showU:false}))} style={{width:"100%",marginTop:8,padding:6,fontSize:10,background:"transparent",border:goldBorder,color:"#3a3028",borderRadius:3,cursor:"pointer",letterSpacing:2}}>關 閉</button>
          </div>
        </div>
      )}
    </div>
  );
}
