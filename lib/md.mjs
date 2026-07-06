// Markdown -> HTML pipeline.
//
// This intentionally reproduces the exact HTML that hexo-renderer-marked 7 +
// hexo-util produced for this site, so that existing CSS (and any inbound
// #heading-anchor links) keep working: Hexo-style heading ids/anchors,
// smartypants quotes, GFM line breaks, and hexo-util's line-numbered
// <figure class="highlight"> markup for fenced code.
import { Marked } from "marked";
import hljs from "highlight.js";
import config from "../site.config.mjs";

// --- small helpers (ported from hexo-util) ---------------------------------

const escapeTest = /[<>"'`/=]|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
const escapeReplace = new RegExp(escapeTest.source, "g");
const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
  "/": "&#x2F;",
  "=": "&#x3D;",
};

export function escapeHTML(str) {
  return escapeTest.test(str) ? str.replace(escapeReplace, (ch) => escapeMap[ch]) : str;
}

export function unescapeHTML(str) {
  return str.replace(/&(amp|lt|gt|quot|#39|#96|#x2F|#x3D);/g, (m) => {
    for (const [ch, ent] of Object.entries(escapeMap)) if (ent === m) return ch;
    return m;
  });
}

export function stripHTML(str) {
  return str.replace(/<[^>]*>/g, "");
}

// Heading text -> id. Spaces and punctuation become "-", case is preserved,
// CJK characters pass through untouched.
export function slugize(str) {
  return str
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Percent-encode a URL without double-encoding already-encoded input.
export function encodeURL(str) {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(str) || str.startsWith("//")) {
    try {
      const parsed = new URL(str.startsWith("//") ? `http:${str}` : str);
      if (parsed.origin === "null") return str;
      parsed.search = new URLSearchParams(parsed.search).toString();
      parsed.pathname = encodeURI(decodeURI(parsed.pathname));
      let out = parsed.toString();
      if (str.startsWith("//")) out = out.replace(/^http:/, "");
      return out;
    } catch {
      return str;
    }
  }
  let decoded;
  try {
    decoded = decodeURIComponent(str);
  } catch {
    decoded = str;
  }
  return encodeURI(decoded);
}

const siteHost = new URL(config.url).hostname;

export function isExternalLink(href) {
  if (!/^(\/\/|http(s)?:)/.test(href)) return false;
  try {
    const url = new URL(href, `http://${siteHost}`);
    if (url.origin === "null") return false;
    return url.hostname !== siteHost;
  } catch {
    return false;
  }
}

// Typographic quotes/dashes/ellipses, applied to plain text runs only.
function smartypants(str) {
  return str
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/(^|[-—/([{"\s])'/g, "$1‘")
    .replace(/'/g, "’")
    .replace(/(^|[-—/([{‘\s])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/\.{3}/g, "…");
}

// --- syntax highlighting (hexo-util highlight, gutter variant) -------------

hljs.configure({ classPrefix: "" });

// highlight.js emits open spans per-line when a token spans lines; reopen
// them so each table line is self-contained.
function closeTags(value) {
  const stack = [];
  return value
    .split("\n")
    .map((line) => {
      const prepend = stack.map((token) => `<span class="${token}">`).join("");
      for (const match of line.matchAll(/(<span class="(.*?)">|<\/span>)/g)) {
        if (match[0] === "</span>") stack.shift();
        else stack.unshift(match[2]);
      }
      return prepend + line + "</span>".repeat(stack.length);
    })
    .join("\n");
}

export function highlight(code, lang) {
  let language = (lang || "").toLowerCase();
  if (!language || !hljs.getLanguage(language)) language = "plaintext";
  const value = closeTags(hljs.highlight(code, { language, ignoreIllegals: true }).value);

  const lines = value.split("\n");
  let numbers = "";
  let content = "";
  for (let i = 0; i < lines.length; i++) {
    numbers += `<span class="line">${i + 1}</span><br>`;
    content += `<span class="line">${lines[i]}</span><br>`;
  }
  return (
    `<figure class="highlight ${language}"><table><tr>` +
    `<td class="gutter"><pre>${numbers}</pre></td>` +
    `<td class="code"><pre>${content}</pre></td>` +
    `</tr></table></figure>`
  );
}

// --- marked configuration ---------------------------------------------------

// Per-document heading id registry (repeated headings get -1, -2, ...).
let headingIds = {};

const renderer = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    let id = slugize(stripHTML(unescapeHTML(text)).trim());
    if (headingIds[id]) {
      id += `-${headingIds[id]++}`;
    } else {
      headingIds[id] = 1;
    }
    return `<h${depth} id="${id}"><a href="#${id}" class="headerlink" title="${stripHTML(text)}"></a>${text}</h${depth}>`;
  },

  link({ tokens, href, title }) {
    const text = this.parser.parseInline(tokens);
    let out = `<a href="${encodeURL(href)}"`;
    if (title) out += ` title="${escapeHTML(title)}"`;
    return `${out}>${text}</a>`;
  },

  image({ href, title, text }) {
    let out = `<img src="${encodeURL(href)}"`;
    if (text) out += ` alt="${escapeHTML(text)}"`;
    if (title) out += ` title="${escapeHTML(title)}"`;
    return `${out}>`;
  },

  code({ text, lang }) {
    return highlight(text, lang) + "\n";
  },
};

const tokenizer = {
  // Apply smartypants to plain text runs, but never inside raw HTML blocks
  // (e.g. inline <script>) or bare URLs.
  inlineText(src) {
    const cap = this.rules.inline.text.exec(src);
    if (!cap) return;
    const raw = cap[0];
    const text =
      this.lexer.state.inRawBlock || this.rules.inline.url?.exec(src)
        ? raw
        : escapeHTML(smartypants(raw));
    return { type: "text", raw, text };
  },
};

const marked = new Marked({ gfm: true, breaks: true, renderer, tokenizer });

export function renderMarkdown(text) {
  headingIds = {};
  return marked.parse(text);
}

// --- whole-page post-processing ---------------------------------------------

// Add target="_blank" rel="noopener" to external links anywhere in the
// rendered page (content and templates alike).
const rATag = /<a\s[^<>]*?href=["']((?:https?:|\/\/)[^<>"']+)["'][^<>]*>/gi;

export function externalLinks(html) {
  return html.replace(rATag, (tag, href) => {
    if (!isExternalLink(href) || /target=/i.test(tag)) return tag;
    if (/rel=/i.test(tag)) {
      return tag
        .replace(/rel=["']([^<>"']*)["']/i, (m, rel) =>
          rel.includes("noopener") ? m : `rel="${rel} noopener"`
        )
        .replace('href=', 'target="_blank" href=');
    }
    return tag.replace('href=', 'target="_blank" rel="noopener" href=');
  });
}
