// Inject Article + BreadcrumbList JSON-LD into every blog/*.html that lacks it.
// Also generates /blog/rss.xml from the same metadata.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const blogDir = path.join(root, 'blog');

const SITE = 'https://hao0321.com';
const OG_IMAGE = 'https://hao0321.com/og-image.jpg';
const AUTHOR_NAME = 'Hao0321 Studio';

function pick(re, html) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && f !== 'index.html');
const items = [];

for (const file of files) {
  const fpath = path.join(blogDir, file);
  let html = fs.readFileSync(fpath, 'utf8');

  const title = pick(/<title>([^<]+)<\/title>/, html)?.replace(/\s*—\s*Hao0321 Studio\s*$/, '');
  const desc = pick(/<meta name="description" content="([^"]+)"/, html);
  const url = pick(/<link rel="canonical" href="([^"]+)"/, html) || `${SITE}/blog/${file}`;
  const datePub = pick(/<meta property="article:published_time" content="([^"]+)"/, html);
  const slug = file.replace(/\.html$/, '');

  if (!title || !desc) {
    console.warn(`skip ${file}: missing title/desc`);
    continue;
  }

  const pubISO = datePub || '2026-05-01T00:00:00+08:00';
  items.push({ title, desc, url, pubISO, slug });

  if (html.includes('"@type":"Article"')) {
    console.log(`✓ ${file} already has Article schema`);
    continue;
  }

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    author: { "@type": "Person", name: AUTHOR_NAME, url: `${SITE}/about` },
    datePublished: pubISO,
    dateModified: pubISO,
    image: OG_IMAGE,
    publisher: {
      "@type": "Organization",
      name: AUTHOR_NAME,
      logo: { "@type": "ImageObject", url: `${SITE}/favicon.svg` }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url }
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: SITE + '/' },
      { "@type": "ListItem", position: 2, name: "部落格", item: SITE + '/blog/' },
      { "@type": "ListItem", position: 3, name: title }
    ]
  };

  const ldHtml =
    `<script type="application/ld+json">${JSON.stringify(articleLd)}</script>\n` +
    `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>\n`;

  html = html.replace(/<\/title>/, `</title>\n${ldHtml}`);
  fs.writeFileSync(fpath, html);
  console.log(`+ injected: ${file}`);
}

// Generate RSS feed
items.sort((a, b) => b.pubISO.localeCompare(a.pubISO));
const buildDate = new Date().toUTCString();
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Hao0321 Studio — 技術日誌</title>
  <link>${SITE}/blog/</link>
  <description>獨立工作室的技術日誌 — AI、遊戲開發、Cloudflare、VFX 製作流程</description>
  <language>zh-Hant</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
  <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items.slice(0, 30).map(it => `  <item>
    <title>${esc(it.title)}</title>
    <link>${it.url}</link>
    <guid isPermaLink="true">${it.url}</guid>
    <pubDate>${new Date(it.pubISO).toUTCString()}</pubDate>
    <description>${esc(it.desc)}</description>
  </item>`).join('\n')}
</channel>
</rss>`;
fs.writeFileSync(path.join(blogDir, 'rss.xml'), rss);
console.log(`\n📰 RSS feed: blog/rss.xml (${items.length} items)`);
console.log(`✅ done — ${files.length} files processed`);
