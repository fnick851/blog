// Build the table of contents for a post at build time, from its rendered
// HTML. The markup and class names mirror what the tocbot library used to
// generate client-side, so assets/css/style.css applies unchanged: nested
// lists deeper than the top level start collapsed (`is-collapsed`) and the
// inline script in templates.mjs expands the active section while scrolling.
import { stripHTML } from "./md.mjs";

export function buildToc(html) {
  const headings = [...html.matchAll(/<h([1-5]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map((m) => ({
    level: +m[1],
    id: m[2],
    text: stripHTML(m[3]).trim(),
    children: [],
  }));
  if (headings.length === 0) return "";

  // Nest by heading level: each heading becomes a child of the closest
  // shallower heading before it.
  const root = { level: 0, children: [] };
  const stack = [root];
  for (const h of headings) {
    while (stack[stack.length - 1].level >= h.level) stack.pop();
    stack[stack.length - 1].children.push(h);
    stack.push(h);
  }

  const render = (nodes, top) =>
    `<ul class="toc-list${top ? "" : " is-collapsible is-collapsed"}">` +
    nodes
      .map(
        (n) =>
          `<li class="toc-list-item"><a class="toc-link" href="#${n.id}">${n.text}</a>` +
          (n.children.length ? render(n.children, false) : "") +
          "</li>"
      )
      .join("") +
    "</ul>";
  return render(root.children, true);
}
