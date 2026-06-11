// Liquid Glass v3 — VISIBLE frosted glass on the light theme.
// The trick: enrich the page background with colour pools so the frost has
// something to refract, then strengthen lens borders / specular highlights /
// float shadows / diagonal sheen so cards read as real glass panes.
// Idempotent (marker: liquid-glass-v3). Appended last => wins over v2.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = [
  ...fs.readdirSync(path.join(root, 'blog')).filter(f => f.endsWith('.html')).map(f => `blog/${f}`),
  'tools/index.html',
  'resources/index.html',
  'about.html',
];

const MARK = '/*liquid-glass-v3*/';
const GLASS =
  MARK +
  // 1. richer colour pools behind everything → gives the frost something to blur
  'body{background-image:' +
    'radial-gradient(circle 520px at 14% 16%,rgba(74,123,245,0.22),transparent 60%),' +
    'radial-gradient(circle 640px at 86% 10%,rgba(142,124,240,0.20),transparent 60%),' +
    'radial-gradient(circle 580px at 80% 86%,rgba(110,170,255,0.18),transparent 60%),' +
    'radial-gradient(circle 480px at 18% 92%,rgba(168,140,255,0.16),transparent 60%)!important;' +
    'background-attachment:fixed!important;background-color:#EEF1F8!important}' +
  // 2. list / utility cards → strong glass pane
  '.post-card,.tool-card,.res-card,.cta-box,.related a{' +
    'background:linear-gradient(140deg,rgba(255,255,255,0.60),rgba(255,255,255,0.40))!important;' +
    '-webkit-backdrop-filter:blur(24px) saturate(200%);backdrop-filter:blur(24px) saturate(200%);' +
    'border:1px solid rgba(255,255,255,0.7)!important;' +
    'box-shadow:0 10px 36px rgba(15,15,30,0.10),0 2px 8px rgba(15,15,30,0.05),' +
      'inset 0 1px 1px rgba(255,255,255,0.95),inset 0 -1px 1px rgba(15,15,30,0.04)!important;' +
  '}' +
  '.post-card:hover,.tool-card:hover,.res-card:hover,.related a:hover{' +
    'background:linear-gradient(140deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))!important;' +
    'border-color:rgba(255,255,255,0.95)!important;' +
    'box-shadow:0 22px 60px rgba(15,15,30,0.18),inset 0 1px 1px rgba(255,255,255,1)!important;' +
  '}' +
  // 3. article reading container → glass but a touch more opaque for legibility
  'article{' +
    'background:linear-gradient(140deg,rgba(255,255,255,0.74),rgba(255,255,255,0.58))!important;' +
    '-webkit-backdrop-filter:blur(20px) saturate(185%);backdrop-filter:blur(20px) saturate(185%);' +
    'border:1px solid rgba(255,255,255,0.72)!important;' +
    'box-shadow:0 12px 44px rgba(15,15,30,0.10),inset 0 1px 1px rgba(255,255,255,0.95)!important;' +
  '}' +
  // 4. CTA box keeps its tint but gains the lens edge + sheen
  '.cta-box{' +
    'box-shadow:0 14px 48px rgba(74,123,245,0.20),inset 0 1px 1px rgba(255,255,255,0.9)!important;' +
    'border:1px solid rgba(255,255,255,0.7)!important;' +
  '}' +
  // graceful fallback
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    '.post-card,.tool-card,.res-card,.cta-box,article,.related a{background:rgba(255,255,255,0.95)!important}' +
  '}';

let changed = 0;
for (const rel of targets) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) continue;
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes(MARK)) continue;
  if (!html.includes('</style>')) continue;
  html = html.replace('</style>', GLASS + '</style>');
  fs.writeFileSync(fp, html);
  changed++;
}
console.log(`✨ liquid-glass v3 injected into ${changed} files`);
