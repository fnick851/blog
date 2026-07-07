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
    <link rel="icon" href="${config.avatar}">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="alternate" href="/atom.xml" title="${config.title}" type="application/atom+xml">
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

// Scroll-spy for the build-time TOC: highlights the section currently in
// view and expands its sublist (the old tocbot collapseDepth-1 behavior),
// unless the reader hit "Expand all".
const TOC_SCRIPT = `<script>
  document.addEventListener("DOMContentLoaded", function () {
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".post-toc .toc-link")
    );
    var headings = links.map(function (a) {
      return document.getElementById(decodeURIComponent(a.hash.slice(1)));
    });
    var expandBtn = document.querySelector(".tocbot-toc-expand");
    var expanded = false;

    function update() {
      if (!links.length) return;
      var active = 0;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i] && headings[i].getBoundingClientRect().top <= 120) active = i;
      }
      // at the very bottom the last section is in view even if its heading
      // never crosses the threshold
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        active = links.length - 1;
      }
      links.forEach(function (a, i) {
        a.classList.toggle("is-active-link", i === active);
      });
      if (expanded) return;
      document.querySelectorAll(".post-toc .is-collapsible").forEach(function (ul) {
        ul.classList.add("is-collapsed");
      });
      var li = links[active].parentElement;
      var child = li.querySelector(":scope > .is-collapsible");
      if (child) child.classList.remove("is-collapsed");
      for (var el = li; el && !el.classList.contains("tocbot-list"); el = el.parentElement) {
        if (el.classList.contains("is-collapsible")) el.classList.remove("is-collapsed");
      }
    }

    var ticking = false;
    document.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );

    window.expand_toc = function () {
      expanded = true;
      document.querySelectorAll(".post-toc .is-collapsible").forEach(function (ul) {
        ul.classList.remove("is-collapsed");
      });
      expandBtn.setAttribute("onclick", "collapse_toc()");
      expandBtn.innerHTML = "Collapse all";
    };
    window.collapse_toc = function () {
      expanded = false;
      expandBtn.setAttribute("onclick", "expand_toc()");
      expandBtn.innerHTML = "Expand all";
      update();
    };
    window.go_top = function () {
      window.scrollTo(0, 0);
    };
    window.go_bottom = function () {
      window.scrollTo(0, document.body.scrollHeight);
    };

    update();
  });
</script>`;

function tocBox(toc) {
  return `<div class="post-toc">
  <div class="tocbot-list">${toc}</div>
  <div class="tocbot-list-menu">
    <a class="tocbot-toc-expand" onclick="expand_toc()">Expand all</a>
    <a onclick="go_top()">Back to top</a>
    <a onclick="go_bottom()">Go to bottom</a>
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
    </header>

    <div class="post-content">${post.content}</div>
  </article>
</div>
`;
}
