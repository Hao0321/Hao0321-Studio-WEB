// Inject a WCAG 2.4.1 skip-link + <main id="main-content"> landmark target
// into every content page that lacks one. Idempotent (guarded by markers).
// The homepage index.html already has these and is excluded.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const blogPosts = readdirSync(ROOT + '/blog').filter(f => f.endsWith('.html')).map(f => 'blog/' + f);

const SKIP_ANCHOR = '<a href="#main-content" class="skip-link">跳到主要內容</a>';
const SKIP_CSS =
  '/*a11y-skiplink-v1*/.skip-link{position:absolute;left:12px;top:-60px;z-index:9999;' +
  'background:#0F0F1E;color:#fff;padding:10px 18px;border-radius:8px;font-weight:600;' +
  'transition:top .2s}.skip-link:focus{top:12px}' +
  '@media (prefers-reduced-motion:reduce){.skip-link{transition:none}}';

// Explicit target list (relative to repo root). Game pages, orphan drafts, and the
// React tool shells (analytics/pipeline) are handled separately.
const targets = [
  ...blogPosts,
  'about.html',
  'privacy.html',
  'terms.html',
  'tools/index.html',
  'resources/index.html',
];

let changed = 0, skipped = 0, noMain = 0;
for (const rel of targets) {
  const path = ROOT + '/' + rel;
  let html;
  try { html = readFileSync(path, 'utf8'); } catch { continue; }

  if (html.includes('class="skip-link"')) { skipped++; continue; }     // already done
  if (!/<main\b/i.test(html)) { noMain++; continue; }                  // no landmark to target

  const before = html;

  // 1) skip-link anchor as the first body child
  html = html.replace(/(<body[^>]*>)/i, `$1${SKIP_ANCHOR}`);

  // 2) give the first <main> the id (only if it has none)
  let mainDone = false;
  html = html.replace(/<main(?![^>]*\bid=)([^>]*)>/i, (m, attrs) => {
    if (mainDone) return m;
    mainDone = true;
    return `<main id="main-content"${attrs}>`;
  });

  // 3) skip-link CSS before the first </style>
  if (!html.includes('/*a11y-skiplink-v1*/')) {
    html = html.replace(/<\/style>/i, `${SKIP_CSS}</style>`);
  }

  if (html !== before) { writeFileSync(path, html); changed++; console.log('  ✓', rel); }
}
console.log(`\nskip-link: ${changed} changed, ${skipped} already had it, ${noMain} had no <main> (skipped)`);
