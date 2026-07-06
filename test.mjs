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

test("smartypants applies to prose but not raw HTML blocks", async () => {
  const rust = await read("2021/07/06/Notes-for-Rust/index.html");
  assert.match(rust, /that’s called its owner/);
  const donut = await read("2021/07/13/Donut-Scene-Renderings/index.html");
  // the raw <script> embedded in this post must keep straight quotes
  assert.match(donut, /getElementsByTagName\('head'\)/);
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

test("tocbot loads only on pages with headings", async () => {
  const withToc = await read("2021/07/06/Notes-for-Rust/index.html");
  assert.match(withToc, /tocbot\.min\.js/);
  const noHeadings = await read("2022/11/17/post/index.html");
  assert.doesNotMatch(noHeadings, /tocbot/);
  const home = await read("index.html");
  assert.doesNotMatch(home, /<script/);
});

test("profile links match config", async () => {
  const html = await read("index.html");
  for (const [label, href] of Object.entries(config.links)) {
    assert.ok(html.includes(`href="${href}"`), `missing link: ${label}`);
    assert.ok(html.includes(`icon-${label.toLowerCase()}`), `missing icon: ${label}`);
  }
});
