// Smoke tests: build the site and assert the invariants documented in
// CLAUDE.md. Run with `npm test`. Zero test dependencies (node:test).
//
// These assertions were derived from a byte-level comparison against the
// last Hexo build during the July 2026 migration — they are the durable
// stand-in for that golden reference.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { build } from "./build.mjs";
import config from "./site.config.mjs";

await build();

const posts = (await readdir("source/_posts")).filter((f) => f.endsWith(".md"));
const read = (p) => readFile(`public/${p}`, "utf8");

test("archives list every post", async () => {
  const html = await read("archives/index.html");
  const count = (html.match(/class="archive-item"/g) || []).length;
  assert.equal(count, posts.length);
});

test("post URLs derive from filename (CJK preserved)", async () => {
  await assert.doesNotReject(read("2020/12/26/犹太人在圣诞节吃中餐的传统/index.html"));
  await assert.doesNotReject(read("2021/07/06/Notes-for-Rust/index.html"));
});

test("post pages show their date, with the exact instant in the markup", async () => {
  const html = await read("2021/07/06/Notes-for-Rust/index.html");
  assert.match(html, /<time datetime="2021-07-06T18:13:06\.000Z">July 6, 2021<\/time>/);
});

test("heading ids stay Hexo-style with headerlink anchors", async () => {
  const html = await read("2020/04/03/Notes-for-JavaScript/index.html");
  assert.match(html, /<h2 id="The-null-Type"><a href="#The-null-Type" class="headerlink"/);
});

test("post dates are America/New_York wall clock (feed in UTC)", async () => {
  const atom = await read("atom.xml");
  // 2021-07-06 14:13:06 EDT and 2022-11-17 21:37:21 EST, from frontmatter
  assert.match(atom, /<published>2021-07-06T18:13:06\.000Z<\/published>/);
  assert.match(atom, /<published>2022-11-18T02:37:21\.000Z<\/published>/);
});

test("feed is capped at feedLimit entries", async () => {
  const atom = await read("atom.xml");
  const entries = (atom.match(/<entry>/g) || []).length;
  assert.equal(entries, Math.min(posts.length, config.feedLimit));
});

test("sitemaps cover all posts plus homepage", async () => {
  const txt = await read("sitemap.txt");
  assert.equal(txt.trim().split("\n").length, posts.length + 1);
  const xml = await read("sitemap.xml");
  assert.equal((xml.match(/<loc>/g) || []).length, posts.length + 1);
});

test("external links get target/rel injected", async () => {
  const html = await read("index.html");
  assert.match(html, /target="_blank" rel="noopener" href="https:\/\/github\.com\/fnick851"/);
});

test("smartypants applies to prose but not raw HTML", async () => {
  const rust = await read("2021/07/06/Notes-for-Rust/index.html");
  assert.match(rust, /that’s called its owner/);
  const donut = await read("2021/07/13/Donut-Scene-Renderings/index.html");
  // raw HTML in posts must keep straight quotes in attributes
  assert.match(donut, /<img alt="donut render step one" class="post-image"/);
});

test("fenced code renders as line-numbered highlight figure", async () => {
  const html = await read("2020/04/03/Notes-for-JavaScript/index.html");
  assert.match(html, /<figure class="highlight javascript"><table><tr><td class="gutter">/);
  assert.match(html, /<span class="line">1<\/span><br>/);
});

test("stylesheet is render-blocking (no preload hack)", async () => {
  const html = await read("index.html");
  assert.match(html, /<link rel="stylesheet" href="\/css\/style\.css">/);
  assert.doesNotMatch(html, /rel="preload"[^>]*as="style"/);
});

test("TOC is generated at build time, only on pages with headings", async () => {
  const withToc = await read("2021/07/06/Notes-for-Rust/index.html");
  assert.match(withToc, /<a class="toc-link" href="#Borrowing">Borrowing<\/a>/);
  const noHeadings = await read("2022/11/17/横渠四句/index.html");
  assert.doesNotMatch(noHeadings, /post-toc/);
});

test("site is a PWA: manifest, icons, service worker, registration", async () => {
  const home = await read("index.html");
  assert.match(home, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(home, /serviceWorker/);
  const manifest = JSON.parse(await read("manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.shortcuts[0].url, "/admin/");
  for (const icon of manifest.icons) await assert.doesNotReject(read(icon.src.slice(1)));
  await assert.doesNotReject(read("sw.js"));
});

test("admin editor ships, is unindexed, and is excluded from the feed/sitemap", async () => {
  const admin = await read("admin/index.html");
  assert.match(admin, /<meta name="robots" content="noindex">/);
  assert.match(admin, /api\.github\.com/);
  assert.match(admin, /id="delete"/);
  const sitemap = await read("sitemap.txt");
  assert.doesNotMatch(sitemap, /admin/);
});

test("no external scripts anywhere — the site ships zero third-party JS", async () => {
  const pages = ["index.html", "archives/index.html", "2020/04/03/Notes-for-JavaScript/index.html"];
  for (const p of pages) {
    assert.doesNotMatch(await read(p), /<script[^>]*\ssrc=/, p);
  }
});

test("buildToc nests deeper headings as sublists", async () => {
  const { buildToc } = await import("./lib/toc.mjs");
  const toc = buildToc('<h2 id="A">A</h2><h3 id="B">B</h3><h2 id="C">C</h2>');
  assert.equal(
    toc,
    '<ul class="toc-list">' +
      '<li class="toc-list-item"><a class="toc-link" href="#A">A</a>' +
      '<ul class="toc-list">' +
      '<li class="toc-list-item"><a class="toc-link" href="#B">B</a></li>' +
      "</ul></li>" +
      '<li class="toc-list-item"><a class="toc-link" href="#C">C</a></li>' +
      "</ul>"
  );
});

test("profile links match config", async () => {
  const html = await read("index.html");
  for (const [label, href] of Object.entries(config.links)) {
    assert.ok(html.includes(`href="${href}"`), `missing link: ${label}`);
    assert.ok(html.includes(`icon-${label.toLowerCase()}`), `missing icon: ${label}`);
  }
});
