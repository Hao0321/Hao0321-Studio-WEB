import { useState, useEffect, useCallback } from "react";

const VFX = [
  {
    title: "Development",
    sub: "概念發想與前期規劃",
    color: "#D4A853",
    time: "2-6 週",
    pct: 10,
    parallel: [],
    tasks: [
      { name: "劇本 / Storyboard", detail: "撰寫劇本，繪製分鏡，確定視覺敘事方向與美術風格指南", res: "https://www.youtube.com/results?search_query=storyboard+tutorial" },
      { name: "Concept Art", detail: "角色、場景、道具概念設計，建立 Style Guide 統一美術語言", res: "https://www.youtube.com/results?search_query=concept+art+workflow" },
      { name: "Pre-Visualization", detail: "簡易 3D 動態排演鏡頭構圖、攝影機運動與節奏", res: "https://www.youtube.com/results?search_query=previz+blender" },
      { name: "技術評估", detail: "Pipeline 工具鏈確認、渲染方案選型、預算與排程規劃" },
    ],
  },
  {
    title: "Production",
    sub: "現場拍攝與資料收集",
    color: "#C45C5C",
    time: "1-4 週",
    pct: 10,
    parallel: [],
    tasks: [
      { name: "Green/Blue Screen", detail: "色幕前拍攝演員表演，後期去背合成用" },
      { name: "HDRI / Set Survey", detail: "Chrome Ball、Grey Ball 光照採集，場景實測數據", res: "https://www.youtube.com/results?search_query=HDRI+on+set+vfx" },
      { name: "Motion Capture", detail: "光學或慣性動捕系統記錄演員全身動作數據" },
      { name: "Face Capture", detail: "HMC 頭戴攝影機或 Medusa 系統捕捉臉部表情" },
      { name: "LiDAR / Photogrammetry", detail: "3D 掃描實體場景與道具，取得精確幾何", res: "https://www.youtube.com/results?search_query=photogrammetry+tutorial" },
    ],
  },
  {
    title: "Asset Creation",
    sub: "模型、材質、骨架製作",
    color: "#9B7ED8",
    time: "4-12 週",
    pct: 30,
    parallel: ["Animation", "FX / Simulation"],
    tasks: [
      { name: "Modeling", detail: "高模雕刻 → Retopo → UV 展開，ZBrush / Maya / Blender", res: "https://www.youtube.com/results?search_query=hard+surface+modeling+blender" },
      { name: "Texturing", detail: "Substance Painter / Mari 繪製 PBR 貼圖組", res: "https://www.youtube.com/results?search_query=substance+painter+tutorial" },
      { name: "Look Development", detail: "最終渲染器中調校 Shader，確保各光照條件下正確" },
      { name: "Rigging", detail: "骨骼系統、控制器、變形器建立，供動畫師操控", res: "https://www.youtube.com/results?search_query=rigging+blender+tutorial" },
      { name: "Groom / CFX", detail: "XGen / Houdini 製作毛髮與布料預設" },
    ],
  },
  {
    title: "Animation",
    sub: "角色表演與鏡頭動態",
    color: "#5B8FD4",
    time: "3-8 週",
    pct: 15,
    parallel: ["Asset Creation", "FX / Simulation"],
    tasks: [
      { name: "Layout", detail: "資產置入場景，設定攝影機與角色粗略動態" },
      { name: "Body Animation", detail: "Keyframe 動畫或 MoCap 清理，調整表演節奏" },
      { name: "Facial Animation", detail: "Blendshape / FACS 驅動臉部表情" },
      { name: "Crowd Simulation", detail: "Golaem / Massive 大量群眾動畫生成" },
    ],
  },
  {
    title: "FX / Simulation",
    sub: "模擬與程序化效果",
    color: "#D48A3B",
    time: "2-6 週",
    pct: 10,
    parallel: ["Asset Creation", "Animation"],
    tasks: [
      { name: "Destruction", detail: "剛體碎裂 (RBD)、建築倒塌、車輛損毀模擬" },
      { name: "Fluid Simulation", detail: "水、火、煙霧 (Houdini FLIP / Pyro)、岩漿", res: "https://www.youtube.com/results?search_query=houdini+pyro+tutorial" },
      { name: "Cloth / Hair Sim", detail: "服裝動態 (Marvelous / Vellum)、毛髮物理" },
      { name: "Particles", detail: "魔法、火花、灰塵、環境粒子系統" },
    ],
  },
  {
    title: "Lighting / Render",
    sub: "光照設計與最終算圖",
    color: "#4DB89A",
    time: "2-4 週",
    pct: 10,
    parallel: [],
    tasks: [
      { name: "Lighting Setup", detail: "依 HDRI 參考重建光照或設計全 CG 燈光" },
      { name: "Render Passes", detail: "分層渲染 Beauty, Diffuse, Spec, Shadow, AO, Crypto" },
      { name: "Render Farm", detail: "Deadline / Tractor 大規模並行渲染排程" },
    ],
  },
  {
    title: "Compositing",
    sub: "合成與最終輸出",
    color: "#4AA8C4",
    time: "2-6 週",
    pct: 15,
    parallel: [],
    tasks: [
      { name: "Plate Prep", detail: "Keying 去背、穩定、Roto/Rotoscoping、瑕疵清除", res: "https://www.youtube.com/results?search_query=nuke+keying+tutorial" },
      { name: "CG Integration", detail: "Nuke 中合成 Render Passes 與實拍素材" },
      { name: "Color Grading", detail: "DaVinci / Nuke 調色，匹配鏡頭色調", res: "https://www.youtube.com/results?search_query=davinci+resolve+color+grading" },
      { name: "Final Output", detail: "輸出 EXR / DPX 序列，交付剪輯或 DI" },
    ],
  },
];

const GAME = [
  {
    title: "Concept",
    sub: "遊戲核心設計",
    color: "#D46B9E",
    time: "2-4 週",
    pct: 8,
    parallel: [],
    tasks: [
      { name: "GDD 設計文件", detail: "核心玩法循環、目標受眾、平台、變現模式" },
      { name: "Prototype", detail: "Greybox 快速驗證核心機制，確認手感與趣味", res: "https://www.youtube.com/results?search_query=game+prototype+tutorial" },
      { name: "Art Direction", detail: "Mood Board、Style Guide、角色與場景概念" },
      { name: "Tech Spike", detail: "引擎選型 (UE5/Unity/Godot)、渲染管線評估" },
    ],
  },
  {
    title: "Pre-Production",
    sub: "建立製作標準",
    color: "#A06BD4",
    time: "3-6 週",
    pct: 12,
    parallel: [],
    tasks: [
      { name: "Asset Pipeline", detail: "命名規範、版控 (Perforce/Git LFS)、自動化匯入" },
      { name: "Vertical Slice", detail: "一段完整品質遊戲切片，驗證所有環節" },
      { name: "Level Design", detail: "Blockout 灰盒關卡，驗證空間動線與節奏", res: "https://www.youtube.com/results?search_query=level+design+blockout" },
      { name: "Architecture", detail: "核心系統 (ECS/Component)、UI 框架、存檔系統" },
    ],
  },
  {
    title: "Art Production",
    sub: "視覺資產全流程",
    color: "#D4A040",
    time: "8-20 週",
    pct: 30,
    parallel: ["Programming", "Audio"],
    tasks: [
      { name: "Character Art", detail: "高模 → Retopo → UV → Bake → Texture → Rig" },
      { name: "Environment", detail: "模組化建築、地形、植被、Trim Sheet" },
      { name: "Animation", detail: "Locomotion、戰鬥、互動動畫、狀態機" },
      { name: "VFX / Particles", detail: "Niagara / VFX Graph 技能特效與環境粒子" },
      { name: "UI/UX Design", detail: "HUD、選單、背包、小地圖、按鈕回饋" },
    ],
  },
  {
    title: "Programming",
    sub: "系統與邏輯開發",
    color: "#5080D4",
    time: "8-20 週",
    pct: 25,
    parallel: ["Art Production", "Audio"],
    tasks: [
      { name: "Gameplay Systems", detail: "控制器、戰鬥、AI 行為樹、物理互動" },
      { name: "Networking", detail: "Netcode、同步方案、延遲補償" },
      { name: "Tooling", detail: "關卡編輯器、任務編輯、數據匯入、自動化測試" },
      { name: "Optimization", detail: "LOD、Occlusion Culling、記憶體、Draw Call" },
    ],
  },
  {
    title: "Audio",
    sub: "聽覺體驗設計",
    color: "#40B080",
    time: "3-6 週",
    pct: 8,
    parallel: ["Art Production", "Programming"],
    tasks: [
      { name: "Sound Design", detail: "Foley、環境音、UI、武器與技能音效" },
      { name: "Music", detail: "互動配樂 (Wwise/FMOD)、動態層疊系統" },
      { name: "Voice Over", detail: "配音錄製、對白系統、Lip Sync 嘴型同步" },
    ],
  },
  {
    title: "QA / Testing",
    sub: "品質保證",
    color: "#C45050",
    time: "2-8 週",
    pct: 10,
    parallel: [],
    tasks: [
      { name: "Functional Testing", detail: "全功能系統性測試、邊界與回歸測試" },
      { name: "Performance", detail: "各平台幀率、記憶體、載入與壓力測試" },
      { name: "Playtest", detail: "內外部測試收集回饋，調整平衡與節奏" },
      { name: "Certification", detail: "Sony TRC / MS XR / Nintendo Lotcheck" },
    ],
  },
  {
    title: "Launch & Live",
    sub: "發行與持續營運",
    color: "#4AA8C4",
    time: "持續",
    pct: 7,
    parallel: [],
    tasks: [
      { name: "CI/CD & Build", detail: "自動建置、分支策略、熱更新機制" },
      { name: "Publishing", detail: "Store Page、宣傳素材、媒體與社群" },
      { name: "LiveOps", detail: "活動、賽季內容、DAU/MAU/LTV 數據分析" },
      { name: "DLC & Updates", detail: "持續內容更新、社群經營、Bug 修復" },
    ],
  },
];

const INDIE = [
  {
    title: "現實評估",
    sub: "先認清你有什麼、缺什麼",
    color: "#C45C5C",
    time: "1-2 天",
    pct: 5,
    alert: true,
    parallel: [],
    tasks: [
      { name: "預算盤點", detail: "列出所有可用資金。沒錢就別碰 MoCap、Render Farm、外包模型。很多獨立團隊死在「高估預算、低估時間」" },
      { name: "人力現實", detail: "一個人 ≠ 一個部門。你不可能同時做好建模、動畫、特效、合成。選 1-2 個核心環節做到位，其餘用替代方案" },
      { name: "時間框架", detail: "倒推交付日。如果只有 2-4 週，整條 Pipeline 砍到只剩：素材準備 → 3D 製作 → 合成輸出，三步走" },
      { name: "技術能力誠實面對", detail: "不會 Houdini 就別硬做流體。用 Stock footage + 合成替代，觀眾看不出差別" },
    ],
  },
  {
    title: "精簡前期",
    sub: "快速決策，別在企劃階段空轉",
    color: "#D4A853",
    time: "2-3 天",
    pct: 5,
    parallel: [],
    tasks: [
      { name: "跳過 Concept Art", detail: "直接用參考圖 (Pinterest / ArtStation) 建立 Mood Board，省下概念設計的時間與費用" },
      { name: "簡易 Storyboard", detail: "手繪草圖或用 FrameForge / 手機拍攝 Animatic，不需要精美分鏡" },
      { name: "Pre-Vis → Blocked Layout", detail: "在 Blender 裡用基本幾何體快速排鏡頭，10 分鐘搞定一個鏡頭的構圖驗證" },
      { name: "直接定工具鏈", detail: "別花時間比較。小團隊建議：Blender + DaVinci Resolve + After Effects/Fusion，全免費或低成本" },
    ],
  },
  {
    title: "拍攝精簡",
    sub: "能實拍就實拍，減少 CG 量",
    color: "#9B7ED8",
    time: "1-3 天",
    pct: 15,
    parallel: [],
    tasks: [
      { name: "自然光 + 反光板", detail: "沒有燈光組？用自然光拍攝，窗戶光 + 白色反光板就能出很好的效果" },
      { name: "手機拍 HDRI", detail: "用 RICOH THETA 或手機全景拍攝現場環境光，免費取得光照參考" },
      { name: "綠幕替代方案", detail: "買不起大綠幕？用綠色不織布 + 攝影架。或直接實景拍攝，後期 Roto 去背" },
      { name: "不要碰 MoCap", detail: "資金不夠就用 Keyframe 動畫或免費 Mixamo 動作庫。Move.ai / Rokoko 手機方案也是低成本選項" },
    ],
  },
  {
    title: "3D 製作",
    sub: "資源有限時，最值得投入的環節",
    color: "#4DB89A",
    time: "1-4 週",
    pct: 40,
    core: true,
    parallel: [],
    tasks: [
      { name: "善用免費資產", detail: "Sketchfab、Turbosquid Free、Quixel Megascans 大量可商用素材，不要從零建模", res: "https://sketchfab.com" },
      { name: "Kitbash 拼接", detail: "用現成模型庫拼組場景。電影業也這樣做。KitBash3D、Polyhaven 都有免費包", res: "https://polyhaven.com" },
      { name: "材質走 PBR 標準", detail: "用 Substance Painter 或免費的 Quixel Mixer / ArmorPaint。Polyhaven 有大量免費 PBR 材質" },
      { name: "Rigging 用自動方案", detail: "Blender 的 Rigify、Mixamo Auto-Rig。不要手動從零綁骨架，浪費時間" },
      { name: "渲染用 GPU", detail: "沒有 Render Farm 就用 Blender Cycles GPU。一張 RTX 3060 就能跑。或用 SheepIt 免費分散式渲染", res: "https://www.sheepit-renderfarm.com" },
    ],
  },
  {
    title: "後期整合",
    sub: "合成決定最終品質，花最多時間在這",
    color: "#5B8FD4",
    time: "1-3 週",
    pct: 35,
    core: true,
    parallel: [],
    tasks: [
      { name: "合成比 3D 更重要", detail: "普通 3D + 好合成 = 電影感。精緻 3D + 爛合成 = 學生作品。合成是性價比最高的環節" },
      { name: "分層渲染必做", detail: "即使趕時間也要分 Diffuse / Specular / Shadow / AO。合成時調整空間大十倍" },
      { name: "光照匹配", detail: "CG 物件的光照方向、色溫、強度必須與實拍一致。這是穿幫的第一大原因" },
      { name: "Grain / Lens 效果", detail: "加上底片顆粒、鏡頭呼吸、色差、暗角。這些細節讓 CG 融入實拍，成本為零" },
      { name: "調色統一", detail: "DaVinci Resolve 免費版就夠用。全片統一調色比單鏡頭漂亮更重要" },
    ],
  },
  {
    title: "致命錯誤",
    sub: "很多人踩過的坑，提前避開",
    color: "#C45050",
    time: "—",
    pct: 0,
    alert: true,
    parallel: [],
    tasks: [
      { name: "一開始就追求電影級品質", detail: "先做完再做好。一個完成的 B+ 作品 >> 一個永遠做不完的 A+ 作品" },
      { name: "不做 Test Render", detail: "做了三週模型，渲染出來才發現材質全爆。每個階段都要做 Test Render 驗證" },
      { name: "忽略聲音設計", detail: "畫面做到 90 分，配上罐頭音效直接掉到 60 分。Freesound.org + 簡單 Foley 就差很多" },
      { name: "沒有版本控制", detail: "檔案命名 final_v2_真的最終版(3).blend 是災難。用日期 + 版號，或直接上 Git LFS" },
      { name: "一個人硬扛所有環節", detail: "與其每個環節都做 60 分，不如把 3D + 合成做到 85 分，其他用替代方案" },
    ],
  },
  {
    title: "免費工具",
    sub: "不花錢也能建立完整工作流",
    color: "#40B080",
    time: "—",
    pct: 0,
    parallel: [],
    tasks: [
      { name: "3D 全流程 → Blender", detail: "建模、雕刻、UV、材質、Rig、動畫、模擬、渲染，一套全包，完全免費", res: "https://www.blender.org" },
      { name: "合成 → DaVinci Resolve Fusion", detail: "節點式合成 + 調色 + 剪輯，免費版功能已經非常完整", res: "https://www.blackmagicdesign.com/products/davinciresolve" },
      { name: "材質 → Quixel Mixer / Polyhaven", detail: "PBR 材質製作與免費材質庫，品質媲美 Substance", res: "https://polyhaven.com" },
      { name: "動作 → Mixamo / Move.ai", detail: "免費自動 Rig + 動作庫，手機動捕方案低成本替代 MoCap", res: "https://www.mixamo.com" },
      { name: "音效 → Freesound + Audacity", detail: "免費音效素材庫 + 開源音訊編輯，夠用於獨立製作", res: "https://freesound.org" },
      { name: "專案管理 → Notion / Trello", detail: "免費看板追蹤進度。一個人也要做專案管理，否則一定爆排程" },
    ],
  },
];

function Dot({ color, active, checked }) {
  if (checked) {
    return (
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: color, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 8px ${color}44`,
      }}>
        <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
          <path d="M2 5.5L4 7.5L8 3" stroke="#0c0c10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: active ? color : "transparent",
      border: `2px solid ${active ? color : "#2a2a30"}`,
      transition: "all 0.3s", flexShrink: 0,
      boxShadow: active ? `0 0 8px ${color}44` : "none",
    }} />
  );
}

function VertLine({ color, active }) {
  return (
    <div style={{
      width: 2, height: 20, marginLeft: 4,
      background: active ? `${color}33` : "#18181c",
      transition: "background 0.3s",
    }} />
  );
}

function Badge({ text, color, outline }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 4,
      background: outline ? "transparent" : `${color}18`,
      border: outline ? `1px solid ${color}44` : "none",
      color, fontFamily: "'JetBrains Mono', monospace",
      marginLeft: 8, verticalAlign: "middle",
    }}>{text}</span>
  );
}

function TimeBar({ phases, selIdx }) {
  return (
    <div style={{
      background: "#111114", borderRadius: 10, padding: "14px 16px",
      marginBottom: 20, border: "1px solid #1a1a1f",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "#555",
        letterSpacing: "0.1em", textTransform: "uppercase",
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 10,
      }}>Time Distribution</div>
      <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden" }}>
        {phases.map((p, i) => p.pct > 0 ? (
          <div key={i} style={{
            flex: p.pct,
            background: p.color,
            opacity: i === selIdx ? 1 : 0.25,
            transition: "opacity 0.3s",
            borderRadius: 2,
            cursor: "pointer",
          }} title={`${p.title}: ${p.pct}%`} />
        ) : null)}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 8, fontSize: 10, color: "#555",
      }}>
        <span>{phases[selIdx]?.title}: <span style={{ color: phases[selIdx]?.color }}>{phases[selIdx]?.pct}%</span></span>
        <span style={{ color: "#666" }}>{phases[selIdx]?.time}</span>
      </div>
    </div>
  );
}

function ParallelHint({ parallel, color }) {
  if (!parallel || parallel.length === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 12px", borderRadius: 8,
      background: `${color}08`, border: `1px solid ${color}15`,
      marginBottom: 16, fontSize: 11, color: "#777",
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M3 4h4v8H3M9 4h4v8H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>可與 <span style={{ color, fontWeight: 600 }}>{parallel.join("、")}</span> 平行作業</span>
    </div>
  );
}

function ProgressRing({ total, done, color }) {
  const r = 18, c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1a1a1f" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: pct === 1 ? color : "#666",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{done}/{total}</div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("vfx");
  const [sel, setSel] = useState(0);
  const [expandedTask, setExpandedTask] = useState(null);
  const [checks, setChecks] = useState({});
  const [checkMode, setCheckMode] = useState(false);

  const dataMap = { vfx: VFX, game: GAME, indie: INDIE };
  const data = dataMap[tab];
  const safeSel = sel >= data.length ? 0 : sel;
  const phase = data[safeSel];

  useEffect(() => { setSel(0); setExpandedTask(null); }, [tab]);
  useEffect(() => { setExpandedTask(null); }, [sel]);

  const checkKey = useCallback((phaseIdx, taskIdx) => `${tab}_${phaseIdx}_${taskIdx}`, [tab]);

  const toggleCheck = useCallback((phaseIdx, taskIdx) => {
    const k = checkKey(phaseIdx, taskIdx);
    setChecks(prev => ({ ...prev, [k]: !prev[k] }));
  }, [checkKey]);

  const phaseCheckedCount = useCallback((phaseIdx) => {
    const p = data[phaseIdx];
    return p.tasks.filter((_, ti) => checks[checkKey(phaseIdx, ti)]).length;
  }, [data, checks, checkKey]);

  const totalChecked = data.reduce((sum, _, pi) => sum + phaseCheckedCount(pi), 0);
  const totalTasks = data.reduce((sum, p) => sum + p.tasks.length, 0);

  const tabs = [
    { key: "vfx", label: "VFX Film" },
    { key: "game", label: "Game Dev" },
    { key: "indie", label: "Indie 精簡" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#0c0c10", color: "#d0d0d0",
      fontFamily: "'DM Sans', 'Noto Sans TC', -apple-system, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`*::-webkit-scrollbar{display:none}*{scrollbar-width:none}`}</style>

      <div style={{ padding: "28px 20px 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: "0.14em",
              color: "#444", textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace", marginBottom: 6,
            }}>HAO0321 Studio</div>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 700,
              color: "#eee", letterSpacing: "-0.02em",
            }}>Production Pipeline</h1>
          </div>
          {/* Checklist toggle */}
          <button onClick={() => setCheckMode(!checkMode)} style={{
            padding: "7px 12px", borderRadius: 8,
            border: checkMode ? `1.5px solid #4DB89A55` : "1.5px solid #222",
            background: checkMode ? "#4DB89A0d" : "#111114",
            color: checkMode ? "#4DB89A" : "#555",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.25s",
            display: "flex", alignItems: "center", gap: 6, marginTop: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              {checkMode && <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
            Checklist
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 2, marginTop: 20,
          background: "#131316", borderRadius: 10, padding: 3,
        }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: "10px 0", border: "none",
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.25s",
              fontFamily: "inherit",
              background: tab === t.key ? "#1c1c22" : "transparent",
              color: tab === t.key ? "#fff" : "#555",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 20px 48px" }}>
        {/* Overall progress when checklist on */}
        {checkMode && (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 16px", borderRadius: 10,
            background: "#111114", border: "1px solid #1a1a1f",
            marginBottom: 16,
          }}>
            <ProgressRing total={totalTasks} done={totalChecked} color={phase.color} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>
                Overall Progress
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                {totalChecked} of {totalTasks} tasks completed
              </div>
            </div>
            {totalChecked > 0 && (
              <button onClick={() => setChecks({})} style={{
                marginLeft: "auto", padding: "5px 10px", borderRadius: 6,
                border: "1px solid #C4505033", background: "#C450500a",
                color: "#C45050", fontSize: 10, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>Reset</button>
            )}
          </div>
        )}

        {/* Phase pills */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto",
          paddingBottom: 6, marginBottom: 16,
          WebkitOverflowScrolling: "touch",
        }}>
          {data.map((p, i) => {
            const done = phaseCheckedCount(i);
            const allDone = checkMode && done === p.tasks.length;
            return (
              <button key={i} onClick={() => setSel(i)} style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: 8,
                border: sel === i ? `1.5px solid ${p.color}55` : "1.5px solid #1a1a1f",
                background: sel === i ? `${p.color}0d` : allDone ? `${p.color}08` : "#111114",
                color: sel === i ? p.color : allDone ? `${p.color}88` : "#555",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.25s", fontFamily: "inherit", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 7,
                opacity: allDone && sel !== i ? 0.6 : 1,
              }}>
                <span style={{
                  display: "inline-block", width: 6, height: 6,
                  borderRadius: "50%", background: p.color,
                  opacity: sel === i ? 1 : 0.25,
                }} />
                {p.title}
                {checkMode && done > 0 && (
                  <span style={{
                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                    color: allDone ? p.color : "#555",
                  }}>{done}/{p.tasks.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
          {data.map((p, i) => (
            <div key={i} style={{
              flex: 1, height: 2, borderRadius: 1,
              background: i <= sel ? p.color : "#18181c",
              opacity: i === sel ? 1 : i < sel ? 0.3 : 0.1,
              transition: "all 0.4s",
            }} />
          ))}
        </div>

        {/* Time distribution */}
        {phase.pct > 0 && <TimeBar phases={data} selIdx={safeSel} />}

        {/* Phase header */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
              color: phase.color, opacity: 0.5,
            }}>{String(safeSel + 1).padStart(2, "0")}/{String(data.length).padStart(2, "0")}</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#eee" }}>
              {phase.title}
            </h2>
            {phase.core && <Badge text="Core" color="#4DB89A" />}
            {phase.alert && <Badge text="Alert" color="#C45050" />}
            {phase.time && phase.time !== "—" && (
              <Badge text={phase.time} color="#888" outline />
            )}
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#555" }}>{phase.sub}</p>
        </div>

        {/* Parallel hint */}
        <ParallelHint parallel={phase.parallel} color={phase.color} />

        {/* Tasks */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {phase.tasks.map((t, i) => {
            const isOpen = expandedTask === i;
            const isChecked = checks[checkKey(safeSel, i)];
            return (
              <div key={i} style={{ display: "flex", gap: 14 }}>
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", paddingTop: 15,
                }}>
                  <Dot color={phase.color} active={isOpen} checked={checkMode && isChecked} />
                  {i < phase.tasks.length - 1 && (
                    <VertLine color={phase.color} active={isOpen} />
                  )}
                </div>
                <div style={{ flex: 1, marginBottom: 2 }}>
                  <div
                    onClick={() => setExpandedTask(isOpen ? null : i)}
                    style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: isOpen ? "#14141a" : "transparent",
                      border: isOpen ? `1px solid ${phase.color}1a` : "1px solid transparent",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 8,
                    }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: isChecked && checkMode ? `${phase.color}99` : isOpen ? "#e8e8e8" : "#999",
                        transition: "color 0.2s",
                        textDecoration: isChecked && checkMode ? "line-through" : "none",
                        textDecorationColor: `${phase.color}44`,
                        flex: 1,
                      }}>{t.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {checkMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCheck(safeSel, i); }}
                            style={{
                              width: 22, height: 22, borderRadius: 5,
                              border: isChecked ? `1.5px solid ${phase.color}` : "1.5px solid #333",
                              background: isChecked ? `${phase.color}20` : "transparent",
                              cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s", flexShrink: 0,
                            }}
                          >
                            {isChecked && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5.5L4 7.5L8 3" stroke={phase.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        )}
                        <span style={{
                          fontSize: 14, color: "#444",
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                          lineHeight: 1, userSelect: "none",
                        }}>+</span>
                      </div>
                    </div>
                    <div style={{
                      maxHeight: isOpen ? 140 : 0,
                      opacity: isOpen ? 1 : 0,
                      overflow: "hidden", transition: "all 0.3s ease",
                    }}>
                      <p style={{
                        margin: "8px 0 4px", fontSize: 12,
                        color: "#777", lineHeight: 1.8,
                      }}>{t.detail}</p>
                      {t.res && (
                        <a href={t.res} target="_blank" rel="noopener noreferrer" style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, color: phase.color, opacity: 0.7,
                          textDecoration: "none", marginTop: 2,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M5 1H2.5A1.5 1.5 0 001 2.5v7A1.5 1.5 0 002.5 11h7A1.5 1.5 0 0011 9.5V7M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Learn More
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <button
            onClick={() => sel > 0 && setSel(sel - 1)}
            disabled={sel === 0}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              border: "1px solid #1c1c22", background: "#111114",
              color: sel === 0 ? "#2a2a30" : "#888",
              fontSize: 13, fontWeight: 600,
              cursor: sel === 0 ? "default" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s",
            }}>Prev</button>
          <button
            onClick={() => sel < data.length - 1 && setSel(sel + 1)}
            disabled={sel === data.length - 1}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10,
              border: `1px solid ${phase.color}30`,
              background: `${phase.color}0d`,
              color: sel === data.length - 1 ? "#2a2a30" : phase.color,
              fontSize: 13, fontWeight: 600,
              cursor: sel === data.length - 1 ? "default" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s",
            }}>Next</button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 40, paddingTop: 20,
          borderTop: "1px solid #18181c",
          fontSize: 10, color: "#333",
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: "center", letterSpacing: "0.06em",
        }}>
          HAO0321 Studio — Production Pipeline Reference
        </div>
      </div>
    </div>
  );
}
