// Add the AdSense site-connection snippet to every main-site (hao0321.com) page.
// The game pages (game.hao0321.com) already have it. Idempotent.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const SNIPPET =
  '<!-- Google AdSense -->\n' +
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9106945071014808" crossorigin="anonymous"></script>\n';

const targets = [
  'index.html', 'about.html', 'privacy.html', 'terms.html', '404.html',
  'tools/index.html', 'resources/index.html', 'Freeworkshop/index.html',
  ...readdirSync(ROOT + '/blog').filter(f => f.endsWith('.html')).map(f => 'blog/' + f),
];

let changed = 0, skipped = 0, missing = 0;
for (const rel of targets) {
  const p = ROOT + '/' + rel;
  let html;
  try { html = readFileSync(p, 'utf8'); } catch { missing++; continue; }
  if (html.includes('adsbygoogle.js')) { skipped++; continue; }       // already has it
  if (!/<\/head>/i.test(html)) { missing++; continue; }
  writeFileSync(p, html.replace(/<\/head>/i, SNIPPET + '</head>'));
  changed++;
}
console.log(`AdSense snippet: ${changed} added, ${skipped} already had it, ${missing} skipped`);
