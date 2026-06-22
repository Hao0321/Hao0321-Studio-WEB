// WCAG AA fix: blog inline <code> used color:var(--accent-violet) (#8E7CF0 ~3.1:1)
// on a violet tint. Darken ONLY the inline-code text color to #6E5BD9 (>=4.5:1).
// --accent-violet itself is left untouched so gradients/markers keep the brand hue.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ANCHOR = 'color:var(--accent-violet);background:rgba(142,124,240,0.08)';
const REPLACE = 'color:#6E5BD9;background:rgba(142,124,240,0.08)';

let changed = 0, skipped = 0;
for (const f of readdirSync(ROOT + '/blog').filter(f => f.endsWith('.html'))) {
  const p = ROOT + '/blog/' + f;
  const html = readFileSync(p, 'utf8');
  if (!html.includes(ANCHOR)) { skipped++; continue; }
  writeFileSync(p, html.split(ANCHOR).join(REPLACE));
  changed++;
}
console.log(`blog inline-code contrast: ${changed} changed, ${skipped} unaffected`);
