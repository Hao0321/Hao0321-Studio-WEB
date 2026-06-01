// Cross-file a11y + SEO surgery. Idempotent.
// - Darken muted text token (#8C8CA0 -> #6B6B80) for WCAG AA contrast
// - Darken body-link + label text (accent-blue -> #2C5ED9) for AA
// - Append :focus-visible + prefers-reduced-motion (a11y)
// - Inject og:description where missing (mirror meta description)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = [
  ...fs.readdirSync(path.join(root, 'blog')).filter(f => f.endsWith('.html')).map(f => `blog/${f}`),
  'tools/index.html',
  'resources/index.html',
];

const A11Y_MARK = '/*a11y-seo-fix-v1*/';
const A11Y_BLOCK =
  A11Y_MARK +
  ':focus-visible{outline:2px solid #2C5ED9;outline-offset:2px;border-radius:4px}' +
  '.post-category,.related-cat,.cat,.hero-tag,.tool-tag,.tool-cta,.post-tag .accent{color:#2C5ED9}' +
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';

let changed = 0, ogAdded = 0;

for (const rel of targets) {
  const fp = path.join(root, rel);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;

  // 1. Darken muted text token
  html = html.replace(/--text-3:\s*#8C8CA0/g, '--text-3:#6B6B80');

  // 2. Darken body links (handle "a{color:var(--accent-blue)" and "a {color:var(--accent-blue)")
  html = html.replace(/a\s*\{\s*color:\s*var\(--accent-blue\)/g, 'a{color:#2C5ED9');

  // 3. Append a11y block before </style> (first style block only)
  if (!html.includes(A11Y_MARK)) {
    html = html.replace('</style>', A11Y_BLOCK + '</style>');
  }

  // 4. Inject og:description if missing
  if (!/property="og:description"/.test(html)) {
    const dm = html.match(/<meta name="description" content="([^"]*)"/);
    if (dm) {
      const desc = dm[1];
      // insert right after og:title meta
      html = html.replace(
        /(<meta property="og:title" content="[^"]*"\s*\/?>)/,
        `$1\n  <meta property="og:description" content="${desc}" />`
      );
      if (/property="og:description"/.test(html)) ogAdded++;
    }
  }

  if (html !== before) {
    fs.writeFileSync(fp, html);
    changed++;
  }
}

console.log(`✅ a11y+seo: ${changed} files modified, ${ogAdded} og:description injected`);
