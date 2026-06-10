// Liquid Glass layer for shared-style pages. Idempotent (marker: liquid-glass-v2).
// Lifts flat white cards/article into frosted translucent glass matching the
// existing index.html .btn-glass / .hero-left recipe. Keeps colours + layout.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = [
  ...fs.readdirSync(path.join(root, 'blog')).filter(f => f.endsWith('.html')).map(f => `blog/${f}`),
  'tools/index.html',
  'resources/index.html',
  'about.html',
];

const MARK = '/*liquid-glass-v2*/';
const GLASS =
  MARK +
  // card surfaces (lists: blog index, tools, resources)
  '.post-card,.tool-card,.res-card,.cta-box{' +
    'background:rgba(255,255,255,0.55)!important;' +
    '-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);' +
    'border:1px solid rgba(255,255,255,0.55)!important;' +
    'box-shadow:0 6px 28px rgba(15,15,30,0.06),0 1px 3px rgba(15,15,30,0.04),inset 0 1px 0 rgba(255,255,255,0.7)!important;' +
  '}' +
  '.post-card:hover,.tool-card:hover,.res-card:hover{' +
    'background:rgba(255,255,255,0.72)!important;' +
    'border-color:rgba(255,255,255,0.85)!important;' +
    'box-shadow:0 18px 48px rgba(15,15,30,0.13),inset 0 1px 0 rgba(255,255,255,0.85)!important;' +
  '}' +
  // reading container on article pages — lighter blur for scroll perf
  'article{' +
    'background:rgba(255,255,255,0.68)!important;' +
    '-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);' +
    'border:1px solid rgba(255,255,255,0.55)!important;' +
    'box-shadow:0 8px 36px rgba(15,15,30,0.07),inset 0 1px 0 rgba(255,255,255,0.7)!important;' +
  '}' +
  // related-post chips
  '.related a{' +
    'background:rgba(255,255,255,0.5)!important;' +
    '-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);' +
    'border:1px solid rgba(255,255,255,0.5)!important;' +
  '}' +
  '.related a:hover{background:rgba(255,255,255,0.7)!important;border-color:rgba(255,255,255,0.8)!important}' +
  // frosted pills
  '.cat,.hero-tag,.tool-tag,.res-tier,.post-tag{' +
    '-webkit-backdrop-filter:saturate(150%) blur(8px);backdrop-filter:saturate(150%) blur(8px);' +
  '}' +
  // graceful fallback where backdrop-filter is unsupported
  '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){' +
    '.post-card,.tool-card,.res-card,.cta-box,article,.related a{background:var(--surface,#fff)!important}' +
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
console.log(`✨ liquid-glass injected into ${changed} files`);
