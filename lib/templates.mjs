// Page templates. Plain template literals — the HTML structure and class
// names must stay compatible with assets/css/style.css (ported from the
// original "chic" Hexo theme).
import config from "../site.config.mjs";
import { escapeHTML } from "./md.mjs";

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
    <meta name="subtitle" content="${config.subtitle}">
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

const TOC = `<div class="post-toc">
  <div class="tocbot-list"></div>
  <div class="tocbot-list-menu">
    <a class="tocbot-toc-expand" onclick="expand_toc()">Expand all</a>
    <a onclick="go_top()">Back to top</a>
    <a onclick="go_bottom()">Go to bottom</a>
  </div>
</div>

<script defer src="/js/tocbot.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    tocbot.init({
      tocSelector: ".tocbot-list",
      contentSelector: ".post-content",
      headingSelector: "h1, h2, h3, h4, h5",
      collapseDepth: 1,
      orderedList: false,
      scrollSmooth: true,
    });
  });

  function expand_toc() {
    var b = document.querySelector(".tocbot-toc-expand");
    tocbot.init({
      tocSelector: ".tocbot-list",
      contentSelector: ".post-content",
      headingSelector: "h1, h2, h3, h4, h5",
      collapseDepth: 6,
      orderedList: false,
      scrollSmooth: true,
    });
    b.setAttribute("onclick", "collapse_toc()");
    b.innerHTML = "Collapse all";
  }

  function collapse_toc() {
    var b = document.querySelector(".tocbot-toc-expand");
    tocbot.init({
      tocSelector: ".tocbot-list",
      contentSelector: ".post-content",
      headingSelector: "h1, h2, h3, h4, h5",
      collapseDepth: 1,
      orderedList: false,
      scrollSmooth: true,
    });
    b.setAttribute("onclick", "expand_toc()");
    b.innerHTML = "Expand all";
  }

  function go_top() {
    window.scrollTo(0, 0);
  }

  function go_bottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }
</script>`;

export function postPage(post) {
  // Only render the TOC sidebar when the content actually has headings
  // for tocbot to index.
  const hasHeadings = /<h[1-5][^>]*\sid="/.test(post.content);
  return `<div class="container">
  ${hasHeadings ? TOC : ""}
  <article class="post-wrap">
    <header class="post-header">
      <h1 class="post-title">${escapeHTML(post.title)}</h1>
    </header>

    <div class="post-content">${post.content}</div>
  </article>
</div>
`;
}
