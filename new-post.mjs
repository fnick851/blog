#!/usr/bin/env node
// Create a new post skeleton: node new-post.mjs "My Post Title"
import { writeFile } from "node:fs/promises";
import config from "./site.config.mjs";

const title = process.argv[2];
if (!title) {
  console.error('Usage: node new-post.mjs "My Post Title"');
  process.exit(1);
}

const now = new Date();
const parts = Object.fromEntries(
  new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .map((p) => [p.type, p.value])
);
const date = `${parts.year}-${parts.month}-${parts.day}`;
const time = `${String(+parts.hour % 24).padStart(2, "0")}:${parts.minute}:${parts.second}`;

const slug = title.trim().replace(/\s+/g, "-");
const path = `source/_posts/${date}-${slug}.md`;
await writeFile(path, `---\ntitle: ${title}\ndate: ${date} ${time}\n---\n\n`, { flag: "wx" });
console.log(`Created ${path}`);
