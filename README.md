# My blog

A markdown blog built by its own ~500-line static site generator (no framework).
Deployed with [Vercel](https://vercel.com/).

## Usage

```bash
npm run build              # generate the site into public/
npm test                   # build + smoke-test output invariants
npm run serve              # dev server on http://localhost:4000, rebuilds on change
npm run new "Post Title"   # create source/_posts/YYYY-MM-DD-Post-Title.md
```

## Writing from a phone

The site is an installable PWA. `/admin/` is a self-contained editor that
writes, edits, and deletes posts by committing straight to this repository via the GitHub API
(Vercel then deploys automatically). It needs a fine-grained personal access
token — repository access limited to this repo, Contents read/write — pasted
once on the device; drafts autosave locally, photos are resized client-side
before upload, and each publish is a single git commit.

## Layout

- `source/_posts/*.md` — posts: `YYYY-MM-DD-slug.md` with `title`/`date` frontmatter.
  URL is `/:year/:month/:day/:slug/`. Post dates are wall-clock America/New_York.
- `source/img/` — images, served at `/img/...`
- `assets/` — static files copied verbatim (CSS, avatar, favicon)
- `site.config.mjs` — title, author, profile links, feed size, timezone
- `build.mjs` — the generator (pages, atom feed, sitemaps)
- `lib/md.mjs` — markdown pipeline: marked + highlight.js, Hexo-compatible
  heading ids/anchors, smart quotes, line-numbered code blocks, external links
  get `target="_blank" rel="noopener"`
- `lib/templates.mjs` — HTML templates (structure must match assets/css/style.css)

Dependencies: `marked`, `highlight.js`, `js-yaml` — that's all.

Vercel builds with `npm run build` and publishes `public/` (see `vercel.json`).
