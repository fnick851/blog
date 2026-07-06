#!/usr/bin/env node
// Static site generator for noah-song.com.
//
// Reads markdown posts from source/_posts, renders them with lib/md.mjs and
// lib/templates.mjs, and writes the complete site to public/:
//
//   /                          profile page
//   /archives/                 all posts, grouped by year
//   /:year/:month/:day/:slug/  one page per post (slug = filename after date)
//   /atom.xml  /sitemap.xml  /sitemap.txt
//   static files from assets/ and source/img/
//
// Usage: node build.mjs
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import config from "./site.config.mjs";
import { encodeURL, externalLinks, renderMarkdown } from "./lib/md.mjs";
import { archivePage, layout, postPage, profilePage } from "./lib/templates.mjs";

const OUT = "public";
const POSTS_DIR = "source/_posts";

// --- dates -------------------------------------------------------------------

// Offset (ms) of config.timezone from UTC at a given instant.
function tzOffset(utcMs) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return utcMs - asUtc;
}

// "2021-07-06 14:13:06" (wall clock in config.timezone) -> Date (UTC instant).
function parseZonedDate(str) {
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (!m) throw new Error(`Unparseable date: ${str}`);
  const [y, mo, d, h = 0, mi = 0, s = 0] = m.slice(1).map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, s);
  // Two passes to converge across DST boundaries.
  const date = new Date(utcGuess + tzOffset(utcGuess + tzOffset(utcGuess)));
  return { date, year: y, month: mo, day: d };
}

// --- content -----------------------------------------------------------------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error("Missing frontmatter");
  // CORE_SCHEMA keeps dates as plain strings so we control timezone handling.
  const meta = yaml.load(m[1], { schema: yaml.CORE_SCHEMA });
  return { meta, body: raw.slice(m[0].length) };
}

async function loadPosts() {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(POSTS_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      if (!meta.title || !meta.date) throw new Error(`${file}: needs title and date`);
      const { date, year, month, day } = parseZonedDate(meta.date);
      const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      const pad = (n) => String(n).padStart(2, "0");
      const path = `${year}/${pad(month)}/${pad(day)}/${slug}/`;
      return {
        title: String(meta.title),
        date, year, month, day,
        slug, path,
        href: encodeURL(`/${path}`),
        permalink: encodeURL(`${config.url}/${path}`),
        content: renderMarkdown(body),
      };
    })
  );
  return posts.sort((a, b) => b.date - a.date);
}

// --- feed & sitemaps -----------------------------------------------------------

const escapeXML = (str) =>
  str.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const cdata = (str) => `<![CDATA[${str.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

function atomFeed(posts) {
  const entries = posts
    .slice(0, config.feedLimit)
    .map((post) => {
      // eslint-disable-next-line no-control-regex
      const content = post.content.replace(/[\x00-\x1F\x7F]/g, "");
      const iso = post.date.toISOString();
      return `  <entry>
    <author>
      <name>${escapeXML(config.author)}</name>
    </author>
    <content>
      ${cdata(content)}
    </content>
    <id>${post.permalink}</id>
    <link href="${post.permalink}"/>
    <published>${iso}</published>
    <summary>
      ${cdata(post.content.substring(0, 140).trimEnd())}
    </summary>
    <title>${escapeXML(post.title)}</title>
    <updated>${iso}</updated>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <author>
    <name>${escapeXML(config.author)}</name>
  </author>
  <id>${config.url}/</id>
  <link href="${config.url}/" rel="alternate"/>
  <link href="${config.url}/atom.xml" rel="self"/>
  <rights>All rights reserved ${new Date().getFullYear()}, ${escapeXML(config.author)}</rights>
  <subtitle>${escapeXML(config.subtitle)}</subtitle>
  <title>${escapeXML(config.title)}</title>
  <updated>${posts[0].date.toISOString()}</updated>
${entries}
</feed>
`;
}

function sitemaps(posts) {
  const pad = (n) => String(n).padStart(2, "0");
  const lastmod = (p) => `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const urls = posts.map((p) => ({ loc: p.permalink, lastmod: lastmod(p) }));
  urls.push({ loc: `${config.url}/`, lastmod: lastmod(posts[0]) });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  const txt = urls.map((u) => u.loc).join("\n") + "\n";
  return { xml, txt };
}

// --- build -------------------------------------------------------------------

async function writePage(path, html) {
  const dir = join(OUT, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), externalLinks(html));
}

export async function build() {
  const started = Date.now();
  const posts = await loadPosts();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await writePage("", layout(config.title, profilePage(renderMarkdown(config.profileDescription))));
  await writePage("archives", layout(`Archives | ${config.title}`, archivePage(posts)));
  for (const post of posts) {
    await writePage(post.path, layout(`${post.title} | ${config.title}`, postPage(post)));
  }

  const { xml, txt } = sitemaps(posts);
  await writeFile(join(OUT, "atom.xml"), atomFeed(posts));
  await writeFile(join(OUT, "sitemap.xml"), xml);
  await writeFile(join(OUT, "sitemap.txt"), txt);

  await cp("assets", OUT, { recursive: true });
  await cp("source/img", join(OUT, "img"), { recursive: true });

  console.log(`Built ${posts.length} posts in ${Date.now() - started} ms -> ${OUT}/`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await build();
}
