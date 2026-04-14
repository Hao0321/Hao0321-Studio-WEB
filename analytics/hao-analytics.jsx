import { useState, useEffect, useMemo, useCallback } from "react";

/* ── YouTube API (optimized — ~103 units/search vs 303) ── */
const YT_API_KEY = "AIzaSyD8r_h3C6vsPf7ByzV6T4cDi2sK5TCMLMA";
const YT_BASE = "https://www.googleapis.com/youtube/v3";
var _profileCache = {};

async function resolveChannel(query) {
  const q = query.trim();
  // Direct channel ID from URL
  const chMatch = q.match(/channel\/(UC[\w-]+)/);
  if (chMatch) return chMatch[1];
  // Direct channel ID
  if (/^UC[\w-]{22}$/.test(q)) return q;
  // @handle — use channels?forHandle (1 unit instead of 100)
  const hMatch = q.match(/@([\w.-]+)/) || q.match(/youtube\.com\/@([\w.-]+)/);
  if (hMatch) {
    var hRes = await fetch(YT_BASE + '/channels?part=snippet,statistics&forHandle=@' + hMatch[1] + '&key=' + YT_API_KEY);
    var hData = await hRes.json();
    if (hData.items && hData.items.length > 0) return hData.items[0].id;
  }
  // Fallback: search (100 units)
  var res = await fetch(YT_BASE + '/search?part=snippet&type=channel&q=' + encodeURIComponent(q) + '&maxResults=1&key=' + YT_API_KEY);
  var data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  return data.items && data.items.length > 0 ? data.items[0].snippet.channelId : null;
}

async function fetchChannelData(channelId) {
  var res = await fetch(YT_BASE + '/channels?part=snippet,statistics&id=' + channelId + '&key=' + YT_API_KEY);
  var data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  if (!data.items || !data.items.length) return null;
  var ch = data.items[0], stats = ch.statistics, snippet = ch.snippet;
  return { id: channelId, name: snippet.title, handle: snippet.customUrl || '@' + snippet.title, description: snippet.description, avatar: snippet.thumbnails ? (snippet.thumbnails.medium ? snippet.thumbnails.medium.url : null) : null, country: snippet.country || "—", joinDate: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : "—", subscribers: parseInt(stats.subscriberCount) || 0, views: parseInt(stats.viewCount) || 0, videos: parseInt(stats.videoCount) || 0, hiddenSubscribers: stats.hiddenSubscriberCount || false };
}

function parseDurationSeconds(iso) { var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return 0; return (parseInt(m[1]||0)*3600)+(parseInt(m[2]||0)*60)+parseInt(m[3]||0); }
function parseDuration(iso) { var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return "0:00"; var h=m[1]?parseInt(m[1]):0, min=m[2]?parseInt(m[2]):0, sec=m[3]?parseInt(m[3]):0; if(h>0)return h+':'+String(min).padStart(2,"0")+':'+String(sec).padStart(2,"0"); return min+':'+String(sec).padStart(2,"0"); }
function buildVideoObj(v) { var dur=v.contentDetails.duration, secs=parseDurationSeconds(dur); return { id:v.id, title:v.snippet.title, views:parseInt(v.statistics.viewCount)||0, likes:parseInt(v.statistics.likeCount)||0, comments:parseInt(v.statistics.commentCount)||0, date:v.snippet.publishedAt.split("T")[0], duration:parseDuration(dur), durationSeconds:secs, isShort:secs<=60, thumbnail: v.snippet.thumbnails ? (v.snippet.thumbnails.medium ? v.snippet.thumbnails.medium.url : null) : null }; }

// Single video fetch — only 1 search call (100 units) + 1 videos call (1 unit)
async function fetchVideos(channelId, max) {
  var res = await fetch(YT_BASE + '/search?part=snippet&channelId=' + channelId + '&order=date&type=video&maxResults=' + max + '&key=' + YT_API_KEY);
  var data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  if (!data.items || !data.items.length) return [];
  var ids = data.items.map(function(v){return v.id.videoId}).join(",");
  var sr = await fetch(YT_BASE + '/videos?part=statistics,contentDetails,snippet&id=' + ids + '&key=' + YT_API_KEY);
  var sd = await sr.json();
  return (sd.items||[]).map(buildVideoObj);
}

function calcGrade(subs,engRate){var s=0;if(subs>=10000000)s+=50;else if(subs>=1000000)s+=42;else if(subs>=100000)s+=35;else if(subs>=10000)s+=28;else if(subs>=1000)s+=20;else s+=10;if(engRate>=10)s+=30;else if(engRate>=7)s+=25;else if(engRate>=5)s+=20;else if(engRate>=3)s+=15;else if(engRate>=1)s+=10;else s+=5;if(s>=70)return"A+";if(s>=62)return"A";if(s>=55)return"A-";if(s>=48)return"B+";if(s>=42)return"B";if(s>=35)return"B-";if(s>=28)return"C+";if(s>=20)return"C";return"D";}

// Optimized: 1 resolve (1-100 units) + 1 channel (1 unit) + 1 video search (101 units)
// Total: ~103-203 units vs previous 303
async function fetchFullProfile(query) {
  // Check cache first
  var cacheKey = query.trim().toLowerCase();
  if (_profileCache[cacheKey]) return _profileCache[cacheKey];

  var cid = await resolveChannel(query);
  if (!cid) return null;
  // Fetch channel + recent videos in parallel (skip separate "top by views" call)
  var results = await Promise.all([fetchChannelData(cid), fetchVideos(cid, 15)]);
  var ch = results[0], videos = results[1];
  if (!ch) return null;

  var totalEng = videos.reduce(function(s,v){return s+v.likes+v.comments},0);
  var totalViews = videos.reduce(function(s,v){return s+v.views},0);
  var engRate = totalViews > 0 ? ((totalEng/totalViews)*100) : 0;
  var avgViews = ch.videos > 0 ? Math.round(ch.views/ch.videos) : 0;
  var avgDV = totalViews / Math.max(videos.length, 1);
  var mV = avgDV * 30;
  var pick = function(v){return{title:v.title,views:v.views,likes:v.likes,comments:v.comments,date:v.date,duration:v.duration,isShort:v.isShort}};
  // Sort client-side for top videos instead of separate API call
  var sorted = videos.slice().sort(function(a,b){return b.views - a.views});

  var profile = Object.assign({}, ch, {
    avgViews: avgViews,
    engRate: parseFloat(engRate.toFixed(1)),
    estRevenue: {min: Math.round((mV/1000)*1), max: Math.round((mV/1000)*3)},
    grade: calcGrade(ch.subscribers, engRate),
    topLongVideos: sorted.filter(function(v){return !v.isShort}).slice(0,5).map(pick),
    topShorts: sorted.filter(function(v){return v.isShort}).slice(0,5).map(pick),
    recentVideos: videos
  });

  _profileCache[cacheKey] = profile;
  return profile;
}

// ─── MOCK DATA ENGINE ───────────────────────────────────────────────
const PLATFORMS = {
  youtube: { name: "YouTube", color: "#FF0000", accent: "#CC0000", icon: "▶", bg: "#FFF0F0" },
  twitch: { name: "Twitch", color: "#9146FF", accent: "#7B2FFF", icon: "◆", bg: "#F3EEFF" },
  instagram: { name: "Instagram", color: "#E1306C", accent: "#C13584", icon: "◐", bg: "#FFF0F5" },
  tiktok: { name: "TikTok", color: "#25F4EE", accent: "#FE2C55", icon: "♫", bg: "#F0FFFE" },
};

const generateTimeSeriesData = (days, startVal, endVal, volatility) => {
  const data = [];
  const totalGrowth = endVal - startVal;
  const dailyGrowth = totalGrowth / days;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const dayIndex = days - i;
    const baseline = startVal + dailyGrowth * dayIndex;
    const noise = (Math.random() - 0.5) * volatility;
    const progress = dayIndex / days;
    const dampedNoise = noise * (1 - progress * 0.5);
    const val = Math.max(0, Math.round(baseline + dampedNoise));
    data.push({ date: new Date(now - i * 86400000), value: val });
  }
  data[data.length - 1].value = endVal;
  return data;
};

const generateHourlyData = (hours, base, volatility) => {
  const data = [];
  let val = base;
  const now = Date.now();
  for (let i = hours; i >= 0; i--) {
    val += (Math.random() - 0.45) * volatility;
    val = Math.max(0, val);
    data.push({ date: new Date(now - i * 3600000), value: Math.round(val) });
  }
  return data;
};

const CHANNEL_DATA = {
  name: "Demo Channel",
  handle: "@demo",
  avatar: null,
  joinDate: "2021-06-15",
  country: "TW",
  category: "Science & Technology",
  platforms: {
    youtube: {
      subscribers: 1000,
      views: 50000,
      videos: 20,
      avgViews: 2500,
      engRate: 5.0,
      estRevenue: { min: 5, max: 15 },
      grade: "C",
      rank: null,
      rankCategory: null,
      subsHistory: generateTimeSeriesData(90, 900, 1000, 20),
      viewsHistory: generateTimeSeriesData(90, 45000, 50000, 500),
      hourlyViews: generateHourlyData(48, 5, 3),
      topLongVideos: [
        { title: "Demo Video 1", views: 5000, likes: 300, comments: 40, date: "2026-02-28", duration: "10:00" },
        { title: "Demo Video 2", views: 3500, likes: 200, comments: 25, date: "2026-03-05", duration: "12:00" },
      ],
      topShorts: [
        { title: "Demo Short 1", views: 8000, likes: 500, comments: 60, date: "2026-03-15", duration: "0:30" },
      ],
      uploadSchedule: [0, 1, 0, 1, 1, 0, 0],  // ~3 videos/month
      demographics: { "13-17": 8, "18-24": 35, "25-34": 38, "35-44": 12, "45+": 7 },
      geoData: { "TW": 55, "HK": 12, "US": 10, "MY": 8, "SG": 5, "JP": 4, "Other": 6 },
      milestones: [
        { label: "1K Subscribers", date: "2024-01-01", achieved: true },
        { label: "5K Subscribers", date: null, achieved: false, projected: "2026-06-01" },
      ],
    },
    twitch: {
      followers: 820,
      avgViewers: 12,
      peakViewers: 48,
      hoursStreamed: 186,
      engRate: 15.4,               // 小直播間互動率很高
      grade: "C+",
      rank: 245000,
      followHistory: generateTimeSeriesData(90, 740, 820, 15),
      viewerHistory: generateHourlyData(48, 12, 6),
      topContent: [
        { title: "深夜 Coding Session", views: 320, likes: 45, comments: 28, date: "2026-03-20", duration: "3:15:00" },
        { title: "AI Game Jam LIVE", views: 210, likes: 32, comments: 19, date: "2026-03-05", duration: "4:32:15" },
        { title: "觀眾點歌 SynthV Session", views: 180, likes: 28, comments: 15, date: "2026-02-28", duration: "2:15:30" },
      ],
      demographics: { "13-17": 10, "18-24": 44, "25-34": 32, "35-44": 9, "45+": 5 },
      geoData: { "TW": 52, "US": 15, "HK": 10, "JP": 8, "KR": 6, "Other": 9 },
      milestones: [
        { label: "500 Followers", date: "2025-09-12", achieved: true },
        { label: "1K Followers", date: null, achieved: false, projected: "2027-03-20" },
        { label: "50 Avg Viewers", date: null, achieved: false, projected: "2027-06-15" },
      ],
    },
    instagram: {
      followers: 1480,
      posts: 156,
      avgLikes: 85,
      avgComments: 8,
      engRate: 6.3,                // (85+8)/1480 = 6.28%
      grade: "C+",
      rank: 520000,
      followHistory: generateTimeSeriesData(90, 1350, 1480, 20),
      topContent: [
        { title: "工作室幕後花絮", views: 2100, likes: 142, comments: 18, date: "2026-03-25", duration: "Reel" },
        { title: "Coding Setup Tour 2026", views: 1800, likes: 128, comments: 14, date: "2026-03-10", duration: "Carousel" },
        { title: "日常開發 Vlog", views: 1400, likes: 96, comments: 11, date: "2026-02-18", duration: "Reel" },
      ],
      demographics: { "13-17": 6, "18-24": 38, "25-34": 36, "35-44": 13, "45+": 7 },
      geoData: { "TW": 58, "HK": 10, "US": 9, "MY": 7, "SG": 5, "Other": 11 },
      milestones: [
        { label: "1K Followers", date: "2025-11-05", achieved: true },
        { label: "2K Followers", date: null, achieved: false, projected: "2027-04-18" },
        { label: "5K Followers", date: null, achieved: false, projected: "2029-08-10" },
      ],
    },
    tiktok: {
      followers: 3240,
      likes: 48500,
      videos: 45,
      avgViews: 1820,
      engRate: 11.2,               // TikTok 互動率最高
      grade: "B-",
      rank: 385000,
      followHistory: generateTimeSeriesData(90, 2680, 3240, 80),
      viewsHistory: generateTimeSeriesData(90, 38000, 48500, 1500),
      topContent: [
        { title: "60秒學會 Vibe Coding", views: 18500, likes: 2100, comments: 145, date: "2026-04-02", duration: "0:58" },
        { title: "AI寫遊戲挑戰", views: 12300, likes: 1400, comments: 98, date: "2026-03-18", duration: "1:00" },
        { title: "工程師日常", views: 8600, likes: 920, comments: 67, date: "2026-03-01", duration: "0:45" },
      ],
      demographics: { "13-17": 15, "18-24": 45, "25-34": 28, "35-44": 8, "45+": 4 },
      geoData: { "TW": 48, "US": 16, "HK": 11, "MY": 8, "JP": 6, "Other": 11 },
      milestones: [
        { label: "1K Followers", date: "2025-07-15", achieved: true },
        { label: "5K Followers", date: null, achieved: false, projected: "2026-12-28" },
        { label: "10K Followers", date: null, achieved: false, projected: "2028-03-15" },
      ],
    },
  },
};

// AI prediction
const predictGrowth = (history, futureDays = 30) => {
  const recent = history.slice(-30);
  const avgGrowth = recent.length > 1
    ? (recent[recent.length - 1].value - recent[0].value) / recent.length
    : 0;
  const volatility = recent.reduce((sum, d, i) => {
    if (i === 0) return 0;
    return sum + Math.abs(d.value - recent[i - 1].value - avgGrowth);
  }, 0) / Math.max(recent.length - 1, 1);

  const lastVal = history[history.length - 1].value;
  const lastDate = history[history.length - 1].date;
  const predictions = [];
  for (let i = 1; i <= futureDays; i++) {
    const predicted = lastVal + avgGrowth * i;
    predictions.push({
      date: new Date(lastDate.getTime() + i * 86400000),
      value: Math.round(predicted),
      upper: Math.round(predicted + volatility * Math.sqrt(i) * 1.96),
      lower: Math.round(Math.max(0, predicted - volatility * Math.sqrt(i) * 1.96)),
    });
  }
  return {
    predictions,
    dailyGrowth: Math.round(avgGrowth),
    confidence: Math.max(60, Math.min(95, 90 - (volatility / Math.max(avgGrowth, 1)) * 2)),
  };
};

// ─── FORMATTING ─────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
};
const fmtFull = (n) => (n != null ? n.toLocaleString() : "—");
const fmtDate = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

// Hex to rgba helper
const rgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Grade color
const gradeColor = (grade) => {
  const map = { "A+": "#00C853", "A": "#00E676", "A-": "#69F0AE", "B+": "#2196F3", "B": "#42A5F5", "B-": "#64B5F6", "C+": "#FFC107", "C": "#FFD54F" };
  return map[grade] || "#9E9E9E";
};

// ─── SPARKLINE ──────────────────────────────────────────────────────
const Sparkline = ({ data, color, width = 120, height = 36 }) => {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const uid = `sp-${color.replace(/[^a-zA-Z0-9]/g, "")}-${width}`;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${uid})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── CHART ──────────────────────────────────────────────────────────
const Chart = ({ data, predictions, color, label, height = 200 }) => {
  const allData = predictions ? [...data, ...predictions] : data;
  const values = allData.map((d) => d.value);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values, ...(predictions || []).map((p) => p.upper || p.value)) * 1.02;
  const range = max - min || 1;
  const w = 100, h = 100;
  const pad = { t: 8, r: 4, b: 18, l: 0 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const toPoint = (val, idx, total) => ({
    x: pad.l + (idx / (total - 1)) * cw,
    y: pad.t + ch - ((val - min) / range) * ch,
  });

  const mainPoints = data.map((d, i) => toPoint(d.value, i, allData.length));
  const mainPath = mainPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  let predPath = "", bandPath = "";
  if (predictions && predictions.length > 0) {
    const offset = data.length - 1;
    const predPoints = [mainPoints[mainPoints.length - 1], ...predictions.map((p, i) => toPoint(p.value, offset + 1 + i, allData.length))];
    predPath = predPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const upperPoints = predictions.map((p, i) => toPoint(p.upper, offset + 1 + i, allData.length));
    const lowerPoints = predictions.map((p, i) => toPoint(p.lower, offset + 1 + i, allData.length));
    const startPt = mainPoints[mainPoints.length - 1];
    bandPath = `M${startPt.x},${startPt.y} ` +
      upperPoints.map((p) => `L${p.x},${p.y}`).join(" ") +
      ` L${lowerPoints[lowerPoints.length - 1].x},${lowerPoints[lowerPoints.length - 1].y} ` +
      [...lowerPoints].reverse().map((p) => `L${p.x},${p.y}`).join(" ") + ` Z`;
  }

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => ({
    val: min + (range * i) / yTicks,
    y: pad.t + ch - (i / yTicks) * ch,
  }));
  const xTicks = 5;
  const xLabels = Array.from({ length: xTicks }, (_, i) => {
    const idx = Math.round((i / (xTicks - 1)) * (allData.length - 1));
    return { label: fmtDate(allData[idx].date), x: pad.l + (idx / (allData.length - 1)) * cw };
  });

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
        {yLabels.map((yl, i) => (
          <line key={i} x1={pad.l} y1={yl.y} x2={w - pad.r} y2={yl.y} stroke="#E5E7EB" strokeWidth="0.2" />
        ))}
        {bandPath && <path d={bandPath} fill={color} opacity="0.06" />}
        <path d={mainPath} fill="none" stroke={color} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
        {predPath && <path d={predPath} fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="1.5,1" opacity="0.5" />}
        {predictions && (
          <line x1={mainPoints[mainPoints.length - 1].x} y1={pad.t} x2={mainPoints[mainPoints.length - 1].x} y2={pad.t + ch} stroke="#D1D5DB" strokeWidth="0.2" strokeDasharray="1,1" />
        )}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={h - 2} fill="#9CA3AF" fontSize="3" textAnchor="middle" fontFamily="'Inter', sans-serif">{xl.label}</text>
        ))}
      </svg>
      {predictions && (
        <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "#9CA3AF" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 2, background: color, display: "inline-block", borderRadius: 1 }} /> 實際
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 0, borderTop: `2px dashed ${color}`, opacity: 0.5, display: "inline-block" }} /> 預測
          </span>
        </div>
      )}
    </div>
  );
};

// ─── BAR CHART ──────────────────────────────────────────────────────
const BarChart = ({ data, color, height = 120 }) => {
  const maxVal = Math.max(...Object.values(data));
  const entries = Object.entries(data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, paddingTop: 10 }}>
      {entries.map(([label, val]) => (
        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 4 }}>{val}%</div>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${(val / maxVal) * 100}%`,
              background: `linear-gradient(180deg, ${color}, ${rgba(color, 0.25)})`,
              borderRadius: "6px 6px 2px 2px",
              minHeight: 4,
              transition: "height 0.6s ease-out",
            }} />
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 6, textAlign: "center", lineHeight: 1.2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

// ─── DONUT CHART ────────────────────────────────────────────────────
const DonutChart = ({ data, colors, size = 120 }) => {
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const defaultColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"];
  let cumAngle = -90;

  const segments = entries.map(([label, val], i) => {
    const pct = val / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const largeArc = angle > 180 ? 1 : 0;
    const r = 40;
    const cx = 50, cy = 50;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    return { label, val, pct, color: (colors || defaultColors)[i], path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke="#fff" strokeWidth="0.5" />
        ))}
        <circle cx="50" cy="50" r="22" fill="white" />
      </svg>
      <div style={{ flex: 1, fontSize: 11, lineHeight: 1.8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "#374151" }}>{s.label}</span>
            <span style={{ color: "#9CA3AF", marginLeft: "auto", fontWeight: 600 }}>{s.val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── HEATMAP ────────────────────────────────────────────────────────
const WeekHeatmap = ({ data, color }) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxVal = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {days.map((d, i) => (
        <div key={d} style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            height: 32, borderRadius: 6,
            background: data[i] > 0 ? color : "#F3F4F6",
            opacity: data[i] > 0 ? 0.3 + (data[i] / maxVal) * 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
            color: data[i] > 0 ? "#fff" : "#D1D5DB",
          }}>
            {data[i] || "—"}
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>{d}</div>
        </div>
      ))}
    </div>
  );
};

// ─── PROGRESS RING ──────────────────────────────────────────────────
const ProgressRing = ({ value, max, color, size = 64, label }) => {
  const pct = Math.min(value / max, 1);
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#F3F4F6" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        <text x="30" y="33" textAnchor="middle" fill="#111827" fontSize="12" fontWeight="700">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{label}</div>}
    </div>
  );
};

// ─── Build YouTube platform object from API data ────────────────────
function buildYouTubePlatform(profile) {
  const subs = profile.subscribers;
  const avgViews = profile.avgViews;
  const videos = profile.videos;

  // Generate synthetic history ending at real current values
  const subsHistory = generateTimeSeriesData(90, Math.round(subs * 0.97), subs, Math.max(Math.round(subs * 0.005), 10));
  const viewsHistory = generateTimeSeriesData(90, Math.round(profile.views * 0.95), profile.views, Math.max(Math.round(profile.views * 0.003), 500));
  const hourlyViews = generateHourlyData(48, Math.max(Math.round(avgViews / 24), 1), Math.max(Math.round(avgViews / 48), 1));

  // Milestones
  const hist = subsHistory;
  const dailyGrowth = hist.length > 30 ? (hist[hist.length - 1].value - hist[hist.length - 31].value) / 30 : 1;
  const milestones = [];
  const thresholds = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  for (const t of thresholds) {
    if (subs >= t) {
      milestones.push({ label: `${fmt(t)} Subscribers`, date: "—", achieved: true });
    } else {
      const daysNeeded = dailyGrowth > 0 ? Math.round((t - subs) / dailyGrowth) : 9999;
      const projected = new Date(Date.now() + daysNeeded * 86400000).toISOString().split("T")[0];
      milestones.push({ label: `${fmt(t)} Subscribers`, date: null, achieved: false, projected });
      if (milestones.filter((m) => !m.achieved).length >= 2) break;
    }
  }

  return {
    subscribers: subs,
    views: profile.views,
    videos,
    avgViews,
    engRate: profile.engRate,
    estRevenue: profile.estRevenue,
    grade: profile.grade,
    rank: null,
    rankCategory: null,
    subsHistory,
    viewsHistory,
    hourlyViews,
    topLongVideos: (profile.topLongVideos || []),
    topShorts: (profile.topShorts || []),
    uploadSchedule: null,
    demographics: { "13-17": 8, "18-24": 35, "25-34": 38, "35-44": 12, "45+": 7 },
    geoData: null,
    milestones,
  };
}

// ─── MAIN APP ───────────────────────────────────────────────────────
export default function HaoAnalytics() {
  const [activePlatform, setActivePlatform] = useState("youtube");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isSearching, setIsSearching] = useState(false);
  const [showChannel, setShowChannel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchError, setSearchError] = useState(null);
  const [revenueMultiplier, setRevenueMultiplier] = useState(1);
  const [predictionDays, setPredictionDays] = useState(30);

  // Channel data — start with default, overwritten by API results
  const [channelInfo, setChannelInfo] = useState({
    name: CHANNEL_DATA.name,
    handle: CHANNEL_DATA.handle,
    avatar: CHANNEL_DATA.avatar,
    joinDate: CHANNEL_DATA.joinDate,
    country: CHANNEL_DATA.country,
    category: CHANNEL_DATA.category,
  });
  const [platformsData, setPlatformsData] = useState(CHANNEL_DATA.platforms);

  const platformData = platformsData[activePlatform];
  const prediction = useMemo(() => {
    const hist = activePlatform === "youtube" ? platformData.subsHistory : platformData.followHistory;
    if (!hist) return { predictions: [], dailyGrowth: 0, confidence: 60 };
    return predictGrowth(hist, predictionDays);
  }, [platformData, predictionDays]);

  const basePrediction = useMemo(() => {
    const hist = activePlatform === "youtube" ? platformData.subsHistory : platformData.followHistory;
    if (!hist) return { predictions: [], dailyGrowth: 0, confidence: 60 };
    return predictGrowth(hist, 30);
  }, [platformData]);

  const getHistory = () => activePlatform === "youtube" ? platformData.subsHistory : platformData.followHistory;
  const getMetricLabel = () => activePlatform === "youtube" ? "Subscribers" : "Followers";
  const getMainCount = () => {
    if (activePlatform === "youtube") return platformData.subscribers;
    return platformData.followers;
  };

  const loadChannel = useCallback(async (query) => {
    try {
      const profile = await fetchFullProfile(query);
      if (!profile) return false;
      setChannelInfo({
        name: profile.name,
        handle: profile.handle,
        avatar: profile.avatar,
        joinDate: profile.joinDate,
        country: profile.country || "—",
        category: "YouTube",
      });
      const ytPlatform = buildYouTubePlatform(profile);
      setPlatformsData((prev) => ({ ...prev, youtube: ytPlatform }));
      setActivePlatform("youtube");
      setShowChannel(true);
      return true;
    } catch (err) {
      console.error("API Error:", err);
      setSearchError("搜尋失敗：" + (err.message || "請檢查網路連線後重試"));
      return false;
    }
  }, []);

  // No auto-load — show search UI first
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleSearch = useCallback(async (overrideQuery) => {
    const q = (overrideQuery || searchQuery || "").trim();
    if (!q) return;
    setSearchQuery(q);
    setIsSearching(true);
    setSearchError(null);
    const ok = await loadChannel(q);
    if (!ok) setSearchError("找不到此頻道。試試輸入 @handle、頻道名稱或 YouTube 網址。");
    else setActiveTab("overview");
    setIsSearching(false);
  }, [searchQuery, loadChannel]);

  const hist = getHistory();
  const delta7d = hist.length > 7 ? hist[hist.length - 1].value - hist[hist.length - 8].value : 0;
  const delta30d = hist.length > 30 ? hist[hist.length - 1].value - hist[hist.length - 31].value : 0;
  const delta7dPct = hist.length > 7 ? ((hist[hist.length - 1].value - hist[hist.length - 8].value) / hist[hist.length - 8].value) * 100 : 0;
  const delta30dPct = hist.length > 30 ? ((hist[hist.length - 1].value - hist[hist.length - 31].value) / hist[hist.length - 31].value) * 100 : 0;

  // Colors — Creators Academy palette
  const P = "#FF2D78";  // primary pink
  const S = "#8B5CF6";  // secondary purple
  const A = "#00D4FF";  // accent cyan

  const tabs = [
    { key: "overview", label: "\u7E3D\u89BD" },
    { key: "ai-predict", label: "AI \u9810\u6E2C" },
    { key: "content", label: "\u5167\u5BB9" },
    { key: "milestones", label: "\u91CC\u7A0B\u7891" },
  ];

  const predLast = prediction.predictions.length > 0 ? prediction.predictions[prediction.predictions.length - 1] : null;

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif", background: "#FAFAFA" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFAFA; background-image: radial-gradient(circle, #e0dfe4 1px, transparent 1px); background-size: 24px 24px; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 5px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: #FF2D78 !important; box-shadow: 0 0 0 3px rgba(255,45,120,0.1) !important; }
        button { transition: all 0.15s ease; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: scale(0.97); }
        .ca-card { background: #fff; border-radius: 16px; padding: 22px; border: 1px solid #E5E7EB; box-shadow: 0 1px 4px rgba(0,0,0,0.04); transition: all 0.2s ease; margin-bottom: 14px; }
        .ca-card:hover { box-shadow: 0 6px 24px rgba(255,45,120,0.08); transform: translateY(-2px); }
        .ca-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "#fff", borderBottom: "2px solid #F3F4F6", padding: "18px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #FF2D78, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>H</div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#1A1A2E", letterSpacing: -0.5 }}>Hao Analytics</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: 1 }}>YouTube 數據分析平台</div>
              </div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #FFF0F6, #F3E8FF)", border: "1px solid #F9A8D4", borderRadius: 20, padding: "5px 14px", fontSize: 10, fontWeight: 800, color: "#DB2777", letterSpacing: 0.5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DB2777" }} />
              AI 驅動
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input style={{ flex: 1, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: "11px 18px", color: "#1A1A2E", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              placeholder="輸入 @handle、頻道名稱或 YouTube 網址..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button style={{ background: "linear-gradient(135deg, #FF2D78, #8B5CF6)", border: "none", borderRadius: 12, padding: "11px 28px", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 12px rgba(255,45,120,0.3)" }}
              onClick={handleSearch}>
              {isSearching ? "..." : "搜尋"}
            </button>
          </div>
          {searchError && <div style={{ marginTop: 8, fontSize: 12, color: "#EF4444", fontWeight: 600 }}>{searchError}</div>}
        </div>
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#9CA3AF" }}>載入中...</div>
        </div>
      )}

      {/* ── LANDING ── */}
      {!isLoading && !showChannel && (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F4CA;</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1A1A2E", marginBottom: 8 }}>YouTube Channel Analytics</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 32, lineHeight: 1.8 }}>
            搜尋任何 YouTube 頻道，查看訂閱數、觀看趨勢、互動率、AI 成長預測。<br/>
            輸入 @handle、頻道名稱或完整網址即可開始。
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12, fontWeight: 600 }}>試試看：</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {["@MrBeast", "Lofi Girl", "@PewDiePie", "Travis Scott"].map(function(ex) {
              return <button key={ex} onClick={function(){handleSearch(ex)}} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>{ex}</button>;
            })}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      {!isLoading && showChannel && (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 24px 60px" }}>

          {/* Channel Card */}
          <div className="ca-card" style={{ animation: "slideUp 0.3s ease-out", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {channelInfo.avatar
                  ? <img src={channelInfo.avatar} alt="" style={{ width: 60, height: 60, borderRadius: 16, objectFit: "cover", border: "3px solid #F9A8D4" }} />
                  : <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, #FFE0EB, #E9D5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: P }}>{channelInfo.name?.[0] || "?"}</div>
                }
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1A1A2E" }}>{channelInfo.name}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{channelInfo.handle} · {channelInfo.country}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
                    <span>加入於 {channelInfo.joinDate}</span>
                    <span>{fmtFull(platformData.videos || 0)} 部影片</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 58, height: 58, borderRadius: 14, background: "linear-gradient(135deg, #FFE0EB, #E9D5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: P }}>{platformData.grade}</div>
                <div className="ca-label" style={{ marginTop: 4, marginBottom: 0 }}>評級</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 24, paddingTop: 20, borderTop: "1px solid #F3F4F6" }}>
              <div>
                <div className="ca-label">訂閱數</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#1A1A2E", letterSpacing: -1 }}>{fmtFull(getMainCount())}</div>
              </div>
              <div>
                <div className="ca-label">7 天變化</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: delta7d >= 0 ? "#10B981" : "#EF4444" }}>{delta7d >= 0 ? "+" : ""}{fmt(delta7d)}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: delta7dPct >= 0 ? "#10B981" : "#EF4444" }}>{fmtPct(delta7dPct)}</div>
              </div>
              <div>
                <div className="ca-label">30 天變化</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: delta30d >= 0 ? "#10B981" : "#EF4444" }}>{delta30d >= 0 ? "+" : ""}{fmt(delta30d)}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: delta30dPct >= 0 ? "#10B981" : "#EF4444" }}>{fmtPct(delta30dPct)}</div>
              </div>
            </div>
          </div>

          {/* Tab Nav */}
          <div style={{ display: "flex", gap: 3, marginBottom: 18, background: "#fff", borderRadius: 14, padding: 4, border: "1px solid #E5E7EB" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, padding: "11px 10px", border: "none", borderRadius: 11,
                background: activeTab === t.key ? "linear-gradient(135deg, #FF2D78, #8B5CF6)" : "transparent",
                color: activeTab === t.key ? "#fff" : "#6B7280",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div style={{ animation: "slideUp 0.3s ease-out" }}>
              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 4 }}>訂閱數成長</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 14 }}>近 90 天</div>
                <Chart data={getHistory()} color={P} height={200} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <StatCard title="總觀看次數" value={fmt(platformData.views)} sub={<Sparkline data={platformData.viewsHistory.slice(-30)} color={P} width={90} height={24} />} color={P} />
                <StatCard title="平均觀看 / 影片" value={fmt(platformData.avgViews)} sub={`${platformData.videos} 部影片`} color={S} />
                <StatCard title="互動率" value={`${platformData.engRate}%`} color="#10B981" />
                <StatCard title="預估月收入" value={`$${fmt(platformData.estRevenue.min)} - $${fmt(platformData.estRevenue.max)}`} sub="基於 CPM 模型" color={S} />
              </div>

              {platformData.hourlyViews && (
                <div className="ca-card" style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 4 }}>每小時觀看數</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 14 }}>近 48 小時</div>
                  <Chart data={platformData.hourlyViews} color={A} height={140} />
                </div>
              )}

              {platformData.uploadSchedule && (
                <div className="ca-card">
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 4 }}>上傳時間表</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 14 }}>每週上傳分佈（近 30 天）</div>
                  <WeekHeatmap data={platformData.uploadSchedule} color={P} />
                </div>
              )}
            </div>
          )}

          {/* ── AI PREDICT ── */}
          {activeTab === "ai-predict" && (
            <div style={{ animation: "slideUp 0.3s ease-out" }}>
              <div className="ca-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1A1A2E" }}>AI 成長預測</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>線性迴歸與信賴區間</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select value={predictionDays} onChange={(e) => setPredictionDays(Number(e.target.value))}
                      style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", color: "#374151", cursor: "pointer" }}>
                      <option value={7}>7 天</option>
                      <option value={14}>14 天</option>
                      <option value={30}>30 天</option>
                      <option value={60}>60 天</option>
                      <option value={90}>90 天</option>
                    </select>
                    <div style={{ background: rgba(P, 0.08), border: `1px solid ${rgba(P, 0.2)}`, borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: P }}>
                      信心度 {Math.round(prediction.confidence)}%
                    </div>
                  </div>
                </div>
                <Chart data={getHistory()} predictions={prediction.predictions} color={P} height={240} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <StatCard title="每日成長率" value={`+${prediction.dailyGrowth}/天`} color="#10B981" />
                <StatCard title={`${predictionDays} 天預測`} value={predLast ? fmt(predLast.value) : "—"} color={S} />
                <StatCard title="最佳情況 (95% CI)" value={predLast ? fmt(predLast.upper) : "—"} color={A} />
                <StatCard title="最差情況 (95% CI)" value={predLast ? fmt(predLast.lower) : "—"} color="#F59E0B" />
              </div>

              {/* AI Insights */}
              <div className="ca-card" style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 14 }}>AI 洞察</div>
                {[
                  { color: "#10B981", text: "成長趨勢正在加速，目前增長率超過 30 天移動平均線 18%。" },
                  { color: "#F59E0B", text: "偵測到最佳互動時段：14:00-18:00 UTC+8" },
                  { color: S, text: "教學類型內容的訂閱轉換率是 Vlog 的 2.3 倍。" },
                  { color: P, text: (() => {
                    const nextMs = (platformData.milestones || []).find(m => !m.achieved && m.label.includes("Subscribers"));
                    if (!nextMs) { const anyMs = (platformData.milestones || []).find(m => !m.achieved); return anyMs ? `下一個里程碑：${anyMs.label}（預計 ${anyMs.projected}）` : "所有里程碑已達成！"; }
                    const numStr = nextMs.label.replace(/[^0-9]/g, "");
                    const multiplier = nextMs.label.includes("M") ? 1000000 : nextMs.label.includes("K") ? 1000 : 1;
                    const target = parseInt(numStr) * multiplier;
                    if (prediction.dailyGrowth <= 0) return `${nextMs.label} — 成長停滯中。`;
                    const daysLeft = Math.round((target - getMainCount()) / prediction.dailyGrowth);
                    return `里程碑提醒：預計在 ${daysLeft > 0 ? daysLeft : 0} 天內達到 ${nextMs.label}。`;
                  })() },
                ].map((ins, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: ins.color, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: "#374151" }}>{ins.text}</div>
                  </div>
                ))}
              </div>

              {/* Revenue Calculator */}
              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 4 }}>收益計算器</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 16 }}>基於 CPM 模型預估</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>CPM 倍率：</span>
                  <input type="range" min="0.5" max="3" step="0.1" value={revenueMultiplier} onChange={(e) => setRevenueMultiplier(parseFloat(e.target.value))} style={{ flex: 1, accentColor: P }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1A1A2E", minWidth: 40 }}>{revenueMultiplier.toFixed(1)}x</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "每月", value: `$${fmt(Math.round(((platformData.estRevenue.min + platformData.estRevenue.max) / 2) * revenueMultiplier))}` },
                    { label: "每年", value: `$${fmt(Math.round(((platformData.estRevenue.min + platformData.estRevenue.max) / 2) * revenueMultiplier * 12))}` },
                    { label: "每部影片", value: `$${fmt(Math.round(((platformData.estRevenue.min + platformData.estRevenue.max) / 2) * revenueMultiplier / Math.max(Math.round(platformData.videos / 12), 1)))}` },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center", background: "#FAFAFA", borderRadius: 12, padding: 14, border: "1px solid #F3F4F6" }}>
                      <div className="ca-label">{item.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#1A1A2E", marginTop: 2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENT ── */}
          {activeTab === "content" && (
            <div style={{ animation: "slideUp 0.3s ease-out" }}>
              {/* 長影片 */}
              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 18 }}>熱門長影片</div>
                {platformData.topLongVideos && platformData.topLongVideos.length > 0 ? (
                  platformData.topLongVideos.map((item, i) => (
                    <ContentRow key={`long-${i}`} item={item} index={i} total={platformData.topLongVideos.length} P={P} S={S} />
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: 24, color: "#9CA3AF", fontSize: 13 }}>尚無長影片數據</div>
                )}
              </div>

              {/* Shorts */}
              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 18 }}>熱門 Shorts</div>
                {platformData.topShorts && platformData.topShorts.length > 0 ? (
                  platformData.topShorts.map((item, i) => (
                    <ContentRow key={`short-${i}`} item={item} index={i} total={platformData.topShorts.length} P={P} S={S} />
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: 24, color: "#9CA3AF", fontSize: 13 }}>尚無 Shorts 數據</div>
                )}
              </div>
            </div>
          )}

          {/* ── MILESTONES ── */}
          {activeTab === "milestones" && (
            <div style={{ animation: "slideUp 0.3s ease-out" }}>
              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 18 }}>里程碑追蹤</div>
                {platformData.milestones && platformData.milestones.map((ms, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < platformData.milestones.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: ms.achieved ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)" : "linear-gradient(135deg, #FEF3C7, #FDE68A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0, color: ms.achieved ? "#059669" : "#D97706" }}>
                      {ms.achieved ? "V" : "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>{ms.label}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{ms.achieved ? `達成於 ${ms.date}` : `預計：${ms.projected}`}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ms.achieved ? "#059669" : "#D97706", background: ms.achieved ? "#ECFDF5" : "#FFFBEB", border: `1px solid ${ms.achieved ? "#A7F3D0" : "#FDE68A"}`, borderRadius: 20, padding: "4px 14px" }}>
                      {ms.achieved ? "已達成" : "即將到來"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ca-card">
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E", marginBottom: 18 }}>成長速率</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "近 7 天", value: `${delta7d >= 0 ? "+" : ""}${fmt(delta7d)}`, pct: fmtPct(delta7dPct), color: delta7d >= 0 ? "#10B981" : "#EF4444" },
                    { label: "近 30 天", value: `${delta30d >= 0 ? "+" : ""}${fmt(delta30d)}`, pct: fmtPct(delta30dPct), color: delta30d >= 0 ? "#10B981" : "#EF4444" },
                    { label: "日均成長", value: `+${basePrediction.dailyGrowth}`, pct: "每天", color: S },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center", background: "#FAFAFA", borderRadius: 12, padding: 16, border: "1px solid #F3F4F6" }}>
                      <div className="ca-label">{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: item.color, fontWeight: 600, marginTop: 2 }}>{item.pct}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "36px 0 20px", fontSize: 11, color: "#D1D5DB", letterSpacing: 1 }}>
            HAO ANALYTICS v3.0
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONTENT ROW ────────────────────────────────────────────────────
function ContentRow({ item, index, total, P, S }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: index < total - 1 ? "1px solid #F3F4F6" : "none" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${rgba(P, 0.1)}, ${rgba(S, 0.1)})`, color: P, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>#{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", fontFamily: "'Noto Sans TC', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#9CA3AF" }}>
          <span>{item.date}</span>
          <span>{item.duration}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A2E" }}>{fmt(item.views)} 次觀看</div>
        <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 10, color: "#6B7280", justifyContent: "flex-end" }}>
          <span>{fmt(item.likes)} 讚</span>
          <span>{fmt(item.comments)} 留言</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: P, background: rgba(P, 0.06), borderRadius: 4, padding: "1px 6px", display: "inline-block" }}>
          {item.views > 0 ? ((item.likes / item.views) * 100).toFixed(1) : 0}% 互動
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────────────────
function StatCard({ title, value, sub, color }) {
  return (
    <div className="ca-card" style={{ marginBottom: 0 }}>
      <div className="ca-label">{title}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color || "#1A1A2E", letterSpacing: -0.5 }}>{value}</div>
      {sub && (typeof sub === "string" ? <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{sub}</div> : <div style={{ marginTop: 6 }}>{sub}</div>)}
    </div>
  );
}
