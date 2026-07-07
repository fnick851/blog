#!/usr/bin/env node
// Dev server: builds the site, serves public/ on http://localhost:4000,
// and rebuilds when content, assets, templates, or config change.
//
// Usage: node serve.mjs [port]
import { createServer } from "node:http";
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const PORT = Number(process.argv[2]) || 4000;
const ROOT = "public";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Re-import build.mjs with a cache-busting query so edits to the generator
// itself (or its imports) take effect without restarting the server.
async function rebuild() {
  try {
    const { build } = await import(`./build.mjs?t=${Date.now()}`);
    await build();
  } catch (err) {
    console.error("Build failed:", err.message);
  }
}

await rebuild();

let timer;
for (const dir of ["source", "assets", "lib", "."]) {
  watch(dir, { recursive: dir !== "." }, (event, file) => {
    if (dir === "." && !/^(build\.mjs|site\.config\.mjs)$/.test(file ?? "")) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log(`changed: ${file} — rebuilding`);
      await rebuild();
    }, 100);
  });
}

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (path.endsWith("/")) path += "index.html";
    if (!extname(path)) path += "/index.html";
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, {
      "content-type": MIME[extname(path)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404");
  }
}).listen(PORT, () => {
  console.log(`Serving ${ROOT}/ at http://localhost:${PORT} (watching for changes)`);
});
