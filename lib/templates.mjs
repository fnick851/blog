// Page templates. Plain template literals — the HTML structure and class
// names must stay compatible with assets/css/style.css (ported from the
// original "chic" Hexo theme).
import config from "../site.config.mjs";
import { escapeHTML } from "./md.mjs";
import { buildToc } from "./toc.mjs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "November 17, 2022" — matches the site's original date format.
export function formatDate({ year, month, day }) {
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function header() {
  const navItems = Object.entries(config.nav)
    .map(([label, href]) => `<a class="menu-item" href="${href}">${label}</a>`)
    .join("\n        ");
  return `<header class="blog-header">
  <nav class="navbar">
    <div class="container">
      <div class="navbar-header header-logo">
        <a href="/">
          <span class="arrow">➜</span>
          <span class="tilde">~</span>
          ${config.nickname} / ${config.navname}
          <span class="cursor"></span>
        </a>
      </div>
      <div class="menu navbar-right">
        ${navItems}
      </div>
    </div>
  </nav>
  <nav class="navbar-mobile" id="nav-mobile">
    <div class="container">
      <div class="navbar-header">
        <div>
          <a href="/">
            <span class="arrow">➜</span>
            <span class="tilde">~</span>
            ${config.nickname} / ${config.navname}
            <span class="cursor"></span>
          </a>
        </div>
        ${navItems}
      </div>
    </div>
  </nav>
</header>`;
}

// Full page shell. `title` is the <title> text, `main` the page body HTML.
export function layout(title, main) {
  return `<!DOCTYPE html>
<html lang="${config.language}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${config.author}">
    <meta name="description" content="${config.description}">
    <title>${escapeHTML(title)}</title>
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" href="${config.avatar}">
    <link rel="apple-touch-icon" href="/image/icon-180.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="alternate" href="/atom.xml" title="${config.title}" type="application/atom+xml">
    <script>
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    </script>
  </head>
  <body>
    <a class="skip-link" href="#maincontent">Skip to main</a>
    <div class="wrapper">
      ${header()}
      <div class="main" id="maincontent">${main}</div>
    </div>
  </body>
</html>
`;
}

export function profilePage(descriptionHTML) {
  const links = Object.entries(config.links)
    .map(
      ([label, href]) => `
      <a class="link-item" title="${label}" href="${href}">
        <i class="iconfont icon-${label.toLowerCase()}"></i>
      </a>`
    )
    .join("");
  return `
    <div class="container">
  <div class="intro">
    <div class="avatar">
      <a href="${config.nav.posts}"
        ><img
          alt="profile image of Noah Song"
          src="${config.avatar}"
          style="width: 128px; height: 128px"
      /></a>
    </div>
    <div class="description">${descriptionHTML}</div>
    <div class="links">${links}
    </div>
  </div>
</div>

`;
}

// posts must be sorted newest-first.
export function archivePage(posts) {
  let out = `<div class="post-wrap archive">\n`;
  let lastYear = null;
  for (const post of posts) {
    if (post.year !== lastYear) {
      out += `            <h3>${post.year}</h3>\n`;
      lastYear = post.year;
    }
    out += `        <article class="archive-item">
            <a class="archive-item-link" href="${post.href}">${escapeHTML(post.title)}</a>
            <span class="archive-item-date">${formatDate(post)}</span>
        </article>\n`;
  }
  return out + `</div>`;
}

// Scroll-spy for the build-time TOC: moves the is-active-link highlight to
// the section currently in view.
const TOC_SCRIPT = `<script>
  document.addEventListener("DOMContentLoaded", () => {
    const links = [...document.querySelectorAll(".post-toc .toc-link")];
    const headings = links.map((a) =>
      document.getElementById(decodeURIComponent(a.hash.slice(1)))
    );

    const update = () => {
      if (!links.length) return;
      let active = 0;
      headings.forEach((h, i) => {
        if (h && h.getBoundingClientRect().top <= 120) active = i;
      });
      // at the very bottom the last section is in view even if its heading
      // never crosses the threshold
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        active = links.length - 1;
      }
      links.forEach((a, i) => a.classList.toggle("is-active-link", i === active));
    };

    let ticking = false;
    document.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );

    document
      .querySelector(".toc-menu-top")
      ?.addEventListener("click", () => window.scrollTo(0, 0));
    document
      .querySelector(".toc-menu-bottom")
      ?.addEventListener("click", () => window.scrollTo(0, document.body.scrollHeight));

    update();
  });
</script>`;

function tocBox(toc) {
  return `<div class="post-toc">
  <div class="tocbot-list">${toc}</div>
  <div class="tocbot-list-menu">
    <a class="toc-menu-top">Back to top</a>
    <a class="toc-menu-bottom">Go to bottom</a>
  </div>
</div>

${TOC_SCRIPT}`;
}

export function postPage(post) {
  // The TOC sidebar renders only when the content has headings.
  const toc = buildToc(post.content);
  return `<div class="container">
  ${toc ? tocBox(toc) : ""}
  <article class="post-wrap">
    <header class="post-header">
      <h1 class="post-title">${escapeHTML(post.title)}</h1>
      <div class="post-date">
        <time datetime="${post.date.toISOString()}">${formatDate(post)}</time>
      </div>
    </header>

    <div class="post-content">${post.content}</div>
  </article>
</div>
`;
}
