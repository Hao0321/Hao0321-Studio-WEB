// Regenerate sitemap.xml from actual blog/*.html files.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const blogDir = path.join(root, 'blog');
const SITE = 'https://hao0321.com';
const today = new Date().toISOString().slice(0,10);

const blogFiles = fs.readdirSync(blogDir)
  .filter(f => f.endsWith('.html') && f !== 'index.html');

const blogEntries = blogFiles.map(f => {
  const html = fs.readFileSync(path.join(blogDir, f), 'utf8');
  const date = (html.match(/article:published_time" content="([^"T]+)/) || [])[1] || today;
  return `  <url><loc>${SITE}/blog/${f}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
});

const staticEntries = [
  `<url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `<url><loc>${SITE}/about.html</loc><lastmod>2026-04-21</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
  `<url><loc>${SITE}/blog/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  `<url><loc>${SITE}/tools/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
  `<url><loc>${SITE}/resources/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
  `<url><loc>${SITE}/analytics/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  `<url><loc>${SITE}/pipeline/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  `<url><loc>${SITE}/Freeworkshop/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
  `<url><loc>${SITE}/Freeworkshop/icebreaker/</loc><lastmod>2026-05-06</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  `<url><loc>${SITE}/privacy.html</loc><lastmod>2026-04-21</lastmod><changefreq>yearly</changefreq><priority>0.4</priority></url>`,
  `<url><loc>${SITE}/terms.html</loc><lastmod>2026-04-21</lastmod><changefreq>yearly</changefreq><priority>0.4</priority></url>`,
  `<url><loc>https://game.hao0321.com/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  `<url><loc>https://game.hao0321.com/poker-fortune</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  `<url><loc>https://game.hao0321.com/pact-of-arcania</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
].map(s => '  ' + s);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join('\n')}
${blogEntries.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`✅ sitemap.xml regenerated: ${staticEntries.length + blogEntries.length} URLs`);
